import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/theme/app_theme.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/ui/features/flashcards/flashcards_view.dart';
import 'package:kaoyan_helper/ui/features/mistakes/mistakes_view.dart';
import 'package:kaoyan_helper/ui/features/quiz/quiz_view.dart';
import 'package:kaoyan_helper/ui/features/schools/schools_view.dart';

import 'helpers/test_overrides.dart';

/// 业务视图数据层有登录门控，测试中直接注入已登录会话。
class AuthenticatedAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: true);
}

Widget _wrapTestApp(Widget child) {
  return ProviderScope(
    overrides: [
      authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
      ...buildTestOverrides(),
    ],
    child: MaterialApp(
      theme: AppTheme.warmAmber,
      home: Scaffold(body: child),
    ),
  );
}

void main() {
  group('Core Business Modules Tests (real data binding with fakes)', () {
    testWidgets(
      'QuizView: fetch real questions, submit answer, server feedback, and advance',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(_wrapTestApp(const QuizView()));
        await tester.pumpAndSettle();

        // 验证第一题题干与进度（来自 FakeQuizRepository）
        expect(find.text('政治'), findsOneWidget);
        expect(find.text('2024 真题 · 单选'), findsOneWidget);
        expect(find.text('1 / 2'), findsOneWidget);
        expect(find.textContaining('矛盾普遍性和特殊性'), findsOneWidget);

        // 点击错误选项 B，服务端判题后展示正确答案与解析
        await tester.tap(find.text('矛盾特殊性可以脱离普遍性独立存在'));
        await tester.pumpAndSettle();

        expect(find.text('回答有误，正确答案: A'), findsOneWidget);
        expect(find.text('官方解析：'), findsOneWidget);
        expect(find.textContaining('共性寓于个性之中'), findsOneWidget);
        expect(find.text('AI 深度解析'), findsOneWidget);

        // 点击下一题
        await tester.tap(find.text('下一题'));
        await tester.pumpAndSettle();

        // 验证进入第二题
        expect(find.text('2023 真题 · 单选'), findsOneWidget);
        expect(find.textContaining('遵义会议'), findsOneWidget);
        expect(find.text('2 / 2'), findsOneWidget);
      },
    );

    testWidgets('MistakesView: filter by subject and redo via dialog', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_wrapTestApp(const MistakesView()));
      await tester.pumpAndSettle();

      // 验证多维筛选 Chip
      expect(find.text('思想政治'), findsOneWidget);
      expect(find.text('考研英语'), findsOneWidget);
      expect(find.text('开始错题攻坚'), findsOneWidget);

      // 初始列表有错题
      expect(find.text('政治 · 单选'), findsOneWidget);
      expect(find.text('英语 · 单选'), findsOneWidget);

      // 点击思想政治筛选
      await tester.tap(find.text('思想政治'));
      await tester.pumpAndSettle();

      expect(find.text('政治 · 单选'), findsOneWidget);
      expect(find.text('英语 · 单选'), findsNothing);

      // 点击立即重做，弹出作答对话框
      await tester.tap(find.text('立即重做').first);
      await tester.pumpAndSettle();

      expect(find.text('错题重做'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.textContaining('矛盾普遍性和特殊性'),
        ),
        findsOneWidget,
      );

      // 选择正确答案 A 并提交，服务端判题后提示连对进度
      await tester.tap(find.text('A. 矛盾普遍性寓于特殊性之中'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('提交答案'));
      await tester.pumpAndSettle();

      expect(find.text('回答正确'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.textContaining('矛盾的普遍性即矛盾的共性'),
        ),
        findsOneWidget,
      );

      // 关闭对话框
      await tester.tap(find.text('完成'));
      await tester.pumpAndSettle();

      expect(find.text('连对 1 次！再对 1 次即可消除'), findsOneWidget);
    });

    testWidgets(
      'SchoolsView: search filtering, real trend programs, and target star toggle',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(_wrapTestApp(const SchoolsView()));
        await tester.pumpAndSettle();

        // 默认展示院校
        expect(find.text('浙江大学'), findsOneWidget);
        expect(find.text('华东师范大学'), findsOneWidget);

        // 搜索筛选
        await tester.enterText(find.byType(TextField), '华东');
        await tester.pumpAndSettle();

        expect(find.text('华东师范大学'), findsOneWidget);
        expect(find.text('浙江大学'), findsNothing);

        // 清空搜索
        await tester.enterText(find.byType(TextField), '');
        await tester.pumpAndSettle();

        // 点击条目展开历年趋势（卡片含 onDoubleTap，需等待双击判定超时）
        await tester.tap(find.text('浙江大学'));
        await tester.pump(const Duration(milliseconds: 350));
        await tester.pumpAndSettle();

        expect(find.text('历年招生与复试线趋势：'), findsOneWidget);
        expect(find.text('382 分'), findsOneWidget);

        // 点击目标收藏星标（浙江大学当前非目标；父级 InkWell 含 onDoubleTap，
        // 单击需等待双击判定超时后生效）
        final starIcons = find.byIcon(Icons.star_outline_rounded);
        expect(starIcons, findsWidgets);
        await tester.tap(starIcons.first);
        await tester.pump(const Duration(milliseconds: 350));
        await tester.pumpAndSettle();

        expect(find.text('已设为一志愿目标院校！'), findsOneWidget);
      },
    );

    testWidgets('FlashcardsView: 3D flip card and SM-2 rating progression', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_wrapTestApp(const FlashcardsView()));
      await tester.pumpAndSettle();

      // 初始展示第一张正面
      expect(find.text('英语大纲高频核心词'), findsOneWidget);
      expect(find.text('abandon'), findsOneWidget);
      expect(find.text('1 / 3 张'), findsOneWidget);

      // 点击翻转卡片
      await tester.tap(find.text('abandon'));
      await tester.pumpAndSettle();

      // 背面释义展示
      expect(find.textContaining('放弃'), findsOneWidget);

      // 点击“牢记”评级切换至下一张
      await tester.tap(find.text('牢记'));
      await tester.pumpAndSettle();

      // 进入第二张卡片
      expect(find.text('vulnerable'), findsOneWidget);
      expect(find.text('2 / 3 张'), findsOneWidget);
    });
  });
}
