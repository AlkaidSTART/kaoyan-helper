# P1 - Admin Prisma 管理员密码登录设计

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：设计完成，待实现验证  
> 上游定义：`docs/p0-definition/admin-prisma-password-auth/definition.md`

## 1. 架构决策

本轮在 `admin` 应用内引入 Prisma 作为服务端 ORM，但不在浏览器或 Route Handler 中直接拼 SQL。调用链固定为：

```text
Route Handler (Zod 校验 / HTTP Cookie)
  -> AuthService (认证规则 / 会话状态机)
    -> AuthRepository (领域接口)
      -> PrismaAuthRepository
        -> Prisma Client + PostgreSQL
```

- `AuthService` 不依赖 Prisma、Next.js 或具体数据库，便于使用 fake repository 做单元测试。
- `PrismaAuthRepository` 只负责查询、事务和 Prisma 异常映射，不向 Route Handler 泄漏 Prisma 原始错误。
- `lib/db/prisma.ts` 只提供惰性单例，模块导入时不得建立数据库连接。

## 2. 数据模型

复用基线迁移中的 `public.users`，新增两张服务端表：

### 2.1 `admin_credentials`

| 列 | 类型 | 约束 |
|---|---|---|
| `user_id` | uuid | 主键，外键到 `public.users(id)`，级联删除 |
| `password_hash` | text | 非空，bcrypt 哈希 |
| `created_at` | timestamptz | 非空，默认 `now()` |
| `updated_at` | timestamptz | 非空，默认 `now()`，由触发器维护 |

### 2.2 `admin_sessions`

| 列 | 类型 | 约束 |
|---|---|---|
| `id` | uuid | 主键，默认 `gen_random_uuid()` |
| `token_hash` | text | 非空唯一，只保存 SHA-256 十六进制摘要 |
| `user_id` | uuid | 非空，外键到 `public.users(id)`，级联删除 |
| `device_name` | text | 可空，来自登录请求的可选设备名 |
| `expires_at` | timestamptz | 非空 |
| `revoked_at` | timestamptz | 可空 |
| `last_seen_at` | timestamptz | 非空 |
| `created_at` | timestamptz | 非空，默认 `now()` |

索引：`(user_id, expires_at)`、`(expires_at)`。两表启用 RLS 且不创建浏览器端策略，仅由服务端数据库角色访问。

## 3. HTTP 接口契约

### 3.1 登录

`POST /api/v1/auth/login/password`

请求：

```json
{
  "email": "admin@example.com",
  "password": "correct horse battery staple",
  "clientType": "admin-web",
  "deviceName": "Chrome on macOS"
}
```

成功响应为统一 envelope，`data`：

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "nickname": "管理员",
    "avatarUrl": null,
    "role": "admin",
    "isBanned": false,
    "examYear": null,
    "createdAt": "2026-09-26T10:00:00Z",
    "updatedAt": "2026-09-26T10:00:00Z"
  }
}
```

同时返回 `Set-Cookie: admin_session=<token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; ...`。

### 3.2 刷新

`POST /api/v1/auth/refresh` 无请求体，从 `admin_session` Cookie 读取当前 token。

成功响应 `data`：

```json
{ "expiresIn": 43200 }
```

服务端在同一事务内撤销旧会话并创建新的会话，返回新的 `admin_session` Cookie。重复使用旧 token 返回 401 `REFRESH_INVALID`。

### 3.3 退出

`POST /api/v1/auth/logout` 无 body。存在有效 Cookie 时撤销对应会话；Cookie 缺失、已经撤销或 token 无法识别时仍返回成功，并清空 Cookie。

成功响应 `data: null`。

### 3.4 会话查询

`GET /api/v1/auth/session` 从 Cookie 读取会话。

成功响应 `data`：

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "nickname": "管理员",
    "avatarUrl": null,
    "role": "admin",
    "isBanned": false,
    "examYear": null,
    "createdAt": "2026-09-26T10:00:00Z",
    "updatedAt": "2026-09-26T10:00:00Z"
  },
  "permissions": ["admin:dashboard:read"],
  "expiresAt": "2026-09-26T22:00:00Z"
}
```

缺失或无法识别的会话返回 401 `AUTH_REQUIRED`；已过期会话返回 401 `TOKEN_EXPIRED`；已撤销会话按无效身份处理。

## 4. 认证状态机

```text
登录:
  规范化 email -> 查询 credential(+user)
  -> 不存在/密码错误: AUTH_INVALID_CREDENTIALS
  -> 非 admin: ADMIN_REQUIRED
  -> 有效封禁: USER_BANNED
  -> 生成随机 token / SHA-256 -> 创建 admin_session
  -> Set-Cookie + 返回用户

刷新:
  读取 Cookie -> 缺失/格式错误: REFRESH_INVALID
  -> 查询会话; 不存在/已撤销/已过期: REFRESH_INVALID
  -> 用户非 admin: ADMIN_REQUIRED
  -> 有效封禁: USER_BANNED
  -> 条件撤销旧会话 + 创建新会话(事务)
  -> 条件撤销冲突: REFRESH_INVALID
  -> 轮换 Cookie

会话查询:
  读取 Cookie -> 缺失/无法识别: AUTH_REQUIRED
  -> 已过期: TOKEN_EXPIRED
  -> 已撤销: AUTH_REQUIRED
  -> 非 admin: ADMIN_REQUIRED
  -> 有效封禁: USER_BANNED
  -> touch last_seen_at -> 返回用户/权限/过期时间
```

## 5. 异常映射

| 场景 | 业务码 | HTTP |
|---|---|---:|
| JSON 结构错误 | `INVALID_ARGUMENT` | 400 |
| Schema 字段错误 | `VALIDATION_FAILED` | 422 |
| 缺少或无效会话身份 | `AUTH_REQUIRED` | 401 |
| 会话已过期 | `TOKEN_EXPIRED` | 401 |
| 刷新凭证缺失/失效/重放 | `REFRESH_INVALID` | 401 |
| 邮箱或密码错误 | `AUTH_INVALID_CREDENTIALS` | 401 |
| 非管理员 | `ADMIN_REQUIRED` | 403 |
| 有效封禁 | `USER_BANNED` | 403 |
| Prisma/数据库不可用 | `DEPENDENCY_UNAVAILABLE` | 503 |

Prisma 原始错误、SQL、表名、连接串和堆栈只能进入服务端 `cause`，不得序列化到响应或日志。

## 6. Cookie 与 token 安全

- Cookie 名：`admin_session`。
- token：32 字节随机数，Base64URL 编码。
- 数据库存储：token 的 SHA-256 十六进制摘要。
- TTL：12 小时（43,200 秒）。
- 属性：`HttpOnly; SameSite=Lax; Path=/; Max-Age=43200; Expires=<UTC>`。
- 生产环境自动追加 `Secure`；开发环境不强制，便于本地 HTTP 调试。
- Cookie 序列化前验证 token 只包含 Base64URL 字符。
- 退出时使用 `Max-Age=0` 和过去时间清空 Cookie。

## 7. 分层与依赖

- `lib/auth/password.ts`：bcrypt 哈希与校验、dummy compare。
- `lib/auth/session-token.ts`：随机 token、SHA-256、token 格式校验。
- `lib/auth/cookie.ts`：Cookie 读取/序列化，不依赖 Next.js。
- `lib/auth/auth-repository.ts`：领域类型和仓储接口。
- `lib/auth/prisma-auth-repository.ts`：Prisma 实现和事务轮换。
- `lib/auth/auth-service.ts`：认证、刷新、退出、会话状态机。
- `lib/auth/permissions.ts`：管理员权限列表。
- `lib/db/prisma.ts`：Prisma Client 惰性单例。
- `app/api/v1/auth/**/route.ts`：仅负责解析请求、调用 service、写入 Cookie 和统一响应。

## 8. 测试策略

- 使用 fake repository、可控时钟和可控 token generator 测试 `AuthService`，不依赖真实数据库。
- 使用 Vitest 单元测试验证 Cookie 属性、token 摘要和格式化时间。
- 路由层保持薄封装，核心行为在 service 测试中覆盖。
- `server-only` 只保留在服务端基础设施模块，测试核心 service 时不导入 Prisma 客户端。
