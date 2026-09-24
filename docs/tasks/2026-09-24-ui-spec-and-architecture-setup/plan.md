# 任务计划与决策记录 (Plan & Decisions)

> **任务标识**: `2026-09-24-ui-spec-and-architecture-setup`  
> **任务主题**: 全业务组件 UI/动效方案细化、背景图融合、P0~P3 研发流水线建立与架构规范固化  
> **执行日期**: 2026-09-24  
> **状态**: ✅ 已完成

---

## 1. 任务背景与核心诉求

1. **业务组件 UI/动效/配色逐一讨论与确认**：
   - `QuizOptionCard`（答题卡片：微弹与防疲劳横向微颤）。
   - 休息与解压模块（`/rest`：悬浮番茄钟、考研木鱼“上岸+1”、5x5 舒尔特方格）。
   - `Flashcard3D`（记忆闪卡：物理级 320ms 双面独立图层、双层卡堆层叠入场、惯性滑出）。
   - `MistakeCard`（错题归纳卡片：连对 2 次消除流转、高度平滑折叠折叠）。
   - `SchoolRowCard` & `SchoolTrendChart`（择校报录：历年报录趋势折线、OCR+LLM 双层兜底识别弹窗）。
   - `AiChatPanel` & `AiChatInputBar`（AI 助教：坚挺高亮线条输入框、流式打字与视口保护）。
   - `AuthView`（登录页：基于 `assets/logo.png` 全景自习室摄影图，右侧悬浮毛玻璃透光卡片，晨曦金与真题蓝融合，Google/GitHub/微信多模态）。
2. **依赖管理与清理**：
   - 依赖补齐：引入 `flutter_riverpod` 与 `dio`。
   - 解决 Repository 疑问（明确为轻量分层架构模式，不引入第三方多余封装）。
   - 治理 Git 误追踪问题：清理 `.dart_tool/` 缓存与 `.idea/workspace.xml`，重写 `.gitignore` 为标准 Flutter 规范。
3. **建立 P0~P3 研发流程与任务追溯系统**：
   - 确立 `P0 定义` -> `P1 设计` -> `P2 开发` -> `P3 验证` 研发阶段流转。
   - 强制规范：每个功能必须在对应阶段建立专属子文件夹记录实际问题与设计。
   - 设立 `docs/tasks/` 记录每次任务对话的计划、决策与变动文件明细。
   - 收纳 `docs/` 根目录下的离散文档。

---

## 2. 技术与架构决策 (ADR)

1. **架构契约**：锁定 `Riverpod + Repository + Dio`。
   - UI 严禁直调 Dio；网络通信收敛在 Repository 纯 Dart 类中。
   - 异常必须转换为强类型 `AppException`。
2. **UI 铁律**：
   - 全工程严禁使用系统 Emoji，统一采用 `Icons.*_outlined` / `Icons.*_rounded` 与 `StatusDot`。
   - 交互动效时长上限不得超过 `400ms`。
   - 浅底深字严格遵循 WCAG AA 对比度（>= 4.5:1）。
3. **文档与研发流水线**：
   - 任何业务代码编写前，必须先在 `docs/p0~p3/<feature>/` 建立文档。
   - 每次任务与修改文件清单必须落盘在 `docs/tasks/`。
