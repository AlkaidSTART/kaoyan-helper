class UserModel {
  final String id;
  final String nickname;

  /// 目标院校信息由后端 `GET /me` / `GET /dashboard/summary` 下发，登录响应不含。
  final String? targetSchool;
  final String? targetMajor;
  final int? daysUntilExam;

  const UserModel({
    required this.id,
    required this.nickname,
    this.targetSchool,
    this.targetMajor,
    this.daysUntilExam,
  });

  static const mock = UserModel(
    id: 'mock-user-001',
    nickname: '登科研友',
    targetSchool: '浙江大学',
    targetMajor: '计算机 (085404)',
    daysUntilExam: 98,
  );
}
