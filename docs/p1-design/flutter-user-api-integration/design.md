# P1 - Flutter 用户端接口接入设计（flutter-user-api-integration）

> 日期：2026-09-26
> 上游：`docs/p0-definition/flutter-user-api-integration/definition.md`
> 契约来源：`docs/p1-design/next-backend-api-rbac/api-contract.md`（用户端 §3~§10）

## 1. 分层与数据流

```
UI (ConsumerWidget)
  ↓ ref.watch
Notifier / AsyncNotifier (Riverpod)
  ↓
Repository (纯 Dart，注入 DioClient；DTO→领域模型映射)
  ↓
DioClient (单例；Bearer 拦截器、envelope 解包、401 刷新重放、AppException 映射)
  ↓
用户后端 /api/v1/*（Next.js；Flutter 永不请求 /api/v1/admin/*）
```

## 2. ADR 决策记录

### ADR-1：基址与请求头约定
- `ApiConfig.baseUrl` 默认 `http://localhost:3000/api/v1`，可用 `--dart-define=API_BASE_URL=...` 覆盖（生产环境注入 HTTPS 域名）。
- Flutter 不使用 Cookie：`Authorization: Bearer <accessToken>`（契约 §3.3）。
- 统一 `Content-Type: application/json`；列表分页走 `page/pageSize` query。

### ADR-2：envelope 解包收敛在 DioClient
- 后端统一返回 `{success, data, meta}` / `{success:false, error:{code,message,details}, meta}`。
- `DioClient.get/post/patch/delete` 成功时返回 `ApiClientResponse{data, pagination}`（`pagination` 取自 `meta.pagination`）。
- 失败时映射：
  - 401 `AUTH_REQUIRED` / `TOKEN_EXPIRED` → `AuthException`
  - 403 `USER_BANNED` / `ADMIN_REQUIRED` → `AuthException`
  - 连接类 `DioException`（timeout/connectionError）→ `NetworkException`
  - 其余业务码 → 新增 `ApiException extends AppException`（携带稳定业务码与 HTTP 状态）

### ADR-3：401 单飞刷新与重放
- 拦截 `TOKEN_EXPIRED` 时，以 `refreshToken` 调 `POST /auth/refresh` 换新 token 对并落盘，随后重放原请求（仅重放一次）。
- 并发 401 共享同一次刷新（单飞 Future 防重复刷新）；`REFRESH_INVALID` 清空凭证并抛 `AuthException`。
- `logout` 为尽力而为：调用 `POST /auth/logout` 后无论成败都清空本地凭证。

### ADR-4：Token 存储
- 抽象 `AuthTokenStore`（`readAccessToken/readRefreshToken/save/clear`），默认实现 `SharedPrefsAuthTokenStore`（新增 `shared_preferences` 依赖），测试用 `MemoryAuthTokenStore`。
- `main()` 中 `WidgetsFlutterBinding.ensureInitialized()`；读取为懒加载 Future 缓存，拦截器内 await。

### ADR-5：登录方式与 UI 对齐契约
- 验证码登录：`POST /auth/send-code {email, purpose:"login"}` + `POST /auth/login/code {email, code, clientType:"flutter"}`；响应 `{accessToken, refreshToken, expiresIn, tokenType, user, permissions}`。
- 密码登录：客户端快速失败（契约 AUTH-03 明确 Flutter 未开放），提示"邮箱密码登录暂未开放，请使用验证码登录"，不发无效请求。
- 登录页输入框与测试账号 Chip 改为邮箱语义（`user@example.com` 示例）；发送成功提示改为"请前往邮箱查收"。
- 会话恢复：`AuthNotifier.build()` 触发 `_restore()`，`isRestoring=true` 期间路由不强制跳登录；恢复成功恢复用户态，失败清态跳登录。

### ADR-6：Repository 拆分与模型
按后端模块一一对应（均为 `lib/features/<m>/data/` + `domain/`）：

| Repository | 方法（契约 ID） | 领域模型 |
|---|---|---|
| `AuthRepository`（既有抽象保留 + 新增 `RemoteAuthRepository`） | sendCode/sendCode(AUTH-01)、loginWithCode(AUTH-02)、refresh、logout(AUTH-06)、restoreSession(AUTH-07) | `UserModel`（target 字段改可空） |
| `MeRepository` | getMe(ME-01)、updateProfile(ME-02)、getTargets(ME-03)、updateTargets(ME-04) | `MeProfile`、`TargetSchool` |
| `DashboardRepository` | getSummary(DASH-01) | `DashboardSummary` |
| `QuizRepository` | listQuestions(QUIZ-01)、getQuestion(QUIZ-02)、answerQuestion(QUIZ-03)、createQuestion(QUIZ-04)、updateQuestion(QUIZ-05)、deleteQuestion(QUIZ-06) | `QuestionSummary`、`QuestionDetail`、`AnswerResult`、`QuestionOption` |
| `MistakesRepository` | listMistakes(MIS-01)、getMistake(MIS-02)、redoMistake(MIS-03)、updateStatus(MIS-04)、deleteMistake(MIS-05) | `MistakeRecord`、`MistakeDetail`、`RedoResult` |
| `SchoolsRepository` | listSchools(SCH-01)、getSchool(SCH-02)、listPrograms(SCH-03)、addTarget(SCH-04)、removeTarget(SCH-05) | `SchoolSummary`、`SchoolDetail`、`SchoolProgram` |
| `FlashcardsRepository` | listDue(FC-01)、listCards(FC-02)、createCard(FC-03)、reviewCard(FC-04)、listCheckIns(FC-05) | `Flashcard`、`DueCard`、`DueList`、`ReviewResult`、`CheckInRecord` |

- 列表方法返回 `PagedResult<T>{items, page, pageSize, total, totalPages}`。
- `attemptId`（QUIZ-03）/`idempotencyKey`（FC-04）由客户端生成 UUID 传入。
- JSON 解析全部手写 `fromJson`（与现有工程一致，不引入代码生成器）。

### ADR-7：Provider 组装与测试策略
- `dioClientProvider`（依赖 `authTokenStoreProvider`）；`authRepositoryProvider` 默认切 `RemoteAuthRepository`，测试用 `FakeAuthRepository` Override（沿用既有闭环测试）。
- `dashboardSummaryProvider = AsyncNotifierProvider<DashboardSummaryNotifier, DashboardSummary?>`：拉取失败保持旧值/`null`，UI 显示 `--`，不弹全局错误。
- 单元测试：`ApiClientResponse`/envelope 解析、`DioException` 映射、各 Repository `fromJson` 映射与业务码透传（Fake DioClient 注入）；UI 测试 Override Fake 仓储。

## 3. 明确不做
- `/api/v1/admin/*` 一律不接；不实现 AI SSE；不做 quiz/mistakes/schools/flashcards 视图的完整数据绑定（留给后续任务，仓储已就绪）。
