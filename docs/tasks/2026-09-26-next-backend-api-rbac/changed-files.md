# Changed Files: Next.js Backend API & RBAC

本任务已从文档基线进入后端实施准备阶段。当前状态包含文档、Next.js 依赖和 Supabase 基线迁移；尚未新增 `/api/v1` 业务代码。

## 新建文件

- `docs/p1-design/next-backend-api-rbac/data-model.md`
  - 记录 2026-09-26 的真实 Supabase Schema 审计结论、表清单、关系、所有权、服务端函数和 RLS 基线。

- `docs/p1-design/next-backend-api-rbac/environment.md`
  - 记录服务端环境变量命名、作用域、加载与失败策略；不包含任何密钥值。

- `supabase/migrations/20260926120000_baseline_backend_api.sql`
  - 从空库建立用户、目标院校、题库、错题、闪卡、打卡、AI 配额、幂等、导入与审计表。
  - 包含判题、SM-2、封禁/解封、UGC 审核服务端函数及 RLS 基线。
  - 迁移未应用至远端，待人工确认后在隔离环境演练。

- `docs/p0-definition/next-backend-api-rbac/definition.md`
  - 记录 Flutter 直连 Supabase 的实际问题、Next.js BFF 目标、用户与管理员角色、范围边界、验收指标和实施假设。

- `docs/p1-design/next-backend-api-rbac/design.md`
  - 记录目标架构、信任边界、Supabase 客户端选择、认证与会话、RBAC 权限矩阵、统一响应、所有权、Next.js 分层、Flutter 改造、AI SSE、安全与迁移设计。

- `docs/p1-design/next-backend-api-rbac/api-contract.md`
  - 记录 `/api/v1` 下 55 个接口契约，覆盖 Auth、Me、Dashboard、Quiz、Mistakes、Schools、Flashcards/Check-ins、AI 和 Admin。
  - 本轮修正接口总览：Schools 为 5、Admin 为 20，新增合计 55，使其与实际接口 ID 数量一致。

- `docs/p2-development/next-backend-api-rbac/development.md`
  - 记录 P2 阶段边界、交付目标、依赖顺序、P2-0 至 P2-12 原子 Todo、11 条 ADR、实施问题回填表和 DoD。
  - 所有实现项保持未完成状态，待后续编码和验证阶段回填。

- `docs/p3-verification/next-backend-api-rbac/verification.md`
  - 记录 P3 契约、通用响应、认证、RBAC、审计、所有权、领域业务、AI SSE、Flutter、Next.js、数据库、性能、多端、命令记录和回滚验收清单。
  - 初始结果全部标记为待执行，不包含伪造的通过结论。

- `docs/tasks/2026-09-26-next-backend-api-rbac/plan.md`
  - 记录原始诉求、任务目标、范围边界、关键决策、交付文档、实施状态、后续顺序、验证要求和风险。

- `docs/tasks/2026-09-26-next-backend-api-rbac/changed-files.md`
  - 记录本次任务新增、修改和删除的文件清单及说明。

## 修改文件

- `docs/p1-design/next-backend-api-rbac/api-contract.md`
  - 修正接口总览中的 Schools、Admin 和合计数量。
  - 转义接口表中内联类型联合的竖线（如 `"flutter"\|"admin-web"`），修复 AUTH-02、ME-04、QUIZ-01、QUIZ-04、SCH-04、FC-04、ADMIN-SCH-06 共 7 行在 Markdown 渲染时被错误拆分成额外列的问题。
  - 未修改接口的鉴权、权限、Method、Path、DTO 或业务语义。

- `docs/p1-design/next-backend-api-rbac/design.md`
  - 第 5.5 节错误码 `ALREADY_REVIEWED` 统一为 `UGC_ALREADY_REVIEWED`，与 `api-contract.md` 第 12 节保持一致。
  - 未修改权限矩阵、所有权规则、401/403/404 语义或响应结构。

- `docs/p3-verification/next-backend-api-rbac/verification.md`
  - P3-BIZ-027 补充显式业务码 `UGC_ALREADY_REVIEWED`，与设计文档对齐。
  - 所有用例状态仍为“待执行”，未回填任何通过结论。

- `docs/tasks/2026-09-26-next-backend-api-rbac/plan.md`
  - 追加文档一致性核验、P1 补充文档、Next.js 16 核对、依赖安装与基线迁移完成状态。

- `admin/package.json`
  - 增加 `@supabase/ssr`、`@supabase/supabase-js`、`zod`、`server-only` 运行依赖。

- `admin/pnpm-lock.yaml`
  - 锁定上述依赖版本。

## 删除文件

- 无。

## 一致性核验（本轮）

- 接口总数经脚本统计为 55，无重复 ID：Auth 7、Me 4、Dashboard 1、Quiz 6、Mistakes 5、Schools 5、Flashcards/Check-ins 5、AI 2、Admin 20（Dashboard 1、Users 4、Questions 5、UGC 3、Schools 7）。
- 401/403/404 语义在 P0、P1、P2、P3 与 plan 中一致：未确认身份 401，身份已确认但权限不足 403，私有资源非本人 404 防枚举。
- 分页规则一致：默认 `page=1&pageSize=20`，最大 100，越界返回 422 `PAGINATION_INVALID`。
- 错误码一致：UGC 重复/并发审核统一为 409 `UGC_ALREADY_REVIEWED`。
- 文档仅出现环境变量名称（如 `SUPABASE_SERVICE_ROLE_KEY`），不含任何真实密钥值；未读取 `.env.local`。
- P3 用例、命令记录和签名结论全部保持“待执行”，无伪造的通过状态。
- 新增文档的尾随空格仅出现在 Markdown 引用块表头（用于行内硬换行），与仓库既有文档风格一致。
- 接口表列数经脚本校验全部一致：7 列接口表所有行均为 7 个单元格，无因未转义竖线导致的错列；`verification.md` 命令记录表为 8 列，属预期。

## 验证说明

- 当前尚无 `/api/v1` Route Handler；依赖、类型检查和构建验证将在实现后执行，不宣称接口测试已通过。
- 基线迁移尚未应用至远端，不宣称数据库或 RLS 已在远端验证通过。
- P3 已明确后续必须执行：
  - `flutter analyze`
  - `flutter test`
  - `cd admin && pnpm lint`
  - `cd admin && pnpm build`
- P2 实现完成前，不更新 `prd-mvp.md`、`tech-stack.md` 的全局架构结论。
