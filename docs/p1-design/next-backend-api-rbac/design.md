# P1 - Next.js 后端接口与 RBAC 设计

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：设计基线，待实现验证  
> 上游需求：`docs/p0-definition/next-backend-api-rbac/definition.md`  
> 接口明细：`docs/p1-design/next-backend-api-rbac/api-contract.md`

## 1. 设计目标

本设计把 Next.js 作为 Flutter 与管理后台共用的 BFF/API 层，固定 API 前缀为 `/api/v1`。Flutter 不再直接调用 Supabase 业务表；Next.js 负责身份验证、参数校验、RBAC、业务编排、标准响应和审计。

必须同时成立以下四条规则：

1. 客户端传入的角色、权限、`creatorId`、`userId` 均不可信，一律由服务端从访问令牌和数据库解析。
2. 路由层与领域服务层必须双重检查权限，不能只在 UI 或 middleware 做一次判断。
3. 普通用户请求优先使用用户 JWT 调 Supabase，保留 RLS 作为纵深防御；高权限跨用户操作才使用 service role，并且必须先通过 RBAC。
4. 标准答案、官方解析、判题、错题状态、SM-2 计算和 UGC 审核结果均由服务端产生。

## 2. 目标架构

```text
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ Flutter                      │       │ Next.js Admin Web            │
│ Android/iOS/Web/macOS/Windows│       │ 浏览器页面                    │
└──────────────┬───────────────┘       └──────────────┬───────────────┘
               │ HTTPS + Bearer Token                 │ HTTPS + HttpOnly Cookie
               └──────────────────┬───────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Next.js 16 / App Router                                             │
│                                                                     │
│ Route Handler                                                       │
│   ├─ requestId / 日志 / 限流                                        │
│   ├─ Schema 校验                                                    │
│   ├─ 身份解析：Bearer 或 Cookie                                      │
│   ├─ 路由级 RBAC：requirePermission                                 │
│   └─ 调用领域服务                                                    │
│                                                                     │
│ Domain Service                                                      │
│   ├─ 业务规则：判题、错题状态机、SM-2、UGC 审核、配额               │
│   ├─ 服务层 RBAC 与所有权复核                                       │
│   └─ 事务 / 幂等 / 审计                                             │
│                                                                     │
│ Repository                                                          │
│   ├─ DTO 与数据库模型映射                                            │
│   └─ Supabase Client（用户 JWT 客户端或 server-only admin 客户端）   │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Supabase                                                            │
│ Auth │ PostgreSQL + RLS │ Storage │ Postgres Functions/RPC          │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
                    Upstash Redis / DeepSeek API
```

### 2.1 信任边界

| 边界 | 可信输入 | 不可信输入 | 处理原则 |
|---|---|---|---|
| Flutter → Next.js | `Authorization: Bearer <accessToken>` 中的签名身份 | body、query、path、本地角色缓存 | 所有输入重新校验，角色重新读取 |
| Admin Web → Next.js | HttpOnly Cookie 中的服务端会话 | 页面状态、隐藏字段、客户端权限 | middleware 做导航守卫，Route Handler 再做 API 鉴权 |
| Next.js → Supabase | 服务端解析出的用户身份、权限和资源 ID | 客户端直接提供的 `userId`/`role` | 用户操作使用用户 JWT + RLS；管理操作使用 admin client + 显式 RBAC |
| Next.js → 外部 AI | 服务端保存的密钥、服务端构造的上下文 | 客户端传入的答案或系统提示词 | 只允许服务端组装提示词，密钥不下发 |

### 2.2 Supabase 客户端选择

| 客户端 | 使用场景 | 关键限制 |
|---|---|---|
| Server user client | 普通用户读写个人资料、错题、闪卡、目标院校、答题记录 | 绑定请求中的 access token，保留 RLS |
| Server anonymous client | 只读已批准的公共题库、院校库、系统卡片 | 不携带 service role |
| Server admin client | 管理后台跨用户查询、封禁、审核、导入、审计写入 | `SUPABASE_SERVICE_ROLE_KEY` 只存在于服务端；调用前必须 `requirePermission` |
| Browser client | 管理后台仅用于登录与刷新会话；不直接查询业务表 | 不允许在浏览器持有 service role |

### 2.3 原子业务写入

以下操作必须放在数据库事务或 Postgres RPC 中，不允许由多个无事务的 HTTP 请求拼接：

- 提交答案并创建/更新错题记录。
- 重做错题并更新 `error_count`、`consecutive_correct`、`status`、`mastered_at`。
- 提交闪卡评级并更新 `user_card_progress`。
- 完成当日最后一张到期卡片并写入 `check_in_records`。
- 审核 UGC 并更新审核状态与审计日志。
- 封禁/解封用户并写入审计日志。

推荐使用带 `auth.uid()` 所有权校验的 Postgres RPC；只有管理类跨用户操作才由 Next.js 的 admin client 调用。

## 3. 身份与会话设计

### 3.1 身份事实源

- 身份提供方：Supabase Auth。
- 角色事实源：`public.users.role`，值域为 `user`、`admin`。
- 封禁事实源：`public.users.is_banned`。
- Next.js 每次受保护请求至少验证：令牌有效性、用户存在、`is_banned=false`、当前角色与权限。
- MVP 不缓存角色。后续如有性能压力，缓存 TTL 不得超过 60 秒，并在角色变更、封禁、登出时主动失效。

### 3.2 Flutter 会话流程

1. Flutter 调用 `POST /api/v1/auth/send-code` 发送邮箱验证码。
2. 用户输入验证码后调用 `POST /api/v1/auth/login/code`，`clientType=flutter`。
3. Next.js 验证 Supabase 会话，读取 `users.role` 与权限集合。
4. 响应仅向 Flutter 返回 `accessToken`、`refreshToken`、`expiresIn`、`user`、`permissions`。
5. Flutter 将令牌保存在安全存储；Android/iOS 使用安全存储，Web 使用受控存储并接受 XSS 风险约束。
6. access token 过期时调用 `POST /api/v1/auth/refresh`，请求体携带 `refreshToken`。
7. 退出时调用 `POST /api/v1/auth/logout`，服务端撤销会话并使本地令牌失效。

客户端不得持久化 `role` 作为后续请求的授权凭证；`role` 仅用于路由和 UI 可见性。每次请求最终权限仍由服务端判定。

### 3.3 管理后台会话流程

1. 管理后台通过 `POST /api/v1/auth/login/code`，`clientType=admin-web` 登录。
2. Next.js 校验 `users.role === 'admin'`，否则返回 403 `ADMIN_REQUIRED`。
3. 登录成功后设置 HttpOnly、Secure、SameSite=Lax 的会话 Cookie。
4. 管理后台页面导航由 middleware 做第一层守卫，`/api/v1/admin/*` Route Handler 再做权限检查。
5. 刷新和退出均通过服务端 Cookie 完成；浏览器 JavaScript 不接触 refresh token。
6. 角色降权后立即生效，因为 MVP 不缓存角色。

### 3.4 认证状态语义

| 场景 | HTTP | 业务码 | Flutter 行为 | Admin Web 行为 |
|---|---|---|---|---|
| 未携带凭证或凭证为空 | 401 | `AUTH_REQUIRED` | 跳转登录页 | 跳转登录页 |
| access token 已过期 | 401 | `TOKEN_EXPIRED` | 自动刷新后重试一次 | 调用 refresh 后重试一次 |
| refresh token 无效/过期 | 401 | `REFRESH_INVALID` | 清理会话并退出 | 清理 Cookie 并退出 |
| 已登录但角色/权限不足 | 403 | `FORBIDDEN` | 展示无权限页 | 展示无权限页 |
| 非管理员访问管理接口 | 403 | `ADMIN_REQUIRED` | 不展示入口；若请求则无权限 | 拒绝进入后台 |
| 用户被封禁 | 403 | `USER_BANNED` | 清理会话并提示联系管理员 | 清理会话并退出 |
| 资源不存在或无权感知 | 404 | `NOT_FOUND` | 展示空态 | 展示未找到 |

401 表示“尚不可确认身份”，403 表示“身份已确认，但权限不足”。禁止用 404 掩盖所有权限错误；仅对私有资源采用 404 防止资源枚举，并在日志中记录真实拒绝原因。

## 4. RBAC 模型

### 4.1 角色

| 角色 | 继承关系 | 说明 |
|---|---|---|
| `user` | 无 | 普通考生的个人学习能力 |
| `admin` | 继承 `user` | 额外拥有后台看板、用户管理、题库维护、UGC 审核、院校数据维护权限 |

管理员不是“绕过所有规则”的超级用户。管理员访问普通用户能力时仍以自身身份和自身资源为边界；只有明确授予的管理权限才允许跨用户操作。

### 4.2 权限点

| 权限 | `user` | `admin` | 资源范围 |
|---|:---:|:---:|---|
| `user:self:read` | ✓ | ✓ | 仅当前登录用户 |
| `user:self:update` | ✓ | ✓ | 仅当前登录用户 |
| `user:target:read` | ✓ | ✓ | 仅当前登录用户 |
| `user:target:write` | ✓ | ✓ | 仅当前登录用户，最多 1 个主目标 + 2 个备选 |
| `dashboard:self:read` | ✓ | ✓ | 仅当前登录用户的统计 |
| `quiz:read` | ✓ | ✓ | 已批准公共题或当前用户创建的题 |
| `quiz:submit` | ✓ | ✓ | 仅当前用户提交记录 |
| `quiz:create` | ✓ | ✓ | 创建者固定为当前用户 |
| `quiz:update:own` | ✓ | ✓ | 仅当前用户创建的题 |
| `quiz:delete:own` | ✓ | ✓ | 仅当前用户创建的题 |
| `mistake:read:own` | ✓ | ✓ | 仅当前用户错题 |
| `mistake:write:own` | ✓ | ✓ | 仅当前用户错题 |
| `flashcard:read` | ✓ | ✓ | 系统卡或当前用户创建的卡 |
| `flashcard:write:own` | ✓ | ✓ | 仅当前用户创建的自定义卡 |
| `flashcard:review:own` | ✓ | ✓ | 仅当前用户复习进度 |
| `school:read` | ✓ | ✓ | 已发布院校与专业数据 |
| `ai:chat` | ✓ | ✓ | 当前用户每日配额 |
| `admin:dashboard:read` | - | ✓ | 全局聚合，不含敏感明文 |
| `admin:users:read` | - | ✓ | 用户列表与详情 |
| `admin:users:ban` | - | ✓ | 封禁/解封，不可操作自身，不可封禁最后一名有效管理员 |
| `admin:questions:read` | - | ✓ | 含答案与解析的全局题库 |
| `admin:questions:write` | - | ✓ | 新增、编辑、软删除题库 |
| `admin:ugc:read` | - | ✓ | 待审核与历史审核队列 |
| `admin:ugc:review` | - | ✓ | 通过或驳回 UGC |
| `admin:schools:read` | - | ✓ | 完整院校数据 |
| `admin:schools:write` | - | ✓ | 新建、编辑、批量导入院校与专业数据 |
| `admin:audit:read` | - | ✓ | 高风险操作审计记录，首期可仅提供内部查询 |

### 4.3 权限判定顺序

```text
1. 是否为公开接口
   ├─ 是：校验 Schema、限流、执行
   └─ 否：继续
2. 解析 Bearer Token 或 HttpOnly Cookie
   ├─ 缺失：401 AUTH_REQUIRED
   └─ 无效/过期：401 TOKEN_EXPIRED 或 REFRESH_INVALID
3. 读取用户与角色
   ├─ 不存在：401 AUTH_REQUIRED
   ├─ 已封禁：403 USER_BANNED
   └─ 正常：继续
4. 检查接口所需权限和角色
   ├─ 无权限：403 FORBIDDEN / ADMIN_REQUIRED
   └─ 有权限：继续
5. 检查资源所有权或管理范围
   ├─ 私有资源非本人：404 NOT_FOUND，并记录审计日志
   └─ 通过：执行领域服务
6. 领域服务幂等、事务与审计
```

### 4.4 服务层复核

路由层的 `requirePermission` 只能判断“用户是否有某类权限”，不能替代服务层所有权判断。领域服务必须再次执行：

- `assertSelf(userId, resourceUserId)`
- `assertQuestionAccessible(actor, questionId)`
- `assertMistakeOwner(actor, mistakeId)`
- `assertCardAccessible(actor, cardId)`
- `assertTargetLimit(actor, operation)`
- `assertAdminScope(actor, adminAction)`

任何管理员高权限写入必须在同一事务中写入 `admin_audit_logs`。

## 5. API 统一约定

### 5.1 URL 与 HTTP 方法

- 前缀：`/api/v1`。
- 资源使用复数名词：`/questions`、`/mistakes`、`/schools`。
- 动作用子资源表达，避免 RPC 风格：`/questions/:id/answer`、`/flashcards/:id/review`。
- 管理接口固定在 `/api/v1/admin/*`，除非接口契约明确标记为内部导入任务。
- 写操作使用 `POST`、`PATCH`、`DELETE`，不把状态修改放入 `GET`。

### 5.2 请求头

| Header | 使用方 | 说明 |
|---|---|---|
| `Authorization: Bearer <token>` | Flutter | 受保护接口必填 |
| `Cookie: sb_access=...; sb_refresh=...` | Admin Web | HttpOnly 服务端会话 |
| `Content-Type: application/json` | 所有 JSON 请求 | 文件导入除外 |
| `X-Request-Id` | 可选 | 调用方链路 ID，服务端校验格式；缺失时生成 |
| `Idempotency-Key` | 可选/写操作 | 判分、审核、封禁等防止重复提交 |
| `Accept: text/event-stream` | AI SSE | AI 流式接口要求 |
| `X-Client-Version` | Flutter | 版本兼容与问题定位 |

禁止客户端传 `X-User-Id`、`X-Role` 等身份覆盖头。

### 5.3 成功响应

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01J8Y6M4Y8Q7K2P3T5V9X1Z0AB",
    "timestamp": "2026-09-26T10:00:00Z"
  }
}
```

列表响应：

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "req_01J8Y6M4Y8Q7K2P3T5V9X1Z0AB",
    "timestamp": "2026-09-26T10:00:00Z",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 137,
      "totalPages": 7
    }
  }
}
```

分页规则：

- 默认 `page=1`、`pageSize=20`，最大 `pageSize=100`。
- 所有可能增长的列表必须服务端分页；禁止“先查全量再由 Flutter 截断”。
- 排序默认为业务稳定顺序，并在接口契约中声明；禁止依赖数据库无保证的默认顺序。
- 超过最大分页时返回 422 `PAGINATION_INVALID`，而不是静默截断。

### 5.4 错误响应

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "请先登录",
    "details": null
  },
  "meta": {
    "requestId": "req_01J8Y6M4Y8Q7K2P3T5V9X1Z0AB",
    "timestamp": "2026-09-26T10:00:00Z"
  }
}
```

`details` 只能包含安全、可序列化、可展示的字段错误；不得包含 SQL、堆栈、令牌、密钥或 Supabase 原始错误。

### 5.5 HTTP 状态与业务码

| HTTP | 业务码 | 使用场景 |
|---:|---|---|
| 400 | `INVALID_ARGUMENT` | 请求格式本身不合法 |
| 401 | `AUTH_REQUIRED` | 缺少凭证 |
| 401 | `TOKEN_EXPIRED` | access token 过期 |
| 401 | `REFRESH_INVALID` | refresh token 无效或已撤销 |
| 403 | `FORBIDDEN` | 身份有效但权限不足 |
| 403 | `ADMIN_REQUIRED` | 非管理员访问管理能力 |
| 403 | `USER_BANNED` | 用户被封禁 |
| 404 | `NOT_FOUND` | 资源不存在或私有资源不可见 |
| 409 | `CONFLICT` | 唯一约束、重复提交、并发版本冲突 |
| 409 | `ATTEMPT_CONFLICT` | 同一 attempt 重复提交且内容不一致 |
| 409 | `ALREADY_REVIEWED` | UGC 已被其他管理员审核 |
| 422 | `VALIDATION_FAILED` | JSON 合法但字段语义不满足 |
| 422 | `PAGINATION_INVALID` | 分页参数越界或非法 |
| 429 | `RATE_LIMITED` | 通用限流 |
| 429 | `DAILY_LIMIT_EXCEEDED` | AI 每日配额耗尽 |
| 500 | `INTERNAL_ERROR` | 未预期服务端错误 |
| 503 | `DEPENDENCY_UNAVAILABLE` | Supabase、Redis、AI 上游暂不可用 |

### 5.6 时间与 ID

- 时间：UTC RFC3339，例如 `2026-09-26T10:00:00Z`。
- ID：UUID 字符串；请求链路 ID 使用 `req_` 前缀。
- JSON：统一 `camelCase`；数据库 `snake_case` 由 Repository 映射。
- 金额、比率和分数在 MVP 中按整数/浮点数明确声明；禁止隐式单位转换。

## 6. 资源所有权与范围

| 资源 | 普通用户可见范围 | 普通用户可写范围 | 服务端校验 |
|---|---|---|---|
| 用户资料 | 本人 | 昵称、头像、考试年份 | `users.id = auth.uid()` |
| 目标院校 | 本人 | 最多 3 条，其中主目标 1 条 | 用户 ID、数量、主目标唯一、学校存在 |
| 官方题目 | 已批准且未删除 | 不可写 | `source='official' AND is_approved=true` |
| UGC 题目 | 本人私有题或本人已提交题 | 本人题 | `creator_id = auth.uid()` |
| 公共 UGC | 已批准且未删除 | 本人题可编辑 | 编辑后重新进入待审核 |
| 错题记录 | 本人 | 本人 | `user_id = auth.uid()` |
| 闪卡 | 系统卡 + 本人 UGC 卡 | 本人 UGC 卡 | `source='system'` 或 `creator_id=auth.uid()` |
| 卡片进度 | 本人 | 本人 | `user_id = auth.uid()` |
| 打卡记录 | 本人 | 由复习事务创建 | `user_id = auth.uid()` |
| 管理资源 | 由权限决定 | 由权限决定 | `requirePermission` + 资源范围 + 审计 |

普通用户请求不得通过请求参数指定别人的 `userId` 来读写私有资源。服务端应优先从令牌获得用户 ID，路径只用于管理员跨用户接口。

## 7. Next.js 结构设计

```text
admin/
├── app/
│   ├── api/v1/
│   │   ├── auth/.../route.ts
│   │   ├── me/route.ts
│   │   ├── dashboard/summary/route.ts
│   │   ├── questions/.../route.ts
│   │   ├── mistakes/.../route.ts
│   │   ├── schools/.../route.ts
│   │   ├── flashcards/.../route.ts
│   │   ├── check-ins/route.ts
│   │   ├── ai/.../route.ts
│   │   └── admin/.../route.ts
│   └── (admin)/...
├── lib/
│   ├── api/
│   │   ├── response.ts          # 成功/错误/分页响应
│   │   ├── errors.ts            # AppError 与业务码
│   │   ├── request-context.ts   # requestId、身份、日志
│   │   └── validation.ts        # Zod/等价 Schema
│   ├── auth/
│   │   ├── session.ts           # Bearer/Cookie 解析
│   │   └── cookie.ts            # HttpOnly Cookie 设置与清理
│   ├── rbac/
│   │   ├── permissions.ts       # 权限常量
│   │   ├── role-map.ts          # 角色到权限映射
│   │   └── require-permission.ts
│   ├── supabase/
│   │   ├── server.ts            # 用户 JWT 客户端
│   │   ├── anonymous.ts         # 公共只读客户端
│   │   └── admin.ts             # service role，仅服务端
│   ├── services/                # 领域服务与事务编排
│   ├── repositories/            # 数据访问与 DTO 映射
│   └── audit/                   # 审计日志
└── middleware.ts                # 管理后台页面导航守卫
```

Route Handler 只做协议适配，不写业务规则；领域服务不直接读取 `Request`/`Response`；Repository 不决定权限。实现前必须阅读 `admin/node_modules/next/dist/docs/` 中与 Next.js 16 Route Handlers、cookies、middleware、runtime 相关的本地文档。

## 8. Flutter 改造边界

### 8.1 领域模型

当前 `UserModel` 需要在 API 落地时新增：

```dart
final String role;                 // user | admin
final List<String> permissions;    // 服务端返回的权限快照
final bool isBanned;
```

`targetSchool`、`targetMajor` 等展示字段继续保留，但真实数据来源改为 `/api/v1/me` 与 `/api/v1/me/targets`。

### 8.2 数据层

建议新增：

- `DioApiClient`：统一 base URL、超时、请求 ID、Bearer 注入。
- `AuthInterceptor`：401/`TOKEN_EXPIRED` 时单飞刷新，成功后重放一次请求。
- `ApiExceptionMapper`：把 HTTP/业务码映射为 `AppException`、`AuthException`、`NetworkException` 等强类型异常。
- `ApiEndpoints`：集中管理 `/api/v1` 路径，禁止 UI 和 Notifier 拼 URL。
- `AuthRepository`：替换当前 Fake 实现，管理登录、刷新、登出和会话恢复。
- 各领域 Repository：题目、错题、院校、闪卡、AI，全部只依赖 Dio 客户端，不直接依赖 Supabase 数据表。

### 8.3 状态与路由

- `AuthState` 增加 `role`、`permissions`、`isBanned`。
- Router 继续保留登录守卫，并增加管理员路由守卫：仅当 `role == 'admin'` 且具备对应权限时允许进入管理页面。
- UI 根据角色控制入口显隐，但不得把 UI 隐藏当作授权。
- Flutter 不持有 `service_role`、DeepSeek Key、Upstash Token 等敏感凭证。

### 8.4 迁移顺序

1. Dio Api Client、Auth Interceptor、异常映射。
2. 认证、会话、`/me`。
3. 题库与判题。
4. 错题状态机。
5. 院校与目标院校。
6. 闪卡、SM-2、打卡。
7. AI SSE。
8. 管理端接口与后台页面。
9. 移除 Flutter 对业务表、Edge Functions 的直接依赖；`supabase_flutter` 仅保留到 OAuth/迁移兼容不再需要为止。

迁移期间禁止同一业务场景同时保留两套写入路径；读路径可在灰度期短暂双通道，但必须记录数据来源和回滚条件。

## 9. AI SSE 协议

### 9.1 请求

```http
POST /api/v1/ai/chat
Authorization: Bearer <accessToken>
Accept: text/event-stream
Content-Type: application/json
```

```json
{
  "subject": "politics",
  "conversationId": "8a41f0c5-...",
  "messages": [
    {"role": "user", "content": "为什么对立统一规律是实质和核心？"}
  ],
  "context": {
    "questionId": "2e9e7a13-...",
    "userAnswer": "B"
  }
}
```

服务端只接受 `questionId` 与 `userAnswer`，正确答案和解析由服务端查询。禁止客户端上传 `correctAnswer` 或自由拼接 system prompt。

### 9.2 事件

```text
event: meta
data: {"requestId":"req_...","conversationId":"...","dailyRemaining":29}

event: delta
data: {"content":"对立统一规律揭示了"}

event: delta
data: {"content":"事物发展的源泉和动力。"}

event: done
data: {"finishReason":"stop","usage":{"promptTokens":120,"completionTokens":86}}

event: error
data: {"code":"DEPENDENCY_UNAVAILABLE","message":"AI 服务暂不可用","details":null}
```

### 9.3 规则

- HTTP 状态表示建流前结果；一旦进入 `text/event-stream`，流中错误使用 `error` 事件。
- 每日 30 次配额按用户和自然日计算，默认时区 `Asia/Shanghai`，存储时记录 UTC。
- 配额耗尽在建流前返回 429 `DAILY_LIMIT_EXCEEDED`。
- 服务端约每 15 秒发送心跳注释，单次连接最大 120 秒；客户端可主动取消。
- 首 token 目标 < 1s；普通 API P95 目标 < 200ms。
- 日志不得记录完整 prompt、用户隐私或 DeepSeek 请求体明文。

## 10. 安全、审计与可观测性

### 10.1 安全要求

- Supabase service role、DeepSeek Key、Redis Token 仅通过服务端环境变量读取。
- 所有写接口使用最小 Schema 校验并拒绝未知敏感字段；`role`、`isBanned`、`creatorId`、`userId` 不接受客户端赋值。
- 对所有列表强制分页，并对搜索、验证码、AI、导入接口分别限流。
- 管理端 Cookie 必须 HttpOnly + Secure + SameSite；生产环境禁止跨站携带。
- 错误响应不泄露数据库结构、SQL、堆栈或内部服务地址。
- CORS 只允许 Flutter Web 与管理后台的受控来源；移动端不受浏览器 CORS 影响，但仍需校验 Origin 场景。
- 上传文件限制 MIME、扩展名、大小和行数，解析前进行病毒/格式安全策略校验。

### 10.2 审计日志

建议新增 `admin_audit_logs`：

| 字段 | 说明 |
|---|---|
| `id` | UUID |
| `actor_id` | 操作管理员 ID |
| `action` | 如 `user.ban`、`question.update`、`ugc.approve` |
| `resource_type` | `user`、`question`、`school` 等 |
| `resource_id` | 资源 ID |
| `request_id` | 请求链路 ID |
| `metadata` | 经脱敏的变更摘要 |
| `created_at` | UTC 时间 |

高风险写操作必须与业务变更同事务写入审计日志。

### 10.3 可观测性

- 每个响应包含 `requestId` 和 `timestamp`。
- 结构化日志字段：`requestId`、`route`、`method`、`status`、`durationMs`、`userId`、`errorCode`；不得记录令牌和密钥。
- 指标：每路由 P50/P95/P99、4xx/5xx 比例、RBAC 拒绝次数、AI TTFT、AI 配额命中率、Supabase/DeepSeek 上游错误。
- 告警：5xx 突增、403 突增、管理员高风险操作异常、AI 成本超阈值。

## 11. 与现有架构的迁移关系

当前 `prd-mvp.md`、`tech-stack.md` 和部分 Flutter 实现仍是“Flutter 直连 Supabase”的 v3.0 基线。本设计不直接把旧文档标记为已完成迁移，而是：

1. 先以本目录为 Next BFF 的新设计基线。
2. 在 P2 按模块实现并补齐契约测试。
3. 在 P3 完成真实接口、权限、回滚和性能验收。
4. 验收通过后再统一更新全局 PRD、技术栈和 Flutter 架构图中的 Supabase 直连描述。

在迁移完成前，任何新业务功能不得继续扩大 Flutter 对 Supabase 业务表的直接依赖。
