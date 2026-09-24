# Changed Files: Auth Login Page

## 新建文件
- `lib/core/errors/app_exception.dart`: 统一领域异常定义。
- `lib/features/auth/data/auth_repository.dart`: 认证契约与仓储实现。
- `lib/features/auth/presentation/auth_notifier.dart`: 认证状态管理 Notifier。
- `lib/features/auth/presentation/widgets/auth_glass_card.dart`: 悬浮晨曦透光毛玻璃卡片。
- `lib/features/auth/presentation/widgets/sunrise_button.dart`: 晨曦金渐变登录按钮（带按压微弹性）。
- `lib/features/auth/presentation/widgets/oauth_button_row.dart`: 第三方快捷登录按键组。
- `lib/features/auth/presentation/login_page.dart`: 励志登录主界面。
- `test/auth_login_test.dart`: 登录页面渲染与交互逻辑测试。

## 修改文件
- `lib/main.dart`: 支持未登录时展示 LoginPage，登录成功后切到 AppShell。
