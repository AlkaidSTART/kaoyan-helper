import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/theme/app_theme.dart';
import 'package:kaoyan_helper/ui/features/flashcards/flashcards_view.dart';
import 'package:kaoyan_helper/ui/features/mistakes/mistakes_view.dart';
import 'package:kaoyan_helper/ui/features/quiz/quiz_view.dart';
import 'package:kaoyan_helper/ui/features/schools/schools_view.dart';

void main() {
  group('Core Business Modules Tests', () {
    testWidgets('QuizView: select wrong option, check feedback, unfold explanation, and advance',
        (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.warmAmber,
            home: const Scaffold(body: QuizView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 验证第一题题干存在
      expect(find.text('政治 · 马原'), findsOneWidget);
      expect(find.textContaining('矛盾普遍性和特殊性'), findsOneWidget);

      // 点击错误选项 B: '矛盾特殊性可以脱离普遍性独立存在'
      await tester.tap(find.text('矛盾特殊性可以脱离普遍性独立存在'));
      await tester.pumpAndSettle();

      // 验证官方解析已展开
      expect(find.text('正确答案: A'), findsOneWidget);
      expect(find.text('官方解析：'), findsOneWidget);
      expect(find.text('AI 深度解析'), findsOneWidget);

      // 点击下一题
      await tester.tap(find.text('下一题'));
      await tester.pumpAndSettle();

      // 验证进入第二题
      expect(find.text('政治 · 史纲'), findsOneWidget);
      expect(find.text('标志着中国共产党在政治上开始走向成熟的会议是：'), findsOneWidget);
    });

    testWidgets('MistakesView: filter by subject and redo elimination', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.warmAmber,
            home: const Scaffold(body: MistakesView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 验证多维筛选 Chip
      expect(find.text('思想政治'), findsOneWidget);
      expect(find.text('考研英语'), findsOneWidget);
      expect(find.text('开始错题攻坚'), findsOneWidget);

      // 初始列表有错题
      expect(find.text('政 · 单选'), findsOneWidget);
      expect(find.text('英 · 阅读'), findsOneWidget);

      // 点击思想政治筛选
      await tester.tap(find.text('思想政治'));
      await tester.pumpAndSettle();

      expect(find.text('政 · 单选'), findsOneWidget);
      expect(find.text('英 · 阅读'), findsNothing);

      // 点击立即重做升级状态
      await tester.tap(find.text('立即重做'));
      await tester.pumpAndSettle();

      expect(find.text('再对 1 次即消除'), findsOneWidget);
    });

    testWidgets('SchoolsView: search filtering, trend expansion, and star toggle', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.warmAmber,
            home: const Scaffold(body: SchoolsView()),
          ),
        ),
      );
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

      // 点击条目展开历年趋势
      await tester.tap(find.text('浙江大学'));
      await tester.pumpAndSettle();

      expect(find.text('历年报录与复试线趋势：'), findsOneWidget);
      expect(find.text('382 分'), findsOneWidget);

      // 点击目标收藏星标
      final starIcons = find.byIcon(Icons.star_rounded);
      expect(starIcons, findsWidgets);
      await tester.tap(starIcons.first);
      await tester.pumpAndSettle();
    });

    testWidgets('FlashcardsView: 3D flip card and rating progression', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.warmAmber,
            home: const Scaffold(body: FlashcardsView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 初始展示第一张正面
      expect(find.text('abandon'), findsOneWidget);
      expect(find.text('/əˈbændən/'), findsOneWidget);
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
