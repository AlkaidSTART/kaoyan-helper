# P2 - 管理端后端接口开发记录

> 日期：2026-09-26
> 设计基线：`docs/p1-design/admin-backend-api/design.md`

## 1. 原子任务清单（按依赖顺序）

1. [x] 补齐 `lib/auth/permissions.ts` 的 9 个 admin 权限点。
2. [x] Prisma schema 新增 `AdminAuditLog`、`SchoolImportJob` 模型（对齐 Supabase 基线表），执行 `prisma generate`。
3. [x] 导入解析纯函数 `lib/services/admin/import-parser.ts`（CSV/JSON → 行记录 + 校验结果）。
4. [x] 管理领域服务（服务层二次复核 admin 身份）：
   - `admin-audit-service.ts`（同事务审计写入器）
   - `admin-dashboard-service.ts` + `prisma-admin-dashboard-repository.ts`
   - `admin-user-service.ts` + `prisma-admin-user-repository.ts`
   - `admin-question-service.ts` + `prisma-admin-question-repository.ts`
   - `admin-school-service.ts` + `prisma-admin-school-repository.ts`
5. [x] 20 个路由（`app/api/v1/admin/**`）：
   - `admin/dashboard/route.ts`（GET）
   - `admin/users/route.ts`（GET）、`admin/users/[id]/route.ts`（GET）、`admin/users/[id]/ban|unban/route.ts`（POST）
   - `admin/questions/route.ts`（GET/POST）、`admin/questions/[id]/route.ts`（GET/PATCH/DELETE）
   - `admin/ugc/route.ts`（GET）、`admin/ugc/[id]/approve|reject/route.ts`（POST）
   - `admin/schools/route.ts`（GET/POST）、`admin/schools/[id]/route.ts`（PATCH）、
     `admin/schools/[id]/programs/route.ts`（POST）、`admin/schools/[id]/programs/[programId]/route.ts`（PATCH）、
     `admin/schools/import/route.ts`（POST）、`admin/schools/import/[jobId]/confirm/route.ts`（POST）
6. [x] 测试：服务层单测（fake 仓储）+ 导入解析器单测 + 路由契约测试（vi.mock 仓储）。
7. [x] 验证：`pnpm lint` / `pnpm test` / `pnpm exec tsc --noEmit`。

## 2. 编码中的实际问题与决策

1. **Prisma 客户端无 audit/import 模型**：基线 SQL 有表但 schema 缺模型，直接引用会 TS 报错 → 先补 schema 再 generate；模型命名 `AdminAuditLog`/`SchoolImportJob`，`@@map` 对齐 snake_case 表名。
2. **路由测试复用 auth 契约模式**：`vi.mock` 替换各 Prisma 仓储类为受控 fake，避免真实 DB 依赖；服务层测试用纯 fake repository 注入。
3. **CSV 解析不引依赖**：手写 RFC4180 兼容解析（引号转义、CRLF），行数/大小上限在解析前检查；错误定位到行号。
4. **Decimal 序列化**：`aiCostEstimate`、分数类字段统一 `Number(row.value)`，null 保持 null。
5. **from/to 校验**：复用 `readDateParam`；`from > to` 返回 422；区间上限 90 天（防全表聚合）。
6. **ban/unban 幂等**：unban 已解封用户返回当前状态 200；ban 重复封禁同样幂等（覆盖 reason/expiresAt 并审计）。
7. **导入 payload 存储**：validate 阶段把规范化后的行记录 JSON 存入 `payload`，confirm 阶段直接消费，避免二次解析文件（请求体不可重放）。

## 3. 变更文件清单

见 `docs/tasks/2026-09-26-admin-backend-api/changed-files.md`。
