import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/auth_notifier.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../ui/features/dashboard/dashboard_view.dart';
import '../../ui/features/flashcards/flashcards_view.dart';
import '../../ui/features/mistakes/mistakes_view.dart';
import '../../ui/features/quiz/quiz_view.dart';
import '../../ui/features/rest/rest_view.dart';
import '../../ui/features/schools/schools_view.dart';
import '../../ui/shell/app_shell.dart';

abstract final class AppRoutes {
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const quiz = '/quiz';
  static const mistakes = '/mistakes';
  static const schools = '/schools';
  static const flashcards = '/flashcards';
  static const rest = '/rest';
}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

class RouterNotifier extends ChangeNotifier {
  final Ref _ref;

  RouterNotifier(this._ref) {
    _ref.listen(authNotifierProvider, (previous, next) {
      if (previous?.isAuthenticated != next.isAuthenticated ||
          previous?.isRestoring != next.isRestoring) {
        notifyListeners();
      }
    });
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final authState = _ref.read(authNotifierProvider);
    final isAuthenticated = authState.isAuthenticated;
    final isLoggingIn = state.matchedLocation == AppRoutes.login;

    // 启动会话恢复期间不强制跳转，待恢复结果收敛后再定向。
    if (authState.isRestoring) {
      return null;
    }

    if (!isAuthenticated) {
      return isLoggingIn ? null : AppRoutes.login;
    }

    if (isLoggingIn) {
      return AppRoutes.dashboard;
    }

    return null;
  }
}

final routerNotifierProvider = Provider<RouterNotifier>((ref) {
  final notifier = RouterNotifier(ref);
  ref.onDispose(notifier.dispose);
  return notifier;
});

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.dashboard,
    refreshListenable: notifier,
    redirect: notifier.redirect,
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(path: '/', redirect: (_, _) => AppRoutes.dashboard),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.dashboard,
                builder: (context, state) => const DashboardView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.quiz,
                builder: (context, state) => const QuizView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.mistakes,
                builder: (context, state) => const MistakesView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.schools,
                builder: (context, state) => const SchoolsView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.flashcards,
                builder: (context, state) => const FlashcardsView(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.rest,
                builder: (context, state) => const RestView(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
