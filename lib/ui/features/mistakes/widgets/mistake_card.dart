import 'package:flutter/material.dart';
import '../../../../core/theme/semantic_colors.dart';
import '../../../widgets/status_dot.dart';

enum MistakeStatus { pending, critical, mastered }

class MistakeCard extends StatelessWidget {
  final String tag;
  final Color tagBgColor;
  final Color tagTextColor;
  final String stem;
  final String lastWrongTime;
  final int wrongCount;
  final MistakeStatus status;
  final VoidCallback? onRedo;
  final VoidCallback? onReview;
  final VoidCallback? onDelete;

  const MistakeCard({
    super.key,
    required this.tag,
    required this.tagBgColor,
    required this.tagTextColor,
    required this.stem,
    required this.lastWrongTime,
    required this.wrongCount,
    required this.status,
    this.onRedo,
    this.onReview,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic =
        theme.extension<SemanticColors>() ?? SemanticColors.standard;

    Color statusColor = semantic.danger;
    String statusLabel = '待消除 (需连对 2 次消除)';
    if (status == MistakeStatus.critical) {
      statusColor = semantic.warning;
      statusLabel = '再对 1 次即消除';
    } else if (status == MistakeStatus.mastered) {
      statusColor = semantic.success;
      statusLabel = '已掌握 (已消除)';
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 顶部 Header: 学科题型徽标 + 消除状态点
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: tagBgColor,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    tag,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: tagTextColor,
                    ),
                  ),
                ),
                Row(
                  children: [
                    StatusDot(color: statusColor, size: 7.0),
                    const SizedBox(width: 6),
                    Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 12,
                        color: statusColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 题干
            Text(
              stem,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontSize: 15,
                height: 1.45,
                fontWeight: FontWeight.w500,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),

            // 错误摘要
            Row(
              children: [
                Text(
                  '最近答错: $lastWrongTime',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: semantic.dangerContainer,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '错 $wrongCount 次',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: semantic.danger,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 8),

            // 底部操作行
            Row(
              children: [
                IconButton(
                  tooltip: '移出收纳',
                  icon: const Icon(Icons.delete_outline, size: 18),
                  onPressed: onDelete,
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: onReview,
                  icon: const Icon(Icons.menu_book_outlined, size: 16),
                  label: const Text('查看解析'),
                ),
                const SizedBox(width: 8),
                FilledButton.tonalIcon(
                  onPressed: onRedo,
                  icon: const Icon(Icons.replay_rounded, size: 16),
                  label: const Text('立即重做'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
