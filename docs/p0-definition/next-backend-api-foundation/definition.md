# P0 - Next.js API 基础层需求定义

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：基础层需求基线，已实现并通过本轮自动化验证  
> 上级需求：`docs/p0-definition/next-backend-api-rbac/definition.md`

## 1. 背景

`next-backend-api-rbac` 已确定 Next.js 作为 Flutter 与管理后台共用的 `/api/v1` BFF。P2-101 至 P2-109 要求先建立错误、响应、请求追踪、分页、校验、日志和限流基础，再接入 Supabase 与业务 Route Handler。

当前 `admin/` 仅有 Next.js 脚手架，没有统一 API 基础模块、没有测试脚本。若直接实现认证或业务接口，各个 Route Handler 会重复处理 envelope、错误映射、`requestId`、校验和日志，导致错误码、HTTP 状态和敏感信息处理逐渐分叉。

## 2. 真实痛点

1. Flutter 需要稳定解析成功、失败和分页响应；当前没有可复用实现，无法保证字段、时间和请求 ID 一致。
2. HTTP 状态与业务错误码需要在服务端集中定义，避免把 Supabase/Postgres 原始错误直接返回客户端。
3. 缺少请求上下文时，登录、RBAC、审计和业务日志无法通过 `requestId` 串联。
4. 分页参数、未知字段和受保护字段需要在进入业务服务前统一拦截，否则每个接口都必须重复实现并容易遗漏。
5. 限流需要统一返回 429，但具体业务额度尚未确认，不能在本阶段硬编码未经评审的策略。
6. 日志不能记录 token、Cookie、密钥、完整 prompt 或隐私明文，但现有项目没有结构化日志与脱敏测试。

## 3. 用户与调用方

| 调用方 | 本阶段需求 |
|---|---|
| Flutter | 依赖稳定 envelope、稳定错误码、UTC 时间、分页元数据和请求 ID |
| 管理后台 Web | 依赖同一套响应与错误契约，后续可复用请求上下文 |
| Route Handler 开发者 | 依赖可组合的校验、错误、响应、日志和限流组件 |
| 运维与审计 | 依赖单行结构化日志按 `requestId` 追踪请求和错误 |
| 后续 Supabase/RBAC 模块 | 依赖不泄露内部异常的安全错误边界和可注入的限流抽象 |

## 4. 范围

### 4.1 本期范围内

- 集中定义 `AppError`、稳定业务错误码与 HTTP 状态映射。
- 实现成功、错误、分页响应 envelope。
- 实现 UTC RFC3339 秒级时间戳序列化。
- 实现 `X-Request-Id` 校验、生成、上下文与响应回传。
- 实现分页参数解析、默认值、上限与非法参数错误。
- 实现 Zod 严格校验入口，拒绝未知字段和客户端受保护字段。
- 实现结构化日志接口与敏感字段最小化记录。
- 实现可替换的限流接口、内存实现和统一 429 行为。
- 实现串联基础能力的 API handler，并支持 Route Handler 返回自定义 `Response`。
- 为基础能力编写不依赖远端 Supabase 的 Vitest 单元测试。

### 4.2 本期范围外

- 不实现 Supabase 用户客户端、service role 客户端或会话适配。
- 不实现 Auth、Cookie、RBAC、所有权复核与管理审计。
- 不实现 55 个业务 Route Handler。
- 不执行任何远端数据库迁移。
- 不引入生产分布式限流或 Redis；内存实现只作为可替换的本地/单实例基础实现。
- 不新增未经 P1 契约批准的公开 `/health` 等接口。

## 5. 功能边界与安全要求

1. `AppError` 只能向客户端暴露稳定业务码、安全消息和安全 details。
2. 未知异常必须映射为 `500 INTERNAL_ERROR`，不得把原始 `Error.message`、SQL、堆栈或上游响应返回客户端。
3. `requestId` 外部输入必须满足 `req_[A-Za-z0-9_-]{8,128}`；缺失或非法时由服务端生成。
4. 所有成功、错误和自定义 `Response` 都必须带 `X-Request-Id`。
5. 时间统一为 UTC RFC3339，例如 `2026-09-26T10:00:00Z`。
6. 分页默认 `page=1`、`pageSize=20`，`pageSize` 最大 100；非法值返回 422 `PAGINATION_INVALID`。
7. 校验失败只返回 issue 路径和安全消息，不回显原始输入值。
8. 客户端尝试提交 `role`、`isBanned`、`userId`、`creatorId`、`isCorrect`、`permissions` 时返回 422 `IMMUTABLE_FIELD`。
9. 日志只记录预定义上下文字段，不暴露 token、Cookie、密钥、完整 prompt 和隐私明文。
10. 内存限流不得被描述为适合多实例生产环境；后续具体接口可替换为 Redis 适配器。

## 6. 验收指标

| 指标 | 验收标准 |
|---|---|
| 协议一致 | 成功与错误响应均包含 `success`、`data`/`error`、`meta.requestId`、`meta.timestamp` |
| 错误安全 | 未知异常不泄露原始 message、SQL、堆栈或上游错误 |
| 请求追踪 | 合法外部 ID 被保留，缺失/非法 ID 被替换，响应头与 envelope 一致 |
| 时间一致 | 所有 envelope 时间均为 UTC RFC3339 秒级格式 |
| 分页一致 | 默认值、最大值、非法值和空列表 `totalPages=0` 均有测试 |
| 校验一致 | 未知字段、受保护字段、非法 JSON 和被拒输入不回显均被覆盖 |
| 日志安全 | 结构化日志字段固定，敏感信息无记录路径，输出可测试 |
| 限流一致 | 超限返回 429 `RATE_LIMITED`，并给出安全的重试秒数 |
| 可扩展 | handler 可返回普通数据或自定义 `Response`，为 SSE、Cookie 等接口预留协议边界 |
| 质量门禁 | P2 完成后 `pnpm test`、`pnpm lint`、`pnpm build` 均真实通过 |

## 7. 决策结论

1. 本轮只交付 P2-1 API 基础层，不跳步实现认证或业务接口。
2. 统一异常、响应、校验和日志模块放在 `admin/lib/api/`，后续 Route Handler 只调用这些组件。
3. 测试框架采用 Vitest；测试以纯函数和 Web `Request`/`Response` 为主，不依赖远端 Supabase。
4. 限流本期提供接口与内存实现，具体业务额度在登录、验证码、AI、导入和管理写入接口实现时配置。
5. 本文件只定义基础层需求，详细契约见 `docs/p1-design/next-backend-api-foundation/`。
