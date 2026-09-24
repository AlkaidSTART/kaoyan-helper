# Plan: Core Business Modules (刷题、错题、择校、背诵)

## 原始诉求
根据计划继续完成其他的业务组件（刷题、错题、择校、背诵），并在完成后汇报当前进度。

## 决策论证
1. **题库刷题 (`modules/quiz.md`)**：
   - 实现 `QuizView`，居中限宽 `maxWidth: 768`。
   - 实现 `QuizOptionCard`：点击防抖锁定，正确变绿微弹（`200ms`），错误变红横向抖动（`180ms`），同时高亮正确选项。
   - 解析区域 `AnimatedCrossFade` 展开（`250ms`），底部提供“AI 深度解析”（联动右侧 AI 面板展开并继承上下文）与“下一题”。
2. **错题本 (`modules/mistakes.md`)**：
   - 实现 `MistakesView` 与 `MistakeCard`。
   - 多维筛选工具栏（科目专属色底 FilterChip、题型、待消除/已掌握状态带 `StatusDot`）。
   - 攻坚浮动栏（开始错题攻坚）与卡片消除流转（连对 1 次黄点、连对 2 次绿点并消除）。
3. **择校报录 (`modules/schools.md`)**：
   - 实现 `SchoolsView`。
   - 院校/专业组合搜索栏，985/211 标签筛选。
   - 报录比数据表格，带有报录比烈度标签（`StatusDot` 动态匹配绿/黄/红），点击展开历年趋势图与“设为目标”星标微交互。
4. **记忆闪卡 (`modules/flashcards.md`)**：
   - 实现 `FlashcardsView`。
   - 3D 翻转卡片（`320ms`，景深 `0.0012`，在 $\pi/2$ 瞬间切换消除镜像伪影）。
   - 评级按键（忘记 1、模糊 2、牢记 3），翻转后渐现，评级后平滑切至下一张。
5. **Shell 路由联动**：
   - 将 `QuizView`、`MistakesView`、`SchoolsView`、`FlashcardsView` 接入 `AppShell` 的 5 个 Tab。
6. **工程与质量规范**：
   - 全工程严格无 Emoji。
   - 动效时长 <= 400ms。
   - `flutter analyze` 零警告，`flutter test` 全部绿灯。

## 落地计划
1. 落盘 P0 ~ P3 阶段规范文档。
2. 实现刷题模块：`lib/ui/features/quiz/`。
3. 实现错题模块：`lib/ui/features/mistakes/`。
4. 实现择校模块：`lib/ui/features/schools/`。
5. 实现闪卡模块：`lib/ui/features/flashcards/`。
6. 挂载到 `lib/ui/shell/app_shell.dart`。
7. 编写自动化集成与组件测试 `test/business_modules_test.dart`。
8. 运行静态分析与测试套件验证。
