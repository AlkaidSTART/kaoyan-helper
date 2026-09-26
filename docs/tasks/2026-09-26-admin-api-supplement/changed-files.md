# 变更清单：管理端接口增补（admin-api-supplement）

> 日期：2026-09-26
> 关联：`plan.md`；上游 P0/P1 文档见 `docs/p0-definition/admin-api-supplement/`、`docs/p1-design/admin-api-supplement/`

## 文档

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/p0-definition/admin-api-supplement/definition.md` | 新建 | 需求定义：3 个新接口 + 1 个响应扩展、范围边界、验收指标 |
| `docs/p1-design/admin-api-supplement/design.md` | 新建 | ADR-1~4（审计查询/专业读取/看板口径/注册统计）与测试策略 |
| `docs/p1-design/next-backend-api-rbac/api-contract.md` | 修改 | §2 总览 Admin 20→23、合计 55→58；§11 更新 ADMIN-DASH-01 响应，新增 ADMIN-SCH-08 / ADMIN-STAT-01 / ADMIN-AUDIT-01 |
| `docs/tasks/2026-09-26-admin-api-supplement/plan.md` | 新建 | 诉求、决策论证、落地计划 |
| `docs/tasks/2026-09-26-admin-api-supplement/changed-files.md` | 新建 | 本清单 |

## 代码（admin/）

### 审计日志查询（ADMIN-AUDIT-01）

| 文件 | 操作 | 说明 |
|---|---|---|
| `admin/lib/services/admin/admin-audit-service.ts` | 新建 | 筛选透传、actor 摘要映射、metadata 原样透出、`assertAdminActor` 复核 |
| `admin/lib/services/admin/prisma-admin-audit-repository.ts` | 新建 | `admin_audit_logs` 只读查询（createdAt 倒序 + 分页 + count） |
| `admin/app/api/v1/admin/audit-logs/route.ts` | 新建 | `admin:audit:read` + actorId UUID 校验（非法 422） |
| `admin/lib/services/admin/__tests__/admin-audit-service.test.ts` | 新建 | 筛选透传/DTO 映射/非管理员与封禁管理员 ADMIN_REQUIRED |

### 院校专业列表读取（ADMIN-SCH-08）

| 文件 | 操作 | 说明 |
|---|---|---|
| `admin/lib/services/admin/admin-school-service.ts` | 修改 | 仓储接口 + `listPrograms` 方法（404 复用 `requireSchool`） |
| `admin/lib/services/admin/prisma-admin-school-repository.ts` | 修改 | `listPrograms`：year 筛选、`year desc, majorCode asc` 排序 |
| `admin/app/api/v1/admin/schools/[id]/programs/route.ts` | 修改 | 新增 GET（`admin:schools:read`），`parseYearFilter` 校验 1990–2100 |
| `admin/lib/services/admin/__tests__/admin-ugc-import.test.ts` | 修改 | fake 仓储补 `listPrograms`，新增 4 个用例（DTO 映射/year 筛选/404/ADMIN_REQUIRED） |

### 看板口径扩展（ADMIN-DASH-01）

| 文件 | 操作 | 说明 |
|---|---|---|
| `admin/lib/services/admin/admin-dashboard-service.ts` | 修改 | DTO + 仓储接口新增 `totalUsers` / `pendingUgcCount`，聚合并行化 |
| `admin/lib/services/admin/prisma-admin-dashboard-repository.ts` | 修改 | `countTotalUsers`（全量 User.count）、`countPendingUgc`（source=ugc + pending + 未删除） |
| `admin/lib/services/admin/__tests__/admin-dashboard-service.test.ts` | 修改 | fake 补两个计数，断言新字段 |

### 注册人数统计（ADMIN-STAT-01）

| 文件 | 操作 | 说明 |
|---|---|---|
| `admin/lib/services/admin/admin-stats-service.ts` | 新建 | 看板同构口径（UTC 日界、≤90 天），`prevNewUsers` 紧邻等长前一窗口 |
| `admin/lib/services/admin/prisma-admin-stats-repository.ts` | 新建 | 累计注册 + 区间注册（`User.createdAt`） |
| `admin/app/api/v1/admin/stats/users/route.ts` | 新建 | `admin:dashboard:read`，默认最近 7 天 |
| `admin/lib/services/admin/__tests__/admin-stats-service.test.ts` | 新建 | 窗口边界/环比窗口/422 校验 5 个用例 |

### 基础设施

| 文件 | 操作 | 说明 |
|---|---|---|
| `admin/lib/api/params.ts` | 修改 | 导出 `isValidUuid`（`readUuidParam` 复用同一正则） |

## 验证结果

- `npx tsc --noEmit`：通过
- `npx vitest run`：28 个文件 / 203 个测试全部通过（新增 12 个：审计 3、专业 4、统计 5）
- `npm run lint`：0 error / 0 warning

## 备注

- 本轮开始前工作区由仓库所有者自行提交为 `4bd8c9a`（原 5 个未提交服务文件 + 2 个测试文件），本任务基于该提交之上实施。
- 管理端 UI 接线（mock → 真实接口）未包含在本任务范围，建议作为下一个任务。
