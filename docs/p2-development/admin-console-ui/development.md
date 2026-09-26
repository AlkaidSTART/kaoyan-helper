# P2 - 管理后台 UI 开发

> 日期：2026-09-26

## 1. 原子任务

- [ ] P2-101 shadcn 初始化：components.json、utils/cn、globals.css 主题变量、安装基础组件。
- [ ] P2-102 根布局与 `/` 重定向、`proxy.ts` 导航守卫。
- [ ] P2-103 登录页（真实 API + 错误文案映射 + 登出）。
- [ ] P2-104 管理布局：服务端会话校验 + Sidebar + Header + 用户菜单。
- [ ] P2-105 概览页：统计卡 + 待审核预览 + 最近用户表。
- [ ] P2-106 用户/题库/UGC/院校页面：表格、徽章、筛选工具条（视觉）、待接入动作 Toast。
- [ ] P2-107 示例数据模块与"待接入"标记。

## 2. 关键决策

1. shadcn CLI（`shadcn@latest`）初始化，base color zinc，CSS variables，RSC 优先；交互组件（表单、下拉、Toast）为客户端组件。
2. 守卫两层：proxy.ts 只查 Cookie 存在性（P2 ADR：Next.js 16 用 proxy.ts 替代 middleware）；布局层用 Prisma 会话校验。
3. 示例数据与真实 API 隔离：页面只消费 `lib/mock/admin-data.ts` 的类型化数据，后续替换为 API 调用不动 UI。
4. 首版浅色单主题；深色模式变量由 shadcn 生成但暂不暴露切换。

## 3. DoD

- lint/build 通过；登录 → 概览 → 登出全链路可用；受保护路径未登录重定向。
- 无系统 Emoji；示例数据均有标识。
