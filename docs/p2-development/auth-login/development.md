# P2 - 励志登录与用户认证开发

## 1. 原子 Todo List
- [x] 创建 P0、P1、P2、P3 规范文档。
- [x] 创建 `lib/core/errors/app_exception.dart`。
- [x] 创建 `lib/features/auth/data/auth_repository.dart`。
- [x] 创建 `lib/features/auth/presentation/auth_notifier.dart`。
- [x] 创建 `lib/features/auth/presentation/widgets/sunrise_button.dart`。
- [x] 创建 `lib/features/auth/presentation/widgets/oauth_button_row.dart`。
- [x] 创建 `lib/features/auth/presentation/widgets/auth_glass_card.dart`。
- [x] 创建 `lib/features/auth/presentation/login_page.dart`。
- [x] 更新 `lib/main.dart` 挂载登录与主页动态切换逻辑。
- [x] 编写并执行测试 `test/auth_login_test.dart` 与 `test/widget_test.dart`。
- [x] 执行并通过 `flutter analyze` 与 `flutter test`。

## 2. 依赖顺序
1. AppException (领域异常体系)
2. AuthRepository & Provider (仓储层)
3. AuthNotifier & Provider (状态层)
4. Presentation Widgets (SunriseButton, OAuthButtonRow, AuthGlassCard)
5. LoginPage (页面层)
6. App entry point & Tests

## 3. 技术决策 (ADR)
- **ADR-001**: 严格遵循三层架构（UI -> Notifier -> Repository -> DataSource），所有网络与存储异常均封装为 `AppException`，严禁在 UI 裸抛异常。
- **ADR-002**: 桌面端使用 `BoxFit.cover` + `Alignment.centerLeft` 铺展 `assets/logo.png`，右侧 `padding: 80dp` 避让悬浮毛玻璃卡片（`sigma: 16`），完美呈现原图左侧励志题词与右侧晨曦。
- **ADR-003**: 登录主按钮采用晨曦双色渐变，按压具有轻量物理反馈（`AnimatedScale(scale: 0.98)`，`90ms`）。未勾选协议或格式不符时触发横向轻颤（`180ms`）。
