# P3 - Admin Prisma 管理员密码登录验证

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：待执行  
> 上游计划：`docs/p2-development/admin-prisma-password-auth/development.md`

## 1. 验证范围

- Prisma Schema、迁移和客户端生成。
- 密码登录、刷新轮换、退出幂等、会话查询。
- 管理员角色、封禁、过期和撤销边界。
- Cookie 属性、token 哈希和敏感日志边界。
- TypeScript、ESLint、Vitest、Next.js build 和 Prisma validate。

## 2. 用例清单

### 2.1 登录

- [ ] P3-AP-001 正确管理员密码登录成功，创建会话并返回 `admin_session` Cookie。
- [ ] P3-AP-002 不存在用户返回 401 `AUTH_INVALID_CREDENTIALS`。
- [ ] P3-AP-003 密码错误返回 401 `AUTH_INVALID_CREDENTIALS`。
- [ ] P3-AP-004 普通用户密码正确返回 403 `ADMIN_REQUIRED`。
- [ ] P3-AP-005 有效封禁管理员返回 403 `USER_BANNED`。
- [ ] P3-AP-006 封禁过期的管理员可以登录。
- [ ] P3-AP-007 请求校验失败返回 422 `VALIDATION_FAILED`，非 `admin-web` 客户端被拒绝。
- [ ] P3-AP-008 密码、token、Cookie 不出现在日志记录中。

### 2.2 会话与刷新

- [ ] P3-AP-009 `GET /auth/session` 返回用户、权限和过期时间。
- [ ] P3-AP-010 缺失/未知 token 返回 401 `AUTH_REQUIRED`。
- [ ] P3-AP-011 已过期 token 返回 401 `TOKEN_EXPIRED`。
- [ ] P3-AP-012 已撤销 token 返回 401 `AUTH_REQUIRED`。
- [ ] P3-AP-013 刷新成功轮换 token，旧 token 失效。
- [ ] P3-AP-014 刷新旧 token 重放返回 401 `REFRESH_INVALID`。
- [ ] P3-AP-015 封禁用户刷新返回 403 `USER_BANNED`。
- [ ] P3-AP-016 退出撤销当前会话并清空 Cookie，重复退出仍成功。

### 2.3 Cookie 与数据安全

- [ ] P3-AP-017 Cookie 包含 `HttpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age=43200`。
- [ ] P3-AP-018 生产环境 Cookie 包含 `Secure`，开发环境不强制。
- [ ] P3-AP-019 数据库只保存 token SHA-256 摘要，不保存明文 token。
- [ ] P3-AP-020 无效 Cookie token 不参与数据库查询或返回统一认证错误。

### 2.4 工程验证

- [ ] P3-AP-021 `pnpm test` 通过。
- [ ] P3-AP-022 `pnpm lint` 通过。
- [ ] P3-AP-023 `pnpm build` 通过。
- [ ] P3-AP-024 `pnpm exec prisma validate` 通过。
- [ ] P3-AP-025 `pnpm exec prisma generate` 通过。
- [ ] P3-AP-026 `git diff --check` 通过。

根级 `AGENTS.md` 要求的 `flutter analyze`、`flutter test` 只在本轮未修改 Flutter 代码时记录为未执行，不伪造通过。

## 3. 执行结果

待实现后回填真实命令、输出摘要、失败修复过程和遗留风险。
