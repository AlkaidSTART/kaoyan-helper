/// 错题模块领域模型（契约 MIS-01~05）。
///
/// 状态机（服务端维护）：active --连对2次--> mastered --重新激活--> active。
class MistakeQuestionSummary {
  final String id;
  final String subject;
  final String? chapter;
  final String type;
  final String stem;
  final List<QuizOption> options;

  const MistakeQuestionSummary({
    required this.id,
    required this.subject,
    this.chapter,
    required this.type,
    required this.stem,
    required this.options,
  });

  factory MistakeQuestionSummary.fromJson(Map<String, dynamic> json) {
    final options = json['options'];

    return MistakeQuestionSummary(
      id: json['id'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      chapter: json['chapter'] as String?,
      type: json['type'] as String? ?? 'single_choice',
      stem: json['stem'] as String? ?? '',
      options: options is List
          ? options
                .whereType<Map<String, dynamic>>()
                .map(
                  (option) => QuizOption(
                    key: option['key'] as String? ?? '',
                    content: option['content'] as String? ?? '',
                  ),
                )
                .toList(growable: false)
          : const [],
    );
  }
}

/// 与 quiz 模块选项结构同构；独立命名避免跨模块耦合。
class QuizOption {
  final String key;
  final String content;

  const QuizOption({required this.key, required this.content});
}

class MistakeRecord {
  final String id;
  final String status; // active | mastered
  final int errorCount;
  final int consecutiveCorrect;
  final DateTime lastWrongAt;
  final DateTime? masteredAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final MistakeQuestionSummary? question;

  const MistakeRecord({
    required this.id,
    required this.status,
    required this.errorCount,
    required this.consecutiveCorrect,
    required this.lastWrongAt,
    this.masteredAt,
    required this.createdAt,
    required this.updatedAt,
    this.question,
  });

  factory MistakeRecord.fromJson(Map<String, dynamic> json) {
    final question = json['question'];

    return MistakeRecord(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      errorCount: (json['errorCount'] as num?)?.toInt() ?? 0,
      consecutiveCorrect: (json['consecutiveCorrect'] as num?)?.toInt() ?? 0,
      lastWrongAt:
          DateTime.tryParse(json['lastWrongAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      masteredAt: json['masteredAt'] is String
          ? DateTime.tryParse(json['masteredAt'] as String)
          : null,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      question: question is Map<String, dynamic>
          ? MistakeQuestionSummary.fromJson(question)
          : null,
    );
  }
}

/// 错题详情：本人可读解析与正确答案（MIS-02）。
class MistakeDetail extends MistakeRecord {
  final String? correctAnswer;
  final String? explanation;
  final int version;

  const MistakeDetail({
    required super.id,
    required super.status,
    required super.errorCount,
    required super.consecutiveCorrect,
    required super.lastWrongAt,
    super.masteredAt,
    required super.createdAt,
    required super.updatedAt,
    super.question,
    this.correctAnswer,
    this.explanation,
    required this.version,
  });

  factory MistakeDetail.fromJson(Map<String, dynamic> json) {
    final base = MistakeRecord.fromJson(json);

    return MistakeDetail(
      id: base.id,
      status: base.status,
      errorCount: base.errorCount,
      consecutiveCorrect: base.consecutiveCorrect,
      lastWrongAt: base.lastWrongAt,
      masteredAt: base.masteredAt,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      question: base.question,
      correctAnswer: json['correctAnswer'] as String?,
      explanation: json['explanation'] as String?,
      version: (json['version'] as num?)?.toInt() ?? 0,
    );
  }
}

/// 重做结果（MIS-03，服务端判题并更新连对状态）。
class RedoResult {
  final bool isCorrect;
  final String correctAnswer;
  final String? explanation;
  final MistakeRecord mistake;
  final bool mastered;
  final DateTime answeredAt;

  const RedoResult({
    required this.isCorrect,
    required this.correctAnswer,
    this.explanation,
    required this.mistake,
    required this.mastered,
    required this.answeredAt,
  });

  factory RedoResult.fromJson(Map<String, dynamic> json) {
    final mistake = json['mistake'];

    return RedoResult(
      isCorrect: json['isCorrect'] as bool? ?? false,
      correctAnswer: json['correctAnswer'] as String? ?? '',
      explanation: json['explanation'] as String?,
      mistake: mistake is Map<String, dynamic>
          ? MistakeRecord.fromJson(mistake)
          : throw const FormatException('redo 响应缺少 mistake'),
      mastered: json['mastered'] as bool? ?? false,
      answeredAt:
          DateTime.tryParse(json['answeredAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}
