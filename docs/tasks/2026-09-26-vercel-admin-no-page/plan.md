# 任务：诊断 Vercel 部署 admin 后无页面问题

## 原始诉求

用户将 `admin/`（Next.js 16 管理后台）部署到 Vercel，构建显示成功，但访问站点没有页面。

## 诊断过程与证据

1. 仓库根目录是 Flutter 工程，根目录无 `package.json`；Next.js 工程位于 `admin/` 子目录。
2. 仓库内无 `vercel.json`、无 `.vercel/` 目录 → 排除 CLI 部署，确定为 Vercel 控制台 GitHub 导入。
3. 若导入时未设置 Root Directory = `admin`，Vercel 在根目录检测不到 Next.js，会按 "Other/静态站点" 部署仓库根目录：构建"成功"（Ready），但根目录没有 `index.html`，所有路径 404 → 表现为"部署成功但没有页面"。
4. `admin/app/page.tsx` 是服务端重定向页：有会话跳 `/dashboard`，无会话（或会话校验异常）跳 `/login`，因此 Next.js 正常部署后访问 `/` 必然重定向到登录页，不会是空白。
5. 运行时依赖环境变量：`DATABASE_URL`、`SUPABASE_URL`、`SUPABASE_SECRET_KEY`、`DEEPSEEK_API_KEY`。`admin/app/page.tsx` 中 `PrismaAuthRepository` 构造在 try/catch 之外，若 `DATABASE_URL` 缺失，首页会 500 而非跳转登录页，因此即使 Root Directory 正确也必须在 Vercel 配置环境变量。

## 结论（按可能性排序）

1. Vercel 项目 Root Directory 未设置为 `admin`，实际部署的是 Flutter 仓库根目录的静态文件（主因，与"Ready 但 404"完全吻合）。
2. Root Directory 正确但环境变量缺失 → 首页 500（次因，需在修复 1 后验证）。

## 落地计划

1. Vercel 控制台 → 项目 Settings → General → Build & Output Settings → Root Directory 设为 `admin`，重新部署；部署日志应出现 Next.js 构建步骤。
2. Settings → Environment Variables 添加 `DATABASE_URL` / `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `DEEPSEEK_API_KEY`（`DIRECT_URL` 仅本地迁移需要）。
3. 验收：访问 `/` 重定向到 `/login` 并能正常渲染登录表单；`/dashboard` 未登录时被 proxy 重定向回 `/login`。
