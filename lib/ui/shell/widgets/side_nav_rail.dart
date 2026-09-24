import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/layout_providers.dart';

class SideNavRail extends ConsumerWidget {
  const SideNavRail({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(currentNavIndexProvider);
    final isExpanded = ref.watch(navRailExpandedProvider);

    return NavigationRail(
      selectedIndex: currentIndex,
      extended: isExpanded,
      onDestinationSelected: (index) {
        if (index == 5) {
          // 助教按钮，切换右侧面板，不改变当前主视窗
          final isAiExpanded = ref.read(aiPanelExpandedProvider);
          ref.read(aiPanelExpandedProvider.notifier).state = !isAiExpanded;
          return;
        }
        ref.read(currentNavIndexProvider.notifier).state = index;
      },
      leading: IconButton(
        icon: const Icon(Icons.menu_outlined),
        onPressed: () {
          ref.read(navRailExpandedProvider.notifier).state = !isExpanded;
        },
      ),
      destinations: const [
        NavigationRailDestination(
          icon: Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard_rounded),
          label: Text('看板'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.quiz_outlined),
          selectedIcon: Icon(Icons.quiz_rounded),
          label: Text('刷题'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.book_outlined),
          selectedIcon: Icon(Icons.book_rounded),
          label: Text('错题'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.school_outlined),
          selectedIcon: Icon(Icons.school_rounded),
          label: Text('择校'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.style_outlined),
          selectedIcon: Icon(Icons.style_rounded),
          label: Text('背诵'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.smart_toy_outlined),
          selectedIcon: Icon(Icons.smart_toy_rounded),
          label: Text('助教'),
        ),
      ],
    );
  }
}
