import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/network/auth_token_store.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/network/network_providers.dart';
import '../domain/user_model.dart';

abstract class AuthRepository {
  Future<UserModel> loginWithCode(String target, String code);
  Future<UserModel> loginWithPassword(String target, String password);
  Future<void> sendCode(String target);
  Future<void> logout();

  /// 以本地持久化凭证恢复登录态；无凭证或凭证失效返回 null。
  Future<UserModel?> restoreSession();
}

class FakeAuthRepository implements AuthRepository {
  @override
  Future<UserModel> loginWithCode(String target, String code) async {
    await Future.delayed(const Duration(milliseconds: 200));
    if (code.length != 6) {
      throw const AuthException('验证码格式不正确，请输入 6 位验证码', code: 'INVALID_CODE');
    }
    return UserModel.mock;
  }

  @override
  Future<UserModel> loginWithPassword(String target, String password) async {
    await Future.delayed(const Duration(milliseconds: 200));
    if (password.length < 6) {
      throw const AuthException('密码长度不能少于 6 位', code: 'INVALID_PASSWORD');
    }
    return UserModel.mock;
  }

  @override
  Future<void> sendCode(String target) async {
    await Future.delayed(const Duration(milliseconds: 150));
    if (target.isEmpty) {
      throw const AuthException('请输入手机号或邮箱', code: 'EMPTY_TARGET');
    }
  }

  @override
  Future<void> logout() async {
    await Future.delayed(const Duration(milliseconds: 100));
  }

  @override
  Future<UserModel?> restoreSession() async {
    await Future.delayed(const Duration(milliseconds: 100));
    return null;
  }
}

/// 用户后端 Auth 仓储（契约 AUTH-01/02/05/06/07）。
///
/// 仅连接 `/api/v1/auth/*` 用户端接口；管理端登录走 Cookie 会话，与本端无关。
class RemoteAuthRepository implements AuthRepository {
  final DioClient _client;
  final AuthTokenStore _tokenStore;

  static final RegExp _emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  RemoteAuthRepository({
    required DioClient client,
    required AuthTokenStore tokenStore,
  }) : _client = client,
       _tokenStore = tokenStore;

  @override
  Future<UserModel> loginWithCode(String target, String code) async {
    final email = _normalizeEmail(target);

    final result = await _client.post(
      '/auth/login/code',
      body: {'email': email, 'code': code, 'clientType': 'flutter'},
      requireAuth: false,
    );

    final data = _requireMap(result.data, '登录响应格式异常');
    final accessToken = data['accessToken'];
    final refreshToken = data['refreshToken'];
    if (accessToken is! String || refreshToken is! String) {
      throw const AuthException('登录响应缺少凭证信息', code: 'BAD_PAYLOAD');
    }

    await _tokenStore.save(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    return _userFrom(data['user']);
  }

  @override
  Future<UserModel> loginWithPassword(String target, String password) async {
    // 契约 AUTH-03：Flutter 密码登录未开放（422 PROVIDER_UNSUPPORTED），客户端快速失败。
    throw const AuthException(
      '邮箱密码登录暂未开放，请使用验证码登录',
      code: 'PROVIDER_UNSUPPORTED',
    );
  }

  @override
  Future<void> sendCode(String target) async {
    final email = _normalizeEmail(target);

    await _client.post(
      '/auth/send-code',
      body: {'email': email, 'purpose': 'login'},
      requireAuth: false,
    );
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _tokenStore.readRefreshToken();

    try {
      await _client.post(
        '/auth/logout',
        body: refreshToken == null ? null : {'refreshToken': refreshToken},
      );
    } on AppException {
      // 契约 AUTH-06：退出幂等且始终清理本地凭证，服务端失败不阻断登出。
    } finally {
      await _tokenStore.clear();
    }
  }

  @override
  Future<UserModel?> restoreSession() async {
    final accessToken = await _tokenStore.readAccessToken();

    if (accessToken == null || accessToken.isEmpty) {
      return null;
    }

    try {
      final result = await _client.get('/auth/session');
      final data = _requireMap(result.data, '会话响应格式异常');
      return _userFrom(data['user']);
    } on AuthException {
      // 凭证已失效（含刷新失败）：清空后回到登录页。
      await _tokenStore.clear();
      return null;
    }
    // NetworkException 不清凭证：网络恢复后仍可自动续期。
  }

  String _normalizeEmail(String target) {
    final email = target.trim().toLowerCase();

    if (email.isEmpty) {
      throw const AuthException('请输入邮箱地址', code: 'EMPTY_TARGET');
    }
    if (!_emailPattern.hasMatch(email)) {
      throw const AuthException('请输入正确的邮箱地址', code: 'VALIDATION_FAILED');
    }

    return email;
  }

  Map<String, dynamic> _requireMap(dynamic raw, String message) {
    if (raw is! Map<String, dynamic>) {
      throw AuthException(message, code: 'BAD_PAYLOAD');
    }
    return raw;
  }

  UserModel _userFrom(dynamic raw) {
    final data = _requireMap(raw, '登录响应缺少用户信息');
    final nickname = data['nickname'];

    return UserModel(
      id: data['id'] is String ? data['id'] as String : '',
      nickname: nickname is String && nickname.isNotEmpty ? nickname : '研友',
    );
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return RemoteAuthRepository(
    client: ref.watch(dioClientProvider),
    tokenStore: ref.watch(authTokenStoreProvider),
  );
});
