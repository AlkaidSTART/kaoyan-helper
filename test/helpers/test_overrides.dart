import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:kaoyan_helper/core/network/auth_token_store.dart';
import 'package:kaoyan_helper/core/network/network_providers.dart';
import 'package:kaoyan_helper/features/auth/data/auth_repository.dart';
import 'package:kaoyan_helper/features/dashboard/data/dashboard_repository.dart';
import 'package:kaoyan_helper/features/dashboard/domain/dashboard_summary.dart';
import 'package:kaoyan_helper/features/dashboard/presentation/dashboard_notifier.dart';
import 'package:kaoyan_helper/features/flashcards/data/flashcards_repository.dart';
import 'package:kaoyan_helper/features/flashcards/domain/flashcard_models.dart';
import 'package:kaoyan_helper/features/flashcards/presentation/flashcards_providers.dart';
import 'package:kaoyan_helper/features/mistakes/data/mistakes_repository.dart';
import 'package:kaoyan_helper/features/mistakes/domain/mistake_models.dart';
import 'package:kaoyan_helper/features/mistakes/presentation/mistakes_providers.dart';
import 'package:kaoyan_helper/features/quiz/data/quiz_repository.dart';
import 'package:kaoyan_helper/features/quiz/domain/question_models.dart';
import 'package:kaoyan_helper/features/quiz/presentation/quiz_providers.dart';
import 'package:kaoyan_helper/features/schools/data/schools_repository.dart';
import 'package:kaoyan_helper/features/schools/domain/school_models.dart';
import 'package:kaoyan_helper/features/schools/presentation/schools_providers.dart';
import 'package:kaoyan_helper/features/shared/paged_result.dart';

DateTime _hoursAgo(int hours) =>
    DateTime.now().subtract(Duration(hours: hours));

const _zjuPrograms = [
  SchoolProgram(
    id: 'p-1',
    schoolId: 'school-zju',
    majorCode: '085404',
    majorName: '计算机技术',
    year: 2024,
    planEnrollment: 45,
    minScore: 382,
    avgScore: 390,
  ),
  SchoolProgram(
    id: 'p-2',
    schoolId: 'school-zju',
    majorCode: '085404',
    majorName: '计算机技术',
    year: 2023,
    planEnrollment: 40,
    minScore: 375,
    avgScore: 383,
  ),
];

/// UI 测试统一 Override：
/// - 登录走 [FakeAuthRepository] 闭环，不发真实网络请求；
/// - 令牌存储走内存实现，避免依赖平台插件；
/// - 各业务仓储返回固定 Mock 数据，隔离用户后端。
class FakeDashboardRepository implements DashboardRepository {
  final DashboardSummary summary;

  FakeDashboardRepository({this.summary = DashboardSummary.mock});

  @override
  Future<DashboardSummary> getSummary({
    String timezone = 'Asia/Shanghai',
  }) async {
    return summary;
  }
}

class FakeQuizRepository implements QuizRepository {
  @override
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
    return PagedResult(
      items: [
        QuestionSummary(
          id: 'q-1',
          subject: 'politics',
          chapter: '马克思主义基本原理',
          year: 2024,
          type: 'single_choice',
          stem: '下列关于矛盾普遍性和特殊性关系的表述，正确的是：',
          options: const [
            QuestionOption(key: 'A', content: '矛盾普遍性寓于特殊性之中'),
            QuestionOption(key: 'B', content: '矛盾特殊性可以脱离普遍性独立存在'),
            QuestionOption(key: 'C', content: '矛盾普遍性包含矛盾特殊性'),
            QuestionOption(key: 'D', content: '矛盾的同一性是绝对的，斗争性是相对的'),
          ],
          source: 'official',
          isPublic: true,
          isApproved: true,
          isMine: false,
          reviewStatus: 'approved',
          createdAt: _hoursAgo(48),
        ),
        QuestionSummary(
          id: 'q-2',
          subject: 'politics',
          chapter: '中国近现代史纲要',
          year: 2023,
          type: 'single_choice',
          stem: '标志着中国共产党在政治上开始走向成熟的会议是：',
          options: const [
            QuestionOption(key: 'A', content: '中共二大'),
            QuestionOption(key: 'B', content: '八七会议'),
            QuestionOption(key: 'C', content: '遵义会议'),
            QuestionOption(key: 'D', content: '中共七大'),
          ],
          source: 'official',
          isPublic: true,
          isApproved: true,
          isMine: false,
          reviewStatus: 'approved',
          createdAt: _hoursAgo(48),
        ),
      ],
      total: 2,
      totalPages: 1,
    );
  }

  @override
  Future<AnswerResult> answerQuestion(
    String id, {
    required String answer,
    required String attemptId,
  }) async {
    final correct = id == 'q-2' ? 'C' : 'A';
    return AnswerResult(
      isCorrect: answer == correct,
      correctAnswer: correct,
      explanation: '矛盾的普遍性即矛盾的共性，矛盾的特殊性即矛盾的个性。共性寓于个性之中。',
      mistakeCreated: answer != correct,
      answeredAt: _hoursAgo(0),
    );
  }

  @override
  Future<QuestionDetail> getQuestion(String id) => throw UnimplementedError();

  @override
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
  }) => throw UnimplementedError();

  @override
  Future<QuestionDetail> updateQuestion(
    String id, {
    required int version,
    String? stem,
    String? explanation,
    List<QuestionOption>? options,
    String? difficulty,
  }) => throw UnimplementedError();

  @override
  Future<void> deleteQuestion(String id, {required int version}) =>
      throw UnimplementedError();
}

class FakeMistakesRepository implements MistakesRepository {
  MistakeRecord _record(
    String id, {
    required String subject,
    required String type,
    required String stem,
    required int errorCount,
    required int consecutiveCorrect,
    required int hoursAgo,
  }) {
    return MistakeRecord(
      id: id,
      status: 'active',
      errorCount: errorCount,
      consecutiveCorrect: consecutiveCorrect,
      lastWrongAt: _hoursAgo(hoursAgo),
      createdAt: _hoursAgo(hoursAgo * 10),
      updatedAt: _hoursAgo(hoursAgo),
      question: MistakeQuestionSummary(
        id: 'question-$id',
        subject: subject,
        type: type,
        stem: stem,
        options: const [],
      ),
    );
  }

  @override
  Future<PagedResult<MistakeRecord>> listMistakes({
    String? status,
    String? subject,
    int page = 1,
    int pageSize = 20,
  }) async {
    final all = [
      _record(
        'm-1',
        subject: 'politics',
        type: 'single_choice',
        stem: '下列关于矛盾普遍性和特殊性关系的表述，正确的是：矛盾普遍性寓于特殊性之中……',
        errorCount: 3,
        consecutiveCorrect: 0,
        hoursAgo: 2,
      ),
      _record(
        'm-2',
        subject: 'english',
        type: 'single_choice',
        stem:
            'According to the passage, the primary reason for environmental changes is not merely natural shifts but...',
        errorCount: 2,
        consecutiveCorrect: 1,
        hoursAgo: 20,
      ),
      _record(
        'm-3',
        subject: 'professional',
        type: 'single_choice',
        stem: '在具有 n 个顶点的连通无向图中，其生成树的边数必须为 n-1，若增加一条边必将产生……',
        errorCount: 4,
        consecutiveCorrect: 0,
        hoursAgo: 72,
      ),
    ];

    final filtered = all
        .where((m) => subject == null || m.question?.subject == subject)
        .where(
          (m) => status == null || status == 'active' || m.status == status,
        )
        .toList();

    return PagedResult(items: filtered, total: filtered.length, totalPages: 1);
  }

  @override
  Future<MistakeDetail> getMistake(String id) async {
    return MistakeDetail(
      id: id,
      status: 'active',
      errorCount: 3,
      consecutiveCorrect: 0,
      lastWrongAt: _hoursAgo(2),
      createdAt: _hoursAgo(48),
      updatedAt: _hoursAgo(2),
      question: MistakeQuestionSummary(
        id: 'question-$id',
        subject: 'politics',
        type: 'single_choice',
        stem: '下列关于矛盾普遍性和特殊性关系的表述，正确的是：',
        options: const [
          QuizOption(key: 'A', content: '矛盾普遍性寓于特殊性之中'),
          QuizOption(key: 'B', content: '矛盾特殊性可以脱离普遍性独立存在'),
        ],
      ),
      correctAnswer: 'A',
      explanation: '矛盾的普遍性即矛盾的共性。',
      version: 1,
    );
  }

  @override
  Future<RedoResult> redoMistake(
    String id, {
    required String answer,
    required String attemptId,
  }) async {
    final isCorrect = answer == 'A';
    return RedoResult(
      isCorrect: isCorrect,
      correctAnswer: 'A',
      explanation: '矛盾的普遍性即矛盾的共性。',
      mistake: MistakeRecord(
        id: id,
        status: 'active',
        errorCount: isCorrect ? 3 : 4,
        consecutiveCorrect: isCorrect ? 1 : 0,
        lastWrongAt: isCorrect ? _hoursAgo(2) : _hoursAgo(0),
        createdAt: _hoursAgo(48),
        updatedAt: _hoursAgo(0),
      ),
      mastered: false,
      answeredAt: _hoursAgo(0),
    );
  }

  @override
  Future<MistakeDetail> updateStatus(
    String id, {
    required String status,
    required int version,
  }) async {
    return getMistake(id);
  }

  @override
  Future<void> deleteMistake(String id, {required int version}) async {}
}

class FakeSchoolsRepository implements SchoolsRepository {
  SchoolSummary _school(
    String id, {
    required String name,
    required String province,
    required bool isSelfMarking,
  }) {
    return SchoolSummary(
      id: id,
      name: name,
      province: province,
      region: '华东',
      is985: true,
      is211: true,
      isDoubleFirstClass: true,
      isSelfMarking: isSelfMarking,
      createdAt: _hoursAgo(24 * 30),
    );
  }

  @override
  Future<PagedResult<SchoolSummary>> listSchools({
    String? keyword,
    String? province,
    String? region,
    bool? is985,
    bool? is211,
    bool? isDoubleFirstClass,
    bool? isSelfMarking,
    String? majorCode,
    int page = 1,
    int pageSize = 20,
  }) async {
    final all = [
      _school('school-zju', name: '浙江大学', province: '浙江省', isSelfMarking: true),
      _school(
        'school-ecnu',
        name: '华东师范大学',
        province: '上海市',
        isSelfMarking: false,
      ),
    ];

    bool matchesTag(SchoolSummary s) {
      if (is985 == true && !s.is985) return false;
      if (is211 == true && !s.is211) return false;
      if (isDoubleFirstClass == true && !s.isDoubleFirstClass) return false;
      if (isSelfMarking == true && !s.isSelfMarking) return false;
      return true;
    }

    final filtered = all
        .where(
          (s) =>
              (keyword == null ||
                  keyword.isEmpty ||
                  s.name.contains(keyword)) &&
              matchesTag(s),
        )
        .toList();

    return PagedResult(items: filtered, total: filtered.length, totalPages: 1);
  }

  @override
  Future<SchoolDetail> getSchool(String id) => throw UnimplementedError();

  @override
  Future<PagedResult<SchoolProgram>> listPrograms(
    String schoolId, {
    String? majorCode,
    int? yearFrom,
    int? yearTo,
    int page = 1,
    int pageSize = 20,
  }) async {
    return PagedResult(
      items: schoolId == 'school-zju' ? _zjuPrograms : const [],
      total: schoolId == 'school-zju' ? _zjuPrograms.length : 0,
      totalPages: 1,
    );
  }

  @override
  Future<List<TargetSchoolRef>> getTargets() async => const [];

  @override
  Future<List<TargetSchoolRef>> addTarget(
    String schoolId, {
    required String type,
    String? majorCode,
    String? majorName,
  }) async {
    return [
      TargetSchoolRef(
        schoolId: schoolId,
        schoolName: schoolId == 'school-zju' ? '浙江大学' : '华东师范大学',
        type: type,
      ),
    ];
  }

  @override
  Future<List<TargetSchoolRef>> removeTarget(
    String schoolId, {
    required String type,
    String? majorCode,
  }) async => const [];
}

class FakeFlashcardsRepository implements FlashcardsRepository {
  Flashcard _card(String id, String front, String back) {
    return Flashcard(
      id: id,
      source: 'system',
      category: '英语大纲高频核心词',
      front: front,
      back: back,
      tags: const [],
      isMine: false,
      createdAt: _hoursAgo(48),
    );
  }

  DueCard _due(String id, String front, String back) {
    return DueCard(
      card: _card(id, front, back),
      progress: CardProgress(
        repetitions: 2,
        intervalDays: 3,
        easeFactor: 2.5,
        dueAt: _hoursAgo(1),
        lastRating: 'remembered',
      ),
    );
  }

  @override
  Future<DueList> listDue({int limit = 20}) async {
    return DueList(
      items: [
        _due('c-1', 'abandon', 'v. 放弃，遗弃；离弃'),
        _due('c-2', 'vulnerable', 'adj. 易受伤害的，脆弱的；有弱点的'),
        _due('c-3', 'arbitrary', 'adj. 任意的，专断的，随心所欲的'),
      ],
      dueRemaining: 3,
      serverTime: _hoursAgo(0),
    );
  }

  @override
  Future<ReviewResult> reviewCard(
    String id, {
    required String rating,
    required String idempotencyKey,
  }) async {
    return ReviewResult(
      progress: CardProgress(
        repetitions: 3,
        intervalDays: 7,
        easeFactor: 2.6,
        dueAt: _hoursAgo(-24 * 7),
        lastRating: rating,
      ),
      dueRemaining: 0,
      checkInDate: null,
    );
  }

  @override
  Future<PagedResult<Flashcard>> listCards({
    String? category,
    String? source,
    String? search,
    int page = 1,
    int pageSize = 20,
  }) async {
    return const PagedResult(items: [], total: 0, totalPages: 0);
  }

  @override
  Future<Flashcard> createCard({
    required String category,
    required String front,
    required String back,
    List<String> tags = const [],
  }) => throw UnimplementedError();

  @override
  Future<(List<CheckInRecord>, int)> listCheckIns({
    DateTime? from,
    DateTime? to,
    int page = 1,
    int pageSize = 20,
  }) async => (<CheckInRecord>[], 0);
}

List<Override> buildTestOverrides({DashboardSummary? dashboardSummary}) {
  return [
    authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
    authTokenStoreProvider.overrideWithValue(MemoryAuthTokenStore()),
    dashboardRepositoryProvider.overrideWithValue(
      FakeDashboardRepository(
        summary: dashboardSummary ?? DashboardSummary.mock,
      ),
    ),
    quizRepositoryProvider.overrideWithValue(FakeQuizRepository()),
    mistakesRepositoryProvider.overrideWithValue(FakeMistakesRepository()),
    schoolsRepositoryProvider.overrideWithValue(FakeSchoolsRepository()),
    flashcardsRepositoryProvider.overrideWithValue(FakeFlashcardsRepository()),
  ];
}
