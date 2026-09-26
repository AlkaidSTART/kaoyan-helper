# P2: 择校模块移动端适配与触摸事件开发记录

## 1. 任务拆解与完成状态
- [x] 1. 拆解小屏断点规范（`maxWidth < 600`），将卡片由三列挤压改为纵向层级清晰的流式排版。
- [x] 2. 重构 `SchoolRowItem`，将专业代码独立显示在院校副标题行，报录比胶囊下移至独立行。
- [x] 3. 增强移动端触摸交互：
  - [x] 单击折叠/展开历年趋势，触发 `HapticFeedback.lightImpact()`；
  - [x] 双击切换一志愿目标院校，触发 `HapticFeedback.selectionClick()` 与 SnackBar；
  - [x] 长按唤起 `showModalBottomSheet` 快捷动作抽屉，支持目标切换、专业代码剪贴板复制；
  - [x] 按钮 touch area 保障 `>= 48x48 dp`。
- [x] 4. 历年趋势表格包裹 `SingleChildScrollView(scrollDirection: Axis.horizontal)` 横滑容器，彻底消除小屏溢出隐患。
- [x] 5. `SchoolsView` 标签选择器支持横滑，集成 `RefreshIndicator` 下拉刷新。
- [x] 6. 编写并补充专用移动端自动化测试（`test/schools_mobile_test.dart`）。

## 2. 关键架构与实现决策
- **ADR-006 (流式分层布局)**：在移动端抛弃水平 `flex: 3 + flex: 2` 的三列网格，改为第一行（院校名+标签+操作）、第二行（学院+专业代码）、第三行（报录比指示器）的单列纵向流，使 6 位专业代码（如 `085404`）具有完整独立空间，报录比不再突兀地出现在正中。
- **ADR-007 (多维触控手势闭环)**：在移动端引入双击（收藏）和长按（快捷面板），配合振动反馈提升手感。
