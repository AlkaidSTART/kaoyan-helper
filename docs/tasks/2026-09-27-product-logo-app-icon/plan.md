# 产品 Logo 与全平台应用图标替换 · 任务计划

## 1. 原始诉求

1. 用户上传「登科·考研助手」品牌 logo（1672x941 横版），要求作为产品封面，替换所有平台的默认 Flutter 应用图标。
2. 明确资产归属：
   - 旧的 `assets/logo.png`（1536x1024 自习室摄影图）是 **Flutter 应用登录页背景图**，改名 `backend_logo.png` 保留继续使用；
   - 新上传的登科 logo 才是 **产品 logo**，接管 `assets/logo.png` 命名。

## 2. 决策论证

| 决策点 | 方案 | 理由 |
| --- | --- | --- |
| 图标生成工具 | `flutter_launcher_icons` v0.14.4 | 一份配置覆盖 Android/iOS/Web/macOS/Windows，避免手工维护 30+ 尺寸文件 |
| 方形源图 | 原图 `scale=900:-1` 居中 + `#FDFDFC` 补边至 1024x1024 | 原 logo 为横版，直接拉伸会变形；底色取自原图左上角实际采样值，保证无接缝 |
| Android 自适应图标 | 独立 foreground 源图（logo 缩至 560px 宽，安全区约 66% 内容可见） | 横版 logo 直接做 foreground 会被圆形/圆角遮罩裁切文字 |
| iOS 无透明度 | `remove_alpha_ios: true` | App Store 强制要求 1024 图标无 alpha 通道 |
| 品牌色 | 底色 `#FDFDFC`、主红 `#F7342F`（logo 学位帽区域采样） | 同步更新 web manifest 的 background/theme color，清除默认 Flutter 蓝 |
| Linux 平台 | 暂不处理 | Flutter Linux 模板未包含图标资产（`linux/CMakeLists.txt` 无 icon 引用），flutter_launcher_icons 亦不支持；如需可后续单独接 GTK 窗口图标，遵循最小改动原则本次不动 |

### 已规避的工具副作用

`flutter_launcher_icons` 会把 `ios/Runner.xcodeproj/project.pbxproj` 中
`ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS` 从 `YES` 改写为 `AppIcon`，
该设置与图标无关且会破坏 Swift 资源符号生成，已通过 `git checkout` 回退；
图标本身由模板既有的 `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon` 生效，不受影响。

## 3. 落地步骤（已执行）

1. `git mv assets/logo.png assets/backend_logo.png`；新 logo 复制为 `assets/logo.png`。
2. `login_page.dart` 两处引用改为 `assets/backend_logo.png`（pubspec 的 `- assets/` 通配已覆盖，无需改清单）。
3. ffmpeg 生成图标源图：`assets/icon/app_icon.png`（1024 方形全 logo）、`assets/icon/adaptive_foreground.png`（安全区版本）；重生成 `web/favicon.png`（64px）。
4. 添加 dev 依赖并新建 `flutter_launcher_icons.yaml`，`dart run flutter_launcher_icons` 全平台生成。
5. 校验 `ASSETCATALOG_COMPILER_APPICON_NAME` 仍指向 AppIcon、iOS Contents.json 尺寸条目完整后，回退 pbxproj 无关改动。
6. 验证：`flutter analyze` 无问题；`flutter test` 43 例全部通过。

## 4. 范围说明

本任务为资产与构建配置变更，不涉及业务功能代码，故不建立 `docs/p0~p3` 阶段文档；按会话审计要求落盘本目录 `plan.md` 与 `changed-files.md`。
