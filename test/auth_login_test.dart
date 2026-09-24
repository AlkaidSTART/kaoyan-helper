import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/features/auth/presentation/login_page.dart';
import 'package:kaoyan_helper/main.dart';

void main() {
  group('Auth Login & Interceptor Tests', () {
    testWidgets(
      'Default interception: unauthenticated user lands on LoginPage',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(const ProviderScope(child: MyApp()));
        await tester.pumpAndSettle();

        // 默认拦截在 LoginPage
        expect(find.byType(LoginPage), findsOneWidget);
        expect(find.text('开启今日研途'), findsOneWidget);
        expect(find.text('填入测试账号'), findsOneWidget);
      },
    );

    testWidgets(
      'Quick filler button populates credentials and checks agreement',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(1280, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(const ProviderScope(child: MyApp()));
        await tester.pumpAndSettle();

        // 点击填入测试账号
        await tester.tap(find.text('填入测试账号'));
        await tester.pumpAndSettle();

        // 验证输入框已预置
        expect(find.text('13800000000'), findsOneWidget);
        expect(find.text('123456'), findsOneWidget);

        // 验证协议复选框已被勾选
        final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
        expect(checkbox.value, isTrue);
      },
    );

    testWidgets('Mock login and logout interception full closed loop', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const MyApp()),
      );
      await tester.pumpAndSettle();

      // 1. 拦截在登录页
      expect(find.byType(LoginPage), findsOneWidget);

      // 2. 点击填入测试账号
      await tester.tap(find.text('填入测试账号'));
      await tester.pumpAndSettle();

      // 3. 点击登录提交
      await tester.tap(find.text('进入自习室 · 开启专注'));
      await tester.pumpAndSettle();

      // 4. 成功流转至主页面 AppShell，展示用户信息
      expect(container.read(authNotifierProvider).isAuthenticated, isTrue);
      expect(
        container.read(authNotifierProvider).currentUser?.nickname,
        '登科研友',
      );
      expect(find.text('浙江大学 · 计算机 (085404)'), findsOneWidget);
      expect(find.text('距考研 98 天'), findsOneWidget);

      // 5. 点击头像弹出菜单并退出登录
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();

      expect(find.text('退出登录'), findsOneWidget);
      await tester.tap(find.text('退出登录'));
      await tester.pumpAndSettle();

      // 6. 登出后自动重新拦截回 LoginPage
      expect(container.read(authNotifierProvider).isAuthenticated, isFalse);
      expect(find.byType(LoginPage), findsOneWidget);
      expect(find.text('开启今日研途'), findsOneWidget);
    });
  });
}
