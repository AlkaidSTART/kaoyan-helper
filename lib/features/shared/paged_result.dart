import '../../core/network/api_envelope.dart';

/// 通用分页结果：列表主体 + envelope `meta.pagination`。
class PagedResult<T> {
  final List<T> items;
  final int page;
  final int pageSize;
  final int total;
  final int totalPages;

  const PagedResult({
    required this.items,
    this.page = 1,
    this.pageSize = 20,
    this.total = 0,
    this.totalPages = 0,
  });

  factory PagedResult.fromResponse({
    required dynamic data,
    required String itemsKey,
    required T Function(Map<String, dynamic>) map,
    ApiPagination? pagination,
  }) {
    final list = data is Map<String, dynamic> ? data[itemsKey] : null;
    final items = list is List
        ? list.whereType<Map<String, dynamic>>().map(map).toList()
        : <T>[];

    return PagedResult<T>(
      items: items,
      page: pagination?.page ?? 1,
      pageSize: pagination?.pageSize ?? 20,
      total: pagination?.total ?? items.length,
      totalPages: pagination?.totalPages ?? 1,
    );
  }
}
