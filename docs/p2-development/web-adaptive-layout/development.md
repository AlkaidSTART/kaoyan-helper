# P2 - Web 自适应布局与看板开发

## 1. 原子 Todo List
- [x] 创建 `lib/core/providers/layout_providers.dart`。
- [x] 创建 `lib/core/theme/semantic_colors.dart`。
- [x] 创建 `lib/core/theme/app_theme.dart`。
- [x] 创建 `lib/ui/widgets/status_dot.dart`。
- [x] 创建 `lib/ui/widgets/number_ticker.dart`。
- [x] 创建 `lib/ui/features/dashboard/widgets/stat_card.dart`。
- [x] 创建 `lib/ui/features/dashboard/widgets/task_center_card.dart`。
- [x] 创建 `lib/ui/features/dashboard/widgets/target_school_card.dart`。
- [x] 创建 `lib/ui/features/dashboard/dashboard_view.dart`。
- [x] 更新 `lib/ui/shell/widgets/top_app_bar.dart`。
- [x] 更新 `lib/ui/shell/widgets/side_nav_rail.dart`。
- [x] 更新 `lib/ui/shell/widgets/ai_chat_panel.dart`。
- [x] 更新 `lib/ui/shell/app_shell.dart`。
- [x] 更新 `lib/main.dart`。
- [x] 更新 `test/widget_test.dart` 补充全量桌面环境测试。
- [x] 运行 `flutter analyze` 与 `flutter test`，全部通过。

## 2. 依赖顺序
1. Theme & Extensions (app_theme, semantic_colors)
2. Base Widgets (StatusDot, NumberTicker)
3. Dashboard Feature Widgets & DashboardView
4. Shell (AppShell, TopAppBar, SideNavRail, AiChatPanel)
5. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: 动效响应系统级 Reduce Motion 设置 (`accessibleDuration`)，动效时长严格控制在 <= 350ms 内，符合 UI 设计总则。
- **ADR-002**: 报录比与状态指示使用 `StatusDot` 代替 Emoji，严格遵循无系统 Emoji 原则。
- **ADR-003**: 桌面端主内容区包裹在 `SingleChildScrollView` 中并施加 `maxWidth: 960`，确保各类桌面分辨率下留白优美。
- **ADR-004**: 数据数值使用 `FittedBox` 自适应收缩保护，避免不同分辨率下 RenderFlex 发生像素溢出。
