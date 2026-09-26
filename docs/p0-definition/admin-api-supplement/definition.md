# P0 - 管理端接口增补（Admin API Supplement）

> 日期：2026-09-26
> 上游文档：`docs/p1-design/next-backend-api-rbac/api-contract.md` §11
> 前置任务：`docs/p0-definition/admin-backend-api/definition.md`（原 20 个管理接口已全部实现）
> 关联任务：`docs/tasks/2026-09-26-admin-api-supplement/plan.md`

## 1. 真实问题

管理端后端 20 个契约接口已实现，但管理端 UI（当前仍为 mock 数据）接入真实接口前，缺口分析（会话评审，2026-09-26）确认以下问题：

1. **审计日志只写不读**：`admin_audit_logs` 表与 `admin:audit:read` 权限点均已存在，每个写操作都在同事务落审计，但没有任何查询接口，"谁批的、谁封禁的"在界面上无从展示。
2. **看板统计口径与 UI 对不上**：UI 卡片为「注册用户 / 今日答题 / AI 调用 / 待审核 UGC」，而 `GET /admin/dashboard` 返回 `{dau, wau, questionAnswers, aiCalls, aiCostEstimate, topMistakes}`，缺「注册用户总数」与「待审核 UGC 数」。
3. **院校专业只有写、没有读**：管理端仅有专业 upsert/更新（POST/PATCH），没有读取接口；用户端 `GET /schools/:id/programs` 仅返回已发布数据，无法支撑管理端编辑未发布/导入中的专业。
4. **缺少注册人数统计接口**（用户新增诉求）：运营需要独立的注册人数统计能力（累计注册 + 区间新增 + 环比），支撑「注册用户」卡片与后续运营报表。

## 2. 范围

在既有 `/api/v1/admin/*` 体系上增补 3 个接口并扩展 1 个既有接口响应：

| 编号 | 接口 | 类型 |
|---|---|---|
| ADMIN-AUDIT-01 | `GET /admin/audit-logs` | 新增 |
| ADMIN-SCH-08 | `GET /admin/schools/:id/programs` | 新增 |
| ADMIN-STAT-01 | `GET /admin/stats/users` | 新增 |
| ADMIN-DASH-01 | `GET /admin/dashboard` 响应扩展 | 变更（+`totalUsers`、+`pendingUgcCount`） |

## 3. 范围边界

- 本任务推翻前置 P0 中「不做审计日志查询接口（首期仅内部查询）」的边界决定，仅补只读查询，不包含审计导出/归档。
- 专业列表读取不做分页（单校专业数量有限，编辑页需要完整列表），仅支持 `year` 筛选。
- 注册统计仅返回累计与区间数值，不做按天时间序列（趋势图需求出现时再扩展）。
- 不做题目批量操作、院校删除/下架、用户重置密码/踢会话（MVP 后另立任务）。

## 4. 验收指标

1. 3 个新接口 + 1 个响应扩展全部实现，服务层单测通过（沿用 fake 仓储模式）。
2. 所有接口经 `getActor` + `requirePermission` + 服务层 `assertAdminActor` 双重校验；权限点：审计查询 `admin:audit:read`、专业读取 `admin:schools:read`、注册统计 `admin:dashboard:read`。
3. `pendingUgcCount` 与 `GET /admin/ugc` 默认队列口径完全一致（`source=ugc + reviewStatus=pending + 未删除`）。
4. 注册统计与看板共用 UTC 日界口径，非法时区/日期/超 90 天区间返回 422。
5. 审计日志 `metadata` 保持写入侧脱敏口径，查询接口原样透出不二次加工。
6. `pnpm lint` / `pnpm test` 零错误零告警。
