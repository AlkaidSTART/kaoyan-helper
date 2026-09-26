# 任务：修复 admin 构建缺少 `prisma generate` 导致的 module-not-found

## 原始诉求

用户报告 `admin/`（Next.js 16 管理后台）构建/启动时报 module-not-found，报错堆栈涉及以下文件的导入：

- `admin/lib/auth/prisma-auth-repository.ts:1`
- `admin/lib/auth/prisma-user-session-repository.ts:1`
- `admin/lib/db/prisma.ts:5`
- `admin/lib/services/admin/prisma-admin-question-repository.ts:1`
- `admin/lib/services/admin/prisma-admin-school-repository.ts:1`
- `admin/lib/services/admin/prisma-admin-user-repository.ts:1`

## 诊断过程与证据

1. 上述文件第一行均导入 `@/generated/prisma/client`。该路径是 Prisma 7 `prisma-client` generator 的自定义输出，由 `admin/prisma/schema.prisma` 中 `output = "../generated/prisma"` 指定，需执行 `prisma generate` 才会生成。
2. 本地 `admin/generated/prisma/` 已存在，依赖（`@prisma/client`、`@prisma/adapter-pg`、`server-only`）均在 `node_modules` 中，`tsconfig.json` 别名 `@/* → ./*` 正确。
3. 本地执行 `pnpm build` 全量通过（36 个页面/路由全部编译成功），说明报错并非本地代码问题，而是构建环境缺少生成产物。
4. 关键证据：`git ls-files generated/` 结果为 0 —— 生成产物未提交（合理，生成代码不应入库，且 `.gitignore` 已有 `/generated/prisma`）；但 `package.json` 的 build 脚本仅有 `next build`，不含 `prisma generate`。
5. 结合既有任务 `2026-09-26-vercel-admin-no-page`：admin 通过 Vercel 部署（Root Directory = `admin`），CI 使用全新克隆，仓库内没有 `generated/`，构建时也不会执行 `prisma generate` → CI 上必然复现该 module-not-found。用户的报错很可能来自 Vercel 构建日志。

## 结论

根因：Prisma 7 自定义输出客户端需要 `prisma generate` 生成，但生成产物不入库、build 脚本也不生成，导致任何非本地（无历史产物）的构建环境（Vercel CI、新克隆）在编译 `@/generated/prisma/client` 导入时全部失败。

## 落地计划

1. `admin/package.json`：build 脚本改为 `prisma generate && next build`。
2. 验证：在 `admin/` 下执行 `pnpm build`，确认 `prisma generate` 先行执行且 `next build` 全量通过。

（说明：`admin/.gitignore` 此前已包含 `/generated/prisma`，无需改动。）

## 验证结果

- `pnpm build`（新脚本）：`prisma generate` 成功生成客户端，`next build` 全部 36 个路由编译通过，无报错。
