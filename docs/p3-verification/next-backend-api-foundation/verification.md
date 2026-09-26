# P3 - Next.js API 基础层验证

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：基础层实现与自动化验证已完成，Flutter、Supabase 与业务 E2E 不在本轮范围
> 上游需求：`docs/p0-definition/next-backend-api-foundation/definition.md`  
> 上游设计：`docs/p1-design/next-backend-api-foundation/design.md`  
> 开发清单：`docs/p2-development/next-backend-api-foundation/development.md`

## 1. 验证边界

本轮只验证 API 基础层及其单元测试。认证、Supabase、RBAC、业务路由、远端数据库和 Flutter 不在本轮验证范围内。未执行的项目必须标记为 `未执行` 或 `BLOCKED`，不能根据设计推导为通过。

## 2. 验证矩阵

| 编号 | 验证内容 | 预期 | 状态 |
|---|---|---|---|
| API-FOUND-001 | 成功 envelope | `success=true`、`data`、`meta.requestId`、`meta.timestamp` | 通过 |
| API-FOUND-002 | 错误 envelope | `success=false`、稳定 code、安全 message、meta | 通过 |
| API-FOUND-003 | 分页 envelope | 包含 page、pageSize、total、totalPages | 通过 |
| API-FOUND-004 | 时间格式 | UTC RFC3339 秒级，例如 `2026-09-26T10:00:00Z` | 通过 |
| API-FOUND-005 | 请求 ID 保留 | 合法 `X-Request-Id` 原样保留并回传 | 通过 |
| API-FOUND-006 | 请求 ID 替换 | 缺失或非法时生成合法 `req_` ID | 通过 |
| API-FOUND-007 | 分页默认值 | 缺省为 page=1、pageSize=20 | 通过 |
| API-FOUND-008 | 分页边界 | pageSize=100 合法，>100 返回 422 | 通过 |
| API-FOUND-009 | 分页非法值 | 0、负数、小数、空值、重复参数返回 422 | 通过 |
| API-FOUND-010 | 空列表页数 | total=0 时 totalPages=0 | 通过 |
| API-FOUND-011 | 非法 JSON | 返回 400 `INVALID_ARGUMENT` | 通过 |
| API-FOUND-012 | 未知字段 | 返回 422 `VALIDATION_FAILED` | 通过 |
| API-FOUND-013 | 受保护字段 | 返回 422 `IMMUTABLE_FIELD` | 通过 |
| API-FOUND-014 | 错误脱敏 | 原始 Error/SQL/堆栈不进入响应 | 通过 |
| API-FOUND-015 | details 不回显 | 校验 details 不包含原始输入值 | 通过 |
| API-FOUND-016 | 结构化日志 | 单行 JSON，字段符合设计 | 通过 |
| API-FOUND-017 | 日志脱敏 | 无 token、Cookie、密钥、body、完整 prompt 入口 | 通过 |
| API-FOUND-018 | 内存限流 | 窗口内计数正确，超限返回 429 | 通过 |
| API-FOUND-019 | Retry-After | 429 details 与响应头包含安全重试秒数 | 通过 |
| API-FOUND-020 | Handler 成功 | 普通数据自动包装并记录日志 | 通过 |
| API-FOUND-021 | Handler 错误 | 已知 AppError 和未知异常均安全映射 | 通过 |
| API-FOUND-022 | 自定义 Response | 不被 envelope 二次包装，Content-Type 保留，补 request ID | 通过 |

## 3. 命令验证

| 编号 | 工作目录 | 命令 | 实际日期 | 退出码 | 结果摘要 | 状态 |
|---|---|---|---|---|---|---|
| CMD-FOUND-01 | `admin/` | `pnpm test` | 2026-09-26 | 0 | Vitest：8 个测试文件、60 个测试全部通过 | 通过 |
| CMD-FOUND-02 | `admin/` | `pnpm lint` | 2026-09-26 | 0 | ESLint 通过，无 warning | 通过 |
| CMD-FOUND-03 | `admin/` | `pnpm build` | 2026-09-26 | 0 | Next.js 16.3.5 生产构建成功；仅提示仓库外 `pnpm-workspace.yaml` 的非阻塞 Turbopack root 警告 | 通过 |
| CMD-FOUND-04 | 仓库根目录 | `git diff --check` | 2026-09-26 | 0 | 无空白错误 | 通过 |

## 4. 未纳入本轮

- Flutter `flutter analyze`、`flutter test`：本轮未修改 Flutter 代码，待 Flutter API Client 迁移任务执行。
- Supabase RLS、迁移和远端环境：本轮未连接数据库，待 P2-2/P2-5 执行。
- Auth/RBAC/SSE/E2E：本轮仅提供基础协议，待对应任务执行。
