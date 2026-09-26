# 2026-09-26 · 全平台自动发版流水线 · 变更文件清单

## 新建

| 文件 | 说明 |
| --- | --- |
| `.github/workflows/release.yml` | 发版流水线：main 上 `pubspec.yaml` 版本变更 → 幂等护栏（tag 已存在则跳过）→ Android APK / Windows zip / macOS DMG / iOS 未签名 IPA 四平台并行构建 → 自动建 tag `v<version>` 并发布 GitHub Release（含 release notes）。支持仓库 Variable `API_BASE_URL` 注入生产后端地址。 |
| `docs/tasks/2026-09-26-release-pipeline/plan.md` | 任务决策与方案文档。 |
| `docs/tasks/2026-09-26-release-pipeline/changed-files.md` | 本清单。 |

## 修改

| 文件 | 变更 | 原因 |
| --- | --- | --- |
| `.github/workflows/cd.yml` | 移除 tag 触发、`build-android`、`create-release` 与 web zip 打包步骤；收缩为纯 Web GitHub Pages 部署（push main / 手动触发）。 | 避免 `release.yml` 自动建 tag 后再次命中 cd.yml，产生重复构建与重复 Release。 |
| `.github/workflows/ci.yml` | push / pull_request 增加 `paths-ignore: ['admin/**', 'docs/**', '**.md']`。 | admin、文档变更不再空跑 Flutter CI。 |

## 删除 / 移动

无。

## 未改动说明

- Dart / Flutter 业务代码零改动，`flutter analyze` / `flutter test` 门禁无新增风险（CI 已有同门禁兜底）。
- `admin/` 不产安装包，不纳入发版矩阵；monorepo 工具链评估结论为"维持现状"，见 plan.md §2.5。
