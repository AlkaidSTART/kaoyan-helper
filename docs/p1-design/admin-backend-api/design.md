# P1 - 管理端后端接口设计

> 日期：2026-09-26
> 上游需求：`docs/p0-definition/admin-backend-api/definition.md`
> 接口契约：`docs/p1-design/next-backend-api-rbac/api-contract.md` §11（ADMIN-DASH-01 ~ ADMIN-SCH-07）

## 1. 架构与分层

完全沿用既有单向分层，路由只做协议适配：

```
app/api/v1/admin/**/route.ts                # getActor → requirePermission → Zod 校验 → 服务
lib/services/admin/admin-*-service.ts       # 业务规则、服务层管理员复核、事务/审计编排
lib/services/admin/prisma-admin-*-repository.ts  # Prisma 数据访问与 DTO 映射
lib/services/admin/import-parser.ts         # 纯函数：CSV/JSON 解析校验（无 IO）
```

- 路由层：`getActor`（Bearer/Cookie 统一）→ `requirePermission` → `readAndValidateJson`/`parsePagination` → 调服务。
- 服务层：再次断言 `actor.user.role === "admin"`（契约 §11.2 双重检查），执行业务规则与边界检查。
- 仓储层：DTO 映射 + 事务封装；Prisma 错误统一映射 `DEPENDENCY_UNAVAILABLE`（沿用 `mapPrismaError` 模式）。

## 2. 关键技术决策（ADR）

### ADR-1 权限点补齐（`lib/auth/permissions.ts`）

现有 `ADMIN_PERMISSIONS` 仅有 `admin:dashboard:read`，补齐契约 §4.2 其余 9 个：
`admin:users:read`、`admin:users:ban`、`admin:questions:read`、`admin:questions:write`、
`admin:ugc:read`、`admin:ugc:review`、`admin:schools:read`、`admin:schools:write`、`admin:audit:read`。
admin 角色继承全部用户权限，因此管理员仍能以普通用户身份自测。

### ADR-2 审计与业务同事务（`admin_audit_logs`）

Supabase 基线 SQL 已建 `admin_audit_logs` 表（`actor_id/action/resource_type/resource_id/request_id/metadata/created_at`），Prisma schema 缺模型 → 新增 `AdminAuditLog` 模型对齐基线。
各写操作在同一 `$transaction` 内插入审计行；action 取值：`user.ban`、`user.unban`、`question.create`、`question.update`、`question.delete`、`ugc.approve`、`ugc.reject`、`school.create`、`school.update`、`school.program.upsert`、`school.program.update`、`school.import.commit`。metadata 仅存脱敏变更摘要（字段名与目标值），不含明文邮箱。

### ADR-3 导入任务两阶段（`school_import_jobs`）

基线 SQL 已建 `school_import_jobs`（`actor_id/format/mode/status/summary/payload/version/expires_at`），Prisma 新增 `SchoolImportJob` 模型。
- `POST /admin/schools/import`（multipart）：解析 CSV/JSON → 校验 → `mode=validate` 落库（status=validated，expires 1h）；`mode=commit` 校验通过后同事务导入并置 completed。
- `POST /admin/schools/import/:jobId/confirm`：仅 validated 且未过期任务可确认（409 `IMPORT_JOB_EXPIRED`），事务内导入并置 completed。
- 校验失败 → 422 `IMPORT_VALIDATION_FAILED`，details 携带逐行错误（行号 + 字段 + 原因）。
- 限制：≤ 2MB、≤ 2000 行。

### ADR-4 封禁语义与最后管理员保护

- 封禁：`isBanned=true` + `bannedUntil=expiresAt`（null=永久），`{reason, expiresAt?}` 必填 reason。
- 解封：幂等，已解封用户重复调用仍返回 200 与当前状态。
- 边界：封禁自己 → 422 `VALIDATION_FAILED`；封禁最后一名有效管理员（role=admin 且未封禁）→ 409 `LAST_ADMIN_PROTECTED`。
- 封禁后受保护接口立即 403 `USER_BANNED`（MVP 不缓存角色，getActor 每次读库，天然即时生效）。

### ADR-5 UGC 审核状态机

仅 `reviewStatus=pending` 的 UGC 题可审核（官方题/已审核题进入队列需显式筛选），否则 409 `UGC_ALREADY_REVIEWED`。
- approve：`{note?, version}` → approved + isApproved=true + reviewedBy/reviewedAt。
- reject：`{reason, version}` 必填 reason → rejected + isApproved=false。
- version 乐观锁不匹配 → 409 `CONFLICT`；审核与审计同事务。

### ADR-6 管理端题目维护

- 列表/详情可返回答案与解析（与用户端 `quiz-service` 隔离）；筛选：subject/source/reviewStatus/isApproved/includeDeleted/search。
- 创建：`creatorId` 服务端赋值为当前管理员（契约允许空或管理员 ID，取非空便于追溯），source 固定 official，直接 approved（管理员创建即官方内容，不走 UGC 待审核）。
- 更新：乐观锁 version，409 冲突；编辑不回退审核状态（与用户端 QUIZ-05 行为不同——官方内容由管理员全权维护）。
- 删除：`{reason, version}` 软删除（isDeleted + deletedReason），保留历史错题引用。

### ADR-7 院校数据维护

- 列表含未发布数据（与用户端 `school:read` 仅已发布不同）。
- 创建：校名唯一冲突 → 409 `CONFLICT`。
- 专业 upsert：以 `schoolId+majorCode+year` 唯一键，存在则更新（审计 school.program.upsert）。
- 专业更新：乐观锁 version。

### ADR-8 管理看板聚合口径

`GET /admin/dashboard?from&to&timezone`（from/to 为 `YYYY-MM-DD`，默认最近 7 天；时区默认 Asia/Shanghai，非法 422）：
- `dau`：区间内 `question_attempts` 去重用户数；`wau`：最近 7 天窗口去重用户数。
- `questionAnswers`：区间内 attempt 总数。
- `aiCalls` / `aiCostEstimate`：区间内 `ai_usage_daily` 聚合（Decimal → number）。
- `topMistakes`：区间内错题按 errorCount Top 10（题目 id + stem 摘要 + errorCount），不含任何用户标识，满足"禁止返回用户隐私明文"。

## 3. 数据契约（DTO）

- camelCase，时间统一 `formatUtcTimestamp`，分页 meta 复用 `createPaginationMeta`。
- 管理端用户 DTO：`{id, email, nickname, avatarUrl, role, isBanned, bannedUntil, examYear, createdAt, updatedAt}` + 详情附学习统计（attempts/mistakes/cards/checkIns 计数）。
- 管理端题目 DTO：用户端 summary 字段 + `answer/explanation/reviewStatus/reviewedAt/reviewNote/isDeleted/creator{ id, nickname, email }/version`。
- 院校 DTO：复用 `toSchoolDto` 字段 + `isPublished/version`；专业 DTO 复用 `toProgramDto` + `isPublished/version`。

## 4. 测试策略

- 服务层：fake 仓储单测（封禁边界、最后管理员保护、审核状态机、乐观锁、软删除、导入状态机）。
- 导入解析器：纯函数单测（CSV 引号转义、JSON 结构、行数/字段校验、逐行错误定位）。
- 路由契约：沿用 `app/api/v1/auth/__tests__/routes.test.ts` 模式，`vi.mock` Prisma 仓储，断言 401/403/404/409/422 envelope 与审计调用。
