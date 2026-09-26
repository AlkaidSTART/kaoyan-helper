# 登录 503 DEPENDENCY_UNAVAILABLE 诊断

## 原始诉求

`POST /api/v1/auth/login/password` 持续返回 503 `DEPENDENCY_UNAVAILABLE`，用户无法登录 admin 后台。用户新建 `admin/.env` 后仍复现。

## 诊断过程与结论

1. 错误码映射链：`admin/lib/db/prisma.ts` 的 `PrismaClientConfigurationError`（缺 `DATABASE_URL`）及各类 Prisma 初始化/请求错误 → `mapPrismaError` → 503 `DEPENDENCY_UNAVAILABLE`（见 `admin/lib/auth/prisma-auth-repository.ts:222`）。
2. 第一次检查：用户新建的 `admin/.env` 仅含 4 个 Supabase 客户端变量（`SUPABASE_URL` 等），**缺 `DATABASE_URL`**，对应 503 耗时 ~1ms（配置早退）。
3. 用户补上 `DATABASE_URL`（Supabase pooler，端口 6543，`pgbouncer=true`）与 `DIRECT_URL` 后，探测请求耗时变为 1.9s 且仍 503 → env 已生效，失败发生在真实连接阶段。
4. 排除项：
   - TCP 连通性：`aws-0-ap-northeast-1.pooler.supabase.com:6543` 可达。
   - `clientType` 校验：需传 `admin-web`（`admin/lib/auth/auth-service.ts:13`），非数据库问题。
5. 直接用 `pg` 客户端以同一连接串连接（SSL 开/关两种方式均测）：
   - **结论：`password authentication failed for user "postgres"`，即数据库密码错误。**
   - 因认证未通过，尚未能验证 `users` / `admin_credentials` / `admin_sessions` 表是否存在。

## 落地计划

1. 用户在 Supabase Dashboard → Project Settings → Database 重置/获取数据库密码，更新 `admin/.env` 中 `DATABASE_URL` 与 `DIRECT_URL` 的密码段。
2. 重启 admin dev server（端口 3001）。
3. 验证登录接口返回 401 `AUTH_INVALID_CREDENTIALS`（依赖恢复）或登录成功。
4. 若密码修正后仍 503，检查三张表是否存在，缺失则执行 `pnpm prisma db push` 同步 schema（`admin/prisma/` 下无 migrations 目录）。

## 验收指标

- `POST /api/v1/auth/login/password` 不再返回 503；错误凭证返回 401 `AUTH_INVALID_CREDENTIALS`，正确凭证返回 200。

## 执行结果（2026-09-26 更新）

1. ① 缺 `DATABASE_URL` → 用户补充后暴露 ② 数据库密码错误（`password authentication failed for user "postgres"`）→ 密码修正后暴露 ③ 数据库无任何业务表（全新 Supabase 项目）→ ④ dev server 进程持缓存的旧 Prisma 客户端（`globalThis` 单例），需整进程重启 → ⑤ 库中无管理员账号（按设计由受控运维流程写入）。
2. 已执行：
   - 清理 `admin/.env` 中从 Supabase 控制台误粘贴的无变量名片段（裸连接串与 host/port 参数行）。
   - `pnpm prisma db push` 同步 18 张业务表（经 session pooler）。
   - 补应用 `supabase/migrations/20260926130000_admin_prisma_auth.sql` 与 `20260926140000_user_sessions.sql`（含 `set_updated_at()` 函数、RLS 启用与 anon/authenticated 收权，防止密码哈希经 Supabase Data API 暴露）；三表 RLS 已验证开启。
   - 重启 admin dev server（端口 3001，脱离终端后台运行，日志 `/tmp/admin-kaoyan-dev.log`）。
   - 端到端验证：临时创建管理员 → 登录返回 200 + 会话 Cookie → 删除临时账号（`admin_credentials` 复归 0 行）。
3. 遗留事项：
   - 首个正式管理员账号需用户自行执行凭据写入（email + 密码由用户决定）。
   - baseline 迁移 `20260926120000_baseline_backend_api.sql`（894 行，面向 Flutter 端完整后端）未应用，后续需单独决策（建议经 Supabase CLI 走迁移历史管理）。
   - `DIRECT_URL` 曾因 `.env` 解析失败被打印进本地任务日志，介意可轮换数据库密码。
