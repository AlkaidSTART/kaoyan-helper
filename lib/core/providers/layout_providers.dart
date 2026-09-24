import 'package:flutter_riverpod/flutter_riverpod.dart';

class NavRailExpandedNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void toggle() => state = !state;
  void setExpanded(bool expanded) => state = expanded;
}

final navRailExpandedProvider = NotifierProvider<NavRailExpandedNotifier, bool>(NavRailExpandedNotifier.new);

class AiPanelExpandedNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void toggle() => state = !state;
  void setExpanded(bool expanded) => state = expanded;
}

final aiPanelExpandedProvider = NotifierProvider<AiPanelExpandedNotifier, bool>(AiPanelExpandedNotifier.new);

class CurrentNavIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void setIndex(int index) => state = index;
}

final currentNavIndexProvider = NotifierProvider<CurrentNavIndexNotifier, int>(CurrentNavIndexNotifier.new);
