import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_token_store.dart';
import 'dio_client.dart';
import 'shared_prefs_auth_token_store.dart';

/// 令牌存储：默认持久化到本地，测试中 Override 为 `MemoryAuthTokenStore`。
final authTokenStoreProvider = Provider<AuthTokenStore>((ref) {
  return SharedPrefsAuthTokenStore();
});

/// 用户后端网络层单例（仅连接 `/api/v1` 用户端接口，不含 `/admin/*`）。
final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(tokenStore: ref.watch(authTokenStoreProvider));
});
