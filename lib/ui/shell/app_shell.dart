import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'widgets/ai_chat_panel.dart';
import 'widgets/side_nav_rail.dart';
import 'widgets/top_app_bar.dart';
import '../../core/providers/layout_providers.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.sizeOf(context).width;
    final isDesktop = width >= 1024;
    final currentIndex = ref.watch(currentNavIndexProvider);

    // 简单页面占位
    final pages = [
      const Center(child: Text('看板视图')),
      const Center(child: Text('刷题视图')),
      const Center(child: Text('错题视图')),
      const Center(child: Text('择校视图')),
      const Center(child: Text('背诵视图')),
      const Center(child: Text('助教视图')), // 通常不会显示这个页面，除非在移动端
    ];

    if (isDesktop) {
      return Scaffold(
        appBar: const ShellTopAppBar(),
        body: Row(
          children: [
            const SideNavRail(),
            const VerticalDivider(thickness: 1, width: 1),
            Expanded(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: pages[currentIndex],
                ),
              ),
            ),
            const AiChatPanel(),
          ],
        ),
      );
    }

    // 非桌面端的简单 fallback (例如平板或移动端)
    return Scaffold(
      appBar: AppBar(title: const Text('登科 - 移动端适配待开发')),
      body: pages[currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex > 4 ? 0 : currentIndex,
        onDestinationSelected: (index) {
           ref.read(currentNavIndexProvider.notifier).setIndex(index);
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: '看板'),
          NavigationDestination(icon: Icon(Icons.quiz_outlined), label: '刷题'),
          NavigationDestination(icon: Icon(Icons.book_outlined), label: '错题'),
          NavigationDestination(icon: Icon(Icons.school_outlined), label: '择校'),
          NavigationDestination(icon: Icon(Icons.style_outlined), label: '背诵'),
        ],
      ),
    );
  }
}
