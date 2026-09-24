import 'package:flutter/material.dart';
import '../../../../core/theme/semantic_colors.dart';
import '../../../widgets/status_dot.dart';

class TargetSchoolCard extends StatelessWidget {
  const TargetSchoolCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = theme.extension<SemanticColors>() ?? SemanticColors.standard;

    // 报录比 8.2:1 处于 5-10 之间，属于 warning 语义色
    const ratio = 8.2;
    final Color ratioStatusColor = ratio > 10
        ? semantic.danger
        : (ratio >= 5 ? semantic.warning : semantic.success);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '目标看板',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                Icon(
                  Icons.star_rounded,
                  size: 20,
                  color: theme.colorScheme.primary,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // 院校信息
            Text(
              '浙江大学 · 计算机专硕 (085404)',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),

            // 报录比指标
            Row(
              children: [
                Text(
                  '报录比: 8.2:1',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 8),
                StatusDot(color: ratioStatusColor, size: 8.0),
                const SizedBox(width: 6),
                Text(
                  '竞争适中',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: ratioStatusColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 复试线趋势
            Text(
              '复试线趋势 (2022 - 2024)',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),

            // 趋势数据展示容器
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildScoreYear(context, '2022', 360),
                      Icon(Icons.arrow_forward_rounded, size: 16, color: theme.colorScheme.outline),
                      _buildScoreYear(context, '2023', 375),
                      Icon(Icons.arrow_forward_rounded, size: 16, color: theme.colorScheme.outline),
                      _buildScoreYear(context, '2024', 382, isHighlight: true),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // 微型可视化高度示意条
                  SizedBox(
                    height: 48,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildBar(context, 360, 400),
                        const SizedBox(width: 24),
                        _buildBar(context, 375, 400),
                        const SizedBox(width: 24),
                        _buildBar(context, 382, 400, isHighlight: true),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.school_outlined, size: 16),
                label: const Text('查看院校详细报录'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreYear(BuildContext context, String year, int score, {bool isHighlight = false}) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(
          year,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          '$score 分',
          style: TextStyle(
            fontSize: 14,
            fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
            color: isHighlight ? theme.colorScheme.primary : theme.colorScheme.onSurface,
          ),
        ),
      ],
    );
  }

  Widget _buildBar(BuildContext context, int score, int maxScore, {bool isHighlight = false}) {
    final theme = Theme.of(context);
    final ratio = score / maxScore;
    return Expanded(
      child: FractionallySizedBox(
        heightFactor: ratio.clamp(0.1, 1.0),
        child: Container(
          decoration: BoxDecoration(
            color: isHighlight
                ? theme.colorScheme.primary
                : theme.colorScheme.primary.withAlpha(80),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ),
      ),
    );
  }
}
