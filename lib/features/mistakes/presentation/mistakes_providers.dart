import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/network_providers.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../data/mistakes_repository.dart';
import '../domain/mistake_models.dart';

/// 错题列表页状态：当前筛选下的错题与总数。
class MistakePage {
  final List<MistakeRecord> items;
  final int total;

  const MistakePage({required this.items, required this.total});
}

/// 错题状态：未登录为 null；按学科/状态筛选拉取（MIS-01）。
class MistakesNotifier extends AsyncNotifier<MistakePage?> {
  static const _uuid = Uuid();

  int _subjectFilter = 0; // 0: 全部, 1: 政治, 2: 英语, 3: 数学, 4: 专业课
  int _statusFilter = 0; // 0: 待消除(active), 1: 已掌握(mastered)

  static const _subjectKeys = {
    1: 'politics',
    2: 'english',
    3: 'math',
    4: 'professional',
  };

  int get subjectFilter => _subjectFilter;
  int get statusFilter => _statusFilter;

  @override
  Future<MistakePage?> build() async {
    final isAuthenticated = ref.watch(
      authNotifierProvider.select((state) => state.isAuthenticated),
    );

    if (!isAuthenticated) {
      return null;
    }

    return _load();
  }

  Future<MistakePage> _load() async {
    final repository = ref.watch(mistakesRepositoryProvider);
    final status = _statusFilter == 1 ? 'mastered' : 'active';
    final page = await repository.listMistakes(
      status: status,
      subject: _subjectKeys[_subjectFilter],
      page: 1,
      pageSize: 50,
    );

    return MistakePage(items: page.items, total: page.total);
  }

  Future<void> setSubjectFilter(int value) async {
    if (_subjectFilter == value) {
      return;
    }
    _subjectFilter = value;
    await _reload();
  }

  Future<void> setStatusFilter(int value) async {
    if (_statusFilter == value) {
      return;
    }
    _statusFilter = value;
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

  /// 重做错题（MIS-03）：服务端判题并推进连对状态机，返回重做结果。
  Future<RedoResult> redo(MistakeRecord mistake, String answer) async {
    final repository = ref.read(mistakesRepositoryProvider);
    final result = await repository.redoMistake(
      mistake.id,
      answer: answer,
      attemptId: _uuid.v4(),
    );
    await refresh();
    return result;
  }

  /// 删除错题（MIS-05，软删除）：先取详情拿乐观锁 version。
  Future<void> delete(MistakeRecord mistake) async {
    final repository = ref.read(mistakesRepositoryProvider);
    final detail = await repository.getMistake(mistake.id);
    await repository.deleteMistake(mistake.id, version: detail.version);
    await refresh();
  }

  /// 重新激活已掌握错题（MIS-04，仅 mastered -> active）。
  Future<void> reactivate(MistakeRecord mistake) async {
    final repository = ref.read(mistakesRepositoryProvider);
    final detail = await repository.getMistake(mistake.id);
    await repository.updateStatus(
      mistake.id,
      status: 'active',
      version: detail.version,
    );
    await refresh();
  }
}

final mistakesRepositoryProvider = Provider<MistakesRepository>((ref) {
  return MistakesRepository(client: ref.watch(dioClientProvider));
});

final mistakesProvider =
    AsyncNotifierProvider<MistakesNotifier, MistakePage?>(
      MistakesNotifier.new,
    );

/// 错题详情缓存提供者（重做对话框使用；family 参数为错题 id）。
final mistakeDetailProvider =
    FutureProvider.family<MistakeDetail, String>((ref, id) async {
      final repository = ref.watch(mistakesRepositoryProvider);
      return repository.getMistake(id);
    });
