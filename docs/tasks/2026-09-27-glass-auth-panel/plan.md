# 2026-09-27 · 登录面板通透玻璃质感

## 原始诉求
用户要求：Flutter 项目的登录注册面板做成那种透明的感觉。

## 决策论证
- 现状：`AuthGlassCard` 填充为 80% 不透明暖白（`0xCCFFFDF9`），BackdropFilter 名存实亡，背景照片被遮死。
- 方案：Glassmorphism 标准配方——填充降至 22%~44% 暖白渐变 + 模糊增强至 sigma 20 + 背景饱和度 ×1.2 + 白色半透明边框；面板内部 Tab 栏、输入框、第三方按钮、分隔线同步半透明化。
- 保留：错误提示条实色（可读性）、布局与文字色板、全部交互行为。

## 落地计划
1. 落盘 P0~P3 文档（`docs/p0~p3/*/auth-login/transparent-glass-panel-*.md`）。
2. 修改 `lib/features/auth/presentation/widgets/auth_glass_card.dart` 与 `oauth_button_row.dart` 视觉样式。
3. `flutter analyze` + `flutter test` 验证通过后汇报。
