# 2026-09-26 Admin Prisma 管理员登录变更文件

> 状态：核心实现完成，Admin 静态检查与测试通过；`flutter analyze` 通过，`flutter test` 有 4 条既有 Schools/UI 用例失败。远端 Supabase 迁移未应用，数据库端到端验证待执行。
> 基线：本任务自 `e421cce` 开始，`bb9ddc7` 已提交服务端分层与 Schema，其余为当前工作区未提交改动。

## 新增文件

### 当前工作区（未提交）

- `admin/app/api/v1/auth/login/password/route.ts`：管理员密码登录 Route Handler。
- `admin/app/api/v1/auth/refresh/route.ts`：会话刷新与 Cookie 轮换。
- `admin/app/api/v1/auth/logout/route.ts`：幂等退出并清除 Cookie。
- `admin/app/api/v1/auth/session/route.ts`：查询当前会话、权限与过期时间。
- `admin/app/api/v1/auth/__tests__/routes.test.ts`：路由层 HTTP 契约测试。
- `admin/lib/auth/__tests__/auth-service.test.ts`：认证状态机与安全边界测试。
- `admin/lib/auth/__tests__/cookie.test.ts`：Cookie 读取/序列化/清除测试。
- `admin/lib/auth/__tests__/session-token.test.ts`：token 熵、格式与 SHA-256 摘要测试。
- `admin/vitest.config.mts`：Vitest 配置（`@` 别名、`test.include`、node 环境）。

### 已提交（`bb9ddc7`）

- `admin/lib/auth/auth-repository.ts`、`auth-service.ts`、`cookie.ts`、`password.ts`、`permissions.ts`、`prisma-auth-repository.ts`、`session-token.ts`：认证分层实现。
- `admin/lib/db/prisma.ts`：Prisma Client 惰性单例。
- `admin/prisma/schema.prisma`、`admin/prisma.config.ts`：Prisma 7 Schema 与配置。
- `supabase/migrations/20260926130000_admin_prisma_auth.sql`：`admin_credentials` / `admin_sessions` 增量迁移（未在远端应用）。

## 修改文件

### 当前工作区（未提交）

- `admin/lib/auth/prisma-auth-repository.ts`：改为惰性解析 Prisma Client，支持注入 fake client，完善 Prisma 异常映射。
- `admin/lib/db/prisma.ts`：新增 `PrismaClientConfigurationError`，配置缺失时抛出安全错误类型。
- `docs/p1-design/admin-prisma-password-auth/design.md`：补充惰性解析与早退路径说明。
- `docs/p1-design/next-backend-api-rbac/api-contract.md`：AUTH-03/05/06/07 与 Cookie 约定改为 Prisma 管理员会话。
- `docs/p1-design/next-backend-api-rbac/design.md`：管理后台登录流程与请求头 Cookie 说明改为 `admin_session`。
- `docs/p2-development/next-backend-api-rbac/development.md`：更新 P2-203、P2-305–P2-308 的真实状态。
- `docs/p2-development/admin-prisma-password-auth/development.md`：回填原子 Todo、问题决策与已知边界。
- `docs/p3-verification/admin-prisma-password-auth/verification.md`：回填逐项验证结论与执行结果。
- `docs/tasks/2026-09-26-admin-prisma-login/changed-files.md`：本文件，记录完整变更清单。

### 已提交（`e421cce`）

- `admin/package.json`、`admin/pnpm-lock.yaml`、`admin/pnpm-workspace.yaml`：新增 Prisma、adapter、bcryptjs、zod、vitest 等依赖。
- `docs/p0-definition/admin-prisma-password-auth/definition.md`：P0 定义。
- `docs/p1-design/admin-prisma-password-auth/design.md`：P1 设计。
- `docs/p2-development/admin-prisma-password-auth/development.md`：P2 计划。
- `docs/p3-verification/admin-prisma-password-auth/verification.md`：P3 用例清单。
- `docs/tasks/2026-09-26-admin-prisma-login/plan.md`、`changed-files.md`：任务计划与文件清单。

## 移动 / 重命名文件

- `admin/vitest.config.ts` → `admin/vitest.config.mts`：消除 Vite ESM 配置告警（本轮工作区内完成，未提交）。

## 删除文件

无。

## 未改动（明确说明）

- 未修改 Flutter 侧代码；已执行仓库根级 `flutter analyze`（通过）与 `flutter test`（4 条既有 Schools/UI 用例失败，明细见 P3 验证文档）。
- 未修改基线迁移 `supabase/migrations/20260926120000_baseline_backend_api.sql`。
