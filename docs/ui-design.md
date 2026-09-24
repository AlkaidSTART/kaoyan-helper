# 登科 · 考研助手 (DengKe) — UI 设计与交互规范文档 (Flutter)

> **版本**: v3.0 | **最后更新**: 2026-09-20
> **状态**: 经讨论确认（已拆分细化至模块化目录：[docs/ui-design/](ui-design/)）
> **技术栈**: Flutter 3.x + Material Design 3 + Riverpod
> **目标平台**: Android / iOS / Web / macOS / Windows

---

## 1. 设计哲学

### 1.1 核心原则

- **暖色简约**：温暖而不幼稚，简约而不简陋。目标是"让大学生觉得这个产品审美在线"。
- **抗疲劳优先**：考研生每天盯屏 6-10 小时，色彩饱和度克制、对比度舒适、大面积留白降低视觉负担。
- **沉浸无干扰**：答题、背诵等核心场景尽量减少视觉噪声，信息层次清晰。
- **触摸友好**：桌面+平板为主力设备，所有可交互元素最小触摸区域 48x48 逻辑像素（Material 3 规范），同时支持桌面端键鼠交互。
- **跨平台一致**：Flutter 单码库保证核心体验一致，平台差异仅在导航手势、字体、窗口管理等原生层面适配。

### 1.2 竞品参考与差异化

| 竞品 | 风格特征 | 登科的差异 |
|---|---|---|
| Anki | 功能强但 UI 粗糙、极客向 | 保留间隔复习科学性，大幅提升视觉体验 |
| 粉笔考研 | 偏活泼可爱、粉色系 | 更内敛克制，不幼稚化 |
| 考研帮 | 信息密集、门户感重 | 更聚焦单一任务场景，减少干扰 |
| Notion | 极简灰白、工具感 | 增加温度感和学习氛围，不是冷工具 |

---

## 2. 主题系统 (Theme System)

### 2.1 架构概览

基于 Flutter `ThemeData` + `ColorScheme` 实现。三套主题各维护一个完整的 `ThemeData` 实例，运行时通过 Riverpod `StateProvider` 切换，`MaterialApp` 的 `theme` 参数响应式重建。

```dart
// lib/core/theme/app_themes.dart

enum AppThemeMode { warmAmber, softCoral, cleanWhite }

final appThemeProvider = StateProvider<AppThemeMode>(
  (ref) => AppThemeMode.warmAmber, // 默认暖阳
);

// MaterialApp 中使用
MaterialApp(
  theme: ref.watch(appThemeProvider).themeData,
  // ...
);
```

颜色使用方式统一通过 `Theme.of(context)` 获取：

```dart
final colorScheme = Theme.of(context).colorScheme;
final primary = colorScheme.primary;           // 品牌主色
final surface = colorScheme.surface;           // 卡片/容器
final background = colorScheme.surfaceContainerLowest; // 页面底色
final onSurface = colorScheme.onSurface;       // 主文字
```

### 2.2 三套主题色值定义

#### 主题一：「暖阳」(Warm Amber) — 默认

设计意图：日出金橙色调，温暖有活力，长时间使用不刺眼。

| 角色 | ColorScheme 映射 | 色值 | 说明 |
|---|---|---|---|
| 品牌主色 | `primary` | `#E07B39` | 按钮、选中态、FAB、品牌焦点 |
| 品牌色上文字 | `onPrimary` | `#FFFFFF` | primary 上的文字/图标 |
| 品牌浅色容器 | `primaryContainer` | `#FFF3E8` | 品牌色背景、hover/pressed 态 |
| 页面底色 | `surfaceContainerLowest` | `#FFFBF5` | Scaffold 全局底层背景（奶油暖白） |
| 卡片/容器 | `surface` | `#FFFDF9` | Card, Dialog, BottomSheet |
| 主文字 | `onSurface` | `#3D2C1E` | 标题、题干（暖褐色） |
| 次要文字 | `onSurfaceVariant` | `#7C6B5D` | 描述、标签 |
| 弱文字 | `outline` | `#B0A395` | 占位符、辅助说明、禁用边框 |
| 边框/分割 | `outlineVariant` | `#E8DDD2` | Divider、Card 边框（暖灰） |

#### 主题二：「晚樱」(Soft Coral)

设计意图：柔桃粉色调，柔和文艺，适合喜欢温柔色系的用户。

| 角色 | ColorScheme 映射 | 色值 | 说明 |
|---|---|---|---|
| 品牌主色 | `primary` | `#E8806A` | 珊瑚橘粉 |
| 品牌色上文字 | `onPrimary` | `#FFFFFF` | — |
| 品牌浅色容器 | `primaryContainer` | `#FFF0ED` | 极浅粉底 |
| 页面底色 | `surfaceContainerLowest` | `#FFFAF9` | 微粉白 |
| 卡片/容器 | `surface` | `#FFFCFB` | 纯净微粉 |
| 主文字 | `onSurface` | `#3A2828` | 暖褐黑 |
| 次要文字 | `onSurfaceVariant` | `#7D6565` | 灰褐 |
| 边框/分割 | `outlineVariant` | `#EADAD7` | 浅粉灰边框 |

#### 主题三：「素纸」(Clean White)

设计意图：纯白极简，接近 Notion/Linear 的工具感，最低视觉干扰。

| 角色 | ColorScheme 映射 | 色值 | 说明 |
|---|---|---|---|
| 品牌主色 | `primary` | `#5B7FD6` | 低饱和蓝灰 |
| 品牌色上文字 | `onPrimary` | `#FFFFFF` | — |
| 品牌浅色容器 | `primaryContainer` | `#EFF3FB` | 极浅蓝 |
| 页面底色 | `surfaceContainerLowest` | `#FAFAFA` | 纯白微灰 |
| 卡片/容器 | `surface` | `#FFFFFF` | 纯白 |
| 主文字 | `onSurface` | `#1A1A1A` | 近黑 |
| 次要文字 | `onSurfaceVariant` | `#6B7280` | 灰色 |
| 边框/分割 | `outlineVariant` | `#E5E7EB` | 浅灰边框 |

### 2.3 语义色（三套主题共享）

通过 `ThemeData.extensions` 注入自定义 `ThemeExtension<SemanticColors>`：

```dart
// lib/core/theme/semantic_colors.dart

@immutable
class SemanticColors extends ThemeExtension<SemanticColors> {
  final Color success;  // #2E9E6E — 答对、打卡完成、已掌握
  final Color warning;  // #D4912A — 错题标记、复习提醒、竞争适中
  final Color danger;   // #D4453A — 答错、删除、竞争激烈

  // copyWith, lerp ...
}

// 使用方式
final semantic = Theme.of(context).extension<SemanticColors>()!;
Container(color: semantic.success); // 正确反馈
```

| 语义 | 色值 | 用途 |
|---|---|---|
| `success` | `#2E9E6E` | 答对、打卡完成、已掌握、报录比低 |
| `warning` | `#D4912A` | 错题标记、复习提醒、报录比适中 |
| `danger` | `#D4453A` | 答错、删除确认、报录比高 |

### 2.4 暗色模式

MVP 不实现暗色模式。三套主题均为 `Brightness.light`。后续若需添加，每套主题补充对应的 `darkThemeData` 即可，架构已预留。

### 2.5 ThemeData 构建示例

```dart
ThemeData buildWarmAmberTheme() {
  const primary = Color(0xFFE07B39);
  const colorScheme = ColorScheme.light(
    primary: primary,
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFFFF3E8),
    surface: Color(0xFFFFFDF9),
    surfaceContainerLowest: Color(0xFFFFFBF5),
    onSurface: Color(0xFF3D2C1E),
    onSurfaceVariant: Color(0xFF7C6B5D),
    outline: Color(0xFFB0A395),
    outlineVariant: Color(0xFFE8DDD2),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    fontFamily: 'Inter', // English; Chinese falls back to system
    scaffoldBackgroundColor: colorScheme.surfaceContainerLowest,
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: colorScheme.outlineVariant),
      ),
    ),
    extensions: const [
      SemanticColors(
        success: Color(0xFF2E9E6E),
        warning: Color(0xFFD4912A),
        danger: Color(0xFFD4453A),
      ),
    ],
  );
}
```

---

## 3. 字体与排版

### 3.1 字体栈策略

Flutter 跨平台字体策略：中文依赖系统字体（各平台默认即最优渲染），英文 bundle Inter，等宽 bundle JetBrains Mono。

| 用途 | 字体 | 加载方式 | 平台差异 |
|---|---|---|---|
| 英文正文 | Inter | `pubspec.yaml` asset 或 `google_fonts` package | 全平台统一 |
| 中文正文 | 系统默认 | `fontFamilyFallback` | iOS/macOS: PingFang SC; Android: Noto Sans SC; Windows: Microsoft YaHei |
| 等宽/代码 | JetBrains Mono | `pubspec.yaml` asset | 全平台统一 |

```dart
// ThemeData 中配置
ThemeData(
  fontFamily: 'Inter',
  fontFamilyFallback: const [
    'PingFang SC',      // iOS / macOS
    'Noto Sans SC',     // Android
    'Microsoft YaHei',  // Windows
    'sans-serif',       // Web fallback
  ],
  // ...
);
```

### 3.2 字号体系 (基于 Material 3 TextTheme)

| 用途 | TextStyle | 大小 | 行高 | 字重 | 使用场景 |
|---|---|---|---|---|---|
| 页面大标题 | `headlineMedium` | 28sp | 36sp | `w700` | 页面主标题 |
| 模块标题 | `titleLarge` | 22sp | 28sp | `w600` | 模块标题、卡片标题 |
| 卡片标题 | `titleMedium` | 16sp | 24sp | `w600` | 卡片内部标题 |
| 题干正文 | `bodyLarge` | 16sp | 26sp | `w400` | 题干、长文本（行高 1.625x 舒适阅读） |
| 正文 | `bodyMedium` | 14sp | 22sp | `w400` | 一般正文 |
| 辅助说明 | `bodySmall` | 12sp | 18sp | `w400` | 描述、次要信息 |
| 标签/徽章 | `labelMedium` | 12sp | 16sp | `w500` | FilterChip, Badge |
| 按钮文字 | `labelLarge` | 14sp | 20sp | `w500` | ElevatedButton, TextButton |

题干正文行高特意加大到 26sp（1.625 倍），长文本阅读更舒适。

### 3.3 数学公式渲染

- 引擎：`flutter_math_fork` package（LaTeX 子集，纯 Flutter 渲染，无 WebView 依赖）
- 行内公式：`$...$` 解析后用 `Math.tex()` widget 内联
- 块级公式：`$$...$$` 解析后居中展示
- AI 回复中自动识别 LaTeX 语法并渲染

```dart
// 行内公式用法
Math.tex(
  r'\frac{a}{b} = c',
  textStyle: Theme.of(context).textTheme.bodyLarge,
);
```

---

## 4. 间距与圆角规范

### 4.1 间距系统

基于 4px 基础网格（Material 3 标准），所有间距取 4 的倍数：

| Token | 数值 | 常见用途 |
|---|---|---|
| `xs` | 4px | 图标与文字间距、紧凑元素内 |
| `sm` | 8px | 元素间紧凑间距、padding-small |
| `md` | 12px | FilterChip 之间、列表项内边距 |
| `base` | 16px | 标准 padding、列表项间距 |
| `lg` | 24px | 模块间隔、Card 内边距 |
| `xl` | 32px | 区域分隔、大模块上下间距 |
| `xxl` | 48px | 页面顶部/底部留白 |

```dart
// lib/core/theme/spacing.dart
abstract class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double base = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}
```

### 4.2 圆角系统

| Token | 数值 | 用途 | 对应 Widget |
|---|---|---|---|
| `small` | 6px | 按钮、输入框、标签、FilterChip | `ElevatedButton`, `TextField` |
| `medium` | 12px | 卡片、面板、ListTile 容器 | `Card`, `Container` |
| `large` | 16px | Dialog、BottomSheet、大面板 | `AlertDialog`, `BottomSheet` |
| `full` | 9999px | 头像、圆形按钮、Chip | `CircleAvatar`, `FloatingActionButton` |

```dart
abstract class AppRadius {
  static const double small = 6;
  static const double medium = 12;
  static const double large = 16;
  static const double full = 9999;

  static final smallBorder = BorderRadius.circular(small);
  static final mediumBorder = BorderRadius.circular(medium);
  static final largeBorder = BorderRadius.circular(large);
}
```

---

## 5. 全局布局架构

### 5.1 自适应布局策略

使用 `LayoutBuilder` 或 `MediaQuery.sizeOf(context)` 在顶层 Shell Widget 中判断断点，切换导航模式。

```dart
// lib/core/layout/adaptive_scaffold.dart

class AdaptiveScaffold extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.sizeOf(context).width;

    if (width >= 1024) return _DesktopLayout();   // 桌面端
    if (width >= 768) return _TabletLayout();      // 平板端
    return _MobileLayout();                        // 手机端
  }
}
```

### 5.2 桌面端布局 (>= 1024px)

三栏结构：左侧 NavigationRail / 可展开 Drawer + 中央内容区 + 右侧可选面板（AI Chat）。

```
+───────────────────────────────────────────────────────────────────────+
│  AppBar (preferredSize: 56)                                           │
│  [☀ 登科]  │  🎯 浙江大学 · 计算机 (085404)  │  ⏳ 距考研 98 天  │ 👤  │
+──────────+────────────────────────────────────────────+───────────────+
│ Navigation│  Main Content Area                        │  AI Chat      │
│ Rail      │                                           │  Panel        │
│ (w: 72    │  ┌─────────────────────────────────────┐  │  (w: 400)     │
│  展开: 240)│  │                                     │  │  (可折叠)      │
│           │  │     Page Content                     │  │               │
│ 学习看板   │  │     (ConstrainedBox maxWidth: 960)   │  │  ┌─────────┐ │
│ 题库刷题   │  │                                     │  │  │ AI 回复  │ │
│ 错题归纳   │  │                                     │  │  │ 用户消息  │ │
│ 择校报录   │  │                                     │  │  │ 输入框   │ │
│ 记忆背诵   │  └─────────────────────────────────────┘  │  └─────────┘ │
│ AI 助教    │                                           │               │
│           │                                           │               │
│ ──────    │                                           │               │
│ 设置       │                                           │               │
+──────────+────────────────────────────────────────────+───────────────+
```

**实现要点**：
- NavigationRail 折叠/展开通过 `AnimatedContainer` + `extended` 属性控制
- 折叠态宽度 72px（仅图标），展开态 240px（图标 + 文字标签）
- 快捷键 `Cmd/Ctrl + B` 切换折叠，通过顶层 `Shortcuts` + `Actions` widget 实现
- AI Chat Panel 仅在答题/错题上下文中展示，其余页面隐藏
- 中央内容区使用 `Expanded` 填充剩余空间

```dart
Row(
  children: [
    _NavigationSidebar(isExpanded: isExpanded),
    Expanded(
      child: Column(
        children: [
          _TopAppBar(),
          Expanded(child: _PageContent()),
        ],
      ),
    ),
    if (showAiPanel) _AiChatPanel(width: 400),
  ],
);
```

### 5.3 平板端布局 (768px ~ 1023px)

- NavigationRail 默认折叠态（72px，仅图标）
- 点击汉堡菜单展开为 `Drawer` overlay（不推挤内容）
- 主内容区撑满宽度
- AI Chat 以 `endDrawer` 形式从右侧滑入

### 5.4 手机端布局 (< 768px)

- 顶部导航消失，改为底部 `NavigationBar`（Material 3）
- 底部 Tab 最多 5 个：看板 | 刷题 | 背诵 | 择校 | AI
- AppBar 简化：仅 Logo + 倒计时 + 头像
- **注意**：手机端不是 MVP 重点优化对象，保证基本可用即可

```dart
Scaffold(
  body: _PageContent(),
  bottomNavigationBar: NavigationBar(
    destinations: const [
      NavigationDestination(icon: Icon(Icons.dashboard), label: '看板'),
      NavigationDestination(icon: Icon(Icons.quiz), label: '刷题'),
      NavigationDestination(icon: Icon(Icons.style), label: '背诵'),
      NavigationDestination(icon: Icon(Icons.school), label: '择校'),
      NavigationDestination(icon: Icon(Icons.smart_toy), label: 'AI'),
    ],
    selectedIndex: currentIndex,
    onDestinationSelected: (i) => /* GoRouter navigation */,
  ),
);
```

### 5.5 导航项列表

| 图标 | 标签 | 路由 | 说明 |
|---|---|---|---|
| `Icons.dashboard_outlined` | 学习看板 | `/dashboard` | 首页，数据概览 |
| `Icons.quiz_outlined` | 题库刷题 | `/quiz` | 答题核心功能 |
| `Icons.error_outline` | 错题归纳 | `/mistakes` | 错题管理与攻坚 |
| `Icons.school_outlined` | 择校报录 | `/schools` | 院校筛选与对比 |
| `Icons.style_outlined` | 记忆背诵 | `/memory` | 闪卡间隔复习 |
| `Icons.smart_toy_outlined` | AI 助教 | `/chat` | 独立对话页 |
| `Icons.settings_outlined` | 设置 | `/settings` | 主题切换、个人信息 |

### 5.6 顶部 AppBar

```dart
AppBar(
  title: Row(
    children: [
      Text('登科', style: /* brand font, primary color */),
      const SizedBox(width: 24),
      // 目标院校摘要 Chip
      Chip(label: Text('🎯 浙江大学 · 计算机 (085404)')),
      const Spacer(),
      // 考研倒计时
      _CountdownBadge(daysLeft: 98),
      const SizedBox(width: 16),
      // 用户头像
      CircleAvatar(/* ... */),
    ],
  ),
);
```

倒计时常驻 AppBar，时刻营造紧迫感与方向感。

---

## 6. 核心页面交互设计

### 6.1 仪表盘 (Dashboard)

**Widget 结构**：

```
┌─────────────────────────────────────────────────────────┐
│  [数据统计卡片行] — Row / Wrap of Card widgets            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ ⏳ 倒计时 │ │ 📝 总答题 │ │ ✅ 今日打卡│ │ 🔥 连续天数│   │
│  │  98 天    │ │  1,247   │ │  32/50   │ │  12 天   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  (每个为 Card > Padding > Column[icon, value, label])    │
├─────────────────────────────┬───────────────────────────┤
│ [今日待办 / 错题攻坚]        │ [目标院校信息卡]            │
│                             │                           │
│  📌 今日待消灭错题 (5)       │  Card:                    │
│  ┌─────────────────────┐   │   浙江大学 · 计算机科学     │
│  │ ListTile(leading:    │   │   报录比: 8.2:1            │
│  │   CircleAvatar,      │   │   复试线: 360 → 375 → 382 │
│  │   title: 题目摘要,    │   │   ┌─────────────────────┐ │
│  │   subtitle: 科目)    │   │   │ LineChart (fl_chart) │ │
│  └─────────────────────┘   │   └─────────────────────┘ │
│  ... (ListView.builder)    │                           │
│                             │                           │
│  Row:                       │                           │
│  [ElevatedButton: 开始刷题]  │                           │
│  [OutlinedButton: 错题攻坚]  │                           │
├─────────────────────────────┤                           │
│ [今日背诵进度]               │                           │
│  📖 待复习: 42 张            │                           │
│  LinearProgressIndicator    │                           │
│  68% — primaryColor         │                           │
│  [ElevatedButton: 开始背诵]  │                           │
└─────────────────────────────┴───────────────────────────┘
```

**布局实现**：
- 桌面端：顶部统计卡片行用 `Row` + `Expanded`，下方双栏用 `Row` 嵌套 `Expanded` (flex: 3, 2)
- 平板端：同桌面，双栏比例调整为 1:1
- 手机端：单列 `ListView`，卡片上下堆叠

```dart
// 统计卡片
class StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: AppSpacing.sm),
            Text(value, style: Theme.of(context).textTheme.headlineMedium),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}
```

### 6.2 答题页 (Quiz)

**设计原则**：最小干扰、聚焦题目本身。

**布局**：居中 Card，`ConstrainedBox(maxWidth: 768)` 两侧大面积留白。

```
┌─────────────────────────────────────────┐
│ ← IconButton    政治 · 马原    3/20      │  AppBar / Row
├─────────────────────────────────────────┤
│                                         │
│  Chip('2024 真题 · 单选')                │  FilterChip / Chip
│                                         │
│  Text(题干, style: bodyLarge)            │  行高 26sp
│  "下列关于矛盾普遍性和特殊性关系的表述，   │
│   正确的是："                            │
│                                         │
│  ┌─────────────────────────────────┐    │  InkWell > Card / ListTile
│  │ A. 矛盾普遍性寓于特殊性之中      │    │  默认: surface + outlineVariant
│  └─────────────────────────────────┘    │  hover: primaryContainer
│  ┌─────────────────────────────────┐    │  正确: success.withValues(alpha: 0.1)
│  │ B. 矛盾特殊性可以脱离普遍性      │    │       + success border
│  └─────────────────────────────────┘    │  错误: danger.withValues(alpha: 0.1)
│  ┌─────────────────────────────────┐    │       + danger border
│  │ C. ...                          │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ D. ...                          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ── AnimatedCrossFade (判定后展开) ──     │
│                                         │
│  ✅ 正确答案: A                          │
│                                         │
│  ExpansionTile('📖 官方解析')            │
│    矛盾的普遍性和特殊性是辩证统一...       │
│                                         │
│       FloatingActionButton.extended(     │
│         icon: ⚡, label: 'AI 深度解析'    │  品牌色, 调起 AI Panel
│       )                                  │
│       ElevatedButton('下一题 →')          │
│                                         │
└─────────────────────────────────────────┘
```

**选项交互**：
- 每个选项是 `Material` > `InkWell` > `Container` 组合，保证触摸涟漪效果
- 点击后 200ms `AnimatedContainer` 颜色过渡至正确/错误状态
- 选中后禁用其他选项交互（`AbsorbPointer` 或 `IgnorePointer`）

**键盘快捷键**（桌面端）：

通过 `Shortcuts` + `CallbackAction` widget 实现：

| 按键 | 动作 |
|---|---|
| `A` / `B` / `C` / `D` | 选中对应选项 |
| `Space` | 确认提交（多选题） |
| `Enter` / `→` | 下一题 |
| `←` | 上一题（查看模式） |

```dart
Shortcuts(
  shortcuts: {
    LogicalKeySet(LogicalKeyboardKey.keyA): const SelectOptionIntent(0),
    LogicalKeySet(LogicalKeyboardKey.keyB): const SelectOptionIntent(1),
    // ...
    LogicalKeySet(LogicalKeyboardKey.arrowRight): const NextQuestionIntent(),
    LogicalKeySet(LogicalKeyboardKey.enter): const NextQuestionIntent(),
  },
  child: Actions(
    actions: {
      SelectOptionIntent: CallbackAction<SelectOptionIntent>(
        onInvoke: (intent) => _selectOption(intent.index),
      ),
      // ...
    },
    child: Focus(autofocus: true, child: _quizContent()),
  ),
);
```

### 6.3 错题本 (Mistakes)

```
┌───────────────────────────────────────────────────┐
│ [筛选工具栏] — Wrap of FilterChip                    │
│  科目: [FilterChip: 全部] [政治] [英语] [数学]       │
│  题型: [FilterChip: 全部] [单选] [多选] [主观]       │
│  排序: [DropdownButton: 错误次数 ▾]                  │
│  状态: [ChoiceChip: 待消除 | 已掌握]                 │
├───────────────────────────────────────────────────┤
│                                                   │
│  ElevatedButton.icon(                             │
│    icon: Icons.play_arrow,                        │
│    label: '开始错题攻坚 (随机 10 题)',               │
│  )                                                │
│                                                   │
│  ListView.builder:                                │
│  ┌───────────────────────────────────────────┐    │
│  │ Card > ListTile                            │    │
│  │   leading: CircleAvatar('政 · 单')          │    │
│  │   title: "下列关于矛盾普遍性和特殊性..."     │    │
│  │   subtitle: "最近错误: 2 天前"              │    │
│  │   trailing: Column[                        │    │
│  │     Badge('错 3 次', color: danger),         │    │
│  │     Badge('🔴 待消除', color: danger),       │    │
│  │   ]                                        │    │
│  │   Row: [TextButton: 重做] [TextButton: 解析]│    │
│  └───────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────┐    │
│  │ Card > ListTile                            │    │
│  │   trailing: Badge('🟢 已掌握', success)     │    │
│  │   ...                                      │    │
│  └───────────────────────────────────────────┘    │
│  ...                                              │
└───────────────────────────────────────────────────┘
```

**错题状态 Badge 颜色**：
- `待消除`：`danger` 红色背景
- `已掌握`（连续正确 ≥ 2 次）：`success` 绿色背景

### 6.4 择校报录 (Schools)

```
┌───────────────────────────────────────────────────────┐
│ [组合筛选栏]                                            │
│  SearchBar(hintText: '搜索院校名称...')                  │
│  Wrap:                                                 │
│    FilterChip('985')  FilterChip('211')                │
│    FilterChip('双一流')                                 │
│  DropdownButton('地区: 全部 ▾')                         │
│  SearchBar(hintText: '专业代码或名称...')                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  DataTable / ListView.builder:                        │
│                                                       │
│  院校名称     │ 学院    │ 专业          │ 报录比  │ 操作 │
│  ─────────────┼────────┼──────────────┼────────┼───── │
│  浙江大学     │ 计算机   │ 085400 电子信息│ 🔴 8:1 │ ⭐   │
│  ▼ ExpansionTile — 近 3 年趋势                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  LineChart (fl_chart)                            │  │
│  │  2024: 计划 45 / 报名 380 / 录取 48 / 线 382     │  │
│  │  2023: 计划 40 / 报名 350 / 录取 42 / 线 375     │  │
│  │  2022: 计划 38 / 报名 300 / 录取 38 / 线 360     │  │
│  └─────────────────────────────────────────────────┘  │
│  ─────────────┼────────┼──────────────┼────────┼───── │
│  华东师范大学  │ 计算机   │ 085400 电子信息│ 🟡 5:1 │ ⭐   │
│  ...                                                  │
└───────────────────────────────────────────────────────┘
```

**报录比颜色语义**（使用 `SemanticColors`）：
- `ratio > 10` → `danger` 红色（竞争激烈）
- `5 < ratio <= 10` → `warning` 橙色（适中）
- `ratio <= 5` → `success` 绿色（较易）

**图表**：使用 `fl_chart` package 的 `LineChart` widget 展示历年趋势。

**收藏按钮**：`IconButton(icon: Icons.star_border / Icons.star)`，点击设为目标院校。

### 6.5 记忆背诵 — 闪卡工作室 (Flashcard Studio)

**核心交互：3D 翻转动效**

使用 `AnimationController` + `Transform` + `Matrix4.rotationY()` 实现真正的 3D 翻转。

```
┌──────────────────────────────────────┐
│ 📖 英语高频词  │  进度: 23 / 50      │  AppBar
│ LinearProgressIndicator  46%         │  primaryColor
├──────────────────────────────────────┤
│                                      │
│           ┌──────────────┐           │
│           │              │           │  Card (ConstrainedBox
│           │              │           │   maxWidth: 400,
│           │  abandon     │           │   maxHeight: 280)
│           │              │           │
│           │  /əˈbændən/  │           │  正面: 居中大字
│           │              │           │  背面: 释义 + 例句
│           │ (GestureDetector:        │
│           │  onTap → flip)│          │
│           └──────────────┘           │
│                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐
│  │ 🔴 忘记   │ │ 🟡 模糊   │ │ 🟢 牢记   │  评级按钮行
│  │ hotkey: 1 │ │ hotkey: 2 │ │ hotkey: 3 │  翻转后显示
│  └──────────┘ └──────────┘ └──────────┘  (AnimatedOpacity)
│                                      │
└──────────────────────────────────────┘
```

**翻转动画实现**：

```dart
class FlipCard extends StatefulWidget { /* ... */ }

class _FlipCardState extends State<FlipCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;
  bool _showFront = true;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
  }

  void _flip() {
    if (_showFront) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
    _showFront = !_showFront;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _flip,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          final angle = _animation.value * pi;
          // Front side: 0 → π/2; Back side: π/2 → π
          final isFront = angle < pi / 2;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001) // perspective
              ..rotateY(angle),
            child: isFront
                ? _buildFront()
                : Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(pi),
                    child: _buildBack(),
                  ),
          );
        },
      ),
    );
  }
}
```

**评级按钮**：
- 翻到背面后，底部 3 个 `ElevatedButton` 通过 `AnimatedOpacity` 淡入
- 忘记（danger）、模糊（warning）、牢记（success）
- 桌面端键盘快捷键：`1` / `2` / `3` 对应三个评级
- 按下后自动进入下一张卡片（`AnimatedSwitcher` 切换）

### 6.6 AI 助教 (Chat)

**两种唤起方式，统一交互体验**：

#### A. 侧边面板模式（从做题/错题页唤起）

- 桌面端：右侧 `AnimatedContainer` 面板滑入，宽度 400px（从 0 → 400px，250ms）
- 平板端：`Scaffold.endDrawer` 覆盖，宽度 `min(480, screenWidth * 0.8)`
- 手机端：全屏 push 新路由
- 面板顶部展示当前题目摘要（`Card` 简化信息），保持答题上下文

#### B. 独立对话页 (`/chat`)

- 全屏对话界面，中央内容区（`ConstrainedBox(maxWidth: 768)`）

**聊天区 Widget 结构**：

```
┌──────────────────────────────────────┐
│ AppBar: 🤖 AI 考研助教                │
│         trailing: Badge('27/30 次')   │  每日额度指示器
├──────────────────────────────────────┤
│                                      │
│  ListView.builder (reverse: true):   │  聊天消息列表
│                                      │
│  Align(left):                        │  AI 消息
│  ┌──────────────────────────────┐    │
│  │ Card(color: surface)          │    │  surface 底色
│  │ Container(                    │    │  primary 色左边框 (2px)
│  │   decoration: BoxDecoration(  │    │
│  │     border: Border(left:      │    │
│  │       BorderSide(primary, 2)),│    │
│  │   ),                          │    │
│  │   child: MarkdownBody(        │    │  flutter_markdown 渲染
│  │     data: message,            │    │  + flutter_math_fork LaTeX
│  │     // 流式打字机效果:          │    │  通过 StreamBuilder 逐字追加
│  │   ),                          │    │
│  │ )                             │    │
│  └──────────────────────────────┘    │
│                                      │
│  Align(right):                       │  用户消息
│  ┌──────────────────────────────┐    │
│  │ Container(                    │    │  primary 底色
│  │   color: primary,             │    │  onPrimary 白字
│  │   borderRadius: medium,       │    │
│  │   child: Text(message),       │    │
│  │ )                             │    │
│  └──────────────────────────────┘    │
│                                      │
│  Wrap (快捷提问 Chips):              │  建议追问
│  [ActionChip: '为什么不选C']          │
│  [ActionChip: '通俗解释']             │
│  [ActionChip: '出个变式题']            │
│                                      │
│  ┌─────────────────────────────────┐ │  输入区
│  │ TextField(                      │ │
│  │   decoration: InputDecoration(  │ │
│  │     hintText: '输入你的问题...',  │ │
│  │     suffixIcon: IconButton(     │ │
│  │       icon: Icons.send,         │ │
│  │     ),                          │ │
│  │   ),                            │ │
│  │ )                               │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**流式输出实现**：
- 后端返回 SSE / WebSocket stream
- 前端通过 `StreamBuilder` 监听，逐 token 追加到 `MarkdownBody` 的 data 属性
- 输出完成后解析 LaTeX 并渲染为 `Math.tex()` widget

**每日额度指示器**：
- AppBar trailing 位置的 `Badge` widget
- 显示 "剩余 27/30 次"
- 接近上限（< 5 次）变为 `warning` 色

### 6.7 管理后台 (Admin)

管理后台为**独立的 Next.js 项目**，不在 Flutter 应用内。采用「素纸」配色（蓝灰白），功能优先。

主要模块：
- **数据看板**：DAU、答题量、AI 调用次数、成本估算
- **题库管理**：CRUD 表格 + 批量导入（JSON/CSV）
- **用户管理**：搜索 + 封禁/解封
- **UGC 审核**：待审核队列 + 通过/驳回

> 管理后台设计规范不在本文档范围内，后续独立维护。

---

## 7. 动效与过渡规范

### 7.1 动效一览

| 场景 | 实现方式 | 时长 | 曲线 |
|---|---|---|---|
| 页面切换 | Material `fade-through` (默认) | 300ms | `Curves.fastOutSlowIn` |
| 侧边栏折叠/展开 | `AnimatedContainer` width | 200ms | `Curves.easeOut` |
| 卡片翻转 | `AnimationController` + `Matrix4.rotationY` | 400ms | `Curves.easeInOut` |
| AI 面板滑入 | `AnimatedContainer` width / `SlideTransition` | 250ms | `Curves.easeOut` |
| 选项判定反馈 | `AnimatedContainer` color | 200ms | `Curves.ease` |
| 按钮 pressed | `AnimatedScale` (0.98) | 100ms | `Curves.ease` |
| Toast/SnackBar | `SnackBar` 默认动画 | 入 200ms / 留 3s / 出 150ms | Material 默认 |

### 7.2 动效原则

- **所有动效 <= 400ms**，不做无意义的延迟或弹性动画，尊重用户时间
- **尊重无障碍设置**：检查 `MediaQuery.of(context).accessibilityFeatures.reduceMotion`，为 `true` 时将所有 `duration` 设为 `Duration.zero`

```dart
Duration animDuration(BuildContext context, Duration normal) {
  final reduceMotion =
      MediaQuery.of(context).accessibilityFeatures.reduceMotion;
  return reduceMotion ? Duration.zero : normal;
}
```

### 7.3 页面过渡

使用 GoRouter 的 `CustomTransitionPage` 或 Material 默认过渡（`fade-through`）。不使用花哨的滑动/缩放页面切换。

```dart
GoRoute(
  path: '/quiz',
  pageBuilder: (context, state) => CustomTransitionPage(
    child: const QuizPage(),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(opacity: animation, child: child);
    },
    transitionDuration: const Duration(milliseconds: 300),
  ),
);
```

---

## 8. 平台特定适配

### 8.1 iOS

| 适配项 | 实现方式 |
|---|---|
| 返回手势 | 系统默认的右滑返回由 `CupertinoPageRoute` 支持。若用 GoRouter，可在 iOS 上使用 `CupertinoPage` |
| SafeArea | 所有页面顶层包裹 `SafeArea`，防止刘海/灵动岛遮挡 |
| 字体 | 中文自动使用 PingFang SC（iOS 系统字体） |
| 滚动物理 | 默认 `BouncingScrollPhysics`（iOS 风格弹性滚动）—— Flutter 自动适配 |

### 8.2 Android

| 适配项 | 实现方式 |
|---|---|
| Edge-to-edge | `SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge)` + 透明系统栏 |
| Material You 动态色 | 可选：`DynamicColorBuilder`（`dynamic_color` package）取系统壁纸色。MVP 不启用，保持品牌色一致性 |
| 字体 | 中文自动使用 Noto Sans SC |
| 返回导航 | 系统返回键 / 手势 默认 `Navigator.pop`，通过 `PopScope` 管理 |

### 8.3 Web

| 适配项 | 实现方式 |
|---|---|
| Cursor hover 状态 | `MouseRegion` + `SystemMouseCursors.click`，所有可交互元素需显示手形光标 |
| 滚动行为 | 使用 `ScrollBehavior` 覆盖，启用鼠标拖拽滚动 |
| 文字选择 | 正文/题干/AI 回复区域使用 `SelectableText` 或 `SelectionArea` |
| URL 路由 | GoRouter `usePathUrlStrategy()` 启用 path 模式（无 #） |
| 渲染引擎 | 使用 CanvasKit（`--web-renderer canvaskit`），保证字体和动画一致性 |

### 8.4 Desktop (macOS / Windows)

| 适配项 | 实现方式 |
|---|---|
| 窗口最小尺寸 | `window_manager` package：`minSize: Size(900, 600)` |
| 键盘快捷键 | 全局 `Shortcuts` widget 绑定，见各页面快捷键定义 |
| Hover 状态 | `InkWell` / `IconButton` 的 `hoverColor` 设为 `primaryContainer` |
| 右键菜单 | `GestureDetector.onSecondaryTap` + `showMenu` 弹出 `PopupMenuButton` |
| macOS 标题栏 | `window_manager` 的 `titleBarStyle: TitleBarStyle.hidden`，自绘标题栏集成 AppBar |
| Windows 标题栏 | 同上，或使用默认系统标题栏 |

```dart
// macOS / Windows 窗口初始化
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (Platform.isMacOS || Platform.isWindows) {
    await windowManager.ensureInitialized();
    await windowManager.setMinimumSize(const Size(900, 600));
    await windowManager.setTitle('登科 · 考研助手');
  }
  runApp(const ProviderScope(child: DengKeApp()));
}
```

---

## 9. 响应式断点总结

| 类别 | 宽度范围 | 导航模式 | 布局策略 | 触摸支持 |
|---|---|---|---|---|
| Desktop | >= 1024px | NavigationRail（可展开 240px） | 三栏（侧栏+内容+可选AI面板） | 非必须，支持键鼠 |
| Tablet | 768px ~ 1023px | 折叠 NavigationRail / Drawer overlay | 双栏或单栏 | 触摸优先 |
| Mobile | < 768px | 底部 NavigationBar | 单栏 | 触摸优先 |

所有交互元素最小触摸目标 48x48 逻辑像素（Material 3 标准）。

---

## 10. 关键依赖清单

以下为 UI 层核心依赖，均已在架构讨论中确认：

| Package | 用途 | 必要性 |
|---|---|---|
| `flutter_riverpod` | 状态管理 + 主题切换 | 核心 |
| `go_router` | 声明式路由 + 深链接 | 核心 |
| `fl_chart` | 折线图/柱状图（报录趋势、学习统计） | 核心 |
| `flutter_math_fork` | LaTeX 数学公式渲染 | 核心 |
| `flutter_markdown` | Markdown 渲染（AI 回复） | 核心 |
| `google_fonts` | Inter 字体加载（备选：直接 asset bundle） | 可选 |
| `window_manager` | 桌面端窗口尺寸控制 | 桌面端必须 |
| `dynamic_color` | Android Material You 动态色 | MVP 后 |

---

## 附录 A：设计 Token 速查

```
品牌色 (暖阳):  #E07B39
品牌色 (晚樱):  #E8806A
品牌色 (素纸):  #5B7FD6
成功:          #2E9E6E
警告:          #D4912A
危险:          #D4453A

间距: 4 / 8 / 12 / 16 / 24 / 32 / 48
圆角: 6 (small) / 12 (medium) / 16 (large) / 9999 (full)

动效上限: 400ms
翻转: 400ms easeInOut
侧栏: 200ms easeOut
AI 面板: 250ms easeOut
选项反馈: 200ms ease
```
