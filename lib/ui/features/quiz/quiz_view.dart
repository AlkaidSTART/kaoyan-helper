import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/providers/layout_providers.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../features/quiz/presentation/quiz_providers.dart';
import '../../../features/shared/subject_labels.dart';
import 'widgets/quiz_option_card.dart';

class QuizView extends ConsumerWidget {
  const QuizView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionState = ref.watch(quizSessionProvider);

    return sessionState.when(
      loading: () => const _QuizPlaceholder(child: CircularProgressIndicator()),
      error: (error, _) => _QuizError(error: error),
      data: (session) {
        if (session == null) {
          return const _QuizPlaceholder(child: SizedBox.shrink());
        }
        return _QuizSessionBody(session: session);
      },
    );
  }
}

class _QuizSessionBody extends ConsumerWidget {
  final QuizSession session;

  const _QuizSessionBody({required this.session});

  void _handleSelect(BuildContext context, WidgetRef ref, String key) {
    if (session.result != null || session.submitting) {
      return;
    }

    ref.read(quizSessionProvider.notifier).submit(key).catchError((error) {
      if (context.mounted && error is AppException) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
      return null;
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final semantic =
        theme.extension<SemanticColors>() ?? SemanticColors.standard;
    final question = session.current;
    final result = session.result;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 768),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 顶部元信息行
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: semantic.politicsContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          SubjectLabels.subject(question.subject),
                          style: TextStyle(
                            color: semantic.politicsText,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          [
                            if (question.year != null) '${question.year} 真题',
                            SubjectLabels.type(question.type),
                          ].join(' · '),
                          style: TextStyle(
                            color: theme.colorScheme.onSurfaceVariant,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${session.index + 1} / ${session.items.length}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // 题干正文
              Text(
                question.stem,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontSize: 17,
                  height: 1.6,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 20),

              // 选项列表
              for (int i = 0; i < question.options.length; i++) ...[
                Builder(
                  builder: (context) {
                    final option = question.options[i];
                    OptionFeedbackState state = OptionFeedbackState.idle;
                    if (result != null) {
                      if (option.key == result.correctAnswer) {
                        state = OptionFeedbackState.correct;
                      } else if (option.key == session.selectedKey) {
                        state = OptionFeedbackState.wrong;
                      }
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: QuizOptionCard(
                        letter: option.key,
                        content: option.content,
                        state: state,
                        isLocked: result != null || session.submitting,
                        onTap: () => _handleSelect(context, ref, option.key),
                      ),
                    );
                  },
                ),
              ],
              const SizedBox(height: 16),

              // 解析展开区域 (AnimatedCrossFade)
              AnimatedCrossFade(
                duration: const Duration(milliseconds: 250),
                firstCurve: Curves.easeOutCubic,
                secondCurve: Curves.easeInCubic,
                crossFadeState: result != null
                    ? CrossFadeState.showSecond
                    : CrossFadeState.showFirst,
                firstChild: const SizedBox(width: double.infinity),
                secondChild: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  // AnimatedCrossFade 会同时构建两个子树，result 为空时不能解引用
                  child: result == null
                      ? const SizedBox.shrink()
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  result.isCorrect
                                      ? Icons.check_circle_outline_rounded
                                      : Icons.cancel_outlined,
                                  size: 20,
                                  color: result.isCorrect
                                      ? semantic.success
                                      : semantic.danger,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  result.isCorrect
                                      ? '回答正确，正确答案: ${result.correctAnswer}'
                                      : '回答有误，正确答案: ${result.correctAnswer}',
                                  style: TextStyle(
                                    color: result.isCorrect
                                        ? semantic.success
                                        : semantic.danger,
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.menu_book_outlined,
                                  size: 18,
                                  color: theme.colorScheme.primary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '官方解析：',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.onSurface,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Padding(
                              padding: const EdgeInsets.only(left: 26.0),
                              child: Text(
                                result.explanation ?? '暂无解析',
                                style: TextStyle(
                                  fontSize: 14,
                                  height: 1.5,
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            // 底部操作栏
                            Row(
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () {
                                    ref
                                        .read(aiPanelExpandedProvider.notifier)
                                        .setExpanded(true);
                                  },
                                  icon: const Icon(
                                    Icons.auto_awesome,
                                    size: 18,
                                  ),
                                  label: const Text('AI 深度解析'),
                                ),
                                const Spacer(),
                                FilledButton.icon(
                                  onPressed: () {
                                    ref
                                        .read(quizSessionProvider.notifier)
                                        .next();
                                  },
                                  icon: const Icon(
                                    Icons.arrow_forward_rounded,
                                    size: 18,
                                  ),
                                  label: const Text('下一题'),
                                ),
                              ],
                            ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuizPlaceholder extends StatelessWidget {
  final Widget child;

  const _QuizPlaceholder({required this.child});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(padding: const EdgeInsets.all(40.0), child: child),
    );
  }
}

class _QuizError extends ConsumerWidget {
  final Object error;

  const _QuizError({required this.error});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appError = error is AppException ? error as AppException : null;
    final message = error is QuizEmptyException
        ? '题库暂无可用题目，敬请期待'
        : (appError?.message ?? '题目加载失败，请稍后重试');

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.quiz_outlined,
            size: 40,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 12),
          Text(message),
          if (error is! QuizEmptyException) ...[
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => ref.read(quizSessionProvider.notifier).restart(),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('重新加载'),
            ),
          ],
        ],
      ),
    );
  }
}
