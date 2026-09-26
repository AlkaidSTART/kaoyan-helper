# P2 - Next.js API 基础层开发

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：P2-101 至 P2-109 已实现，自动化验证通过
> 上游需求：`docs/p0-definition/next-backend-api-foundation/definition.md`  
> 上游设计：`docs/p1-design/next-backend-api-foundation/design.md`  
> 总开发清单：`docs/p2-development/next-backend-api-rbac/development.md` 的 P2-1

## 1. 阶段边界

本文件只实现总开发清单的 P2-101 至 P2-109。认证、Supabase 客户端、RBAC、领域 Route Handler 和远端数据库迁移均不进入本轮。

前置约束：

- `admin/` 为 Next.js 16.3.5，Node 版本当前为 `v26.7.0`，包管理器为 `pnpm@11.17.0`。
- 动态 `params` 与 `cookies()` 是异步 API；本基础层不设置已弃用的 Edge runtime。
- 基础层不得导入 Flutter 代码，不得打印或提交任何环境变量密钥。
- 测试使用 Vitest，测试不依赖生产 Supabase 项目。

## 2. 原子任务

### P2-101 错误模型

- [ ] 建立稳定错误码常量与 HTTP 状态映射。
- [ ] 建立 `AppError`，承载 status、code、安全 message 和可选 details。
- [ ] 建立 `toAppError`，未知异常统一映射为 500 `INTERNAL_ERROR`。
- [ ] 验证原始异常消息、SQL 和堆栈不进入响应。

### P2-102 响应 envelope

- [ ] 实现成功、错误和分页 envelope。
- [ ] 统一 `success`、`data` 或 `error`、`meta.requestId`、`meta.timestamp`。
- [ ] 实现 JSON Response 的 Content-Type 和 `X-Request-Id`。
- [ ] 实现 UTC RFC3339 秒级时间戳序列化。

### P2-103 请求上下文

- [ ] 实现外部 `X-Request-Id` 校验。
- [ ] 缺失或非法时生成 `req_<uuid-without-hyphens>`。
- [ ] 提供 route、method、startedAt、可选 userId 上下文。
- [ ] 响应中回传最终 requestId。

### P2-104 时间

- [ ] 拒绝无效日期输入，统一输出 UTC RFC3339 秒级时间。
- [ ] envelope、日志和测试使用同一序列化规则。

### P2-105 分页

- [ ] 支持默认 `page=1`、`pageSize=20`。
- [ ] 支持最大 `pageSize=100`。
- [ ] `page=0`、负数、小数、空值、重复参数返回 422 `PAGINATION_INVALID`。
- [ ] 提供 `totalPages`，空列表为 0。

### P2-106 校验

- [ ] 实现合法 JSON 读取和非法 JSON 的 400 `INVALID_ARGUMENT`。
- [ ] 实现 Zod schema 的统一校验入口。
- [ ] 未知字段返回 422 `VALIDATION_FAILED`，details 不回显输入值。
- [ ] `role`、`isBanned`、`userId`、`creatorId`、`isCorrect`、`permissions` 返回 422 `IMMUTABLE_FIELD`。

### P2-107 日志

- [ ] 实现单行 JSON 结构化日志。
- [ ] 固定字段包含 requestId、route、method、status、durationMs、userId、errorCode。
- [ ] 不提供记录 token、Cookie、密钥、body 或完整 prompt 的入口。
- [ ] 支持注入 sink 以便单元测试。

### P2-108 单元测试

- [ ] 覆盖成功、错误、分页、请求 ID、未知字段、受保护字段和错误脱敏。
- [ ] 覆盖日志字段和限流 429 行为。
- [ ] 覆盖自定义 Response 不被 envelope 二次包装。

### P2-109 限流策略基础

- [ ] 定义可替换的 `RateLimiter` 接口。
- [ ] 提供进程内固定窗口实现和统一 429 抛出辅助。
- [ ] 支持测试注入 now，输出 retryAfterSeconds。
- [ ] 在文档中明确内存实现不等同于生产多实例方案。

## 3. 计划文件清单

### 业务代码

- `admin/lib/api/errors.ts`
- `admin/lib/api/response.ts`
- `admin/lib/api/request-context.ts`
- `admin/lib/api/pagination.ts`
- `admin/lib/api/validation.ts`
- `admin/lib/api/logger.ts`
- `admin/lib/api/rate-limit.ts`
- `admin/lib/api/handler.ts`

### 测试与工程配置

- `admin/lib/api/__tests__/errors.test.ts`
- `admin/lib/api/__tests__/response.test.ts`
- `admin/lib/api/__tests__/request-context.test.ts`
- `admin/lib/api/__tests__/pagination.test.ts`
- `admin/lib/api/__tests__/validation.test.ts`
- `admin/lib/api/__tests__/logger.test.ts`
- `admin/lib/api/__tests__/rate-limit.test.ts`
- `admin/lib/api/__tests__/handler.test.ts`
- `admin/package.json`
- `admin/pnpm-lock.yaml`

## 4. 重大技术决策

### ADR-001：测试框架使用 Vitest

- 背景：项目没有测试脚本，P2-108 要求纯 TypeScript 单元测试。
- 决策：加入 Vitest 并新增 `pnpm test`。
- 原因：与 Vite/TypeScript 生态兼容，无需启动 Next.js 或 Supabase，运行快。
- 代价：增加一个开发依赖；测试环境使用 Node 的 Web `Request`/`Response`。

### ADR-002：基础响应与业务 handler 解耦

- 背景：AI 需要 SSE，管理后台需要设置 Cookie，不能用 JSON envelope 强制包装。
- 决策：普通数据返回自动包装 envelope；handler 返回 `Response` 时保留原响应，只补 `X-Request-Id`。
- 原因：既保证普通 JSON 一致，又不阻断特殊协议。
- 代价：Route Handler 作者需要明确返回类型边界。

### ADR-003：限流抽象先行，不硬编码业务额度

- 背景：不同接口的限流键、窗口和额度尚未最终确认。
- 决策：本轮只实现接口、内存实现和 429 行为，额度由后续具体接口注入。
- 原因：避免把未经确认的数值伪装成正式策略。
- 代价：P2-109 的完整生产限流需要后续 Redis/serve 适配和接口测试。

## 5. 实施记录

本表在编码和验证后回填真实问题，不预先记录完成结论。

| 日期 | 任务 ID | 实际问题 | 排查/决策 | 影响文件 | 状态 |
|---|---|---|---|---|---|
| 2026-09-26 | P2-101 至 P2-109 | 工程没有测试脚本，基础协议层无法独立回归 | 引入 Vitest 并新增 `pnpm test`；测试只使用 Node 的 Web `Request`/`Response`，不启动 Next.js 或 Supabase | `admin/package.json`、`admin/pnpm-lock.yaml`、`admin/lib/api/__tests__/*.test.ts` | 已解决 |
| 2026-09-26 | P2-101 至 P2-107 | 普通 JSON 需要统一 envelope，但 AI SSE、Cookie 等响应不能被强制二次包装 | 普通数据自动包装；handler 返回自定义 `Response` 时保留原状态、正文和 `Content-Type`，仅补齐缺失的 `X-Request-Id` | `admin/lib/api/handler.ts`、`admin/lib/api/response.ts` | 已解决 |
| 2026-09-26 | P2-108 | handler 测试使用可注入时钟序列，成功 envelope 与完成日志分别消耗不同时间点，首版预计 `durationMs` 与真实序列不一致 | 按请求开始、响应完成、日志完成的实际时间点修正断言，覆盖耗时计算而不使用真实等待 | `admin/lib/api/__tests__/handler.test.ts` | 已解决 |
| 2026-09-26 | P2-105、P2-108 | 分页参数的联合键在 `URLSearchParams.getAll` 索引处触发 Next.js 构建类型错误 | 将非法分页字段参数收窄为 `"page" | "pageSize"`，保持运行时校验与 422 错误契约不变 | `admin/lib/api/pagination.ts` | 已解决 |
| 2026-09-26 | P2-101 至 P2-109 | 需要确认基础层可被后续 Route Handler 使用且不影响现有 Next.js 构建 | 8 个测试文件、60 个测试通过；ESLint 和 Next.js 生产构建通过；构建仅有仓库外 `pnpm-workspace.yaml` 发现的非阻塞 Turbopack root 警告 | `admin/lib/api/**`、`admin/package.json`、`admin/pnpm-lock.yaml` | 已验证 |

## 6. 完成定义

- [x] `admin/lib/api/` 八个基础模块可被后续 Route Handler 直接复用。
- [x] 单元测试覆盖成功、错误、分页、请求 ID、校验、日志、限流和自定义 Response。
- [x] `pnpm test`、`pnpm lint`、`pnpm build` 在 `admin/` 真实通过。
- [x] P3 验证文档回填真实命令、退出码、测试数量和限制。
- [x] 任务 `changed-files.md` 与实际改动一致。
