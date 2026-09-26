import '../../../core/network/dio_client.dart';
import '../domain/dashboard_summary.dart';

/// 仪表盘聚合仓储（契约 DASH-01）。
class DashboardRepository {
  final DioClient _client;

  DashboardRepository({required DioClient client}) : _client = client;

  /// `GET /dashboard/summary`：时区默认 Asia/Shanghai，非法时区 422 VALIDATION_FAILED。
  Future<DashboardSummary> getSummary({
    String timezone = 'Asia/Shanghai',
  }) async {
    final result = await _client.get(
      '/dashboard/summary',
      queryParameters: {'timezone': timezone},
    );
    return DashboardSummary.fromJson(result.data as Map<String, dynamic>);
  }
}
