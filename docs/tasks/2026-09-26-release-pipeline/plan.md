# 2026-09-26 · 全平台自动发版流水线

## 1. 原始诉求

> 流水线在每次更新版本的时候自动发版本，构建 apk、exe、dmg、ios 系统的安装包，只构建 flutter 项目的，不要构建 admin 文件夹内的安装包；另外考虑要不要将 flutter 和 admin 变成 monorepo 架构。

拆解为四个需求：

1. **自动触发**：更新 `pubspec.yaml` 中的 `version` 后推送即自动发版，不需要手动打 tag。
2. **产物矩阵**：Android APK、Windows EXE（便携 zip）、macOS DMG、iOS IPA。
3. **范围隔离**：只构建根目录 Flutter 应用，`admin/`（Next.js 后台，部署型服务，无安装包）不参与发版。
4. **架构评估**：是否需要引入 monorepo 工具链。

> 本任务为 CI/CD 基础设施变更，不涉及业务功能代码，不适用 `docs/p0~p3` 流程；按守则以 `docs/tasks/` 落盘。

## 2. 决策论证

### 2.1 触发机制：监听 pubspec.yaml 而非手动 tag

- 现状：`cd.yml` 要求手动 `git tag v*` 推送才发版，与"更新版本即发版"的诉求不符。
- 方案：`release.yml` 监听 `push → main` 且 `paths: ['pubspec.yaml']`；首 Job 读取 `version:` 字段，远端已存在 `v<version>` tag 则跳过（幂等护栏），否则四平台构建后由 `softprops/action-gh-release` 以当前 SHA 自动建 tag 并发 Release。
- 取舍：版本号未变但依赖变更的提交也会命中 paths 过滤，由 tag 幂等护栏兜底跳过，代价仅一个轻量检查 Job。

### 2.2 产物矩阵

| 平台 | Runner | 命令 | 打包 | 说明 |
| --- | --- | --- | --- | --- |
| Android | ubuntu-latest | `flutter build apk --release` | 直接上传 apk | 通用架构包，沿用现有 cd.yml 逻辑 |
| Windows | windows-latest | `flutter build windows --release` | Release 目录压缩为 zip | 便携版 exe；如需向导式安装器后续可加 Inno Setup |
| macOS | macos-latest | `flutter build macos --release` | `hdiutil create -format UDZO` 打 DMG | 未签名，用户首次打开需右键 → 打开绕过 Gatekeeper |
| iOS | macos-latest | `flutter build ipa --release --no-codesign` | Payload 目录压缩为 .ipa | 无 Apple 开发者证书，只能侧载（Sideloadly/AltStore 等）；后续接入证书后改正式签名 |

### 2.3 环境注入（关键坑）

`lib/core/network/api_config.dart` 通过 `--dart-define=API_BASE_URL` 注入后端地址，编译期默认值为 `http://localhost:3001/api/v1`。若 CI 直接构建，安装包将指向 localhost 导致联调失败。

方案：构建前读取仓库 **Variables（非 Secret）** `API_BASE_URL`（Settings → Secrets and variables → Actions → Variables），存在则追加 `--dart-define=API_BASE_URL=<值>`，不存在则用代码默认值。URL 非机密信息，用 Variables 便于查看与修改。

### 2.4 cd.yml 职责收缩（防重复发版）

若保留 cd.yml 的 tag 触发 + Android 构建 + Release 发布，`release.yml` 自动创建 tag 后会再次命中 cd.yml，导致重复构建与重复 Release。因此：

- `cd.yml` 收缩为纯 Web 部署：仅 `push → main` 与手动触发，部署 GitHub Pages；移除 tag 触发、`build-android`、`create-release` 与 web zip 打包步骤。
- `ci.yml` 增加 `paths-ignore: ['admin/**']`，admin 变更不再空跑 Flutter CI。

### 2.5 monorepo 评估结论

仓库现状（根目录 Flutter + `admin/` 子目录）**本身就是 monorepo**，无需"变成"。是否引入 pnpm workspace / Turborepo / changesets 等工具链的判断：

- 两端技术栈完全独立（Dart vs Node），当前零共享代码，无 workspace 收益；
- 发布节奏不同：App 跟随 `pubspec.yaml` 版本发安装包，admin 是部署型服务，不产安装包；
- CI 隔离已通过 paths 过滤实现。

**结论：维持现状，不引入 monorepo 工具链。** 未来若 App 与 admin 需要共享 API DTO/类型，再抽取 `packages/` 共享层即可，届时不晚。

## 3. 落地计划

1. 新建 `.github/workflows/release.yml`：version-check → 四平台并行构建 → 汇总发 Release（自动建 tag `v<version>`）。
2. 收缩 `.github/workflows/cd.yml` 为纯 Web Pages 部署。
3. `.github/workflows/ci.yml` 增加 `paths-ignore: ['admin/**']`。
4. 本任务文档落盘（plan.md / changed-files.md）。
5. 验证：YAML 语法校验；Dart 代码零改动，不适用 `flutter analyze / test` 门禁（CI 中已有同门禁兜底）。

## 4. 发版操作方式（结果）

```text
# 日常发版（只需两步）
1. 修改 pubspec.yaml → version: 1.1.0+2
2. 推送到 main（或合入 main）
# → 自动产出 tag v1.1.0 + Release：apk / windows.zip / macos.dmg / ios.ipa

# 可选：仓库 Variables 配置 API_BASE_URL，安装包将注入生产后端地址
```
