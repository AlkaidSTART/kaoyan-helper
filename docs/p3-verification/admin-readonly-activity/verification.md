# P3 - 管理端只读化与用户活动收集验证单

> 日期：2026-09-26
> 环境：macOS arm64 / Next.js 16.3.5 / Prisma 7.10.0 / vitest 5

## 1. 静态检查与测试

| 项 | 命令 | 结果 |
|---|---|---|
| Lint | `pnpm lint` | ✅ 0 error / 0 warning |
| 单测 | `pnpm test` | ✅ 27 个文件 / 190 个用例全部通过 |
| 构建 | `pnpm build` | ✅ 编译 + TypeScript 检查通过 |

## 2. 只读性验证

- `app/api/v1/admin/**` 全部 11 个路由文件仅导出 `GET` 处理器（脚本核对，无 POST/PATCH/DELETE/PUT）。
- `ADMIN_PERMISSIONS` 仅含 7 个读权限点（含新增 `admin:activity:read`），无写权限点。
- 管理端 UI：UGC 页无"通过/驳回"按钮、院校页无"批量导入"按钮（对应组件 `review-actions.tsx` 已删除）。

## 3. 新增能力验证

- `GET /api/v1/admin/activities`：经 `getActor` + `requirePermission("admin:activity:read")` + 服务层 `assertAdminActor` 三重校验；`userId` 非法 UUID / `type` 非白名单返回 422（路由层逻辑，同审计日志口径）。
- 埋点单测覆盖：答题判题成功后记录 `question_attempt`；复习成功后记录 `card_review`；会话建立后记录 `login`（含 clientType/deviceName）；未注入 recorder 主流程照常；`PrismaActivityRecorder` 采集失败自吞异常不抛出。
- `AdminActivityService`：DTO 映射（`createdAt` → UTC ISO）、筛选透传、非管理员 403。
- 数据库：`prisma db push` 已尝试应用 `user_activities`（增量建表 + 3 索引 + RLS 收权），但本机到数据库的连接长时间挂起未完成（与 2026-09-26「登录503诊断」记录的连通性问题一致）。**该表尚未确认入库**，需在网络可达环境执行 `npx prisma db push`，或手工执行 `supabase/migrations/20260926150000_user_activities.sql`。表未建期间：活动查询返回建表错误、采集静默失败（不影响主流程）。

## 4. 多端验收口径

- Flutter 端本次零改动；待客户端接入真实网络层后，登录/答题/复习事件自动落库，管理端"用户活动"页即可见真实数据。
- 管理端页面冒烟：`/activities` 已纳入 proxy Cookie 预检与布局会话校验双重守卫（未登录访问重定向 `/login?from=/activities`）。
