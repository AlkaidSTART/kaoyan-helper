# P2 - Next.js 后端接口与 RBAC 开发

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：P2-0/P2-1 基础层、P2-3 认证（Flutter 分支）、P2-7/P2-8/P2-9 业务接口已完成；P2-2 Supabase 客户端适配按 ADR 调整为 Prisma 等价实现；P2-4/P2-5/P2-6/P2-10 待实现
> 上游需求：`docs/p0-definition/next-backend-api-rbac/definition.md`  
> 上游设计：`docs/p1-design/next-backend-api-rbac/design.md`  
> 接口契约：`docs/p1-design/next-backend-api-rbac/api-contract.md`

## 1. 阶段边界

本文件只记录实现顺序、原子任务、验收前置条件和重大技术决策，不代表任何代码、数据库迁移或测试已经完成。

- 目标：在 `admin/` 的 Next.js 16 项目中实现 `/api/v1` BFF、Supabase 接入、认证、RBAC 和领域接口。
- 客户端：Flutter 通过 Dio 调用 Next.js，不直接调用 Supabase 业务表；管理员 Web 通过 HttpOnly Cookie 调用管理接口。
- 服务端：Next.js Route Handler 负责入参校验、身份识别、RBAC、业务编排、统一响应和审计。
- 不在本阶段：支付、社交、推送、短信、完整管理后台 UI、管理员角色在线授予接口。
- 实施前必须阅读 `admin/node_modules/next/dist/docs/` 中与 Route Handlers、Cookies、Middleware、Streaming、Runtime 相关的 Next.js 16 文档，以实际版本文档为准。

## 2. 交付目标

1. 所有接口统一挂载在 `/api/v1`，并返回标准 envelope、稳定业务码和 `requestId`。
2. Flutter 使用 Bearer Token，管理后台使用 HttpOnly Cookie；两种身份入口复用同一套身份与权限解析。
3. `public.users.role` 是唯一角色事实源，`user` / `admin` 的权限由服务端判定，客户端角色仅供 UI 使用。
4. 路由层和服务层双重执行 RBAC，私有资源额外执行所有权检查。
5. 普通用户优先使用用户 JWT 访问 Supabase，保留 RLS；service role 只在服务端、RBAC 通过后使用。
6. 判题、错题状态机、SM-2、打卡、UGC 审核、封禁和 AI 配额均由服务端执行。
7. Flutter Repository/Notifier/路由守卫完成向 Next.js API 的迁移，业务表直连只减不增。
8. 契约测试、权限测试、跨用户隔离测试、构建与静态检查全部进入 P3 验证范围。

## 3. 依赖顺序

```text
P2-0 实施准备与 Next.js 16 文档核对
  ↓
P2-1 响应/错误/请求上下文/校验基础
  ↓
P2-2 Supabase 服务端客户端与会话适配
  ↓
P2-3 Auth/session 与 Cookie
  ↓
P2-4 RBAC、所有权复核与管理审计
  ↓
P2-5 数据库迁移、索引与 RLS 复核
  ↓
P2-6 Flutter Dio/Api Client/AppException/会话刷新
  ↓
P2-7 Me、Dashboard、Quiz、Mistakes
  ↓
P2-8 Schools、Targets、Flashcards、Check-ins
  ↓
P2-9 AI SSE 与配额
  ↓
P2-10 Admin API 与导入/审核
  ↓
P2-11 契约、权限、业务、E2E 测试
  ↓
P2-12 旧 Supabase 直连迁移与全局文档更新
```

前序任务未通过时不得并行实现依赖它的 Route Handler；数据库迁移必须在实际 Schema 审计后执行，不能按文档猜测现有表结构。

## 4. 原子 Todo List

### P2-0 实施准备

- [x] P2-001 核对 `admin/package.json`、Next.js 版本、React 版本、包管理器与现有脚本。
- [x] P2-002 阅读 `admin/node_modules/next/dist/docs/` 中 Route Handlers、Cookies、Middleware、Streaming、Runtime 的对应版本文档，并记录关键约束。
- [x] P2-003 审计现有 `admin/app`、`admin/lib`、Supabase 客户端与现有管理后台调用路径，标记可复用和必须替换的部分。
- [x] P2-004 审计现有 Supabase Schema、RLS、Auth Provider、Storage Bucket 和 Edge Functions，形成迁移清单。
- [x] P2-005 定义服务端环境变量名称、校验与启动失败策略；只记录名称，不把密钥写入仓库或文档。
- [x] P2-006 确认生产、预览、本地环境的 CORS/Origin 策略和 Cookie Domain 策略。
- [x] P2-007 建立 API 变更流程：先更新 P1 契约，再实现 Route Handler，最后补 P3 用例。

### P2-1 API 基础层

- [x] P2-101 建立统一 `AppError` 领域错误类型与稳定业务码常量，禁止 Route Handler 直接泄露 Supabase/Postgres 原始错误。
- [x] P2-102 实现成功、错误、分页响应 envelope，统一 `success`、`data`、`error`、`meta` 字段。
- [x] P2-103 实现 `requestId` 生成、外部 `X-Request-Id` 校验、日志上下文和响应回传。
- [x] P2-104 实现 UTC RFC3339 时间戳格式与统一序列化规则。
- [x] P2-105 实现分页参数解析：默认 `page=1`、`pageSize=20`，最大值 100，非法值返回 422 `PAGINATION_INVALID`。
- [x] P2-106 实现 Zod 或项目等价 Schema 校验，拒绝未知敏感字段、拒绝客户端提交 `role`、`userId`、`creatorId`、`isCorrect` 等受保护字段。
- [x] P2-107 实现结构化日志与脱敏：记录 `requestId`、route、method、status、durationMs、userId、errorCode，不记录 token、Cookie、完整 prompt、密钥和隐私明文。
- [x] P2-108 为成功、错误、分页、请求 ID、未知字段和错误脱敏编写单元测试。
- [ ] P2-109 为登录、验证码、AI、导入、管理写入和搜索接口定义限流策略；限流失败统一返回 429。基础 `RateLimiter`、进程内固定窗口实现、测试注入 `now` 与统一 429 已完成；各业务额度和多实例分布式存储待对应接口阶段确定。

### P2-2 Supabase 客户端与会话适配

- [ ] P2-201 实现服务端 Supabase 用户客户端：从当前请求的 Bearer Token 或 Cookie 会话绑定用户身份，查询时保留 RLS。
- [ ] P2-202 实现 server-only 高权限 Supabase 客户端，并确保任何客户端 bundle、日志和错误响应都无法导入或泄露 service role。
- [ ] P2-203 实现 Cookie 会话适配：读取、校验、轮换和清除 `sb_access`、`sb_refresh`，属性固定为 `HttpOnly; Secure; SameSite=Lax; Path=/`。Admin 侧已用 Prisma 服务端 Session + `admin_session` Cookie 完成等价适配（属性 `HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`，生产追加 `Secure`）；Supabase `sb_*` Cookie 适配未实现。
- [ ] P2-204 明确 Cookie 中只保存最小必要会话数据，不保存角色作为授权事实源；角色每次从 `public.users` 读取。
- [ ] P2-205 实现用户存在性、`is_banned`、`role` 和权限集合的读取函数，禁止信任 JWT 自定义 claim 中的角色。
- [ ] P2-206 验证普通用户客户端无法跨用户读取或修改私有资源，RLS 失败必须映射为安全的 AppError。
- [ ] P2-207 验证 service role 客户端只能从服务端模块导入；通过构建产物和测试检查不存在客户端导出。
- [ ] P2-208 为 Supabase 不可用、超时、JWT 无效、刷新失败和 RLS 拒绝建立错误映射测试。

### P2-3 Auth 与会话

- [x] P2-301 实现 `POST /api/v1/auth/send-code`：邮箱规范化、用途限制、验证码发送、频率限制和统一响应。
- [x] P2-302 实现 `POST /api/v1/auth/login/code`：支持 `clientType=flutter` 与 `clientType=admin-web`，校验验证码和用户封禁状态。
- [x] P2-303 Flutter 登录成功返回 access token、refresh token、过期时间、用户对象和权限列表。
- [ ] P2-304 管理后台登录成功只返回用户对象并设置 HttpOnly Cookie；非 `admin` 返回 403 `ADMIN_REQUIRED`。
- [x] P2-305 实现 `POST /api/v1/auth/login/password`：Admin 使用 Prisma `admin_credentials` + bcrypt 校验并签发 `admin_session`，不依赖 Supabase Password Provider；非 `admin-web` 客户端返回 422 `PROVIDER_UNSUPPORTED`；Flutter 密码登录未开放。
- [x] P2-306 实现 `POST /api/v1/auth/refresh`：管理后台从 `admin_session` Cookie 读取会话，在 Prisma 事务内条件撤销旧行并写入新行，成功轮换 Cookie；Flutter refresh token 分支未实现。
- [x] P2-307 实现 `POST /api/v1/auth/logout`：Admin 撤销 Prisma `admin_sessions` 行并清除 `admin_session` Cookie，缺失/无效/已撤销 Cookie 仍返回成功，重复退出保持幂等；Flutter 分支未实现。
- [x] P2-308 实现 `GET /api/v1/auth/session`：Admin 从 Prisma `admin_sessions` 读取会话，返回 `{user, permissions, expiresAt}` 并刷新 `last_seen_at`，不返回 token 或哈希。
- [x] P2-309 统一 401/403 语义：缺少身份为 401 `AUTH_REQUIRED`，过期/无效刷新为 401，身份有效但权限不足为 403，封禁为 403 `USER_BANNED`。Admin 四个 auth 接口已按此语义实现（含 `TOKEN_EXPIRED`、`REFRESH_INVALID`）；Flutter 与其他受保护接口待实现。
- [x] P2-310 实现验证码与密码错误的安全响应，禁止区分邮箱是否存在而泄露账号枚举信息。
- [ ] P2-311 设计 OAuth 一次性 handoff code，但标记为扩展项；MVP 邮箱验证码通过后不得被 OAuth 阻塞。
- [ ] P2-312 编写登录、刷新、退出、会话恢复、封禁、降权和管理员 Cookie 测试。

### P2-4 RBAC、所有权与审计

- [ ] P2-401 建立权限常量与角色权限映射；`admin` 继承普通用户能力并额外拥有管理权限。
- [ ] P2-402 实现 `getActor(request)`，统一解析 Bearer/Cookie、验证令牌、读取 `users.role` 与 `is_banned`。
- [ ] P2-403 实现路由级 `requirePermission(actor, permission, scope)`，缺少权限返回稳定 403。
- [ ] P2-404 实现服务层 `assertSelf`、`assertQuestionAccessible`、`assertMistakeOwner`、`assertCardAccessible`、`assertTargetLimit`、`assertAdminScope`。
- [ ] P2-405 普通用户私有资源非本人时返回 404 `NOT_FOUND`，身份未确认返回 401，身份已确认但权限不足返回 403。
- [ ] P2-406 管理接口同时通过路由 Layer 和服务层检查管理员角色、具体权限与资源范围。
- [ ] P2-407 禁止客户端提交或覆盖 `role`、`isBanned`、`creatorId`、`userId`、答题结果和版本号以外的授权字段。
- [ ] P2-408 建立 `admin_audit_logs` 写入函数：操作者、动作、资源类型、资源 ID、请求 ID、脱敏 metadata、UTC 时间。
- [ ] P2-409 高风险管理写操作与业务变更在同一事务中写审计日志；审计失败时业务不得静默成功。
- [ ] P2-410 实现“不可封禁自己”“不可封禁最后一名有效管理员”等保护规则。
- [ ] P2-411 编写权限矩阵、普通用户访问 `/api/v1/admin/*`、降权即时生效和封禁即时生效测试。
- [ ] P2-412 编写跨用户访问错题、目标、闪卡进度、打卡记录和私有题目的隔离测试。

### P2-5 数据库、约束与 RLS

- [ ] P2-501 审计现有 `users` 表，确认 `role`、`is_banned` 及相关审计字段；只新增缺失字段，不重复建模。
- [ ] P2-502 为 `users.role` 增加值域约束 `user | admin`，并为角色/封禁查询建立必要索引。
- [ ] P2-503 为用户资料、目标院校、错题、卡片进度和打卡记录确认所有权外键与级联策略。
- [ ] P2-504 为题目增加或统一 `review_status`、`reviewed_by`、`reviewed_at`、`review_note`；迁移期保持 `is_approved` 兼容。
- [ ] P2-505 为需要乐观锁的资源增加 `version` 字段，并在更新语句中校验版本。
- [ ] P2-506 设计幂等记录或等价机制，覆盖判题、闪卡复习、UGC 审核、封禁和导入确认。
- [ ] P2-507 为列表查询设计稳定排序和必要复合索引，避免全表扫描和无保证顺序。
- [ ] P2-508 审计并补齐 RLS：用户私有表只能按 `auth.uid()` 访问，公共题只允许已批准记录，用户 UGC 只能由创建者写入。
- [ ] P2-509 为 `admin_audit_logs`、导入任务或等价管理数据配置仅服务端可访问策略。
- [ ] P2-510 在分支或本地数据库执行迁移演练，验证回滚、数据兼容和旧客户端读取路径。
- [ ] P2-511 运行 Supabase Security/Performance Advisors，记录并处理与本次相关的告警。

### P2-6 Flutter API Client 与迁移基础

- [ ] P2-601 新增或改造 Dio `ApiClient`，base URL 从环境配置读取，禁止硬编码本地或生产地址。
- [ ] P2-602 实现 Auth Interceptor：注入 Bearer Token、生成 `X-Client-Version`、透传或记录 `requestId`。
- [ ] P2-603 实现单飞 refresh：access token 过期时只发起一个刷新请求，其余请求等待刷新结果，失败则清理会话并退出。
- [ ] P2-604 将 HTTP、网络、超时、认证和领域错误映射为现有 `AppException` 的强类型子类，禁止页面接触 `DioException`。
- [ ] P2-605 实现分页、envelope、requestId、UTC 时间和 SSE 的 Dart 解析模型。
- [ ] P2-606 更新 `UserModel` 增加 `role`、`permissions`、`isBanned` 字段；仅用于 UI 和路由守卫，不作为服务端授权依据。
- [ ] P2-607 更新 `AuthState` 与 AuthNotifier，支持登录、会话恢复、刷新、退出、封禁和降权状态。
- [ ] P2-608 更新 Router：普通登录守卫与管理员路由守卫分离，管理员入口必须同时检查 `role` 和权限点。
- [ ] P2-609 建立各领域 Repository，只依赖 Dio ApiClient，不直接依赖 Supabase 业务表。
- [ ] P2-610 为 ApiClient、拦截器、错误映射、刷新单飞、会话恢复和路由守卫编写 Flutter 测试。

### P2-7 Me、Dashboard、Quiz 与 Mistakes

- [x] P2-701 实现 `GET /api/v1/me`、`PATCH /api/v1/me`，仅允许本人读取和修改允许字段。
- [x] P2-702 实现 `GET/PATCH /api/v1/me/targets`，服务端校验最多 3 条、仅 1 条主目标，并返回院校快照。
- [x] P2-703 实现 `GET /api/v1/dashboard/summary`，所有统计在服务端按本人数据聚合。
- [x] P2-704 实现 `GET /api/v1/questions`、`GET /api/v1/questions/:id`，普通题目响应绝不含标准答案和解析。
- [x] P2-705 实现 `POST /api/v1/questions/:id/answer`，服务端判题、写入本人错题、处理 attempt 幂等。
- [x] P2-706 实现 `POST/PATCH/DELETE /api/v1/questions` 的用户 UGC 生命周期，`creatorId` 由服务端赋值，公共题提交后进入待审核。
- [x] P2-707 实现错题列表、详情、重做、重新激活和软删除接口，全部执行本人所有权检查。
- [x] P2-708 实现错题状态机：首次答错、再次答错、答对连对、连对 2 次掌握、重新激活清零。
- [x] P2-709 确保普通题答对不会错误创建错题记录，历史错题答对会在统一判题服务中更新连对状态。
- [x] P2-710 为判题、错题状态机、答案隐藏、跨用户隔离、幂等和版本冲突编写测试。

### P2-8 Schools、Flashcards 与 Check-ins

- [x] P2-801 实现院校列表、详情和专业历年数据接口，只返回已发布数据，列表全部服务端分页。
- [x] P2-802 实现 `POST/DELETE /api/v1/schools/:id/target`，仅操作本人目标，重复操作保持幂等。
- [x] P2-803 实现闪卡列表和到期卡接口，只返回系统卡或本人 UGC 卡，进度只属于本人。
- [x] P2-804 实现创建私有 UGC 闪卡，`source`、`creatorId` 由服务端赋值。
- [x] P2-805 实现 `POST /api/v1/flashcards/:id/review`，在事务内执行 SM-2、幂等键检查和进度更新。
- [x] P2-806 实现完成当日全部到期卡片后的每日打卡 upsert，保证用户每日唯一。
- [x] P2-807 实现 `GET /api/v1/check-ins` 分页查询和 `streakDays` 服务端计算。
- [x] P2-808 为 SM-2 三类评级、重复幂等、跨用户进度隔离、未到期卡和打卡唯一性编写测试。

### P2-9 AI SSE 与配额

- [x] P2-901 实现 `POST /api/v1/ai/chat` 的建流前认证、封禁检查和每日配额检查。
- [x] P2-902 实现 SSE `meta`、`delta`、`done`、`error` 事件，HTTP 状态表示建流前结果，流内错误使用 `error` 事件。
- [x] P2-903 服务端只接受 `questionId`、`userAnswer` 和受控上下文，正确答案与解析必须由服务端查询。
- [x] P2-904 实现 30 次/用户/自然日配额、`Asia/Shanghai` 日界线、UTC 存储和 429 `DAILY_LIMIT_EXCEEDED`。
- [x] P2-905 实现 15 秒心跳、120 秒最大连接、客户端取消和上游中断清理。
- [x] P2-906 为用户/管理端分开配置 AI 限流，不把 DeepSeek Key 暴露给 Flutter。
- [x] P2-907 实现 `POST /api/v1/ai/explain` 非流式短回答，并复用同一身份、配额和题目权限逻辑。
- [x] P2-908 为配额、SSE 解析、取消、上游错误、首 token 延迟和日志脱敏编写测试。

### P2-10 Admin API 与管理操作

- [ ] P2-1001 实现 `GET /api/v1/admin/dashboard`，聚合值不含用户隐私明文。
- [ ] P2-1002 实现用户列表、详情、封禁、解封接口，搜索分页、脱敏、审计和最后管理员保护齐全。
- [ ] P2-1003 实现管理员题库增删改查接口，管理端可读答案，用户端继续严格隐藏答案。
- [ ] P2-1004 实现 UGC 审核队列、通过、驳回接口，使用状态机和 version 防止并发重复审核。
- [ ] P2-1005 实现院校增改、专业年度数据维护接口，执行唯一约束、version 和审计。
- [ ] P2-1006 实现院校 CSV/JSON 导入 validate 阶段：文件类型、大小、行数和字段校验。
- [ ] P2-1007 实现导入 commit/confirm 阶段：短时任务、幂等确认、部分失败摘要和审计。
- [ ] P2-1008 确保所有 `/api/v1/admin/*` 同时执行管理员角色检查、具体权限检查和服务层范围检查。
- [ ] P2-1009 编写普通用户访问管理接口 403、权限不足 403、跨范围管理操作拒绝和管理员审计测试。

### P2-11 契约、集成与回归测试

- [ ] P2-1101 为 55 个接口建立契约测试清单，覆盖 Method、Path、Auth、Permission、Request、Response、错误和分页。
- [ ] P2-1102 建立统一 envelope、requestId、UTC 时间戳、未知字段和错误码测试。
- [ ] P2-1103 建立 401/403/404/409/422/429/500/503 的状态与业务码映射测试。
- [ ] P2-1104 建立普通用户/管理员/封禁/降权/最后管理员五种身份场景的权限矩阵测试。
- [ ] P2-1105 建立跨用户读取、修改、删除和伪造身份字段的隔离测试。
- [ ] P2-1106 建立题目答案隐藏、服务端判题、错题状态机、SM-2、打卡、UGC 和导入的业务测试。
- [ ] P2-1107 建立 Flutter Repository、Notifier、路由守卫、token 刷新和 SSE 的组件/单元测试。
- [ ] P2-1108 建立管理后台登录、Cookie 刷新、退出、无权限页和管理操作的 E2E 测试。
- [ ] P2-1109 在 P3 执行 `flutter analyze`、`flutter test`、`pnpm lint`、`pnpm build`，并把真实结果回填到验证文档。

### P2-12 旧架构迁移与文档收口

- [ ] P2-1201 按 Auth/Me → Quiz/Mistakes → Schools/Flashcards/Check-ins → AI → Admin 的顺序灰度切换 Flutter 调用。
- [ ] P2-1202 同一业务场景迁移期间禁止保留两条写入路径；读路径双通道必须有数据来源标记、观测和回滚条件。
- [ ] P2-1203 删除或停用 Flutter 对业务表、受保护 Edge Functions 的直接依赖；`supabase_flutter` 仅保留到兼容迁移结束。
- [ ] P2-1204 确认 Flutter 构建产物不包含 service role、DeepSeek Key、Redis Token 或服务端环境变量。
- [ ] P2-1205 更新 `prd-mvp.md`、`tech-stack.md`、全局架构图和模块文档，使其与新 BFF 架构一致。
- [ ] P2-1206 记录实际排障、偏差、回滚和重大决策，回填本文件第 6 节与任务审计目录。
- [ ] P2-1207 完成 P3 验收并更新 `changed-files.md`，确保文档、迁移脚本和代码变更可追溯。

## 5. 架构决策记录（ADR）

### ADR-001：Next.js 作为统一 BFF

- 决策：Flutter 和管理后台统一调用 Next.js `/api/v1`，Supabase 退为 Auth/DB/Storage 底座。
- 原因：集中业务规则、RBAC、错误协议、审计和速率限制，避免规则散落在 Flutter、RLS 和 Edge Functions。
- 代价：Next.js 成为关键链路，必须处理超时、限流、观测、上游降级和服务端密钥安全。
- 替代方案：继续 Flutter 直连 Supabase；因客户端可信边界和规则重复而拒绝作为长期方案。

### ADR-002：固定 `/api/v1` 前缀

- 决策：所有公开和业务接口使用 `/api/v1`，管理接口使用 `/api/v1/admin/*`。
- 原因：版本化、便于网关/日志路由、避免高权限接口无前缀暴露。
- 代价：未来 breaking change 需要维护并行版本和迁移期。
- 约束：接口契约内部写相对路径，实际运行时必须补全 `/api/v1`。

### ADR-003：Flutter Bearer + Admin HttpOnly Cookie

- 决策：Flutter 使用 access/refresh token，管理后台使用 HttpOnly Cookie。
- 原因：Flutter 多端需要显式会话控制；浏览器后台需要避免 JavaScript 读取 refresh token。
- 代价：服务端必须支持两套凭证解析并统一映射到 Actor。
- 约束：Cookie 只作为会话载体，角色仍从数据库读取；两套入口都必须走相同 RBAC。

### ADR-004：`public.users.role` 是唯一角色事实源

- 决策：身份由 Supabase Auth 提供，角色只读自 `public.users.role`。
- 原因：客户端 JWT claim、本地缓存和请求头都不可信，数据库角色才能支持即时降权与审计。
- 代价：每个受保护请求需要读取用户状态；MVP 接受该成本。
- 替代方案：JWT 自定义 claim 或客户端 `isAdmin`；因无法保证撤销及时而拒绝。

### ADR-005：路由层 + 服务层双重 RBAC

- 决策：路由层做入口权限检查，领域服务再次检查权限、所有权和范围。
- 原因：单层检查容易在复用服务、批处理、内部调用和服务端客户端切换时遗漏。
- 代价：存在少量重复判断；以安全和可测试性优先。
- 约束：管理 service role 路径必须始终经过两层检查。

### ADR-006：用户 JWT + RLS 优先，service role 例外

- 决策：普通用户请求优先使用用户 JWT 调 Supabase，保留 RLS；只有明确需要跨用户管理操作时才使用 server-only service role。
- 原因：RLS 是纵深防御，能降低应用层授权遗漏造成的数据泄露影响。
- 代价：部分管理聚合或事务需要额外设计客户端选择与审计。
- 约束：service role 不得进入客户端 bundle，不得绕过服务层业务校验。

### ADR-007：普通题目提交前不下发答案

- 决策：题目列表和详情不返回标准答案与解析；提交答案后才返回判题结果。
- 原因：避免客户端伪造正确率和绕过业务规则，保证判题可信。
- 代价：需要服务端判题、幂等 attempt 和更明确的错误响应。
- 例外：管理员题目接口明确允许返回答案；用户自己的 UGC 题在创建者可读范围内按契约返回。

### ADR-008：401、403 与私有资源 404 语义分离

- 决策：未确认身份用 401，身份确认但权限不足用 403，私有资源非本人用 404。
- 原因：客户端能准确执行刷新、退出、无权限页和空态；同时降低私有资源枚举。
- 代价：日志需要保留真实拒绝原因，不能把 404 当作统一异常。

### ADR-009：MVP 不做角色缓存

- 决策：每次受保护请求重新读取 `role` 和 `is_banned`。
- 原因：保证降权、封禁和审计即时生效。
- 代价：增加 Supabase 读取；后续如性能不达标，缓存 TTL 不超过 60 秒并支持主动失效。

### ADR-010：幂等写与乐观锁

- 决策：判题、复习、审核、封禁和导入使用 `Idempotency-Key`；可并发编辑资源使用 `version`。
- 原因：移动端重试和管理后台重复点击不能产生重复副作用。
- 代价：需要幂等记录、版本递增和冲突测试。
- 约束：幂等键作用域至少包含用户/操作/资源，不能全局复用。

### ADR-011：AI 使用 SSE 协议

- 决策：`POST /api/v1/ai/chat` 使用 `text/event-stream`，定义 `meta`、`delta`、`done`、`error`。
- 原因：支持首 token 流式体验、取消和上游错误隔离。
- 代价：流内 HTTP 状态无法改变，必须用事件传递错误并处理连接释放。
- 约束：配额在建立流前检查，日志不记录完整 prompt 和用户隐私。

### ADR-012：以基线迁移从零建立 Schema

- 背景：真实审计确认远端 `public` schema 为空，不存在可增量演进的既有结构。
- 决策：把文档契约直接落为一份可重复执行的基线迁移，包含表、约束、索引、触发器、RLS 与服务端函数。
- 原因：避免「先猜表结构再改」的双重成本，并让 RLS 与服务端事务从第一天就成立。
- 代价：需要一次性评审全部表结构；后续变更必须走追加迁移，禁止修改基线。
- 约束：基线迁移不在本次任务自动应用到远端项目，需人工确认后在 P3 记录演练结果。


### ADR-003：用户侧数据访问沿用 Prisma 直连（本轮业务接口）

- 日期：2026-09-26
- 背景：P2-7/P2-8/P2-9 业务接口落地时，Admin 认证已用 Prisma 直连 Postgres（ADR 于 P2-203 记录等价适配），而基线迁移尚未应用到远端，Supabase 用户 JWT + RLS 链路不可用。
- 决策：用户侧业务接口继续以 Prisma 作为数据访问层；RLS 纵深防御由服务层所有权复核（`requireAccessible` / `requireOwn` / `assertTargetLimits` 等）替代。Supabase Auth 仍作为身份提供方（`send-code`/`login/code` 经服务端 Secret Key 客户端发送与校验 OTP），身份事实落 `public.users`。
- 后果：普通用户请求不再经用户 JWT 走 RLS；P2-2 的 Supabase 客户端适配任务调整为「已由 Prisma 等价实现」，JWT+RLS 迁移留待后续任务评估。
- 影响文件：`admin/lib/services/**`、`admin/lib/auth/prisma-user-session-repository.ts`、`admin/prisma/schema.prisma`。

### ADR-004：Flutter 会话采用前缀化不透明令牌对

- 日期：2026-09-26
- 背景：契约 AUTH-02/05 要求 Flutter 持有 access + refresh 令牌对；Admin 侧已有单一 `admin_session` Cookie 会话。
- 决策：新增 `user_sessions` 表（迁移 `20260926140000_user_sessions.sql`），access（`usa_` 前缀，2h）与 refresh（`usr_` 前缀，30d）共用一张表，仅存 SHA-256 摘要；刷新在事务内原子轮换 refresh 行并新建 access 行，重放返回 401 `REFRESH_INVALID`。
- 后果：`/auth/refresh`、`/auth/logout`、`/auth/session` 均支持 Bearer 与 Cookie 双入口；令牌前缀使类别在读取时即可判定，无需额外列。

### ADR-005：倒计时与自然日口径

- 日期：2026-09-26
- 决策：`daysUntilExam` 按 `examYear - 1` 年 12 月 21 日（`Asia/Shanghai` 当地日历日）估算初试日，未设置或已过期返回 `null`；AI 配额、打卡与今日刷题数均按 `Asia/Shanghai` 日界线、UTC 存储。该口径为 MVP 约定，待产品确认。

## 6. 实施中问题与决策记录

实现阶段每解决一个真实问题，都在本表追加记录，不只写“已完成”。

| 日期 | 任务 ID | 实际问题 | 排查/决策 | 影响文件 | 状态 |
|---|---|---|---|---|---|
| 2026-09-26 | P2-002 | 本地 `admin/` 为 Next.js 16.3.5，`middleware.ts` 已弃用，`cookies()` 与动态路由 `params` 均为异步 | 以 `admin/node_modules/next/dist/docs/` 实际版本文档为准：改用根 `proxy.ts`（仅做导航守卫，不做唯一鉴权）；`cookies()` 使用 `await`；Route Handler 的 `context.params` 为 `Promise`；不设置已弃用的 `runtime = 'edge'`；每个请求新建 Supabase 客户端 | `admin/proxy.ts`、全部 `app/api/**/route.ts` | 已解决 |
| 2026-09-26 | P2-001、P2-108 | `admin/` 初始仅有脚手架，无 `lib/`、无 API 路由、无测试脚本 | 保留既有 `dev/build/start/lint` 脚本；新增 `@supabase/ssr`、`@supabase/supabase-js`、`zod`、`server-only` 依赖；P2-1 阶段补入 Vitest 与 `pnpm test`，基础层 60 个测试通过，P2-11 业务契约测试仍待后续实现 | `admin/package.json`、`admin/pnpm-lock.yaml`、`admin/lib/api/__tests__/*.test.ts` | 已解决（基础层） |
| 2026-09-26 | P2-004 | `.mcp.json` 固定项目 `roiqsirzrykaebsqpxex`，MCP 工具返回 `INVALID_ARGUMENT`，`_list_projects` 只见两个未激活项目 | 改用只读方式审计：以 `.env.local` 中的键发起 `GET /rest/v1/` OpenAPI 请求（不打印密钥）。结果是 `components.schemas` 为空，仅暴露 `/rpc/rls_auto_enable`；探测业务表全部返回 `PGRST205`。**结论：远端 `public` schema 为空，不存在既有表、RLS 或迁移** | `docs/p1-design/next-backend-api-rbac/data-model.md` | 已解决（结论：从零建基线） |
| 2026-09-26 | P2-005 | 文档旧稿使用 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`，与 `.env.local` 实际命名不一致 | 以实际存在的 `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` 为准，不新增旧名别名；服务端统一经 `lib/env.ts` 读取 | `docs/p1-design/next-backend-api-rbac/environment.md`、`admin/lib/env.ts` | 已解决 |
| 2026-09-26 | P2-004 | 远端库为空与既有 Flutter 直连 Supabase 的关系 | 空库意味着旧客户端当前也无业务表可用，因此基线迁移不引入额外回退风险；迁移文件只提交，不自动应用到远端，需人工确认后执行 | `supabase/migrations/*.sql` | 已记录 |
| 2026-09-26 | P2-303/P2-306 | refresh/logout/session 路由引入未 mock 的 `PrismaUserSessionRepository`（`server-only`）导致既有 routes.test.ts 在收集阶段失败 | 在测试中按既有模式补 `vi.mock("@/lib/auth/prisma-user-session-repository")`；路由层保持薄适配，服务层可注入 fake 仓储测试 | `app/api/v1/auth/__tests__/routes.test.ts` | 已解决 |
| 2026-09-26 | P2-708 | 已掌握（mastered）错题在判题状态机中答对后回退为 active | `nextMistakeState` 保持 mastered 并保留首次 `masteredAt`；再次答错才重新打开并清零 | `lib/domain/judging.ts`、两个 Prisma 仓储 | 已解决 |
| 2026-09-26 | P2-705 | Prisma `Json` 列不接受带 `Date` 字段的强类型对象 | 判题事务内把错题快照序列化为 JSON 安全结构后再写入 `result` | `lib/services/quiz/prisma-quiz-repository.ts` | 已解决 |
| 2026-09-26 | P2-805 | 复习幂等重放需要返回首次计算结果 | `card_review_events` 唯一约束兜底；重放路径读取事件中存储的 `dueRemaining`/`checkIn` 快照 | `lib/services/flashcards/prisma-flashcard-repository.ts` | 已解决 |

## 7. 完成定义（DoD）

- [ ] `/api/v1` 基础层、认证、RBAC、所有权和审计均已实现并有自动化测试。
- [ ] 55 个接口均与 P1 契约一致，未实现的扩展项在契约中明确标注。
- [ ] 普通用户无法访问 `/api/v1/admin/*`，无法读取或修改他人私有数据。
- [ ] 管理员降权、用户封禁即时生效，最后一名有效管理员受到保护。
- [ ] 普通题目提交前不泄漏答案，判题、错题、SM-2、打卡和审核规则只在服务端执行。
- [ ] Flutter 业务 Repository 不再直接依赖 Supabase 业务表，错误均映射为 `AppException`。
- [ ] 服务端密钥只在服务端环境变量中存在，错误、日志和构建产物均无泄漏。
- [ ] 完成 P3 验证并在 `docs/p3-verification/next-backend-api-rbac/verification.md` 回填真实结果。
- [ ] 完成后更新任务审计 `changed-files.md` 和全局架构文档。
