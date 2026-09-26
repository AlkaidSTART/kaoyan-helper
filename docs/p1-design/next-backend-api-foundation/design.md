# P1 - Next.js API 基础层设计

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：设计基线，已按本设计实现并通过单元测试与构建验证
> 上游需求：`docs/p0-definition/next-backend-api-foundation/definition.md`  
> 总设计：`docs/p1-design/next-backend-api-rbac/design.md`

## 1. 设计目标

在 `admin/` 内建立与业务无关、可被后续 Route Handler 复用的 API 基础层，保证：

1. 所有接口输出同一 envelope 和错误边界。
2. 所有请求具备可追踪的 `requestId` 和安全日志上下文字段。
3. 所有入参在进入领域服务前完成严格校验。
4. 所有列表接口使用统一分页规则。
5. 限流策略可替换，基础层不绑定未经确认的业务额度。
6. AI SSE、Cookie 响应等特殊协议仍可通过自定义 `Response` 绕过 envelope 包装。

## 2. 目录与模块

```text
admin/lib/api/
├── errors.ts            # 稳定错误码、AppError、未知异常映射
├── response.ts          # envelope、时间戳、JSON Response、请求 ID 响应头
├── request-context.ts   # X-Request-Id 校验/生成、请求上下文
├── pagination.ts        # 分页解析、校验、meta 计算
├── validation.ts        # Zod 严格校验、JSON 解析、受保护字段
├── logger.ts            # 结构化日志与脱敏边界
├── rate-limit.ts        # 可替换限流接口、内存实现、429 辅助
└── handler.ts           # 串联请求上下文、业务 handler、响应与日志
```

这些模块是服务端协议层，不直接访问数据库或网络。后续 Supabase、Auth 和 RBAC 模块通过显式参数注入。

## 3. 统一数据契约

### 3.1 成功响应

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

### 3.2 分页成功响应

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "req_01j8y6m4y8q7k2p3t5v9x1z0ab",
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

分页固定规则：

- 默认 `page=1`、`pageSize=20`。
- `pageSize` 最大 100。
- 参数必须是正整数；`0`、负数、小数、空字符串、重复查询参数均返回 422 `PAGINATION_INVALID`。
- `total=0` 时 `totalPages=0`。

### 3.3 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "请求参数不合法",
    "details": null
  },
  "meta": {
    "requestId": "req_01j8y6m4y8q7k2p3t5v9x1z0ab",
    "timestamp": "2026-09-26T10:00:00Z"
  }
}
```

`details` 只能是安全、可序列化、可展示的数据。基础层只允许校验 issue 路径/消息、分页字段名、重试秒数等结构；不得传入 token、Cookie、SQL、堆栈或完整请求体。

## 4. 错误模型

### 4.1 错误码分组

基础层集中定义并导出稳定错误码，至少覆盖总设计和接口契约中的错误：

- 400：`INVALID_ARGUMENT`
- 401：`AUTH_REQUIRED`、`TOKEN_EXPIRED`、`REFRESH_INVALID`、`EMAIL_CODE_INVALID`、`EMAIL_CODE_EXPIRED`、`AUTH_INVALID_CREDENTIALS`、`OAUTH_STATE_INVALID`
- 403：`FORBIDDEN`、`ADMIN_REQUIRED`、`USER_BANNED`
- 404：`NOT_FOUND`、`QUESTION_NOT_ACCESSIBLE`、`MISTAKE_NOT_FOUND`
- 409：`CONFLICT`、`ATTEMPT_CONFLICT`、`UGC_ALREADY_REVIEWED`、`TARGET_PRIMARY_CONFLICT`、`CARD_NOT_DUE`、`IMPORT_JOB_EXPIRED`、`LAST_ADMIN_PROTECTED`
- 422：`VALIDATION_FAILED`、`PAGINATION_INVALID`、`IMMUTABLE_FIELD`、`PROVIDER_UNSUPPORTED`、`TARGET_LIMIT_EXCEEDED`、`ANSWER_INVALID`、`IMPORT_VALIDATION_FAILED`
- 429：`RATE_LIMITED`、`DAILY_LIMIT_EXCEEDED`
- 500：`INTERNAL_ERROR`
- 503：`DEPENDENCY_UNAVAILABLE`

### 4.2 `AppError`

`AppError` 包含：

- `status`：HTTP 状态码，来自集中映射或显式安全覆盖。
- `code`：稳定业务码。
- `message`：可安全展示的消息。
- `details`：可选安全 details。
- `expose`：基础层只对显式 `AppError` 放行，未知异常不暴露原始信息。

`toAppError(error)` 遇到非 `AppError` 时统一返回 `INTERNAL_ERROR`，并保留原始错误仅用于进程内排查，不进入 HTTP 响应。

## 5. 请求上下文

`request-context.ts` 负责：

- 从 `X-Request-Id` 读取候选值。
- 使用 `^req_[A-Za-z0-9_-]{8,128}$` 校验。
- 合法时保留；缺失或非法时生成 `req_<uuid-without-hyphens>`。
- 提供 `route`、`method`、`startedAt`、可选 `userId`。
- 提供耗时计算，供日志和后续性能观测使用。

`route` 默认取 URL pathname，不由客户端控制；调用方可显式传入稳定的路由模板。`userId` 只能由后续认证模块从可信身份解析后写入，不能从请求头或客户端 body 读取。

## 6. 校验设计

### 6.1 JSON 读取

- 请求体不是合法 JSON 时返回 400 `INVALID_ARGUMENT`。
- 空 body、格式错误、无法解析的 body 使用同一安全消息，不回显原文。
- Schema 校验只接收解析后的 `unknown`。

### 6.2 Zod 严格对象

- 使用 `ZodType` 接收项目 schema，基础层不限定具体业务字段。
- 调用方应使用严格对象 schema；基础层对校验 issue 做统一映射。
- 未知字段返回 422 `VALIDATION_FAILED`，details 只包含 issue 路径和安全消息。
- 客户端提交受保护字段时，优先返回 422 `IMMUTABLE_FIELD`，避免被普通未知字段错误掩盖。

基础层固定保护字段：

`role`、`isBanned`、`userId`、`creatorId`、`isCorrect`、`permissions`

后续 RBAC 阶段可扩展保护字段，但不得在 Route Handler 中绕过统一校验入口。

## 7. 日志设计

日志使用预定义 `RequestLogRecord`，只允许以下字段：

`requestId`、`route`、`method`、`status`、`durationMs`、`userId`、`errorCode`、`timestamp`

规则：

- 输出单行 JSON，便于采集。
- `errorCode` 只使用稳定业务码，不记录原始异常消息。
- 不记录 `Authorization`、Cookie、token、密钥、请求 body、完整 prompt 或隐私明文。
- 支持注入 sink，测试不依赖真实标准输出。
- 默认 sink 使用 `process.stdout`/`process.stderr`，不引入额外日志依赖。

## 8. 限流设计

### 8.1 抽象

`RateLimiter` 暴露 `consume(key, options)`，返回 `RateLimitResult`，为后续 Redis 适配预留异步返回能力。

`RateLimitOptions` 至少包含：

- `limit`：窗口内允许次数。
- `windowMs`：窗口时长。
- 可选的 `now`：测试注入时间，生产默认使用当前时间。

### 8.2 基础实现

- `MemoryRateLimiter` 使用进程内 `Map` 实现固定窗口计数。
- 超限结果包含 `retryAfterSeconds`，统一由 `enforceRateLimit` 抛出 429 `RATE_LIMITED`。
- 内存实现不声称适合多实例生产；登录、验证码、AI、导入和管理写入在后续实现时决定策略与存储。
- 本阶段不硬编码任何业务限流额度。

## 9. Handler 编排

`handleApiRequest` 的流程：

```text
Request
  -> 校验/生成 requestId
  -> 创建 RequestContext
  -> 调用业务 handler
     -> 普通数据：包装成功 envelope
     -> Response：保留自定义协议，补 X-Request-Id
  -> 捕获 AppError 或未知异常
     -> 安全错误 envelope
  -> 写入请求日志
  -> 返回 Response
```

为 AI SSE、管理后台 Cookie 等特殊接口，业务 handler 可以返回自定义 `Response`；基础层不得强制二次包装或覆盖其 `Content-Type`。自定义响应也必须获得 `X-Request-Id`。

## 10. 测试设计

使用 Vitest，测试文件与源码放在 `admin/lib/api/__tests__/`。测试不依赖远端服务：

1. `errors.test.ts`：错误码、状态映射、未知异常脱敏。
2. `response.test.ts`：成功、错误、分页 envelope、UTC 时间、响应头。
3. `request-context.test.ts`：合法/非法 requestId、生成格式、上下文耗时。
4. `pagination.test.ts`：默认值、边界、非法值和 `totalPages`。
5. `validation.test.ts`：严格对象、未知字段、受保护字段、非法 JSON、details 不回显。
6. `logger.test.ts`：结构化 JSON、字段集合、无敏感输入通道。
7. `rate-limit.test.ts`：窗口计数、独立 key、超限 429、重试秒数。
8. `handler.test.ts`：成功、已知错误、未知错误、自定义 Response、日志与响应头。

## 11. 与总设计的关系

- 本设计实现 `next-backend-api-rbac` 的 P2-101 至 P2-109，不替代其认证、RBAC、Supabase 或领域接口设计。
- 统一错误码、envelope、请求头和分页规则必须与 `docs/p1-design/next-backend-api-rbac/design.md` 保持一致。
- 本阶段完成后，P2-2 才开始接入 Supabase 客户端与会话适配。
