import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../features/mistakes/domain/mistake_models.dart';
import '../../../features/mistakes/presentation/mistakes_providers.dart';
import '../../../features/shared/subject_labels.dart';
import '../../widgets/status_dot.dart';
import 'widgets/mistake_card.dart' show MistakeCard, MistakeStatus;
import 'widgets/redo_dialog.dart';

MistakeStatus mistakeStatusOf(MistakeRecord record) {
  if (record.status == 'mastered') {
    return MistakeStatus.mastered;
  }
  return record.consecutiveCorrect >= 1
      ? MistakeStatus.critical
      : MistakeStatus.pending;
}

class MistakesView extends ConsumerWidget {
  const MistakesView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final semantic =
        theme.extension<SemanticColors>() ?? SemanticColors.standard;
    final pageState = ref.watch(mistakesProvider);
    final notifier = ref.read(mistakesProvider.notifier);

    final subjectChips = [
      {
        'name': '全部',
        'bg': theme.colorScheme.surfaceContainerHighest,
        'text': theme.colorScheme.onSurface,
      },
      {
        'name': '思想政治',
        'bg': semantic.politicsContainer,
        'text': semantic.politicsText,
      },
      {
        'name': '考研英语',
        'bg': semantic.englishContainer,
        'text': semantic.englishText,
      },
      {'name': '考研数学', 'bg': semantic.mathContainer, 'text': semantic.mathText},
      {
        'name': '专业课',
        'bg': semantic.majorContainer,
        'text': semantic.majorText,
      },
    ];

    final body = pageState.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 60.0),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 40.0),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                error is AppException ? error.message : '错题加载失败，请稍后重试',
                style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: notifier.refresh,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('重新加载'),
              ),
            ],
          ),
        ),
      ),
      data: (page) {
        final mistakes = page?.items ?? const <MistakeRecord>[];

        if (mistakes.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 40.0),
            child: Center(
              child: Text(
                '当前筛选下暂无错题',
                style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
          );
        }

        return Column(
          children: [
            for (final m in mistakes)
              MistakeCard(
                tag: [
                  SubjectLabels.subject(m.question?.subject ?? ''),
                  SubjectLabels.type(m.question?.type ?? ''),
                ].where((part) => part.isNotEmpty).join(' · '),
                tagBgColor: _subjectBg(m, semantic),
                tagTextColor: _subjectText(m, semantic),
                stem: m.question?.stem ?? '（原题已被删除，可通过重做练习巩固）',
                lastWrongTime: _relativeTime(m.lastWrongAt),
                wrongCount: m.errorCount,
                status: mistakeStatusOf(m),
                onRedo: () => _openRedoDialog(context, ref, m),
                onReview: () => _openRedoDialog(context, ref, m),
                onDelete: () => _confirmDelete(context, ref, m),
              ),
          ],
        );
      },
    );

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 860),
        child: RefreshIndicator(
          onRefresh: () => notifier.refresh(),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: 24.0,
              vertical: 20.0,
            ),
            children: [
              // 学科筛选栏
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (int i = 0; i < subjectChips.length; i++)
                    FilterChip(
                      label: Text(
                        subjectChips[i]['name'] as String,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: notifier.subjectFilter == i
                              ? FontWeight.bold
                              : FontWeight.normal,
                          color: notifier.subjectFilter == i
                              ? Colors.white
                              : subjectChips[i]['text'] as Color,
                        ),
                      ),
                      selected: notifier.subjectFilter == i,
                      selectedColor: theme.colorScheme.primary,
                      backgroundColor: subjectChips[i]['bg'] as Color,
                      checkmarkColor: Colors.white,
                      onSelected: (selected) {
                        notifier.setSubjectFilter(selected ? i : 0);
                      },
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // 状态筛选
              Row(
                children: [
                  ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        StatusDot(color: semantic.danger, size: 6),
                        const SizedBox(width: 6),
                        Text(
                          _statusLabel(pageState, 0, '待消除', notifier),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    selected: notifier.statusFilter == 0,
                    onSelected: (s) => notifier.setStatusFilter(0),
                  ),
                  const SizedBox(width: 10),
                  ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        StatusDot(color: semantic.success, size: 6),
                        const SizedBox(width: 6),
                        Text(
                          _statusLabel(pageState, 1, '已掌握', notifier),
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    selected: notifier.statusFilter == 1,
                    onSelected: (s) => notifier.setStatusFilter(1),
                  ),
                  const Spacer(),
                  FilledButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('已启动随机 10 题靶向攻坚！')),
                      );
                    },
                    icon: const Icon(Icons.play_arrow_rounded, size: 18),
                    label: const Text('开始错题攻坚'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 错题卡片列表
              body,
            ],
          ),
        ),
      ),
    );
  }

  /// 仅当前选中状态有真实 total（分页口径），未选中状态不显示数字。
  String _statusLabel(
    AsyncValue<MistakePage?> state,
    int status,
    String name,
    MistakesNotifier notifier,
  ) {
    final page = state.value;
    if (page == null || state.isLoading || notifier.statusFilter != status) {
      return name;
    }
    return '$name (${page.total})';
  }

  Color _subjectBg(MistakeRecord m, SemanticColors semantic) {
    return switch (m.question?.subject) {
      'politics' => semantic.politicsContainer,
      'english' => semantic.englishContainer,
      'math' => semantic.mathContainer,
      _ => semantic.majorContainer,
    };
  }

  Color _subjectText(MistakeRecord m, SemanticColors semantic) {
    return switch (m.question?.subject) {
      'politics' => semantic.politicsText,
      'english' => semantic.englishText,
      'math' => semantic.mathText,
      _ => semantic.majorText,
    };
  }

  String _relativeTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) {
      return '刚刚';
    }
    if (diff.inHours < 1) {
      return '${diff.inMinutes} 分钟前';
    }
    if (diff.inDays < 1) {
      return '${diff.inHours} 小时前';
    }
    if (diff.inDays < 30) {
      return '${diff.inDays} 天前';
    }
    return '${time.year}-${time.month}-${time.day}';
  }

  Future<void> _openRedoDialog(
    BuildContext context,
    WidgetRef ref,
    MistakeRecord mistake,
  ) async {
    if (mistake.question == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('原题已被删除，无法重做；可删除该错题记录')));
      return;
    }

    final result = await showDialog<RedoResult>(
      context: context,
      builder: (_) => RedoDialog(mistake: mistake),
    );

    if (result == null || !context.mounted) {
      return;
    }

    final message = result.mastered
        ? '太棒了！该错题已完全消除掌握'
        : result.isCorrect
        ? '连对 ${result.mistake.consecutiveCorrect} 次！再对 ${2 - result.mistake.consecutiveCorrect} 次即可消除'
        : '再接再厉，错题连对已清零';
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    MistakeRecord mistake,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('删除错题'),
        content: const Text('删除后不再出现在错题本，题目本身不受影响。确认删除？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('删除'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    try {
      await ref.read(mistakesProvider.notifier).delete(mistake);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('错题已删除')));
      }
    } on AppException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}
