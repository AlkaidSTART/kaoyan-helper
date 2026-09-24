import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('AppShell smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    // Verify that the title '登科' is displayed.
    expect(find.text('登科'), findsWidgets);

    // Verify that NavigationRail destinations exist.
    expect(find.text('看板'), findsWidgets);
    expect(find.text('刷题'), findsWidgets);
  });
}
