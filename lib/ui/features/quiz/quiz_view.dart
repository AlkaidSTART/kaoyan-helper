import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/layout_providers.dart';
import '../../../core/theme/semantic_colors.dart';
import 'widgets/quiz_option_card.dart';

class QuizView extends ConsumerStatefulWidget {
  const QuizView({super.key});

  @override
  ConsumerState<QuizView> createState() => _QuizViewState();
}

class _QuizViewState extends ConsumerState<QuizView> {
  int _currentQuestionIndex = 0;
  int? _selectedIndex;
  bool _isAnswered = false;

  final List<Map<String, dynamic>> _mockQuestions = [
    {
      'subject': '政治 · 马原',
      'tag': '2024 真题 · 单选',
      'stem': '下列关于矛盾普遍性和特殊性关系的表述，正确的是：',
      'options': [
        '矛盾普遍性寓于特殊性之中',
        '矛盾特殊性可以脱离普遍性独立存在',
        '矛盾普遍性包含矛盾特殊性',
        '矛盾的同一性是绝对的，斗争性是相对的',
      ],
      'correctIndex': 0,
      'explanation':
          '矛盾的普遍性即矛盾的共性，矛盾的特殊性即矛盾的个性。矛盾的共性是无条件的、绝对的，矛盾的个性是有条件的、相对的。任何现实存在的事物都是共性和个性的有机统一，共性寓于个性之中，没有离开个性的共性，也没有离开共性的个性。因此 A 选项正确。',
    },
    {
      'subject': '政治 · 史纲',
      'tag': '2023 真题 · 单选',
      'stem': '标志着中国共产党在政治上开始走向成熟的会议是：',
      'options': [
        '中共二大',
        '八七会议',
        '遵义会议',
        '中共七大',
      ],
      'correctIndex': 2,
      'explanation':
          '遵义会议确立了以毛泽东为代表的马克思主义正确路线在中共中央的领导地位，在极其危急的情况下挽救了党、挽救了红军、挽救了中国革命，是中国共产党第一次独立自主地运用马克思列宁主义基本原理解决中国革命的路线、方针和政策问题，标志着中国共产党在政治上开始走向成熟。',
    },
  ];

  void _handleSelect(int index) {
    if (_isAnswered) return;
    setState(() {
      _selectedIndex = index;
      _isAnswered = true;
    });
  }

  void _handleNext() {
    setState(() {
      _currentQuestionIndex = (_currentQuestionIndex + 1) % _mockQuestions.length;
      _selectedIndex = null;
      _isAnswered = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = theme.extension<SemanticColors>() ?? SemanticColors.standard;
    final q = _mockQuestions[_currentQuestionIndex];
    final letters = ['A', 'B', 'C', 'D'];

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
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: semantic.politicsContainer,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          q['subject'],
                          style: TextStyle(
                            color: semantic.politicsText,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          q['tag'],
                          style: TextStyle(
                            color: theme.colorScheme.onSurfaceVariant,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${_currentQuestionIndex + 1} / ${_mockQuestions.length}',
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
                q['stem'],
                style: theme.textTheme.titleMedium?.copyWith(
                  fontSize: 17,
                  height: 1.6,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 20),

              // 选项列表
              for (int i = 0; i < (q['options'] as List).length; i++) ...[
                Builder(
                  builder: (context) {
                    OptionFeedbackState state = OptionFeedbackState.idle;
                    if (_isAnswered) {
                      if (i == q['correctIndex']) {
                        state = OptionFeedbackState.correct;
                      } else if (_selectedIndex == i) {
                        state = OptionFeedbackState.wrong;
                      }
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: QuizOptionCard(
                        letter: letters[i],
                        content: q['options'][i],
                        state: state,
                        isLocked: _isAnswered,
                        onTap: () => _handleSelect(i),
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
                crossFadeState: _isAnswered ? CrossFadeState.showSecond : CrossFadeState.showFirst,
                firstChild: const SizedBox(width: double.infinity),
                secondChild: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle_outline_rounded, size: 20, color: semantic.success),
                          const SizedBox(width: 8),
                          Text(
                            '正确答案: ${letters[q['correctIndex']]}',
                            style: TextStyle(
                              color: semantic.success,
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
                          Icon(Icons.menu_book_outlined, size: 18, color: theme.colorScheme.primary),
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
                          q['explanation'],
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
                              ref.read(aiPanelExpandedProvider.notifier).setExpanded(true);
                            },
                            icon: const Icon(Icons.auto_awesome, size: 18),
                            label: const Text('AI 深度解析'),
                          ),
                          const Spacer(),
                          FilledButton.icon(
                            onPressed: _handleNext,
                            icon: const Icon(Icons.arrow_forward_rounded, size: 18),
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
