import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'widgets/ai_chat_panel.dart';
import 'widgets/side_nav_rail.dart';
import 'widgets/top_app_bar.dart';
import '../../core/providers/layout_providers.dart';
import '../features/dashboard/dashboard_view.dart';
import '../features/quiz/quiz_view.dart';
import '../features/mistakes/mistakes_view.dart';
import '../features/schools/schools_view.dart';
import '../features/flashcards/flashcards_view.dart';
import '../features/rest/rest_view.dart';
import '../features/rest/widgets/floating_pomodoro_bubble.dart';

// 快捷键意图定义
class ToggleNavRailIntent extends Intent {
  const ToggleNavRailIntent();
}

class ToggleAiPanelIntent extends Intent {
  const ToggleAiPanelIntent();
}

class ClosePanelIntent extends Intent {
  const ClosePanelIntent();
}

class AppShell extends ConsumerWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.sizeOf(context).width;
    final isDesktop = width >= 1024;
    final currentIndex = ref.watch(currentNavIndexProvider);

    final pages = [
      const DashboardView(),
      const QuizView(),
      const MistakesView(),
      const SchoolsView(),
      const FlashcardsView(),
      const RestView(),
      const Center(child: Text('AI 助教独立视窗')),
    ];

    final activeIndex = (currentIndex >= 0 && currentIndex < pages.length) ? currentIndex : 0;

    // 快捷键映射
    final shortcuts = <ShortcutActivator, Intent>{
      LogicalKeySet(LogicalKeyboardKey.meta, LogicalKeyboardKey.keyB): const ToggleNavRailIntent(),
      LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.keyB): const ToggleNavRailIntent(),
      LogicalKeySet(LogicalKeyboardKey.meta, LogicalKeyboardKey.keyJ): const ToggleAiPanelIntent(),
      LogicalKeySet(LogicalKeyboardKey.control, LogicalKeyboardKey.keyJ): const ToggleAiPanelIntent(),
      const SingleActivator(LogicalKeyboardKey.escape): const ClosePanelIntent(),
    };

    final actions = <Type, Action<Intent>>{
      ToggleNavRailIntent: CallbackAction<ToggleNavRailIntent>(
        onInvoke: (_) => ref.read(navRailExpandedProvider.notifier).toggle(),
      ),
      ToggleAiPanelIntent: CallbackAction<ToggleAiPanelIntent>(
        onInvoke: (_) => ref.read(aiPanelExpandedProvider.notifier).toggle(),
      ),
      ClosePanelIntent: CallbackAction<ClosePanelIntent>(
        onInvoke: (_) {
          if (ref.read(aiPanelExpandedProvider)) {
            ref.read(aiPanelExpandedProvider.notifier).setExpanded(false);
          }
          return null;
        },
      ),
    };

    if (isDesktop) {
      return Shortcuts(
        shortcuts: shortcuts,
        child: Actions(
          actions: actions,
          child: Focus(
            autofocus: true,
            child: Scaffold(
              appBar: const ShellTopAppBar(),
              body: Stack(
                children: [
                  Row(
                    children: [
                      const SideNavRail(),
                      VerticalDivider(
                        thickness: 1,
                        width: 1,
                        color: Theme.of(context).colorScheme.outlineVariant,
                      ),
                      Expanded(
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 960),
                            child: pages[activeIndex],
                          ),
                        ),
                      ),
                      const AiChatPanel(),
                    ],
                  ),
                  const FloatingPomodoroBubble(),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // 非桌面端的简单 fallback (平板或移动端)
    return Scaffold(
      appBar: AppBar(title: const Text('登科')),
      body: pages[activeIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: activeIndex > 5 ? 0 : activeIndex,
        onDestinationSelected: (index) {
          ref.read(currentNavIndexProvider.notifier).setIndex(index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: '看板',
          ),
          NavigationDestination(
            icon: Icon(Icons.quiz_outlined),
            selectedIcon: Icon(Icons.quiz_rounded),
            label: '刷题',
          ),
          NavigationDestination(
            icon: Icon(Icons.book_outlined),
            selectedIcon: Icon(Icons.book_rounded),
            label: '错题',
          ),
          NavigationDestination(
            icon: Icon(Icons.school_outlined),
            selectedIcon: Icon(Icons.school_rounded),
            label: '择校',
          ),
          NavigationDestination(
            icon: Icon(Icons.style_outlined),
            selectedIcon: Icon(Icons.style_rounded),
            label: '背诵',
          ),
          NavigationDestination(
            icon: Icon(Icons.self_improvement_outlined),
            selectedIcon: Icon(Icons.self_improvement_rounded),
            label: '休息',
          ),
        ],
      ),
    );
  }
}
