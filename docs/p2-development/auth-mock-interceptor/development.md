# P2 - 登录拦截与 Mock 登录开发

## 1. 原子 Todo List
- [x] 创建 P0、P1、P2、P3 规范文档。
- [x] 创建 `lib/features/auth/domain/user_model.dart`。
- [x] 更新 `lib/features/auth/data/auth_repository.dart` 返回 `UserModel`。
- [x] 更新 `lib/features/auth/presentation/auth_notifier.dart` 管理 `currentUser` 及 `mockDirectLogin`。
- [x] 更新 `lib/features/auth/presentation/widgets/auth_glass_card.dart` 增加快捷测试账号填入入口。
- [x] 更新 `lib/ui/shell/widgets/top_app_bar.dart` 集成当前用户展示与登出菜单。
- [x] 编写并执行测试 `test/auth_login_test.dart` 与 `test/widget_test.dart`。
- [x] 执行 `flutter analyze` 与 `flutter test` 全部绿灯通过。

## 2. 依赖顺序
1. UserModel
2. AuthRepository & FakeAuthRepository
3. AuthNotifier & AuthState
4. AuthGlassCard UI 优化
5. ShellTopAppBar UI 优化
6. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: Mock 登录数据采用浙大计算机考研生作为典型画像（倒计时 98 天），与 UI 设计稿深度契合。
- **ADR-002**: 默认拦截由 `main.dart` 根级状态响应式控制，退出登录清空用户凭证后，UI 框架自动触发平滑过渡重定向至登录页。
- **ADR-003**: 提供“填入测试账号”微组件，一键同步完成测试手机号、测试验证码填入及用户协议自动勾选，降低开发调试阻力。
