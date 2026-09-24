# P2 - Web 自适应布局开发

## 1. 原子 Todo List
- [x] 配置目录与空壳依赖。
- [ ] 创建 `lib/core/providers/layout_providers.dart`。
- [ ] 创建 `lib/ui/shell/widgets/top_app_bar.dart`。
- [ ] 创建 `lib/ui/shell/widgets/side_nav_rail.dart`。
- [ ] 创建 `lib/ui/shell/widgets/ai_chat_panel.dart`。
- [ ] 创建 `lib/ui/shell/app_shell.dart`。
- [ ] 更新 `lib/main.dart`，移除冗余代码并包裹 ProviderScope。
- [ ] 运行 `flutter analyze` 解决 lint 问题。

## 2. 依赖顺序
1. layout_providers
2. widgets (app bar, side nav, ai panel)
3. app_shell
4. main.dart

## 3. 技术决策 (ADR)
- **状态管理**：选用 `flutter_riverpod` 的 `Notifier` 或简单的 `StateProvider` 来管理 UI 状态，因为不涉及复杂的业务流。
- **动画控制**：对于侧边栏和 AI 面板使用 `AnimatedContainer` 和 `AnimatedSize` 或原生 NavigationRail 的自带动画属性，保证动效自然（<400ms，`Curves.easeOutCubic`）。
