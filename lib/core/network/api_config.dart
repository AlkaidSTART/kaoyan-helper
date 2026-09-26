/// 用户后端 API 全局配置。
///
/// 仅连接用户端接口（`/api/v1/{auth,me,dashboard,questions,...}`），
/// 管理端接口（`/api/v1/admin/*`）为管理后台专用，App 永不调用。
/// 生产环境通过 `--dart-define=API_BASE_URL=https://xxx` 注入。
class ApiConfig {
  static const String _envBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );

  static String get baseUrl => _envBaseUrl;

  /// Flutter 不使用 Cookie，统一 Bearer 头（契约 §3.3）。
  static const String bearerScheme = 'Bearer';
}
