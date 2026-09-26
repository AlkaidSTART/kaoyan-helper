# Task Plan: 管理后台 UI（shadcn/ui）

## 1. 原始诉求

用户提出：使用 shadcn 组件库，设计一个简约好看的后台。

## 2. 范围

- 在 `admin/`（Next.js 16 + Tailwind v4）初始化 shadcn/ui（radix 基础库 + nova preset，neutral 中性色）。
- 页面：登录（真实 API）、概览、用户、题库、UGC 审核、院校；可折叠 Sidebar + 粘性 Header + 面包屑。
- 守卫两层：`proxy.ts` Cookie 存在性 + `(admin)` 布局 Prisma 会话校验。
- 管理接口（P2-10）未接入的部分使用类型化示例数据 + "示例数据"徽章，动作不做假成功。

## 3. 关键决策

1. shadcn CLI `init -b radix -p nova` 非交互初始化；`sidebar` 承载布局，`sonner` 承载提示。
2. Next.js 16 `middleware` 已弃用 → 根 `proxy.ts`（本地版本文档核对）。
3. 状态徽章自研轻量 `StatusBadge`（语义色圆点 + outline），不引入彩色 badge 变体堆砌。
4. `useIsMobile` 改用 `useSyncExternalStore`（规避 react-hooks v6 对 effect 内同步 setState 的报错）。
5. 登录表单错误码 → 中文文案映射表；`useSearchParams` 用 Suspense 包裹。

## 4. 验证

见 `docs/p3-verification/admin-console-ui/verification.md`（tsc/lint/build/test 全绿 + 冒烟 4 项 PASS）。
