# P0 - 管理后台 UI（Admin Console UI）定义

> 日期：2026-09-26
> 上游契约：`docs/p1-design/next-backend-api-rbac/api-contract.md` §11（Admin 接口）
> 现状：`admin/app` 仍为 Next.js 脚手架默认页；认证 API（login/password、session、refresh、logout）已实现。

## 1. 用户痛点

管理员目前只能在接口层面（curl/Cookie）操作，无法可视化地查看用户、题库、UGC 审核队列与院校数据；管理后台没有可用界面。

## 2. 目标

- 用 shadcn/ui 搭建简约、克制、信息密度适中的管理后台界面（zh-CN）。
- 登录/登出/会话守卫对接真实认证 API（`clientType=admin-web`，HttpOnly Cookie）。
- 建立可扩展的页面骨架：概览、用户、题库、UGC 审核、院校。
- 管理接口（P2-10）尚未实现的部分使用强类型示例数据 + 明确的"待接入"提示，动作不做假成功。

## 3. 范围边界

### 3.1 本期做

- shadcn/ui 初始化（Tailwind v4 + CSS 变量主题、zinc 中性色）。
- `proxy.ts` 导航守卫（Cookie 存在性第一层）+ 管理布局服务端会话校验（真实 Prisma 会话）。
- 页面：登录、概览 Dashboard、用户管理、题库管理、UGC 审核、院校数据。
- 统一页面骨架（PageHeader）、状态徽章、空态与"接口未接入"Toast。

### 3.2 本期不做

- Admin 管理 API 的后端实现（P2-10，另行任务）；本期限于 UI 与认证闭环。
- 深色模式切换（保留 CSS 变量能力，首版只交付浅色）。
- 图表库、复杂筛选、批量操作、CSV 导入向导。
- 移动端深度适配（管理后台以桌面宽度为主，仅保证不破版）。

## 4. 验收指标

- `pnpm lint` 0 警告、`pnpm build` 通过。
- 未登录访问受保护路径重定向 `/login`；登录成功进入 `/dashboard`，登出回到登录页。
- 全部页面图标使用 lucide（无系统 Emoji）；动效只用 shadcn 默认过渡。
- 示例数据均有"示例"标识或空态说明，不伪造接口成功。
