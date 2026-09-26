# P2 - Admin Prisma 管理员密码登录开发

> 版本：v1.0  
> 日期：2026-09-26  
>
> 状态：核心实现完成，静态检查与测试通过；远端迁移未应用，数据库端到端验证待执行
>
> 上游设计：`docs/p1-design/admin-prisma-password-auth/design.md`

## 1. 原子 Todo

- [x] P2-AP-001 新增 Prisma 7 依赖、`prisma.config.ts` 与 `schema.prisma`（`@prisma/client`、`@prisma/adapter-pg`、`bcryptjs`、`zod`）。
- [x] P2-AP-002 新增幂等数据库迁移 `admin_credentials` / `admin_sessions`：`supabase/migrations/20260926130000_admin_prisma_auth.sql`（未在远端 Supabase 应用）。
- [x] P2-AP-003 实现 `lib/db/prisma.ts` 惰性单例，避免构建期连接数据库；新增 `PrismaClientConfigurationError`。
- [x] P2-AP-004 实现密码（bcryptjs 成本 12 + dummy compare）、token（随机 + SHA-256）、Cookie（纯函数）、权限工具。
- [x] P2-AP-005 定义 `AuthRepository` 领域接口与 fake-friendly 数据模型。
- [x] P2-AP-006 实现 Prisma 仓储与事务轮换、Prisma 异常到安全 `AppError` 的映射。
- [x] P2-AP-007 实现 `AuthService` 登录、刷新、退出、会话查询状态机。
- [x] P2-AP-008 实现四个 Route Handler（`app/api/v1/auth/{login/password,refresh,logout,session}/route.ts`）与统一响应/Cookie 组合。
- [x] P2-AP-009 编写 Vitest 单元测试覆盖关键安全与状态边界（12 个测试文件、110 条用例）。
- [x] P2-AP-010 执行 tsc / lint / test / build / Prisma validate+generate 与 `git diff --check` 并回填本文件与 P3。

## 2. 依赖顺序

```text
Schema / migration
  -> Prisma singleton
  -> token / password / cookie / permissions
  -> repository contract
  -> service
  -> routes
  -> tests
  -> verification
```

## 3. 实施问题与决策记录

### ADR-AP-001：管理会话不使用 Supabase 浏览器 token

管理后台使用独立服务端 Session 表与 HttpOnly Cookie。这样可以精确撤销会话，并避免把 Supabase access/refresh token 暴露到浏览器 JavaScript。

### ADR-AP-002：权限事实源仍为 `public.users`

Prisma 只新增管理员凭据和会话存储，不复制 `role`、`is_banned`。认证服务每次读取用户当前状态，封禁后可立即拒绝新登录和会话查询。

### ADR-AP-003：密码校验使用 bcryptjs 成本 12

Node.js 环境中 bcryptjs 无原生编译依赖，便于 CI 和部署。用户不存在时仍执行一次 dummy compare，降低账号枚举时序差异。

### ADR-AP-004：刷新使用条件撤销 + 事务创建

轮换在 Prisma 事务内完成。旧会话通过条件更新撤销；若并发请求已经撤销同一 token，则更新影响行数为 0，按 token 重放返回 `REFRESH_INVALID`。

### ADR-AP-005：Cookie 由 Route Handler 显式写入

Route Handler 使用 Web `Response`，通过 `Set-Cookie` 写回。cookie 解析与序列化保持纯函数，便于测试，也不依赖 Server Component 的 `cookies()`。

## 4. 实施问题和实际结果

### 4.1 实际改动

- 已提交（HEAD `bb9ddc7`）：`prisma.config.ts`、`prisma/schema.prisma`、增量迁移
  `supabase/migrations/20260926130000_admin_prisma_auth.sql`、`lib/db/prisma.ts`、
  `lib/auth/{auth-repository,auth-service,cookie,password,permissions,prisma-auth-repository,session-token}.ts`。
- 本轮工作区新增：四个 Route Handler、`lib/auth/__tests__/{auth-service,cookie,session-token}.test.ts`、
  `app/api/v1/auth/__tests__/routes.test.ts`、`vitest.config.mts`。
- 本轮修改：`lib/auth/prisma-auth-repository.ts`、`lib/db/prisma.ts`。

### 4.2 问题与决策

- **Prisma Client 早退路径误判 503**：原先仓储在构造时即解析 Prisma Client，导致缺少 `DATABASE_URL`
  的环境下，连无 Cookie/非法 token 的 401 早退路径也会因客户端初始化失败而返回 503。
  已改为惰性解析（构造函数不触碰 `getPrismaClient()`，首次真实数据库操作才解析），并支持测试注入 fake client。
- **Prisma 配置缺失的错误类型**：`lib/db/prisma.ts` 新增 `PrismaClientConfigurationError`，
  `mapPrismaError` 对已是 `AppError` 的输入直通，把配置错误与 Prisma 初始化/请求错误统一映射为
  `DEPENDENCY_UNAVAILABLE`，不泄漏连接串或原始错误。
- **路由测试与 `server-only` 冲突**：Route Handler 依赖 `server-only`，直接导入会在测试环境报
  "This module cannot be imported from a Client Component module"。改为测试统一使用 `@/lib/...` 别名导入与
  `vi.mock("@/lib/...")`，并在 `vitest.config.mts` 配置 `@` 别名与 `environment: "node"`。
- **Vite ESM 配置告警**：`vitest.config.ts` 重命名为 `vitest.config.mts`，消除配置文件 ESM 告警。

### 4.3 已知边界（本轮未做）

- 远端 Supabase 未应用 `20260926130000_admin_prisma_auth.sql`，未做真实数据库端到端验证。
- Flutter 普通用户 Bearer token 登录/刷新/退出分支、OAuth、验证码、找回密码、密码修改未实现。
- 完整细粒度 RBAC 路由守卫与业务管理接口未实现。
- 未做分布式限流；多实例部署下的暴力破解防护需在网关或共享 Redis 层补充。
- `public.users.role='admin'` 与 `admin_credentials` 初始凭据由受控运维流程写入，接口不提供提权能力。
