# 2026-09-26 Admin Prisma 管理员登录任务计划

## 1. 原始诉求

在 `admin` 应用中引入 Prisma 作为 ORM，完善登录相关的基础后端接口。

## 2. 本轮目标

实现管理员密码登录、服务端会话刷新/退出/查询，以及支撑这些接口的 Prisma Schema、迁移和分层代码。

## 3. 关键决策

- 仅允许 `public.users.role = 'admin'` 登录管理后台。
- 用户封禁状态由 `is_banned` 与 `banned_until` 共同判断。
- 浏览器只持有 HttpOnly `admin_session` Cookie；数据库只保存 token 哈希。
- 密码使用 bcrypt 成本因子 12；不建立独立管理员角色表。
- 使用 Prisma Repository 隔离数据库，使用 AuthService 承载状态机，Route Handler 只做 HTTP 适配。
- 本轮只实现认证底座，不做登录 UI、OAuth、验证码和完整 RBAC 路由守卫。

## 4. 范围与不做项

### 做

- `POST /api/v1/auth/login/password`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- Prisma Schema、配置、迁移、惰性客户端、仓储、服务、Cookie 与测试。

### 不做

- 管理后台页面或前端状态管理。
- 普通用户 Flutter Bearer token 登录链路。
- OAuth、邮箱验证码、找回密码和密码修改。
- 完整细粒度 RBAC 中间件与业务管理接口。
- 分布式限流；若需要暴力破解防护，后续在网关或共享 Redis 层补充。

## 5. 落地顺序

1. 落盘 P0–P3 和本任务计划。
2. 安装 Prisma、adapter、bcryptjs 并更新锁文件。
3. 新增 Prisma Schema、配置和 Supabase 增量迁移。
4. 实现基础设施、仓储、服务与 Route Handler。
5. 编写并运行 Vitest 测试。
6. 运行 lint、build、Prisma 校验和 diff 检查。
7. 回填 P2/P3 与 `changed-files.md`，记录真实结果与风险。

## 6. 验收标准

- 四个接口均有稳定契约、统一响应和 Cookie 行为。
- 管理员、普通用户、封禁用户、错误密码、过期/撤销/轮换会话边界均有测试。
- 不泄漏密码、token、Cookie、SQL 或 Prisma 原始错误。
- 工程静态检查和测试通过；未执行的 Flutter 检查必须明确记录。

## 7. 风险与依赖

- 远端 Supabase 尚未应用新迁移，数据库集成行为只能在迁移执行后做端到端验证。
- 生产环境必须配置 `DATABASE_URL`，且数据库连接角色必须可访问新增表。
- 管理员凭据和 `public.users.role` 的初始化仍由受控运维流程完成，不在公开接口中提供提权能力。
- 内存限流不适用于多实例部署，本轮不以内存限流冒充安全边界。
