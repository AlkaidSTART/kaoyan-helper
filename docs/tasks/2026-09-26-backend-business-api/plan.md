# Task Plan: 业务组件后端接口实现（P2-3 / P2-7 / P2-8 / P2-9）

## 1. 原始诉求

用户提出：根据接口文档（`docs/p1-design/next-backend-api-rbac/api-contract.md`），完成业务组件需要的后端接口。

业务组件指 Flutter 端业务模块（dashboard、quiz、mistakes、schools、flashcards、rest、ai-chat、auth）。它们需要的是契约中非 Admin 的用户侧接口；`/api/v1/admin/*`（20 个）服务于管理后台页面，不属于本轮业务组件范围。

## 2. 范围边界

### 2.1 本期实现（35 个用户侧接口）

| 模块 | 接口 | 状态 |
|---|---|---|
| Auth | send-code、login/code、oauth/:provider、refresh（Flutter 分支）、logout（Flutter 分支）、session（Bearer 分支）；login/password 已有 | 本期补齐 Flutter 分支 |
| Me | GET/PATCH /me、GET/PATCH /me/targets | 本期实现 |
| Dashboard | GET /dashboard/summary | 本期实现 |
| Quiz | GET /questions、GET /questions/:id、POST /questions/:id/answer、POST /questions、PATCH /questions/:id、DELETE /questions/:id | 本期实现 |
| Mistakes | GET /mistakes、GET /mistakes/:id、POST /mistakes/:id/redo、PATCH /mistakes/:id/status、DELETE /mistakes/:id | 本期实现 |
| Schools | GET /schools、GET /schools/:id、GET /schools/:id/programs、POST/DELETE /schools/:id/target | 本期实现 |
| Flashcards | GET /flashcards/due、GET /flashcards、POST /flashcards、POST /flashcards/:id/review、GET /check-ins | 本期实现 |
| AI | POST /ai/chat（SSE）、POST /ai/explain | 本期实现 |

### 2.2 本期不做

- `/api/v1/admin/*` 20 个管理接口与后台页面。
- OAuth 真实授权流程（契约标记为扩展项；实现统一返回 422 `PROVIDER_UNSUPPORTED`）。
- 迁移自动应用到远端数据库（`data-model.md` §7 明确需人工确认后执行）。
- Flutter 客户端改造（P2-6，另行任务）。
- Rest & Focus 模块（纯客户端计时，无后端接口依赖）。

## 3. 关键决策（ADR）

1. **数据访问层沿用 Prisma 直连**：与已落地的 admin 认证基础层一致（P2-203 已记录该等价适配偏差）。服务端服务层负责所有权/范围复核，替代依赖未生效的 RLS；用户 JWT + RLS 路径留待后续任务评估。
2. **身份提供方仍是 Supabase Auth**：`send-code`/`login/code` 通过服务端 Supabase 客户端（Secret Key）发送与校验邮箱 OTP；验证通过后 upsert `public.users`，再签发自有不透明会话令牌（SHA-256 摘要入库），与 admin 会话同一套 `session-token` 基础设施。
3. **新增 `user_sessions` 表**：承载 Flutter Bearer 会话（access/refresh 轮换同语义），DDL 追加迁移 `supabase/migrations/20260926140000_user_sessions.sql`；域表 DDL 复用既有基线迁移，不重复建表。
4. **Prisma Schema 与基线 SQL 对齐**：为业务端点涉及的表补充模型映射；`school_import_jobs`、`admin_audit_logs`、`idempotency_records`（通用表）为 Admin 范围，本轮不建模。
5. **判题 / 错题状态机 / SM-2 在服务端**：抽出纯函数（`judging.ts`、`sm2.ts`），事务边界收敛在仓储方法内（attempt + mistake 同事务；progress + review event + check-in 同事务；targets 整体替换同事务）。
6. **AI 上游**：`DEEPSEEK_API_KEY` 未配置时，配额校验之后返回 503 `DEPENDENCY_UNAVAILABLE`；配额 30 次/用户/自然日（Asia/Shanghai），SSE 事件 `meta/delta/done/error`，15s 心跳、120s 上限。
7. **倒计时口径**：`daysUntilExam` 以 `examYear - 1` 年 12 月 21 日（Asia/Shanghai）为估算初试日，日期差按当地日历日计算；`examYear` 未设置或已过期返回 `null`。该口径为 MVP 约定，写入 ADR 待产品确认。
8. **限流**：进程内固定窗口 `MemoryRateLimiter`（既有实现），send-code 按邮箱 + IP、login/code 按 IP、AI 按用户日配额；多实例分布式存储为后续任务。

## 4. 实施顺序

1. 任务文档（本文件）。
2. Prisma schema 扩展 + `user_sessions` SQL 迁移 + `prisma generate`。
3. 认证层：权限矩阵、`getActor`、用户会话服务与仓储、Supabase OTP 客户端抽象。
4. 领域纯逻辑与服务/仓储：Me、Dashboard、Quiz、Mistakes、Schools、Flashcards、AI。
5. Route Handler（`/api/v1` 全部业务路径）。
6. 单元测试（fake 仓储，不依赖真实数据库）。
7. `pnpm test` / `pnpm lint` / `pnpm build`；`flutter analyze` / `flutter test`。
8. 回填 P2/P3 文档与 changed-files。

## 5. 验证要求

- Admin：`pnpm test`（Vitest）、`pnpm lint`、`pnpm build` 全部通过。
- Flutter：`flutter analyze`、`flutter test` 不因本任务产生新问题。
- 错误语义：401 `AUTH_REQUIRED/TOKEN_EXPIRED`、403 `FORBIDDEN/USER_BANNED`、404 私有资源防枚举、409/422 业务冲突码与契约 §12 一致。
- 列表接口全部服务端分页（默认 20，最大 100）。
- 普通题目接口不返回 `answer`/`explanation`；仅判题与管理端允许。
