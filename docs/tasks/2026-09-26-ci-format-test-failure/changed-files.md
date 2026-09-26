# 变更文件清单

## 本会话直接修改

| 文件 | 说明 |
| --- | --- |
| `lib/ui/features/quiz/quiz_view.dart` | 修复 `AnimatedCrossFade.secondChild` 中 `result!` 空断言崩溃：`result == null` 时渲染 `SizedBox.shrink()`，并移除类型提升后多余的 `!`（该修复被并行会话吸收进提交 `34faee0`） |
| 11 个 Dart 文件（`dart format .`） | CI 格式检查失败的直接原因：providers/views/test_overrides 等文件按 dart format 规范重排（随提交 `34faee0` 落库） |
| `docs/tasks/2026-09-26-ci-format-test-failure/plan.md` | 本任务计划与决策记录 |
| `docs/tasks/2026-09-26-ci-format-test-failure/changed-files.md` | 本清单 |

## 并行会话相关提交（本会话验证通过）

| 提交 | 说明 |
| --- | --- |
| `34faee0` | 格式化 11 文件、视图/Provider 简化、业务模块测试改为 Fake 仓储驱动、临时调试文件（后被删除） |
| `4aa340d` | 移除 `school_row_item.dart` 的 debugPrint、business_modules_test 对话框作用域定位与双击超时 pump、重写 `schools_mobile_test.dart` 适配真实数据绑定、Fake 补充 ecnu 专业数据 |
| `3f2df81` | 补充业务视图数据绑定验证单文档 |

## 未修改（仅本地验证）

- `.github/workflows/ci.yml` — 未改动，失败原因在代码与测试侧。
