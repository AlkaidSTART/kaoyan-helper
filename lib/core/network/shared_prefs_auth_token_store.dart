import 'package:shared_preferences/shared_preferences.dart';

import 'auth_token_store.dart';

/// 基于 `shared_preferences` 的令牌持久化，App 重启后可恢复登录态。
class SharedPrefsAuthTokenStore implements AuthTokenStore {
  static const _keyAccessToken = 'kaoyan.auth.accessToken';
  static const _keyRefreshToken = 'kaoyan.auth.refreshToken';

  Future<SharedPreferences>? _prefsFuture;

  Future<SharedPreferences> _loadPrefs() {
    return _prefsFuture ??= SharedPreferences.getInstance();
  }

  @override
  Future<String?> readAccessToken() async {
    final prefs = await _loadPrefs();
    return prefs.getString(_keyAccessToken);
  }

  @override
  Future<String?> readRefreshToken() async {
    final prefs = await _loadPrefs();
    return prefs.getString(_keyRefreshToken);
  }

  @override
  Future<void> save({required String accessToken, required String refreshToken}) async {
    final prefs = await _loadPrefs();
    await prefs.setString(_keyAccessToken, accessToken);
    await prefs.setString(_keyRefreshToken, refreshToken);
  }

  @override
  Future<void> clear() async {
    final prefs = await _loadPrefs();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
  }
}
