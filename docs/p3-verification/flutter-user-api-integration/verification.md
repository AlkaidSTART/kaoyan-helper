# P3 - Flutter 用户端接口接入验证单（flutter-user-api-integration）

> 日期：2026-09-26
> 执行环境：macOS (arm64) / Flutter SDK 3.x / dev 分支

## 1. 静态检查

| 命令 | 结果 |
|---|---|
| `flutter analyze` | ✅ No issues found!（0 error / 0 warning / 0 info） |
| `flutter test` | ✅ 43 / 43 全部通过 |

## 2. 单元 / 组件测试用例

| 用例 | 结果 | 说明 |
|---|---|---|
| envelope 解析：成功（data+pagination）/ 非法结构 | ✅ | `ApiEnvelopeParser` |
| envelope 错误映射：401→AuthException、422 业务码→ApiException、非 envelope 回退 | ✅ | 稳定业务码原样透传 |
| RemoteAuthRepository：登录（clientType=flutter、邮箱规范化、Token 落盘） | ✅ | Fake DioClient 注入 |
| 非法邮箱快速失败（无网络请求）；密码登录快速失败（AUTH-03 `PROVIDER_UNSUPPORTED`） | ✅ | 契约一致性 |
| send-code 请求体（purpose=login）；restoreSession 有/无凭证/凭证失效清理 | ✅ | AUTH-01/07 |
| logout 服务端失败仍清空本地凭证 | ✅ | AUTH-06 幂等语义 |
| Dashboard/Quiz/Mistakes/Schools/Flashcards/Me 仓储映射与请求体 | ✅ | attemptId、idempotencyKey 由客户端生成 |
| DioClient 401 单飞刷新 + 重放原请求（脚本适配器端到端） | ✅ | 新 token 对落盘、refresh 请求携带旧 refreshToken |
| 刷新不可恢复（REFRESH_INVALID）→ 清凭证并抛 `AuthException` | ✅ | |
| 既有登录闭环（登录→主页→退出→回登录页） | ✅ | Fake 仓储 Override，无真实网络 |
| 仪表盘/路由/AI 面板/休息/择校/闪卡 UI 测试 | ✅ | |

## 3. 真实后端冒烟（localhost:3001，只读无副作用）

| 验证项 | 结果 |
|---|---|
| `POST /api/v1/auth/login/code`（错误验证码） | ✅ 返回 `{success:false, error:{code:"EMAIL_CODE_INVALID",...}, meta:{requestId,timestamp}}`，与 DioClient 解析契约一致 |
| `GET /api/v1/dashboard/summary`（无 Token） | ✅ `AUTH_REQUIRED`，AuthException 映射路径正确 |
| `GET /api/v1/admin/dashboard`（匿名） | ✅ 服务端拒绝（`AUTH_REQUIRED`）；App 侧亦无任何调用 `/admin/*` 的代码路径 |

## 4. 多端配置验收

| 项 | 结果 |
|---|---|
| macOS Debug/Release entitlements `com.apple.security.network.client` | ✅ 已补齐（沙箱出站放行） |
| Android `INTERNET` 权限（main） | ✅ 已补齐 |
| `shared_preferences` 依赖 | ✅ 已加入并 `flutter pub get` 通过 |
| 默认基址 3001 + `--dart-define=API_BASE_URL` 覆盖 | ✅ |

## 5. 存量问题修复（非本任务引入，阻塞测试门禁，一并修复）

`a8f423a`（择校模块触屏交互）提交后 4 个测试未同步更新，在 dev HEAD 上即失败：

1. `Mobile 390x844`：浙江大学与苏州大学专业标签重复 → `findsWidgets`。
2. `Single tap expands`：卡片新增 `onDoubleTap` 后单击需等待约 300ms 双击判定，测试补 `pump(350ms)`。
3. `Tag horizontal scroll`：卡片标签与筛选栏文案重复 → `find.text('211').first`。
4. `business_modules SchoolsView`：同 2，补 `pump(350ms)`。

## 6. 已知边界（后续任务）

- quiz / mistakes / schools / flashcards 视图仍为静态内容，仓储已就绪待接。
- AI SSE（`/ai/chat`、`/ai/explain`）与 OAuth 未接入（契约标注扩展项）。
- 启动会话恢复依赖网络可达；离线启动会回到登录页（Token 保留，下次登录后仍有效）。
