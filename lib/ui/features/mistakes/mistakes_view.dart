import 'package:flutter/material.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../widgets/status_dot.dart';
import 'widgets/mistake_card.dart';

class MistakesView extends StatefulWidget {
  const MistakesView({super.key});

  @override
  State<MistakesView> createState() => _MistakesViewState();
}

class _MistakesViewState extends State<MistakesView> {
  int _selectedSubject = 0; // 0: 全部, 1: 政治, 2: 英语, 3: 数学, 4: 专业课
  int _selectedStatus = 0; // 0: 待消除, 1: 已掌握

  final List<Map<String, dynamic>> _mistakes = [
    {
      'id': 'm1',
      'subjectId': 1,
      'tag': '政 · 单选',
      'stem': '下列关于矛盾普遍性和特殊性关系的表述，正确的是：矛盾普遍性寓于特殊性之中……',
      'lastWrongTime': '2 小时前',
      'wrongCount': 3,
      'status': MistakeStatus.pending,
    },
    {
      'id': 'm2',
      'subjectId': 2,
      'tag': '英 · 阅读',
      'stem':
          'According to the passage, the primary reason for environmental changes is not merely natural shifts but...',
      'lastWrongTime': '昨天 15:20',
      'wrongCount': 2,
      'status': MistakeStatus.critical,
    },
    {
      'id': 'm3',
      'subjectId': 4,
      'tag': '专 · 408',
      'stem': '在具有 n 个顶点的连通无向图中，其生成树的边数必须为 n-1，若增加一条边必将产生……',
      'lastWrongTime': '3 天前',
      'wrongCount': 4,
      'status': MistakeStatus.pending,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic =
        theme.extension<SemanticColors>() ?? SemanticColors.standard;

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

    final filteredMistakes = _mistakes.where((m) {
      if (_selectedSubject != 0 && m['subjectId'] != _selectedSubject) {
        return false;
      }
      if (_selectedStatus == 0 && m['status'] == MistakeStatus.mastered) {
        return false;
      }
      if (_selectedStatus == 1 && m['status'] != MistakeStatus.mastered) {
        return false;
      }
      return true;
    }).toList();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 860),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          children: [
            // 筛选栏
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
                        fontWeight: _selectedSubject == i
                            ? FontWeight.bold
                            : FontWeight.normal,
                        color: _selectedSubject == i
                            ? Colors.white
                            : subjectChips[i]['text'] as Color,
                      ),
                    ),
                    selected: _selectedSubject == i,
                    selectedColor: theme.colorScheme.primary,
                    backgroundColor: subjectChips[i]['bg'] as Color,
                    checkmarkColor: Colors.white,
                    onSelected: (selected) {
                      setState(() => _selectedSubject = selected ? i : 0);
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
                      const Text('待消除 (23)', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                  selected: _selectedStatus == 0,
                  onSelected: (s) => setState(() => _selectedStatus = 0),
                ),
                const SizedBox(width: 10),
                ChoiceChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      StatusDot(color: semantic.success, size: 6),
                      const SizedBox(width: 6),
                      const Text('已掌握 (85)', style: TextStyle(fontSize: 12)),
                    ],
                  ),
                  selected: _selectedStatus == 1,
                  onSelected: (s) => setState(() => _selectedStatus = 1),
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
            if (filteredMistakes.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Center(
                  child: Text(
                    '当前筛选下暂无错题',
                    style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              )
            else
              for (final m in filteredMistakes)
                MistakeCard(
                  tag: m['tag'],
                  tagBgColor: m['subjectId'] == 1
                      ? semantic.politicsContainer
                      : (m['subjectId'] == 2
                            ? semantic.englishContainer
                            : semantic.majorContainer),
                  tagTextColor: m['subjectId'] == 1
                      ? semantic.politicsText
                      : (m['subjectId'] == 2
                            ? semantic.englishText
                            : semantic.majorText),
                  stem: m['stem'],
                  lastWrongTime: m['lastWrongTime'],
                  wrongCount: m['wrongCount'],
                  status: m['status'],
                  onRedo: () {
                    setState(() {
                      if (m['status'] == MistakeStatus.pending) {
                        m['status'] = MistakeStatus.critical;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('连对 1 次！再对 1 次即可消除该错题')),
                        );
                      } else {
                        m['status'] = MistakeStatus.mastered;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('太棒了！该错题已完全消除掌握')),
                        );
                      }
                    });
                  },
                  onReview: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('正在呼出解析与 AI 关联……')),
                    );
                  },
                  onDelete: () {
                    setState(() {
                      _mistakes.remove(m);
                    });
                  },
                ),
          ],
        ),
      ),
    );
  }
}
