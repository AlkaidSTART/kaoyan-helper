# 变更文件清单

## 修改

| 文件 | 说明 |
| --- | --- |
| `admin/package.json` | build 脚本由 `next build` 改为 `prisma generate && next build`；devDependencies 新增 `dotenv@18.0.3` |
| `admin/prisma.config.ts` | 顶部新增 `import "dotenv/config"`，修复 Prisma 7 CLI 不自动加载 `.env` 导致 `prisma generate` 报 `PrismaConfigEnvError` 的问题 |

## 新建

| 文件 | 说明 |
| --- | --- |
| `docs/tasks/2026-09-26-admin-prisma-generate-fix/plan.md` | 本任务诊断结论与落地计划 |
| `docs/tasks/2026-09-26-admin-prisma-generate-fix/changed-files.md` | 本清单 |

## 未改动（曾评估）

- `admin/.gitignore`：检查后确认已包含 `/generated/prisma`，无需修改。
- `pnpm-lock.yaml`：随 `pnpm add -D dotenv` 自动更新（依赖变更的配套产物）。

## 验证记录

- `pnpm build`：prisma generate 成功 + next build 36/36 路由编译通过。
- CI 模拟（无 `.env`、仅平台环境变量）：`prisma generate` 成功。
- `pnpm lint`：0 errors（2 条既有 warning 为历史遗留，与本次无关）。
- `pnpm test`：195/195 通过。
