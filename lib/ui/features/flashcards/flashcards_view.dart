import 'package:flutter/material.dart';
import '../../../core/theme/semantic_colors.dart';
import '../../widgets/status_dot.dart';
import 'widgets/flip_card.dart';

class FlashcardsView extends StatefulWidget {
  const FlashcardsView({super.key});

  @override
  State<FlashcardsView> createState() => _FlashcardsViewState();
}

class _FlashcardsViewState extends State<FlashcardsView> {
  int _currentIndex = 0;
  bool _isFlipped = false;

  final List<Map<String, dynamic>> _deck = [
    {
      'word': 'abandon',
      'phonetic': '/əˈbændən/',
      'meaning': 'v. 放弃，遗弃；离弃',
      'collocation': '真题搭配: abandon oneself to (沉溺于……)',
      'example': 'The research project was abandoned due to a lack of funding.',
    },
    {
      'word': 'vulnerable',
      'phonetic': '/ˈvʌlnərəbl/',
      'meaning': 'adj. 易受伤害的，脆弱的；有弱点的',
      'collocation': '核心考点: be vulnerable to (极易受……侵害)',
      'example': 'Small businesses are particularly vulnerable in times of economic recession.',
    },
    {
      'word': 'arbitrary',
      'phonetic': '/ˈɑːrbɪtreri/',
      'meaning': 'adj. 任意的，专断的，随心所欲的',
      'collocation': '阅读搭配: make an arbitrary decision (做出武断的裁决)',
      'example': 'The committee was accused of making arbitrary decisions without consulting members.',
    },
  ];

  void _handleRating(String rating) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('已标记：$rating，切至下一张'),
        duration: const Duration(milliseconds: 700),
      ),
    );
    setState(() {
      _isFlipped = false;
      _currentIndex = (_currentIndex + 1) % _deck.length;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = theme.extension<SemanticColors>() ?? SemanticColors.standard;
    final card = _deck[_currentIndex];
    final progress = (_currentIndex + 1) / _deck.length;

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
                      Icon(Icons.style_outlined, size: 20, color: theme.colorScheme.primary),
                      const SizedBox(width: 8),
                      Text(
                        '英语大纲高频核心词',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${_currentIndex + 1} / ${_deck.length} 张',
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
                  front: _buildFrontCard(card),
                  back: _buildBackCard(card),
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
                      label: '忘记',
                      shortcut: '1',
                      dotColor: semantic.danger,
                      onTap: () => _handleRating('忘记'),
                    ),
                    const SizedBox(width: 16),
                    _buildRatingButton(
                      label: '模糊',
                      shortcut: '2',
                      dotColor: semantic.warning,
                      onTap: () => _handleRating('模糊'),
                    ),
                    const SizedBox(width: 16),
                    _buildRatingButton(
                      label: '牢记',
                      shortcut: '3',
                      dotColor: semantic.success,
                      onTap: () => _handleRating('牢记'),
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

  Widget _buildFrontCard(Map<String, dynamic> card) {
    final theme = Theme.of(context);
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
              Text(
                card['word'],
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: theme.colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                card['phonetic'],
                style: TextStyle(
                  fontSize: 16,
                  color: theme.colorScheme.onSurfaceVariant,
                  fontFamily: 'monospace',
                ),
              ),
              const SizedBox(height: 36),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.touch_app_outlined, size: 16, color: theme.colorScheme.outline),
                  const SizedBox(width: 6),
                  Text(
                    '点击卡片任意处或按空格翻转查看释义',
                    style: TextStyle(fontSize: 12, color: theme.colorScheme.outline),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackCard(Map<String, dynamic> card) {
    final theme = Theme.of(context);
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
                Text(
                  card['word'],
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  card['phonetic'],
                  style: TextStyle(
                    fontSize: 13,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              card['meaning'],
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card['collocation'],
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    card['example'],
                    style: TextStyle(
                      fontSize: 12.5,
                      fontStyle: FontStyle.italic,
                      height: 1.4,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatingButton({
    required String label,
    required String shortcut,
    required Color dotColor,
    required VoidCallback onTap,
  }) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      onPressed: onTap,
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
}
