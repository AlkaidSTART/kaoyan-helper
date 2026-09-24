# 色彩体系规范 (Color System)

> 技术实现：Flutter `ColorScheme` + `ThemeExtension`

---

## 1. 主题总览

应用支持 3 套完整浅色主题，MVP 阶段暂不实现暗色模式（架构保留暗色扩展能力）：

| 主题名 | 标识符 | 主色 | 适用场景 |
|---|---|---|---|
| **暖阳** (Warm Amber) | `warmAmber` | `#E07B39` | 默认主题，温润舒适，久看防疲劳 |
| **晚樱** (Soft Coral) | `softCoral` | `#E8806A` | 柔和微甜，文艺舒缓 |
| **素纸** (Clean White) | `cleanWhite` | `#5B7FD6` | 工具感极简，蓝灰极低干扰 |

---

## 2. 容器层级规范 (Material 3 Surface Hierarchy)

卡片与层级按 M3 容器色递进，杜绝全白全平：

| 层级 Token | 作用 | 暖阳色值 | 晚樱色值 | 素纸色值 |
|---|---|---|---|---|
| `surfaceContainerLowest` | Scaffold 底层底色 | `#FFFBF5` | `#FFFAF9` | `#FAFAFA` |
| `surfaceContainerLow` | 一级嵌底容器/列表背景 | `#FFF8F0` | `#FFF5F3` | `#F4F5F7` |
| `surface` | 标准卡片 Card、ListTile | `#FFFDF9` | `#FFFCFB` | `#FFFFFF` |
| `surfaceContainerHigh` | 悬浮卡片、Drawer 侧栏 | `#FFF5EC` | `#FFF0EC` | `#EEF0F4` |
| `surfaceContainerHighest` | Dialog、Popover、Toast 浮层 | `#FFECE0` | `#FFE7E2` | `#E5E7EB` |

---

## 3. 三套主题色值对照表

### 3.1 暖阳 (Warm Amber) — 默认

| Token | 色值 | 说明 |
|---|---|---|
| `primary` | `#E07B39` | 主操作按钮、选框激活、高亮标识 |
| `onPrimary` | `#FFFFFF` | 主色按钮上文字/图标 |
| `primaryContainer` | `#FFF3E8` | 品牌浅底、Hover 态、激活 Chip 背景 |
| `onPrimaryContainer` | `#8C3B07` | 浅底上的深色高对比文字（符合 WCAG AA 4.5:1） |
| `onSurface` | `#3D2C1E` | 主文字、标题、题干 |
| `onSurfaceVariant` | `#7C6B5D` | 次要描述文字、时间戳 |
| `outline` | `#B0A395` | 占位文字、禁用线框 |
| `outlineVariant` | `#E8DDD2` | 分割线、卡片边框 |

> **无障碍对比度修正**：`#E07B39` 直接用于浅白底字对比度仅 3.1:1。浅底文字链接一律使用 `onPrimaryContainer` (`#8C3B07`)。

### 3.2 晚樱 (Soft Coral)

| Token | 色值 | 说明 |
|---|---|---|
| `primary` | `#E8806A` | 珊瑚橘粉主色 |
| `onPrimary` | `#FFFFFF` | 按钮文字 |
| `primaryContainer` | `#FFF0ED` | 极浅粉底 |
| `onPrimaryContainer` | `#933725` | 浅底深字 (AA) |
| `onSurface` | `#3A2828` | 暖褐黑主文字 |
| `onSurfaceVariant` | `#7D6565` | 灰褐次字 |
| `outline` | `#B59E9E` | 弱文字 |
| `outlineVariant` | `#EADAD7` | 浅粉灰分割线 |

### 3.3 素纸 (Clean White)

| Token | 色值 | 说明 |
|---|---|---|
| `primary` | `#5B7FD6` | 低饱和蓝灰 |
| `onPrimary` | `#FFFFFF` | 按钮文字 |
| `primaryContainer` | `#EFF3FB` | 极浅蓝底 |
| `onPrimaryContainer` | `#284A9A` | 浅底深字 (AA) |
| `onSurface` | `#1A1A1A` | 近黑文字 |
| `onSurfaceVariant` | `#6B7280` | 次灰文字 |
| `outline` | `#9CA3AF` | 弱文字 |
| `outlineVariant` | `#E5E7EB` | 浅灰分割线 |

---

## 4. 语义反馈色 (Semantic Colors)

全主题共享，注入 `ThemeExtension<SemanticColors>`：

| 语义 | 标识 | 主色 | 浅容器背景 (10% Alpha) | 用途 |
|---|---|---|---|---|
| 成功 / 达标 | `success` | `#2E9E6E` | `#EAF5F0` | 答对、完成打卡、报录比低 (<=5) |
| 警告 / 注意 | `warning` | `#D4912A` | `#FBF4EA` | 错题待温习、额度告急、报录比适中 (5-10) |
| 危险 / 错误 | `danger` | `#D4453A` | `#FBECEB` | 答错、删除确认、报录比高 (>10) |

---

## 5. 考研学科专属识别色 (Subject Colors)

用于题库、错题本标签与筛选 Chip，统一为浅底深字规范：

| 学科 | 主标识色 | 容器底色 | 边框/文字色 |
|---|---|---|---|
| **思想政治** | `#C84630` (绯红) | `#FDF0EE` | `#932917` |
| **考研英语** | `#2B5C8F` (靛蓝) | `#EEF4FB` | `#1A4068` |
| **考研数学** | `#1E7E88` (钴青) | `#EBF7F8` | `#135961` |
| **专业课** (统考/自命题) | `#2E7D5B` (森绿) | `#EEF7F2` | `#1D5A40` |

---

## 6. 图表专用序列色 (fl_chart Data Viz Palette)

折线图、多指标柱状图避免与红黄绿语义冲突，使用 5 色中性序列：

```dart
const dataVizColors = [
  Color(0xFFE07B39), // 1. 主指标 (与主色一致)
  Color(0xFF32939B), // 2. 对比指标 A (青蓝)
  Color(0xFF5671B5), // 3. 对比指标 B (灰蓝)
  Color(0xFF8C65A8), // 4. 对比指标 C (柔紫)
  Color(0xFFB59132), // 5. 对比指标 D (黄褐)
];
```

---

## 7. 交互状态透明度规范 (State Overlays)

基于 Material Design 3 规范：

- **Hover 态**：叠加对应色 `alpha: 0.08` (8%)
- **Focus 态**：叠加对应色 `alpha: 0.12` (12%)
- **Pressed 态**：叠加对应色 `alpha: 0.12` (12%)
- **Disabled 态**：
  - 容器背景：`onSurface` 叠加 `alpha: 0.12`
  - 文本/图标：`onSurface` 叠加 `alpha: 0.38`
