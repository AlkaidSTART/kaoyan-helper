import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  void _toggleTarget() {
    setState(() => _isTarget = !_isTarget);
    widget.onTargetToggle?.call(_isTarget);
  }

  void _showActionsBottomSheet(BuildContext context) {
    final theme = Theme.of(context);

    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.schoolName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
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
                const Divider(),
                ListTile(
                  leading: Icon(
                    _isTarget ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: _isTarget ? theme.colorScheme.primary : null,
                  ),
                  title: Text(_isTarget ? '取消一志愿目标' : '设为一志愿目标'),
                  onTap: () {
                    Navigator.pop(sheetContext);
                    HapticFeedback.selectionClick();
                    _toggleTarget();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.copy_rounded),
                  title: const Text('复制专业代码与名称'),
                  subtitle: Text(widget.majorCodeName),
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await Clipboard.setData(
                      ClipboardData(text: widget.majorCodeName),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('已复制：${widget.majorCodeName}'),
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    }
                  },
                ),
                ListTile(
                  leading: Icon(
                    _isExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.analytics_outlined,
                  ),
                  title: Text(_isExpanded ? '收起历年趋势表' : '查看历年报录趋势表'),
                  onTap: () {
                    Navigator.pop(sheetContext);
                    HapticFeedback.lightImpact();
                    setState(() => _isExpanded = !_isExpanded);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 600;

        return Card(
          elevation: 0,
          margin: const EdgeInsets.symmetric(vertical: 6.0),
          child: Column(
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  HapticFeedback.lightImpact();
                  setState(() => _isExpanded = !_isExpanded);
                },
                onDoubleTap: () {
                  HapticFeedback.selectionClick();
                  _toggleTarget();
                },
                onLongPress: () {
                  HapticFeedback.mediumImpact();
                  _showActionsBottomSheet(context);
                },
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: isNarrow
                      ? _buildNarrowContent(
                          context,
                          theme,
                          ratioColor,
                          ratioBgColor,
                        )
                      : _buildWideContent(
                          context,
                          theme,
                          ratioColor,
                          ratioBgColor,
                        ),
                ),
              ),

              // 展开的 3 年历年趋势 (支持小屏横向平滑滚动)
              if (_isExpanded)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16.0,
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '历年报录与复试线趋势：',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurface,
                            ),
                          ),
                          if (isNarrow)
                            Text(
                              '向右滑动查看完整数据',
                              style: TextStyle(
                                fontSize: 11,
                                color: theme.colorScheme.outline,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            minWidth: constraints.maxWidth > 460
                                ? constraints.maxWidth - 32
                                : 460,
                          ),
                          child: Table(
                            defaultVerticalAlignment:
                                TableCellVerticalAlignment.middle,
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
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  // 移动端/小屏流式排版 (避免三列挤压与专业代码突兀)
  Widget _buildNarrowContent(
    BuildContext context,
    ThemeData theme,
    Color ratioColor,
    Color ratioBgColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 6,
                runSpacing: 4,
                children: [
                  Text(
                    widget.schoolName,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  for (final tag in widget.tags)
                    Container(
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
                ],
              ),
            ),
            IconButton(
              tooltip: _isTarget ? '已设为一志愿目标' : '设为目标院校',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              icon: Icon(
                _isTarget ? Icons.star_rounded : Icons.star_outline_rounded,
                color: _isTarget
                    ? theme.colorScheme.primary
                    : theme.colorScheme.outline,
              ),
              onPressed: () {
                HapticFeedback.selectionClick();
                _toggleTarget();
              },
            ),
            IconButton(
              tooltip: _isExpanded ? '收起趋势' : '展开历年趋势',
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              icon: Icon(
                _isExpanded
                    ? Icons.keyboard_arrow_up_rounded
                    : Icons.keyboard_arrow_down_rounded,
                color: theme.colorScheme.outline,
              ),
              onPressed: () {
                HapticFeedback.lightImpact();
                setState(() => _isExpanded = !_isExpanded);
              },
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          '${widget.college} · ${widget.majorCodeName}',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
      ],
    );
  }

  // 宽屏端多列排版
  Widget _buildWideContent(
    BuildContext context,
    ThemeData theme,
    Color ratioColor,
    Color ratioBgColor,
  ) {
    return Row(
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
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          icon: Icon(
            _isTarget ? Icons.star_rounded : Icons.star_outline_rounded,
            color: _isTarget
                ? theme.colorScheme.primary
                : theme.colorScheme.outline,
          ),
          onPressed: () {
            HapticFeedback.selectionClick();
            _toggleTarget();
          },
        ),
        const SizedBox(width: 4),
        IconButton(
          tooltip: _isExpanded ? '收起趋势' : '展开历年趋势',
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          icon: Icon(
            _isExpanded
                ? Icons.keyboard_arrow_up_rounded
                : Icons.keyboard_arrow_down_rounded,
            color: theme.colorScheme.outline,
          ),
          onPressed: () {
            HapticFeedback.lightImpact();
            setState(() => _isExpanded = !_isExpanded);
          },
        ),
      ],
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
