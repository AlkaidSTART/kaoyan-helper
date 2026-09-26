# Changed Files - 管理端后端接口

> 日期：2026-09-26
> 状态：20 个契约操作全部实现，tsc 零错误 / lint 零告警 / vitest 191 全绿

## 新建（服务层，`admin/lib/services/admin/`）

| 文件 | 说明 |
|---|---|
| `admin-actor.ts` | 服务层管理员复核（契约 §11.2 双重检查） |
| `admin-dashboard-service.ts` | ADMIN-DASH-01 聚合（dau/wau/answers/ai/topMistakes，窗口校验） |
| `admin-user-service.ts` | ADMIN-USER-01~04（封禁边界、解封幂等、学习统计） |
| `admin-question-service.ts` | ADMIN-Q-01~05 + ADMIN-UGC-01~03（软删、乐观锁、审核状态机） |
| `admin-school-service.ts` | ADMIN-SCH-01~07（唯一名 409、专业 upsert、导入两阶段） |
| `import-parser.ts` | CSV(RFC4180)/JSON 解析器，逐行错误定位，≤2000 行/2MB |
| `prisma-error-mapper.ts` | P2002→409 CONFLICT、其余→503 |
| `prisma-admin-dashboard-repository.ts` | 聚合查询（groupBy/aggregate） |
| `prisma-admin-user-repository.ts` | 状态更新与审计同事务 + 学习统计 |
| `prisma-admin-question-repository.ts` | 题库 CRUD/审核事务（审计同行） |
| `prisma-admin-school-repository.ts` | 院校/专业/导入任务事务（导入逐行 upsert + 审计） |

## 新建（路由，`admin/app/api/v1/admin/`，16 文件 20 操作）

- `dashboard/route.ts`（GET）
- `users/route.ts`（GET）、`users/[id]/route.ts`（GET）、`users/[id]/ban`（POST）、`users/[id]/unban`（POST）
- `questions/route.ts`（GET/POST）、`questions/[id]/route.ts`（GET/PATCH/DELETE）
- `ugc/route.ts`（GET）、`ugc/[id]/approve`（POST）、`ugc/[id]/reject`（POST）
- `schools/route.ts`（GET/POST）、`schools/[id]/route.ts`（PATCH）、`schools/[id]/programs`（POST）、`schools/[id]/programs/[programId]`（PATCH）
- `schools/import/route.ts`（POST multipart）、`schools/import/[jobId]/confirm`（POST）

## 新建（测试，24 个新增用例）

- `__tests__/import-parser.test.ts`（8）：RFC4180 转义、CRLF、表头校验、重名、布尔、JSON 嵌套/结构/坏 JSON
- `__tests__/admin-user-service.test.ts`（5）：自封 422、最后管理员 409、封禁+审计、404、解封幂等
- `__tests__/admin-ugc-import.test.ts`（7）：审核状态机（pending 门禁、409、非 UGC 422、驳回原因）、导入状态机（确认、completed/过期 409）
- `__tests__/admin-dashboard-service.test.ts`（4）：聚合映射、非法时区/倒序/超 90 天 422

## 修改

- `admin/prisma/schema.prisma`：新增 `AdminAuditLog`、`SchoolImportJob` 模型（对齐基线 SQL）+ User 反向关系
- `admin/lib/auth/permissions.ts`：补齐 9 个 admin 权限点（契约 §4.2）
- 服务层修复：`admin-question-service.ts` 增服务层 pending 门禁并导出 `QuestionOption`；`import-parser.ts` 布尔缺省为 false；仓储审计 metadata 使用时间戳参数

## 文档

- `docs/p0-definition/admin-backend-api/definition.md`
- `docs/p1-design/admin-backend-api/design.md`（ADR-1~8）
- `docs/p2-development/admin-backend-api/development.md`
