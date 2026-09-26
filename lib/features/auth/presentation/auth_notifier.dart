import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../data/auth_repository.dart';
import '../domain/user_model.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;

  /// 启动会话恢复进行中：路由在恢复完成前不强制跳转登录页。
  final bool isRestoring;
  final UserModel? currentUser;
  final String? errorMessage;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.isRestoring = false,
    this.currentUser,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    bool? isRestoring,
    UserModel? currentUser,
    String? errorMessage,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      isRestoring: isRestoring ?? this.isRestoring,
      currentUser: clearUser ? null : (currentUser ?? this.currentUser),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future<void>(() => restoreSession());
    return const AuthState(isRestoring: true);
  }

  /// 以本地持久化凭证恢复登录态（AUTH-07）。
  Future<void> restoreSession() async {
    final repo = ref.read(authRepositoryProvider);
    try {
      final user = await repo.restoreSession();
      state = state.copyWith(
        isRestoring: false,
        isAuthenticated: user != null,
        currentUser: user,
      );
    } catch (_) {
      state = state.copyWith(isRestoring: false);
    }
  }

  Future<bool> loginWithCode(String target, String code) async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(authRepositoryProvider);
    try {
      final user = await repo.loginWithCode(target, code);
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        currentUser: user,
      );
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(isLoading: false, errorMessage: '登录失败，请稍后重试');
      return false;
    }
  }

  Future<bool> loginWithPassword(String target, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(authRepositoryProvider);
    try {
      final user = await repo.loginWithPassword(target, password);
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        currentUser: user,
      );
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(isLoading: false, errorMessage: '登录失败，请稍后重试');
      return false;
    }
  }

  /// 一键 Mock 快捷体验登录
  Future<bool> mockDirectLogin() async {
    return loginWithCode('13800000000', '123456');
  }

  Future<bool> sendCode(String target) async {
    state = state.copyWith(isLoading: true, clearError: true);
    final repo = ref.read(authRepositoryProvider);
    try {
      await repo.sendCode(target);
      state = state.copyWith(isLoading: false);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(isLoading: false, errorMessage: '验证码发送失败');
      return false;
    }
  }

  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(clearError: true);
    }
  }

  Future<void> logout() async {
    final repo = ref.read(authRepositoryProvider);
    await repo.logout();
    state = const AuthState();
  }
}

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
