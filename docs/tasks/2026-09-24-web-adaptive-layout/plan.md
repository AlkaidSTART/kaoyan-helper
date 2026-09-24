# Plan: Web Adaptive Layout & UI Enhancement

## 原始诉求
根据 `ui-design` 文件夹的内容完善 Web 端的 UI 体系，包括色彩主题、核心组件、自适应 Shell、学习看板（Dashboard）等。

## 决策论证
1. **色彩系统**: 按照 `01-color-system.md` 实现默认暖阳 (Warm Amber) 主题及 `SemanticColors` ThemeExtension。
2. **图标与状态指示**: 遵循 `04-icon-system.md`，封装 `StatusDot` 组件，禁止任何 Emoji，采用 Material Symbols Outlined。
3. **动效体系**: 遵循 `02-motion-system.md`，实现响应无障碍的 `accessibleDuration` 与 `NumberTicker` 数字动效（<400ms，`Curves.easeOutCubic`）。
4. **自适应 Shell**: 按照 `03-layout-adaptive.md` 优化桌面三栏布局（TopAppBar + NavigationRail + MaxWidth 960 中间主视区 + 可折叠 400px AI 面板）。
5. **学习看板 (Dashboard)**: 按照 `modules/dashboard.md` 实现首屏看板：统计卡片行（倒计时、今日刷题、达成率、打卡）、任务中心（错题、背诵）、目标看板（一志愿、报录比、历年分数趋势）。

## 落地计划
1. 创建/更新 P0~P3 设计文档。
2. 实现核心主题：`lib/core/theme/app_theme.dart`、`lib/core/theme/semantic_colors.dart`。
3. 实现通用组件：`lib/ui/widgets/status_dot.dart`、`lib/ui/widgets/number_ticker.dart`。
4. 实现仪表盘视图：`lib/ui/features/dashboard/dashboard_view.dart` 及其子组件。
5. 更新 `AppShell`，接入真实的主题与仪表盘页面。
6. 更新并修复测试用例 `test/widget_test.dart`。
7. 运行 `flutter analyze` 和 `flutter test` 进行验证。
