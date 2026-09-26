import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/theme/app_theme.dart';
import 'package:kaoyan_helper/features/auth/presentation/auth_notifier.dart';
import 'package:kaoyan_helper/features/schools/presentation/schools_providers.dart';
import 'package:kaoyan_helper/ui/features/schools/schools_view.dart';

import 'helpers/test_overrides.dart';

class AuthenticatedAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthState(isAuthenticated: true);
}

void main() {
  testWidgets('debug schools star', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1.0;
    late ProviderScope scope;
    await tester.pumpWidget(
      scope = ProviderScope(
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

    final container = ProviderScope.containerOf(
      tester.element(find.byType(SchoolsView)),
    );
    final page = container.read(schoolsProvider).value;
    debugPrint('page items: ${page?.items.map((s) => s.name).toList()}');
    debugPrint('targets: ${page?.targets.length}');

    final stars = find.byIcon(Icons.star_outline_rounded);
    debugPrint('star_outline count: ${stars.evaluate().length}');
    final starCenter = tester.getCenter(stars.first);
    debugPrint('star center: $starCenter');
    await tester.tap(stars.first, warnIfMissed: true);
    await tester.pumpAndSettle();
    final page2 = container.read(schoolsProvider).value;
    debugPrint('targets after: ${page2?.targets.map((t) => t.schoolName).toList()}');
    debugPrint('star_rounded: ${tester.widgetList(find.byIcon(Icons.star_rounded)).length}');
  });
}
