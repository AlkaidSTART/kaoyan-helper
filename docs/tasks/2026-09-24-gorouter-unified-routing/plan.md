# Task: GoRouter 统一路由与守卫系统 (Task Log)

## 原始诉求
引入官方推荐的 `go_router` 库，统一管理全应用路由映射、URL 深度链接、Tab 状态保持与基于 Riverpod 的认证守卫。

## 架构决策
1. **统一路由表**：定义 `/login`, `/dashboard`, `/quiz`, `/mistakes`, `/schools`, `/flashcards`, `/rest` 强类型静态路径。
2. **认证守卫联动**：通过 `RouterNotifier` 桥接监听 `authNotifierProvider`，未认证强制拦截重定向至 `/login`，认证成功自动跳转 `/dashboard`。
3. **状态保留多分支**：采用 `StatefulShellRoute.indexedStack` 保留各大 Tab 的滚动与表单状态，同时向下兼容 `currentNavIndexProvider` 保持现有组件平滑过渡。
4. **统一声明式跳转**：侧栏、底部导航与番茄钟气泡统一使用 `context.go()` 驱动。
