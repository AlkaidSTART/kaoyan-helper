# 变更清单：业务视图真实数据绑定（flutter-business-ui-binding）

> 日期：2026-09-26
> 关联：`plan.md`；上游 P0/P1/P2/P3 文档见 `docs/p0-definition/flutter-business-ui-binding/` 等四阶段目录

## 文档

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/p0-definition/flutter-business-ui-binding/definition.md` | 新建 | 痛点、场景、范围边界、验收指标 |
| `docs/p1-design/flutter-business-ui-binding/design.md` | 新建 | 状态层设计与 ADR-1~6（uuid/学科映射/重做对话框/择校真实字段/简单卡面/测试策略） |
| `docs/p2-development/flutter-business-ui-binding/development.md` | 新建 | 原子任务顺序与 6 项编码实际决策 |
| `docs/p3-verification/flutter-business-ui-binding/verification.md` | 新建 | analyze/test 结果、闭环用例、交互适配决策、已知边界 |
| `docs/tasks/2026-09-26-flutter-business-ui-binding/plan.md` | 新建 | 诉求、决策论证、落地计划 |
| `docs/tasks/2026-09-26-flutter-business-ui-binding/changed-files.md` | 新建 | 本清单 |

## 依赖

| 文件 | 操作 | 说明 |
|---|---|---|
| `pubspec.yaml` / `pubspec.lock` | 修改 | 新增 `uuid: ^4.5.1`（attemptId 需 `z.uuid()` 校验） |

## 代码：共享与状态层

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/features/shared/subject_labels.dart` | 新建 | 学科/题型中文名映射，未知值回退原文 |
| `lib/features/quiz/presentation/quiz_providers.dart` | 新建 | `quizSessionProvider`：题目队列+判题结果+提交态（QUIZ-01/03） |
| `lib/features/mistakes/presentation/mistakes_providers.dart` | 新建 | `mistakesProvider`（学科/状态筛选）+ `mistakeDetailProvider`；redo/delete/reactivate |
| `lib/features/schools/presentation/schools_providers.dart` | 新建 | `schoolsProvider`（keyword/tag 筛选 + targets 星标态）+ `schoolProgramsProvider` 懒加载 |
| `lib/features/flashcards/presentation/flashcards_providers.dart` | 新建 | `dueSessionProvider`：到期队列 + 幂等复习（FC-01/04） |
| `lib/features/schools/data/schools_repository.dart` | 修改 | 补 `getTargets()`（ME-03 快照，供星标态） |

## 代码：视图重绑

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/ui/features/quiz/quiz_view.dart` | 重写 | 真实题目渲染、服务端判题反馈、正确/错误态、解析面板、空态/错误重试；加载中锁选项 |
| `lib/ui/features/mistakes/mistakes_view.dart` | 重写 | 真实错题列表 + 学科/状态筛选 + RefreshIndicator + 空态/错误重试 |
| `lib/ui/features/mistakes/widgets/redo_dialog.dart` | 新建 | 重做对话框：拉详情→选项作答（RadioGroup）→判题→解析→连对提示 |
| `lib/ui/features/schools/schools_view.dart` | 重写 | 真实院校列表 + 搜索防抖、标签筛选（985/211/双一流/自划线）、星标切换 Snackbar |
| `lib/ui/features/schools/widgets/school_row_item.dart` | 重写 | 适配真实字段：名称+标签（is985 等推导）+省地区；展开懒加载专业历年表（年份/专业/计划/复试线/平均分）；保留单击展开/双击目标/长按菜单手势 |
| `lib/ui/features/flashcards/flashcards_view.dart` | 重写 | 真实到期卡（front/back/category/tags）、评级→SM-2、完成态（含打卡反馈）、空态/错误重试 |

## 测试

| 文件 | 操作 | 说明 |
|---|---|---|
| `test/helpers/test_overrides.dart` | 重写 | 新增 Fake 仓储四件套（quiz/mistakes/schools/flashcards，含脚本化判题与专业数据），并注入对应 Provider |
| `test/business_modules_test.dart` | 重写 | 四视图闭环用例：判题反馈/筛选/重做弹窗/懒加载趋势表/星标/评级进度 |
| `test/schools_mobile_test.dart` | 重写 | 移动端 390x844 溢出检查、双击目标、长按菜单、单击展开（pump 350ms 双击判定）、自划线筛选 |
| `test/widget_test.dart`、`test/router_test.dart`、`test/rest_module_test.dart`、`test/auth_login_test.dart` | 沿用 | 经 `buildTestOverrides` 自动获得业务 Fake，tab 切换零真实网络 |

## 验证结果

- `flutter analyze`：0 问题；`flutter test`：43/43 通过（详见 P3 验证单）。
- 生产代码无 `print`/`debugPrint` 残留。
