# 任务计划：Flutter 用户端接口接入（flutter-user-api-integration）

> 日期：2026-09-26
> 分支：dev
> 关联文档：`docs/p0-definition/flutter-user-api-integration/`、`docs/p1-design/flutter-user-api-integration/`、`docs/p2-development/flutter-user-api-integration/`

## 1. 原始诉求

> 完善 flutter 项目的前端接口，让它连接上我的用户的后端接口，不要连接到管理员的接口了。

## 2. 调研结论

- 后端位于 `admin/`（Next.js），用户端接口已实现：`/api/v1/{auth,me,dashboard,questions,mistakes,schools,flashcards,check-ins,ai}`，Flutter 走 `Authorization: Bearer`；`/api/v1/admin/*` 为管理端（Cookie 会话 + admin 权限点），App 不得连接。
- Flutter 端现状：`authRepositoryProvider` 默认 `FakeAuthRepository`，其余视图为静态 Mock UI，无任何网络层代码（`dio` 依赖已在 pubspec 中但未使用）。
- 后端统一 envelope：成功 `{success:true, data, meta:{requestId,timestamp,pagination?}}`；失败 `{success:false, error:{code,message,details}, meta}`。
- 关键契约点：登录仅支持邮箱验证码（`clientType:"flutter"`，密码登录返回 422 `PROVIDER_UNSUPPORTED`）；401 `TOKEN_EXPIRED` 需以 `POST /auth/refresh {refreshToken}` 换新 token 对；macOS 沙箱缺出站网络 entitlement。

## 3. 决策论证

| 决策 | 备选 | 结论 |
|---|---|---|
| envelope 解包/异常映射收敛在 DioClient | 每个仓储各自解析 | 收敛一处，仓储保持纯数据映射（ADR-2） |
| Token 持久化用 `shared_preferences` | 内存（重启即失效）/ supabase_flutter 本地存储 | 标准轻量方案，抽象 `AuthTokenStore` 便于测试（ADR-4） |
| 业务模块仓储本期只建数据层，UI 仅接登录 + 仪表盘 | 六个视图全部数据绑定 | 仓储即"前端接口"本体，视图绑定体量大、另行排期（P0 范围边界） |
| 密码登录客户端快速失败 | 照发请求吃 422 | 契约已明确未开放，避免无效网络往返（ADR-5） |
| 启动会话恢复 + `isRestoring` 路由闸 | 每次启动重新登录 | Token 已持久化，恢复成本低；避免路由闪跳（ADR-5） |

## 4. 落地计划

1. P0/P1/P2 文档落盘（本文件 + 三阶段文档）。
2. `lib/core/network/`：`api_config` / `auth_token_store` / `api_envelope` / `dio_client`；`app_exception` 增补 `ApiException`。
3. `lib/features/*`：auth 接入（`RemoteAuthRepository` + 会话恢复）与 me/dashboard/quiz/mistakes/schools/flashcards 仓储 + 模型。
4. UI：登录页文案与后端对齐、仪表盘统计卡接 `GET /dashboard/summary`、`top_app_bar` 可空兜底。
5. 平台：macOS entitlements 补 `network.client`；pubspec 增 `shared_preferences`。
6. 测试：`test/helpers/test_overrides.dart` 统一 Fake Override；新增 `test/user_api_repositories_test.dart`；修补既有 UI 测试。
7. `flutter analyze` + `flutter test` 通过后写 P3 验证单与 `changed-files.md`。

## 5. 验收

见 `docs/p0-definition/flutter-user-api-integration/definition.md` §4；执行结果记录于 `docs/p3-verification/flutter-user-api-integration/verification.md`。
