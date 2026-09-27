# P0 - 第三方登录品牌图标升级 · 定义

## 问题
登录页 `OAuthButtonRow` 的三个第三方登录按钮当前均为占位实现，不具备品牌辨识度：

| 通道 | 现状 | 问题 |
| --- | --- | --- |
| Google | 纯文本 `Text('G')` | 非官方字形，与真实 Google Logo 观感差异大 |
| GitHub | `Icons.terminal_rounded` | Material 通用图标，与 GitHub 品牌无关 |
| 微信 | `Icons.chat_bubble_outline_rounded` | 普通对话气泡，与微信品牌无关 |

## 目标
- 使用专业品牌图标库提供 Google / GitHub / 微信三个通道的官方字形图标。
- 保持现有按钮尺寸 (44×44)、圆角 (12)、描边与投影样式不变，仅替换图标本体。

## 范围边界
- 仅替换 `oauth_button_row.dart` 内的图标渲染；不改登录逻辑、不加新登录通道。
- 不引入本地 SVG/PNG 资源，统一由图标库字体渲染（多端一致、无资源管理成本）。

## 验收指标
1. `flutter pub get` 成功引入品牌图标库。
2. `flutter analyze` 零 warning / zero error。
3. `flutter test` 全部通过。
4. 三个按钮图标为对应品牌官方字形，颜色保留品牌色（Google 蓝 #4285F4 / GitHub 黑 #24292E / 微信绿 #07C160）。
