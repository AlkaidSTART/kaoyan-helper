# 登科 · 考研助手 (DengKe) — TDD 测试设计与规范文档 (Flutter)

> **版本**: v3.0 | **最后更新**: 2026-09-20  
> **状态**: 经讨论确认。架构已迁移至 Flutter (Dart) + Supabase (Edge Functions)  
> **目标平台**: Android / iOS / Web / macOS / Windows  

---

## 1. 测试策略与原则

### 1.1 总体测试金字塔

采用经典测试金字塔模型，各层分工与权重如下：

| 层级 | 占比 | 工具 / 框架 | 核心目标 | 运行环境 |
|---|---|---|---|---|
| **单元测试 (Unit)** | ~60% | `flutter_test`, `mocktail` | 纯逻辑算法、领域状态机、Riverpod 状态流转、数据模型映射 | 本地 Host (秒级完成) |
| **组件测试 (Widget)** | ~30% | `flutter_test`, `WidgetTester` | 单一 Widget 渲染、按键/触摸交互响应、不同尺寸响应式适配、无障碍树 | 本地 Host (无头渲染) |
| **集成/E2E 测试** | ~10% | `integration_test` package | 完整用户跨屏业务旅程（登录→刷题→错题归集→AI 答疑） | 真机 / 模拟器 / Chrome |
| **Edge Functions 测试** | 独立 | `Deno.test`, `@std/assert` | AI 网关限流、Prompt 组装、SSE 管道代理健全性 | Deno 本地运行时 / CI |

### 1.2 核心指导原则

1. **业务逻辑先行编写失败测试 (Red ➔ Green ➔ Refactor)**：核心算法（错题消灭判定、SM-2 间隔复习、报录比除零保护）必须遵循先测后写，边界用例百分百覆盖。
2. **纯逻辑彻底解耦 (Pure Functions First)**：所有数学计算、规则转移、状态判定函数均抽离为无外部 I/O 依赖的纯函数（Pure Dart），杜绝通过 Mock 庞大的 Widget 树来测试简单逻辑。
3. **Mock 选型采用 `mocktail`**：弃用需要繁重代码生成的 `mockito`，选用基于 Dart 类型系统的高性能 `mocktail`，缩短编译等待时间。
4. **集成测试连接沙箱 Supabase**：禁止在端到端与集成测试中使用全局内存 Mock 欺骗逻辑，统一通过环境变量对接 Supabase 测试项目或本地 Docker 实例。

---

## 2. 测试工程目录结构

遵循业务特征 Colocation 原则，测试工程严格镜像 `lib/` 目录：

```
dengke-app/
├── lib/
│   ├── core/
│   │   ├── algorithms/
│   │   │   ├── sm2.dart
│   │   │   └── mistake_state_machine.dart
│   │   ├── utils/
│   │   │   └── admission_ratio.dart
│   │   └── theme/
│   ├── features/
│   │   ├── quiz/
│   │   │   ├── domain/models/
│   │   │   ├── data/repositories/
│   │   │   ├── presentation/
│   │   │   │   ├── widgets/quiz_card.dart
│   │   │   │   └── controllers/quiz_controller.dart
│   │   ├── memory/
│   │   ├── school/
│   │   └── chat/
├── test/
│   ├── core/
│   │   ├── algorithms/
│   │   │   ├── sm2_test.dart
│   │   │   └── mistake_state_machine_test.dart
│   │   └── utils/
│   │       └── admission_ratio_test.dart
│   ├── features/
│   │   ├── quiz/
│   │   │   ├── presentation/widgets/quiz_card_test.dart
│   │   │   └── presentation/controllers/quiz_controller_test.dart
│   │   ├── memory/
│   │   │   └── presentation/widgets/flashcard_test.dart
│   │   └── chat/
│   │       └── data/sse_stream_test.dart
│   ├── fixtures/
│   │   ├── questions_fixture.dart
│   │   ├── schools_fixture.dart
│   │   └── memory_cards_fixture.dart
│   └── test_helpers/
│       └── pump_app.dart              # 封装了 ProviderScope 与 Theme 的 Widget 测试脚手架
├── integration_test/
│   ├── quiz_flow_test.dart            # 刷题-错题-重练闭环 E2E
│   └── memory_flow_test.dart          # 单词抽卡-翻转-评级 E2E
└── supabase/
    └── functions/
        └── chat/
            ├── index.ts
            └── index.test.ts          # Deno API 级测试
```

---

## 3. 核心领域逻辑单元测试 (Unit Tests)

### 3.1 错题状态机 (`mistake_state_machine.dart`)

**状态机规则**：
- 首次答错：创建 `active` 错题，`error_count = 1`，`consecutive_correct = 0`。
- 重复答错：保持 `active`，`error_count++`，`consecutive_correct = 0`。
- 错题重练答对：保持 `active`，`consecutive_correct++`。
- 连续 2 次答对：状态由 `active` 迁往 `mastered`（已掌握），记录 `mastered_at` 时间戳。
- 已掌握错题再度答错：立刻被激活回 `active`，`consecutive_correct` 清零，`mastered_at` 置空。

**测试实现 (`test/core/algorithms/mistake_state_machine_test.dart`)**：

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:dengke_app/core/algorithms/mistake_state_machine.dart';

void main() {
  group('错题消灭状态机 (MistakeStateMachine)', () {
    test('首次答错：应初始化为 active 状态且错误计数为 1', () {
      final state = MistakeStateMachine.createInitialState();

      expect(state.status, MistakeStatus.active);
      expect(state.errorCount, 1);
      expect(state.consecutiveCorrect, 0);
      expect(state.masteredAt, isNull);
    });

    test('活跃错题再次答错：errorCount 递增且重置连续正确计数', () {
      final current = MistakeState(
        status: MistakeStatus.active,
        errorCount: 2,
        consecutiveCorrect: 1,
        masteredAt: null,
      );

      final next = MistakeStateMachine.transition(current, MistakeEvent.answerWrong);

      expect(next.status, MistakeStatus.active);
      expect(next.errorCount, 3);
      expect(next.consecutiveCorrect, 0);
      expect(next.masteredAt, isNull);
    });

    test('重练答对 1 次：保持 active，consecutiveCorrect 递增', () {
      final current = MistakeState(
        status: MistakeStatus.active,
        errorCount: 2,
        consecutiveCorrect: 0,
        masteredAt: null,
      );

      final next = MistakeStateMachine.transition(current, MistakeEvent.answerCorrect);

      expect(next.status, MistakeStatus.active);
      expect(next.consecutiveCorrect, 1);
      expect(next.masteredAt, isNull);
    });

    test('连续第 2 次答对：状态跃迁至 mastered，并赋予掌握时间', () {
      final current = MistakeState(
        status: MistakeStatus.active,
        errorCount: 2,
        consecutiveCorrect: 1,
        masteredAt: null,
      );

      final next = MistakeStateMachine.transition(current, MistakeEvent.answerCorrect);

      expect(next.status, MistakeStatus.mastered);
      expect(next.consecutiveCorrect, 2);
      expect(next.masteredAt, isNotNull);
    });

    test('已掌握题目意外答错：重新变回 active 并清空连续计数', () {
      final current = MistakeState(
        status: MistakeStatus.mastered,
        errorCount: 2,
        consecutiveCorrect: 2,
        masteredAt: DateTime.now().subtract(const Duration(days: 3)),
      );

      final next = MistakeStateMachine.transition(current, MistakeEvent.answerWrong);

      expect(next.status, MistakeStatus.active);
      expect(next.errorCount, 3);
      expect(next.consecutiveCorrect, 0);
      expect(next.masteredAt, isNull);
    });

    test('边界用例：极端高频错误计数安全递增', () {
      final current = MistakeState(
        status: MistakeStatus.active,
        errorCount: 9999,
        consecutiveCorrect: 0,
        masteredAt: null,
      );

      final next = MistakeStateMachine.transition(current, MistakeEvent.answerWrong);

      expect(next.errorCount, 10000);
    });
  });
}
```

---

### 3.2 SM-2 间隔复习算法 (`sm2.dart`)

**算法规则**：
- `Forgot` (完全忘记)：`interval = 0` (今日必须重排)，`repetitions = 0`，`ease_factor = max(1.3, ease_factor - 0.2)`。
- `Fuzzy` (模糊/犹豫)：`interval = 1` (次日复习)，`repetitions = 0`，`ease_factor = max(1.3, ease_factor - 0.1)`。
- `Remembered` (牢记)：
  - `repetitions == 0` ➔ `interval = 1`
  - `repetitions == 1` ➔ `interval = 3`
  - `repetitions >= 2` ➔ `interval = round(prev_interval * ease_factor)`
  - `repetitions++`，`ease_factor = ease_factor + 0.1`

**测试实现 (`test/core/algorithms/sm2_test.dart`)**：

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:dengke_app/core/algorithms/sm2.dart';

void main() {
  group('SM-2 艾宾浩斯复习算法 (Sm2Calculator)', () {
    const baseProgress = CardProgress(
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 0,
    );

    test('评级 Forgot: 归零间隔，扣减难度因子，设定复习时刻为今日', () {
      final current = CardProgress(
        repetitions: 4,
        easeFactor: 2.5,
        intervalDays: 14,
      );

      final result = Sm2Calculator.calculateNextReview(current, ReviewRating.forgot);

      expect(result.intervalDays, 0);
      expect(result.repetitions, 0);
      expect(result.easeFactor, closeTo(2.3, 0.001));
      expect(result.nextReviewAt.difference(DateTime.now()).inHours, lessThanOrEqualTo(1));
    });

    test('评级 Forgot: 难度因子不应突破下限 1.3', () {
      final current = CardProgress(
        repetitions: 1,
        easeFactor: 1.4,
        intervalDays: 1,
      );

      final result = Sm2Calculator.calculateNextReview(current, ReviewRating.forgot);

      expect(result.easeFactor, 1.3);
    });

    test('评级 Fuzzy: 间隔重置为 1 天，轻微扣减难度因子', () {
      final current = CardProgress(
        repetitions: 3,
        easeFactor: 2.5,
        intervalDays: 6,
      );

      final result = Sm2Calculator.calculateNextReview(current, ReviewRating.fuzzy);

      expect(result.intervalDays, 1);
      expect(result.repetitions, 0);
      expect(result.easeFactor, closeTo(2.4, 0.001));
    });

    test('评级 Remembered: 首次牢记步长为 1 天', () {
      final result = Sm2Calculator.calculateNextReview(baseProgress, ReviewRating.remembered);

      expect(result.intervalDays, 1);
      expect(result.repetitions, 1);
      expect(result.easeFactor, closeTo(2.6, 0.001));
    });

    test('评级 Remembered: 第二次牢记步长跨越至 3 天', () {
      final current = CardProgress(
        repetitions: 1,
        easeFactor: 2.6,
        intervalDays: 1,
      );

      final result = Sm2Calculator.calculateNextReview(current, ReviewRating.remembered);

      expect(result.intervalDays, 3);
      expect(result.repetitions, 2);
      expect(result.easeFactor, closeTo(2.7, 0.001));
    });

    test('评级 Remembered: 第三次及以后按系数乘积四舍五入递增', () {
      final current = CardProgress(
        repetitions: 2,
        easeFactor: 2.5,
        intervalDays: 3,
      );

      final result = Sm2Calculator.calculateNextReview(current, ReviewRating.remembered);

      // 3 * 2.5 = 7.5 -> round -> 8
      expect(result.intervalDays, 8);
      expect(result.repetitions, 3);
      expect(result.easeFactor, closeTo(2.6, 0.001));
    });
  });
}
```

---

### 3.3 报录比计算与除零防护 (`admission_ratio.dart`)

**测试实现 (`test/core/utils/admission_ratio_test.dart`)**：

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:dengke_app/core/utils/admission_ratio.dart';

void main() {
  group('报录比工具 (AdmissionRatioCalculator)', () {
    test('标准录取场景计算：400 报名 / 40 录取 = 10.0', () {
      final ratio = AdmissionRatioCalculator.calculate(applicants: 400, enrolled: 40);
      expect(ratio, 10.0);
    });

    test('除零边界防御：当录取数为 0 时返回 null，杜绝抛出除零异常', () {
      final ratio = AdmissionRatioCalculator.calculate(applicants: 150, enrolled: 0);
      expect(ratio, isNull);
    });

    test('报考数为 0 且录取正常：返回 0.0', () {
      final ratio = AdmissionRatioCalculator.calculate(applicants: 0, enrolled: 30);
      expect(ratio, 0.0);
    });

    test('双方皆为 0：返回 null', () {
      final ratio = AdmissionRatioCalculator.calculate(applicants: 0, enrolled: 0);
      expect(ratio, isNull);
    });

    test('浮点舍入：精度规范为 1 位小数', () {
      final ratio = AdmissionRatioCalculator.calculate(applicants: 355, enrolled: 52);
      // 355 / 52 = 6.8269... -> 6.8
      expect(ratio, 6.8);
    });

    test('竞争烈度标签判定', () {
      expect(AdmissionRatioCalculator.getDifficulty(4.2), RatioDifficulty.easy);
      expect(AdmissionRatioCalculator.getDifficulty(7.5), RatioDifficulty.moderate);
      expect(AdmissionRatioCalculator.getDifficulty(18.9), RatioDifficulty.competitive);
      expect(AdmissionRatioCalculator.getDifficulty(null), RatioDifficulty.unknown);
    });
  });
}
```

---

## 4. Widget 组件与用户交互测试 (Widget Tests)

### 4.1 题卡交互与键盘快捷键 (`quiz_card_test.dart`)

**测试目标**：
1. 渲染题干、题型标签、四个选项内容。
2. 触摸/点击正确选项：选项边框渲染成功色 (`#2E9E6E`)，下方展开解析。
3. 触摸/点击错误选项：选中项渲染危险色 (`#D4453A`)，正确项自动被绿框高亮。
4. 桌面端按键映射：按下键盘 `A` 键自动触发第一项选中。
5. 答题完毕后右下角出现 `⚡ AI 深度答疑` 按钮。

**测试实现 (`test/features/quiz/presentation/widgets/quiz_card_test.dart`)**：

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dengke_app/features/quiz/domain/models/question.dart';
import 'package:dengke_app/features/quiz/presentation/widgets/quiz_card.dart';

void main() {
  final testQuestion = Question(
    id: 'q-001',
    subject: 'politics',
    type: QuestionType.singleChoice,
    stem: '下列关于矛盾普遍性与特殊性关系的表述，正确的是：',
    options: const [
      QuestionOption(key: 'A', content: '矛盾普遍性寓于特殊性之中'),
      QuestionOption(key: 'B', content: '矛盾特殊性可以彻底脱离普遍性'),
      QuestionOption(key: 'C', content: '普遍性与特殊性在任何时候都不可转化'),
      QuestionOption(key: 'D', content: '普遍性直接等同于特殊性'),
    ],
    answer: 'A',
    explanation: '矛盾的普遍性即矛盾的共性，矛盾的特殊性即矛盾的个性。矛盾普遍性寓于特殊性之中。',
  );

  Widget createWidgetUnderTest({void Function()? onNext}) {
    return ProviderScope(
      child: MaterialApp(
        home: Scaffold(
          body: QuizCard(
            question: testQuestion,
            onNextQuestion: onNext,
          ),
        ),
      ),
    );
  }

  group('QuizCard Widget 交互测试', () {
    testWidgets('完整渲染题干与全部选项文本', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());

      expect(find.textContaining('矛盾普遍性与特殊性'), findsOneWidget);
      expect(find.text('A. 矛盾普遍性寓于特殊性之中'), findsOneWidget);
      expect(find.text('B. 矛盾特殊性可以彻底脱离普遍性'), findsOneWidget);
      expect(find.text('C. 普遍性与特殊性在任何时候都不可转化'), findsOneWidget);
      expect(find.text('D. 普遍性直接等同于特殊性'), findsOneWidget);
    });

    testWidgets('点击正确项 A：展示成功样式并展开解析', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());

      // 初始状态不应呈现解析正文
      expect(find.textContaining('矛盾的普遍性即矛盾的共性'), findsNothing);

      // 点击选项 A
      await tester.tap(find.text('A. 矛盾普遍性寓于特殊性之中'));
      await tester.pumpAndSettle();

      // 解析展现
      expect(find.textContaining('矛盾的普遍性即矛盾的共性'), findsOneWidget);
      // AI 深度解析按钮展现
      expect(find.text('⚡ AI 深度解析'), findsOneWidget);
    });

    testWidgets('点击错误项 B：选中项标红，正确项 A 标绿', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());

      await tester.tap(find.text('B. 矛盾特殊性可以彻底脱离普遍性'));
      await tester.pumpAndSettle();

      final optionBContainer = tester.widget<Container>(
        find.byKey(const ValueKey('option_container_B')),
      );
      final decorationB = optionBContainer.decoration as BoxDecoration;
      // 验证边框带危险色
      expect(decorationB.border!.top.color, const Color(0xFFD4453A));

      final optionAContainer = tester.widget<Container>(
        find.byKey(const ValueKey('option_container_A')),
      );
      final decorationA = optionAContainer.decoration as BoxDecoration;
      // 验证正确选项自动带成功色提示
      expect(decorationA.border!.top.color, const Color(0xFF2E9E6E));
    });

    testWidgets('桌面键盘交互：按下 A 键即选中第一项', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());

      await tester.sendKeyEvent(LogicalKeyboardKey.keyA);
      await tester.pumpAndSettle();

      // 验证判定完成
      expect(find.text('⚡ AI 深度解析'), findsOneWidget);
    });

    testWidgets('判题后按 Enter 键触发下一题回调', (tester) async {
      var nextTriggered = false;
      await tester.pumpWidget(createWidgetUnderTest(onNext: () => nextTriggered = true));

      // 先按 A 答题
      await tester.sendKeyEvent(LogicalKeyboardKey.keyA);
      await tester.pumpAndSettle();

      // 再按回车
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();

      expect(nextTriggered, isTrue);
    });
  });
}
```

---

### 4.2 单词背诵卡片 3D 翻转 (`flashcard_test.dart`)

**测试目标**：
1. 初始状态呈现卡片正面（英文单词、音标）。
2. 点击卡片触发 400ms `Matrix4.rotationY` 翻转动画，正面隐藏，反面展开（中文释义、例句）。
3. 翻转后底部滑出 `忘记[1]`、`模糊[2]`、`牢记[3]` 评级按钮。
4. 键盘按下 `3` 键触发 `ReviewRating.remembered` 回调。

**测试实现 (`test/features/memory/presentation/widgets/flashcard_test.dart`)**：

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dengke_app/core/algorithms/sm2.dart';
import 'package:dengke_app/features/memory/domain/models/memory_card.dart';
import 'package:dengke_app/features/memory/presentation/widgets/flashcard_view.dart';

void main() {
  final testCard = MemoryCard(
    id: 'card-101',
    category: 'english_word',
    front: 'abandon',
    phonetic: '/əˈbændən/',
    back: 'vt. 放弃，抛弃；沉湎于',
    example: 'He decided to abandon the attempt due to severe weather.',
  );

  Widget createWidgetUnderTest({void Function(ReviewRating)? onRated}) {
    return MaterialApp(
      home: Scaffold(
        body: FlashcardView(
          card: testCard,
          onRatingSubmitted: onRated ?? (_) {},
        ),
      ),
    );
  }

  group('FlashcardView 3D 翻转交互测试', () {
    testWidgets('初始状态只展示正面，不显示评级按钮', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());

      expect(find.text('abandon'), findsOneWidget);
      expect(find.text('/əˈbændən/'), findsOneWidget);
      expect(find.text('vt. 放弃，抛弃；沉湎于'), findsNothing);
      expect(find.text('🟢 牢记 [3]'), findsNothing);
    });

    testWidgets('单击卡片完成 3D 翻转动画并呈现释义与操作栏', (tester) async {
      await tester.pumpWidget(createWidgetUnderTest());

      // 单击触发翻转
      await tester.tap(find.byKey(const ValueKey('flashcard_interactive_surface')));
      // 推进动画 400ms
      await tester.pumpAndSettle();

      // 背面展示
      expect(find.text('vt. 放弃，抛弃；沉湎于'), findsOneWidget);
      expect(find.textContaining('He decided to abandon'), findsOneWidget);

      // 评级操作栏出现
      expect(find.text('🔴 忘记 [1]'), findsOneWidget);
      expect(find.text('🟡 模糊 [2]'), findsOneWidget);
      expect(find.text('🟢 牢记 [3]'), findsOneWidget);
    });

    testWidgets('翻转后按键盘 3 键：提交 remembered 评级', (tester) async {
      ReviewRating? submittedRating;
      await tester.pumpWidget(createWidgetUnderTest(
        onRated: (rating) => submittedRating = rating,
      ));

      // 翻转卡片
      await tester.tap(find.byKey(const ValueKey('flashcard_interactive_surface')));
      await tester.pumpAndSettle();

      // 触发按键 3
      await tester.sendKeyEvent(LogicalKeyboardKey.digit3);
      await tester.pump();

      expect(submittedRating, ReviewRating.remembered);
    });
  });
}
```

---

## 5. 状态管理 Riverpod 单元测试 (State Notifier Tests)

无需启动任何 UI Widget，使用纯 `ProviderContainer` 快速验证状态跃迁与数据副作用。

**测试实现 (`test/features/quiz/presentation/controllers/quiz_controller_test.dart`)**：

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dengke_app/features/quiz/domain/models/question.dart';
import 'package:dengke_app/features/quiz/domain/repositories/quiz_repository.dart';
import 'package:dengke_app/features/quiz/presentation/controllers/quiz_controller.dart';

class MockQuizRepository extends Mock implements QuizRepository {}

void main() {
  late MockQuizRepository mockRepo;
  late ProviderContainer container;

  final sampleQuestion = Question(
    id: 'q-1',
    subject: 'math',
    type: QuestionType.singleChoice,
    stem: '设 f(x) 连续...',
    options: const [
      QuestionOption(key: 'A', content: '0'),
      QuestionOption(key: 'B', content: '1'),
    ],
    answer: 'A',
    explanation: '由极限保号性...',
  );

  setUp(() {
    mockRepo = MockQuizRepository();
    container = ProviderContainer(
      overrides: [
        quizRepositoryProvider.overrideWithValue(mockRepo),
      ],
    );
  });

  tearDown(() => container.dispose());

  group('QuizController 状态控制器', () {
    test('submitAnswer 答对：correctCount +1 且不触发保存错题', () async {
      final controller = container.read(quizControllerProvider.notifier);
      controller.setQuestions([sampleQuestion]);

      await controller.submitAnswer('A');

      final state = container.read(quizControllerProvider);
      expect(state.correctCount, 1);
      expect(state.wrongCount, 0);
      expect(state.isCurrentCorrect, isTrue);

      // 验证未调用添加错题存储
      verifyNever(() => mockRepo.recordMistake(any(), any()));
    });

    test('submitAnswer 答错：wrongCount +1 并异步调用 recordMistake', () async {
      when(() => mockRepo.recordMistake(any(), any()))
          .thenAnswer((_) async => Future.value());

      final controller = container.read(quizControllerProvider.notifier);
      controller.setQuestions([sampleQuestion]);

      await controller.submitAnswer('B'); // 答错

      final state = container.read(quizControllerProvider);
      expect(state.correctCount, 0);
      expect(state.wrongCount, 1);
      expect(state.isCurrentCorrect, isFalse);

      // 验证调用了持久化
      verify(() => mockRepo.recordMistake('q-1', 'B')).called(1);
    });
  });
}
```

---

## 6. Supabase Edge Functions 后端测试 (Deno)

针对位于 `supabase/functions/chat/` 的 AI 流式代理网关，直接在 Deno 运行时执行测试：

```typescript
// supabase/functions/chat/index.test.ts
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("AI Chat Gateway: 未携带 Bearer Token 返回 401", async () => {
  const req = new Request("http://localhost:54321/functions/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "请解释这道题" }),
  });

  // 调用主 handler
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("AI Chat Gateway: 请求消息体为空返回 400 校验错误", async () => {
  const req = new Request("http://localhost:54321/functions/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-valid-jwt",
    },
    body: JSON.stringify({ message: "   " }),
  });

  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error.code, "INVALID_INPUT");
});

Deno.test("AI Chat Gateway: 超出每日 30 次配额返回 429", async () => {
  // Mock Upstash 限流返回超过配额
  setupMockRateLimit({ success: false, remaining: 0 });

  const req = new Request("http://localhost:54321/functions/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-valid-jwt",
    },
    body: JSON.stringify({ message: "第 31 次提问" }),
  });

  const res = await handleRequest(req);
  assertEquals(res.status, 429);
  const data = await res.json();
  assertStringIncludes(data.error.message, "今日提问次数已用完");
});

Deno.test("AI Chat Gateway: 正常请求配置 text/event-stream 响应头", async () => {
  setupMockRateLimit({ success: true, remaining: 15 });
  setupMockDeepSeekStream(["好的", "，这道题的", "关键在于..."]);

  const req = new Request("http://localhost:54321/functions/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer mock-valid-jwt",
    },
    body: JSON.stringify({ message: "这道题怎么分析？" }),
  });

  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/event-stream");
});
```

---

## 7. 端到端集成测试 (Integration Tests)

基于 `integration_test` 驱动真实 App 流程：

```dart
// integration_test/quiz_flow_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:dengke_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('用户核心全链路: 刷题 ➔ 答错入错题本 ➔ 错题重做两次达标消题', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // 1. 从主页点击进入政治刷题
    await tester.tap(find.text('刷题'));
    await tester.pumpAndSettle();

    // 2. 作答并故意选错
    await tester.tap(find.textContaining('矛盾特殊性可以彻底脱离普遍性'));
    await tester.pumpAndSettle();
    expect(find.text('⚡ AI 深度解析'), findsOneWidget);

    // 3. 导航到错题本
    await tester.tap(find.byTooltip('错题本'));
    await tester.pumpAndSettle();

    // 4. 验证出现待消除错题
    expect(find.text('🔴 待消除'), findsOneWidget);

    // 5. 攻坚重做：第 1 次答对
    await tester.tap(find.text('重做'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('矛盾普遍性寓于特殊性之中'));
    await tester.pumpAndSettle();

    // 6. 攻坚重做：第 2 次答对 -> 触发状态变迁
    await tester.tap(find.text('重做'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('矛盾普遍性寓于特殊性之中'));
    await tester.pumpAndSettle();

    // 7. 验证已转为已掌握
    expect(find.text('🟢 已掌握'), findsOneWidget);
  });
}
```

---

## 8. 自动化门禁与覆盖率要求

### 8.1 覆盖率硬性门禁 (Coverage Thresholds)

| 目录模块 | 最低代码行覆盖率 (Line Coverage) | 阻断级别 |
|---|---|---|
| `lib/core/algorithms/` | **95%** | PR 强制阻断 |
| `lib/core/utils/` | **90%** | PR 强制阻断 |
| `lib/features/*/domain/` | **85%** | PR 强制阻断 |
| `lib/features/*/presentation/controllers/` | **80%** | 警告并要求复核 |
| `lib/features/*/presentation/widgets/` | **70%** | 建议覆盖 |
| **App 全局综合** | **>= 75%** | CI 门禁检查 |

### 8.2 本地运行指令集

```bash
# 1. 运行所有纯单元测试与组件测试
flutter test

# 2. 导出覆盖率报告 (生成 coverage/lcov.info)
flutter test --coverage

# 3. 格式化生成可视 HTML 覆盖率报告 (需已安装 lcov 工具)
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html

# 4. 运行 Edge Functions 测试
cd supabase/functions && deno test --allow-net --allow-env
```

### 8.3 GitHub Actions CI 配置

```yaml
name: Flutter CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test_and_gate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.x'
          channel: 'stable'
          cache: true

      - name: Install Dependencies
        run: flutter pub get

      - name: Static Code Analysis (Lint)
        run: flutter analyze --fatal-infos

      - name: Run Tests with Coverage
        run: flutter test --coverage

      - name: Check Coverage Threshold
        uses: VeryGoodOpenSource/very_good_coverage@v3
        with:
          path: 'coverage/lcov.info'
          min_coverage: 75

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.42.x

      - name: Run Supabase Edge Functions Tests
        run: |
          cd supabase/functions
          deno test --allow-env
```
