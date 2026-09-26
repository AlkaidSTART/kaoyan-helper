# Task - 管理端后端接口（Admin Backend API）

> 日期：2026-09-26
> 原始诉求：根据 `docs/p1-design/next-backend-api-rbac/api-contract.md` §11 梳理的 20 个 admin 接口，完成 Next.js 后端实现，支撑管理后台 UI 替换 mock 数据。

## 1. 决策论证

- **沿用既有分层与基础设施**：`lib/api`（envelope/validation/pagination/handler）、`lib/auth`（actor/requirePermission）已稳定，admin 接口直接复用，不引入新框架。
- **权限点补齐而非绕过**：`ADMIN_PERMISSIONS` 当前仅 1 个权限点，按契约 §4.2 补齐 10 个，路由与服务层双重检查。
- **审计同事务**：契约 §11.2 要求高风险写与 `admin_audit_logs` 同事务；基线 SQL 已有表，Prisma 补模型即可，不新建迁移。
- **导入任务复用基线表**：`school_import_jobs` 已在基线 SQL 定义（validate/commit 两阶段 + 1h 过期），Prisma 补模型，导入解析写成纯函数便于单测。
- **软删除与乐观锁**：题目删除沿用 `isDeleted + deletedReason`；所有 PATCH 带 `version` 乐观锁（409）。
- **mock 数据不改动**：admin UI 页面接 API 属于前端任务（P2-10 后续），本期只交付后端接口与测试。

## 2. 落地计划

1. Prisma schema 补 `AdminAuditLog`、`SchoolImportJob` 模型，`prisma generate`。
2. `lib/auth/permissions.ts` 补 9 个 admin 权限点。
3. `lib/services/admin/`：dashboard / user / question(含 ugc) / school / audit 五组服务 + Prisma 仓储 + import-parser。
4. `app/api/v1/admin/`：20 个操作对应 12 个路由文件。
5. 测试：服务层 fake 仓储单测 + import-parser 单测 + admin 路由契约测试。
6. 验证：`pnpm lint` / `pnpm test`（167 + 新增用例全绿）。

详见 `docs/p1-design/admin-backend-api/design.md`（ADR-1 ~ ADR-8）。
