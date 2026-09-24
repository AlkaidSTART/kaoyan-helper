# Plan: Rest & Focus Module (休息放松与专注管理)

## 原始诉求
用户询问：“我的休息页呢，怎么不见了”。根据 `docs/ui-design/modules/rest.md`，完整构建考研休息放松与专注管理模块（`/rest` 与全局悬浮番茄钟），并将其显式集成至导航栏与主界面中。

## 决策论证
1. **全局入口显式暴露**：
   - 在 `SideNavRail` 和底部 `NavigationBar` 中新增“休息” Tab（图标：`Icons.self_improvement_outlined`），使用户一目了然、一键直达。
   - 在 `AppShell` 注入全局悬浮番茄钟小球（`FloatingPomodoroBubble`），支持拖拽吸附、模式选择（专注 25m/短休 5m）与“前往休息”。
2. **休息页完整结构 (`RestView`)**：
   - 顶部提供 `SegmentedButton` 切换 3 种沉浸式解压模式：
     - **深呼吸 (Breathing)**：吸气/屏息/呼气 4-4-4 物理平滑缩放圆环。
     - **考研解压木鱼 (Muyu)**：居中矢量木鱼，点击或空格敲击下沉回弹（`scale: 0.92`，`90ms`），随机向上浮升飘字（“上岸+1”、“心流+1”、“一志愿拟录取+1”），并记录今日心流数。
     - **舒尔特方格 (Schulte Grid)**：`5×5` 乱序数字矩阵专注力训练，支持实时秒表、点选正确高亮淡化与完成结算。
3. **架构与工程规范**：
   - 严禁任何系统 Emoji，飘字与状态提示统一采用纯文本与规范图标。
   - 动效严格低于 400ms 上限。
   - `flutter analyze` 零警告，全量自动化测试覆盖。

## 落地计划
1. 落盘 P0 ~ P3 阶段规范文档。
2. 实现番茄钟组件：`lib/ui/features/rest/widgets/floating_pomodoro_bubble.dart`。
3. 实现解压子组件：
   - `lib/ui/features/rest/widgets/muyu_relief_widget.dart`
   - `lib/ui/features/rest/widgets/breathing_widget.dart`
   - `lib/ui/features/rest/widgets/schulte_grid_widget.dart`
4. 实现休息主页面：`lib/ui/features/rest/rest_view.dart`。
5. 更新 `SideNavRail` 和 `AppShell`，挂载休息页与全局悬浮番茄钟。
6. 编写并运行自动化测试 `test/rest_module_test.dart`，并通过 `flutter analyze` 静态检查。
