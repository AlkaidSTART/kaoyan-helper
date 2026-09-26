/// 刷题模块领域模型（契约 QUIZ-01~06）。
class QuestionOption {
  final String key;
  final String content;

  const QuestionOption({required this.key, required this.content});

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      key: json['key'] as String? ?? '',
      content: json['content'] as String? ?? '',
    );
  }
}

/// 题目摘要：不含答案与解析。
class QuestionSummary {
  final String id;
  final String subject;
  final String? chapter;
  final int? year;
  final String type;
  final String stem;
  final List<QuestionOption> options;
  final String? difficulty;
  final String source;
  final bool isPublic;
  final bool isApproved;
  final String reviewStatus;
  final bool isMine;
  final DateTime createdAt;

  const QuestionSummary({
    required this.id,
    required this.subject,
    this.chapter,
    this.year,
    required this.type,
    required this.stem,
    required this.options,
    this.difficulty,
    required this.source,
    required this.isPublic,
    required this.isApproved,
    required this.reviewStatus,
    required this.isMine,
    required this.createdAt,
  });

  factory QuestionSummary.fromJson(Map<String, dynamic> json) {
    final options = json['options'];

    return QuestionSummary(
      id: json['id'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      chapter: json['chapter'] as String?,
      year: (json['year'] as num?)?.toInt(),
      type: json['type'] as String? ?? 'single_choice',
      stem: json['stem'] as String? ?? '',
      options: options is List
          ? options
                .whereType<Map<String, dynamic>>()
                .map(QuestionOption.fromJson)
                .toList(growable: false)
          : const [],
      difficulty: json['difficulty'] as String?,
      source: json['source'] as String? ?? 'official',
      isPublic: json['isPublic'] as bool? ?? false,
      isApproved: json['isApproved'] as bool? ?? false,
      reviewStatus: json['reviewStatus'] as String? ?? 'approved',
      isMine: json['isMine'] as bool? ?? false,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// 题目详情：仅创建者可读答案与解析（QUIZ-02）。
class QuestionDetail extends QuestionSummary {
  final String? explanation;
  final String? answer;
  final int version;

  const QuestionDetail({
    required super.id,
    required super.subject,
    super.chapter,
    super.year,
    required super.type,
    required super.stem,
    required super.options,
    super.difficulty,
    required super.source,
    required super.isPublic,
    required super.isApproved,
    required super.reviewStatus,
    required super.isMine,
    required super.createdAt,
    this.explanation,
    this.answer,
    required this.version,
  });

  factory QuestionDetail.fromJson(Map<String, dynamic> json) {
    final base = QuestionSummary.fromJson(json);

    return QuestionDetail(
      id: base.id,
      subject: base.subject,
      chapter: base.chapter,
      year: base.year,
      type: base.type,
      stem: base.stem,
      options: base.options,
      difficulty: base.difficulty,
      source: base.source,
      isPublic: base.isPublic,
      isApproved: base.isApproved,
      reviewStatus: base.reviewStatus,
      isMine: base.isMine,
      createdAt: base.createdAt,
      explanation: json['explanation'] as String?,
      answer: json['answer'] as String?,
      version: (json['version'] as num?)?.toInt() ?? 0,
    );
  }
}

/// 提交答案结果（QUIZ-03，服务端判题）。
class AnswerResult {
  final bool isCorrect;
  final String correctAnswer;
  final String? explanation;
  final bool mistakeCreated;
  final DateTime answeredAt;

  const AnswerResult({
    required this.isCorrect,
    required this.correctAnswer,
    this.explanation,
    required this.mistakeCreated,
    required this.answeredAt,
  });

  factory AnswerResult.fromJson(Map<String, dynamic> json) {
    return AnswerResult(
      isCorrect: json['isCorrect'] as bool? ?? false,
      correctAnswer: json['correctAnswer'] as String? ?? '',
      explanation: json['explanation'] as String?,
      mistakeCreated: json['mistake'] is Map<String, dynamic>,
      answeredAt:
          DateTime.tryParse(json['answeredAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}
