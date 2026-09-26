import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../data/schools_repository.dart';
import '../domain/school_models.dart';

/// 院校列表页状态：筛选结果 + 本人目标院校快照（用于星标）。
class SchoolPage {
  final List<SchoolSummary> items;
  final int total;
  final List<TargetSchoolRef> targets;

  const SchoolPage({
    required this.items,
    required this.total,
    required this.targets,
  });

  bool isTarget(String schoolId) => targets.any(
    (target) => target.schoolId == schoolId && target.type == 'primary',
  );
}

/// 择校状态：未登录为 null；keyword/tag 筛选拉取（SCH-01）。
class SchoolsNotifier extends AsyncNotifier<SchoolPage?> {
  static const _tagParams = {
    '985': 'is985',
    '211': 'is211',
    '双一流': 'isDoubleFirstClass',
    '自划线': 'isSelfMarking',
  };

  String _keyword = '';
  String _tag = '全部';
  List<TargetSchoolRef> _targets = const [];

  String get tag => _tag;

  @override
  Future<SchoolPage?> build() async {
    final isAuthenticated = ref.watch(
      authNotifierProvider.select((state) => state.isAuthenticated),
    );

    if (!isAuthenticated) {
      return null;
    }

    return _load();
  }

  Future<SchoolPage> _load() async {
    final repository = ref.watch(schoolsRepositoryProvider);
    final paramKey = _tagParams[_tag];
    final page = await repository.listSchools(
      keyword: _keyword.isEmpty ? null : _keyword,
      is985: paramKey == 'is985' ? true : null,
      is211: paramKey == 'is211' ? true : null,
      isDoubleFirstClass: paramKey == 'isDoubleFirstClass' ? true : null,
      isSelfMarking: paramKey == 'isSelfMarking' ? true : null,
      page: 1,
      pageSize: 50,
    );

    if (_targets.isEmpty) {
      try {
        _targets = await repository.getTargets();
      } on Exception {
        _targets = const [];
      }
    }

    return SchoolPage(items: page.items, total: page.total, targets: _targets);
  }

  Future<void> setKeyword(String value) async {
    if (_keyword == value) {
      return;
    }
    _keyword = value.trim();
    await _reload();
  }

  Future<void> setTag(String value) async {
    if (_tag == value) {
      return;
    }
    _tag = value;
    await _reload();
  }

  Future<void> _reload() async {
    state = const AsyncLoading();
    try {
      state = AsyncData(await _load());
    } catch (error, stack) {
      state = AsyncError(error, stack);
    }
  }

  Future<void> refresh() => _reload();

  /// 星标/取消目标院校（SCH-04/05，type=primary；服务端幂等）。
  Future<void> toggleTarget(SchoolSummary school, bool target) async {
    final repository = ref.read(schoolsRepositoryProvider);

    _targets = target
        ? await repository.addTarget(school.id, type: 'primary')
        : await repository.removeTarget(school.id, type: 'primary');

    final page = state.value;
    if (page != null) {
      state = AsyncData(
        SchoolPage(items: page.items, total: page.total, targets: _targets),
      );
    }
  }
}

/// 专业历年数据懒加载（展开卡片时按 schoolId 拉取，SCH-03）。
final schoolProgramsProvider =
    FutureProvider.family<List<SchoolProgram>, String>((ref, schoolId) async {
      final repository = ref.watch(schoolsRepositoryProvider);
      final page = await repository.listPrograms(schoolId, pageSize: 50);
      return page.items;
    });

final schoolsRepositoryProvider = Provider<SchoolsRepository>((ref) {
  return SchoolsRepository(client: ref.watch(dioClientProvider));
});

final schoolsProvider = AsyncNotifierProvider<SchoolsNotifier, SchoolPage?>(
  SchoolsNotifier.new,
);
