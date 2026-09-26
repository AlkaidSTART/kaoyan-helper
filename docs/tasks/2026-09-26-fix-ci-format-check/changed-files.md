# 2026-09-26 修复 CI 格式检查失败 — 文件变更清单

## 本次任务修改（dart format 就地格式化，共 18 个文件，纯换行重排，无语义变更）

| 文件 | 说明 |
| --- | --- |
| lib/core/network/api_envelope.dart | 格式化 |
| lib/core/network/auth_token_store.dart | 格式化 |
| lib/core/network/dio_client.dart | 格式化 |
| lib/core/network/shared_prefs_auth_token_store.dart | 格式化 |
| lib/core/router/app_router.dart | 格式化 |
| lib/features/auth/data/auth_repository.dart | 格式化 |
| lib/features/auth/presentation/widgets/auth_glass_card.dart | 格式化 |
| lib/features/dashboard/data/dashboard_repository.dart | 格式化 |
| lib/features/dashboard/domain/dashboard_summary.dart | 格式化 |
| lib/features/flashcards/domain/flashcard_models.dart | 格式化 |
| lib/features/me/domain/me_models.dart | 格式化 |
| lib/features/quiz/data/quiz_repository.dart | 格式化 |
| lib/features/schools/data/schools_repository.dart | 格式化 |
| lib/ui/features/schools/schools_view.dart | 格式化 |
| lib/ui/features/schools/widgets/school_row_item.dart | 格式化 |
| test/helpers/test_overrides.dart | 格式化 |
| test/router_test.dart | 格式化 |
| test/user_api_repositories_test.dart | 格式化 |

## 本次任务新建

| 文件 | 说明 |
| --- | --- |
| docs/tasks/2026-09-26-fix-ci-format-check/plan.md | 任务计划与验证记录 |
| docs/tasks/2026-09-26-fix-ci-format-check/changed-files.md | 本清单 |

## 备注

工作区中与本次格式化无关的其他未提交改动（admin/*、api_config.dart、business_modules_test.dart、schools_mobile_test.dart、docs/p1-design/* 等）为用户进行中的工作，本次未触碰；其中 Dart 文件已满足 dart format 检查（全仓复跑 exit 0）。
