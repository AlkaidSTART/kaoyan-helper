# P2 - 休息放松与专注管理开发

## 1. 原子 Todo List
- [x] 创建 P0、P1、P2、P3 规范文档。
- [ ] 创建 `lib/ui/features/rest/widgets/floating_pomodoro_bubble.dart`。
- [ ] 创建 `lib/ui/features/rest/widgets/muyu_relief_widget.dart`。
- [ ] 创建 `lib/ui/features/rest/widgets/breathing_widget.dart`。
- [ ] 创建 `lib/ui/features/rest/widgets/schulte_grid_widget.dart`。
- [ ] 创建 `lib/ui/features/rest/rest_view.dart`。
- [ ] 更新 `lib/ui/shell/widgets/side_nav_rail.dart` 增加“休息”项。
- [ ] 更新 `lib/ui/shell/app_shell.dart` 挂载 `RestView` 与 `FloatingPomodoroBubble`。
- [ ] 编写并执行测试 `test/rest_module_test.dart` 与更新相关测试。
- [ ] 执行 `flutter analyze` 与 `flutter test`。

## 2. 依赖顺序
1. Muyu, Breathing, SchulteGrid 子组件
2. RestView 页面
3. FloatingPomodoroBubble 悬浮组件
4. SideNavRail 与 AppShell 集成
5. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: 悬浮番茄钟置于 `AppShell` 的全局 `Stack` 顶层，可在全应用各页面随时呼出或查看倒计时。
- **ADR-002**: 考研木鱼使用自绘/矢量拟物圆角形状，避免引入体积庞大的外部图片资源；飘字使用 `Stack` + 局部位移动画控制器。
- **ADR-003**: 导航栏将“休息”作为核心顶层 Tab 显式暴露，彻底解决用户“休息页去哪了”的迷失问题。
