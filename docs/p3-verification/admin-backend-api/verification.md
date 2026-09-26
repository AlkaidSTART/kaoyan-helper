# P3 - 管理端后端接口验证记录

> 日期：2026-09-26

## 命令结果

| 检查 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `pnpm exec tsc --noEmit` | 0 错误 |
| 测试 | `pnpm test`（vitest） | 26 文件 / 191 用例全通过（基线 167 + 新增 24） |
| Lint | `pnpm lint` | 0 error / 0 warning |

## 契约覆盖（api-contract §11，20/20）

- ADMIN-DASH-01 ✓ / ADMIN-USER-01~04 ✓ / ADMIN-Q-01~05 ✓ / ADMIN-UGC-01~03 ✓ / ADMIN-SCH-01~07 ✓
- 所有路由：getActor → requirePermission（admin:* 权限点）→ Zod 校验 → 服务层 assertAdminActor 复核
- 高风险写（ban/unban、题目 CRUD、审核、院校写、导入提交）与 admin_audit_logs 同事务
- 封禁边界：自封 422 / 最后管理员 409 / 解封幂等（单测覆盖）
- UGC：仅 pending 可审（服务层 + 事务内双检）、版本冲突 409、非 UGC 422（单测覆盖）
- 软删除保留错题历史引用；导入 validate→confirm 两阶段、1h 过期 409、commit 单请求直达（单测覆盖）

## 边界说明

- 看板统计窗口按 UTC 日界，timezone 参数仅校验（展示层预留），topMistakes 不含用户标识
- 导入限流 10 次/分钟/管理员；文件 ≤2MB 且 ≤2000 行
- 未做：审计日志查询接口（admin:audit:read 首期仅内部查询，契约允许）
