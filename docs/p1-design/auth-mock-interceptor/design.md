# P1 - 登录拦截与 Mock 登录设计

## 1. 领域模型设计
```dart
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
}
```

## 2. 接口与状态契约 (Riverpod)
- `AuthRepository`:
  - `Future<UserModel> loginWithCode(String target, String code)`
  - `Future<UserModel> loginWithPassword(String target, String password)`
- `AuthState`:
  - `final bool isAuthenticated;`
  - `final bool isLoading;`
  - `final UserModel? currentUser;`
  - `final String? errorMessage;`

## 3. UI 交互设计
- `AuthGlassCard`:
  - 顶部副标题旁增加“快捷填入测试账号”浅色 Chip / TextButton，点击即预填 `13800000000` / `123456` 并自动勾选协议。
- `ShellTopAppBar`:
  - 头像点击弹出 `PopupMenuButton`，提供“个人设置”与“退出登录”。
  - 退出登录时调用 `ref.read(authNotifierProvider.notifier).logout()`。
