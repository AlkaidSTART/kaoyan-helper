# Changed Files: 择校模块移动端适配与触摸事件增强

## 新增文件
- `docs/p0-definition/schools-mobile-adaptive/requirements.md`: 痛点、需求范围与验收指标。
- `docs/p1-design/schools-mobile-adaptive/design.md`: 响应式布局架构与触控时序规范。
- `docs/p2-development/schools-mobile-adaptive/development.md`: 开发记录与关键技术决策。
- `docs/p3-verification/schools-mobile-adaptive/verification.md`: 质量验收报告与单测结果。
- `docs/tasks/2026-09-24-schools-mobile-adaptive/plan.md`: 任务计划。
- `docs/tasks/2026-09-24-schools-mobile-adaptive/changed-files.md`: 文件变更清单。
- `test/schools_mobile_test.dart`: 移动端自适应与触摸手势自动化测试。

## 修改文件
- `lib/ui/features/schools/widgets/school_row_item.dart`: 引入小屏断点重构、双击/长按手势、表格横向滚动与触觉反馈。
- `lib/ui/features/schools/schools_view.dart`: 标签横滑、下拉刷新手势与响应式内边距。
