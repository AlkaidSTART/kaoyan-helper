# 变更文件清单：管理端只读化与用户活动收集

> 日期：2026-09-26
> 说明：本任务执行期间仓库存在并行会话（flutter-user-api-integration 等），其提交（445e2e1 / 752e2fc / 280eddb / 47e3850）将本任务的阶段性改动与并行任务改动混合入库。本清单只登记**本任务**的文件；最终状态以工作区为准（其中 4 个文件截至本清单落盘时仍未提交，见 §3）。

## 1. 新增

| 文件 | 说明 |
|---|---|
| `docs/p0-definition/admin-readonly-activity/definition.md` | P0 需求定义 |
| `docs/p1-design/admin-readonly-activity/design.md` | P1 设计（ADR-1~5） |
| `docs/p2-development/admin-readonly-activity/development.md` | P2 开发记录与 ADR |
| `docs/p3-verification/admin-readonly-activity/verification.md` | P3 验证单 |
| `docs/tasks/2026-09-26-admin-readonly-activity/plan.md` | 任务计划 |
| `docs/tasks/2026-09-26-admin-readonly-activity/changed-files.md` | 本清单 |
| `admin/lib/services/activity/activity-recorder.ts` | 活动采集契约（类型 + 接口） |
| `admin/lib/services/activity/prisma-activity-recorder.ts` | Prisma 实现（best-effort 自吞异常） |
| `admin/lib/services/activity/__tests__/activity-recording.test.ts` | 埋点挂点 + 采集容错 + 活动查询服务测试 |
| `admin/lib/services/admin/admin-activity-service.ts` | 活动查询服务（ADMIN-ACT-01） |
| `admin/lib/services/admin/prisma-admin-activity-repository.ts` | 活动查询仓储 |
| `admin/app/api/v1/admin/activities/route.ts` | `GET /admin/activities` 路由 |
| `admin/app/(admin)/activities/page.tsx` | 管理端"用户活动"页（真实数据，只读） |
| `supabase/migrations/20260926150000_user_activities.sql` | `user_activities` 建表基线 SQL（含 RLS 收权） |

## 2. 修改

| 文件 | 说明 |
|---|---|
| `admin/prisma/schema.prisma` | 新增 `UserActivity` 模型 + User 关系 |
| `admin/lib/auth/permissions.ts` | 删 4 个写权限点，新增 `admin:activity:read` |
| `admin/lib/auth/user-session-service.ts` | 登录锚点埋点（可选 recorder） |
| `admin/lib/auth/email-code-auth-service.ts` | 透传 recorder 至 UserSessionService |
| `admin/lib/services/quiz/quiz-service.ts` | 答题埋点（可选 recorder） |
| `admin/lib/services/flashcards/flashcard-service.ts` | 复习埋点（可选 recorder） |
| `admin/lib/services/admin/admin-user-service.ts` | 移除 ban/unban，收敛只读 |
| `admin/lib/services/admin/admin-question-service.ts` | 移除创建/更新/软删/审核，收敛只读 |
| `admin/lib/services/admin/admin-school-service.ts` | 移除院校/专业维护与导入，收敛只读 |
| `admin/lib/services/admin/prisma-admin-user-repository.ts` | 移除 `setUserBanned` / `countActiveAdmins` |
| `admin/lib/services/admin/prisma-admin-question-repository.ts` | 移除 4 个写方法 |
| `admin/lib/services/admin/prisma-admin-school-repository.ts` | 移除写与导入方法 |
| `admin/app/api/v1/admin/questions/route.ts` | 移除 POST |
| `admin/app/api/v1/admin/questions/[id]/route.ts` | 移除 PATCH/DELETE |
| `admin/app/api/v1/admin/schools/route.ts` | 移除 POST |
| `admin/app/api/v1/admin/schools/[id]/programs/route.ts` | 移除 POST |
| `admin/app/api/v1/questions/[id]/answer/route.ts` | 注入 PrismaActivityRecorder |
| `admin/app/api/v1/flashcards/[id]/review/route.ts` | 注入 PrismaActivityRecorder |
| `admin/app/api/v1/auth/login/code/route.ts` | 注入 PrismaActivityRecorder |
| `admin/components/admin/app-sidebar.tsx` | 导航更名 + 新增"用户活动" |
| `admin/app/(admin)/ugc/page.tsx` | 移除通过/驳回操作列与按钮，改只读口径 |
| `admin/app/(admin)/schools/page.tsx` | 移除批量导入按钮，改只读口径 |
| `admin/lib/services/admin/__tests__/admin-user-service.test.ts` | 封禁用例 → 只读查询用例 |
| `admin/proxy.ts` | 受保护前缀补充 `/activities` |
| `docs/p1-design/next-backend-api-rbac/api-contract.md` | §2 计数、§11 只读化重写 + ADMIN-ACT-01、§12 退役错误码标注 |

## 3. 删除

| 文件 | 说明 |
|---|---|
| `admin/app/api/v1/admin/users/[id]/ban/route.ts`、`unban/route.ts` | 封禁/解封 |
| `admin/app/api/v1/admin/ugc/[id]/approve/route.ts`、`reject/route.ts` | UGC 审核 |
| `admin/app/api/v1/admin/schools/[id]/route.ts`、`schools/[id]/programs/[programId]/route.ts` | 院校/专业变更 |
| `admin/app/api/v1/admin/schools/import/route.ts`、`import/[jobId]/confirm/route.ts` | 两阶段导入 |
| `admin/lib/services/admin/import-parser.ts` | 导入解析器 |
| `admin/lib/services/admin/__tests__/import-parser.test.ts`、`admin-ugc-import.test.ts` | 对应测试（只读用例迁至新建 `admin-school-service` 相关用例与既有文件） |
| `admin/app/(admin)/ugc/review-actions.tsx` | 审核操作按钮组件 |

> 注：`admin-ugc-import.test.ts` 中「管理端专业列表（ADMIN-SCH-08）」只读用例随只读服务保留路径由并行提交处理；本任务在 `admin-user-service.test.ts` 与 `activity-recording.test.ts` 中重建了等价的只读覆盖。

## 4. 未提交（截至清单落盘，位于工作区）

- `admin/lib/services/activity/prisma-activity-recorder.ts`（summary JSON 序列化类型修复）
- `admin/lib/services/admin/__tests__/admin-user-service.test.ts`（`list()` 分页参数修复）
- `admin/proxy.ts`（`/activities` 守卫）
- `docs/p1-design/next-backend-api-rbac/api-contract.md`（契约重写）
- 本任务 P0/P1/P2/P3/tasks 文档目录
