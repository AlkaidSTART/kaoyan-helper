# P2 - 休息放松与专注管理开发

## 1. 原子 Todo List
- [x] 创建 P0、P1、P2、P3 规范文档。
- [x] 创建 `lib/ui/features/rest/widgets/floating_pomodoro_bubble.dart`。
- [x] 创建 `lib/ui/features/rest/widgets/muyu_relief_widget.dart`。
- [x] 创建 `lib/ui/features/rest/widgets/breathing_widget.dart`。
- [x] 创建 `lib/ui/features/rest/widgets/schulte_grid_widget.dart`。
- [x] 创建 `lib/ui/features/rest/rest_view.dart`。
- [x] 更新 `lib/ui/shell/widgets/side_nav_rail.dart` 增加“休息”项。
- [x] 更新 `lib/ui/shell/app_shell.dart` 挂载 `RestView` 与 `FloatingPomodoroBubble`。
- [x] 编写并执行测试 `test/rest_module_test.dart` 与全量测试。
- [x] 执行并通过 `flutter analyze` 与 `flutter test`。

## 2. 依赖顺序
1. Muyu, Breathing, SchulteGrid 子组件
2. RestView 页面
3. FloatingPomodoroBubble 悬浮组件 (带 AI 面板自动避让)
4. SideNavRail 与 AppShell 集成
5. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: 悬浮番茄钟置于 `AppShell` 的全局 `Stack` 顶层，并监听 `aiPanelExpandedProvider`，当 AI 抽屉展开时自动左移 400px，避免遮挡输入与按钮。
- **ADR-002**: 考研木鱼使用自绘拟物材质圆角形状，点击下沉回弹（`scale: 0.92`，`90ms`），并向上浮散“上岸+1”、“心流+1”等考研专属正反馈。
- **ADR-003**: 导航栏将“休息”作为核心顶层 Tab 显式暴露（图标：`Icons.self_improvement_outlined`），支持一键直达。
