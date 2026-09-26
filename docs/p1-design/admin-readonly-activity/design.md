# P1 - 管理端只读化与用户活动收集设计

> 日期：2026-09-26
> 上游需求：`docs/p0-definition/admin-readonly-activity/definition.md`
> 接口契约：`docs/p1-design/next-backend-api-rbac/api-contract.md` §11（ADMIN-ACT-01 新增；ADMIN-USER-03/04、ADMIN-Q-03~05、ADMIN-UGC-02/03、ADMIN-SCH-02~07 删除）

## 1. 架构与分层

沿用既有单向分层，不引入新依赖：

```
app/api/v1/admin/activities/route.ts              # 新增（GET）
lib/services/admin/admin-activity-service.ts       # 新增
lib/services/admin/prisma-admin-activity-repository.ts
lib/services/activity/activity-recorder.ts         # 新增（埋点契约 + 类型）
lib/services/activity/prisma-activity-recorder.ts  # 新增（旁路落库）
lib/services/quiz/quiz-service.ts                  # 挂点：submitAnswer
lib/services/flashcards/flashcard-service.ts       # 挂点：review
lib/auth/user-session-service.ts                   # 挂点：createSessionPair
app/(admin)/activities/page.tsx                    # 新增（管理端 UI）
```

## 2. 关键技术决策（ADR）

### ADR-1 管理端写能力整体下线（删减）

- 删除 12 个变更接口路由：`users/[id]/ban`、`users/[id]/unban`、`ugc/[id]/approve`、`ugc/[id]/reject`、`schools/import`、`schools/import/[jobId]/confirm`、`schools/[id]`（PATCH）、`schools/[id]/programs/[programId]`（PATCH）；`questions`、`questions/[id]`、`schools`、`schools/[id]/programs` 收敛为仅 GET。
- 服务层同步删减：`AdminUserService` 移除 ban/unban（及仓储 `setUserBanned`、`countActiveAdmins`）；`AdminQuestionService` 移除 create/update/remove/approve/reject；`AdminSchoolService` 移除 create/update/upsertProgram/updateProgram/import/confirmImport；对应 Prisma 仓储写方法一并移除；`import-parser.ts` 及其测试删除。
- 权限点删除 `admin:users:ban`、`admin:questions:write`、`admin:ugc:review`、`admin:schools:write`，新增 `admin:activity:read`。
- Prisma 模型一律保留（无破坏性迁移）；恢复路径 = git 历史。

### ADR-2 用户活动 = 服务端旁路事件表（`user_activities`）

- 不做"读取时 UNION 四张业务表"的方案：异构源分页语义模糊（总数/游标均需跨表折算），且"收集"应为系统的一等能力而非查询期拼装。
- 事件在**既有服务端写路径成功之后**落一条记录，客户端零改动，Flutter 接入真实网络层后自动生效：

| 挂点 | type | summary |
|---|---|---|
| `UserSessionService.createSessionPair`（登录成功） | `login` | `{clientType, deviceName}` |
| `QuizService.submitAnswer` | `question_attempt` | `{questionId, isCorrect}` |
| `FlashcardService.review` | `card_review` | `{cardId, rating}` |

- summary 只存最少必要字段（id/布尔/枚举），不存题干、答案等正文，规避隐私与体积问题。

### ADR-3 采集失败不影响主流程（best-effort）

- `PrismaActivityRecorder.record()` 内部 try/catch，失败仅经 `lib/api/logger` 记录，绝不向调用方抛错——活动收集是观测旁路，不能让埋点故障阻断答题/登录。
- 挂点服务以**可选依赖**注入 `ActivityRecorder?`（默认不传 = 不记录）：答题/复习/登录三类服务各存在只读构造点（列表、详情、AI 讲解复用 `QuizService`），强制注入会波及无辜构造点；可选项把"谁记录"显式留在写路由的装配处。

### ADR-4 活动查询接口（ADMIN-ACT-01，`GET /admin/activities`）

- 权限 `admin:activity:read`；筛选 `userId?`（UUID，非法 422）、`type?`（三值白名单，非法 422）；固定 `createdAt desc` + 标准分页（`parsePagination`），与审计日志查询同构。
- 响应行：`{id, type, summary, occurredAt, user:{id,email,nickname}}`；`summary` 原样透出不二次加工。
- 不做时间范围筛选、不做导出、不做聚合同类事件（活动流以原始事件为主场景）。

### ADR-5 管理端 UI 定位为"观察台"

- 新增 `/activities` 页：服务端组件直接调 `AdminActivityService`（同进程读取，不经自fetch），actor 由 `AuthService.getSession(cookie)` 构建（与 `(admin)/layout.tsx` 同源）；类型筛选与翻页用 URL searchParams 驱动，纯服务端渲染、无客户端状态。
- 移除 UGC 页"通过/驳回"按钮（含 `review-actions.tsx`）与"操作"列、院校页"批量导入"按钮；两处脚注改为只读口径说明。
- 侧边栏导航更名去"管理"暗示：`用户管理→用户`、`题库管理→题库`、`UGC 审核→UGC 内容`，新增`用户活动`。

## 3. 数据模型（`user_activities`）

```prisma
model UserActivity {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  type      String
  summary   Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([type, createdAt(sort: Desc)])
  @@map("user_activities")
}
```

同步新增 `supabase/migrations/20260926150000_user_activities.sql`（与 `user_sessions.sql` 同款基线文件，含 RLS 收权，不自动应用）。

## 4. 验证口径

- 服务层：fake 仓储 + fake recorder，覆盖筛选透传、DTO 映射、非法参数 422、非管理员 403、埋点失败不影响主流程、写路径成功后记录事件。
- 路由层：`/activities` 401/403/422/200 冒烟（沿用 `auth/__tests__/routes.test.ts` 模式可后补）。
- 全量 `pnpm lint` / `pnpm test` / `pnpm build`。
