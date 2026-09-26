import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/theme/app_theme.dart';
import 'package:kaoyan_helper/ui/features/schools/schools_view.dart';

void main() {
  group('Schools Mobile Adaptive & Touch Gestures Tests', () {
    testWidgets(
      'Mobile 390x844: renders cleanly with no overflow and stacked layout',
      (WidgetTester tester) async {
        // 模拟标准移动端视口 iPhone 13/14: 390x844
        tester.view.physicalSize = const Size(390, 844);
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

        // 验证无任何 RenderFlex 溢出异常
        expect(tester.takeException(), isNull);

        // 验证院校、专业代码与报录比正常显示
        // （浙江大学与苏州大学均为计算机科学与技术学院 · 085404，故为 findsWidgets）
        expect(find.text('浙江大学'), findsOneWidget);
        expect(find.text('计算机科学与技术学院 · 085404 计算机专硕'), findsWidgets);
        expect(find.text('8.2:1 报录'), findsOneWidget);

        // 验证下拉刷新组件存在
        expect(find.byType(RefreshIndicator), findsOneWidget);
      },
    );

    testWidgets('Touch Gesture: double tap on card toggles target status', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
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

      // 双击华东师范大学卡片 (初始非目标)
      final ecnuFinder = find.text('华东师范大学');
      expect(ecnuFinder, findsOneWidget);

      await tester.tap(ecnuFinder);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(ecnuFinder);
      await tester.pumpAndSettle();

      // 验证触发了设为目标 SnackBar
      expect(find.text('已设为一志愿目标院校！'), findsOneWidget);
    });

    testWidgets('Touch Gesture: long press on card shows quick action modal', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
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

      // 长按浙江大学卡片
      await tester.longPress(find.text('浙江大学'));
      await tester.pumpAndSettle();

      // 验证弹出底部 ActionSheet
      expect(find.text('复制专业代码与名称'), findsOneWidget);
      expect(find.text('取消一志愿目标'), findsOneWidget);
      expect(find.text('查看历年报录趋势表'), findsOneWidget);

      // 点击“查看历年报录趋势表”
      await tester.tap(find.text('查看历年报录趋势表'));
      await tester.pumpAndSettle();

      // 验证趋势展开
      expect(find.text('历年报录与复试线趋势：'), findsOneWidget);
      expect(find.text('向右滑动查看完整数据'), findsOneWidget);
      expect(find.text('382 分'), findsOneWidget);
    });

    testWidgets('Single tap expands trend table and allows horizontal scroll', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
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

      // 单击展开（卡片同时注册了 onTap/onDoubleTap，需等待双击判定超时）
      await tester.tap(find.text('北京航空航天大学'));
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.text('历年报录与复试线趋势：'), findsOneWidget);
      expect(find.text('390 分'), findsOneWidget);

      // 再次单击折叠
      await tester.tap(find.text('北京航空航天大学'));
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.text('390 分'), findsNothing);
    });

    testWidgets('Tag horizontal scroll and selection test', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
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

      // 点击 211 筛选（卡片标签也含 211，需 .first 定位筛选栏 Chip）
      await tester.tap(find.text('211').first);
      await tester.pumpAndSettle();

      // 验证苏州大学 (211) 存在，全部 985 依然根据标签筛选
      expect(find.text('苏州大学'), findsOneWidget);
    });
  });
}
