# P3 - 管理后台 UI 验证

> 日期：2026-09-26
> 状态：本期验证已执行（自动化 + 运行时冒烟）；管理接口（P2-10）接入后的数据链路验收待执行
> 上游：`docs/p2-development/admin-console-ui/development.md`

## 1. 自动化验证（真实执行，`admin/` 目录）

| 命令 | 结果 | 结论 |
|---|---|---|
| `pnpm exec tsc --noEmit` | 退出码 0 | 类型检查通过 |
| `pnpm lint`（eslint） | 0 error / 0 warning（含 react-hooks v6 规则） | 静态检查通过 |
| `pnpm build`（next build） | 编译成功，27/27 页面生成；`/dashboard /users /questions /ugc /schools /login` 全部注册为动态路由，`Proxy (Middleware)` 生效 | 构建通过 |
| `pnpm test`（Vitest，回归） | 22 个文件 / 167 个测试全部通过 | 既有后端测试零回归 |

## 2. 运行时冒烟（`next dev -p 3457`，真实请求）

| 用例 | 预期 | 实际 | 结论 |
|---|---|---|---|
| 未登录 `GET /login` | 200 登录页 | 200 | PASS |
| 未登录 `GET /dashboard` | 重定向登录页并携带 from | `307 → /login?from=%2Fdashboard` | PASS |
| 未登录 `GET /` | 重定向 `/login` | `307 → /login` | PASS |
| 错误凭据登录 | 统一错误 envelope，不泄漏账号存在性 | `{"success":false,"error":{"code":...}}` 含 requestId/timestamp | PASS |

说明：冒烟环境未注入 `DATABASE_URL`，登录接口按设计返回 503 `DEPENDENCY_UNAVAILABLE`（登录表单映射为"服务暂时不可用"文案）；配置数据库后同一链路返回 `AUTH_INVALID_CREDENTIALS` / 成功。

## 3. 守卫层次

1. `proxy.ts`（Next.js 16）：Cookie 存在性 → 受保护路径 307 `/login?from=…`；`/login` 已有 Cookie 时跳 `/dashboard`。
2. `(admin)/layout.tsx` 服务端：Prisma 会话真实校验（过期/撤销/降权/封禁）→ `redirect("/login")`。
3. Route Handler：`/api/v1/*` 各自鉴权（后端职责，不受 UI 影响）。

## 4. UI 约定核验

- [x] 全部图标使用 lucide-react（`aria-hidden`），界面无系统 Emoji。
- [x] 状态表达：语义色圆点 + 中性文字（`StatusBadge`），无彩色底堆砌。
- [x] 示例数据均带"示例数据"徽章；动作不做假成功（审核按钮提示"审核接口尚未接入"）。
- [x] 简约基调：zinc 中性色、克制圆角、卡片/表格/徽章均用 shadcn 默认样式；动效仅库内默认过渡。

## 5. 待执行（不阻断本期 UI 验收）

- [ ] P2-10 管理接口接入后：真实数据渲染、审核/封禁/导入动作闭环、审计日志联动。
- [ ] 浏览器端多端（Chrome/Safari、窄窗口）人工走查与截图记录。
- [ ] 深色模式开关（CSS 变量已就绪，开关暂不暴露）。
