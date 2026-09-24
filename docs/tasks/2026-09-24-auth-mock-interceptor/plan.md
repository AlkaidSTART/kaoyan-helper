# Plan: Auth Mock Login & Route Interception (登录拦截与模拟登录)

## 原始诉求
默认拦截到登录页面，现在先做 mock 登录。

## 决策论证
1. **默认拦截机制**：
   - 默认状态下未认证用户严禁进入内部页面，必须拦截在 `LoginPage`。
   - 实现响应式的认证状态监听；未登录时无论如何重定向至登录页。
2. **Mock 登录闭环体验**：
   - 完善 `AuthRepository` 的 Mock 实现，提供 `UserModel`（包含用户名、头像、一志愿院校专业、倒计时天数）。
   - 在 `LoginPage` 提供直观便捷的“一键填入测试账号”及极速 Mock 登录支持（免去手动输入摩擦）。
   - 登录成功后，用户模型注入全局状态，并在 `ShellTopAppBar` 动态展示用户与目标院校信息。
   - 在 `ShellTopAppBar` 头像处提供“退出登录”下拉菜单，点击后触发 `logout()`，再次自动拦截回 `LoginPage`，形成完整的认证-使用-退出拦截闭环。
3. **架构与工程红线**：
   - 严格遵循 `UI -> Notifier -> Repository` 数据流。
   - 严格禁止系统 Emoji，统一使用 `Icons.*_outlined` / `Icons.*_rounded`。
   - 动效限时 <= 400ms。
   - `flutter analyze` 零警告，全量 `flutter test` 通过。

## 落地计划
1. 创建/更新 P0~P3 阶段文档。
2. 领域层扩展：`lib/features/auth/domain/user_model.dart`。
3. 仓储与状态层增强：
   - `lib/features/auth/data/auth_repository.dart` 支持 Mock 用户信息返回。
   - `lib/features/auth/presentation/auth_notifier.dart` 维护 `UserModel? currentUser`。
4. UI 强化：
   - `lib/features/auth/presentation/widgets/auth_glass_card.dart` 增加快捷测试账号填入/一键体验支持。
   - `lib/ui/shell/widgets/top_app_bar.dart` 支持显示当前 Mock 用户信息及“退出登录”弹窗。
5. 编写测试验证默认拦截、Mock 登录与登出闭环。
6. 运行 `flutter analyze` 与 `flutter test`。
