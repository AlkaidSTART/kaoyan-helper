# 2026-09-27 · 登录面板切换动效完善

## 原始诉求
用户要求：完善登录注册面板相关动画，即切换的动效。

## 决策论证
- 现状：Tab 胶囊、验证码/密码表单、错误提示条三处均为 `setState` 瞬间硬切。
- 方案：胶囊滑动（AnimatedAlign 250ms）+ 表单淡入轻推（AnimatedSwitcher 220ms）+ 错误条平滑展开收起（AnimatedSize 220ms × 淡入淡出 180ms）；全部 ≤400ms 并采用物理自然曲线，符合守则第 5 条。
- 保持：轻颤反馈动效、业务逻辑、布局结构不动。

## 落地计划
1. 落盘 P0~P3 文档与本任务审计。
2. 修改 `lib/features/auth/presentation/widgets/auth_glass_card.dart` 三处切换实现。
3. `flutter analyze` + `flutter test` 验证通过后汇报。
