# P2 - Admin Prisma 管理员密码登录开发

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：实施中，最终结果待回填  
> 上游设计：`docs/p1-design/admin-prisma-password-auth/design.md`

## 1. 原子 Todo

- [ ] P2-AP-001 新增 Prisma 7 依赖、`prisma.config.ts` 与 `schema.prisma`。
- [ ] P2-AP-002 新增幂等数据库迁移 `admin_credentials` / `admin_sessions`。
- [ ] P2-AP-003 实现 `lib/db/prisma.ts` 惰性单例，避免构建期连接数据库。
- [ ] P2-AP-004 实现密码、token、Cookie、权限工具。
- [ ] P2-AP-005 定义 `AuthRepository` 领域接口与 fake-friendly 数据模型。
- [ ] P2-AP-006 实现 Prisma 仓储与事务轮换、异常映射。
- [ ] P2-AP-007 实现 `AuthService` 登录、刷新、退出、会话查询状态机。
- [ ] P2-AP-008 实现四个 Route Handler 与统一响应/Cookie 组合。
- [ ] P2-AP-009 编写 Vitest 单元测试覆盖关键安全与状态边界。
- [ ] P2-AP-010 执行 lint、test、build、Prisma validate/generate 并回填本文件与 P3。

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

待实现与验证后回填，不预填通过状态。
