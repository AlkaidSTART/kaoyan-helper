import 'package:flutter_riverpod/flutter_riverpod.dart';

final navRailExpandedProvider = StateProvider<bool>((ref) => false);
final aiPanelExpandedProvider = StateProvider<bool>((ref) => false);
final currentNavIndexProvider = StateProvider<int>((ref) => 0);
