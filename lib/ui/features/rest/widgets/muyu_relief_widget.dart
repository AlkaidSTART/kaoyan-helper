import 'dart:math';
import 'package:flutter/material.dart';

class MuyuReliefWidget extends StatefulWidget {
  const MuyuReliefWidget({super.key});

  @override
  State<MuyuReliefWidget> createState() => _MuyuReliefWidgetState();
}

class _MuyuReliefWidgetState extends State<MuyuReliefWidget> with SingleTickerProviderStateMixin {
  int _counter = 88;
  late final AnimationController _strikeController;
  final List<_FloatingText> _floatingTexts = [];
  final Random _random = Random();

  final List<String> _textTemplates = [
    '上岸 +1',
    '心流 +1',
    '一志愿拟录取 +1',
    '功不唐捐 +1',
    '政治80+ +1',
    '英语稳过 +1',
    '数学开窍 +1',
    '专硕第一 +1',
  ];

  @override
  void initState() {
    super.initState();
    _strikeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 90),
    );
  }

  @override
  void dispose() {
    _strikeController.dispose();
    super.dispose();
  }

  void _strike() {
    _strikeController.forward(from: 0.0).then((_) => _strikeController.reverse());
    setState(() {
      _counter++;
      final text = _textTemplates[_random.nextInt(_textTemplates.length)];
      final offset = Offset(
        (_random.nextDouble() - 0.5) * 60,
        -20.0,
      );
      _floatingTexts.add(_FloatingText(
        key: UniqueKey(),
        text: text,
        initialOffset: offset,
      ));
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // 今日心流计数
        Text(
          '今日心流累积',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$_counter',
          style: theme.textTheme.headlineLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: theme.colorScheme.primary,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 30),

        // 木鱼敲击与飘字堆栈
        SizedBox(
          width: 240,
          height: 240,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              // 飘字动画图层
              for (final item in _floatingTexts)
                _FloatingTextView(
                  key: item.key,
                  text: item.text,
                  offset: item.initialOffset,
                  onComplete: () {
                    if (mounted) {
                      setState(() => _floatingTexts.remove(item));
                    }
                  },
                ),

              // 物理木鱼本体
              ScaleTransition(
                scale: Tween<double>(begin: 1.0, end: 0.92).animate(
                  CurvedAnimation(parent: _strikeController, curve: Curves.easeOutQuad),
                ),
                child: MouseRegion(
                  cursor: SystemMouseCursors.click,
                  child: GestureDetector(
                    onTap: _strike,
                    child: Container(
                      width: 170,
                      height: 170,
                      decoration: BoxDecoration(
                        gradient: RadialGradient(
                          colors: [
                            const Color(0xFF9C6A48), // 檀木色高光
                            const Color(0xFF6B4226), // 沉木底色
                          ],
                          center: const Alignment(-0.2, -0.3),
                          radius: 0.85,
                        ),
                        borderRadius: BorderRadius.circular(46),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(40),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                          BoxShadow(
                            color: const Color(0xFFE07B39).withAlpha(30),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // 木鱼纹路装饰
                          Container(
                            width: 120,
                            height: 20,
                            decoration: BoxDecoration(
                              color: const Color(0xFF4A2E1A),
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          Container(
                            width: 24,
                            height: 24,
                            decoration: const BoxDecoration(
                              color: Color(0xFFD4A373),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 30),
        Text(
          '点击木鱼释放焦虑 · 积蓄备考心流',
          style: TextStyle(
            fontSize: 13,
            color: theme.colorScheme.outline,
          ),
        ),
      ],
    );
  }
}

class _FloatingText {
  final Key key;
  final String text;
  final Offset initialOffset;

  _FloatingText({
    required this.key,
    required this.text,
    required this.initialOffset,
  });
}

class _FloatingTextView extends StatefulWidget {
  final String text;
  final Offset offset;
  final VoidCallback onComplete;

  const _FloatingTextView({
    super.key,
    required this.text,
    required this.offset,
    required this.onComplete,
  });

  @override
  State<_FloatingTextView> createState() => _FloatingTextViewState();
}

class _FloatingTextViewState extends State<_FloatingTextView> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _translateY;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );

    _translateY = Tween<double>(begin: 0.0, end: -70.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    _opacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.4, 1.0, curve: Curves.easeIn),
      ),
    );

    _controller.forward().then((_) => widget.onComplete());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(widget.offset.dx, widget.offset.dy + _translateY.value),
          child: Opacity(
            opacity: _opacity.value,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFE07B39),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFE07B39).withAlpha(50),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                widget.text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
