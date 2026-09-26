import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/providers/layout_providers.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/main.dart';
import 'helpers/test_overrides.dart';

class AuthenticatedAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: true);
}

void main() {
  group('Web UI Shell & Dashboard Tests', () {
    testWidgets('Desktop AppShell and Dashboard smoke test', (
      WidgetTester tester,
    ) async {
      // 模拟桌面端分辨率 1280x800
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
            ...buildTestOverrides(),
          ],
          child: const MyApp(),
        ),
      );
      await tester.pumpAndSettle();

      // 验证桌面 AppBar 与品牌名称
      expect(find.text('登科'), findsWidgets);
      expect(find.text('浙江大学 · 计算机 (085404)'), findsOneWidget);
      expect(find.text('距考研 98 天'), findsOneWidget);

      // 验证侧边导航 Rail
      expect(find.text('看板'), findsOneWidget);
      expect(find.text('刷题'), findsOneWidget);
      expect(find.text('错题'), findsOneWidget);
      expect(find.text('择校'), findsOneWidget);
      expect(find.text('背诵'), findsOneWidget);
      expect(find.text('助教'), findsOneWidget);

      // 验证学习看板核心统计与卡片
      expect(find.text('考研倒计时'), findsOneWidget);
      expect(find.text('今日刷题'), findsOneWidget);
      expect(find.text('待复习卡片'), findsOneWidget);
      expect(find.text('连续打卡'), findsOneWidget);
      expect(find.text('任务中心'), findsOneWidget);
      expect(find.text('目标看板'), findsOneWidget);
      expect(find.text('浙江大学 · 计算机专硕 (085404)'), findsOneWidget);
      expect(find.text('报录比: 8.2:1'), findsOneWidget);
    });

    testWidgets('AI Chat Panel toggle and interaction test', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer(
        overrides: [
          authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
          ...buildTestOverrides(),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const MyApp()),
      );
      await tester.pumpAndSettle();

      // 初始状态下 AI 面板关闭
      expect(container.read(aiPanelExpandedProvider), isFalse);

      // 点击导航栏的助教图标展开
      await tester.tap(find.byIcon(Icons.smart_toy_outlined));
      await tester.pumpAndSettle();

      expect(container.read(aiPanelExpandedProvider), isTrue);
      expect(find.text('AI 助教'), findsOneWidget);
      expect(find.text('27/30 次'), findsOneWidget);

      // 输入并发送消息
      final inputField = find.byType(TextField);
      expect(inputField, findsOneWidget);
      await tester.enterText(inputField, '请解释一下哲学基本问题');
      await tester.pumpAndSettle();

      final sendButton = find.byIcon(Icons.arrow_upward_rounded);
      expect(sendButton, findsOneWidget);
      await tester.tap(sendButton);
      await tester.pumpAndSettle();

      expect(find.text('请解释一下哲学基本问题'), findsOneWidget);
    });

    testWidgets('Mobile Breakpoint fallback test', (WidgetTester tester) async {
      // 模拟移动端分辨率 400x800 (< 768px)
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
            ...buildTestOverrides(),
          ],
          child: const MyApp(),
        ),
      );
      await tester.pumpAndSettle();

      // 移动端应该呈现 NavigationBar
      expect(find.byType(NavigationBar), findsOneWidget);
      expect(find.text('看板'), findsOneWidget);
    });
  });
}
