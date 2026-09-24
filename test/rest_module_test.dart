import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/providers/layout_providers.dart';
import 'package:kaoyan_helper/core/theme/app_theme.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/main.dart';
import 'package:kaoyan_helper/ui/features/rest/rest_view.dart';

class AuthenticatedAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: true);
}

void main() {
  group('Rest & Focus Module Tests', () {
    testWidgets(
      'RestView: segmented mode switching and muyu strike interaction',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              theme: AppTheme.warmAmber,
              home: const Scaffold(body: RestView()),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // 验证模式切换分段按钮
        expect(find.text('深呼吸'), findsOneWidget);
        expect(find.text('考研木鱼'), findsOneWidget);
        expect(find.text('舒尔特方格'), findsOneWidget);

        // 默认在木鱼模式
        expect(find.text('今日心流累积'), findsOneWidget);
        expect(find.text('88'), findsOneWidget);

        // 点击木鱼进行敲击
        await tester.tap(find.byKey(const Key('muyu_strike_target')));
        await tester.pump();

        // 心流累积增加
        expect(find.text('89'), findsOneWidget);

        // 切换至“深呼吸”
        await tester.tap(find.text('深呼吸'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));

        expect(find.text('4-4-4 箱式平复呼吸法'), findsOneWidget);

        // 切换至“舒尔特方格”
        await tester.tap(find.text('舒尔特方格'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));

        expect(find.text('目标数字：1'), findsOneWidget);
        expect(find.text('按顺序依次快速点选 1 至 25，训练视野聚焦与反应力'), findsOneWidget);
      },
    );

    testWidgets(
      'AppShell integration: navigate to RestView via SideNavRail and Floating Pomodoro',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        final container = ProviderContainer(
          overrides: [
            authNotifierProvider.overrideWith(AuthenticatedAuthNotifier.new),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          UncontrolledProviderScope(container: container, child: const MyApp()),
        );
        await tester.pumpAndSettle();

        // 验证侧栏存在“休息”目的地
        expect(find.text('休息'), findsOneWidget);

        // 点击“休息” Tab
        await tester.tap(find.byIcon(Icons.self_improvement_outlined));
        await tester.pumpAndSettle();

        // 验证进入 RestView
        expect(container.read(currentNavIndexProvider), 5);
        expect(find.text('考研木鱼'), findsOneWidget);

        // 验证悬浮番茄钟存在
        expect(find.text('25m'), findsOneWidget);

        // 点击悬浮番茄钟气泡展开
        await tester.tap(find.text('25m'));
        await tester.pumpAndSettle();

        expect(find.text('番茄专注钟'), findsOneWidget);
        expect(find.text('前往休息'), findsOneWidget);
      },
    );
  });
}
