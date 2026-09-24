class UserModel {
  final String id;
  final String nickname;
  final String targetSchool;
  final String targetMajor;
  final int daysUntilExam;

  const UserModel({
    required this.id,
    required this.nickname,
    required this.targetSchool,
    required this.targetMajor,
    required this.daysUntilExam,
  });

  static const mock = UserModel(
    id: 'mock-user-001',
    nickname: '登科研友',
    targetSchool: '浙江大学',
    targetMajor: '计算机 (085404)',
    daysUntilExam: 98,
  );
}
