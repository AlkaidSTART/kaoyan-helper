# P0 - Admin Prisma 管理员密码登录

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：已定义，待实现验证  
> 上游需求：`docs/p0-definition/next-backend-api-rbac/definition.md`

## 1. 实际痛点

管理后台当前只有接口基础层，没有可用的登录闭环。若继续沿用浏览器端 Supabase 会话，会出现以下问题：

- 管理后台需要额外维护 Supabase 客户端与会话刷新逻辑，难以把服务端会话撤销落到实处。
- 管理员密码认证没有统一的后端边界，无法稳定返回 `ADMIN_REQUIRED`、`USER_BANNED` 等业务错误。
- 数据库中没有独立的管理员凭据记录，无法在服务端控制密码哈希成本、轮换和审计。
- 浏览器与服务端之间缺少明确的 HttpOnly Cookie 契约，容易出现 token 泄漏或客户端自行拼接身份头的问题。

## 2. 目标用户与场景

| 角色 | 场景 | 期望结果 |
|---|---|---|
| 管理员 | 使用邮箱和密码进入管理后台 | 创建服务端会话，浏览器持有 HttpOnly Cookie |
| 管理员 | 刷新管理后台页面或延长会话 | 使用最新 Cookie 轮换会话，旧会话不可复用 |
| 管理员 | 主动退出或重复退出 | 服务端撤销会话并清理 Cookie，重复调用保持幂等 |
| 管理员 | 读取当前会话 | 获得当前用户、权限和过期时间 |
| 普通用户或已封禁用户 | 尝试访问管理后台 | 被服务端明确拒绝，不创建管理会话 |

## 3. 范围边界

### 3.1 本期包含

- `POST /api/v1/auth/login/password`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- Prisma Schema、数据库迁移、密码哈希、会话 token 哈希、Cookie 序列化、Repository 与 Service 基础分层。
- 仅允许 `public.users.role = 'admin'` 且未处于有效封禁期的用户建立管理会话。

### 3.2 本期不包含

- 验证码登录、OAuth、找回密码、修改密码页面。
- 完整的管理员 RBAC 路由守卫、审计后台页面和管理业务接口。
- 独立管理员角色体系；`public.users.role` 和封禁字段仍是唯一权限事实源。
- 验证码、短信、邮件服务和第三方身份提供方。
- 验证码或密码登录 UI。
- 分布式限流、风控和设备指纹；当前仅保留后续接入网关或 Redis 限流的位置。

## 4. 权限与安全规则

1. 只有 `role = 'admin'` 可建立管理后台会话。
2. `is_banned = true` 且 `banned_until` 为空或未过期时，禁止登录和读取会话；封禁时间已过则视为未封禁。
3. 密码使用 bcrypt 成本因子 12 校验，禁止明文、SHA-256 或自定义可逆算法。
4. 用户不存在与密码错误返回相同错误 `AUTH_INVALID_CREDENTIALS`。
5. 非管理员在密码正确后返回 `ADMIN_REQUIRED`；封禁用户返回 `USER_BANNED`。
6. 会话只保存 token 的 SHA-256 哈希，浏览器 Cookie 只保存随机 token。
7. Cookie 固定使用 `admin_session`，设置 `HttpOnly`、`SameSite=Lax`、`Path=/`，生产环境追加 `Secure`。
8. 刷新必须轮换 token，旧 token 只能成功使用一次。
9. 日志不记录密码、token、Cookie 或密码哈希。

## 5. 验收指标

- 正确管理员密码登录返回 200，响应包含用户对象，并写入 `admin_session` Cookie。
- 错误邮箱、错误密码、不存在用户均返回 401 `AUTH_INVALID_CREDENTIALS`。
- 普通用户即使密码正确也不能建立管理会话，返回 403 `ADMIN_REQUIRED`。
- 有效封禁管理员返回 403 `USER_BANNED`。
- 刷新成功后旧 token 失效，新 token 可用；重复使用旧 token 返回 401 `REFRESH_INVALID`。
- 退出后当前会话失效并清理 Cookie，重复退出仍返回成功。
- 会话查询能区分缺失/无效身份与已过期会话，并返回稳定的用户、权限和过期时间。
- 自动化测试覆盖密码、角色、封禁、会话过期/撤销/轮换、Cookie 属性和敏感日志边界。
