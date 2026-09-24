# Changed Files: Web Adaptive Layout & UI Enhancement

## 新建文件
- `lib/core/theme/semantic_colors.dart`: 语义反馈色与学科色 ThemeExtension。
- `lib/core/theme/app_theme.dart`: 暖阳 (Warm Amber) Material 3 主题定义。
- `lib/core/providers/layout_providers.dart`: 管理 NavRail 和 AI 面板的展开状态。
- `lib/ui/widgets/status_dot.dart`: 状态圆点组件。
- `lib/ui/widgets/number_ticker.dart`: 数字滚动动画组件。
- `lib/ui/features/dashboard/dashboard_view.dart`: Web 学习看板主界面。
- `lib/ui/features/dashboard/widgets/stat_card.dart`: 看板统计卡片。
- `lib/ui/features/dashboard/widgets/task_center_card.dart`: 看板任务中心卡片。
- `lib/ui/features/dashboard/widgets/target_school_card.dart`: 目标看板卡片。
- `lib/ui/shell/app_shell.dart`: 响应式 Shell 布局。
- `lib/ui/shell/widgets/top_app_bar.dart`: 桌面端顶部导航栏。
- `lib/ui/shell/widgets/side_nav_rail.dart`: 左侧导航栏。
- `lib/ui/shell/widgets/ai_chat_panel.dart`: 右侧 AI 助手面板。

## 修改文件
- `lib/main.dart`: 接入应用主题与 ProviderScope。
- `test/widget_test.dart`: 覆盖 Web 桌面尺寸下的 Shell 与看板组件冒烟测试。
