import '../../../core/network/dio_client.dart';
import '../../shared/paged_result.dart';
import '../domain/school_models.dart';

/// 院校仓储（契约 SCH-01~05），仅已发布数据。
class SchoolsRepository {
  final DioClient _client;

  SchoolsRepository({required DioClient client}) : _client = client;

  /// `GET /schools`：组合筛选条件 AND。
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
    final result = await _client.get(
      '/schools',
      queryParameters: {
        if (keyword != null && keyword.isNotEmpty) 'keyword': keyword,
        'province': ?province,
        'region': ?region,
        'is985': ?is985,
        'is211': ?is211,
        'isDoubleFirstClass': ?isDoubleFirstClass,
        'isSelfMarking': ?isSelfMarking,
        'majorCode': ?majorCode,
        'page': page,
        'pageSize': pageSize,
      },
    );

    return PagedResult.fromResponse(
      data: result.data,
      itemsKey: 'items',
      pagination: result.pagination,
      map: SchoolSummary.fromJson,
    );
  }

  /// `GET /schools/:id`：不存在或下架返回 404。
  Future<SchoolDetail> getSchool(String id) async {
    final result = await _client.get('/schools/$id');
    return SchoolDetail.fromJson(result.data as Map<String, dynamic>);
  }

  /// `GET /schools/:id/programs`：专业历年数据，按 year DESC。
  Future<PagedResult<SchoolProgram>> listPrograms(
    String schoolId, {
    String? majorCode,
    int? yearFrom,
    int? yearTo,
    int page = 1,
    int pageSize = 20,
  }) async {
    final result = await _client.get(
      '/schools/$schoolId/programs',
      queryParameters: {
        'majorCode': ?majorCode,
        'yearFrom': ?yearFrom,
        'yearTo': ?yearTo,
        'page': page,
        'pageSize': pageSize,
      },
    );

    return PagedResult.fromResponse(
      data: result.data,
      itemsKey: 'items',
      pagination: result.pagination,
      map: SchoolProgram.fromJson,
    );
  }

  /// `POST /schools/:id/target`：加入目标；重复添加幂等返回现有条目。
  Future<List<TargetSchoolRef>> addTarget(
    String schoolId, {
    required String type,
    String? majorCode,
    String? majorName,
  }) async {
    final result = await _client.post(
      '/schools/$schoolId/target',
      body: {'type': type, 'majorCode': ?majorCode, 'majorName': ?majorName},
    );
    return _targetsFrom(result.data);
  }

  /// `DELETE /schools/:id/target`：移除目标；不存在时幂等。
  Future<List<TargetSchoolRef>> removeTarget(
    String schoolId, {
    required String type,
    String? majorCode,
  }) async {
    final result = await _client.delete(
      '/schools/$schoolId/target',
      body: {'type': type, 'majorCode': ?majorCode},
    );
    return _targetsFrom(result.data);
  }

  List<TargetSchoolRef> _targetsFrom(dynamic data) {
    final list = data is Map<String, dynamic> ? data['targets'] : null;

    if (list is! List) {
      return const [];
    }

    return list
        .whereType<Map<String, dynamic>>()
        .map(
          (target) => TargetSchoolRef(
            schoolId: target['schoolId'] as String? ?? '',
            schoolName: target['schoolName'] as String? ?? '',
            type: target['type'] as String? ?? 'backup',
            majorCode: target['majorCode'] as String?,
            majorName: target['majorName'] as String?,
          ),
        )
        .toList(growable: false);
  }
}

/// 目标院校引用（与 me 模块 TargetSchool 同构，此处仅承载返回快照）。
class TargetSchoolRef {
  final String schoolId;
  final String schoolName;
  final String type;
  final String? majorCode;
  final String? majorName;

  const TargetSchoolRef({
    required this.schoolId,
    required this.schoolName,
    required this.type,
    this.majorCode,
    this.majorName,
  });
}
