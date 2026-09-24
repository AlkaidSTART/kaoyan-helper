# 登科 · 项目研发规范 (Kaoyan Helper)

## 1. 研发流程守则：计划先行 (Mandatory Workflow)

**在开始编写任何功能代码之前，严禁直接动手编码。必须严格按照 P0~P3 四阶段在 `docs/` 目录下完成对应设计与规划文档：**

```
P0 定义 (docs/p0-definition/)
  ↓ 锁定需求范围、用户场景、业务用例与验收指标
P1 设计 (docs/p1-design/)
  ↓ 交互/视觉设计、数据模型 Schema、Repository 接口契约、时序图
P2 开发 (docs/p2-development/)
  ↓ 原子化任务拆解 (Todo List)、依赖关系排序、关键开发决策
P3 验证 (docs/p3-verification/)
  ↓ 静态检查 (flutter analyze)、单元测试覆盖、多端适配与交付 Checklist
```

### 阶段执行与目录隔离要求 (Feature-scoped Folders)：
**每个新增或重构的功能，必须在 P0~P3 的每个阶段目录下创建该功能的同名专属子文件夹，并在其中放置 Markdown 文档记录实际问题与方案：**

```
docs/
  ├── p0-definition/<feature-name>/       # 真实痛点、需求范围与验收标准
  ├── p1-design/<feature-name>/           # 架构设计、接口契约与 UI 规范
  ├── p2-development/<feature-name>/      # 任务拆解 Todo、实现决策与踩坑记录
  └── p3-verification/<feature-name>/     # 测试报告、分析结果与质量验收单
```

1. **P0 定义阶段 (`docs/p0-definition/<feature>/`)**：记录业务实际痛点、用户场景、本期目标与坚决不做的 Non-Goals。
2. **P1 设计阶段 (`docs/p1-design/<feature>/`)**：完成数据层/仓储层接口签名设计、UI 组件层级拆分与 M3 状态配色。
3. **P2 开发阶段 (`docs/p2-development/<feature>/`)**：严格按 Todo 清单执行最小步长变更，记录编码过程中的关键决策与实际问题。
4. **P3 验证阶段 (`docs/p3-verification/<feature>/`)**：执行 `flutter analyze` 与 `flutter test`，记录回归验证与多端适配结果。

### 任务与会话追溯系统 (Task & Session Logs)：
**每次较大型对话、功能规划或迭代开发，必须在 `docs/tasks/` 下建立以日期命名的任务专属文件夹：**
```
docs/tasks/YYYY-MM-DD-<task-name>/
  ├── plan.md            # 记录本次任务的原始诉求、决策过程与实施计划
  └── changed-files.md   # 完整记录本次任务新增、修改、重命名或删除的文件明细及原因
```

---

## 2. 技术栈与架构选型

- **UI 引擎**: Flutter 3.x + Material 3 (`useMaterial3: true`)
- **状态管理**: `flutter_riverpod` (3.x)
- **网络框架**: `dio` (5.x)
- **后端服务**: Supabase (`supabase_flutter`)
- **核心架构**: **Riverpod + Repository Pattern + DioClient**

---

## 3. 目录与分层架构规范 (Colocation)

```
lib/
  ├── core/               # 全局基建
  │   ├── network/        # dio_client.dart, api_endpoints.dart, interceptors
  │   ├── theme/          # 暖阳/晚樱/素纸主题色盘、动效参数、M3 容器分级
  │   ├── errors/         # app_exception.dart (统一强类型异常体系)
  │   └── widgets/        # StatusDot, AppButton, MetricTile 等通用原子组件
  ├── features/           # 业务功能垂直切片 (Colocation)
  │   ├── auth/           # 登录认证 (自习室背景透光卡片、倒计时、OAuth)
  │   ├── dashboard/      # 学习看板 (数据指标卡、倒计时、图表)
  │   ├── quiz/           # 题库刷题 (选项卡微交互、公式渲染、解析折叠)
  │   ├── mistakes/       # 错题本 (筛选工具栏、消除流转动效)
  │   ├── schools/        # 择校报录 (趋势折线图、双层 OCR+LLM 结构化解析)
  │   ├── flashcards/     # 记忆闪卡 (3D 翻转、手势与阻尼滑出)
  │   ├── ai_chat/        # AI 助教 (流式渲染、高质感明朗线条输入框)
  │   └── rest/           # 休息放松 (悬浮番茄钟、木鱼解压、舒尔特方格)
  └── main.dart
```

---

## 4. 单向数据流与调用契约

```
UI (ConsumerWidget) 
  ↓ [ref.watch / ref.read]
Riverpod Provider / Notifier (管理 ViewState)
  ↓ [调用纯 Dart 业务契约]
Repository (处理数据装配、缓存策略、异常转换)
  ↓ [底层协议]
Data Source (DioClient / SupabaseClient / LocalStorage)
```

1. **UI 隔离**：UI 严禁直接依赖 `Dio`、`SupabaseClient` 或持久化存储。
2. **异常转换**：Repository 必须拦截所有 `DioException` 并映射为业务 `AppException`，严禁原始网络错误渗透至 UI。
3. **注入解耦**：所有 Repository 统一由 Riverpod `Provider<TRepository>` 声明和注入。

---

## 5. UI、动效与设计铁律

1. **抗疲劳暖色调**：基于 M3 容器色，严格遵守 WCAG AA 标准（文字对比度 >= 4.5:1）。
2. **纯净严谨图标**：统一使用 `Icons.*_outlined` 或 `Icons.*_rounded`，**全工程严禁使用任何系统 Emoji**。
3. **动效严格限时**：所有交互动效时长上限不得超过 `400ms`，必须使用物理自然缓动曲线（如 `Curves.easeOutCubic`、`Cubic(0.2, 0.0, 0.0, 1.0)`）。
4. **全平台适配**：保障触摸（>= 48x48 dp 触控热区）与桌面键鼠（快捷键、Hover 状态）双重体验。
