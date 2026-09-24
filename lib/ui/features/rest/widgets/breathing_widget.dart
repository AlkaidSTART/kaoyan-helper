import 'package:flutter/material.dart';

class BreathingWidget extends StatefulWidget {
  const BreathingWidget({super.key});

  @override
  State<BreathingWidget> createState() => _BreathingWidgetState();
}

class _BreathingWidgetState extends State<BreathingWidget> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  String _guideText = '吸气……';

  @override
  void initState() {
    super.initState();
    // 12秒一个循环：4秒吸气，4秒屏息，4秒呼气
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();

    _controller.addListener(() {
      final v = _controller.value;
      String nextText = '吸气……';
      if (v < 0.33) {
        nextText = '吸气 (感受胸腔充盈)';
      } else if (v < 0.66) {
        nextText = '屏息 (保持身心沉静)';
      } else {
        nextText = '呼气 (吐出所有焦虑)';
      }
      if (nextText != _guideText && mounted) {
        setState(() => _guideText = nextText);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          '4-4-4 箱式平复呼吸法',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '每组 12 秒，帮助快速降低皮质醇，恢复大脑专注力',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 48),

        // 呼吸动态圆环
        SizedBox(
          width: 220,
          height: 220,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final v = _controller.value;
              double scale = 1.0;
              if (v < 0.33) {
                // 吸气放大 1.0 -> 1.35
                scale = 1.0 + (v / 0.33) * 0.35;
              } else if (v < 0.66) {
                // 屏息维持 1.35
                scale = 1.35;
              } else {
                // 呼气缩小 1.35 -> 1.0
                scale = 1.35 - ((v - 0.66) / 0.34) * 0.35;
              }

              return Center(
                child: Container(
                  width: 140 * scale,
                  height: 140 * scale,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        theme.colorScheme.primary.withAlpha(50),
                        theme.colorScheme.primaryContainer.withAlpha(160),
                      ],
                    ),
                    border: Border.all(
                      color: theme.colorScheme.primary.withAlpha(120),
                      width: 2.0,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _guideText,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
