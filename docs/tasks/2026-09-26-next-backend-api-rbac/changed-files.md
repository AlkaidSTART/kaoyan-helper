# Changed Files: Next.js Backend API & RBAC

本任务仅新增和修改 Markdown 文档，不涉及业务代码、数据库迁移、依赖或构建配置变更。

## 新建文件

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
  - 未修改接口的鉴权、权限、Method、Path、DTO 或业务语义。

## 删除文件

- 无。

## 验证说明

- 本轮交付为文档设计阶段，没有实现代码，因此不宣称通过 Flutter、Next.js 或接口权限测试。
- P3 已明确后续必须执行：
  - `flutter analyze`
  - `flutter test`
  - `cd admin && pnpm lint`
  - `cd admin && pnpm build`
- P2 实现完成前，不更新 `prd-mvp.md`、`tech-stack.md` 的全局架构结论。
