# P1 - 管理端接口增补设计

> 日期：2026-09-26
> 上游需求：`docs/p0-definition/admin-api-supplement/definition.md`
> 接口契约：`docs/p1-design/next-backend-api-rbac/api-contract.md` §11（ADMIN-AUDIT-01、ADMIN-SCH-08、ADMIN-STAT-01 新增；ADMIN-DASH-01 响应扩展）

## 1. 架构与分层

完全沿用既有单向分层，不引入新依赖：

```
app/api/v1/admin/{audit-logs,stats/users,schools/[id]/programs}/route.ts
lib/services/admin/admin-audit-service.ts          # 新增
lib/services/admin/admin-stats-service.ts          # 新增
lib/services/admin/admin-school-service.ts         # 扩展 listPrograms
lib/services/admin/admin-dashboard-service.ts      # 扩展聚合口径
lib/services/admin/prisma-admin-{audit,stats,dashboard,school}-repository.ts
```

路由层职责不变：`getActor` → `requirePermission` → 参数校验 → 服务；服务层统一 `assertAdminActor` 复核。

## 2. 关键技术决策（ADR）

### ADR-1 审计日志查询（ADMIN-AUDIT-01，`GET /admin/audit-logs`）

- 权限 `admin:audit:read`；筛选：`action?`、`resourceType?`、`actorId?`（UUID，非法 422），固定 `createdAt desc` 排序 + 标准分页。
- 不提供时间范围筛选：审计回溯以"最近操作"为主场景，倒序分页已覆盖；时间过滤待真实运营诉求出现再扩展（最小改动）。
- `metadata`（Json）为写入侧已脱敏的变更摘要（原 ADR-2），查询侧原样透出，不做二次加工与字段白名单。
- actor 关联仅返回 `{id, email, nickname}`，与既有管理端用户 DTO 的 actor 摘要口径一致。
- `lib/api/params.ts` 新增导出 `isValidUuid`（`readUuidParam` 内部复用），供查询参数校验。

### ADR-2 管理端专业列表读取（ADMIN-SCH-08，`GET /admin/schools/:id/programs`）

- 权限 `admin:schools:read`；**不分页**，一次返回该校全部专业（含未发布、导入产生的数据），`year?` 可选筛选（1990–2100 整数，非法 422）。
- 排序 `year desc, majorCode asc`，便于编辑页按学年分组展示。
- 院校不存在 → 404（复用服务层 `requireSchool`）；DTO 复用 `toAdminProgramDto`（含 `isPublished/version` 乐观锁字段，与 PATCH 接口闭环）。
- 不新增服务类，在 `AdminSchoolService` 上扩展 `listPrograms` 方法。

### ADR-3 看板口径补齐（ADMIN-DASH-01 响应扩展）

- 新增字段：`totalUsers`（累计注册用户数，含管理员，`User.count()` 全量口径）、`pendingUgcCount`（待审核 UGC 数）。
- `pendingUgcCount` 必须与 `GET /admin/ugc` 默认队列总数一致：`source="ugc" + reviewStatus="pending" + isDeleted=false`；前端可用它渲染「待审核 UGC」卡片并作为审核入口角标。
- 两个计数均为廉价 `count()`，与既有 5 项聚合并行 `Promise.all`，不引入缓存。
- UI mock 卡片上的环比 hint（"较上周 +6.2%"）由 ADMIN-STAT-01 支撑，看板本身不返回环比，避免口径膨胀。

### ADR-4 注册人数统计（ADMIN-STAT-01，`GET /admin/stats/users`）

- 权限 `admin:dashboard:read`（运营聚合口径，不含用户隐私明文，与看板同域）。
- 查询参数与看板完全同构：`from?/to?`（`YYYY-MM-DD`，默认最近 7 天）、`timezone?`（默认 `Asia/Shanghai`，仅合法性校验）；聚合按 UTC 日界切分（沿用 `parseUtcDay`）。
- 响应：`{totalUsers, newUsers, prevNewUsers}`：
  - `totalUsers`：累计注册；
  - `newUsers`：`[from, to]` 区间内注册数（`User.createdAt`）；
  - `prevNewUsers`：紧邻等长前一窗口 `[from - N, from)` 的注册数，供前端直接计算环比（如"较上周 +6.2%"），避免前端二次请求。
- 区间上限 90 天，与看板一致；超出 422。
- 独立 `AdminStatsService` + `PrismaAdminStatsRepository`（`user.count` 两个聚合），不与看板仓储交叉依赖。

## 3. 数据契约（DTO）

- camelCase，时间统一 `formatUtcTimestamp`，分页复用 `createPaginationMeta`。
- 审计日志 DTO：`{id, action, resourceType, resourceId, requestId, metadata, createdAt, actor: {id, email, nickname}}`。
- 专业 DTO：复用 `AdminProgramDto`。
- 注册统计 DTO：`{totalUsers, newUsers, prevNewUsers}`。
- 看板 DTO 扩展：`{..., totalUsers, pendingUgcCount}`。

## 4. 测试策略

- 服务层 fake 仓储单测（沿用既有模式）：
  - 审计：筛选透传、actor 摘要映射、非管理员 `ADMIN_REQUIRED`。
  - 注册统计：非法时区/日期/超 90 天 422；`prevNewUsers` 前一窗口边界计算正确；字段齐全。
  - 专业读取：院校 404、`year` 筛选透传、DTO 映射（Decimal → number）。
  - 看板：更新既有 fake 仓储，断言新增两字段。
- 无路由级测试（沿用既有管理接口仅服务层单测的现状）。
