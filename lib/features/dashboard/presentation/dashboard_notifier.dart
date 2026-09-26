import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../../auth/presentation/auth_notifier.dart';
import '../data/dashboard_repository.dart';
import '../domain/dashboard_summary.dart';

/// 仪表盘聚合状态：未登录返回 null（UI 显示 `--` 占位），登录后自动拉取。
/// 加载失败向上抛出 `AppException`，由视图层决定展示，不弹全局错误。
class DashboardSummaryNotifier extends AsyncNotifier<DashboardSummary?> {
  @override
  Future<DashboardSummary?> build() async {
    final isAuthenticated = ref.watch(
      authNotifierProvider.select((state) => state.isAuthenticated),
    );

    if (!isAuthenticated) {
      return null;
    }

    final repository = ref.watch(dashboardRepositoryProvider);
    return repository.getSummary();
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(client: ref.watch(dioClientProvider));
});

final dashboardSummaryProvider =
    AsyncNotifierProvider<DashboardSummaryNotifier, DashboardSummary?>(
      DashboardSummaryNotifier.new,
    );
