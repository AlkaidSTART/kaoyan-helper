# P0 - 管理端后端接口（Admin Backend API）

> 日期：2026-09-26
> 上游文档：`docs/p1-design/next-backend-api-rbac/api-contract.md` §11
> 关联任务：`docs/tasks/2026-09-26-admin-backend-api/plan.md`

## 1. 真实问题

管理后台 UI（P2 admin-console-ui）已交付，但所有页面仍是 mock 数据 + "管理接口尚未接入" 占位提示。管理员的真实诉求无法满足：

1. 看不到平台运营概览（注册、答题、AI 调用、待审核）。
2. 无法查看/封禁违规考生。
3. 无法维护官方题库，无法审核 UGC 贡献题目。
4. 无法维护院校主数据与专业历年数据，无法批量导入。

## 2. 范围

实现 `api-contract.md` §11 定义的全部 20 个管理接口（前缀 `/api/v1/admin/*`）：

- Dashboard：1 个聚合统计接口。
- Users：列表 / 详情 / 封禁 / 解封（4 个）。
- Questions：列表 / 详情 / 创建 / 更新 / 软删除（5 个）。
- UGC：审核队列 / 通过 / 驳回（3 个）。
- Schools：列表 / 创建 / 更新 / 专业 upsert / 专业更新 / 导入 / 导入确认（7 个）。

## 3. 范围边界

- 不做管理员账号 CRUD（管理员凭据管理走既有 Prisma auth 体系）。
- 不做审计日志查询接口（`admin:audit:read` 首期仅内部查询）。
- 不做 OAuth、AI 配额管理。
- 导入仅支持 CSV / JSON 两种格式，单文件 ≤ 2MB 且 ≤ 2000 行。

## 4. 验收指标

1. 20 个接口全部实现且通过 `pnpm test`（服务层单测 + 路由契约测试）。
2. 所有接口经过 `getActor` + `requirePermission`，权限点齐全；未授权返回 401/403。
3. 高风险写操作与 `admin_audit_logs` 同事务提交。
4. 封禁边界：不能封禁自己、不能封禁最后一名有效管理员（409 `LAST_ADMIN_PROTECTED`）。
5. UGC 审核仅 pending 可操作，并发版本冲突返回 409。
6. 管理端删除为软删除，用户端查询不受影响。
7. 导入流程 validate → confirm 两阶段，过期任务返回 409 `IMPORT_JOB_EXPIRED`。
8. `pnpm lint` / `pnpm test` 零错误零告警。
