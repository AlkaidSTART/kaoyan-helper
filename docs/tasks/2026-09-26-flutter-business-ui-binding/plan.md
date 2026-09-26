# 任务计划：业务视图真实数据绑定（flutter-business-ui-binding）

> 日期：2026-09-26
> 分支：dev
> 前置任务：`2026-09-26-flutter-user-api-integration`（网络层与仓储已就绪）

## 1. 原始诉求

> 继续跑通其他业务。

即：在用户端接口接入完成后，把刷题/错题/择校/背诵四个静态视图接到真实业务数据上，形成可用的学习闭环。

## 2. 决策论证

| 决策 | 备选 | 结论 |
|---|---|---|
| 每模块独立 AsyncNotifier 会话状态 | 视图内 setState 拉取 | 遵循 Riverpod 分层守则，可测试（P1 §1） |
| `uuid` 包生成 attemptId | 手写 Random 拼 UUID | 后端 `z.uuid()` 强校验，包实现可靠（ADR-1） |
| 错题重做弹对话框作答 | 卡片内联重做 | 复用题目选项渲染，交互清晰（ADR-3） |
| 择校卡片去报录比、显真实字段 | 保留假报录比 | 严禁展示后端不存在的数据（ADR-4） |
| 测试 Override 四个 Fake 仓储 | 假 AsyncNotifier Override | 覆盖真实状态层逻辑，只隔离网络（ADR-6） |

## 3. 落地计划

1. 文档落盘（本文件 + P0/P1/P2）。
2. `uuid` 依赖 + subject 映射 + 四模块状态层。
3. 四视图重绑（保留既有视觉骨架）。
4. 测试重构 + `flutter analyze` / `flutter test` 全绿。
5. P3 验证单与 changed-files.md。

## 4. 验收

见 `docs/p0-definition/flutter-business-ui-binding/definition.md` §4；执行结果记录于 P3。
