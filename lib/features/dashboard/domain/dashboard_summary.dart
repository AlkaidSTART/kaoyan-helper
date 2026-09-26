/// 仪表盘聚合数据（契约 DASH-01，服务端聚合、仅本人数据）。
class DashboardSummary {
  final int? daysUntilExam;
  final int todayQuestionCount;
  final int activeMistakeCount;
  final int dueCardCount;
  final int streakDays;
  final int totalReviewedCards;
  final PrimaryTarget? primaryTarget;

  const DashboardSummary({
    this.daysUntilExam,
    required this.todayQuestionCount,
    required this.activeMistakeCount,
    required this.dueCardCount,
    required this.streakDays,
    required this.totalReviewedCards,
    this.primaryTarget,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    final target = json['primaryTarget'];

    return DashboardSummary(
      daysUntilExam: (json['daysUntilExam'] as num?)?.toInt(),
      todayQuestionCount: (json['todayQuestionCount'] as num?)?.toInt() ?? 0,
      activeMistakeCount: (json['activeMistakeCount'] as num?)?.toInt() ?? 0,
      dueCardCount: (json['dueCardCount'] as num?)?.toInt() ?? 0,
      streakDays: (json['streakDays'] as num?)?.toInt() ?? 0,
      totalReviewedCards: (json['totalReviewedCards'] as num?)?.toInt() ?? 0,
      primaryTarget: target is Map<String, dynamic> ? PrimaryTarget.fromJson(target) : null,
    );
  }

  /// 供测试与空态预览使用。
  static const mock = DashboardSummary(
    daysUntilExam: 98,
    todayQuestionCount: 32,
    activeMistakeCount: 5,
    dueCardCount: 24,
    streakDays: 12,
    totalReviewedCards: 316,
    primaryTarget: PrimaryTarget(
      schoolId: 'mock-school-001',
      schoolName: '浙江大学',
      majorCode: '085404',
      majorName: '计算机技术',
    ),
  );
}

/// 主目标院校摘要。
class PrimaryTarget {
  final String schoolId;
  final String schoolName;
  final String? majorCode;
  final String? majorName;

  const PrimaryTarget({
    required this.schoolId,
    required this.schoolName,
    this.majorCode,
    this.majorName,
  });

  factory PrimaryTarget.fromJson(Map<String, dynamic> json) {
    return PrimaryTarget(
      schoolId: json['schoolId'] as String? ?? '',
      schoolName: json['schoolName'] as String? ?? '',
      majorCode: json['majorCode'] as String?,
      majorName: json['majorName'] as String?,
    );
  }
}
