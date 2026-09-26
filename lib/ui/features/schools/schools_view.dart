import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';

import '../../../core/errors/app_exception.dart';
import '../../../features/schools/domain/school_models.dart';
import '../../../features/schools/presentation/schools_providers.dart';
import 'widgets/school_row_item.dart';

class SchoolsView extends ConsumerStatefulWidget {
  const SchoolsView({super.key});

  @override
  ConsumerState<SchoolsView> createState() => _SchoolsViewState();
}

class _SchoolsViewState extends ConsumerState<SchoolsView> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pageState = ref.watch(schoolsProvider);
    final notifier = ref.read(schoolsProvider.notifier);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 600;

        return RefreshIndicator(
          onRefresh: () => notifier.refresh(),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 860),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics(),
                ),
                padding: EdgeInsets.symmetric(
                  horizontal: isNarrow ? 16.0 : 24.0,
                  vertical: 16.0,
                ),
                children: [
                  // 搜索栏 (支持清空与触控优化)
                  TextField(
                    controller: _searchController,
                    focusNode: _searchFocus,
                    onChanged: (value) => notifier.setKeyword(value),
                    decoration: InputDecoration(
                      hintText: '搜索院校名称 (例: 浙江大学)',
                      hintStyle: TextStyle(
                        color: Theme.of(context).colorScheme.outline,
                        fontSize: 13,
                      ),
                      prefixIcon: const Icon(Icons.search_rounded, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                notifier.setKeyword('');
                                _searchFocus.requestFocus();
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Theme.of(context).colorScheme.outlineVariant,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 属性标签过滤 (支持移动端平滑横向拖拽滑动)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        for (final tag in [
                          '全部',
                          '985',
                          '211',
                          '双一流',
                          '自划线',
                        ]) ...[
                          Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: ChoiceChip(
                              label: Text(
                                tag,
                                style: const TextStyle(fontSize: 12),
                              ),
                              selected: notifier.tag == tag,
                              onSelected: (val) {
                                if (val) {
                                  HapticFeedback.selectionClick();
                                  notifier.setTag(tag);
                                }
                              },
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 列表
                  pageState.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.symmetric(vertical: 60.0),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (error, _) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40.0),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              error is AppException
                                  ? error.message
                                  : '院校加载失败，请稍后重试',
                              style: TextStyle(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: notifier.refresh,
                              icon: const Icon(Icons.refresh_rounded, size: 18),
                              label: const Text('重新加载'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    data: (page) {
                      final schools = page?.items ?? const <SchoolSummary>[];

                      if (schools.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40.0),
                          child: Center(
                            child: Text(
                              '未检索到符合条件的院校',
                              style: TextStyle(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                        );
                      }

                      return Column(
                        children: [
                          for (final school in schools)
                            SchoolRowItem(
                              school: school,
                              isTarget: page?.isTarget(school.id) ?? false,
                              onTargetToggle: (isTarget) =>
                                  _handleTargetToggle(school, isTarget),
                            ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _handleTargetToggle(SchoolSummary school, bool isTarget) async {
    try {
      await ref.read(schoolsProvider.notifier).toggleTarget(school, isTarget);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isTarget ? '已设为一志愿目标院校！' : '已取消一志愿目标'),
            duration: const Duration(seconds: 1),
          ),
        );
      }
    } on AppException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}
