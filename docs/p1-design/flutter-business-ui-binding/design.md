# P1 - 业务视图真实数据绑定设计（flutter-business-ui-binding）

> 日期：2026-09-26
> 上游：`docs/p0-definition/flutter-business-ui-binding/definition.md`

## 1. 状态层（Riverpod，全部登录门控）

统一模式：`ref.watch(authNotifierProvider.select(isAuthenticated))`，未登录返回 `null`/空态，登录后自动拉取；失败保留 `AsyncError` 由视图展示重试。

| Provider | 类型 | 职责 | 契约 |
|---|---|---|---|
| `quizSessionProvider` | `AsyncNotifier<QuizSession?>` | 题目分页 + 当前题 + 判题结果；`select/rating→submit/next/restart` | QUIZ-01/02/03 |
| `mistakesProvider` | `AsyncNotifier<MistakePage?>` | 错题列表（subject/status 筛选）+ 总数；`redo/delete/reactivate/refresh` | MIS-01/02/03/04/05 |
| `schoolsProvider` | `AsyncNotifier<SchoolPage?>` | 院校列表（keyword/tag 筛选）+ targets 星标状态；`setKeyword/setTag/toggleTarget/loadPrograms` | SCH-01/03/04/05 + ME-03 |
| `dueSessionProvider` | `AsyncNotifier<DueSession?>` | 到期卡片队列 + 当前进度；`flip/rate`（幂等键） | FC-01/04 |

会话数据类（`@freezed` 不可用，手写不可变类 + copyWith）：

- `QuizSession{items, index, result, submitting}`：`result` 为当前题 `AnswerResult`。
- `MistakePage{items, pageInfo, activeTotal?, masteredCount?}`。
- `SchoolPage{items, pageInfo, targets}`：`targets` 为 `TargetSchoolRef` 列表，星标 = targets 命中。
- `DueSession{due, index, reviewing}`：进度条用 `dueRemaining` 与已完成数。

## 2. ADR 决策

### ADR-1：幂等标识用 `uuid` 包
- 后端 `attemptId` 为 `z.uuid()`、`idempotencyKey` 为 8~128 字符；新增 `uuid: ^4.5.1` 生成 v4。

### ADR-2：学科/题型本地映射，兜底原文
- 后端 `subject/type` 为自由字符串；本地映射 politics→政治、english→英语、math→数学、professional→专业课；single_choice→单选、multi_choice→多选，未知值原样显示。

### ADR-3：错题重做走对话框
- 列表项不含选项与 version；重做先 `GET /mistakes/:id`（拿选项/答案前不可泄露项）弹出作答对话框，提交 `MIS-03`，成功后刷新列表并按 `consecutiveCorrect` 提示连对/掌握。删除与重新激活同样先取详情拿 `version`（乐观锁）。

### ADR-4：择校卡片去"报录比"，展示真实字段
- 后端无报名人数/报录比字段；卡片改显 `province/region`；展开表改列 `年份/专业/计划招生/复试线(minScore)/平均分(avgScore)`，首次展开懒加载 `SCH-03`（pageSize=50，year DESC）。
- 星标状态来自 `GET /me/targets` 快照；`SCH-04/05` 幂等（重复添加返回现有条目）。

### ADR-5：背诵页适配简单卡面
- 后端卡片仅 `{front, back, category, tags}`；正面渲染 `front`、背面渲染 `back`，标题用 `category`；移除音标/搭配等无来源字段；`dueRemaining==0` 进入完成态（FC-04 返回 `checkIn` 时提示打卡成功）。

### ADR-6：测试策略
- `test/helpers/test_overrides.dart` 扩展四个 Fake 仓储 + `MeRepository` Fake，shell/tab 类测试零真实网络。
- 业务组件测试改写为：Fake 仓储返回脚本数据 → 交互（作答/重做/筛选/评级）→ 断言状态与 UI 反馈；仓储交互经 `ScriptedDioClient` 复用既有断言思路。

## 3. 明确不做
- 不做无限滚动分页（首屏 pageSize=20，够了；下拉刷新重拉）。
- 不做 UGC 建题、错题攻坚组卷、AI 解析（保留原按钮交互）。
