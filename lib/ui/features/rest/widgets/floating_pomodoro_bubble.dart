import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/providers/layout_providers.dart';

class FloatingPomodoroBubble extends ConsumerStatefulWidget {
  const FloatingPomodoroBubble({super.key});

  @override
  ConsumerState<FloatingPomodoroBubble> createState() =>
      _FloatingPomodoroBubbleState();
}

class _FloatingPomodoroBubbleState
    extends ConsumerState<FloatingPomodoroBubble> {
  bool _isExpanded = false;
  int _selectedMinutes = 25;
  bool _isRunning = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isAiExpanded = ref.watch(aiPanelExpandedProvider);

    // 当右侧 AI 助教抽屉展开时，番茄钟自动左移避让 400px
    final double rightOffset = isAiExpanded ? 420.0 : 20.0;

    if (!_isExpanded) {
      // 收起态：48x48dp 小球，环形进度圈，中间显示 25m
      return AnimatedPositioned(
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        right: rightOffset,
        bottom: 30,
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          child: GestureDetector(
            onTap: () => setState(() => _isExpanded = true),
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(25),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 44,
                    height: 44,
                    child: CircularProgressIndicator(
                      value: 0.72,
                      strokeWidth: 3.0,
                      backgroundColor: theme.colorScheme.primaryContainer,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  Text(
                    '${_selectedMinutes}m',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // 展开态：260x180dp 卡片
    return AnimatedPositioned(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      right: rightOffset,
      bottom: 30,
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 260,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.colorScheme.outlineVariant),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.timer_outlined,
                        size: 18,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        '番茄专注钟',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 16),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => setState(() => _isExpanded = false),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 模式选择（FittedBox 确保在不同字体和系统下绝对不溢出）
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    _buildModeChip('专注 25m', 25),
                    const SizedBox(width: 8),
                    _buildModeChip('深度 50m', 50),
                    const SizedBox(width: 8),
                    _buildModeChip('短休 5m', 5),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 倒计时显示
              Center(
                child: Text(
                  '${_selectedMinutes.toString().padLeft(2, '0')}:00',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // 操作按钮
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () => setState(() => _isRunning = !_isRunning),
                      child: Text(
                        _isRunning ? '暂停' : '继续',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () {
                        // 前往休息页面 (Index 5)
                        ref.read(currentNavIndexProvider.notifier).setIndex(5);
                        setState(() => _isExpanded = false);
                      },
                      child: const Text('前往休息', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeChip(String label, int minutes) {
    final isSelected = _selectedMinutes == minutes;
    final theme = Theme.of(context);
    return InkWell(
      onTap: () => setState(() => _selectedMinutes = minutes),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primaryContainer
              : theme.colorScheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected
                ? theme.colorScheme.primary
                : theme.colorScheme.outlineVariant,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected
                ? theme.colorScheme.onPrimaryContainer
                : theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}
