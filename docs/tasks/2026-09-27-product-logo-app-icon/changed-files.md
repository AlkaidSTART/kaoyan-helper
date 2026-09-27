# 变更文件清单 · 产品 Logo 与全平台应用图标替换

## 新建

| 文件 | 说明 |
| --- | --- |
| `assets/logo.png` | 产品 logo 原图（登科·考研助手，1672x941） |
| `assets/icon/app_icon.png` | 1024x1024 方形图标源图（全 logo 居中，`#FDFDFC` 补边） |
| `assets/icon/adaptive_foreground.png` | Android 自适应图标前景源图（内容缩至安全区） |
| `flutter_launcher_icons.yaml` | 全平台图标生成配置（品牌色 `#F7342F` / `#FDFDFC`） |
| `android/app/src/main/res/mipmap-anydpi-v26/` | Android 8.0+ 自适应图标定义（ic_launcher.xml） |
| `android/app/src/main/res/drawable-*dpi/` | 自适应图标前景各密度资源 |
| `android/app/src/main/res/values/colors.xml` | 自适应图标背景色 `#FDFDFC` |
| `ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-{50x50,57x57,72x72}@*.png` | 生成工具补齐的遗留尺寸（Contents.json 中有引用） |
| `docs/tasks/2026-09-27-product-logo-app-icon/plan.md` | 任务计划与决策记录 |
| `docs/tasks/2026-09-27-product-logo-app-icon/changed-files.md` | 本清单 |

## 重命名

| 原文件 | 新文件 | 说明 |
| --- | --- | --- |
| `assets/logo.png` | `assets/backend_logo.png` | 原自习室摄影图保留为登录页背景图 |

## 修改

| 文件 | 说明 |
| --- | --- |
| `lib/features/auth/presentation/login_page.dart` | 两处背景图引用改为 `assets/backend_logo.png` |
| `pubspec.yaml` | dev_dependencies 新增 `flutter_launcher_icons: ^0.14.4` |
| `pubspec.lock` | 随依赖更新 |
| `web/favicon.png` | 替换为产品 logo 64px 版本 |
| `web/manifest.json` | 图标随生成工具更新；`background_color`/`theme_color` 换为品牌色（`#FDFDFC` / `#F7342F`），清除默认 Flutter 蓝 |
| `web/icons/Icon-{192,512}.png`、`web/icons/Icon-maskable-{192,512}.png` | PWA 图标替换 |
| `windows/runner/resources/app_icon.ico` | Windows 应用图标替换 |
| `macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_{16,32,64,128,256,512,1024}.png`、`Contents.json` | macOS 应用图标替换 |
| `ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-*.png`、`Contents.json` | iOS 全尺寸图标替换（Contents.json 压缩为单行格式，条目完整） |
| `android/app/src/main/res/mipmap-*dpi/ic_launcher.png` | Android 传统启动图标替换 |

## 明确未改动

| 文件 | 原因 |
| --- | --- |
| `ios/Runner.xcodeproj/project.pbxproj` | 生成工具附带改写了 `ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS`（与图标无关且有害），已回退 |
| `linux/` | Flutter Linux 模板无图标资产引用，本次按最小改动原则不接入 |

## 验证记录

- `flutter analyze`：No issues found!
- `flutter test`：43 个用例全部通过
