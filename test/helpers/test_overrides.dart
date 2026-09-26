import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kaoyan_helper/core/network/auth_token_store.dart';
import 'package:kaoyan_helper/features/auth/data/auth_repository.dart';
import 'package:kaoyan_helper/features/dashboard/data/dashboard_repository.dart';
import 'package:kaoyan_helper/features/dashboard/domain/dashboard_summary.dart';
import 'package:kaoyan_helper/features/dashboard/presentation/dashboard_notifier.dart';

/// UI 测试统一 Override：
/// - 登录走 [FakeAuthRepository] 闭环，不发真实网络请求；
/// - 令牌存储走内存实现，避免依赖平台插件；
/// - 仪表盘仓储返回固定 Mock 聚合，隔离用户后端。
class FakeDashboardRepository implements DashboardRepository {
  final DashboardSummary summary;

  FakeDashboardRepository({this.summary = DashboardSummary.mock});

  @override
  Future<DashboardSummary> getSummary({String timezone = 'Asia/Shanghai'}) async {
    return summary;
  }
}

List<Override> buildTestOverrides({DashboardSummary? dashboardSummary}) {
  return [
    authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
    authTokenStoreProvider.overrideWithValue(MemoryAuthTokenStore()),
    dashboardRepositoryProvider.overrideWithValue(
      FakeDashboardRepository(summary: dashboardSummary ?? DashboardSummary.mock),
    ),
  ];
}
