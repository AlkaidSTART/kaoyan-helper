# P2 - 核心业务组件体系开发

## 1. 原子 Todo List
- [x] 创建 P0、P1、P2、P3 规范文档。
- [x] 创建 `lib/ui/features/quiz/widgets/quiz_option_card.dart`。
- [x] 创建 `lib/ui/features/quiz/quiz_view.dart`。
- [x] 创建 `lib/ui/features/mistakes/widgets/mistake_card.dart`。
- [x] 创建 `lib/ui/features/mistakes/mistakes_view.dart`。
- [x] 创建 `lib/ui/features/schools/widgets/school_row_item.dart`。
- [x] 创建 `lib/ui/features/schools/schools_view.dart`。
- [x] 创建 `lib/ui/features/flashcards/widgets/flip_card.dart`。
- [x] 创建 `lib/ui/features/flashcards/flashcards_view.dart`。
- [x] 更新 `lib/ui/shell/app_shell.dart` 挂载各视图。
- [x] 编写并执行测试 `test/business_modules_test.dart`。
- [x] 执行 `flutter analyze` 与 `flutter test`，全部通过。

## 2. 依赖顺序
1. Quiz 模块 (QuizOptionCard, QuizView)
2. Mistakes 模块 (MistakeCard, MistakesView)
3. Schools 模块 (SchoolRowItem, SchoolsView)
4. Flashcards 模块 (FlipCard, FlashcardsView)
5. AppShell 挂载联动
6. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: 动效统一约束在 180ms ~ 320ms 范围内，错误振动为 180ms 水平微颤（±4px），符合总规范限时。
- **ADR-002**: 3D 翻转卡片在 $\pi/2$ 瞬间切换前后子树，背面预设 `rotateY(π)`，消除镜像文字伪影。
- **ADR-003**: 选项卡片集成防抖与锁定状态，防止用户重复提交导致状态竞争。
- **ADR-004**: 错题本支持基于连对次数的状态升级（待消除 -> 再对1次 -> 完全消除）。
- **ADR-005**: 择校支持点击折叠展开历年 3 年录取/分数趋势表，并带有目标收藏微交互。
