# Changed Files: 管理后台 UI（shadcn/ui）

## 新建

- `admin/proxy.ts` — Next.js 16 导航守卫（Cookie 存在性 + 重定向）。
- `admin/components.json`、`admin/lib/utils.ts`、`admin/hooks/use-mobile.ts`（useSyncExternalStore 实现）— shadcn 初始化产物。
- `admin/components/ui/*` — 18 个 shadcn 组件（button/card/input/label/table/badge/dropdown-menu/avatar/separator/sidebar/tooltip/skeleton/sonner/dialog/select/tabs/breadcrumb/sheet）。
- `admin/components/admin/app-sidebar.tsx` — 可折叠侧边栏（logo、五个导航项、页脚用户信息）。
- `admin/components/admin/site-header.tsx` — 粘性 Header（SidebarTrigger、面包屑、示例数据徽章、用户菜单）。
- `admin/components/admin/user-nav.tsx` — 用户菜单（真实登出 API + toast）。
- `admin/components/admin/page-header.tsx`、`status-badge.tsx` — 页头与语义状态徽章。
- `admin/app/login/page.tsx`、`login-form.tsx` — 登录页（真实 API、错误码中文映射）。
- `admin/app/(admin)/layout.tsx` — 服务端 Prisma 会话校验 + SidebarProvider 布局。
- `admin/app/(admin)/dashboard|users|questions|ugc|schools/page.tsx` — 五个业务页面（users 含本地搜索/筛选，ugc 含待接入审核动作）。
- `admin/lib/mock/admin-data.ts` — 类型化示例数据（文件头注明"示例数据"，P2-10 后替换）。
- `docs/p0-definition|p1-design|p2-development|p3-verification/admin-console-ui/`、`docs/tasks/2026-09-26-admin-console-ui/`。

## 修改

- `admin/app/layout.tsx` — zh-CN、标题模板、TooltipProvider + Toaster。
- `admin/app/page.tsx` — 会话校验后重定向 `/dashboard` 或 `/login`。
- `admin/app/globals.css` — shadcn 主题变量（neutral 基色、sidebar/chart token）。
- `admin/package.json`、`pnpm-lock.yaml` — shadcn 依赖（radix-ui、lucide-react、sonner、cva、next-themes、tw-animate-css）。

## 未改动

- `admin/lib/api/**`、`admin/lib/auth/**`、`admin/lib/services/**`、`admin/app/api/**`（后端零改动；167 项测试回归通过）。
- Flutter 侧全部文件。
