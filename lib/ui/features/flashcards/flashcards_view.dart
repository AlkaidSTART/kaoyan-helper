import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../../features/flashcards/presentation/flashcards_providers.dart';
import '../../../features/flashcards/domain/flashcard_models.dart';
import '../../widgets/status_dot.dart';
import 'widgets/flip_card.dart';

class FlashcardsView extends ConsumerStatefulWidget {
  const FlashcardsView({super.key});

  @override
  ConsumerState<FlashcardsView> createState() => _FlashcardsViewState();
}

class _FlashcardsViewState extends ConsumerState<FlashcardsView> {
  bool _isFlipped = false;

  void _resetFlip() {
    if (_isFlipped && mounted) {
      setState(() => _isFlipped = false);
    }
  }

  Future<void> _handleRating(String rating) async {
    _resetFlip();

    try {
      final result = await ref.read(dueSessionProvider.notifier).rate(rating);

      if (!mounted) {
        return;
      }

      final checkIn = result.checkInDate;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            checkIn != null ? '今日到期卡片已清空，打卡成功！' : '已标记：$rating，切至下一张',
          ),
          duration: const Duration(milliseconds: 700),
        ),
      );
    } on AppException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sessionState = ref.watch(dueSessionProvider);

    return sessionState.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _buildError(theme, error),
      data: (session) {
        if (session == null) {
          return const SizedBox.shrink();
        }

        final card = session.current;
        if (card == null || session.due.dueRemaining == 0) {
          return _buildCompleted(theme, session.due);
        }

        return _buildSessionBody(theme, session, card);
      },
    );
  }

  Widget _buildSessionBody(ThemeData theme, DueSession session, DueCard card) {
    final semantic =
        theme.extension<SemanticColors>() ?? SemanticColors.standard;
    final due = session.due;
    final progress = due.items.isEmpty
        ? 0.0
        : session.completedCount / due.items.length;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 顶部进度与标题
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.style_outlined,
                        size: 20,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        card.card.category.isEmpty
                            ? '今日到期卡片'
                            : card.card.category,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${session.completedCount + 1} / ${due.items.length} 张',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 36),

              // 3D 翻转卡片
              SizedBox(
                height: 320,
                width: double.infinity,
                child: FlipCard(
                  isFlipped: _isFlipped,
                  onFlip: () => setState(() => _isFlipped = !_isFlipped),
                  front: _buildFrontCard(theme, card.card),
                  back: _buildBackCard(theme, card.card),
                ),
              ),
              const SizedBox(height: 32),

              // 评级操作栏（忘记 1 / 模糊 2 / 牢记 3）
              AnimatedOpacity(
                opacity: _isFlipped ? 1.0 : 0.45,
                duration: const Duration(milliseconds: 200),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildRatingButton(
                      theme: theme,
                      semantic: semantic,
                      label: '忘记',
                      shortcut: '1',
                      dotColor: semantic.danger,
                      rating: 'forgot',
                    ),
                    const SizedBox(width: 16),
                    _buildRatingButton(
                      theme: theme,
                      semantic: semantic,
                      label: '模糊',
                      shortcut: '2',
                      dotColor: semantic.warning,
                      rating: 'fuzzy',
                    ),
                    const SizedBox(width: 16),
                    _buildRatingButton(
                      theme: theme,
                      semantic: semantic,
                      label: '牢记',
                      shortcut: '3',
                      dotColor: semantic.success,
                      rating: 'remembered',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFrontCard(ThemeData theme, Flashcard card) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: SingleChildScrollView(
                  child: Text(
                    card.front,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                      color: theme.colorScheme.onSurface,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 36),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.touch_app_outlined,
                    size: 16,
                    color: theme.colorScheme.outline,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '点击卡片任意处或按空格翻转查看释义',
                    style: TextStyle(
                      fontSize: 12,
                      color: theme.colorScheme.outline,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackCard(ThemeData theme, Flashcard card) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.primary.withAlpha(120)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Flexible(
                  child: Text(
                    card.front,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
                if (card.tags.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  for (final tag in card.tags.take(3))
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          tag,
                          style: TextStyle(
                            fontSize: 10,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: SingleChildScrollView(
                child: Text(
                  card.back,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    height: 1.6,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatingButton({
    required ThemeData theme,
    required SemanticColors semantic,
    required String label,
    required String shortcut,
    required Color dotColor,
    required String rating,
  }) {
    final session = ref.read(dueSessionProvider).value;
    final isBusy = session?.reviewing ?? false;

    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      onPressed: isBusy ? null : () => _handleRating(rating),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusDot(color: dotColor, size: 7.0),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(width: 4),
          Text(
            '($shortcut)',
            style: const TextStyle(fontSize: 11, color: Color(0xFF7C6B5D)),
          ),
        ],
      ),
    );
  }

  Widget _buildCompleted(ThemeData theme, DueList due) {
    final remaining = due.dueRemaining;

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.verified_outlined,
            size: 44,
            color: theme.colorScheme.primary,
          ),
          const SizedBox(height: 12),
          Text(
            '本轮到期卡片已清空',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            remaining > 0 ? '仍有 $remaining 张到期，继续加油' : '休息一下，明天按遗忘曲线再来复习',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => ref.read(dueSessionProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: Text(remaining > 0 ? '加载下一批' : '刷新队列'),
          ),
        ],
      ),
    );
  }

  Widget _buildError(ThemeData theme, Object error) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.style_outlined,
            size: 40,
            color: theme.colorScheme.outline,
          ),
          const SizedBox(height: 12),
          Text(error is AppException ? error.message : '卡片加载失败，请稍后重试'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => ref.read(dueSessionProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('重新加载'),
          ),
        ],
      ),
    );
  }
}
