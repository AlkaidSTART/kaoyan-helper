import '../../../core/network/dio_client.dart';
import '../../shared/paged_result.dart';
import '../domain/mistake_models.dart';

/// 错题仓储（契约 MIS-01~05），服务端强制 `user_id = auth.uid()`。
class MistakesRepository {
  final DioClient _client;

  MistakesRepository({required DioClient client}) : _client = client;

  /// `GET /mistakes`：status=active|mastered，subject 筛选。
  Future<PagedResult<MistakeRecord>> listMistakes({
    String? status,
    String? subject,
    int page = 1,
    int pageSize = 20,
  }) async {
    final result = await _client.get(
      '/mistakes',
      queryParameters: {
        if (status != null) 'status': status,
        if (subject != null) 'subject': subject,
        'page': page,
        'pageSize': pageSize,
      },
    );

    return PagedResult.fromResponse(
      data: result.data,
      itemsKey: 'items',
      pagination: result.pagination,
      map: MistakeRecord.fromJson,
    );
  }

  /// `GET /mistakes/:id`：非本人 404。
  Future<MistakeDetail> getMistake(String id) async {
    final result = await _client.get('/mistakes/$id');
    return MistakeDetail.fromJson(result.data as Map<String, dynamic>);
  }

  /// `POST /mistakes/:id/redo`：attemptId 客户端生成 UUID，幂等重放。
  Future<RedoResult> redoMistake(
    String id, {
    required String answer,
    required String attemptId,
  }) async {
    final result = await _client.post(
      '/mistakes/$id/redo',
      body: {'answer': answer, 'attemptId': attemptId},
    );
    return RedoResult.fromJson(result.data as Map<String, dynamic>);
  }

  /// `PATCH /mistakes/:id/status`：仅允许 mastered -> active，清零连对。
  Future<MistakeDetail> updateStatus(
    String id, {
    required String status,
    required int version,
  }) async {
    final result = await _client.patch(
      '/mistakes/$id/status',
      body: {'status': status, 'version': version},
    );
    return MistakeDetail.fromJson(result.data as Map<String, dynamic>);
  }

  /// `DELETE /mistakes/:id`：软删除，不影响题库题目。
  Future<void> deleteMistake(String id, {required int version}) async {
    await _client.delete('/mistakes/$id', body: {'version': version});
  }
}
