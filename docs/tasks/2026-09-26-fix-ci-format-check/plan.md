# 2026-09-26 修复 CI 格式检查失败

## 原始诉求

CI Pipeline（push 到 dev）在 "Verify Code Formatting" 步骤失败：

```
Changed lib/core/network/api_envelope.dart
...（共 18 个文件）
Formatted 64 files (18 changed) in 0.30 seconds.
Error: Process completed with exit code 1.
```

## 决策论证

1. CI 步骤命令为 `dart format --output=none --set-exit-if-changed .`（.github/workflows/ci.yml:38），退出码 1 表示存在未按 dart format 标准格式化的文件。
2. 本地 `dart format --output=none --set-exit-if-changed .` 复现结果与 CI 完全一致（同样 18 个文件），排除 SDK 版本差异（本地 Dart 3.11.0 / Flutter 3.41.2 stable，CI 为 stable 频道），结论是代码本身未格式化。
3. 修复方式：执行 `dart format .` 就地格式化。抽查 diff 确认全部为 tall style 换行重排（含尾随逗号），无任何语义变更，不违反最小改动原则。

## 落地计划

1. `dart format .` 格式化 18 个文件。
2. 复跑 `dart format --output=none --set-exit-if-changed .` 确认退出码 0。
3. 执行 `flutter analyze --fatal-infos` 与 `flutter test --coverage`（与 CI 命令一致）验证通过。

## 验证结果

- `dart format --set-exit-if-changed .`：exit 0 ✅
- `flutter analyze --fatal-infos`：No issues found ✅
- `flutter test --coverage`：All 43 tests passed ✅

## 后续

- 本次格式化改动需随 dev 分支提交推送后 CI 才会转绿（用户工作区另有其他进行中的改动，需一并提交）。
