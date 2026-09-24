import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/layout_providers.dart';

class ShellTopAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const ShellTopAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(56.0);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isAiExpanded = ref.watch(aiPanelExpandedProvider);

    return AppBar(
      title: Row(
        children: [
          Text(
            '登科',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(width: 24),
          Icon(Icons.school_outlined, size: 18, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text(
            '浙江大学 · 计算机 (085404)',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 24),
          Icon(Icons.timer_outlined, size: 18, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text(
            '距考研 98 天',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.primary,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: '全局搜索 (Cmd+K)',
          icon: const Icon(Icons.search_rounded, size: 20),
          onPressed: () {},
        ),
        IconButton(
          tooltip: 'AI 助教 (Cmd+J)',
          icon: Icon(
            Icons.auto_awesome,
            size: 20,
            color: isAiExpanded ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
          ),
          onPressed: () {
            ref.read(aiPanelExpandedProvider.notifier).toggle();
          },
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(right: 16.0),
          child: CircleAvatar(
            radius: 16,
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Icon(Icons.person_outline, size: 18, color: theme.colorScheme.onPrimaryContainer),
          ),
        ),
      ],
      elevation: 0,
      scrolledUnderElevation: 0,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1.0),
        child: Container(
          color: theme.colorScheme.outlineVariant,
          height: 1.0,
        ),
      ),
    );
  }
}
