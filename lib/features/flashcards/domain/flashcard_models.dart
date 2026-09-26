/// 闪卡与打卡模块领域模型（契约 FC-01~05）。
class Flashcard {
  final String id;
  final String source;
  final String category;
  final String front;
  final String back;
  final List<String> tags;
  final bool isMine;
  final DateTime createdAt;

  const Flashcard({
    required this.id,
    required this.source,
    required this.category,
    required this.front,
    required this.back,
    required this.tags,
    required this.isMine,
    required this.createdAt,
  });

  factory Flashcard.fromJson(Map<String, dynamic> json) {
    final tags = json['tags'];

    return Flashcard(
      id: json['id'] as String? ?? '',
      source: json['source'] as String? ?? 'system',
      category: json['category'] as String? ?? '',
      front: json['front'] as String? ?? '',
      back: json['back'] as String? ?? '',
      tags: tags is List ? tags.whereType<String>().toList(growable: false) : const [],
      isMine: json['isMine'] as bool? ?? false,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// SM-2 复习进度（服务端计算，客户端不参与）。
class CardProgress {
  final int repetitions;
  final int intervalDays;
  final double easeFactor;
  final DateTime dueAt;
  final String? lastRating;

  const CardProgress({
    required this.repetitions,
    required this.intervalDays,
    required this.easeFactor,
    required this.dueAt,
    this.lastRating,
  });

  factory CardProgress.fromJson(Map<String, dynamic> json) {
    return CardProgress(
      repetitions: (json['repetitions'] as num?)?.toInt() ?? 0,
      intervalDays: (json['intervalDays'] as num?)?.toInt() ?? 0,
      easeFactor: (json['easeFactor'] as num?)?.toDouble() ?? 2.5,
      dueAt:
          DateTime.tryParse(json['dueAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      lastRating: json['lastRating'] as String?,
    );
  }
}

/// 到期卡片条目：卡片 + 可空进度（从未复习时为 null）。
class DueCard {
  final Flashcard card;
  final CardProgress? progress;

  const DueCard({required this.card, this.progress});

  factory DueCard.fromJson(Map<String, dynamic> json) {
    final card = json['card'];
    final progress = json['progress'];

    return DueCard(
      card: card is Map<String, dynamic>
          ? Flashcard.fromJson(card)
          : throw const FormatException('due 条目缺少 card'),
      progress: progress is Map<String, dynamic> ? CardProgress.fromJson(progress) : null,
    );
  }
}

/// `GET /flashcards/due` 响应。
class DueList {
  final List<DueCard> items;
  final int dueRemaining;
  final DateTime serverTime;

  const DueList({
    required this.items,
    required this.dueRemaining,
    required this.serverTime,
  });

  factory DueList.fromJson(Map<String, dynamic> json) {
    final items = json['items'];

    return DueList(
      items: items is List
          ? items
                .whereType<Map<String, dynamic>>()
                .map(DueCard.fromJson)
                .toList(growable: false)
          : const [],
      dueRemaining: (json['dueRemaining'] as num?)?.toInt() ?? 0,
      serverTime:
          DateTime.tryParse(json['serverTime'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// `POST /flashcards/:id/review` 响应：复习即打卡，完成当日到期卡片时 checkIn 非空。
class ReviewResult {
  final CardProgress progress;
  final int dueRemaining;
  final DateTime? checkInDate;

  const ReviewResult({
    required this.progress,
    required this.dueRemaining,
    this.checkInDate,
  });

  factory ReviewResult.fromJson(Map<String, dynamic> json) {
    final progress = json['progress'];
    final checkIn = json['checkIn'];

    return ReviewResult(
      progress: progress is Map<String, dynamic>
          ? CardProgress.fromJson(progress)
          : throw const FormatException('review 响应缺少 progress'),
      dueRemaining: (json['dueRemaining'] as num?)?.toInt() ?? 0,
      checkInDate: checkIn is Map<String, dynamic>
          ? DateTime.tryParse(checkIn['checkInDate'] as String? ?? '')
          : null,
    );
  }
}

/// `GET /check-ins` 打卡记录。
class CheckInRecord {
  final DateTime checkInDate;
  final DateTime createdAt;

  const CheckInRecord({required this.checkInDate, required this.createdAt});

  factory CheckInRecord.fromJson(Map<String, dynamic> json) {
    return CheckInRecord(
      checkInDate:
          DateTime.tryParse(json['checkInDate'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}
