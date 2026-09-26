import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/theme/semantic_colors.dart';
import '../../../../features/schools/domain/school_models.dart';
import '../../../../features/schools/presentation/schools_providers.dart';

/// 院校卡片（真实数据）：名称 + 标签 + 省份区域；展开懒加载专业历年数据（SCH-03）。
class SchoolRowItem extends ConsumerStatefulWidget {
  final SchoolSummary school;
  final bool isTarget;
  final ValueChanged<bool>? onTargetToggle;

  const SchoolRowItem({
    super.key,
    required this.school,
    required this.isTarget,
    this.onTargetToggle,
  });

  @override
  ConsumerState<SchoolRowItem> createState() => _SchoolRowItemState();
}

class _SchoolRowItemState extends ConsumerState<SchoolRowItem> {
  bool _isExpanded = false;

  List<String> get _tags => [
    if (widget.school.is985) '985',
    if (widget.school.is211) '211',
    if (widget.school.isDoubleFirstClass) '双一流',
    if (widget.school.isSelfMarking) '自划线',
  ];

  String get _regionLine {
    final parts = [?widget.school.province, ?widget.school.region];
    return parts.isEmpty ? '地区信息待完善' : parts.join(' · ');
  }

  void _toggleTarget() {
    debugPrint('TOGGLE-TARGET-CALLED');
    debugPrint('TOGGLE-TARGET-CALLED');
    widget.onTargetToggle?.call(!widget.isTarget);
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20.0,
                    vertical: 8.0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.school.name,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _regionLine,
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
                    widget.isTarget
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    color: widget.isTarget ? theme.colorScheme.primary : null,
                  ),
                  title: Text(widget.isTarget ? '取消一志愿目标' : '设为一志愿目标'),
                  onTap: () {
                    Navigator.pop(sheetContext);
                    HapticFeedback.selectionClick();
                    _toggleTarget();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.copy_rounded),
                  title: const Text('复制院校名称与地区'),
                  subtitle: Text('${widget.school.name}（$_regionLine）'),
                  onTap: () async {
                    Navigator.pop(sheetContext);
                    await Clipboard.setData(
                      ClipboardData(text: '${widget.school.name} $_regionLine'),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('已复制院校信息'),
                          duration: Duration(seconds: 1),
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
    final programs = _isExpanded
        ? ref.watch(schoolProgramsProvider(widget.school.id))
        : null;

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
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Text(
                              widget.school.name,
                              style: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            for (final tag in _tags)
                              Container(
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
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _regionLine,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: widget.isTarget ? '已设为一志愿目标' : '设为目标院校',
                    constraints: const BoxConstraints(
                      minWidth: 48,
                      minHeight: 48,
                    ),
                    icon: Icon(
                      widget.isTarget
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      color: widget.isTarget
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
                    constraints: const BoxConstraints(
                      minWidth: 48,
                      minHeight: 48,
                    ),
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
            ),
          ),
          if (_isExpanded)
            Container(
              width: double.infinity,
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
              child: _buildProgramsSection(theme, semantic, programs),
            ),
        ],
      ),
    );
  }

  Widget _buildProgramsSection(
    ThemeData theme,
    SemanticColors semantic,
    AsyncValue<List<SchoolProgram>>? programs,
  ) {
    if (programs == null) {
      return const SizedBox.shrink();
    }

    return programs.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 16.0),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      ),
      error: (error, _) => Text(
        error is AppException ? error.message : '专业数据加载失败，请稍后重试',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
      data: (items) {
        if (items.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Text(
              '暂无专业历年数据',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '历年招生与复试线趋势：',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minWidth: MediaQuery.sizeOf(context).width > 640
                      ? MediaQuery.sizeOf(context).width - 96
                      : 560,
                ),
                child: Table(
                  defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                  children: [
                    TableRow(
                      children: [
                        _buildHeaderCell('年份'),
                        _buildHeaderCell('专业'),
                        _buildHeaderCell('计划招生'),
                        _buildHeaderCell('复试线'),
                        _buildHeaderCell('平均分'),
                      ],
                    ),
                    for (final p in items)
                      TableRow(
                        children: [
                          _buildDataCell('${p.year} 年'),
                          _buildDataCell('${p.majorName} (${p.majorCode})'),
                          _buildDataCell(
                            p.planEnrollment == null
                                ? '—'
                                : '${p.planEnrollment} 人',
                          ),
                          _buildDataCell(
                            p.minScore == null ? '—' : '${p.minScore} 分',
                            isHighlight: true,
                            color: theme.colorScheme.primary,
                          ),
                          _buildDataCell(
                            p.avgScore == null ? '—' : '${p.avgScore} 分',
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeaderCell(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Color(0xFF7C6B5D),
        ),
      ),
    );
  }

  Widget _buildDataCell(String text, {bool isHighlight = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
          color: color ?? const Color(0xFF2C2623),
        ),
      ),
    );
  }
}
