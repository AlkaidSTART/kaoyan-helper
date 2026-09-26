# P2 - 管理端只读化与用户活动收集开发记录

> 上游设计：`docs/p1-design/admin-readonly-activity/design.md`

## 1. 实际改动清单（与设计的偏差）

设计按计划落地，无结构性偏差。补充记录：

1. `QuizService` / `FlashcardService` 的 `activityRecorder` 为**可选构造参数**，只有写路由（`POST /questions/:id/answer`、`POST /flashcards/:id/review`）注入 `PrismaActivityRecorder`；列表/详情/AI 讲解等只读构造点不受影响。
2. `UserSessionService.createSessionPair` 是"登录"活动的唯一锚点（当前仅 `EmailCodeAuthService` 调用），未来新增登录方式（如 Flutter 密码登录）只要走会话建立即自动记录，无需重复埋点。
3. `proxy.ts` 第一层守卫的受保护前缀补充 `/activities`。
4. 数据库变更通过 `prisma db push` 应用（本仓库 Prisma 侧无 migrations 目录，Supabase SQL 为人工基线）；`user_activities` 为纯增量建表，无数据风险。

## 2. 技术决策（ADR）

### ADR-1 摘除而非注释/隐藏管理端写能力
`/api/v1/admin/**` 的 12 个变更路由整体删除（而非仅 UI 隐藏），API 面与"观察台"产品语义一致；Prisma 模型（`SchoolImportJob`、`AdminAuditLog`）与 `errors.ts` 中已退役错误码常量保留，避免破坏性迁移与错误码注册表漂移；恢复路径 = git 历史（提交 `d8096b7` 及之前）。

### ADR-2 活动收集 = 服务端旁路事件表
在登录（`createSessionPair`）、答题（`submitAnswer`）、复习（`review`）三个既有写路径**成功之后**落 `user_activities` 事件；summary 仅存 `{clientType, deviceName}` / `{questionId, isCorrect}` / `{cardId, rating}`。读取时 UNION 业务表的方案因分页语义模糊被否决。

### ADR-3 采集 best-effort
`PrismaActivityRecorder.record()` 内部 try/catch + 日志，不向调用方抛错；活动收集是观测旁路，埋点故障不得阻断答题/登录。挂点服务以可选依赖注入 recorder（默认 null = 不记录），避免波及只读构造点。

### ADR-4 管理端活动页服务端直读
`/activities` 为服务端组件，actor 由 `AuthService.getSession(cookie)` 构建（与 `(admin)/layout.tsx` 同源，第二层守卫兜底），直接调用 `AdminActivityService`，不经自 fetch；类型筛选与翻页由 URL searchParams 驱动，无客户端状态。

## 3. 遗留项

1. `POST /check-ins` 落地时需补 `check_in` 活动埋点（挂点建议：打卡服务写路径成功后）。
2. AI 调用为日聚合（`ai_usage_daily`），未纳入事件流；若需要"AI 问答"活动粒度，需在 AI 路由补埋点。
3. 管理端其余 mock 页面（概览/用户/题库/UGC/院校）接真实接口仍在 `admin-api-supplement` 遗留任务清单中。
4. Flutter 端接入真实网络层后，活动采集自动生效，无需客户端改动。
