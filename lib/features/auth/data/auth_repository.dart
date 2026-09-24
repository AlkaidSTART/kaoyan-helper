import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/app_exception.dart';
import '../domain/user_model.dart';

abstract class AuthRepository {
  Future<UserModel> loginWithCode(String target, String code);
  Future<UserModel> loginWithPassword(String target, String password);
  Future<void> sendCode(String target);
  Future<void> logout();
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
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return FakeAuthRepository();
});
