# 任务计划：管理端接口增补（admin-api-supplement）

> 日期：2026-09-26
> 原始诉求：会话评审「admin 端接口是否够用」后确认 3 个缺口 + 用户新增「注册人数统计」诉求。

## 1. 原始诉求与决策论证

### 诉求来源

1. 会话缺口分析结论（用户已确认"可以"）：
   - 审计日志只写不读，需补 `GET /admin/audit-logs`；
   - 管理端专业只有写没有读，需补 `GET /admin/schools/:id/programs`；
   - dashboard 缺 `totalUsers` / `pendingUgcCount`，与 UI 卡片口径对不齐。
2. 用户新增："还希望增加统计注册人数的接口" → 设计为独立接口 `GET /admin/stats/users`。

### 关键决策

| 决策 | 结论 | 理由 |
|---|---|---|
| 注册统计独立成接口还是并入 dashboard | 独立 `ADMIN-STAT-01`，dashboard 仅补 `totalUsers` | 用户明确要独立接口；dashboard 保持聚合摘要职责，环比数据由独立接口提供 |
| 审计日志是否带时间范围筛选 | 首期不带，仅 `action/resourceType/actorId` + 倒序分页 | 最小改动；回溯以"最近操作"为主场景 |
| 专业列表是否分页 | 不分页，仅 `year` 筛选 | 单校专业量级小，编辑页需要完整列表 |
| 注册统计权限点 | `admin:dashboard:read` | 运营聚合口径、无隐私明文，与看板同域 |
| `pendingUgcCount` 口径 | `source=ugc + reviewStatus=pending + isDeleted=false` | 与 `GET /admin/ugc` 默认队列总数严格一致 |
| 统计窗口口径 | 与看板同构：UTC 日界、默认近 7 天、≤90 天、timezone 仅校验 | 复用 `parseUtcDay` / `isValidTimeZone`，避免两套口径 |

## 2. 落地计划（P2 顺序）

1. `lib/api/params.ts`：导出 `isValidUuid`（`readUuidParam` 复用）。
2. 审计查询：service + prisma 仓储 + 路由 + 单测。
3. 专业读取：`admin-school-service` 扩展 + 仓储 + 路由 GET + 单测（并入既有 `admin-ugc-import.test.ts`）。
4. 看板扩展：DTO/仓储接口/Prisma 实现 + 更新既有看板单测。
5. 注册统计：service + 仓储 + 路由 + 单测。
6. 验证：`pnpm lint` + `pnpm test` 全绿。

## 3. 文档

- P0：`docs/p0-definition/admin-api-supplement/definition.md`
- P1：`docs/p1-design/admin-api-supplement/design.md`
- 契约增补：`docs/p1-design/next-backend-api-rbac/api-contract.md` §2、§11（ADMIN-DASH-01 扩展 + ADMIN-SCH-08 / ADMIN-STAT-01 / ADMIN-AUDIT-01）
- 变更清单：`changed-files.md`
