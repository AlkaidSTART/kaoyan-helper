# P2 - Web 自适应布局与看板开发

## 1. 原子 Todo List
- [x] 创建 `lib/core/providers/layout_providers.dart`。
- [ ] 创建 `lib/core/theme/semantic_colors.dart`。
- [ ] 创建 `lib/core/theme/app_theme.dart`。
- [ ] 创建 `lib/ui/widgets/status_dot.dart`。
- [ ] 创建 `lib/ui/widgets/number_ticker.dart`。
- [ ] 创建 `lib/ui/features/dashboard/widgets/stat_card.dart`。
- [ ] 创建 `lib/ui/features/dashboard/widgets/task_center_card.dart`。
- [ ] 创建 `lib/ui/features/dashboard/widgets/target_school_card.dart`。
- [ ] 创建 `lib/ui/features/dashboard/dashboard_view.dart`。
- [ ] 更新 `lib/ui/shell/widgets/top_app_bar.dart`。
- [ ] 更新 `lib/ui/shell/widgets/side_nav_rail.dart`。
- [ ] 更新 `lib/ui/shell/widgets/ai_chat_panel.dart`。
- [ ] 更新 `lib/ui/shell/app_shell.dart`。
- [ ] 更新 `lib/main.dart`。
- [ ] 更新 `test/widget_test.dart` 补充全量桌面环境测试。
- [ ] 运行 `flutter analyze` 与 `flutter test`。

## 2. 依赖顺序
1. Theme & Extensions
2. Base Widgets (StatusDot, NumberTicker)
3. Dashboard Feature Widgets & DashboardView
4. Shell & TopAppBar
5. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: 动效响应系统级 Reduce Motion 设置，防止引起用户不适。
- **ADR-002**: 报录比与状态指示使用 `StatusDot` 代替 Emoji，严格遵循规范。
- **ADR-003**: 桌面端主内容区包裹在 `SingleChildScrollView` 中并施加 `maxWidth: 960`，确保各类桌面分辨率下留白优美。
