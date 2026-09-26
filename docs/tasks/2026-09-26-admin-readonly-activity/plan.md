# 任务计划：管理端只读化与用户活动收集

> 日期：2026-09-26
> 原始诉求："admin 端不执行任何操作，只需要能够看到并收集用户的活动就行了"
> 需求定义：`docs/p0-definition/admin-readonly-activity/definition.md`
> 设计方案：`docs/p1-design/admin-readonly-activity/design.md`

## 决策论证

1. **"admin 端不执行任何操作"落到代码 = 摘除变更能力，而非仅藏按钮**。管理端 UI 本就未接线写接口（按钮只弹 toast），若只删按钮，12 个已实现的变更接口仍暴露在 API 面上，与产品定位相悖；摘除后 API 面与产品语义一致。模型不删、不做破坏性迁移，git 历史承担回滚。
2. **"收集用户的活动" = 服务端旁路事件表**。读取时 UNION 四张业务表无法干净分页，且"收集"应是一等能力；`user_activities` 在既有写路径成功后落事件，Flutter 尚未接网也先行就位。采集 best-effort，绝不阻断主流程。
3. **管理端其余只读页本次不接线**。mock → 真实接口已在 `admin-api-supplement` 任务中明确另立任务，本次只做与诉求直接相关的：新增活动页（真实数据）+ 移除操作暗示。

## 落地计划（按依赖顺序）

1. 文档：P0/P1 落盘（本目录与 p0/p1-design 对应文件夹）。
2. 删减：移除 12 个变更路由 → 服务/仓储写方法 → 写权限点 → 相关旧测试（admin-ugc-import 拆分保留只读用例、admin-user-service 测试去 ban/unban、import-parser 删除）。
3. 新增：`user_activities` Prisma 模型 + Supabase 基线 SQL → `ActivityRecorder` 契约与 Prisma 实现 → 三处挂点（quiz / flashcards / user-session）。
4. 新增：`AdminActivityService` + Prisma 仓储 + `GET /admin/activities` 路由（权限 `admin:activity:read`）。
5. UI：`/activities` 页 + 侧边栏导航调整 + UGC/院校页去操作入口。
6. 契约：更新 `api-contract.md` §11/§12。
7. 验证：`pnpm lint` / `pnpm test` / `pnpm build`，结果落 `docs/p3-verification/admin-readonly-activity/`。
8. 收尾：`changed-files.md` 落盘。
