/// 全局领域异常基类，严禁直接裸抛 DioException 或底层异常至 UI
sealed class AppException implements Exception {
  final String message;
  final String? code;

  const AppException(this.message, {this.code});

  @override
  String toString() => 'AppException($code): $message';
}

/// 认证相关领域异常
class AuthException extends AppException {
  const AuthException(super.message, {super.code});
}

/// 网络通信相关领域异常
class NetworkException extends AppException {
  const NetworkException(super.message, {super.code});
}
