# 2026-09-26 CI 格式检查失败诊断与修复

## 原始诉求

CI Pipeline（`.github/workflows/ci.yml`）在 dev 分支推送后失败，退出码 1。失败步骤输出：

```
Changed lib/features/flashcards/presentation/flashcards_providers.dart
...
Formatted 70 files (11 changed) in 0.32 seconds.
Error: Process completed with exit code 1.
```

## 决策论证

1. **定位失败步骤**：CI 第一步校验 `dart format --output=none --set-exit-if-changed .`，
   输出 "Formatted 70 files (11 changed)" 与退出码 1 完全吻合 —— 提交中含未格式化文件。
2. **本地复现**：`dart format .` 确认同样 11 个文件需格式化；`flutter analyze --fatal-infos`
   通过；`flutter test` 暴露 8 个用例失败（业务视图真实数据绑定后，测试仍基于旧 Mock 断言）。
3. **发现真实代码缺陷**：`quiz_view.dart` 中 `AnimatedCrossFade.secondChild` 直接
   `result!` 解引用。`AnimatedCrossFade` 会同时构建两个子树，即使 `crossFadeState`
   为 showFirst，`result == null`（每道新题的初始态）也会触发空断言崩溃。
   修复：ternary 守卫 + 移除多余的 `!`（Dart 流分析类型提升）。
4. **并行会话协同**：诊断期间检测到另一会话在同目录迭代同一批修复（providers/views/
   测试/调试文件）。本会话的 quiz_view 修复与格式化结果被其吸收进提交 `34faee0`；
   其后续提交 `4aa340d`（重写 schools_mobile_test、移除 debugPrint、补充 ecnu Fake 数据）
   与 `3f2df81`（验证单文档）完成剩余修复。
5. **最终验证**：在干净工作树上完整执行 CI 三步，全部通过。

## 落地结果

- `dart format --output=none --set-exit-if-changed .` → 0 changed ✅
- `flutter analyze --fatal-infos` → No issues found ✅
- `flutter test --coverage` → All 43 tests passed ✅

## 遗留事项

- dev 分支领先 origin/dev 3 个提交（34faee0 / 4aa340d / 3f2df81），待推送后 CI 应转绿。
- `SubjectLabels._types` 与后端题型枚举存在漂移：后端为
  `single_choice | multiple_choice | judge | fill_blank`，前端映射表缺
  `multiple_choice`（误写 `multi_choice`）与 `judge`，未知值会原样透出英文。
  建议后续任务对齐。
