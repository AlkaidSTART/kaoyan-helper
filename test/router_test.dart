import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/providers/layout_providers.dart';
import 'package:kaoyan_helper/core/router/app_router.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/features/auth/presentation/login_page.dart';
import 'package:kaoyan_helper/main.dart';
import 'package:kaoyan_helper/ui/features/dashboard/dashboard_view.dart';
import 'package:kaoyan_helper/ui/features/rest/rest_view.dart';
import 'package:kaoyan_helper/ui/features/schools/schools_view.dart';

import 'helpers/test_overrides.dart';

class AuthenticatedAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: true);
}

void main() {
  group('GoRouter Unified Routing Tests', () {
    testWidgets('Unauthenticated user is redirected to /login', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final container = ProviderContainer(overrides: buildTestOverrides());
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(container: container, child: const MyApp()),
      );
      await tester.pumpAndSettle();

      // Verify unauthenticated user lands on LoginPage
      expect(find.byType(LoginPage), findsOneWidget);
      final router = container.read(routerProvider);
      expect(
        router.routerDelegate.currentConfiguration.uri.toString(),
        AppRoutes.login,
      );
    });

    testWidgets('Authenticated user lands on /dashboard and can switch tabs', (
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

      // Verify authenticated user lands on Dashboard
      expect(find.byType(DashboardView), findsOneWidget);
      final router = container.read(routerProvider);
      expect(
        router.routerDelegate.currentConfiguration.uri.toString(),
        AppRoutes.dashboard,
      );

      // Navigate to /schools via router
      router.go(AppRoutes.schools);
      await tester.pumpAndSettle();

      expect(find.byType(SchoolsView), findsOneWidget);
      expect(container.read(currentNavIndexProvider), 3);

      // Navigate to /rest via router
      router.go(AppRoutes.rest);
      await tester.pumpAndSettle();

      expect(find.byType(RestView), findsOneWidget);
      expect(container.read(currentNavIndexProvider), 5);
    });

    testWidgets('Authenticated user navigating to /login redirects to /dashboard', (
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

      final router = container.read(routerProvider);

      // Attempt to navigate to /login while authenticated
      router.go(AppRoutes.login);
      await tester.pumpAndSettle();

      // Should be redirected back to /dashboard
      expect(find.byType(DashboardView), findsOneWidget);
      expect(
        router.routerDelegate.currentConfiguration.uri.toString(),
        AppRoutes.dashboard,
      );
    });

    testWidgets('SideNavRail destination click drives router branch switch', (
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

      // Click on '背诵' icon in NavigationRail (Flashcards, Index 4)
      final flashcardDestination = find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.style_outlined),
      );
      await tester.tap(flashcardDestination);
      await tester.pumpAndSettle();

      final router = container.read(routerProvider);
      expect(
        router.routerDelegate.currentConfiguration.uri.toString(),
        AppRoutes.flashcards,
      );
      expect(container.read(currentNavIndexProvider), 4);
    });
  });
}
