/// 院校模块领域模型（契约 SCH-01~05）。
class SchoolSummary {
  final String id;
  final String name;
  final String? province;
  final String? region;
  final bool is985;
  final bool is211;
  final bool isDoubleFirstClass;
  final bool isSelfMarking;
  final DateTime createdAt;

  const SchoolSummary({
    required this.id,
    required this.name,
    this.province,
    this.region,
    required this.is985,
    required this.is211,
    required this.isDoubleFirstClass,
    required this.isSelfMarking,
    required this.createdAt,
  });

  factory SchoolSummary.fromJson(Map<String, dynamic> json) {
    return SchoolSummary(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      province: json['province'] as String?,
      region: json['region'] as String?,
      is985: json['is985'] as bool? ?? false,
      is211: json['is211'] as bool? ?? false,
      isDoubleFirstClass: json['isDoubleFirstClass'] as bool? ?? false,
      isSelfMarking: json['isSelfMarking'] as bool? ?? false,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// 院校详情：含可用专业摘要（SCH-02）。
class SchoolDetail extends SchoolSummary {
  final List<SchoolMajor> majors;

  const SchoolDetail({
    required super.id,
    required super.name,
    super.province,
    super.region,
    required super.is985,
    required super.is211,
    required super.isDoubleFirstClass,
    required super.isSelfMarking,
    required super.createdAt,
    required this.majors,
  });

  factory SchoolDetail.fromJson(Map<String, dynamic> json) {
    final base = SchoolSummary.fromJson(json);
    final majors = json['majors'];

    return SchoolDetail(
      id: base.id,
      name: base.name,
      province: base.province,
      region: base.region,
      is985: base.is985,
      is211: base.is211,
      isDoubleFirstClass: base.isDoubleFirstClass,
      isSelfMarking: base.isSelfMarking,
      createdAt: base.createdAt,
      majors: majors is List
          ? majors
                .whereType<Map<String, dynamic>>()
                .map(
                  (major) => SchoolMajor(
                    majorCode: major['majorCode'] as String? ?? '',
                    majorName: major['majorName'] as String? ?? '',
                  ),
                )
                .toList(growable: false)
          : const [],
    );
  }
}

class SchoolMajor {
  final String majorCode;
  final String majorName;

  const SchoolMajor({required this.majorCode, required this.majorName});
}

/// 专业历年招生数据（SCH-03，按 year DESC 排序）。
class SchoolProgram {
  final String id;
  final String schoolId;
  final String majorCode;
  final String majorName;
  final int year;
  final String? studyMode;
  final int? planEnrollment;
  final int? minScore;
  final int? avgScore;

  const SchoolProgram({
    required this.id,
    required this.schoolId,
    required this.majorCode,
    required this.majorName,
    required this.year,
    this.studyMode,
    this.planEnrollment,
    this.minScore,
    this.avgScore,
  });

  factory SchoolProgram.fromJson(Map<String, dynamic> json) {
    return SchoolProgram(
      id: json['id'] as String? ?? '',
      schoolId: json['schoolId'] as String? ?? '',
      majorCode: json['majorCode'] as String? ?? '',
      majorName: json['majorName'] as String? ?? '',
      year: (json['year'] as num?)?.toInt() ?? 0,
      studyMode: json['studyMode'] as String?,
      planEnrollment: (json['planEnrollment'] as num?)?.toInt(),
      minScore: (json['minScore'] as num?)?.toInt(),
      avgScore: (json['avgScore'] as num?)?.toInt(),
    );
  }
}
