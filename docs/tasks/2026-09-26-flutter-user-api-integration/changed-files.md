# 变更清单：Flutter 用户端接口接入（flutter-user-api-integration）

> 日期：2026-09-26
> 关联：`plan.md`；上游 P0/P1/P2/P3 文档见 `docs/p0-definition/flutter-user-api-integration/` 等四阶段目录

## 文档

| 文件 | 操作 | 说明 |
|---|---|---|
| `docs/p0-definition/flutter-user-api-integration/definition.md` | 新建 | 痛点、场景、范围边界（明确排除 `/admin/*`）、验收指标 |
| `docs/p1-design/flutter-user-api-integration/design.md` | 新建 | 分层设计与 ADR-1~7（基址/envelope 收敛/单飞刷新/Token 存储/登录方式/仓储拆分/测试策略） |
| `docs/p2-development/flutter-user-api-integration/development.md` | 新建 | 原子任务顺序与 6 项编码实际决策 |
| `docs/p3-verification/flutter-user-api-integration/verification.md` | 新建 | analyze/test 结果、真实后端冒烟、存量测试修复记录 |
| `docs/tasks/2026-09-26-flutter-user-api-integration/plan.md` | 新建 | 诉求、调研结论、决策论证、落地计划 |
| `docs/tasks/2026-09-26-flutter-user-api-integration/changed-files.md` | 新建 | 本清单 |

## 代码：网络地基（lib/core/）

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/core/errors/app_exception.dart` | 修改 | 新增 `ApiException`（携带业务码与 HTTP 状态） |
| `lib/core/network/api_config.dart` | 新建 | 基址 `http://localhost:3001/api/v1`，支持 `--dart-define=API_BASE_URL` 覆盖；注明不连 `/admin/*` |
| `lib/core/network/auth_token_store.dart` | 新建 | Token 存储契约 + `MemoryAuthTokenStore`（测试用） |
| `lib/core/network/shared_prefs_auth_token_store.dart` | 新建 | `shared_preferences` 持久化实现 |
| `lib/core/network/api_envelope.dart` | 新建 | envelope 解析（data/pagination/错误码→AppException） |
| `lib/core/network/dio_client.dart` | 新建 | Dio 封装：Bearer 注入、envelope 解包、401 `TOKEN_EXPIRED` 单飞刷新并重放、`DioException`→AppException 映射 |
| `lib/core/network/network_providers.dart` | 新建 | `authTokenStoreProvider` / `dioClientProvider` |

## 代码：Auth 模块

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/features/auth/domain/user_model.dart` | 修改 | 目标院校/倒计时字段改可空（登录响应不含，由 dashboard 下发） |
| `lib/features/auth/data/auth_repository.dart` | 修改 | 抽象新增 `restoreSession`；新增 `RemoteAuthRepository`（send-code/login(code,clientType=flutter)/logout/session）；默认 Provider 切远程；密码登录按契约快速失败 |
| `lib/features/auth/presentation/auth_notifier.dart` | 修改 | `AuthState` 新增 `isRestoring`；启动恢复登录态 |
| `lib/features/auth/presentation/widgets/auth_glass_card.dart` | 修改 | 文案对齐邮箱验证码契约（提示语、示例邮箱 Chip、发送成功提示） |

## 代码：业务模块仓储（数据层就绪，UI 待后续接入）

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/features/shared/paged_result.dart` | 新建 | 通用分页结果（复用 envelope `meta.pagination`） |
| `lib/features/me/domain/me_models.dart` + `data/me_repository.dart` | 新建 | ME-01~04（档案/目标院校） |
| `lib/features/dashboard/domain/dashboard_summary.dart` + `data/dashboard_repository.dart` | 新建 | DASH-01（含 `DashboardSummary.mock`） |
| `lib/features/quiz/domain/question_models.dart` + `data/quiz_repository.dart` | 新建 | QUIZ-01~06（题目不含答案，attemptId 幂等提交） |
| `lib/features/mistakes/domain/mistake_models.dart` + `data/mistakes_repository.dart` | 新建 | MIS-01~05（错题状态机/重做） |
| `lib/features/schools/domain/school_models.dart` + `data/schools_repository.dart` | 新建 | SCH-01~05（筛选/详情/专业/目标增删） |
| `lib/features/flashcards/domain/flashcard_models.dart` + `data/flashcards_repository.dart` | 新建 | FC-01~05（到期队列/SM-2 复习/打卡） |

## 代码：UI 接入

| 文件 | 操作 | 说明 |
|---|---|---|
| `lib/features/dashboard/presentation/dashboard_notifier.dart` | 新建 | `dashboardSummaryProvider`（未登录返回 null，登录后自动拉取） |
| `lib/ui/features/dashboard/dashboard_view.dart` | 修改 | 改 ConsumerWidget，统计卡接真实聚合（加载/失败显示 `--`） |
| `lib/ui/features/dashboard/widgets/stat_card.dart` | 修改 | `value` 支持可空展示 `--` 占位 |
| `lib/ui/shell/widgets/top_app_bar.dart` | 修改 | 目标院校/倒计时可空兜底（真实字段缺失时显示引导文案） |

## 平台与依赖

| 文件 | 操作 | 说明 |
|---|---|---|
| `pubspec.yaml` | 修改 | 新增 `shared_preferences: ^2.3.2` |
| `macos/Runner/DebugProfile.entitlements`、`Release.entitlements` | 修改 | 补 `com.apple.security.network.client`（沙箱出站网络） |
| `android/app/src/main/AndroidManifest.xml` | 修改 | 补 `INTERNET` 权限 |
| `lib/main.dart` | 修改 | `WidgetsFlutterBinding.ensureInitialized()` |
| `pubspec.lock` | 更新 | `flutter pub get` 产物 |

## 测试

| 文件 | 操作 | 说明 |
|---|---|---|
| `test/helpers/test_overrides.dart` | 新建 | 统一 Override：Fake 仓储 + 内存 TokenStore + Fake 仪表盘仓储 |
| `test/user_api_repositories_test.dart` | 新建 | envelope 解析、异常映射、Auth 仓储契约、各模块仓储映射、401 刷新重放端到端（脚本适配器）共 17 用例 |
| `test/auth_login_test.dart` | 修改 | Override 注入；"填入测试账号"→"填入示例邮箱"（user@example.com） |
| `test/widget_test.dart`、`test/router_test.dart`、`test/rest_module_test.dart` | 修改 | 注入统一 Override（隔离真实网络）；达成率卡片改名"待复习卡片" |
| `test/schools_mobile_test.dart`、`test/business_modules_test.dart` | 修改 | 修复 `a8f423a` 遗留的 4 个存量失败（双击判定超时 `pump(350ms)`、重复标签 `findsWidgets`、筛选 Chip `.first` 定位），详见 P3 §5 |

## 验证结果

- `flutter analyze`：0 问题；`flutter test`：43/43 通过（详见 P3 验证单）。
- 真实后端（localhost:3001）冒烟：envelope/错误码与 DioClient 解析一致；未调用任何 `/admin/*` 接口。
