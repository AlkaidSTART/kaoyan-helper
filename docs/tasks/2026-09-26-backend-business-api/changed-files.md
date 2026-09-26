# Changed Files: 业务组件后端接口实现（P2-3 / P2-7 / P2-8 / P2-9）

> 日期：2026-09-26
> 任务：`docs/tasks/2026-09-26-backend-business-api/plan.md`
> 范围：`/api/v1` 业务组件所需后端接口（35 个用户侧接口）；未改动任何 Flutter 代码。

## 1. 新建文件

### 数据模型与迁移

- `supabase/migrations/20260926140000_user_sessions.sql` — Flutter Bearer 会话表 DDL（摘要入库、RLS、仅服务端访问）。
- `admin/prisma/schema.prisma`（扩展）— 新增 `UserSession`、`UserTarget`、`Question`、`QuestionAttempt`、`MistakeRecord`、`School`、`SchoolProgram`、`Flashcard`、`CardProgress`、`CardReviewEvent`、`CheckInRecord`、`AiUsageDaily` 模型，与基线 SQL 对齐。

### 认证层（`admin/lib/auth/`）

- `permissions.ts`（重写）— 用户 17 项 + 管理权限点、角色权限矩阵。
- `user-session-repository.ts` — Flutter 会话仓储契约。
- `prisma-user-session-repository.ts` — Prisma 实现（事务轮换、错误映射）。
- `user-session-service.ts` — 令牌对签发/原子轮换/撤销/会话解析（`usa_`/`usr_` 前缀、封禁与过期语义）。
- `otp-client.ts` — Supabase Auth OTP 客户端抽象（server-only、错误收敛）。
- `email-code-auth-service.ts` — 验证码登录状态机（Flutter 发令牌对 / Admin 发 Cookie、封禁与角色检查）。
- `actor.ts` — Bearer/Cookie 统一身份解析 `getActor`、`requirePermission`。
- `bearer.ts` — `Authorization: Bearer` 解析。
- `__tests__/user-session-service.test.ts` — 8 项会话状态机测试。

### 领域纯逻辑（`admin/lib/domain/`）

- `judging.ts` — 服务端判题（单选/多选/填空、ANSWER_INVALID）+ 错题状态机。
- `sm2.ts` — SM-2 三类评级算法。
- `time.ts` — IANA 时区校验、日界线、倒计时口径（12-21 估算）。
- `__tests__/judging.test.ts`、`__tests__/sm2.test.ts`、`__tests__/time.test.ts` — 21 项测试。

### 领域服务与仓储（`admin/lib/services/`）

- `me/me-service.ts`、`me/prisma-me-repository.ts` — 资料更新、目标院校事务整体替换（≤3 条、主目标唯一、学校须已发布）。
- `quiz/quiz-service.ts`、`quiz/prisma-quiz-repository.ts` — 列表/详情（不泄漏答案）/判题事务（attempt 幂等 + 错题联动）/UGC 生命周期（pending、乐观锁、软删除）。
- `mistakes/mistake-service.ts`、`mistakes/prisma-mistake-repository.ts` — 错题列表/详情/重做事务/仅 mastered 可激活/删除。
- `schools/school-service.ts`、`schools/prisma-school-repository.ts` — 院校列表/详情/专业历年（year DESC）/目标增删（幂等）。
- `flashcards/flashcard-service.ts`、`flashcards/prisma-flashcard-repository.ts` — 到期卡/列表/UGC 创建/SM-2 复习事务（幂等事件 + 打卡 upsert）/打卡分页与连击。
- `dashboard/dashboard-service.ts`、`dashboard/prisma-dashboard-repository.ts` — 服务端聚合（今日刷题、活跃错题、到期卡、连击、主目标、倒计时）。
- `ai/quota.ts`、`ai/deepseek-client.ts`、`ai/ai-service.ts`、`ai/prisma-ai-repository.ts` — 每日配额（429）、DeepSeek 流式/非流式客户端（缺 Key 时 503）、SSE 编排。
- 各模块 `__tests__/` — 46 项服务层测试。

### API 基础层扩展（`admin/lib/api/`）

- `validation.ts`（扩展）— `parseOptionalJsonRequest` / `readOptionalAndValidateJson`（空 body 合法化）。
- `params.ts` — 路径 UUID（404 防枚举）、日期查询参数、查询对象。
- `sse.ts` — SSE 编码、心跳（15s）、连接上限（120s）、错误事件。

### Route Handler（`admin/app/api/v1/`，20 个业务路由文件）

- `auth/send-code/route.ts`、`auth/login/code/route.ts`、`auth/oauth/[provider]/route.ts`（新建）；`auth/refresh/route.ts`、`auth/logout/route.ts`、`auth/session/route.ts`（双凭证分支改造）。
- `me/route.ts`、`me/targets/route.ts`。
- `dashboard/summary/route.ts`。
- `questions/route.ts`、`questions/[id]/route.ts`、`questions/[id]/answer/route.ts`。
- `mistakes/route.ts`、`mistakes/[id]/route.ts`、`mistakes/[id]/redo/route.ts`、`mistakes/[id]/status/route.ts`。
- `schools/route.ts`、`schools/[id]/route.ts`、`schools/[id]/programs/route.ts`、`schools/[id]/target/route.ts`。
- `flashcards/route.ts`、`flashcards/due/route.ts`、`flashcards/[id]/review/route.ts`。
- `check-ins/route.ts`。
- `ai/chat/route.ts`（SSE）、`ai/explain/route.ts`。

### 任务审计

- `docs/tasks/2026-09-26-backend-business-api/plan.md`、`docs/tasks/2026-09-26-backend-business-api/changed-files.md`（本文件）。

## 2. 修改文件

- `admin/lib/auth/auth-service.ts` — `SessionResult.permissions` 放宽为 `string[]`（配合完整权限矩阵）。
- `admin/lib/auth/__tests__/auth-service.test.ts` — 权限期望更新为 `getPermissionsForRole("admin")`。
- `admin/app/api/v1/auth/__tests__/routes.test.ts` — 补 `vi.mock` 用户会话仓储（server-only 收集期失败修复）。
- `docs/p2-development/next-backend-api-rbac/development.md` — P2-3/7/8/9 勾选、ADR-003/004/005、实施问题记录。
- `docs/p3-verification/next-backend-api-rbac/verification.md` — 状态行、5.2 实现状态、第 14 节真实证据回填。

## 3. 未改动

- `lib/**`、`test/**`（Flutter 全部代码零改动；`flutter test` 的 4 个失败为既有问题）。
- `supabase/migrations/20260926120000_baseline_backend_api.sql`、`20260926130000_admin_prisma_auth.sql`（只追加新迁移，不修改基线）。
- `.env`、`.env.local` 及任何密钥文件。
