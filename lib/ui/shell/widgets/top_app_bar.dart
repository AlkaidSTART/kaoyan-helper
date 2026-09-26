import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/layout_providers.dart';
import '../../../features/auth/presentation/auth_notifier.dart';

class ShellTopAppBar extends ConsumerWidget implements PreferredSizeWidget {
  const ShellTopAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(56.0);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isAiExpanded = ref.watch(aiPanelExpandedProvider);
    final currentUser = ref.watch(authNotifierProvider).currentUser;

    // 目标院校/倒计时来自后端聚合数据；未登录或尚未完善时展示引导文案。
    final school = currentUser == null
        ? null
        : (currentUser.targetSchool == null
              ? '完善目标院校'
              : [
                  currentUser.targetSchool,
                  currentUser.targetMajor,
                ].nonNulls.join(' · '));
    final schoolText = school ?? '浙江大学 · 计算机 (085404)';
    final daysText = currentUser?.daysUntilExam == null
        ? '距考研 98 天'
        : '距考研 ${currentUser!.daysUntilExam} 天';
    final nickname = currentUser?.nickname ?? '研友';

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
          Icon(
            Icons.school_outlined,
            size: 18,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 6),
          Text(
            schoolText,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 24),
          Icon(
            Icons.timer_outlined,
            size: 18,
            color: theme.colorScheme.onSurfaceVariant,
          ),
          const SizedBox(width: 6),
          Text(
            daysText,
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
            color: isAiExpanded
                ? theme.colorScheme.primary
                : theme.colorScheme.onSurfaceVariant,
          ),
          onPressed: () {
            ref.read(aiPanelExpandedProvider.notifier).toggle();
          },
        ),
        const SizedBox(width: 8),
        Padding(
          padding: const EdgeInsets.only(right: 16.0),
          child: PopupMenuButton<String>(
            tooltip: '个人中心',
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.outlineVariant),
            ),
            color: theme.colorScheme.surface,
            onSelected: (value) {
              if (value == 'logout') {
                ref.read(authNotifierProvider.notifier).logout();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                enabled: false,
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: Icon(
                        Icons.person_outline,
                        size: 16,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      nickname,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings_outlined, size: 18),
                    SizedBox(width: 10),
                    Text('个人设置'),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(
                      Icons.logout_rounded,
                      size: 18,
                      color: theme.colorScheme.error,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '退出登录',
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  ],
                ),
              ),
            ],
            child: CircleAvatar(
              radius: 16,
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Icon(
                Icons.person_outline,
                size: 18,
                color: theme.colorScheme.onPrimaryContainer,
              ),
            ),
          ),
        ),
      ],
      elevation: 0,
      scrolledUnderElevation: 0,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1.0),
        child: Container(color: theme.colorScheme.outlineVariant, height: 1.0),
      ),
    );
  }
}
