# P1 - 第三方登录品牌图标升级 · 设计

## 选型：font_awesome_flutter ^11.0.0

对比候选：

| 方案 | 结论 |
| --- | --- |
| `font_awesome_flutter` | ✅ pub.dev 品牌图标事实标准，维护活跃，纯字体渲染零资源管理，含全部所需品牌字形 |
| `material_design_icons_flutter` | 包体更大（MDI 全量字形），品牌图标与 Material 功能图标混用易混淆 |
| 本地 SVG + `flutter_svg` | 最忠实官方 Logo（如 Google 多彩 G），但需手工维护 3 个资源文件与授权说明，超出本次最小改动原则 |

## 图标映射设计

| 通道 | FontAwesome 常量 | 颜色 | 尺寸 |
| --- | --- | --- | --- |
| Google | `FontAwesomeIcons.google` | `Color(0xFF4285F4)` | 22 |
| GitHub | `FontAwesomeIcons.github` | `Color(0xFF24292E)` | 24 |
| 微信 | `FontAwesomeIcons.weixin` | `Color(0xFF07C160)` | 24 |

- 品牌图标（Brands 子集）笔画较 Material 图标细碎，统一放大至 22~24 以维持与旧 Material 图标近似的视觉重量。
- 按钮容器（44×44、圆角 12、描边 `#DFD5CA`、投影）与交互（Tooltip + InkWell）保持原样。

## 状态与接口
- `OAuthButtonRow` 为纯展示组件，无状态、无新增 Provider；仅替换 build 方法内图标常量。
- 依赖注入：pubspec.yaml 增加 `font_awesome_flutter: ^11.0.0`。
