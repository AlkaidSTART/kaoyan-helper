# Changed Files: Web Adaptive Layout

## 新建文件
- `lib/core/providers/layout_providers.dart`: 用于管理 NavigationRail 和 AI 面板的展开状态。
- `lib/ui/shell/app_shell.dart`: 响应式外壳，处理 Desktop/Tablet/Mobile 的布局分支。
- `lib/ui/shell/widgets/top_app_bar.dart`: 桌面端顶部导航栏。
- `lib/ui/shell/widgets/side_nav_rail.dart`: 左侧导航栏。
- `lib/ui/shell/widgets/ai_chat_panel.dart`: 右侧 AI 助手面板。

## 修改文件
- `lib/main.dart`: 修改入口配置，移除初始的 Counter 应用，挂载 ProviderScope 和 AppShell。
