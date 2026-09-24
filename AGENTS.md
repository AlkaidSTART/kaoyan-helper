# 登科 · Agent Instructions (项目智能体操作守则)

## 1. 研发阶段守则：未有文档，不得编码 (P0 -> P1 -> P2 -> P3)

**在修改或新建任何业务功能代码前，必须先在 `docs/p0~p3` 的每个阶段目录下新建该功能的专属子文件夹，放置 Markdown 文档记录实际问题与方案，严禁未经讨论与计划直接写代码：**

```
P0  定义 (docs/p0-definition/<feature-name>/)
 ↓  记录用户真实痛点、场景、范围边界与验收指标
P1  设计 (docs/p1-design/<feature-name>/)
 ↓  记录接口契约 (Repository/API)、数据模型 Schema、Riverpod 状态设计、UI 规范
P2  开发 (docs/p2-development/<feature-name>/)
 ↓  记录精细化原子 Todo List、依赖顺序、编码中实际问题与重大技术决策 (ADR)
P3  验证 (docs/p3-verification/<feature-name>/)
    记录测试用例执行结果、静态检查 (flutter analyze)、性能与多端验收单
```

---

## 2. 核心架构模式：Riverpod + Repository + Dio

严格遵循单向数据流与清晰职责边界，严禁跨层调用：

```
UI (ConsumerWidget) 
  ↓ (ref.watch / ref.read)
State Notifier (Riverpod)
  ↓ (调用数据契约)
Repository (纯 Dart 仓储类，数据组装、缓存、DTO 映射)
  ↓ (网络/持久化)
Data Source (DioClient / SupabaseClient / LocalStorage)
```

- **UI 层** (`ConsumerWidget`): 仅渲染视图与委托事件，严禁直接调用 `Dio` 或操作数据库。
- **状态层** (`Notifier` / `AsyncNotifier`): 维护强类型状态模型（`AsyncValue<T>`），调用 Repository。
- **仓储层** (`Repository`): 纯 Dart 类，由 Riverpod Provider 注入，处理缓存、DTO 转换与领域异常映射。
- **网络层** (`DioClient`): 单例拦截器注入 Token、处理日志与超时。

---

## 3. 关键铁律与红线

1. **先计划后编码**：任何功能、重大重构开发前必须先检查或撰写 `docs/p0~p3` 文档。
2. **严禁在 UI 层直接调用 Dio**：所有网络通信必须收敛在 Repository 内部。
3. **严禁裸抛 DioException 到页面**：Repository 必须将 `DioException` 转换为强类型 `AppException`。
4. **全工程禁止系统 Emoji**：UI 图标必须使用 `Icons.*_outlined` / `Icons.*_rounded` 或 `StatusDot`。
5. **动效严格限时**：动效时长上限不得超过 `400ms`，必须采用物理自然曲线（如 `Curves.easeOutCubic`）。
6. **最小改动原则**：不要过度设计未被要求的抽象与功能；只改动与当前任务直接相关的代码。
7. **验证通过方可汇报完成**：必须执行并通过：
   ```bash
   flutter analyze
   flutter test
   ```
   严禁代码中残留 `print`、`console.log` 或 linter warning。
