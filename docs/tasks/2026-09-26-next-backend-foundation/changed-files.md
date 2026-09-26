# 变更文件清单

> 状态：实施与自动化验证完成；以下为本次任务相对任务起点的实际文件清单。

## 文档

- `docs/p0-definition/next-backend-api-foundation/definition.md`：新增。
- `docs/p1-design/next-backend-api-foundation/design.md`：新增。
- `docs/p2-development/next-backend-api-foundation/development.md`：新增，实施后更新任务状态。
- `docs/p3-verification/next-backend-api-foundation/verification.md`：新增，执行后回填真实结果。
- `docs/tasks/2026-09-26-next-backend-foundation/plan.md`：新增。
- `docs/tasks/2026-09-26-next-backend-foundation/changed-files.md`：新增。

## 代码与工程配置

- `admin/package.json`：新增 Vitest 开发依赖与 `pnpm test` 脚本。
- `admin/pnpm-lock.yaml`：锁定 Vitest 及其传递依赖。
- `admin/lib/api/errors.ts`：稳定错误码、HTTP 状态映射、`AppError` 和未知异常安全转换。
- `admin/lib/api/response.ts`：成功/错误/分页 envelope、UTC RFC3339 秒级时间、JSON Response、请求 ID 与 `Retry-After`。
- `admin/lib/api/request-context.ts`：请求 ID 校验/生成和 route、method、startedAt、userId 上下文。
- `admin/lib/api/pagination.ts`：分页默认值、上限、非法值 422 和 `totalPages`。
- `admin/lib/api/validation.ts`：JSON 解析、Zod 校验、未知字段、受保护字段及 details 脱敏。
- `admin/lib/api/logger.ts`：固定字段单行 JSON 请求日志与可注入 sink。
- `admin/lib/api/rate-limit.ts`：可替换 `RateLimiter`、进程内固定窗口实现和统一 429 辅助。
- `admin/lib/api/handler.ts`：基础能力编排、异常映射、自定义 Response 放行和请求日志。
- `admin/lib/api/__tests__/errors.test.ts`：错误码、状态映射和异常脱敏测试。
- `admin/lib/api/__tests__/response.test.ts`：成功/错误/分页 envelope、时间与响应头测试。
- `admin/lib/api/__tests__/request-context.test.ts`：请求 ID 与上下文测试。
- `admin/lib/api/__tests__/pagination.test.ts`：分页默认值、边界和非法值测试。
- `admin/lib/api/__tests__/validation.test.ts`：JSON、Zod 和受保护字段测试。
- `admin/lib/api/__tests__/logger.test.ts`：日志字段、序列化和脱敏边界测试。
- `admin/lib/api/__tests__/rate-limit.test.ts`：固定窗口、独立 key、429 和重试秒数测试。
- `admin/lib/api/__tests__/handler.test.ts`：handler 成功、异常、自定义 Response 和日志测试。

## 过程修正

- `admin/lib/api/__tests__/handler.test.ts`：按可注入时钟的实际调用顺序修正完成日志 `durationMs` 断言。
- `admin/lib/api/__tests__/validation.test.ts`：非法 JSON 用例不再混入合法 JSON 输入，保留空值、空白和语法错误覆盖。
- `admin/lib/api/pagination.ts`：将 `URLSearchParams` 读取键收窄为 `"page" | "pageSize"`，修复 Next.js 构建类型错误。

## 验证结果

- `cd admin && pnpm test`：退出码 0，8 个测试文件、60 个测试通过。
- `cd admin && pnpm lint`：退出码 0，无 ESLint warning。
- `cd admin && pnpm build`：退出码 0，Next.js 生产构建成功；存在仓库外 `pnpm-workspace.yaml` 的非阻塞 Turbopack root 警告。
- 仓库根目录 `git diff --check`：退出码 0。
- 未修改 Flutter 代码，因此本轮未执行 `flutter analyze`、`flutter test`；认证、Supabase、RBAC、迁移、业务接口和 E2E 均未纳入本轮。
