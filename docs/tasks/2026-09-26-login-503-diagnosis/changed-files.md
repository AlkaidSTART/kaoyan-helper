# 变更文件清单

## 本次诊断会话

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/tasks/2026-09-26-login-503-diagnosis/plan.md` | 新建 | 诊断记录与落地计划 |
| `docs/tasks/2026-09-26-login-503-diagnosis/changed-files.md` | 新建 | 本清单 |
| `admin/.env` | 清理 | 删除误粘贴的无变量名片段（裸连接串与 host/port 参数行）；保留并修正缩进的 `DATABASE_URL` / `DIRECT_URL`（值由用户先前编辑） |
| 远端 Supabase 数据库 | 结构变更 | `prisma db push` 同步 18 张业务表；应用 `20260926130000_admin_prisma_auth.sql`、`20260926140000_user_sessions.sql`（触发器、RLS、收权）与 `set_updated_at()` 函数 |

未修改任何业务代码（`lib/`、`app/` 零改动）。dev server 由本会话以 nohup 重启（`/tmp/admin-kaoyan-dev.log`），临时验证账号已删除。诊断用 `pg` 连接测试通过 `node -e` 内联执行，未在仓库留下临时文件。
