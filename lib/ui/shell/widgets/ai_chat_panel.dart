import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/layout_providers.dart';

class AiChatPanel extends ConsumerWidget {
  const AiChatPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isExpanded = ref.watch(aiPanelExpandedProvider);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      width: isExpanded ? 400.0 : 0.0,
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: Theme.of(context).dividerColor,
          ),
        ),
        color: Theme.of(context).colorScheme.surface,
      ),
      child: isExpanded
          ? Column(
              children: [
                AppBar(
                  title: const Text('AI 助教', style: TextStyle(fontSize: 16)),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.close_outlined),
                      onPressed: () {
                        ref.read(aiPanelExpandedProvider.notifier).setExpanded(false);
                      },
                    ),
                  ],
                  automaticallyImplyLeading: false,
                  elevation: 0,
                  scrolledUnderElevation: 0,
                ),
                const Expanded(
                  child: Center(
                    child: Text('AI 助教对话区域 (待开发)'),
                  ),
                ),
              ],
            )
          : const SizedBox.shrink(),
    );
  }
}
