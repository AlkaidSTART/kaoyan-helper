# Changed Files: Auth Mock Login & Route Interception

## 新建文件
- `lib/features/auth/domain/user_model.dart`: 考研用户领域实体模型。

## 修改文件
- `lib/features/auth/data/auth_repository.dart`: 扩展返回 `UserModel` 实例。
- `lib/features/auth/presentation/auth_notifier.dart`: 在 `AuthState` 中管理 `currentUser`，并支持快捷 Mock 登录。
- `lib/features/auth/presentation/widgets/auth_glass_card.dart`: 增加快捷 Mock 填入入口。
- `lib/ui/shell/widgets/top_app_bar.dart`: 动态展示当前用户院校目标及支持退出登录。
- `test/auth_login_test.dart`: 补充默认拦截与退出登录闭环测试。
