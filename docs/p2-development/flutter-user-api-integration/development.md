# P2 - Flutter 用户端接口接入开发记录（flutter-user-api-integration）

> 日期：2026-09-26
> 上游：`docs/p1-design/flutter-user-api-integration/design.md`

## 1. 原子任务与依赖顺序

1. **网络地基**（无依赖）：`app_exception.dart` 增补 `ApiException` → `api_config.dart` → `auth_token_store.dart` → `api_envelope.dart` → `dio_client.dart`
2. **Auth 仓储**（依赖 1）：`RemoteAuthRepository` + `auth_notifier` 会话恢复
3. **业务仓储**（依赖 1，可并行）：me / dashboard / quiz / mistakes / schools / flashcards
4. **UI 接入**（依赖 2/3）：登录页文案对齐、仪表盘 AsyncNotifier 绑定、`top_app_bar` 可空兜底
5. **平台配置**：macOS entitlements（Debug/Release `network.client`）、`pubspec.yaml` + `shared_preferences`
6. **测试与验证**：新增仓储单测、既有测试 Override 修补 → `flutter analyze` + `flutter test` → P3 落盘

## 2. 编码中的实际问题与决策

### 问题 1：测试默认仓储会发起真实网络
- 既有 `test/auth_login_test.dart` 等直接 `ProviderScope(child: MyApp())`，依赖默认 `FakeAuthRepository`。
- 决策：默认 Provider 切 `RemoteAuthRepository` 后，为所有 UI 测试统一注入 `FakeAuthRepository` + `MemoryAuthTokenStore` Override（新增 `test/helpers/test_overrides.dart`），保持测试闭环且无网络。

### 问题 2：启动恢复登录态的路由闪烁
- 若恢复期间路由按"未登录"跳转，会出现 主页→登录→主页 闪跳。
- 决策：`AuthState` 增加 `isRestoring`（初始 true），`RouterNotifier.redirect` 在恢复期间不强制跳登录；恢复完成后按结果收敛。

### 问题 3：`UserModel` 领域字段与真实后端不符
- 旧模型 `targetSchool/targetMajor/daysUntilExam` 为必填，登录响应（契约 §3.2）并不包含这些字段。
- 决策：改为可空 + UI 兜底文案；`UserModel.mock` 保留用于测试与空态展示。

### 问题 4：今日达成率没有后端字段
- `GET /dashboard/summary` 无"达成率"口径（需自设目标，后端不下发）。
- 决策：该卡改展示真实字段"待复习卡片 dueCardCount"，不虚构后端能力。

### 问题 5：macOS 沙箱默认禁止出站连接
- `macos/Runner/*.entitlements` 缺 `com.apple.security.network.client`，加依赖也无法联网。
- 决策：DebugProfile 与 Release entitlements 均补齐该键。

### 问题 6：密码登录 Tab 的处理
- 契约 AUTH-03：Flutter 密码登录返回 422 `PROVIDER_UNSUPPORTED`。
- 决策：客户端快速失败并提示，避免无效往返；保留 Tab 供后续开放。

## 3. 提交拆分
- 单次交付：网络地基 + 仓储 + UI + 平台配置 + 测试（同一 feature 分支内完成，`changed-files.md` 记录全量清单）。
