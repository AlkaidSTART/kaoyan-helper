import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/features/auth/presentation/login_page.dart';

void main() {
  group('Auth Login Page Tests', () {
    testWidgets('Desktop LoginPage renders with background and glass card', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 验证标题与励志文案
      expect(find.text('开启今日研途'), findsOneWidget);
      expect(find.text('桌前书本已备齐，向上生长正当时'), findsOneWidget);

      // 验证 Tab 切换项
      expect(find.text('验证码登录'), findsOneWidget);
      expect(find.text('密码登录'), findsOneWidget);

      // 验证主登录按钮与第三方入口
      expect(find.text('进入自习室 · 开启专注'), findsOneWidget);
      expect(find.text('快速登录'), findsOneWidget);
      expect(find.text('我已阅读并同意《服务协议》与《隐私政策》'), findsOneWidget);
    });

    testWidgets('Tab switching between verification code and password mode', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 初始为验证码模式
      expect(find.text('6 位验证码'), findsOneWidget);
      expect(find.text('获取验证码'), findsOneWidget);

      // 切换到密码登录
      await tester.tap(find.text('密码登录'));
      await tester.pumpAndSettle();

      expect(find.text('请输入登录密码'), findsOneWidget);
      expect(find.byIcon(Icons.lock_outline_rounded), findsOneWidget);
    });

    testWidgets('Validation: submit without agreeing to terms shows notice', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginPage(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 直接点击登录按钮
      await tester.tap(find.text('进入自习室 · 开启专注'));
      await tester.pumpAndSettle();

      // 提示同意协议
      expect(find.text('请先勾选并同意服务协议与隐私政策'), findsOneWidget);
    });

    testWidgets('Successful login flow with code', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer();
      addTearDown(container.dispose);

      bool loginSuccessCalled = false;

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: LoginPage(
              onLoginSuccess: () {
                loginSuccessCalled = true;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 勾选用户协议
      await tester.tap(find.byType(Checkbox));
      await tester.pumpAndSettle();

      // 输入手机号与验证码
      final textFields = find.byType(TextField);
      await tester.enterText(textFields.at(0), '13800000000');
      await tester.enterText(textFields.at(1), '123456');
      await tester.pumpAndSettle();

      // 点击登录
      await tester.tap(find.text('进入自习室 · 开启专注'));
      await tester.pumpAndSettle();

      expect(container.read(authNotifierProvider).isAuthenticated, isTrue);
      expect(loginSuccessCalled, isTrue);
    });
  });
}
