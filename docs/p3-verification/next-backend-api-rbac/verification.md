# P3 - Next.js 后端接口与 RBAC 验证

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：待执行，不代表任何接口、迁移或测试已经完成  
> 上游需求：`docs/p0-definition/next-backend-api-rbac/definition.md`  
> 上游设计：`docs/p1-design/next-backend-api-rbac/design.md`  
> 接口契约：`docs/p1-design/next-backend-api-rbac/api-contract.md`  
> 开发清单：`docs/p2-development/next-backend-api-rbac/development.md`

## 1. 验证边界

本文件定义 P2 实现完成后的真实验收方法和证据回填位置。当前仅完成验证设计，不允许把本文件中的用例、命令或目标值当作已经通过的证据。

- 验证对象：Next.js BFF `/api/v1`、Supabase Auth/数据库/RLS、RBAC、Flutter API Client 与管理后台会话。
- 必测平台：Flutter 移动端或桌面端至少一端、Flutter Web、管理后台 Web。
- 可选平台：iOS、Android、macOS、Windows；若本轮未执行，必须记录未测原因，不得标记通过。
- 禁止在生产主库直接执行破坏性迁移、批量导入、封禁或跨用户隔离测试。
- 测试账号、令牌、Cookie、数据库连接串和第三方密钥不得写入本文档或提交到仓库。
- 只有当 P2 的对应模块完成且 P3 证据真实回填后，接口才可标记为“已验收”。

## 2. 验证前置条件

- [ ] P3-PRE-001 P2-0 至 P2-12 的实现项均已完成，未完成项已明确记录并在验收结论中阻断发布。
- [ ] P3-PRE-002 已阅读 `admin/node_modules/next/dist/docs/` 中与 Route Handlers、Cookies、Middleware、Streaming、Runtime 对应的 Next.js 16 本地文档，并记录实现约束。
- [ ] P3-PRE-003 使用独立 Supabase 分支或验收数据库，Schema、迁移、RLS 和种子数据可重复创建。
- [ ] P3-PRE-004 准备 `userA`、`userB`、`adminA`、`adminB`、已封禁用户、待降权管理员等隔离测试账号。
- [ ] P3-PRE-005 准备 userA/userB 各自的错题、目标院校、闪卡进度、打卡记录和私有 UGC 题目。
- [ ] P3-PRE-006 准备官方题、待审核 UGC 题、已批准题、已驳回题和已软删除题等题库样本。
- [ ] P3-PRE-007 准备院校发布/下架样本、专业年度数据、合法导入文件和非法导入文件。
- [ ] P3-PRE-008 确认 Next.js、Flutter、Supabase、AI 上游测试环境可访问；缺少外部依赖时使用受控 mock，不伪造成功结果。
- [ ] P3-PRE-009 配置与生产隔离的 Cookie、CORS、Origin、限流和 AI 配额参数。
- [ ] P3-PRE-010 建立验收证据目录，保存命令输出摘要、测试报告、请求响应样本和缺陷记录，敏感字段必须脱敏。

## 3. 结果记录规则

| 标记 | 含义 |
|---|---|
| `[ ] 待执行` | 尚未执行，初始状态 |
| `[x] PASS` | 已执行且满足预期，必须附证据 |
| `[ ] FAIL` | 已执行但结果不符合预期，必须附复现步骤和缺陷 ID |
| `[ ] BLOCKED` | 因前置条件缺失无法执行，必须记录阻塞原因和解除条件 |
| `[ ] N/A` | 确认不适用，必须给出明确理由和审批人 |

所有命令结果、状态码、业务码、响应字段、审计记录和构建输出都必须来自实际执行，禁止根据接口契约推导为通过。

## 4. 验证矩阵总览

| 验证域 | 覆盖内容 | 对应 P2 | 初始状态 |
|---|---|---|---|
| 契约基线 | 55 个接口、Method、Path、Auth、Permission、DTO、分页 | P2-1101 | 待执行 |
| 通用响应 | envelope、错误码、`requestId`、UTC、未知字段 | P2-101 至 P2-109、P2-1102 | 待执行 |
| 认证会话 | 验证码、Flutter Token、Admin Cookie、刷新、退出 | P2-3 | 待执行 |
| RBAC | 角色权限矩阵、路由层与服务层双检、降权、封禁 | P2-4、P2-1104 | 待执行 |
| 所有权隔离 | 错题、目标、闪卡进度、打卡、私有题 | P2-4、P2-5、P2-1105 | 待执行 |
| 领域业务 | 判题、错题状态机、SM-2、打卡、UGC、导入 | P2-7 至 P2-10、P2-1106 | 待执行 |
| AI SSE | 事件协议、配额、取消、上游失败、日志脱敏 | P2-9 | 待执行 |
| Flutter | Repository、Notifier、路由守卫、刷新、异常映射 | P2-6、P2-1107 | 待执行 |
| Admin Web | 登录、Cookie、无权限页、管理操作 E2E | P2-3、P2-10、P2-1108 | 待执行 |
| 静态与构建 | `flutter analyze`、`flutter test`、`pnpm lint`、`pnpm build` | P2-1109 | 待执行 |
| 安全与迁移 | 密钥、构建产物、旧直连、回滚、全局文档 | P2-2、P2-12、P2-1204/1205 | 待执行 |

## 5. 契约基线验证

### 5.1 接口数量与总览

- [ ] P3-CONTRACT-001 接口总数为 55，且与总览表分项合计完全一致。
- [ ] P3-CONTRACT-002 Auth 为 7 个接口。
- [ ] P3-CONTRACT-003 Me 为 4 个接口。
- [ ] P3-CONTRACT-004 Dashboard 为 1 个接口。
- [ ] P3-CONTRACT-005 Quiz 为 6 个接口。
- [ ] P3-CONTRACT-006 Mistakes 为 5 个接口。
- [ ] P3-CONTRACT-007 Schools 为 5 个接口。
- [ ] P3-CONTRACT-008 Flashcards 与打卡为 5 个接口。
- [ ] P3-CONTRACT-009 AI 为 2 个接口。
- [ ] P3-CONTRACT-010 Admin 为 20 个接口，其中 Dashboard 1、Users 4、Questions 5、UGC 3、Schools 7。
- [ ] P3-CONTRACT-011 契约表内部路径均省略固定前缀；运行时、Flutter Endpoint 和集成测试均补全 `/api/v1`，不存在 `/api/v1/api/v1`。
- [ ] P3-CONTRACT-012 每个接口的 Method、Path、Auth、Permission、Request、Response 和错误边界均有实现与测试映射。
- [ ] P3-CONTRACT-013 所有增长型列表均有服务端分页；目标院校等有明确数量上限的非增长集合可不分页，但必须记录理由。
- [ ] P3-CONTRACT-014 所有写接口均有幂等键、版本或明确幂等语义，重复请求不会产生重复副作用。
- [ ] P3-CONTRACT-015 OpenAPI、测试清单或等价机器可读契约与 Markdown 契约一致。

### 5.2 接口实现状态回填

| 模块 | 契约数量 | 已实现 | 契约测试通过 | 权限测试通过 | 证据路径 | 状态 |
|---|---:|---:|---:|---:|---|---|
| Auth | 7 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Me | 4 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Dashboard | 1 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Quiz | 6 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Mistakes | 5 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Schools | 5 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Flashcards | 5 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| AI | 2 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| Admin | 20 | 待统计 | 待执行 | 待执行 | 待填写 | 待执行 |
| **合计** | **55** | **待统计** | **待执行** | **待执行** | **待填写** | **待执行** |

## 6. 通用响应与错误契约

- [ ] P3-API-001 成功响应统一为 `{success:true, data, meta}`，`meta` 至少包含 `requestId` 和 UTC RFC3339 `timestamp`。
- [ ] P3-API-002 错误响应统一为 `{success:false, error:{code,message,details}, meta}`，不返回 SQL、堆栈、Supabase 原始错误或内部地址。
- [ ] P3-API-003 列表响应包含 `pagination.page`、`pageSize`、`total`、`totalPages`，并与实际数据一致。
- [ ] P3-API-004 默认分页为 `page=1&pageSize=20`；最大值 100；非法或越界参数返回 422 `PAGINATION_INVALID`。
- [ ] P3-API-005 合法外部 `X-Request-Id` 被校验并回传；缺失或非法时服务端生成新 ID，日志与响应一致。
- [ ] P3-API-006 所有时间字段为 UTC RFC3339；前端按用户时区展示，服务端不返回本地化字符串。
- [ ] P3-API-007 JSON 字段使用 `camelCase`；数据库 `snake_case` 映射不出现在响应 DTO 中。
- [ ] P3-API-008 未知敏感字段、`role`、`isBanned`、`creatorId`、`userId`、`isCorrect`、答题结果和越权版本字段被 Schema 拒绝或忽略，且不产生写入。
- [ ] P3-API-009 连续请求不会泄漏其他请求的上下文、身份、分页游标或 `requestId`。
- [ ] P3-API-010 401、403、404、409、422、429、500、503 的状态码与业务码映射符合设计文档第 5.5 节。

### 6.1 关键错误语义

- [ ] P3-ERROR-001 无凭证访问受保护接口返回 401 `AUTH_REQUIRED`。
- [ ] P3-ERROR-002 access token 过期返回 401 `TOKEN_EXPIRED`，且不会误报为权限不足。
- [ ] P3-ERROR-003 refresh token 无效或过期返回 401 `REFRESH_INVALID`。
- [ ] P3-ERROR-004 已确认身份但缺少权限返回 403 `FORBIDDEN`。
- [ ] P3-ERROR-005 普通用户访问管理能力返回 403 `ADMIN_REQUIRED` 或具体权限不足的 403，不得返回 500。
- [ ] P3-ERROR-006 已封禁用户访问受保护接口返回 403 `USER_BANNED`。
- [ ] P3-ERROR-007 私有资源不存在或非本人访问返回 404 `NOT_FOUND`，日志保留真实拒绝原因。
- [ ] P3-ERROR-008 乐观锁版本冲突返回 409，不覆盖最新资源。
- [ ] P3-ERROR-009 AI 每日配额耗尽返回 429 `DAILY_LIMIT_EXCEEDED`。
- [ ] P3-ERROR-010 Supabase、Redis 或 AI 上游不可用返回 503 `DEPENDENCY_UNAVAILABLE`，不泄露上游细节。

## 7. 认证与会话验证

### 7.1 Flutter 会话

- [ ] P3-AUTH-001 `POST /api/v1/auth/send-code` 规范化邮箱并执行用途与频率限制。
- [ ] P3-AUTH-002 验证码正确时，`clientType=flutter` 返回 access token、refresh token、过期时间、用户对象和权限列表。
- [ ] P3-AUTH-003 access token 可用于 Bearer 身份验证；客户端伪造角色或用户 ID 不影响服务端判定。
- [ ] P3-AUTH-004 access token 过期时，Flutter 单飞刷新；并发 401 只触发一次 refresh，成功后各请求各重放一次。
- [ ] P3-AUTH-005 refresh 成功必须轮换 refresh token；旧 refresh token 在约定策略下失效。
- [ ] P3-AUTH-006 refresh 失败后 Flutter 清理本地会话并跳转登录，不进入刷新死循环。
- [ ] P3-AUTH-007 登出撤销服务端会话并清理本地 token；重复登出保持幂等。
- [ ] P3-AUTH-008 `GET /api/v1/auth/session` 返回当前用户、权限和过期时间，不返回 Auth 内部 secret。
- [ ] P3-AUTH-009 邮箱不存在、验证码错误和密码错误场景不泄露账号是否存在。
- [ ] P3-AUTH-010 OAuth 扩展未启用时明确返回扩展状态，不阻塞邮箱验证码主流程。

### 7.2 管理后台会话

- [ ] P3-AUTH-011 `clientType=admin-web` 登录成功后仅返回用户对象并设置 `HttpOnly; Secure; SameSite=Lax; Path=/` Cookie。
- [ ] P3-AUTH-012 非管理员使用 `admin-web` 登录返回 403 `ADMIN_REQUIRED`。
- [ ] P3-AUTH-013 浏览器 JavaScript 无法读取 access/refresh token；刷新和退出只通过服务端 Cookie 完成。
- [ ] P3-AUTH-014 管理后台 refresh 成功轮换 Cookie；退出清除两个 Cookie。
- [ ] P3-AUTH-015 middleware 页面守卫与 `/api/v1/admin/*` Route Handler 权限检查同时生效。
- [ ] P3-AUTH-016 已登录普通用户访问管理页面或管理接口均被拒绝，不能仅依靠前端隐藏入口。

## 8. RBAC 与管理接口验证

### 8.1 权限矩阵

- [ ] P3-RBAC-001 `user` 拥有个人资料、目标、刷题、错题、院校、闪卡、打卡和 AI 的已授权能力。
- [ ] P3-RBAC-002 `admin` 继承全部普通用户能力，但仍只能访问自己的个人学习资源。
- [ ] P3-RBAC-003 每个管理权限点仅对具备对应权限的 `admin` 开放。
- [ ] P3-RBAC-004 路由层 `requirePermission` 与服务层范围复核同时执行；临时绕过其中一层时测试应失败并暴露缺口。
- [ ] P3-RBAC-005 普通用户逐个访问 20 个 `/api/v1/admin/*` 接口均返回 403，且不发生任何数据写入。
- [ ] P3-RBAC-006 缺少 `admin:users:ban`、`admin:questions:write`、`admin:ugc:review`、`admin:schools:write` 等具体权限时返回 403。
- [ ] P3-RBAC-007 `X-User-Id`、`X-Role` 等身份覆盖头被拒绝或完全忽略。
- [ ] P3-RBAC-008 客户端 JWT 自定义角色 claim 与 `public.users.role` 冲突时，以数据库角色为准。
- [ ] P3-RBAC-009 MVP 不缓存角色；管理员降权后下一次受保护请求立即失去管理权限。
- [ ] P3-RBAC-010 用户封禁后下一次受保护请求立即返回 403 `USER_BANNED`。
- [ ] P3-RBAC-011 管理员不可封禁自己。
- [ ] P3-RBAC-012 不可封禁最后一名有效管理员，返回 409 `LAST_ADMIN_PROTECTED`。
- [ ] P3-RBAC-013 解封操作幂等，重复解封不会产生重复审计或异常状态。

### 8.2 管理审计

- [ ] P3-AUDIT-001 封禁、解封、题目写操作、UGC 审核、院校维护和导入确认均写入 `admin_audit_logs`。
- [ ] P3-AUDIT-002 审计记录包含 actor、action、resourceType、resourceId、requestId、脱敏 metadata 和 UTC 时间。
- [ ] P3-AUDIT-003 高风险业务变更与审计日志在同一事务提交；审计写入失败时业务回滚。
- [ ] P3-AUDIT-004 审计 metadata 不包含 token、Cookie、密码、验证码、完整 prompt 或无关隐私明文。
- [ ] P3-AUDIT-005 被拒绝的越权尝试在结构化日志中可追踪，但不向调用方泄露资源是否存在。

## 9. 所有权与跨用户隔离验证

| 用例 ID | 测试动作 | 预期结果 | 初始状态 |
|---|---|---|---|
| P3-OWN-001 | userA 读取 userB 私有 UGC 题详情 | 404 `NOT_FOUND`，无题目内容泄漏 | 待执行 |
| P3-OWN-002 | userA 修改或删除 userB 私有 UGC 题 | 404 `NOT_FOUND`，userB 数据不变 | 待执行 |
| P3-OWN-003 | userB 通过请求字段提交 `creatorId=userA` 创建题目 | 受保护字段被拒绝或覆盖为 userB，不能冒充 userA | 待执行 |
| P3-OWN-004 | userA 读取 userB 错题列表、详情或提交重做 | 404 `NOT_FOUND` 或仅返回 userA 自己的空结果，不能返回 userB 内容 | 待执行 |
| P3-OWN-005 | userA 删除、重新激活或修改 userB 错题 | 404 `NOT_FOUND`，userB 错题状态和计数不变 | 待执行 |
| P3-OWN-006 | userA 通过请求参数指定 userB 的目标院校资源 | 服务端以 token 身份为准，不能读写 userB 目标 | 待执行 |
| P3-OWN-007 | userA 添加/删除目标后检查 userB 目标 | 仅 userA 目标变化 | 待执行 |
| P3-OWN-008 | userA 复习系统卡后检查 userB 进度 | 仅 userA 进度变化，userB 进度不变 | 待执行 |
| P3-OWN-009 | userA 尝试使用 userB 的进度 ID 或伪造进度字段提交复习 | 请求被拒绝或字段被忽略，不能修改 userB 进度 | 待执行 |
| P3-OWN-010 | userA 查询打卡记录 | 只返回 userA 自己的记录和 streak | 待执行 |
| P3-OWN-011 | userA 尝试提交 userB 的打卡 ID 或用户 ID | 受保护字段被拒绝，userB 打卡不变 | 待执行 |
| P3-OWN-012 | userA 通过公开题目读取答案字段 | 普通用户响应不包含 `answer`、`explanation` 或等价明文 | 待执行 |
| P3-OWN-013 | 直接使用 service role 从客户端环境访问数据表 | 客户端无 service role，构建产物和网络请求均不包含该密钥 | 待执行 |
| P3-OWN-014 | 管理员访问其他用户私有学习数据但无对应管理权限 | 默认拒绝；如未来新增管理能力，必须显式授权并审计 | 待执行 |

补充要求：

- [ ] P3-OWN-015 跨用户读、写、删、批量操作和导出路径全部有测试，不只覆盖 GET。
- [ ] P3-OWN-016 私有资源 404 防枚举策略与日志真实原因同时存在。
- [ ] P3-OWN-017 RLS 被绕过或返回 0 行时，应用层仍不会回退到 service role 并意外放行。
- [ ] P3-OWN-018 所有查询以 token 中的用户 ID 为边界，不信任客户端传入的所有者字段。

## 10. 领域业务规则验证

### 10.1 Me、Dashboard 与 Targets

- [ ] P3-BIZ-001 `GET/PATCH /api/v1/me` 只能读写本人允许字段；`role`、`isBanned`、`email` 不可修改。
- [ ] P3-BIZ-002 Dashboard 的错题数、到期卡数、打卡天数和目标摘要与数据库实际值一致。
- [ ] P3-BIZ-003 时区非法时返回 422；默认 `Asia/Shanghai` 计算符合预期。
- [ ] P3-BIZ-004 目标最多 3 条且仅 1 条 primary；超限和主目标冲突返回稳定业务码。
- [ ] P3-BIZ-005 重复添加已有目标或重复删除不存在目标保持幂等。

### 10.2 Quiz 与 Mistakes

- [ ] P3-BIZ-006 普通题目列表和详情在提交答案前均不含标准答案与解析。
- [ ] P3-BIZ-007 单选、多选答案由服务端规范化判题，错误格式返回 `ANSWER_INVALID`。
- [ ] P3-BIZ-008 同一 user 与 attemptId 重复提交返回第一次结果，不重复创建错题副作用。
- [ ] P3-BIZ-009 同一 attemptId 提交不同内容返回 409 `ATTEMPT_CONFLICT`。
- [ ] P3-BIZ-010 首次答错创建 `error_count=1`、`consecutive_correct=0` 的本人错题。
- [ ] P3-BIZ-011 再次答错更新计数并将连对清零，不创建重复错题。
- [ ] P3-BIZ-012 历史错题答对累计连对；连对达到 2 次后状态变为 `mastered`。
- [ ] P3-BIZ-013 重新激活已掌握错题后状态为 `active`、连对清零、掌握时间清空。
- [ ] P3-BIZ-014 普通题首次答对不会错误创建错题记录。
- [ ] P3-BIZ-015 UGC 公共题创建或编辑后进入待审核，审核通过前普通用户不可见。
- [ ] P3-BIZ-016 题目软删除后用户端不可见，但历史错题引用仍可解释且不出现外键错误。
- [ ] P3-BIZ-017 并发编辑题目使用 version，旧版本提交返回 409 且不覆盖最新内容。

### 10.3 Schools、Flashcards 与 Check-ins

- [ ] P3-BIZ-018 用户院校列表和详情只返回已发布数据，下架数据返回 404。
- [ ] P3-BIZ-019 院校、专业历年列表使用服务端分页和稳定排序。
- [ ] P3-BIZ-020 闪卡只返回系统卡或本人 UGC 卡；别人的私有 UGC 卡不可见。
- [ ] P3-BIZ-021 `forgot`、`fuzzy`、`remembered` 的 SM-2 间隔、重复次数和 ease factor 与契约一致。
- [ ] P3-BIZ-022 相同 `idempotencyKey` 重复复习返回第一次计算结果，不重复更新进度。
- [ ] P3-BIZ-023 未到期卡在要求到期卡的场景返回 409 `CARD_NOT_DUE`。
- [ ] P3-BIZ-024 完成当日全部到期卡后同一事务创建唯一打卡；重复完成不产生重复日期记录。
- [ ] P3-BIZ-025 `GET /api/v1/check-ins` 只返回本人记录，`streakDays` 由服务端计算。
- [ ] P3-BIZ-026 跨日、时区边界、漏打卡和连续打卡场景均有测试。

### 10.4 UGC、Admin 与导入

- [ ] P3-BIZ-027 UGC 仅 pending 状态可批准或驳回；重复或并发审核返回 409 `UGC_ALREADY_REVIEWED`。
- [ ] P3-BIZ-028 驳回原因必填；审核通过后普通用户可见性符合审核状态。
- [ ] P3-BIZ-029 管理员题目接口可读答案，普通题目接口始终隐藏答案。
- [ ] P3-BIZ-030 管理员题库写入、院校专业维护和软删除全部执行唯一约束、version 和审计。
- [ ] P3-BIZ-031 导入 validate 阶段校验文件类型、大小、行数和字段，失败返回 `IMPORT_VALIDATION_FAILED`。
- [ ] P3-BIZ-032 仅 validate 成功且未过期的 job 可 confirm，过期返回 `IMPORT_JOB_EXPIRED`。
- [ ] P3-BIZ-033 导入 confirm 幂等；重复确认不会重复创建院校或专业数据。
- [ ] P3-BIZ-034 部分失败摘要可定位到行和字段，但不泄露服务器路径或敏感配置。

### 10.5 AI SSE 与配额

- [ ] P3-AI-001 `POST /api/v1/ai/chat` 在建流前完成认证、封禁和每日配额检查。
- [ ] P3-AI-002 SSE 事件严格为 `meta`、`delta`、`done`、`error`，顺序和 JSON 结构符合契约。
- [ ] P3-AI-003 服务端只接受受控上下文，正确答案与解析由服务端查询；客户端不能注入 system prompt 或正确答案。
- [ ] P3-AI-004 每日 30 次配额按 `Asia/Shanghai` 自然日计算，存储为 UTC；第 31 次返回 429 `DAILY_LIMIT_EXCEEDED`。
- [ ] P3-AI-005 客户端取消后连接、上游请求和日志上下文得到清理，不产生未处理异常。
- [ ] P3-AI-006 上游错误在已建流场景发出 `error` 事件，在建流前场景返回 503。
- [ ] P3-AI-007 约 15 秒心跳和 120 秒最大连接符合设计；长时间无输出不会导致网关提前断开。
- [ ] P3-AI-008 AI 日志不记录完整 prompt、用户隐私或 DeepSeek Key。
- [ ] P3-AI-009 `POST /api/v1/ai/explain` 复用同一认证、题目权限和配额逻辑。
- [ ] P3-AI-010 首 token 目标 `< 1s` 在受控环境测量并记录分布，不把目标值写成实测值。

## 11. Flutter 验证

### 11.1 自动化与架构

- [ ] P3-FLUTTER-001 执行 `flutter analyze`，必须 0 error、0 warning。
- [ ] P3-FLUTTER-002 执行 `flutter test`，全部测试通过，无跳过或隐藏失败。
- [ ] P3-FLUTTER-003 UI 和 Notifier 不直接调用 Dio；网络访问只存在于 Repository/ApiClient。
- [ ] P3-FLUTTER-004 页面不接收 `DioException`；网络、认证和领域错误均映射为强类型 `AppException`。
- [ ] P3-FLUTTER-005 `DioApiClient` base URL 来自环境配置，无硬编码本地或生产地址。
- [ ] P3-FLUTTER-006 AuthInterceptor 注入 Bearer Token、`X-Client-Version` 和 `X-Request-Id`，不注入角色覆盖头。
- [ ] P3-FLUTTER-007 单飞 refresh 在并发 401 下只刷新一次，失败后清理会话并跳转登录。
- [ ] P3-FLUTTER-008 `UserModel` 的 `role`、`permissions`、`isBanned` 可用于 UI 和路由守卫，但不作为服务端授权依据。
- [ ] P3-FLUTTER-009 管理员路由守卫只在角色和权限均满足时放行；普通用户直达管理路由被阻止。
- [ ] P3-FLUTTER-010 各领域 Repository 不再直接依赖 Supabase 业务表或受保护 Edge Functions。
- [ ] P3-FLUTTER-011 SSE 客户端正确解析 `meta`、`delta`、`done`、`error`，断线可重试且不重复计费或重复写入。
- [ ] P3-FLUTTER-012 对 401、403、404、409、422、429、503 均展示符合产品语义的错误或空态。

### 11.2 多端冒烟

- [ ] P3-FLUTTER-013 Flutter Web 登录、刷新、业务列表、提交答案和退出闭环通过。
- [ ] P3-FLUTTER-014 Flutter 移动端或桌面端至少一端完成登录、列表、写操作和 AI SSE 冒烟。
- [ ] P3-FLUTTER-015 键盘弹起、滚动加载、分页到底、网络断开恢复和 token 过期弹层无回归。
- [ ] P3-FLUTTER-016 动效时长不超过 400ms，无系统 Emoji，图标使用项目规范。
- [ ] P3-FLUTTER-017 Flutter 构建产物中不包含 service role、DeepSeek Key、Redis Token 或其他服务端密钥。

## 12. Next.js 与管理后台验证

### 12.1 强制命令

- [ ] P3-NEXT-001 在 `admin/` 执行 `pnpm lint` 并通过，无 error、无未处理 warning。
- [ ] P3-NEXT-002 在 `admin/` 执行 `pnpm build` 并通过，Route Handler、Middleware 和 Server/Client 边界无构建错误。
- [ ] P3-NEXT-003 若项目配置了 `pnpm test`，执行全部单元、集成和契约测试并通过。
- [ ] P3-NEXT-004 使用生产构建启动验收服务，完成关键 API 冒烟，不以仅 dev server 通过代替。

### 12.2 实现与安全

- [ ] P3-NEXT-005 Route Handler 只做协议适配、鉴权入口、校验和调用服务，不承载可复用领域规则。
- [ ] P3-NEXT-006 所有 55 个接口均在运行时补全 `/api/v1`，无重复前缀、无遗漏版本前缀。
- [ ] P3-NEXT-007 管理页面 middleware 不替代 Route Handler 和服务层授权。
- [ ] P3-NEXT-008 Cookie 属性、轮换和清理符合设计；开发环境差异有明确说明。
- [ ] P3-NEXT-009 service role 客户端只能从 server-only 模块导入，客户端 bundle 无敏感环境变量。
- [ ] P3-NEXT-010 输入校验拒绝未知敏感字段，数据库查询使用参数化方式，不拼接用户输入。
- [ ] P3-NEXT-011 CORS/Origin 仅允许受控 Flutter Web 和管理后台来源。
- [ ] P3-NEXT-012 验证码、登录、搜索、AI、导入和管理写入限流生效；429 响应使用稳定业务码。
- [ ] P3-NEXT-013 结构化日志包含 requestId、route、method、status、durationMs、userId、errorCode，且 token、Cookie、密钥、完整 prompt 已脱敏。
- [ ] P3-NEXT-014 错误响应不包含 SQL、堆栈、数据库结构、内部 URL 或第三方原始错误。
- [ ] P3-NEXT-015 管理后台完成登录、刷新、退出、无权限页、用户封禁、题目维护、UGC 审核和院校导入的关键 E2E。

## 13. 数据库、RLS 与迁移验证

- [ ] P3-DB-001 `public.users.role` 仅允许 `user`、`admin`，非法值被数据库约束拒绝。
- [ ] P3-DB-002 用户资料、目标、错题、卡片进度和打卡记录的所有权外键与级联策略符合设计。
- [ ] P3-DB-003 私有表 RLS 仅允许 `auth.uid()` 访问；公共题仅允许已批准记录。
- [ ] P3-DB-004 用户 UGC 仅创建者可写，管理员写入依赖显式授权和审计。
- [ ] P3-DB-005 `admin_audit_logs` 与导入任务仅服务端可访问。
- [ ] P3-DB-006 乐观锁 version、幂等记录和唯一约束在并发测试中生效。
- [ ] P3-DB-007 列表查询使用稳定排序和必要索引，性能测试无明显全表扫描。
- [ ] P3-DB-008 迁移在独立分支演练成功，回滚不破坏旧客户端读取路径。
- [ ] P3-DB-009 Supabase Security/Performance Advisors 与本次相关的告警已处理或记录风险接受理由。
- [ ] P3-DB-010 灰度迁移期间同一业务场景不存在两条写入路径；临时双读有来源标记、观测和回滚条件。

## 14. 性能与可观测性验收

- [ ] P3-PERF-001 普通 API 在受控验收环境 P95 `< 200ms`，慢查询和外部依赖已单独标注。
- [ ] P3-PERF-002 AI 首 token 在受控环境 `< 1s`；未达标时记录网络、上游和 prompt 长度归因。
- [ ] P3-PERF-003 分页接口在最大 pageSize 和较大数据量下不会一次加载全表。
- [ ] P3-PERF-004 SSE 连接取消、超时和上游中断不会泄漏连接或后台任务。
- [ ] P3-OBS-001 每路由 P50/P95/P99、4xx/5xx、RBAC 拒绝、AI TTFT、配额命中和上游错误指标可查询。
- [ ] P3-OBS-002 5xx、403 异常增长和高风险管理操作具备告警规则。
- [ ] P3-OBS-003 结构化日志可按 requestId 串联请求、领域服务和审计记录。

## 15. 命令执行记录

| 编号 | 工作目录 | 命令/测试 | 实际日期 | 退出码 | 结果摘要 | 证据路径 | 状态 |
|---|---|---|---|---|---|---|---|
| CMD-01 | 仓库根目录 | `flutter analyze` | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-02 | 仓库根目录 | `flutter test` | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-03 | `admin/` | `pnpm lint` | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-04 | `admin/` | `pnpm build` | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-05 | `admin/` | `pnpm test`（若存在） | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-06 | 仓库根目录 | `git diff --check` | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-07 | 仓库根目录 | API 契约与权限自动化测试 | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |
| CMD-08 | 仓库根目录 | 多端 E2E/冒烟 | 待执行 | 待填写 | 待填写 | 待填写 | 待执行 |

命令执行要求：

- [ ] P3-CMD-001 命令在工作区真实执行，记录退出码，不能只粘贴计划命令。
- [ ] P3-CMD-002 输出摘要与原始报告均可追溯；失败输出不删除、不篡改。
- [ ] P3-CMD-003 因环境不可用导致的阻塞标记为 `BLOCKED`，不能标记 `PASS`。
- [ ] P3-CMD-004 验收完成后回填测试账号类型、数据版本、构建版本和被测 commit SHA，不记录凭证。

## 16. 缺陷、风险与回滚

### 16.1 缺陷记录

| 缺陷 ID | 严重级别 | 关联用例 | 现象 | 根因 | 修复状态 | 回归证据 |
|---|---|---|---|---|---|---|
| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待执行 | 待填写 |

- [ ] P3-DEF-001 所有 P0/P1 缺陷修复并通过回归后才能发布。
- [ ] P3-DEF-002 P2 缺陷有明确 Owner、风险和临时规避方案。
- [ ] P3-DEF-003 不允许用关闭测试、放宽断言或跳过权限用例来消除失败。

### 16.2 回滚验证

- [ ] P3-ROLLBACK-001 数据库迁移具备可执行回滚或前向修复方案。
- [ ] P3-ROLLBACK-002 Flutter 按模块灰度切换，单个模块可回退且不存在双写。
- [ ] P3-ROLLBACK-003 回滚期间旧客户端读取路径可用，写路径不会造成数据分叉。
- [ ] P3-ROLLBACK-004 回滚触发条件、负责人、观测指标和验证步骤已记录。
- [ ] P3-ROLLBACK-005 新 BFF 验收通过后再更新 `prd-mvp.md`、`tech-stack.md` 和全局架构图。

## 17. P2 到 P3 追踪矩阵

| P2 模块 | 主要 P3 覆盖 |
|---|---|
| P2-0 实施准备 | P3-PRE-001 至 P3-PRE-010 |
| P2-1 API 基础层 | P3-API-001 至 P3-ERROR-010 |
| P2-2 Supabase 客户端 | P3-OWN-013、P3-DB-001 至 P3-DB-010、P3-NEXT-009 |
| P2-3 Auth 与会话 | P3-AUTH-001 至 P3-AUTH-016 |
| P2-4 RBAC、所有权与审计 | P3-RBAC-001 至 P3-AUDIT-005、P3-OWN-001 至 P3-OWN-018 |
| P2-5 数据库、约束与 RLS | P3-DB-001 至 P3-DB-010 |
| P2-6 Flutter 基础 | P3-FLUTTER-001 至 P3-FLUTTER-012 |
| P2-7 Me、Dashboard、Quiz、Mistakes | P3-BIZ-001 至 P3-BIZ-017 |
| P2-8 Schools、Flashcards、Check-ins | P3-BIZ-018 至 P3-BIZ-026 |
| P2-9 AI SSE 与配额 | P3-AI-001 至 P3-AI-010、P3-PERF-004 |
| P2-10 Admin API | P3-RBAC-001 至 P3-AUDIT-005、P3-BIZ-027 至 P3-BIZ-034、P3-NEXT-015 |
| P2-11 契约与回归测试 | P3-CONTRACT、P3-API、P3-CMD |
| P2-12 迁移与文档收口 | P3-DB-010、P3-FLUTTER-010、P3-ROLLBACK-001 至 P3-ROLLBACK-005 |

## 18. 最终验收结论

- [ ] P3-SIGNOFF-001 55 个接口均有实现状态、契约测试和权限测试记录。
- [ ] P3-SIGNOFF-002 普通用户访问所有 `/api/v1/admin/*` 均为 403，且无越权副作用。
- [ ] P3-SIGNOFF-003 跨用户读取或修改错题、目标、闪卡进度、打卡记录和私有题均被拒绝。
- [ ] P3-SIGNOFF-004 管理员降权和用户封禁即时生效，最后管理员保护有效。
- [ ] P3-SIGNOFF-005 普通题目不泄露答案，判题、错题状态机、SM-2、打卡和审核由服务端执行。
- [ ] P3-SIGNOFF-006 `flutter analyze`、`flutter test`、`pnpm lint`、`pnpm build` 均真实通过。
- [ ] P3-SIGNOFF-007 无密钥泄漏，无可利用 SQL/堆栈/内部信息错误响应，审计记录完整。
- [ ] P3-SIGNOFF-008 多端关键流程通过，性能目标满足或有正式风险接受记录。
- [ ] P3-SIGNOFF-009 回滚方案和全局文档收口已完成。
- [ ] P3-SIGNOFF-010 验收人、日期、commit SHA、环境版本和遗留风险已填写。

当前结论：**待执行。P2 实现完成前不得发布或宣称该接口体系已经验证通过。**
