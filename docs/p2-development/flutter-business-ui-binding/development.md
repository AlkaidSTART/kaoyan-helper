# P2 - 业务视图真实数据绑定开发记录（flutter-business-ui-binding）

> 日期：2026-09-26
> 上游：`docs/p1-design/flutter-business-ui-binding/design.md`

## 1. 原子任务与依赖顺序

1. `uuid` 依赖 + `subject_labels.dart` 共享映射（无依赖）
2. 四模块状态层（依赖 1 + 既有仓储）
3. QuizView 重绑（依赖 2）
4. MistakesView 重绑 + 重做对话框（依赖 2）
5. SchoolsView 重绑 + SchoolRowItem 适配真实字段（依赖 2）
6. FlashcardsView 重绑（依赖 2）
7. 测试重构（test_overrides 扩展 + 组件用例改写）→ analyze/test → P3 落盘

## 2. 编码中的实际问题与决策

### 问题 1：`tester.tap` 后单击不触发
- 卡片 InkWell 同时注册 onTap/onDoubleTap，单击需等 ~300ms 双击判定；`pumpAndSettle` 不推进假时钟。
- 决策：测试中 tap 后补 `pump(350ms)` 再 settle（与上阶段择校存量修复同一手法）。

### 问题 2：错题列表项缺少 version/选项
- MIS-04/05 需乐观锁 version，列表 DTO 不含。
- 决策：删除/重新激活/重做前统一先 `GET /mistakes/:id` 取详情（ADR-3）。

### 问题 3：后端无报录比与院校下专业汇总摘要
- 旧 UI 的 `X:1 报录`、`college · majorCodeName` 无真实来源。
- 决策：卡片改显省份/区域；展开为专业历年表（SCH-03 懒加载）。院校列表 DTO 只有学科属性 tags，从 is985/is211/isDoubleFirstClass/isSelfMarking 本地推导标签。

### 问题 4：闪卡富字段（音标/搭配/例句）无来源
- 决策：正面/背面仅渲染 `front/back` 真实文本，标题用 category（ADR-5）。

### 问题 5：筛选项与后端参数对齐
- 错题学科 Chip（全部/政治/英语/数学/专业课）→ `subject` 参数（全部不传）；状态 → `status=active|mastered`。
- 择校标签 → `is985/is211/isDoubleFirstClass`（"全部"不传；自划线后端支持，暂入筛选组）。

### 问题 6：总数徽标
- "待消除 (23)/已掌握 (85)" 无独立统计接口；改用分页 `total`（当前筛选下总数），未选中状态前显示 active 总数。

## 3. 提交拆分
- 单次交付：状态层 + 四视图 + 测试（changed-files.md 全量记录）。
