import '../../../core/network/dio_client.dart';
import '../../shared/paged_result.dart';
import '../domain/question_models.dart';

/// 刷题仓储（契约 QUIZ-01~06）。列表/详情永不返回答案，判题在服务端。
class QuizRepository {
  final DioClient _client;

  QuizRepository({required DioClient client}) : _client = client;

  /// `GET /questions`：scope=public 仅官方已批准题，mine 仅本人题。
  Future<PagedResult<QuestionSummary>> listQuestions({
    String scope = 'public',
    String? subject,
    String? chapter,
    int? year,
    String? type,
    String? difficulty,
    String? search,
    int page = 1,
    int pageSize = 20,
  }) async {
    final result = await _client.get(
      '/questions',
      queryParameters: {
        'scope': scope,
        'subject': ?subject,
        'chapter': ?chapter,
        'year': ?year,
        'type': ?type,
        'difficulty': ?difficulty,
        if (search != null && search.isNotEmpty) 'search': search,
        'page': page,
        'pageSize': pageSize,
      },
    );

    return PagedResult.fromResponse(
      data: result.data,
      itemsKey: 'items',
      pagination: result.pagination,
      map: QuestionSummary.fromJson,
    );
  }

  /// `GET /questions/:id`：官方已批准题或本人题，不可见返回 404。
  Future<QuestionDetail> getQuestion(String id) async {
    final result = await _client.get('/questions/$id');
    return QuestionDetail.fromJson(result.data as Map<String, dynamic>);
  }

  /// `POST /questions/:id/answer`：服务端判题；attemptId 由客户端生成 UUID，
  /// 同一 attemptId 重复提交返回首次结果（幂等）。
  Future<AnswerResult> answerQuestion(
    String id, {
    required String answer,
    required String attemptId,
  }) async {
    final result = await _client.post(
      '/questions/$id/answer',
      body: {'answer': answer, 'attemptId': attemptId},
    );
    return AnswerResult.fromJson(result.data as Map<String, dynamic>);
  }

  /// `POST /questions`：创建题目；public 进入 pending 审核。
  Future<QuestionDetail> createQuestion({
    required String subject,
    required String type,
    required String stem,
    required List<QuestionOption> options,
    required String answer,
    String? chapter,
    int? year,
    String? explanation,
    String? difficulty,
    String visibility = 'private',
  }) async {
    final result = await _client.post(
      '/questions',
      body: {
        'subject': subject,
        'type': type,
        'stem': stem,
        'options': [
          for (final option in options)
            {'key': option.key, 'content': option.content},
        ],
        'answer': answer,
        'visibility': visibility,
        'chapter': ?chapter,
        'year': ?year,
        'explanation': ?explanation,
        'difficulty': ?difficulty,
      },
    );
    return QuestionDetail.fromJson(result.data as Map<String, dynamic>);
  }

  /// `PATCH /questions/:id`：乐观锁，发布中的公共题编辑后回到 pending。
  Future<QuestionDetail> updateQuestion(
    String id, {
    required int version,
    String? stem,
    String? explanation,
    List<QuestionOption>? options,
    String? difficulty,
  }) async {
    final result = await _client.patch(
      '/questions/$id',
      body: {
        'version': version,
        'stem': ?stem,
        'explanation': ?explanation,
        if (options != null)
          'options': [
            for (final option in options)
              {'key': option.key, 'content': option.content},
          ],
        'difficulty': ?difficulty,
      },
    );
    return QuestionDetail.fromJson(result.data as Map<String, dynamic>);
  }

  /// `DELETE /questions/:id`：软删除，保留历史错题引用。
  Future<void> deleteQuestion(String id, {required int version}) async {
    await _client.delete('/questions/$id', body: {'version': version});
  }
}
