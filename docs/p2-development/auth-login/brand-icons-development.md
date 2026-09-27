# P2 - 第三方登录品牌图标升级 · 开发

## 原子 Todo List
- [x] 落盘 P0~P3 文档与任务审计文档。
- [x] `pubspec.yaml` 新增 `font_awesome_flutter: ^11.0.0` 并执行 `flutter pub get`。
- [x] 核对包内常量名（google / github / weixin）后替换 `oauth_button_row.dart` 三处图标。
- [x] 执行并通过 `flutter analyze`。
- [x] 执行并通过 `flutter test`。

## 技术决策 (ADR)
- **ADR-004**: 品牌图标统一采用 `font_awesome_flutter`（Brands 子集）字体渲染，不引入本地 SVG 资源——多端一致、无资源授权与分辨率管理成本，符合最小改动原则。
- **ADR-005**: 品牌图标尺寸由 20~22 上调至 22~24：FontAwesome Brands 字形笔画密度低于 Material 圆角图标，同尺寸下视觉重量偏轻，放大 2~4px 使三枚按钮观感均衡。

## 实际问题记录
- FontAwesome 11.x（对应上游 FA7）常量命名与旧版可能存在差异，落地前以本地包缓存源码 grep 核对 `google`、`github`、`weixin` 三个常量确实存在后再编码。
