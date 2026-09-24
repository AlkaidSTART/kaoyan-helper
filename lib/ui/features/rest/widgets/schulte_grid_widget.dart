import 'dart:async';
import 'package:flutter/material.dart';

class SchulteGridWidget extends StatefulWidget {
  const SchulteGridWidget({super.key});

  @override
  State<SchulteGridWidget> createState() => _SchulteGridWidgetState();
}

class _SchulteGridWidgetState extends State<SchulteGridWidget> {
  late List<int> _numbers;
  int _currentTarget = 1;
  int _elapsedMilliseconds = 0;
  Timer? _timer;
  bool _isPlaying = false;
  final Set<int> _clearedNumbers = {};

  @override
  void initState() {
    super.initState();
    _resetGrid();
  }

  void _resetGrid() {
    _timer?.cancel();
    _numbers = List.generate(25, (i) => i + 1)..shuffle();
    _currentTarget = 1;
    _elapsedMilliseconds = 0;
    _isPlaying = false;
    _clearedNumbers.clear();
    setState(() {});
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(milliseconds: 100), (t) {
      if (mounted) {
        setState(() => _elapsedMilliseconds += 100);
      }
    });
  }

  void _handleTapNumber(int n) {
    if (!_isPlaying) {
      _isPlaying = true;
      _startTimer();
    }

    if (n == _currentTarget) {
      setState(() {
        _clearedNumbers.add(n);
        _currentTarget++;
      });

      if (_currentTarget > 25) {
        _timer?.cancel();
        _isPlaying = false;
        final seconds = (_elapsedMilliseconds / 1000).toStringAsFixed(1);
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('专注力训练完成！'),
            content: Text('用时：$seconds 秒\n大脑反应力已全面唤醒，建议继续保持高效专注。'),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _resetGrid();
                },
                child: const Text('再练一次'),
              ),
            ],
          ),
        );
      }
    } else {
      // 错误点击轻度震荡提示
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('请点选目标数字：$_currentTarget'),
          duration: const Duration(milliseconds: 400),
        ),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final seconds = (_elapsedMilliseconds / 1000).toStringAsFixed(1);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '目标数字：$_currentTarget',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
            ),
            const SizedBox(width: 20),
            Text(
              '计时：$seconds s',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(width: 16),
            IconButton(
              tooltip: '重新开始',
              icon: const Icon(Icons.refresh_rounded, size: 20),
              onPressed: _resetGrid,
            ),
          ],
        ),
        const SizedBox(height: 24),

        // 5x5 方格矩阵
        Container(
          width: 320,
          height: 320,
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.colorScheme.outlineVariant),
          ),
          child: GridView.builder(
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 5,
              mainAxisSpacing: 6,
              crossAxisSpacing: 6,
            ),
            itemCount: 25,
            itemBuilder: (context, index) {
              final n = _numbers[index];
              final isCleared = _clearedNumbers.contains(n);

              return InkWell(
                onTap: isCleared ? null : () => _handleTapNumber(n),
                borderRadius: BorderRadius.circular(8),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  decoration: BoxDecoration(
                    color: isCleared
                        ? const Color(0xFFEAF5F0) // 成功淡绿
                        : theme.colorScheme.surfaceContainerLowest,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isCleared
                          ? const Color(0xFF2E9E6E).withAlpha(80)
                          : theme.colorScheme.outlineVariant,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$n',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isCleared
                          ? const Color(0xFF2E9E6E).withAlpha(120)
                          : theme.colorScheme.primary,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 20),
        Text(
          '按顺序依次快速点选 1 至 25，训练视野聚焦与反应力',
          style: TextStyle(fontSize: 12, color: theme.colorScheme.outline),
        ),
      ],
    );
  }
}
