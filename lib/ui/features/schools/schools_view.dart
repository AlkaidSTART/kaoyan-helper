import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'widgets/school_row_item.dart';

class SchoolsView extends StatefulWidget {
  const SchoolsView({super.key});

  @override
  State<SchoolsView> createState() => _SchoolsViewState();
}

class _SchoolsViewState extends State<SchoolsView> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedTag = '全部';

  final List<Map<String, dynamic>> _schools = [
    {
      'schoolName': '浙江大学',
      'college': '计算机科学与技术学院',
      'majorCodeName': '085404 计算机专硕',
      'ratio': 8.2,
      'isTarget': true,
      'tags': ['985', '211', '双一流'],
      'trendData': [
        {
          'year': 2024,
          'plan': 45,
          'applied': 380,
          'admitted': 48,
          'score': 382,
        },
        {
          'year': 2023,
          'plan': 40,
          'applied': 350,
          'admitted': 42,
          'score': 375,
        },
        {
          'year': 2022,
          'plan': 38,
          'applied': 300,
          'admitted': 38,
          'score': 360,
        },
      ],
    },
    {
      'schoolName': '华东师范大学',
      'college': '软件工程学院',
      'majorCodeName': '085400 电子信息专硕',
      'ratio': 5.1,
      'isTarget': false,
      'tags': ['985', '211', '双一流'],
      'trendData': [
        {
          'year': 2024,
          'plan': 60,
          'applied': 310,
          'admitted': 62,
          'score': 355,
        },
        {
          'year': 2023,
          'plan': 55,
          'applied': 290,
          'admitted': 56,
          'score': 350,
        },
        {
          'year': 2022,
          'plan': 50,
          'applied': 260,
          'admitted': 52,
          'score': 345,
        },
      ],
    },
    {
      'schoolName': '北京航空航天大学',
      'college': '计算机学院',
      'majorCodeName': '085404 计算机专硕',
      'ratio': 11.4,
      'isTarget': false,
      'tags': ['985', '211', '双一流'],
      'trendData': [
        {
          'year': 2024,
          'plan': 35,
          'applied': 410,
          'admitted': 36,
          'score': 390,
        },
        {
          'year': 2023,
          'plan': 30,
          'applied': 360,
          'admitted': 32,
          'score': 385,
        },
        {
          'year': 2022,
          'plan': 30,
          'applied': 330,
          'admitted': 30,
          'score': 378,
        },
      ],
    },
    {
      'schoolName': '苏州大学',
      'college': '计算机科学与技术学院',
      'majorCodeName': '085404 计算机专硕',
      'ratio': 4.3,
      'isTarget': false,
      'tags': ['211', '双一流'],
      'trendData': [
        {
          'year': 2024,
          'plan': 70,
          'applied': 300,
          'admitted': 72,
          'score': 340,
        },
        {
          'year': 2023,
          'plan': 65,
          'applied': 280,
          'admitted': 66,
          'score': 335,
        },
        {
          'year': 2022,
          'plan': 60,
          'applied': 250,
          'admitted': 62,
          'score': 330,
        },
      ],
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final keyword = _searchController.text.trim().toLowerCase();

    final filtered = _schools.where((s) {
      final name = (s['schoolName'] as String).toLowerCase();
      final major = (s['majorCodeName'] as String).toLowerCase();
      final matchesKeyword =
          keyword.isEmpty || name.contains(keyword) || major.contains(keyword);
      final tags = s['tags'] as List<String>;
      final matchesTag = _selectedTag == '全部' || tags.contains(_selectedTag);
      return matchesKeyword && matchesTag;
    }).toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 600;

        return RefreshIndicator(
          onRefresh: () async {
            HapticFeedback.lightImpact();
            await Future<void>.delayed(const Duration(milliseconds: 300));
            if (mounted) setState(() {});
          },
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
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: '搜索院校或专业代码 (例: 浙江大学 / 085404)',
                      hintStyle: TextStyle(
                        color: theme.colorScheme.outline,
                        fontSize: 13,
                      ),
                      prefixIcon: const Icon(Icons.search_rounded, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {});
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: theme.colorScheme.outlineVariant,
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
                        for (final tag in ['全部', '985', '211', '双一流']) ...[
                          Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: ChoiceChip(
                              label: Text(tag, style: const TextStyle(fontSize: 12)),
                              selected: _selectedTag == tag,
                              onSelected: (val) {
                                if (val) {
                                  HapticFeedback.selectionClick();
                                  setState(() => _selectedTag = tag);
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
                  if (filtered.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40.0),
                      child: Center(
                        child: Text(
                          '未检索到符合条件的院校',
                          style: TextStyle(color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ),
                    )
                  else
                    for (final school in filtered)
                      SchoolRowItem(
                        schoolName: school['schoolName'],
                        college: school['college'],
                        majorCodeName: school['majorCodeName'],
                        ratio: school['ratio'],
                        isTarget: school['isTarget'],
                        tags: List<String>.from(school['tags']),
                        trendData: List<Map<String, dynamic>>.from(
                          school['trendData'],
                        ),
                        onTargetToggle: (isTarget) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                isTarget ? '已设为一志愿目标院校！' : '已取消一志愿目标',
                              ),
                              duration: const Duration(seconds: 1),
                            ),
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
}
