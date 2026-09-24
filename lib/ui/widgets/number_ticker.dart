import 'package:flutter/material.dart';

Duration accessibleDuration(BuildContext context, Duration normal) {
  final reduce = MediaQuery.maybeOf(context)?.accessibilityFeatures.reduceMotion ?? false;
  return reduce ? Duration.zero : normal;
}

class NumberTicker extends StatelessWidget {
  final int value;
  final TextStyle? style;
  final String suffix;

  const NumberTicker({
    super.key,
    required this.value,
    this.style,
    this.suffix = '',
  });

  @override
  Widget build(BuildContext context) {
    final duration = accessibleDuration(context, const Duration(milliseconds: 350));

    return TweenAnimationBuilder<int>(
      tween: IntTween(begin: 0, end: value),
      duration: duration,
      curve: Curves.easeOutCubic,
      builder: (context, val, child) {
        return Text(
          '$val$suffix',
          style: style,
        );
      },
    );
  }
}
