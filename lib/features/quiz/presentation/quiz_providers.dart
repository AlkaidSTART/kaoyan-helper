import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/network_providers.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../data/quiz_repository.dart';
import '../domain/question_models.dart';

/// 一次刷题会话：题目队列 + 当前进度 + 最近一次判题结果。
class QuizSession {
  final List<QuestionSummary> items;
  final int index;
  final AnswerResult? result;

  /// 本次用户所选选项 key（判题结果只含正确答案，标红需此字段）。
  final String? selectedKey;
  final bool submitting;

  const QuizSession({
    required this.items,
    this.index = 0,
    this.result,
    this.selectedKey,
    this.submitting = false,
  });

  QuestionSummary get current => items[index];

  QuizSession copyWith({
    int? index,
    AnswerResult? result,
    bool clearResult = false,
    String? selectedKey,
    bool clearSelectedKey = false,
    bool? submitting,
  }) {
    return QuizSession(
      items: items,
      index: index ?? this.index,
      result: clearResult ? null : (result ?? this.result),
      selectedKey: clearSelectedKey ? null : (selectedKey ?? this.selectedKey),
      submitting: submitting ?? this.submitting,
    );
  }
}

/// 题库当前无可用题目（scope=public 下无已批准题）。
class QuizEmptyException implements Exception {
  const QuizEmptyException();
}

/// 刷题会话状态：未登录为 null；拉取公开题库失败向上抛 `AppException`。
class QuizSessionNotifier extends AsyncNotifier<QuizSession?> {
  static const _uuid = Uuid();

  @override
  Future<QuizSession?> build() async {
    final isAuthenticated = ref.watch(
      authNotifierProvider.select((state) => state.isAuthenticated),
    );

    if (!isAuthenticated) {
      return null;
    }

    return _load();
  }

  Future<QuizSession> _load() async {
    final repository = ref.watch(quizRepositoryProvider);
    final page = await repository.listQuestions(
      scope: 'public',
      page: 1,
      pageSize: 20,
    );

    if (page.items.isEmpty) {
      throw const QuizEmptyException();
    }

    return QuizSession(items: page.items);
  }

  /// 提交当前题答案（QUIZ-03，服务端判题；attemptId 客户端生成幂等键）。
  Future<void> submit(String answer) async {
    final session = state.value;
    if (session == null || session.submitting || session.result != null) {
      return;
    }

    state = AsyncData(
      session.copyWith(submitting: true, selectedKey: answer),
    );

    try {
      final repository = ref.read(quizRepositoryProvider);
      final result = await repository.answerQuestion(
        session.current.id,
        answer: answer,
        attemptId: _uuid.v4(),
      );
      state = AsyncData(session.copyWith(submitting: false, result: result));
    } on Exception {
      state = AsyncData(
        session.copyWith(submitting: false, clearSelectedKey: true),
      );
      rethrow;
    }
  }

  /// 循环切至下一题并清空上一题判题结果。
  void next() {
    final session = state.value;
    if (session == null) {
      return;
    }

    final nextIndex = (session.index + 1) % session.items.length;
    state = AsyncData(session.copyWith(index: nextIndex, clearResult: true));
  }

  /// 重新拉题开始新一轮。
  Future<void> restart() async {
    state = const AsyncLoading();
    try {
      state = AsyncData(await _load());
    } catch (error, stack) {
      state = AsyncError(error, stack);
    }
  }
}

final quizRepositoryProvider = Provider<QuizRepository>((ref) {
  return QuizRepository(client: ref.watch(dioClientProvider));
});

final quizSessionProvider =
    AsyncNotifierProvider<QuizSessionNotifier, QuizSession?>(
      QuizSessionNotifier.new,
    );
