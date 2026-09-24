import 'package:flutter/material.dart';
import '../../../../core/theme/semantic_colors.dart';
import '../../../widgets/status_dot.dart';

class SchoolRowItem extends StatefulWidget {
  final String schoolName;
  final String college;
  final String majorCodeName;
  final double ratio;
  final bool isTarget;
  final List<String> tags;
  final List<Map<String, dynamic>> trendData;
  final ValueChanged<bool>? onTargetToggle;

  const SchoolRowItem({
    super.key,
    required this.schoolName,
    required this.college,
    required this.majorCodeName,
    required this.ratio,
    required this.isTarget,
    required this.tags,
    required this.trendData,
    this.onTargetToggle,
  });

  @override
  State<SchoolRowItem> createState() => _SchoolRowItemState();
}

class _SchoolRowItemState extends State<SchoolRowItem> {
  bool _isExpanded = false;
  late bool _isTarget;

  @override
  void initState() {
    super.initState();
    _isTarget = widget.isTarget;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic =
        theme.extension<SemanticColors>() ?? SemanticColors.standard;

    final Color ratioColor = widget.ratio > 10
        ? semantic.danger
        : (widget.ratio >= 5 ? semantic.warning : semantic.success);
    final Color ratioBgColor = widget.ratio > 10
        ? semantic.dangerContainer
        : (widget.ratio >= 5
              ? semantic.warningContainer
              : semantic.successContainer);

    return Card(
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6.0),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  // 院校信息
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              widget.schoolName,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 8),
                            for (final tag in widget.tags) ...[
                              Container(
                                margin: const EdgeInsets.only(right: 4),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 5,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      theme.colorScheme.surfaceContainerHighest,
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
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${widget.college} · ${widget.majorCodeName}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 报录比标签
                  Expanded(
                    flex: 2,
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: ratioBgColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              StatusDot(color: ratioColor, size: 6),
                              const SizedBox(width: 6),
                              Text(
                                '${widget.ratio}:1 报录',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: ratioColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 设为目标星标
                  IconButton(
                    tooltip: _isTarget ? '已设为一志愿目标' : '设为目标院校',
                    icon: Icon(
                      _isTarget
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: _isTarget
                          ? theme.colorScheme.primary
                          : theme.colorScheme.outline,
                    ),
                    onPressed: () {
                      setState(() => _isTarget = !_isTarget);
                      widget.onTargetToggle?.call(_isTarget);
                    },
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    _isExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: theme.colorScheme.outline,
                  ),
                ],
              ),
            ),
          ),

          // 展开的 3 年历年趋势
          if (_isExpanded)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 20.0,
                vertical: 14.0,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLowest,
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(12),
                ),
                border: Border(
                  top: BorderSide(color: theme.colorScheme.outlineVariant),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '历年报录与复试线趋势：',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Table(
                    defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                    children: [
                      TableRow(
                        children: [
                          _buildHeaderCell('年份'),
                          _buildHeaderCell('计划招生'),
                          _buildHeaderCell('实际报名'),
                          _buildHeaderCell('最终录取'),
                          _buildHeaderCell('复试分数线'),
                        ],
                      ),
                      for (final t in widget.trendData)
                        TableRow(
                          children: [
                            _buildDataCell('${t['year']} 年'),
                            _buildDataCell('${t['plan']} 人'),
                            _buildDataCell('${t['applied']} 人'),
                            _buildDataCell('${t['admitted']} 人'),
                            _buildDataCell(
                              '${t['score']} 分',
                              isHighlight: true,
                              color: theme.colorScheme.primary,
                            ),
                          ],
                        ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeaderCell(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF7C6B5D),
        ),
      ),
    );
  }

  Widget _buildDataCell(String text, {bool isHighlight = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
          color: color ?? const Color(0xFF3D2C1E),
        ),
      ),
    );
  }
}
