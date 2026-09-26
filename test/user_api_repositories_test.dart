import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaoyan_helper/core/errors/app_exception.dart';
import 'package:kaoyan_helper/core/network/api_envelope.dart';
import 'package:kaoyan_helper/core/network/auth_token_store.dart';
import 'package:kaoyan_helper/core/network/dio_client.dart';
import 'package:kaoyan_helper/features/auth/data/auth_repository.dart';
import 'package:kaoyan_helper/features/dashboard/data/dashboard_repository.dart';
import 'package:kaoyan_helper/features/flashcards/data/flashcards_repository.dart';
import 'package:kaoyan_helper/features/me/data/me_repository.dart';
import 'package:kaoyan_helper/features/mistakes/data/mistakes_repository.dart';
import 'package:kaoyan_helper/features/quiz/data/quiz_repository.dart';
import 'package:kaoyan_helper/features/schools/data/schools_repository.dart';

Map<String, dynamic> _successEnvelope(dynamic data, {Map<String, dynamic>? pagination}) {
  return {
    'success': true,
    'data': data,
    'meta': {
      'requestId': 'req_test',
      'timestamp': '2026-09-26T10:00:00Z',
      'pagination': ?pagination,
    },
  };
}

Map<String, dynamic> _errorEnvelope(String code, String message, ) {
  return {
    'success': false,
    'error': {'code': code, 'message': message, 'details': null},
    'meta': {'requestId': 'req_test', 'timestamp': '2026-09-26T10:00:00Z'},
  };
}

/// 记录请求并按脚本返回响应的 DioClient 替身。
class RecordedCall {
  final String method;
  final String path;
  final Object? body;
  final Map<String, dynamic>? query;

  const RecordedCall(this.method, this.path, this.body, this.query);
}

class ScriptedDioClient implements DioClient {
  final List<RecordedCall> calls = [];
  ApiClientResponse Function(RecordedCall call)? responder;

  @override
  Future<ApiClientResponse> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _record(RecordedCall('GET', path, null, queryParameters));
  }

  @override
  Future<ApiClientResponse> post(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _record(RecordedCall('POST', path, body, queryParameters));
  }

  @override
  Future<ApiClientResponse> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _record(RecordedCall('PATCH', path, body, queryParameters));
  }

  @override
  Future<ApiClientResponse> delete(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    bool requireAuth = true,
  }) {
    return _record(RecordedCall('DELETE', path, body, queryParameters));
  }

  Future<ApiClientResponse> _record(RecordedCall call) async {
    calls.add(call);
    final response = responder?.call(call);

    if (response == null) {
      fail('未为 ${call.method} $call 预设响应');
    }

    return response;
  }
}

void main() {
  group('ApiEnvelopeParser', () {
    test('parseSuccess unwraps data and pagination', () {
      final response = ApiEnvelopeParser.parseSuccess(
        _successEnvelope(
          {'items': []},
          pagination: {'page': 2, 'pageSize': 20, 'total': 45, 'totalPages': 3},
        ),
      );

      expect(response.data, isA<Map<String, dynamic>>());
      expect(response.pagination?.page, 2);
      expect(response.pagination?.total, 45);
    });

    test('parseSuccess rejects malformed body', () {
      expect(
        () => ApiEnvelopeParser.parseSuccess({'unexpected': true}),
        throwsA(isA<NetworkException>()),
      );
    });

    test('parseError maps 401 TOKEN_EXPIRED to AuthException', () {
      final error = ApiEnvelopeParser.parseError(
        _errorEnvelope('TOKEN_EXPIRED', '访问令牌已过期'),
        401,
      );

      expect(error, isA<AuthException>());
      expect(error.code, 'TOKEN_EXPIRED');
    });

    test('parseError maps 422 business code to ApiException', () {
      final error = ApiEnvelopeParser.parseError(
        _errorEnvelope('VALIDATION_FAILED', '参数校验失败'),
        422,
      );

      expect(error, isA<ApiException>());
      expect(error.code, 'VALIDATION_FAILED');
      expect((error as ApiException).statusCode, 422);
    });

    test('parseError falls back for non-envelope body', () {
      final error = ApiEnvelopeParser.parseError('gateway timeout', 504);

      expect(error, isA<NetworkException>());
      expect(error.message, contains('不可用'));
    });
  });

  group('RemoteAuthRepository', () {
    late ScriptedDioClient client;
    late MemoryAuthTokenStore tokenStore;
    late RemoteAuthRepository repository;

    setUp(() {
      client = ScriptedDioClient();
      tokenStore = MemoryAuthTokenStore();
      repository = RemoteAuthRepository(client: client, tokenStore: tokenStore);
    });

    test('loginWithCode posts flutter clientType and persists tokens', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'accessToken': 'access-1',
              'refreshToken': 'refresh-1',
              'expiresIn': 3600,
              'tokenType': 'Bearer',
              'user': {'id': 'u-1', 'email': 'user@example.com', 'nickname': '登科同学'},
            },
          );

      final user = await repository.loginWithCode('User@Example.com ', '123456');

      expect(user.id, 'u-1');
      expect(user.nickname, '登科同学');
      expect(await tokenStore.readAccessToken(), 'access-1');
      expect(await tokenStore.readRefreshToken(), 'refresh-1');

      final call = client.calls.single;
      expect(call.method, 'POST');
      expect(call.path, '/auth/login/code');
      expect(call.body, {
        'email': 'user@example.com',
        'code': '123456',
        'clientType': 'flutter',
      });
    });

    test('loginWithCode rejects malformed email without request', () async {
      await expectLater(
        repository.loginWithCode('13800000000', '123456'),
        throwsA(
          isA<AuthException>().having((e) => e.code, 'code', 'VALIDATION_FAILED'),
        ),
      );
      expect(client.calls, isEmpty);
    });

    test('loginWithPassword fails fast per contract AUTH-03', () async {
      await expectLater(
        repository.loginWithPassword('user@example.com', 'password123'),
        throwsA(
          isA<AuthException>().having(
            (e) => e.code,
            'code',
            'PROVIDER_UNSUPPORTED',
          ),
        ),
      );
      expect(client.calls, isEmpty);
    });

    test('sendCode posts email with login purpose', () async {
      client.responder = (_) => const ApiClientResponse(data: {
            'expiresInSeconds': 300,
            'retryAfterSeconds': 60,
          });

      await repository.sendCode('user@example.com');

      final call = client.calls.single;
      expect(call.path, '/auth/send-code');
      expect(call.body, {'email': 'user@example.com', 'purpose': 'login'});
    });

    test('restoreSession returns user and keeps tokens', () async {
      await tokenStore.save(accessToken: 'access-1', refreshToken: 'refresh-1');
      client.responder = (_) => ApiClientResponse(
            data: {
              'user': {'id': 'u-1', 'nickname': '登科同学'},
              'permissions': ['quiz:read'],
              'expiresAt': '2026-09-26T18:00:00Z',
            },
          );

      final user = await repository.restoreSession();

      expect(user?.id, 'u-1');
      expect(client.calls.single.path, '/auth/session');
      expect(await tokenStore.readAccessToken(), 'access-1');
    });

    test('restoreSession without token skips request', () async {
      final user = await repository.restoreSession();

      expect(user, isNull);
      expect(client.calls, isEmpty);
    });

    test('restoreSession clears tokens on auth failure', () async {
      await tokenStore.save(accessToken: 'access-1', refreshToken: 'refresh-1');
      client.responder = (_) => throw const AuthException('登录已过期', code: 'REFRESH_INVALID');

      final user = await repository.restoreSession();

      expect(user, isNull);
      expect(await tokenStore.readAccessToken(), isNull);
    });

    test('logout clears tokens even when backend fails', () async {
      await tokenStore.save(accessToken: 'access-1', refreshToken: 'refresh-1');
      client.responder = (_) => throw const NetworkException('网络不可用', code: 'NETWORK_UNAVAILABLE');

      await repository.logout();

      expect(await tokenStore.readAccessToken(), isNull);
      expect(await tokenStore.readRefreshToken(), isNull);
    });
  });

  group('User backend repositories', () {
    late ScriptedDioClient client;

    setUp(() {
      client = ScriptedDioClient();
    });

    test('DashboardRepository.getSummary parses aggregate fields', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'daysUntilExam': 98,
              'todayQuestionCount': 32,
              'activeMistakeCount': 5,
              'dueCardCount': 24,
              'streakDays': 12,
              'totalReviewedCards': 316,
              'primaryTarget': {
                'schoolId': 's-1',
                'schoolName': '浙江大学',
                'majorCode': '085404',
                'majorName': '计算机技术',
              },
            },
          );

      final summary = await DashboardRepository(client: client).getSummary();

      expect(summary.daysUntilExam, 98);
      expect(summary.todayQuestionCount, 32);
      expect(summary.streakDays, 12);
      expect(summary.primaryTarget?.schoolName, '浙江大学');
      expect(client.calls.single.query, {'timezone': 'Asia/Shanghai'});
    });

    test('QuizRepository.listQuestions builds filters and pagination', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'items': [
                {
                  'id': 'q-1',
                  'subject': 'politics',
                  'type': 'single_choice',
                  'stem': '唯物辩证法的实质和核心是（ ）',
                  'options': [
                    {'key': 'A', 'content': '质量互变规律'},
                    {'key': 'B', 'content': '对立统一规律'},
                  ],
                  'source': 'official',
                },
              ],
            },
            pagination: const ApiPagination(page: 1, pageSize: 20, total: 1, totalPages: 1),
          );

      final page = await QuizRepository(client: client).listQuestions(
        scope: 'public',
        subject: 'politics',
        search: '辩证法',
      );

      expect(page.items.single.stem, contains('唯物辩证法'));
      expect(page.items.single.options.length, 2);
      expect(page.total, 1);
      final call = client.calls.single;
      expect(call.path, '/questions');
      expect(call.query?['scope'], 'public');
      expect(call.query?['subject'], 'politics');
    });

    test('QuizRepository.answerQuestion sends client attemptId', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'isCorrect': false,
              'correctAnswer': 'B',
              'explanation': '对立统一规律',
              'mistake': {'id': 'm-1', 'status': 'active', 'errorCount': 1},
              'answeredAt': '2026-09-26T10:00:00Z',
            },
          );

      final result = await QuizRepository(client: client)
          .answerQuestion('q-1', answer: 'A', attemptId: 'attempt-1');

      expect(result.isCorrect, isFalse);
      expect(result.correctAnswer, 'B');
      expect(result.mistakeCreated, isTrue);
      expect(client.calls.single.body, {'answer': 'A', 'attemptId': 'attempt-1'});
    });

    test('MistakesRepository.redoMistake parses state machine result', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'isCorrect': true,
              'correctAnswer': 'B',
              'explanation': null,
              'mistake': {
                'id': 'm-1',
                'status': 'active',
                'errorCount': 1,
                'consecutiveCorrect': 1,
                'lastWrongAt': '2026-09-26T09:00:00Z',
                'createdAt': '2026-09-20T09:00:00Z',
                'updatedAt': '2026-09-26T10:00:00Z',
              },
              'mastered': false,
              'answeredAt': '2026-09-26T10:00:00Z',
            },
          );

      final result = await MistakesRepository(client: client)
          .redoMistake('m-1', answer: 'B', attemptId: 'attempt-2');

      expect(result.isCorrect, isTrue);
      expect(result.mastered, isFalse);
      expect(result.mistake.consecutiveCorrect, 1);
    });

    test('SchoolsRepository.addTarget posts type and returns targets', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'targets': [
                {
                  'schoolId': 's-1',
                  'schoolName': '浙江大学',
                  'type': 'primary',
                  'majorCode': '085404',
                  'majorName': '计算机技术',
                },
              ],
            },
          );

      final targets = await SchoolsRepository(client: client).addTarget(
        's-1',
        type: 'primary',
        majorCode: '085404',
        majorName: '计算机技术',
      );

      expect(targets.single.schoolName, '浙江大学');
      expect(targets.single.type, 'primary');
      expect(client.calls.single.body, {
        'type': 'primary',
        'majorCode': '085404',
        'majorName': '计算机技术',
      });
    });

    test('FlashcardsRepository.reviewCard sends idempotencyKey', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'progress': {
                'repetitions': 1,
                'intervalDays': 1,
                'easeFactor': 2.6,
                'dueAt': '2026-09-27T10:00:00Z',
                'lastRating': 'remembered',
              },
              'dueRemaining': 0,
              'checkIn': {'checkInDate': '2026-09-26'},
            },
          );

      final result = await FlashcardsRepository(client: client)
          .reviewCard('c-1', rating: 'remembered', idempotencyKey: 'idem-1');

      expect(result.dueRemaining, 0);
      expect(result.checkInDate, isNotNull);
      expect(client.calls.single.body, {'rating': 'remembered', 'idempotencyKey': 'idem-1'});
    });

    test('MeRepository.getTargets parses snapshot list', () async {
      client.responder = (_) => ApiClientResponse(
            data: {
              'targets': [
                {
                  'schoolId': 's-1',
                  'schoolName': '浙江大学',
                  'type': 'primary',
                  'majorCode': '085404',
                  'majorName': '计算机技术',
                  'updatedAt': '2026-09-26T10:00:00Z',
                },
              ],
            },
          );

      final targets = await MeRepository(client: client).getTargets();

      expect(targets.single.schoolName, '浙江大学');
      expect(client.calls.single.path, '/me/targets');
    });
  });

  group('DioClient 401 refresh & retry', () {
    test('refreshes tokens once and replays the original request', () async {
      final tokenStore = MemoryAuthTokenStore();
      await tokenStore.save(accessToken: 'expired', refreshToken: 'refresh-old');

      final requestBodies = <Map<String, dynamic>>[];
      final adapter = _ScriptedAdapter((options) {
        requestBodies.add({
          'method': options.method,
          'path': options.uri.toString(),
          'auth': options.headers['Authorization'],
          'body': options.data,
        });

        if (options.uri.path.endsWith('/auth/refresh')) {
          return ResponseBody.fromString(
            jsonEncode(_successEnvelope({
              'accessToken': 'access-new',
              'refreshToken': 'refresh-new',
              'expiresIn': 3600,
              'tokenType': 'Bearer',
            })),
            200,
            headers: _jsonHeaders,
          );
        }

        if (options.headers['Authorization'] == 'Bearer access-new') {
          return ResponseBody.fromString(
            jsonEncode(_successEnvelope({'daysUntilExam': 98})),
            200,
            headers: _jsonHeaders,
          );
        }

        return ResponseBody.fromString(
          jsonEncode(_errorEnvelope('TOKEN_EXPIRED', '访问令牌已过期')),
          401,
          headers: _jsonHeaders,
        );
      });

      final client = DioClient(
        tokenStore: tokenStore,
        dio: Dio()..httpClientAdapter = adapter,
      );

      final summary = await DashboardRepository(client: client).getSummary();

      expect(summary.daysUntilExam, 98);
      expect(await tokenStore.readAccessToken(), 'access-new');
      expect(await tokenStore.readRefreshToken(), 'refresh-new');

      final refreshCall = requestBodies
          .firstWhere((call) => (call['path'] as String).endsWith('/auth/refresh'));
      expect(refreshCall['body'], {'refreshToken': 'refresh-old'});
    });

    test('unrecoverable refresh clears tokens and reports expired session', () async {
      final tokenStore = MemoryAuthTokenStore();
      await tokenStore.save(accessToken: 'expired', refreshToken: 'refresh-old');

      final adapter = _ScriptedAdapter((options) {
        if (options.uri.path.endsWith('/auth/refresh')) {
          return ResponseBody.fromString(
            jsonEncode(_errorEnvelope('REFRESH_INVALID', '刷新凭证无效')),
            401,
            headers: _jsonHeaders,
          );
        }

        return ResponseBody.fromString(
          jsonEncode(_errorEnvelope('TOKEN_EXPIRED', '访问令牌已过期')),
          401,
          headers: _jsonHeaders,
        );
      });

      final client = DioClient(
        tokenStore: tokenStore,
        dio: Dio()..httpClientAdapter = adapter,
      );

      await expectLater(
        DashboardRepository(client: client).getSummary(),
        throwsA(
          isA<AuthException>().having((e) => e.code, 'code', 'REFRESH_INVALID'),
        ),
      );
      expect(await tokenStore.readAccessToken(), isNull);
    });
  });
}

const _jsonHeaders = {
  Headers.contentTypeHeader: [Headers.jsonContentType],
};

class _ScriptedAdapter implements HttpClientAdapter {
  final ResponseBody Function(RequestOptions options) handler;

  _ScriptedAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => handler(options);

  @override
  void close({bool force = false}) {}
}
