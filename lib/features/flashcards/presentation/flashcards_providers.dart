import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/network_providers.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../data/flashcards_repository.dart';
import '../domain/flashcard_models.dart';

/// 一次背诵会话：到期卡片队列 + 当前进度。
class DueSession {
  final DueList due;
  final int index;
  final bool reviewing;

  const DueSession({required this.due, this.index = 0, this.reviewing = false});

  DueCard? get current =>
      index < due.items.length ? due.items[index] : null;

  /// 已完成张数（进度条用）。
  int get completedCount => index;

  DueSession copyWith({int? index, bool? reviewing}) {
    return DueSession(
      due: due,
      index: index ?? this.index,
      reviewing: reviewing ?? this.reviewing,
    );
  }
}

/// 背诵会话状态：未登录为 null；无到期卡返回空 `DueList`（视图展示完成态）。
class DueSessionNotifier extends AsyncNotifier<DueSession?> {
  static const _uuid = Uuid();

  @override
  Future<DueSession?> build() async {
    final isAuthenticated = ref.watch(
      authNotifierProvider.select((state) => state.isAuthenticated),
    );

    if (!isAuthenticated) {
      return null;
    }

    return _load();
  }

  Future<DueSession> _load() async {
    final repository = ref.watch(flashcardsRepositoryProvider);
    final due = await repository.listDue(limit: 20);
    return DueSession(due: due);
  }

  /// 复习当前卡（FC-04，SM-2 服务端计算；幂等键客户端生成）。
  /// 返回本次复习结果供视图提示打卡信息。
  Future<ReviewResult> rate(String rating) async {
    final session = state.value;
    final card = session?.current;
    if (session == null || card == null || session.reviewing) {
      throw StateError('no active due card');
    }

    state = AsyncData(session.copyWith(reviewing: true));

    try {
      final repository = ref.read(flashcardsRepositoryProvider);
      final result = await repository.reviewCard(
        card.card.id,
        rating: rating,
        idempotencyKey: _uuid.v4(),
      );

      final nextIndex = session.index + 1;
      state = AsyncData(session.copyWith(index: nextIndex, reviewing: false));
      return result;
    } on Exception {
      state = AsyncData(session.copyWith(reviewing: false));
      rethrow;
    }
  }

  /// 重新拉取到期队列（下拉刷新/完成后再来一轮）。
  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      state = AsyncData(await _load());
    } catch (error, stack) {
      state = AsyncError(error, stack);
    }
  }
}

final flashcardsRepositoryProvider = Provider<FlashcardsRepository>((ref) {
  return FlashcardsRepository(client: ref.watch(dioClientProvider));
});

final dueSessionProvider =
    AsyncNotifierProvider<DueSessionNotifier, DueSession?>(
      DueSessionNotifier.new,
    );
