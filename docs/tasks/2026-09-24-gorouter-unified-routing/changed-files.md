# Changed Files: GoRouter 统一路由与守卫系统

## 新增文件
- `lib/core/router/app_router.dart`: 全局路由配置、`StatefulShellRoute`、Riverpod 守卫桥接。
- `test/router_test.dart`: 覆盖未登录拦截、路由跳转、分支状态保持与深度链接测试。
- `docs/tasks/2026-09-24-gorouter-unified-routing/plan.md`: 任务诉求与实施计划。
- `docs/tasks/2026-09-24-gorouter-unified-routing/changed-files.md`: 变更文件明细。
- `docs/p0-definition/go-router/requirements.md`: 需求与用例规范。
- `docs/p1-design/go-router/architecture.md`: 架构与时序设计。
- `docs/p2-development/go-router/task-breakdown.md`: 开发决策与任务拆解。
- `docs/p3-verification/go-router/test-report.md`: 验证报告与质量验收单。

## 修改文件
- `pubspec.yaml`: 引入 `go_router: ^14.8.1`。
- `lib/main.dart`: `MaterialApp` 重构为 `MaterialApp.router` 并挂载 `routerProvider`。
- `lib/ui/shell/app_shell.dart`: 支持 `StatefulNavigationShell` 嵌套渲染与索引同步。
- `lib/ui/shell/widgets/side_nav_rail.dart`: 导航项使用 `context.go` 驱动。
- `lib/ui/features/rest/widgets/floating_pomodoro_bubble.dart`: 使用 `context.go('/rest')` 进行跳转。
