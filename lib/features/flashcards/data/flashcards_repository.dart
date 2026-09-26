import '../../../core/network/dio_client.dart';
import '../../shared/paged_result.dart';
import '../domain/flashcard_models.dart';

/// 闪卡与打卡仓储（契约 FC-01~05），SM-2 与打卡完全由服务端计算。
class FlashcardsRepository {
  final DioClient _client;

  FlashcardsRepository({required DioClient client}) : _client = client;

  /// `GET /flashcards/due`：limit 1~50，默认 20。
  Future<DueList> listDue({int limit = 20}) async {
    final result = await _client.get(
      '/flashcards/due',
      queryParameters: {'limit': limit},
    );
    return DueList.fromJson(result.data as Map<String, dynamic>);
  }

  /// `GET /flashcards`：系统卡 + 本人 UGC 卡。
  Future<PagedResult<Flashcard>> listCards({
    String? category,
    String? source,
    String? search,
    int page = 1,
    int pageSize = 20,
  }) async {
    final result = await _client.get(
      '/flashcards',
      queryParameters: {
        'category': ?category,
        'source': ?source,
        if (search != null && search.isNotEmpty) 'search': search,
        'page': page,
        'pageSize': pageSize,
      },
    );

    return PagedResult.fromResponse(
      data: result.data,
      itemsKey: 'items',
      pagination: result.pagination,
      map: Flashcard.fromJson,
    );
  }

  /// `POST /flashcards`：source 与 creatorId 服务端赋值，仅本人可见。
  Future<Flashcard> createCard({
    required String category,
    required String front,
    required String back,
    List<String> tags = const [],
  }) async {
    final result = await _client.post(
      '/flashcards',
      body: {'category': category, 'front': front, 'back': back, 'tags': tags},
    );
    return Flashcard.fromJson(result.data as Map<String, dynamic>);
  }

  /// `POST /flashcards/:id/review`：rating=forgot|fuzzy|remembered；
  /// idempotencyKey 客户端生成 UUID，重复调用返回首次计算结果。
  Future<ReviewResult> reviewCard(
    String id, {
    required String rating,
    required String idempotencyKey,
  }) async {
    final result = await _client.post(
      '/flashcards/$id/review',
      body: {'rating': rating, 'idempotencyKey': idempotencyKey},
    );
    return ReviewResult.fromJson(result.data as Map<String, dynamic>);
  }

  /// `GET /check-ins`：打卡记录 + streakDays。
  Future<(List<CheckInRecord>, int)> listCheckIns({
    DateTime? from,
    DateTime? to,
    int page = 1,
    int pageSize = 20,
  }) async {
    final result = await _client.get(
      '/check-ins',
      queryParameters: {
        if (from != null) 'from': from.toUtc().toIso8601String(),
        if (to != null) 'to': to.toUtc().toIso8601String(),
        'page': page,
        'pageSize': pageSize,
      },
    );

    final data = result.data;
    final list = data is Map<String, dynamic> ? data['items'] : null;
    final streak = data is Map<String, dynamic> ? data['streakDays'] : null;
    final items = list is List
        ? list
              .whereType<Map<String, dynamic>>()
              .map(CheckInRecord.fromJson)
              .toList(growable: false)
        : const <CheckInRecord>[];

    return (items, (streak as num?)?.toInt() ?? 0);
  }
}
