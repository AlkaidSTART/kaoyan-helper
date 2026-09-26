import 'dart:async';

import 'package:dio/dio.dart';

import '../errors/app_exception.dart';
import 'api_config.dart';
import 'api_envelope.dart';
import 'auth_token_store.dart';

/// 用户后端网络层单例：统一 Bearer 注入、envelope 解包与 AppException 映射。
///
/// 仅面向用户端接口；401 `TOKEN_EXPIRED` 时以 refreshToken 单飞刷新并重放原请求。
class DioClient {
  final Dio _dio;
  final AuthTokenStore _tokenStore;

  Future<void>? _refreshing;

  DioClient({
    required AuthTokenStore tokenStore,
    Dio? dio,
    String? baseUrl,
    Duration connectTimeout = const Duration(seconds: 10),
    Duration receiveTimeout = const Duration(seconds: 15),
  }) : _tokenStore = tokenStore,
       _dio = dio ?? Dio() {
    _dio.options
      ..baseUrl = baseUrl ?? ApiConfig.baseUrl
      ..connectTimeout = connectTimeout
      ..receiveTimeout = receiveTimeout
      ..headers = {'content-type': 'application/json'};
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra['requireAuth'] == true) {
            final token = await _tokenStore.readAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] =
                  '${ApiConfig.bearerScheme} $token';
            }
          }
          handler.next(options);
        },
      ),
    );
  }

  Future<ApiClientResponse> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _request(
      () => _dio.get(
        path,
        queryParameters: queryParameters,
        options: _options(requireAuth),
      ),
      requireAuth: requireAuth,
    );
  }

  Future<ApiClientResponse> post(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _request(
      () => _dio.post(
        path,
        data: body,
        queryParameters: queryParameters,
        options: _options(requireAuth),
      ),
      requireAuth: requireAuth,
    );
  }

  Future<ApiClientResponse> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _request(
      () => _dio.patch(
        path,
        data: body,
        queryParameters: queryParameters,
        options: _options(requireAuth),
      ),
      requireAuth: requireAuth,
    );
  }

  Future<ApiClientResponse> delete(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _request(
      () => _dio.delete(
        path,
        data: body,
        queryParameters: queryParameters,
        options: _options(requireAuth),
      ),
      requireAuth: requireAuth,
    );
  }

  Options _options(bool requireAuth) =>
      Options(extra: {'requireAuth': requireAuth});

  Future<ApiClientResponse> _request(
    Future<Response<dynamic>> Function() send, {
    required bool requireAuth,
  }) async {
    try {
      final response = await send();
      return ApiEnvelopeParser.parseSuccess(response.data);
    } on DioException catch (e) {
      final mapped = mapDioException(e);
      if (requireAuth && mapped.code == 'TOKEN_EXPIRED') {
        await _refreshTokens();
        return _retry(send);
      }
      throw mapped;
    }
  }

  Future<ApiClientResponse> _retry(
    Future<Response<dynamic>> Function() send,
  ) async {
    try {
      final response = await send();
      return ApiEnvelopeParser.parseSuccess(response.data);
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// 单飞刷新：并发 401 共享同一次 refresh，成功后落盘新 token 对。
  Future<void> _refreshTokens() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<void> _doRefresh() async {
    final refreshToken = await _tokenStore.readRefreshToken();

    if (refreshToken == null || refreshToken.isEmpty) {
      await _tokenStore.clear();
      throw const AuthException('登录已过期，请重新登录', code: 'REFRESH_INVALID');
    }

    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: _options(false),
      );
      final result = ApiEnvelopeParser.parseSuccess(response.data);
      final data = result.data;
      if (data is! Map<String, dynamic> ||
          data['accessToken'] is! String ||
          data['refreshToken'] is! String) {
        throw const AuthException('登录已过期，请重新登录', code: 'REFRESH_INVALID');
      }
      await _tokenStore.save(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
      );
    } on DioException catch (e) {
      final mapped = mapDioException(e);
      // 网络抖动导致的刷新失败不清凭证，等待下次重试；仅明确失效时登出。
      if (mapped is NetworkException) {
        throw mapped;
      }
      await _tokenStore.clear();
      throw AuthException(mapped.message, code: 'REFRESH_INVALID');
    }
  }

  /// `DioException` → 强类型 `AppException`，严禁裸抛到仓储之上。
  static AppException mapDioException(DioException e) {
    final response = e.response;

    if (response != null) {
      return ApiEnvelopeParser.parseError(response.data, response.statusCode);
    }

    switch (e.type) {
      case DioExceptionType.badResponse:
        return ApiEnvelopeParser.parseError(
          response?.data,
          response?.statusCode,
        );
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return const NetworkException(
          '网络连接超时，请检查网络后重试',
          code: 'NETWORK_TIMEOUT',
        );
      case DioExceptionType.connectionError:
        return const NetworkException(
          '网络连接不可用，请检查网络后重试',
          code: 'NETWORK_UNAVAILABLE',
        );
      case DioExceptionType.cancel:
        return const NetworkException('请求已取消', code: 'REQUEST_CANCELLED');
      case DioExceptionType.badCertificate:
        return const NetworkException('证书校验失败，连接已中止', code: 'BAD_CERTIFICATE');
      case DioExceptionType.unknown:
        return const NetworkException('网络异常，请稍后重试', code: 'NETWORK_ERROR');
    }
  }
}
