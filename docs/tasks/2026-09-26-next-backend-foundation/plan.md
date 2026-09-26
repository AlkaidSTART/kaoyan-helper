# 任务计划 - 完善基础后端接口

## 1. 原始诉求

用户要求“先完善基础的后端接口”。

## 2. 解读与范围

依据现有 `docs/p2-development/next-backend-api-rbac/development.md` 的依赖顺序，本轮落实 P2-1 API 基础层（P2-101 至 P2-109）：

- 统一错误、响应、请求上下文、时间、分页、校验、日志和限流。
- 为基础层编写不依赖 Supabase 的 Vitest 单元测试。
- 不实现认证、RBAC、Supabase 客户端、业务 Route Handler 或远端迁移。

## 3. 实施顺序

1. 检查现有 Next.js 16 版本文档与工程配置。
2. 建立基础层 P0/P1/P2/P3 文档。
3. 安装 Vitest 并新增测试脚本。
4. 实现 `admin/lib/api/` 基础模块。
5. 编写并运行单元测试、lint、build。
6. 回填 P2/P3、`changed-files.md` 和任务结论。

## 4. 决策论证

- 先做基础层：后续认证、Supabase 和 55 个业务接口都依赖统一错误与响应契约，不能绕过依赖顺序。
- 采用 Vitest：基础层是纯 TypeScript 协议代码，不需要启动 Next.js 或远端数据库。
- 限流只做抽象与内存适配：业务额度和 Redis 部署策略尚未确认，不在本轮硬编码。
- 自定义 `Response` 放行：AI SSE 和 Cookie 响应不能被 JSON envelope 强制包装。

## 5. 验收前置

- 不新增公开 `/health` 等未批准接口。
- 不读取、打印或提交 `.env.local` 密钥。
- 不执行远端 Supabase 迁移。
- 完成后真实执行 `cd admin && pnpm test && pnpm lint && pnpm build`。

## 6. 当前状态

计划已落盘，开始实现。
