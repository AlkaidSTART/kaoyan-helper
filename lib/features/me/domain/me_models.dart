/// 目标院校（契约 ME-03/04，服务端返回院校快照，不信任客户端缓存校名）。
class TargetSchool {
  final String schoolId;
  final String schoolName;
  final String type; // primary | backup
  final String? majorCode;
  final String? majorName;
  final DateTime updatedAt;

  const TargetSchool({
    required this.schoolId,
    required this.schoolName,
    required this.type,
    this.majorCode,
    this.majorName,
    required this.updatedAt,
  });

  factory TargetSchool.fromJson(Map<String, dynamic> json) {
    return TargetSchool(
      schoolId: json['schoolId'] as String,
      schoolName: json['schoolName'] as String,
      type: json['type'] as String? ?? 'backup',
      majorCode: json['majorCode'] as String?,
      majorName: json['majorName'] as String?,
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// `GET /me` 个人档案（契约 ME-01）。
class MeProfile {
  final String id;
  final String email;
  final String? nickname;
  final String? avatarUrl;
  final String role;
  final bool isBanned;
  final int? examYear;
  final List<TargetSchool> targets;

  const MeProfile({
    required this.id,
    required this.email,
    this.nickname,
    this.avatarUrl,
    required this.role,
    required this.isBanned,
    this.examYear,
    required this.targets,
  });

  factory MeProfile.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? const {};
    final targets = json['targets'];

    return MeProfile(
      id: user['id'] as String? ?? '',
      email: user['email'] as String? ?? '',
      nickname: user['nickname'] as String?,
      avatarUrl: user['avatarUrl'] as String?,
      role: user['role'] as String? ?? 'user',
      isBanned: user['isBanned'] as bool? ?? false,
      examYear: (user['examYear'] as num?)?.toInt(),
      targets: targets is List
          ? targets
                .whereType<Map<String, dynamic>>()
                .map(TargetSchool.fromJson)
                .toList(growable: false)
          : const [],
    );
  }
}
