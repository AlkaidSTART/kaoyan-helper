# P0 - Flutter 用户端接口接入（flutter-user-api-integration）

> 日期：2026-09-26
> 状态：已定义
> 上游契约：`docs/p1-design/next-backend-api-rbac/api-contract.md`

## 1. 真实痛点

- Flutter 端（登科 App）目前 `authRepositoryProvider` 默认返回 `FakeAuthRepository`，登录、业务数据全部为前端 Mock，未连接任何后端。
- 后端已实现 58 个接口中的用户端部分（Auth / Me / Dashboard / Quiz / Mistakes / Schools / Flashcards / AI），Flutter 与后端是"断开"状态。
- 管理端接口（`/api/v1/admin/*`）属于管理后台专用（Cookie 会话 + `admin:xxx` 权限点），App 不得误连。

## 2. 用户场景

- 考研用户在 App 输入邮箱 → 收验证码 → 登录成功后进入自习室，看到真实的倒计时、今日刷题、连续打卡等数据。
- App 重启后若凭证仍有效，自动恢复登录态，无需重复验证码登录。

## 3. 范围边界

| 范围内 | 范围外 |
|---|---|
| DioClient 网络层（envelope 解包、Bearer 注入、401 刷新重放、AppException 映射） | AI SSE 流式接口（`/ai/chat`、`/ai/explain`，后续单独排期） |
| Auth 用户端接入：send-code / login(code, clientType=flutter) / refresh / logout / session | OAuth 扩展流程（AUTH-04，契约标注 MVP 扩展项） |
| 各用户端模块 Repository + 领域模型（me / dashboard / questions / mistakes / schools / flashcards、check-ins） | quiz / mistakes / schools / flashcards 四个视图的完整 UI 数据绑定改造（本期仅接仪表盘作端到端验证） |
| 登录页提示文案与后端契约对齐（邮箱验证码） | 管理端 `/admin/*` 接口（明确排除，App 永不调用） |
| macOS 沙箱出站网络 entitlement、`shared_preferences` 依赖 | 密码登录（契约 AUTH-03：Flutter 密码登录未开放，返回 422 `PROVIDER_UNSUPPORTED`） |

## 4. 验收指标

1. 登录页使用真实邮箱验证码流程：`POST /auth/send-code` → `POST /auth/login/code`（`clientType:"flutter"`），成功后持有 Bearer Token 进入主页。
2. 密码登录 Tab 提交时得到契约一致的友好提示（`PROVIDER_UNSUPPORTED` → "邮箱密码登录暂未开放"），不产生无效网络请求。
3. 启动时若有本地 Token，调用 `GET /auth/session` 恢复登录态；`TOKEN_EXPIRED` 自动刷新并重放原请求；`REFRESH_INVALID` 清凭证回登录页。
4. 所有响应按 envelope 解析：`success=true` 取 `data` + `meta.pagination`；`success=false` 映射为强类型 `AppException`（严禁裸抛 `DioException`）。
5. 仪表盘统计卡（倒计时/今日刷题/待复习卡片/连续打卡/目标院校）读取 `GET /dashboard/summary` 真实数据，加载或失败时显示 `--` 占位，不崩溃。
6. `flutter analyze` 零 warning、`flutter test` 全部通过；既有 UI 测试通过 Provider Override 注入 Fake 仓储保持闭环。
