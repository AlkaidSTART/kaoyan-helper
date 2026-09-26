# P1 - Next.js BFF 环境变量契约

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：待实现验证

## 1. 命名来源

仓库根目录 `.env.local` 中已存在的变量名为：

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL
```

这三项属于 Supabase 新版 API Key 命名（可发布密钥 / 密钥），与旧文档中的
`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` **不是同一命名**。

## 2. 决策

- 采用实际存在的命名：`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SECRET_KEY`。
- 不新增 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 别名，避免同一密钥出现两套名字。
- 旧文档中的 `SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_ANON_KEY` 表述视为历史稿，按本节命名对齐。

## 3. 变量表

| 变量 | 作用域 | 说明 |
|---|---|---|
| `SUPABASE_URL` | 服务端 + 公开 | Supabase 项目 URL |
| `SUPABASE_PUBLISHABLE_KEY` | 服务端 + 公开 | 可发布密钥，绑定用户 JWT 时使用 |
| `SUPABASE_SECRET_KEY` | **仅服务端** | 高权限密钥，禁止进入客户端 bundle、日志与错误响应 |
| `SUPABASE_JWKS_URL` | 仅服务端 | 校验令牌签名使用，可选 |
| `AI_API_KEY` | 仅服务端 | AI 上游密钥，未配置时 AI 接口返回 `DEPENDENCY_UNAVAILABLE` |
| `AI_BASE_URL` | 仅服务端 | AI 上游地址，可选，默认官方地址 |
| `APP_ORIGIN` | 仅服务端 | 生产 CORS / Origin 校验白名单，逗号分隔 |

## 4. 加载与失败策略

- 服务端模块通过 `lib/env.ts` 统一读取，禁止在业务代码里散落 `process.env.X`。
- `admin/` 项目从 `admin/.env.local` 读取（`admin/.gitignore` 已忽略 `.env*`），不读取仓库根 `.env.local`。
- 缺失 `SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY` 时视为配置错误：请求返回 503 `DEPENDENCY_UNAVAILABLE`，并在服务端日志记录 `errorCode=CONFIG_MISSING`。
- 缺失 `SUPABASE_SECRET_KEY` 时：公共与用户接口仍可用；管理端与管理函数返回 503 `DEPENDENCY_UNAVAILABLE`。
- 任何密钥不写入仓库、文档、日志、错误响应与构建产物。

## 5. 校验清单

- `GET /api/v1/auth/session` 未登录返回 401 `AUTH_REQUIRED`（而非 500），证明配置缺失不会泄漏内部信息。
- 构建产物中不出现 `SUPABASE_SECRET_KEY` 的值；`lib/supabase/admin.ts` 标记 `server-only`。
