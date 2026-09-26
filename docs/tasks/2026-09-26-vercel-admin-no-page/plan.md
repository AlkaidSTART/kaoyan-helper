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

## 二次诊断修正（依据线上实测与 git 对比）

用户提供了 Vercel Runtime Logs（均为 200），直接 curl 线上域名实测：

- `https://kaoyan-helper-ten.vercel.app/` 返回 200，但 HTML 为 **create-next-app 默认脚手架模板页**（`<title>Create Next App</title>`、"To get started, edit the page.tsx file"），并非 admin 登录/后台页面。
- 原因一（Root Directory 未设置）不成立，推翻：线上确实部署了 Next.js 工程，只是代码是旧的。

git 证据：

- Vercel Production Branch 为默认的 `main`；`origin/main` 上 admin 仅有脚手架初始化提交（a496b64）与一次重构（51761e9），其 `admin/app/page.tsx` 正是默认模板页，与线上 HTML 完全一致。
- 真正的 admin 后台代码在 `dev` 分支；本地 `dev` 领先远程 22 个提交未推送，`origin/dev` 停在 bd89882。

### 最终结论

Vercel 部署的是 `main` 分支上的 admin 初始脚手架（默认模板页），而真实后台代码在 `dev` 分支且未推送/未合并，因此"部署成功"但线上不是预期页面。

### 修正后的落地计划

1. 推送本地 dev：`git push origin dev`。
2. 二选一：Vercel 项目 Settings → Git → Production Branch 改为 `dev`；或将 `dev` 合并回 `main`（走 PR）。
3. 重新部署前在 Vercel 配置环境变量：`DATABASE_URL` / `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `DEEPSEEK_API_KEY`（`DIRECT_URL` 仅本地迁移需要）。
4. 验收：访问 `/` 重定向至 `/login` 并渲染登录表单；未登录访问 `/dashboard` 被 proxy 踢回登录页。

## 落地计划（首次诊断，已被上方修正取代）

1. Vercel 控制台 → 项目 Settings → General → Build & Output Settings → Root Directory 设为 `admin`，重新部署；部署日志应出现 Next.js 构建步骤。
2. Settings → Environment Variables 添加 `DATABASE_URL` / `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `DEEPSEEK_API_KEY`（`DIRECT_URL` 仅本地迁移需要）。
3. 验收：访问 `/` 重定向到 `/login` 并能正常渲染登录表单；`/dashboard` 未登录时被 proxy 重定向回 `/login`。
