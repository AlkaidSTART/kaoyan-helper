import '../../../core/network/dio_client.dart';
import '../domain/me_models.dart';

/// 个人档案与目标院校仓储（契约 ME-01~04）。
class MeRepository {
  final DioClient _client;

  MeRepository({required DioClient client}) : _client = client;

  /// `GET /me`：用户对象 + 目标摘要。
  Future<MeProfile> getMe() async {
    final result = await _client.get('/me');
    return MeProfile.fromJson(result.data as Map<String, dynamic>);
  }

  /// `PATCH /me`：仅可改 nickname / avatarUrl / examYear。
  Future<MeProfile> updateProfile({
    String? nickname,
    String? avatarUrl,
    int? examYear,
  }) async {
    final result = await _client.patch(
      '/me',
      body: {
        if (nickname != null) 'nickname': nickname,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
        if (examYear != null) 'examYear': examYear,
      },
    );
    return MeProfile.fromJson(result.data as Map<String, dynamic>);
  }

  /// `GET /me/targets`：目标院校列表（最多 3 条且仅 1 条 primary）。
  Future<List<TargetSchool>> getTargets() async {
    final result = await _client.get('/me/targets');
    final data = result.data as Map<String, dynamic>;
    final list = data['targets'];

    if (list is! List) {
      return const [];
    }

    return list
        .whereType<Map<String, dynamic>>()
        .map(TargetSchool.fromJson)
        .toList(growable: false);
  }

  /// `PATCH /me/targets`：事务内整体替换目标列表。
  Future<List<TargetSchool>> updateTargets(List<TargetSchool> targets) async {
    final result = await _client.patch(
      '/me/targets',
      body: {
        'targets': [
          for (final target in targets)
            {
              'schoolId': target.schoolId,
              'type': target.type,
              if (target.majorCode != null) 'majorCode': target.majorCode,
              if (target.majorName != null) 'majorName': target.majorName,
            },
        ],
      },
    );

    final data = result.data as Map<String, dynamic>;
    final list = data['targets'];

    if (list is! List) {
      return const [];
    }

    return list
        .whereType<Map<String, dynamic>>()
        .map(TargetSchool.fromJson)
        .toList(growable: false);
  }
}
