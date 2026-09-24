# Plan: Auth Login Page (用户认证与励志登录页)

## 原始诉求
根据 `ui-design` 定义的组件和规则，将登录页做起来，背景图使用 `assets/logo.png`。

## 决策论证
1. **背景与意境融合**：
   - 依据 `docs/ui-design/modules/auth.md`，使用 `assets/logo.png` 作为全屏自习室背景。
   - 桌面端宽屏下采用避让布局（Avoidance Layout）：卡片固定于右侧偏中（`width: 400`，右间距 `80`），避开左侧书本标语与右上角上岸旗标。
   - 材质采用毛玻璃 `BackdropFilter`（`sigmaX: 16, sigmaY: 16`）与半透明暖白底（`Color(0xCCFFFDF9)`）。
2. **认证表单与微交互**：
   - 包含主标题“开启今日研途”与副标题“桌前书本已备齐，向上生长正当时”。
   - 提供验证码登录与密码登录 Tab 切换。
   - 明朗线条输入框与晨曦金双色渐变主按钮（`#E67E22` ~ `#F39C12`）。
   - 第三方快捷登录入口与服务隐私协议复选框。
3. **架构模式与单向数据流**：
   - 创建 `AuthRepository`（与后续 Supabase/Dio 集成无缝衔接）和 `AuthNotifier`。
   - UI 仅调用 Notifier，严禁在页面直接操作网络或裸抛异常。
4. **守则严格遵守**：
   - 无系统 Emoji。
   - 动效时长 <= 400ms。
   - 静态检查 `flutter analyze` 零警告，测试用例 `flutter test` 全部通过。

## 落地计划
1. 创建/更新 P0~P3 文档。
2. 架构层搭建：创建 `lib/core/errors/app_exception.dart`、`lib/features/auth/data/auth_repository.dart`、`lib/features/auth/presentation/auth_notifier.dart`。
3. UI 组件编写：
   - `lib/features/auth/presentation/widgets/auth_glass_card.dart`
   - `lib/features/auth/presentation/widgets/sunrise_button.dart`
   - `lib/features/auth/presentation/widgets/oauth_button_row.dart`
   - `lib/features/auth/presentation/login_page.dart`
4. 路由集成与页面切换接入（支持通过登录成功后流转到 `AppShell`）。
5. 编写单元与 Widget 测试 `test/auth_login_test.dart`。
6. 执行 `flutter analyze` 与 `flutter test` 验证。
