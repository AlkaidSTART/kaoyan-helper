import 'package:flutter/material.dart';

enum OptionFeedbackState { idle, correct, wrong }

class QuizOptionCard extends StatefulWidget {
  final String letter;
  final String content;
  final OptionFeedbackState state;
  final bool isLocked;
  final VoidCallback? onTap;

  const QuizOptionCard({
    super.key,
    required this.letter,
    required this.content,
    required this.state,
    required this.isLocked,
    this.onTap,
  });

  @override
  State<QuizOptionCard> createState() => _QuizOptionCardState();
}

class _QuizOptionCardState extends State<QuizOptionCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shakeController;
  late final Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
    );
    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -4.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -4.0, end: 4.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 4.0, end: -3.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -3.0, end: 2.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 2.0, end: 0.0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shakeController, curve: Curves.linear));
  }

  @override
  void didUpdateWidget(covariant QuizOptionCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state == OptionFeedbackState.wrong &&
        oldWidget.state != OptionFeedbackState.wrong) {
      _shakeController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _shakeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color backgroundColor = theme.colorScheme.surface;
    Color borderColor = theme.colorScheme.outlineVariant;
    Color badgeColor = theme.colorScheme.surfaceContainerHighest;
    Color badgeTextColor = theme.colorScheme.onSurface;

    if (widget.state == OptionFeedbackState.correct) {
      backgroundColor = const Color(0xFFEAF5F0); // successContainer
      borderColor = const Color(0xFF2E9E6E); // success
      badgeColor = const Color(0xFF2E9E6E);
      badgeTextColor = Colors.white;
    } else if (widget.state == OptionFeedbackState.wrong) {
      backgroundColor = const Color(0xFFFBECEB); // dangerContainer
      borderColor = const Color(0xFFD4453A); // danger
      badgeColor = const Color(0xFFD4453A);
      badgeTextColor = Colors.white;
    }

    final cardContent = AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.ease,
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          // 选项序号徽标 (A, B, C, D)
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: badgeColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              widget.letter,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: badgeTextColor,
              ),
            ),
          ),
          const SizedBox(width: 14),
          // 选项文本
          Expanded(
            child: Text(
              widget.content,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontSize: 15,
                height: 1.45,
                color: theme.colorScheme.onSurface,
              ),
            ),
          ),
          // 判定反馈图标
          if (widget.state == OptionFeedbackState.correct)
            const Padding(
              padding: EdgeInsets.only(left: 8.0),
              child: Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF2E9E6E),
                size: 20,
              ),
            )
          else if (widget.state == OptionFeedbackState.wrong)
            const Padding(
              padding: EdgeInsets.only(left: 8.0),
              child: Icon(
                Icons.cancel_rounded,
                color: Color(0xFFD4453A),
                size: 20,
              ),
            ),
        ],
      ),
    );

    return AnimatedBuilder(
      animation: _shakeAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_shakeAnimation.value, 0),
          child: child,
        );
      },
      child: AnimatedScale(
        scale: widget.state == OptionFeedbackState.correct ? 1.01 : 1.0,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.isLocked ? null : widget.onTap,
            borderRadius: BorderRadius.circular(12),
            child: cardContent,
          ),
        ),
      ),
    );
  }
}
