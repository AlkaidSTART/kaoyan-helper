# P3 - Admin Prisma 管理员密码登录验证

> 版本：v1.0  
> 日期：2026-09-26  
>
> 状态：Admin 静态检查、单元测试与构建通过；根项目 `flutter analyze` 通过，`flutter test` 有 4 条既有 Schools/UI 用例失败；远端迁移与数据库端到端验证待执行
>
> 上游计划：`docs/p2-development/admin-prisma-password-auth/development.md`

## 1. 验证范围

- Prisma Schema、迁移和客户端生成。
- 密码登录、刷新轮换、退出幂等、会话查询。
- 管理员角色、封禁、过期和撤销边界。
- Cookie 属性、token 哈希和敏感日志边界。
- TypeScript、ESLint、Vitest、Next.js build、Prisma validate，以及仓库根级 Flutter 检查。

## 2. 用例清单

### 2.1 登录

- [x] P3-AP-001 正确管理员密码登录成功，创建会话并返回 `admin_session` Cookie。 service 层用例断言生成会话行、写入 SHA-256 摘要并返回原始 token；Cookie 序列化用例断言 `admin_session` 属性。
- [x] P3-AP-002 不存在用户返回 401 `AUTH_INVALID_CREDENTIALS`。 路由用例 `returns 401 AUTH_INVALID_CREDENTIALS for an unknown email`。
- [x] P3-AP-003 密码错误返回 401 `AUTH_INVALID_CREDENTIALS`。 service 用例 `fails identically when the password is wrong`。
- [x] P3-AP-004 普通用户密码正确返回 403 `ADMIN_REQUIRED`。 service 用例 `rejects non-admins with ADMIN_REQUIRED`。
- [x] P3-AP-005 有效封禁管理员返回 403 `USER_BANNED`。 service 用例 `rejects an actively banned admin with USER_BANNED`。
- [x] P3-AP-006 封禁过期的管理员可以登录。 service 用例 `allows an admin whose ban has already expired`。
- [x] P3-AP-007 请求校验失败返回 422 `VALIDATION_FAILED`，非 `admin-web` 客户端被拒绝。 路由用例 `rejects a non-admin-web client type with 422 PROVIDER_UNSUPPORTED` 与 `rejects malformed input with 422 VALIDATION_FAILED and clears the cookie`。
- [x] P3-AP-008 密码、token、Cookie 不出现在日志记录中。 `auth error serialization` 用例断言错误信封不携带密码、token、Cookie 材料，依赖失败信息保持通用。

### 2.2 会话与刷新

- [x] P3-AP-009 `GET /auth/session` 返回用户、权限和过期时间。 service 用例 `returns the user, permissions and expiry and touches last seen`。
- [x] P3-AP-010 缺失/未知 token 返回 401 `AUTH_REQUIRED`。 路由用例（缺失 Cookie 不触碰数据库）与 service 用例 `rejects a missing or malformed token as AUTH_REQUIRED without querying` / `rejects an unknown session as AUTH_REQUIRED`。
- [x] P3-AP-011 已过期 token 返回 401 `TOKEN_EXPIRED`。 service 用例 `distinguishes revoked (AUTH_REQUIRED) from expired (TOKEN_EXPIRED)`。
- [x] P3-AP-012 已撤销 token 返回 401 `AUTH_REQUIRED`。 同上用例的 revoked 分支。
- [x] P3-AP-013 刷新成功轮换 token，旧 token 失效。 service 用例 `rotates the session to a new token digest`。
- [x] P3-AP-014 刷新旧 token 重放返回 401 `REFRESH_INVALID`。 service 用例 `treats a competing rotation of the same token as a replay`。
- [x] P3-AP-015 封禁用户刷新返回 403 `USER_BANNED`。 service 用例 `rejects banned admins`（refresh 分组）。
- [x] P3-AP-016 退出撤销当前会话并清空 Cookie，重复退出仍成功。 service 用例 `revokes the session matching the token digest` 与 `stays idempotent and skips the repository for missing or malformed tokens`；路由用例断言成功并清除 Cookie。

### 2.3 Cookie 与数据安全

- [x] P3-AP-017 Cookie 包含 `HttpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age=43200`。 Cookie 用例 `emits the hardened admin session cookie attributes`。
- [x] P3-AP-018 生产环境 Cookie 包含 `Secure`，开发环境不强制。 Cookie 用例 `appends Secure only when explicitly requested` 与 `only enables Secure in production`。
- [x] P3-AP-019 数据库只保存 token SHA-256 摘要，不保存明文 token。 service 用例 `creates a session with the SHA-256 token digest`；`hashSessionToken` 用例断言摘要为小写十六进制且不等于明文 token。
- [x] P3-AP-020 无效 Cookie token 不参与数据库查询或返回统一认证错误。 路由与 service 用例断言非法/缺失 token 直接早退、不发起数据库查询。

### 2.4 工程验证

- [x] P3-AP-021 `pnpm test` 通过。 `pnpm test`：12 个测试文件、110 条用例全部通过。
- [x] P3-AP-022 `pnpm lint` 通过。 `pnpm lint`：`eslint` 无错误、无警告。
- [x] P3-AP-023 `pnpm build` 通过。 `pnpm build`：Next.js 16.3.5 Turbopack 构建成功；四个 auth 路由均为动态路由（ƒ）。
- [x] P3-AP-024 `pnpm exec prisma validate` 通过。 `pnpm exec prisma validate`：schema 有效。
- [x] P3-AP-025 `pnpm exec prisma generate` 通过。 `pnpm exec prisma generate`：生成 Prisma Client 7.10.0 到 `./generated/prisma`。
- [x] P3-AP-026 `git diff --check` 通过。 `git diff --check`：无空白/行尾错误。

根级 `AGENTS.md` 要求的 Flutter 检查已执行：`flutter analyze` 通过；`flutter test` 失败，失败项均位于本次未修改的 Schools/UI 测试（见 3.2）。

## 3. 执行结果

> 执行时间：2026-09-26；Admin 命令执行目录：`admin/`，Flutter 命令执行目录：仓库根目录。

| 命令 | 结果 | 摘要 |
|---|---|---|
| `pnpm exec tsc --noEmit` | 通过 | 无类型错误 |
| `pnpm test` | 通过 | 12 个测试文件 / 110 条用例全部通过（Vitest 5.0.1） |
| `pnpm lint` | 通过 | `eslint` 无错误、无警告 |
| `pnpm exec prisma validate` | 通过 | `prisma/schema.prisma` 有效 |
| `pnpm exec prisma generate` | 通过 | 生成 Prisma Client 7.10.0 到 `./generated/prisma` |
| `pnpm build` | 通过 | Next.js 16.3.5 Turbopack 构建成功；4 个 auth 路由为动态路由 |
| `git diff --check` | 通过 | 无空白/行尾错误 |
| `flutter analyze` | 通过 | `No issues found` |
| `flutter test` | 失败 | 4 条既有 Schools/UI 用例失败；本次未修改 Flutter 代码 |

Prisma 命令与 `pnpm build` 使用占位 `DATABASE_URL` 执行，仅用于让 Prisma CLI/构建读取 schema，
不连接任何真实数据库，也未读取或输出 `admin/.env.local` 中的真实连接串。

### 3.1 修复过程

- 路由测试导入 `server-only` 依赖时失败（"This module cannot be imported from a Client Component module"）：
  改为统一 `@/lib/...` 别名导入并配合 `vi.mock`，在 `vitest.config.mts` 中配置 `@` 别名与 `test.include`。
- Vite 提示 ESM 配置文件告警：`vitest.config.ts` 重命名为 `vitest.config.mts`。

### 3.2 未执行 / 遗留风险

- `flutter test`：执行失败，共 4 条用例失败，全部位于本次未修改的 Schools/UI 测试：
  `schools_mobile_test.dart` 的 3 条（移动端布局、趋势表展开、标签横向滚动）以及 `business_modules_test.dart` 的 1 条（SchoolsView 搜索/趋势/收藏）。
  本次未改动 Flutter 侧代码，未在 Admin 登录任务中修复这些无关失败；因此不能声明仓库根级测试全绿。`flutter analyze` 已通过。
- 远端 Supabase 未应用迁移 `supabase/migrations/20260926130000_admin_prisma_auth.sql`，
  未做真实数据库的端到端验证（登录写入、并发轮换、RLS 行为均待迁移后验证）。
- 非阻塞警告：`next build` 提示仓库外存在 `pnpm-workspace.yaml`，建议后续在 `next.config.ts` 设置 `turbopack.root`；
  本轮为最小改动未处理。
- 生产环境必须配置可访问新增表的 `DATABASE_URL`；未配置时相关路径返回 503 `DEPENDENCY_UNAVAILABLE`。
