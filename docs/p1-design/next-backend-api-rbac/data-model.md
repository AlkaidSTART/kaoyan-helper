# P1 - Next.js BFF 数据模型（Supabase / PostgreSQL）

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：待实现验证  
> 上游设计：`docs/p1-design/next-backend-api-rbac/design.md`  
> 接口契约：`docs/p1-design/next-backend-api-rbac/api-contract.md`

## 1. 审计结论（2026-09-26）

对 `.mcp.json` 中固定的 Supabase 项目 `roiqsirzrykaebsqpxex` 执行真实 Schema 审计：

- `PostgREST /rest/v1/` OpenAPI 仅暴露 `/` 与 `/rpc/rls_auto_enable`，`components.schemas` 为空。
- 探测 `users`、`questions`、`mistake_records`、`schools`、`flashcards` 均返回 `PGRST205`（表不存在）。
- 结论：**该项目当前 `public` schema 为空，不存在任何业务表、RLS 策略或既有迁移**。
- 影响：原 P2-5「审计现有 Schema 后增量迁移」变更为「从零建立基线 Schema」。文档不再假设任何既有表结构。
- 记录方式：仅记录项目引用与表名，未读取、导出或写入任何密钥值。

## 2. 建模原则

1. 所有业务表归属 `public`，主键统一 `uuid`（`gen_random_uuid()`）。
2. 所有时间列使用 `timestamptz`，以 UTC 存储；接口层序列化为 RFC3339。
3. 用户私有表一律带 `user_id`，RLS 以 `auth.uid()` 为唯一来源。
4. `public.users` 是角色唯一事实源；`auth.users` 只负责身份。
5. 需要并发编辑的资源带 `version int not null default 1`，更新语句比较版本。
6. 需要幂等的写操作使用独立幂等表或事件表，唯一约束在数据库层兜底。
7. 面向管理员的跨用户高风险写操作通过 `SECURITY DEFINER` 函数在同一事务内写审计。

## 3. 表清单

| 表 | 用途 | 关键约束 |
|---|---|---|
| `users` | 用户资料与角色 | `id` 引用 `auth.users(id)`；`role in ('user','admin')` |
| `user_targets` | 目标院校 | 唯一 `(user_id, school_id, type, major_code)`；每用户最多 3 条、主目标 1 条 |
| `questions` | 题库（官方 + UGC） | `source in ('official','ugc')`；`review_status in ('pending','approved','rejected')`；`version` |
| `question_attempts` | 判题结果与幂等 | 唯一 `(user_id, attempt_id)` |
| `mistake_records` | 错题状态机 | 唯一 `(user_id, question_id)`；`status in ('active','mastered')` |
| `schools` | 院校主数据 | 唯一 `name`；`is_published` |
| `school_programs` | 专业年度数据 | 唯一 `(school_id, major_code, year)` |
| `school_import_jobs` | 院校导入任务 | `status in ('validated','completed','failed')`；`expires_at` |
| `flashcards` | 系统卡 + UGC 卡 | `source in ('system','ugc')`；系统卡 `creator_id is null` |
| `card_progress` | 用户卡片进度（SM-2） | 唯一 `(user_id, card_id)` |
| `card_review_events` | 复习幂等记录 | 唯一 `(user_id, idempotency_key)` |
| `check_in_records` | 每日打卡 | 唯一 `(user_id, check_in_date)` |
| `ai_usage_daily` | AI 每日配额 | 唯一 `(user_id, usage_date)`；默认 30 次/自然日 |
| `admin_audit_logs` | 管理审计 | 仅服务端可读写 |
| `idempotency_records` | 通用幂等 | 主键 `(user_id, scope, key)` |

## 4. 关系与所有权

```text
auth.users 1─1 public.users
public.users 1─N user_targets ─N─1 schools
public.users 1─N questions        (creator_id, 仅 UGC)
public.users 1─N question_attempts ─N─1 questions
public.users 1─N mistake_records  ─N─1 questions
public.users 1─N card_progress    ─N─1 flashcards
public.users 1─N card_review_events
public.users 1─N check_in_records
public.schools 1─N school_programs
```

| 资源 | 所有者列 | 普通用户可见 | 普通用户可写 |
|---|---|---|---|
| `users` | `id` | 本人 | 昵称、头像、考试年份 |
| `user_targets` | `user_id` | 本人 | 本人 |
| `questions` | `creator_id` | 已批准官方题 + 本人题 | 本人题 |
| `mistake_records` | `user_id` | 本人 | 本人 |
| `card_progress` | `user_id` | 本人 | 本人 |
| `check_in_records` | `user_id` | 本人 | 仅复习事务 |
| `schools` / `school_programs` | 无（只读公共数据） | 已发布 | 仅管理员 |

## 5. 服务端函数（`SECURITY DEFINER`）

| 函数 | 作用 | 事务保证 |
|---|---|---|
| `submit_question_answer(question_id, answer, attempt_id)` | 服务端判题 + 幂等 + 错题状态机 | 单事务 |
| `review_flashcard(card_id, rating, idempotency_key)` | SM-2 计算 + 进度更新 + 打卡 | 单事务 |
| `admin_ban_user(user_id, reason, expires_at, request_id)` | 封禁 + 最后管理员保护 + 审计 | 单事务 |
| `admin_unban_user(user_id, reason, request_id)` | 解封 + 审计 | 单事务 |
| `admin_review_ugc(question_id, action, note, version, request_id)` | UGC 审核 + 乐观锁 + 审计 | 单事务 |
| `admin_audit_write(...)` | 审计写入辅助函数 | 由调用方事务包裹 |
| `count_active_admins()` | 统计有效管理员（含封禁过期判断） | 只读 |

## 6. RLS 策略基线

- 所有表默认 `enable row level security`，无策略即拒绝。
- `users`：本人可 `select`/`update`；仅服务端函数可改 `role`、`is_banned`。
- `questions`：本人可读写自己的记录；其他用户仅可读 `source='official' AND review_status='approved' AND is_deleted=false`，以及本人提交的公共题。
- `question_attempts`、`mistake_records`、`card_progress`、`card_review_events`、`check_in_records`、`ai_usage_daily`：仅 `user_id = auth.uid()`。
- `schools`、`school_programs`：匿名/登录只读 `is_published = true`；写入仅经服务端管理员路径。
- `admin_audit_logs`、`school_import_jobs`、`idempotency_records`：不开放给 `anon`/`authenticated`，仅 service role 与服务端函数访问。

## 7. 迁移策略

- 基线迁移以单文件形式落在 `supabase/migrations/`，可重复在空库执行。
- 迁移包含：扩展、表、约束、索引、触发器、RLS、服务端函数、只读视图。
- 迁移**不在本次任务中自动应用到远端项目**；应用需由人工确认后执行，并在 P3 记录演练结果。
- 由于远端库为空，旧客户端（Flutter 直连 Supabase）当前也无可用业务表，说明迁移不造成额外回退风险。
