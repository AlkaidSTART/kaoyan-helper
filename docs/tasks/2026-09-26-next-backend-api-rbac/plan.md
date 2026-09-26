# Task Plan: Next.js 后端接口与 RBAC 文档梳理

## 1. 原始诉求

用户提出：梳理后端接口文档，后端接口准备集成在 Next 项目中，Flutter 调用 Next 的后端接口，并根据 RBAC 区分管理员和普通用户。

## 2. 任务目标

- 明确 Flutter、Next.js BFF、Supabase 之间的职责和信任边界。
- 形成统一 `/api/v1` 接口契约，覆盖认证、个人学习、题库、错题、院校、闪卡、打卡、AI 和管理端。
- 定义 `user` 与 `admin` 两级角色、权限点、路由层与服务层双重 RBAC、资源所有权和管理员审计。
- 定义 Flutter 从 Supabase 直连迁移到 Next.js API 的边界和顺序。
- 按项目 P0 -> P1 -> P2 -> P3 规范形成可实施、可验证、可回溯的文档基线。

## 3. 范围边界

### 3.1 本期完成

- P0 用户痛点、目标、范围与验收指标。
- P1 总体设计、认证方式、响应协议、RBAC 权限矩阵、Flutter 改造边界、AI SSE 协议。
- P1 55 个接口的路径、鉴权、权限、请求、响应和边界契约。
- P2 实现顺序、原子 Todo、ADR 和完成定义。
- P3 契约、权限、所有权、业务、Flutter、Next.js、数据库和多端验收清单。
- 本次任务的 plan 与 changed-files 审计记录。

### 3.2 本期不做

- 不实现 Next.js Route Handler、领域服务、数据库迁移或管理后台 UI。
- 不实现 Flutter Dio、Repository、AuthInterceptor、Notifier 或路由守卫。
- 不修改 `prd-mvp.md`、`tech-stack.md` 的全局架构描述；待 P3 真实验收通过后再迁移全局文档。
- 不读取或记录 `.env.local`、service role、DeepSeek Key 或其他密钥内容。
- 不增加支付、社交、推送、短信登录等范围外功能。

## 4. 关键决策

1. Next.js 作为 Flutter 和管理后台共用的 BFF/API 层，固定前缀 `/api/v1`。
2. Supabase 继续负责 Auth、PostgreSQL、Storage、RLS；Flutter 不再直接访问业务表。
3. `public.users.role` 是角色唯一事实源，值域为 `user | admin`；JWT claim 和客户端缓存不可作为授权依据。
4. Flutter 使用 Bearer Token，管理后台使用 HttpOnly Cookie，两种凭证最终映射为统一 Actor。
5. `admin` 继承 `user` 能力，但跨用户能力必须由具体权限和审计显式授权。
6. RBAC 采用路由层与服务层双重检查，私有资源额外检查所有者或范围。
7. 普通用户请求优先使用用户 JWT 访问 Supabase 并保留 RLS；service role 仅服务端使用，且不得绕过 RBAC。
8. 私有资源非本人采用 404 防枚举；身份未确认使用 401；身份确认但权限不足使用 403。
9. MVP 不缓存角色，管理员降权和用户封禁在下一次受保护请求即时生效。
10. 普通题目提交前不返回答案和解析，判题、错题状态机、SM-2、打卡、UGC 审核和配额由服务端执行。
11. 所有增长型列表服务端分页，默认 `page=1&pageSize=20`，最大 100。
12. AI 使用 `meta`、`delta`、`done`、`error` 四类 SSE 事件，每日默认 30 次配额。

## 5. 交付文档

- `docs/p0-definition/next-backend-api-rbac/definition.md`
- `docs/p1-design/next-backend-api-rbac/design.md`
- `docs/p1-design/next-backend-api-rbac/api-contract.md`
- `docs/p2-development/next-backend-api-rbac/development.md`
- `docs/p3-verification/next-backend-api-rbac/verification.md`
- `docs/tasks/2026-09-26-next-backend-api-rbac/plan.md`
- `docs/tasks/2026-09-26-next-backend-api-rbac/changed-files.md`

## 6. 实施计划与状态

- [x] 建立 P0 需求定义。
- [x] 建立 P1 总体设计和权限模型。
- [x] 建立 55 个接口的 P1 API 契约。
- [x] 修正接口总览中的 Schools、Admin 和合计数量。
- [x] 建立 P2 原子实现清单、ADR 与 DoD。
- [x] 建立 P3 验证清单，覆盖契约、认证、RBAC、所有权、业务、Flutter、Next.js、数据库和多端验收。
- [x] 建立本次任务审计文件并回填全部文档变更。
- [x] 完成文档一致性核验：统一 `UGC_ALREADY_REVIEWED`、核对接口计数、分页规则与 401/403/404 语义，确认 P3 无伪造结论。
- [x] 补齐 P1 数据模型与环境变量文档。
- [x] 完成 Next.js 16 本地版本文档核对与脚手架审计。
- [x] 安装 `@supabase/ssr`、`@supabase/supabase-js`、`zod`、`server-only` 运行依赖。
- [x] 编写 Supabase 基线迁移，暂不应用到远端。
- [ ] 按 P2 实施 Next.js API 基础层、认证、RBAC 与领域接口。
- [ ] 完成 Flutter API 迁移。
- [ ] 实施后在 P3 回填真实验证结果并更新任务 changed-files。

## 7. 后续实施顺序

P2-0 实施准备 -> P2-1 API 基础层 -> P2-2 Supabase 会话 -> P2-3 Auth -> P2-4 RBAC/所有权/审计 -> P2-5 数据库/RLS -> P2-6 Flutter API Client -> P2-7 至 P2-10 领域接口 -> P2-11 全量测试 -> P2-12 迁移与文档收口 -> P3 真实验收。

## 8. 验证要求

- Next.js 在 `admin/` 执行 `pnpm lint` 和 `pnpm build`。
- Flutter 在仓库根目录执行 `flutter analyze` 和 `flutter test`。
- 验证普通用户访问全部 `/api/v1/admin/*` 返回 403。
- 验证跨用户读取或修改错题、目标、闪卡进度、打卡记录和私有题被拒绝。
- 验证管理员降权、用户封禁即时生效，以及最后管理员保护。
- 验证契约总数 55，并核对各模块数量：Auth 7、Me 4、Dashboard 1、Quiz 6、Mistakes 5、Schools 5、Flashcards 5、AI 2、Admin 20。
- 所有 P3 结果只能来自真实执行，当前统一标记为待执行。

## 9. 风险与待办

- 当前 `prd-mvp.md` 和 `tech-stack.md` 仍描述 Flutter 直连 Supabase，属于已识别的架构文档偏差。
- `admin/` 使用 Next.js 16，实施前必须核对本地对应版本文档，不能凭旧版本 API 直接编码。
- 现有 Flutter 认证仍使用 `FakeAuthRepository`，`UserModel` 尚无角色和权限字段，P2 实施时需迁移。
- 数据库真实 Schema 和 RLS 尚未在本任务中执行审计，P2-5 必须以实际环境为准。
- P3 验收涉及测试账号、独立数据库分支和外部 AI 上游，实施前需准备隔离环境。
