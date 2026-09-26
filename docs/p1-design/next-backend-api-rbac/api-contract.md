# P1 - Next.js API 接口契约

> 版本：v1.0  
> 日期：2026-09-26  
> 状态：待实现  
> 总设计：`docs/p1-design/next-backend-api-rbac/design.md`

## 1. 使用说明

- 所有路径均省略固定前缀 `/api/v1`。
- `Auth=公开` 表示无需登录；`Auth=登录` 表示需要有效身份；`Auth=管理员` 表示需要 `admin` 角色。
- `Permission` 是路由层必须检查的权限点。
- “所有权/范围”是领域服务必须复核的资源边界。
- 列表接口默认 `page=1&pageSize=20`，最大 `pageSize=100`。
- 写接口若支持 `Idempotency-Key`，必须在同一幂等窗口内返回首次结果，不得重复执行业务副作用。
- 成功和错误响应统一使用总设计中的 envelope；下方只列 `data` 的主体字段。
- 普通题目、错题详情、闪卡题面等接口不得泄漏标准答案，除非接口明确允许。

## 2. 接口总览

| 模块 | 接口数 | 路径前缀 |
|---|---:|---|
| Auth | 7 | `/auth/*` |
| Me | 4 | `/me/*` |
| Dashboard | 1 | `/dashboard/*` |
| Quiz | 6 | `/questions/*` |
| Mistakes | 5 | `/mistakes/*` |
| Schools | 5 | `/schools/*` |
| Flashcards | 5 | `/flashcards/*`、`/check-ins` |
| AI | 2 | `/ai/*` |
| Admin | 11 | `/admin/*` |
| **合计** | **46** | `/api/v1` |

## 3. Auth

### 3.1 接口表

| ID | Method / Path | Auth / Permission | Request | Response `data` | 错误与边界 |
|---|---|---|---|---|---|
| AUTH-01 | `POST /auth/send-code` | 公开 | `{email, purpose:"login"}` | `{expiresInSeconds, retryAfterSeconds}` | `RATE_LIMITED`、`VALIDATION_FAILED`；邮箱做规范化与小写化 |
| AUTH-02 | `POST /auth/login/code` | 公开 | `{email, code, clientType:"flutter"\|"admin-web", deviceName?}` | Flutter：`{accessToken, refreshToken, expiresIn, tokenType, user, permissions}`；Admin：`{user}` + Set-Cookie | `EMAIL_CODE_INVALID`、`EMAIL_CODE_EXPIRED`、`ADMIN_REQUIRED`、`USER_BANNED` |
| AUTH-03 | `POST /auth/login/password` | 公开 | `{email, password, clientType, deviceName?}` | Admin：`{user}` + Set-Cookie；Flutter 密码登录未开放 | `AUTH_INVALID_CREDENTIALS`、`ADMIN_REQUIRED`、`USER_BANNED`；Admin 凭据来自 Prisma `admin_credentials`（bcrypt），不启用 Supabase Password Provider；非 `admin-web` 客户端返回 422 `PROVIDER_UNSUPPORTED` |
| AUTH-04 | `POST /auth/oauth/:provider` | 公开 | `{redirectUri, clientType}` | `{authorizationUrl, state, expiresAt}` | `PROVIDER_UNSUPPORTED`、`OAUTH_STATE_INVALID`；MVP 为扩展项，不阻塞邮箱验证码 |
| AUTH-05 | `POST /auth/refresh` | 公开/凭证 | Flutter：`{refreshToken}`；Admin：HttpOnly `admin_session` Cookie | Flutter：新 token 对；Admin：`{expiresIn}` + 轮换 Cookie | `REFRESH_INVALID`、`TOKEN_EXPIRED`、`USER_BANNED`；Admin 在 Prisma 事务内撤销旧 `admin_sessions` 行并写入新行 |
| AUTH-06 | `POST /auth/logout` | 登录 | Flutter 可选 `{refreshToken}`；Admin 无 body | `null` | 始终清理服务端会话；Admin 撤销 Prisma `admin_sessions` 行并清 `admin_session` Cookie；重复退出保持幂等 |
| AUTH-07 | `GET /auth/session` | 登录 | 无 | `{user, permissions, expiresAt}` | `TOKEN_EXPIRED`、`AUTH_REQUIRED`、`USER_BANNED`；Admin 从 Prisma `admin_sessions` 读取并刷新 `last_seen_at` |

### 3.2 认证响应用户对象

```json
{
  "id": "0e95e8a3-...",
  "email": "user@example.com",
  "nickname": "登科同学",
  "avatarUrl": null,
  "role": "user",
  "isBanned": false,
  "examYear": 2027,
  "createdAt": "2026-09-26T10:00:00Z",
  "updatedAt": "2026-09-26T10:00:00Z"
}
```

`role` 与 `permissions` 可以用于客户端 UI 控制，但每次受保护请求仍由服务端重新判定。

### 3.3 Cookie 约定

- Admin Web：单一 `admin_session` Cookie（HttpOnly，服务端 Prisma 会话）。
- Flutter：不使用 Cookie，改由 `Authorization: Bearer <token>` 携带 access token。
- 属性：`HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`；生产环境追加 `Secure`，开发环境不强制。
- Cookie 只保存随机 token 本身，数据库仅存其 SHA-256 摘要，浏览器端不提供读取接口。
- refresh 成功必须轮换并写回 `admin_session`；退出使用 `Max-Age=0` 清除该 Cookie。

### 3.4 OAuth 扩展流程

MVP 先保证邮箱验证码登录。OAuth 若在本期后续启用，采用一次性 handoff code：

1. `POST /auth/oauth/:provider` 返回第三方授权 URL 和 state。
2. 第三方回调 Next.js 内部 callback 路由。
3. 服务端校验 state、换 session、读取用户角色。
4. 生成短时、一次性 handoff code，重定向回 `redirectUri`。
5. Flutter 使用 handoff code 换取正式 access/refresh token；交换后立即失效。
6. state 与 handoff code 均只保存哈希和短 TTL，禁止复用。

## 4. Me

| ID | Method / Path | Auth / Permission | Request | Response `data` | 所有权/错误 |
|---|---|---|---|---|---|
| ME-01 | `GET /me` | 登录 / `user:self:read` | 无 | 用户对象 + `targets` 摘要 | 仅 `auth.uid()`；不返回内部审计字段 |
| ME-02 | `PATCH /me` | 登录 / `user:self:update` | `{nickname?, avatarUrl?, examYear?}` | 更新后的用户对象 | `role`、`isBanned`、`email` 不可改；`IMMUTABLE_FIELD`、`VALIDATION_FAILED` |
| ME-03 | `GET /me/targets` | 登录 / `user:target:read` | 无 | `{targets:[target]}` | 仅本人；返回院校快照，不信任客户端缓存的校名 |
| ME-04 | `PATCH /me/targets` | 登录 / `user:target:write` | `{targets:[{schoolId, type:"primary"\|"backup", majorCode?, majorName?}]}` | 更新后目标列表 | 最多 3 条且仅 1 条 primary；`TARGET_LIMIT_EXCEEDED`、`TARGET_PRIMARY_CONFLICT`、`NOT_FOUND` |

目标对象示例：

```json
{
  "schoolId": "e1aa8f66-...",
  "schoolName": "示例大学",
  "type": "primary",
  "majorCode": "085400",
  "majorName": "电子信息",
  "updatedAt": "2026-09-26T10:00:00Z"
}
```

目标院校统一存储在规范化的 `public.user_targets` 表，并通过 `school_id` 关联院校主数据；服务端返回院校名称等快照字段，不信任客户端缓存的校名。`PATCH /me/targets` 采用事务内整体替换，以保证最多 3 条、仅 1 条主目标且重复目标不会产生部分写入。

## 5. Dashboard

| ID | Method / Path | Auth / Permission | Request | Response `data` | 所有权/错误 |
|---|---|---|---|---|---|
| DASH-01 | `GET /dashboard/summary` | 登录 / `dashboard:self:read` | `timezone?` | `{daysUntilExam, todayQuestionCount, activeMistakeCount, dueCardCount, streakDays, totalReviewedCards, primaryTarget}` | 只聚合本人数据；时区默认 `Asia/Shanghai`，非法时区 `VALIDATION_FAILED` |

服务端聚合，不向 Flutter 下发全量错题、卡片或打卡记录后让客户端计算。

## 6. Quiz

### 6.1 接口表

| ID | Method / Path | Auth / Permission | Request | Response `data` | 所有权/错误 |
|---|---|---|---|---|---|
| QUIZ-01 | `GET /questions` | 登录 / `quiz:read` | `subject?, chapter?, year?, type?, difficulty?, scope:"public"\|"mine", search?, page?, pageSize?` | 分页题目摘要，不含 `answer`/`explanation` | `public` 仅官方已批准题；`mine` 仅 `creator_id=auth.uid()` |
| QUIZ-02 | `GET /questions/:id` | 登录 / `quiz:read` | 路径 `id` | 题目详情，不含答案与解析 | 官方已批准题或本人题；不可见返回 404 |
| QUIZ-03 | `POST /questions/:id/answer` | 登录 / `quiz:submit` | `{answer:"B", attemptId}` | `{isCorrect, correctAnswer, explanation, mistake, answeredAt}` | 服务端判题；错题记录仅本人；幂等键防重复副作用 |
| QUIZ-04 | `POST /questions` | 登录 / `quiz:create` | `{subject, chapter?, year?, type, stem, options, answer, explanation?, difficulty?, visibility:"private"\|"public"}` | 创建的题目（创建者可看答案与审核状态） | `creatorId` 服务端赋值；public 进入 pending |
| QUIZ-05 | `PATCH /questions/:id` | 登录 / `quiz:update:own` | 允许编辑的题目字段 + `version` | 更新后题目 | 仅本人；发布中的公共题编辑后回到 pending；并发冲突 409 |
| QUIZ-06 | `DELETE /questions/:id` | 登录 / `quiz:delete:own` | `{version}` | `null` | 仅本人；软删除；已用于他人错题时仍保留历史引用 |

### 6.2 普通题目 DTO

```json
{
  "id": "2e9e7a13-...",
  "subject": "politics",
  "chapter": "马克思主义基本原理",
  "year": 2024,
  "type": "single_choice",
  "stem": "唯物辩证法的实质和核心是（ ）",
  "options": [
    {"key": "A", "content": "质量互变规律"},
    {"key": "B", "content": "对立统一规律"}
  ],
  "difficulty": "medium",
  "source": "official",
  "isPublic": true,
  "isApproved": true,
  "isMine": false,
  "createdAt": "2026-09-20T08:00:00Z"
}
```

### 6.3 判题规则

- 单选题：规范化用户答案后必须恰好为一个选项 key。
- 多选题：选项按字母排序比较，全部正确且无多余选项才算正确。
- `attemptId` 由 Flutter 为一次提交生成 UUID；同一用户 + 同一 `attemptId` 重复提交必须返回第一次结果。
- 答错后在同一数据库事务中 upsert `mistake_records`：首次 `error_count=1`，再次错误 `error_count++` 且 `consecutive_correct=0`。
- 普通题答对不应创建错题记录；若历史错题通过刷题答对，仍应在重做接口或统一判题服务中更新连对状态。
- 不允许 Flutter 提交 `isCorrect`、`errorCount`、`status` 等结果字段。

### 6.4 UGC 复核状态

现有 `is_public + is_approved` 无法区分“待审核”和“已驳回”。建议增加：

- `review_status`: `pending | approved | rejected`
- `reviewed_by`: 管理员 ID，可为空
- `reviewed_at`: 审核时间，可为空
- `review_note`: 驳回原因或审核备注，可为空

迁移期可继续用 `is_approved` 兼容查询，但新接口必须返回明确 `reviewStatus`。

## 7. Mistakes

| ID | Method / Path | Auth / Permission | Request | Response `data` | 所有权/错误 |
|---|---|---|---|---|---|
| MIS-01 | `GET /mistakes` | 登录 / `mistake:read:own` | `status?, subject?, page?, pageSize?` | 分页错题 + 题目摘要 | 仅 `user_id=auth.uid()` |
| MIS-02 | `GET /mistakes/:id` | 登录 / `mistake:read:own` | 路径 `id` | 错题详情 + 题目、解析、状态 | 仅本人；不是本人时 404 |
| MIS-03 | `POST /mistakes/:id/redo` | 登录 / `mistake:write:own` | `{answer, attemptId}` | `{isCorrect, correctAnswer, explanation, mistake, mastered}` | 服务端判题并更新连对状态；仅本人 |
| MIS-04 | `PATCH /mistakes/:id/status` | 登录 / `mistake:write:own` | `{status:"active", version}` | 更新后的错题 | 仅允许 `mastered -> active`，同时清零连对和掌握时间；仅本人 |
| MIS-05 | `DELETE /mistakes/:id` | 登录 / `mistake:write:own` | `{version}` | `null` | 仅本人；删除不删除题库题目 |

错题状态机：

| 当前状态 | 事件 | 目标状态 | 字段变更 |
|---|---|---|---|
| 不存在 | 首次答错 | `active` | `error_count=1, consecutive_correct=0` |
| `active` | 再次答错 | `active` | `error_count++, consecutive_correct=0` |
| `active` | 重做答对 | `active` | `consecutive_correct++` |
| `active` | 连对达到 2 | `mastered` | `status=mastered, mastered_at=now()` |
| `mastered` | 用户重新激活 | `active` | `consecutive_correct=0, mastered_at=null` |

## 8. Schools

| ID | Method / Path | Auth / Permission | Request | Response `data` | 所有权/错误 |
|---|---|---|---|---|---|
| SCH-01 | `GET /schools` | 登录 / `school:read` | `keyword?, province?, region?, is985?, is211?, isDoubleFirstClass?, isSelfMarking?, majorCode?, page?, pageSize?` | 分页院校摘要 | 仅已发布数据；组合条件 AND |
| SCH-02 | `GET /schools/:id` | 登录 / `school:read` | 路径 `id` | 院校详情 + 可用专业摘要 | 不存在或下架返回 404 |
| SCH-03 | `GET /schools/:id/programs` | 登录 / `school:read` | `majorCode?, yearFrom?, yearTo?, page?, pageSize?` | 分页专业历年数据 | 只读；按 `year DESC` 稳定排序 |
| SCH-04 | `POST /schools/:id/target` | 登录 / `user:target:write` | `{type:"primary"\|"backup", majorCode?, majorName?}` | 更新后的目标列表 | 仅本人；最多 3 条且主目标唯一；重复加目标幂等返回现有条目 |
| SCH-05 | `DELETE /schools/:id/target` | 登录 / `user:target:write` | `type`, `majorCode?` | 更新后的目标列表 | 仅本人；不存在目标时保持幂等 |

说明：原草案中的 `POST /school-data/upload` 与确认接口属于管理端导入能力，统一收敛到 `ADMIN-SCH-06/07`，避免无 `/admin` 前缀的高权限写接口被误开放。

## 9. Flashcards 与打卡

| ID | Method / Path | Auth / Permission | Request | Response `data` | 所有权/错误 |
|---|---|---|---|---|---|
| FC-01 | `GET /flashcards/due` | 登录 / `flashcard:read` | `limit?`（1~50，默认 20） | `{items, dueRemaining, serverTime}` | 仅系统卡和本人 UGC 卡；进度仅本人 |
| FC-02 | `GET /flashcards` | 登录 / `flashcard:read` | `category?, source?, search?, page?, pageSize?` | 分页卡片 | 系统卡或本人 UGC 卡 |
| FC-03 | `POST /flashcards` | 登录 / `flashcard:write:own` | `{category, front, back, tags?}` | 创建的卡片 | `source`、`creatorId` 服务端赋值；仅本人可见 |
| FC-04 | `POST /flashcards/:id/review` | 登录 / `flashcard:review:own` | `{rating:"forgot"\|"fuzzy"\|"remembered", idempotencyKey}` | `{progress, dueRemaining, checkIn?}` | 卡片可访问、进度仅本人；事务内计算 SM-2 |
| FC-05 | `GET /check-ins` | 登录 / `flashcard:read` | `from?, to?, page?, pageSize?` | 分页打卡记录 + `streakDays` | 仅 `user_id=auth.uid()` |

SM-2 计算完全由服务端执行：

- `forgot`：`interval=0`，`repetitions=0`，`ease_factor=max(1.3, ef-0.2)`。
- `fuzzy`：`interval=1`，`repetitions=0`，`ease_factor=max(1.3, ef-0.1)`。
- `remembered`：首次 1 天；第二次 3 天；之后 `round(prevInterval * easeFactor)`，`repetitions++`，`ease_factor+=0.1`。
- 同一 `idempotencyKey` 重复调用必须返回第一次计算结果。
- 完成当日所有到期卡片后，在同一事务中 upsert `check_in_records`；每日唯一。

## 10. AI

| ID | Method / Path | Auth / Permission | Request | Response | 错误与边界 |
|---|---|---|---|---|---|
| AI-01 | `POST /ai/chat` | 登录 / `ai:chat` | `{subject, conversationId?, messages, context?}`；`Accept: text/event-stream` | SSE：`meta`/`delta`/`done`/`error` | 30 次/用户/自然日；`DAILY_LIMIT_EXCEEDED`、`RATE_LIMITED`、`DEPENDENCY_UNAVAILABLE` |
| AI-02 | `POST /ai/explain` | 登录 / `ai:chat` | `{questionId, userAnswer, focus?}` | `{requestId, content, usage}` | 非流式短回答；不信任客户端答案字段；超时返回 503 |

SSE 细节、事件格式和超时遵循总设计第 9 节。AI 接口必须先校验用户未封禁、配额未耗尽，再连接 DeepSeek；上游中断要发出 `error` 事件并释放连接。

## 11. Admin

> 2026-09-26 产品定位收窄：管理端为**只读观察台**，不执行任何操作（见 `docs/p0-definition/admin-readonly-activity/definition.md`）。
> 原 ADMIN-USER-03/04（封禁）、ADMIN-Q-03~05（题目增删改）、ADMIN-UGC-02/03（审核）、ADMIN-SCH-02~07（院校/专业维护与导入）已下线；`admin:*` 写权限点同步移除。Prisma 模型保留，回滚走 git 历史。

### 11.1 管理接口总表

| ID | Method / Path | Auth / Permission | Request | Response `data` | 审计与边界 |
|---|---|---|---|---|---|
| ADMIN-DASH-01 | `GET /admin/dashboard` | 管理员 / `admin:dashboard:read` | `from?, to?, timezone?` | `{dau, wau, questionAnswers, aiCalls, aiCostEstimate, topMistakes, totalUsers, pendingUgcCount}` | 聚合数据；禁止返回用户隐私明文；`pendingUgcCount` 与 UGC 队列默认口径一致 |
| ADMIN-USER-01 | `GET /admin/users` | 管理员 / `admin:users:read` | `keyword?, role?, isBanned?, page?, pageSize?` | 分页用户摘要 | 搜索邮箱/昵称；结果脱敏策略可配置 |
| ADMIN-USER-02 | `GET /admin/users/:id` | 管理员 / `admin:users:read` | 路径 `id` | 用户详情 + 学习统计 | 不返回 Auth 内部 secret |
| ADMIN-Q-01 | `GET /admin/questions` | 管理员 / `admin:questions:read` | `subject?, source?, reviewStatus?, isApproved?, includeDeleted?, search?, page?, pageSize?` | 分页题目（含答案） | 管理端可读答案；列表必须分页 |
| ADMIN-Q-02 | `GET /admin/questions/:id` | 管理员 / `admin:questions:read` | 路径 `id` | 完整题目 | 含审核字段 |
| ADMIN-UGC-01 | `GET /admin/ugc` | 管理员 / `admin:ugc:read` | `reviewStatus?, source?, page?, pageSize?` | 分页 UGC 队列 | 默认待审核；包含提交者摘要 |
| ADMIN-SCH-01 | `GET /admin/schools` | 管理员 / `admin:schools:read` | `keyword?, province?, region?, page?, pageSize?` | 分页院校 | 可包含未发布数据 |
| ADMIN-SCH-08 | `GET /admin/schools/:id/programs` | 管理员 / `admin:schools:read` | 路径 `id`；`year?` | 专业完整列表（不分页） | 含未发布与导入数据；院校不存在 404 |
| ADMIN-STAT-01 | `GET /admin/stats/users` | 管理员 / `admin:dashboard:read` | `from?, to?, timezone?` | `{totalUsers, newUsers, prevNewUsers}` | 注册统计；口径与看板同构（UTC 日界、默认近 7 天、≤90 天）；`prevNewUsers` 为紧邻等长前一窗口，供环比计算 |
| ADMIN-AUDIT-01 | `GET /admin/audit-logs` | 管理员 / `admin:audit:read` | `action?, resourceType?, actorId?, page?, pageSize?` | 分页审计日志（含 actor 摘要） | 固定 `createdAt desc`；`metadata` 为写入侧脱敏摘要，原样透出 |
| ADMIN-ACT-01 | `GET /admin/activities` | 管理员 / `admin:activity:read` | `userId?, type?("login"|"question_attempt"|"card_review"), page?, pageSize?` | 分页活动事件（含用户摘要） | 固定 `createdAt desc`；`summary` 原样透出；事件由服务端在登录 / 答题 / 卡片复习写路径成功后旁路落库（best-effort，采集失败不影响主流程） |

### 11.2 管理接口额外约束

- 所有管理接口必须经过 `requirePermission`，并在服务层再次确认管理员身份。
- 管理端不提供任何变更接口：`/api/v1/admin/**` 仅允许 GET。
- `GET /admin/questions` 和详情可返回答案，普通 `GET /questions` 永远不返回答案。
- 用户活动埋点必须以旁路方式实现：`ActivityRecorder` 实现自吞异常，答题 / 复习 / 登录主流程不因采集失败受影响。
- 用户活动 `summary` 只存最少必要字段（id/布尔/枚举），禁止存放题干、答案等正文。

## 12. 通用错误码补充

除总设计中的通用错误码外，领域接口使用以下稳定业务码：

| 业务码 | 典型 HTTP | 触发场景 |
|---|---:|---|
| `EMAIL_CODE_INVALID` | 401/422 | 邮箱验证码错误 |
| `EMAIL_CODE_EXPIRED` | 401/422 | 邮箱验证码过期 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 密码错误或密码登录未启用 |
| `PROVIDER_UNSUPPORTED` | 422 | OAuth 提供方不支持 |
| `OAUTH_STATE_INVALID` | 401/422 | OAuth state 无效或过期 |
| `IMMUTABLE_FIELD` | 422 | 尝试修改角色、封禁状态等只读字段 |
| `TARGET_LIMIT_EXCEEDED` | 422 | 目标院校超过 3 条 |
| `TARGET_PRIMARY_CONFLICT` | 409 | 多条主目标或重复目标 |
| `ANSWER_INVALID` | 422 | 答案不属于题目选项或格式错误 |
| `ATTEMPT_CONFLICT` | 409 | attemptId 重复且提交内容不一致 |
| `QUESTION_NOT_ACCESSIBLE` | 404 | 题目不存在、未批准或不属于本人 |
| `MISTAKE_NOT_FOUND` | 404 | 错题不存在或不属于本人 |
| `CARD_NOT_DUE` | 409 | 卡片未到复习时间且接口要求到期 |
| `DAILY_LIMIT_EXCEEDED` | 429 | AI 每日配额耗尽 |

> 已退役业务码（2026-09-26 管理端只读化）：`UGC_ALREADY_REVIEWED`、`IMPORT_VALIDATION_FAILED`、`IMPORT_JOB_EXPIRED`、`LAST_ADMIN_PROTECTED` 的触发场景随管理端写接口下线而移除，常量保留在 `lib/api/errors.ts` 以维持错误码注册表稳定。

## 13. 接口实现验收最低要求

每个实现完成的 Route Handler 必须至少具备：

- 输入 Schema 校验。
- 认证或公开标记。
- 路由级权限检查。
- 服务层所有权/范围复核。
- 统一响应 envelope。
- 稳定业务错误码。
- 请求 ID 与审计上下文。
- 列表分页上限。
- 写操作幂等或乐观锁策略。
- 契约测试、401/403 测试和跨用户隔离测试。
