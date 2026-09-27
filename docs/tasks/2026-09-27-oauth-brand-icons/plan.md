# 2026-09-27 · 第三方登录品牌图标升级

## 原始诉求
用户要求：使用专业的图标库替换掉 Flutter 第三方登录的图标。

## 决策论证
- 现状：`OAuthButtonRow` 三枚按钮为占位图标（文本 `G`、`Icons.terminal_rounded`、`Icons.chat_bubble_outline_rounded`），无品牌辨识度。
- 选型：`font_awesome_flutter ^11.0.0`（pub.dev 品牌图标事实标准、纯字体渲染、维护活跃），映射 `google` / `github` / `weixin` 三个 Brands 常量，保留品牌色。
- 备选否决：`material_design_icons_flutter` 包体过大且品牌/功能图标混用；本地 SVG 方案需手工维护资源，违反最小改动原则。

## 落地计划
1. 落盘 P0~P3 文档（`docs/p0~p3/{definition,design,development,verification}/auth-login/brand-icons-*.md`）。
2. pubspec.yaml 增加 `font_awesome_flutter: ^11.0.0`，`flutter pub get`。
3. 核对包内常量名后替换 `lib/features/auth/presentation/widgets/oauth_button_row.dart` 三处图标。
4. `flutter analyze` + `flutter test` 验证通过后汇报。
