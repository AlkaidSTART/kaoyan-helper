import '../errors/app_exception.dart';

/// 后端分页元数据（envelope `meta.pagination`）。
class ApiPagination {
  final int page;
  final int pageSize;
  final int total;
  final int totalPages;

  const ApiPagination({
    required this.page,
    required this.pageSize,
    required this.total,
    required this.totalPages,
  });

  factory ApiPagination.fromJson(Map<String, dynamic> json) {
    return ApiPagination(
      page: (json['page'] as num?)?.toInt() ?? 1,
      pageSize: (json['pageSize'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 0,
    );
  }
}

/// DioClient 成功响应解包结果：`data` 为 envelope 主体，`pagination` 仅列表接口存在。
class ApiClientResponse {
  final dynamic data;
  final ApiPagination? pagination;

  const ApiClientResponse({required this.data, this.pagination});
}

/// envelope 解析（契约：`{success, data, meta}` / `{success:false, error:{code,message,details}}`）。
abstract final class ApiEnvelopeParser {
  /// 解析成功 envelope，返回 data 与可选分页；结构不符抛 `NetworkException`。
  static ApiClientResponse parseSuccess(dynamic body) {
    if (body is! Map<String, dynamic> || body['success'] != true) {
      throw const NetworkException('服务响应格式异常，请稍后重试', code: 'BAD_ENVELOPE');
    }

    final meta = body['meta'];
    ApiPagination? pagination;
    if (meta is Map<String, dynamic> && meta['pagination'] is Map<String, dynamic>) {
      pagination = ApiPagination.fromJson(meta['pagination'] as Map<String, dynamic>);
    }

    return ApiClientResponse(data: body['data'], pagination: pagination);
  }

  /// 从失败响应体提取稳定业务码与消息；无法识别时回退 HTTP 状态码语义。
  static AppException parseError(dynamic body, int? statusCode) {
    final error = body is Map<String, dynamic> ? body['error'] : null;

    if (error is! Map<String, dynamic>) {
      return NetworkException(
        _fallbackMessage(statusCode),
        code: 'HTTP_$statusCode',
      );
    }

    final code = error['code'] is String ? error['code'] as String : 'UNKNOWN';
    final message = error['message'] is String && (error['message'] as String).isNotEmpty
        ? error['message'] as String
        : _fallbackMessage(statusCode);

    if (_isAuthCode(code, statusCode)) {
      return AuthException(message, code: code);
    }

    return ApiException(message, code: code, statusCode: statusCode);
  }

  static bool _isAuthCode(String code, int? statusCode) {
    if (statusCode == 401 || statusCode == 403) {
      return true;
    }

    return code == 'AUTH_REQUIRED' ||
        code == 'TOKEN_EXPIRED' ||
        code == 'REFRESH_INVALID' ||
        code == 'USER_BANNED' ||
        code == 'ADMIN_REQUIRED';
  }

  static String _fallbackMessage(int? statusCode) {
    switch (statusCode) {
      case 401:
        return '登录状态已失效，请重新登录';
      case 403:
        return '没有权限执行该操作';
      case 404:
        return '请求的资源不存在';
      case 429:
        return '操作过于频繁，请稍后重试';
      case final code when code >= 500:
        return '服务暂时不可用，请稍后重试';
      default:
        return '请求失败，请稍后重试';
    }
  }
}
