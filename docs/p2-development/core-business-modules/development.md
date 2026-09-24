# P2 - 核心业务组件体系开发

## 1. 原子 Todo List
- [x] 创建 P0、P1、P2、P3 规范文档。
- [ ] 创建 `lib/ui/features/quiz/widgets/quiz_option_card.dart`。
- [ ] 创建 `lib/ui/features/quiz/quiz_view.dart`。
- [ ] 创建 `lib/ui/features/mistakes/widgets/mistake_card.dart`。
- [ ] 创建 `lib/ui/features/mistakes/mistakes_view.dart`。
- [ ] 创建 `lib/ui/features/schools/widgets/school_row_item.dart`。
- [ ] 创建 `lib/ui/features/schools/schools_view.dart`。
- [ ] 创建 `lib/ui/features/flashcards/widgets/flip_card.dart`。
- [ ] 创建 `lib/ui/features/flashcards/flashcards_view.dart`。
- [ ] 更新 `lib/ui/shell/app_shell.dart` 挂载各视图。
- [ ] 编写并执行测试 `test/business_modules_test.dart`。
- [ ] 执行 `flutter analyze` 与 `flutter test`。

## 2. 依赖顺序
1. Quiz 模块
2. Mistakes 模块
3. Schools 模块
4. Flashcards 模块
5. AppShell 挂载
6. Tests & Verification

## 3. 技术决策 (ADR)
- **ADR-001**: 动效统一约束在 180ms ~ 320ms 范围内，严格响应 `reduceMotion`。
- **ADR-002**: 3D 翻转卡片在 $\pi/2$ 切态，彻底消除由于背面水平翻转导致的镜像文字走样。
- **ADR-003**: 选项卡片集成防抖与锁定状态，防止用户重复提交导致状态竞争。
