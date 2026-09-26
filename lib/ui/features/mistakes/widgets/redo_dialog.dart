import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../features/mistakes/presentation/mistakes_providers.dart';
import '../../../../features/mistakes/domain/mistake_models.dart';

/// 错题重做对话框：拉取题目选项（MIS-02）→ 作答 → 服务端判题（MIS-03）。
/// 关闭时通过 `Navigator.pop(result)` 回传重做结果。
class RedoDialog extends ConsumerStatefulWidget {
  final MistakeRecord mistake;

  const RedoDialog({super.key, required this.mistake});

  @override
  ConsumerState<RedoDialog> createState() => _RedoDialogState();
}

class _RedoDialogState extends ConsumerState<RedoDialog> {
  String? _selectedKey;
  bool _submitting = false;
  RedoResult? _result;

  Future<void> _submit() async {
    final key = _selectedKey;
    if (key == null || _submitting) {
      return;
    }

    setState(() => _submitting = true);

    try {
      final result = await ref
          .read(mistakesProvider.notifier)
          .redo(widget.mistake, key);
      if (mounted) {
        setState(() {
          _result = result;
          _submitting = false;
        });
      }
    } on AppException catch (error) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final detail = ref.watch(mistakeDetailProvider(widget.mistake.id));
    final result = _result;

    return AlertDialog(
      title: const Text('错题重做'),
      content: SizedBox(
        width: 420,
        child: detail.when(
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (error, _) => Text(
            error is AppException ? error.message : '题目加载失败，请关闭后重试',
          ),
          data: (data) {
            final options = data.question?.options ?? const [];
            final correctKey = result?.correctAnswer;

            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.question?.stem ?? '',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),
                if (result != null) ...[
                  Text(
                    result.isCorrect ? '回答正确' : '回答有误，正确答案: $correctKey',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: result.isCorrect
                          ? theme.colorScheme.primary
                          : theme.colorScheme.error,
                    ),
                  ),
                  if (data.explanation != null && data.explanation!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      data.explanation!,
                      style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
                    ),
                  ],
                ] else
                  RadioGroup<String>(
                    groupValue: _selectedKey,
                    onChanged: (value) {
                      if (!_submitting) {
                        setState(() => _selectedKey = value);
                      }
                    },
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (final option in options)
                          RadioListTile<String>(
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            value: option.key,
                            title: Text('${option.key}. ${option.content}'),
                          ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ),
      actions: [
        TextButton(
          onPressed: _submitting
              ? null
              : () => Navigator.pop(context, result),
          child: Text(result == null ? '关闭' : '完成'),
        ),
        if (result == null)
          FilledButton(
            onPressed: _selectedKey == null || _submitting ? null : _submit,
            child: Text(_submitting ? '判题中…' : '提交答案'),
          ),
      ],
    );
  }
}
