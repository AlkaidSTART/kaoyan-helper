# P1 - 管理后台 UI 设计

> 日期：2026-09-26
> 上游需求：`docs/p0-definition/admin-console-ui/definition.md`

## 1. 视觉基调（简约）

- 基色：shadcn zinc（中性灰），主色即前景黑，无品牌渐变；圆角 `--radius: 0.625rem`。
- 字体：Geist Sans（已有）；正文 14px 为主，表格 13~14px；标题用 `text-sm font-medium + text-muted-foreground` 的克制层级。
- 布局：shadcn Sidebar（可折叠）+ 顶部粘性 Header（面包屑语义 + 用户菜单）；内容区 `max-w` 自适应、24px 呼吸。
- 图标：lucide-react，仅描边风格，16~18px，配合 `text-muted-foreground`。
- 状态色：仅用语义色（成功/警示/破坏性）+ badge 变体，不做彩色堆砌。

## 2. 信息架构

```
/login                      登录（邮箱 + 密码，真实 API）
/(admin)/dashboard          概览：4 张统计卡 + 待审核 UGC 预览 + 最近注册用户
/(admin)/users              用户表：搜索、角色/状态徽章、封禁（待接入）
/(admin)/questions          题库表：学科/审核状态筛选、来源徽章
/(admin)/ugc                审核队列：待审核卡片式题目，通过/驳回（待接入）
/(admin)/schools            院校表：省市、标签徽章、导入入口（待接入）
```

- `/` 重定向：未登录 → `/login`，已登录 → `/dashboard`。
- 侧边栏分区：概览（dashboard）；运营（users、ugc）；内容（questions、schools）。底部为用户菜单（登出）。

## 3. 认证与守卫

- `proxy.ts`（Next.js 16 导航守卫）：对 `/dashboard|/users|/questions|/ugc|/schools` 检查 `admin_session` Cookie 存在性，缺失重定向 `/login`；`/login` 已有 Cookie 时重定向 `/dashboard`。仅做第一层，不做授权。
- `(admin)/layout.tsx` 服务端二次校验：经 `AuthService.getSession` 读 Prisma 会话，失败重定向 `/login`（真实授权边界仍由 `/api/v1/*` Route Handler 承担）。
- 登录页调用 `POST /api/v1/auth/login/password`（`clientType: "admin-web"`），错误展示服务端业务码对应的中文文案。

## 4. 数据策略

- `lib/mock/admin-data.ts`：强类型示例数据（用户、题目、UGC、院校、统计），文件头注释声明"示例数据，管理 API（P2-10）落地后替换为 fetch"。
- 所有写操作（封禁、审核、导入）按钮触发 sonner Toast："管理接口尚未接入"，不伪造成功。

## 5. 组件清单（shadcn）

sidebar、card、button、input、label、table、badge、avatar、dropdown-menu、separator、tooltip、skeleton、sonner、dialog（占位）、select、tabs（UGC 队列分页签）、sheet（侧栏移动端折叠由 sidebar 内置）。

## 6. 响应式

- Sidebar 组件自带桌面折叠/移动端 Sheet 抽屉。
- 表格容器横向滚动；统计卡 4 → 2 → 1 列。
