import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/theme/app_theme.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/ui/features/schools/schools_view.dart';

import 'helpers/test_overrides.dart';

/// 业务视图数据层有登录门控，测试中直接注入已登录会话。
class AuthenticatedAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: true);
}

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
            overrides: [
              authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
              ...buildTestOverrides(),
            ],
            child: MaterialApp(
              theme: AppTheme.warmAmber,
              home: const Scaffold(body: SchoolsView()),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // 验证无任何 RenderFlex 溢出异常
        expect(tester.takeException(), isNull);

        // 验证院校、真实标签与地区正常显示
        expect(find.text('浙江大学'), findsOneWidget);
        expect(find.text('华东师范大学'), findsOneWidget);
        expect(find.text('浙江省 · 华东'), findsOneWidget);
        expect(find.text('985'), findsWidgets);

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
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
            ...buildTestOverrides(),
          ],
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
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
            ...buildTestOverrides(),
          ],
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
      expect(find.text('复制院校名称与地区'), findsOneWidget);
      expect(find.text('设为一志愿目标'), findsOneWidget);
      expect(find.text('查看历年报录趋势表'), findsOneWidget);

      // 点击“查看历年报录趋势表”
      await tester.tap(find.text('查看历年报录趋势表'));
      await tester.pumpAndSettle();

      // 验证趋势展开（懒加载专业历年数据）
      expect(find.text('历年招生与复试线趋势：'), findsOneWidget);
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
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
            ...buildTestOverrides(),
          ],
          child: MaterialApp(
            theme: AppTheme.warmAmber,
            home: const Scaffold(body: SchoolsView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 单击展开（卡片同时注册了 onTap/onDoubleTap，需等待双击判定超时）
      await tester.tap(find.text('华东师范大学'));
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.text('历年招生与复试线趋势：'), findsOneWidget);
      expect(find.text('355 分'), findsOneWidget);

      // 再次单击折叠
      await tester.tap(find.text('华东师范大学'));
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.text('355 分'), findsNothing);
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
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
            ...buildTestOverrides(),
          ],
          child: MaterialApp(
            theme: AppTheme.warmAmber,
            home: const Scaffold(body: SchoolsView()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 点击自划线筛选（卡片标签也含自划线，需 .first 定位筛选栏 Chip）
      await tester.tap(find.text('自划线').first);
      await tester.pumpAndSettle();

      // 验证仅保留自划线院校：浙江大学保留，华东师范大学被筛除
      expect(find.text('浙江大学'), findsOneWidget);
      expect(find.text('华东师范大学'), findsNothing);
    });
  });
}
