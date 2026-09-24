# P1 - Web 自适应布局设计

## 1. 接口契约
- 纯 UI 壳组件，暂不涉及 Repository / API 层。

## 2. 数据模型
- 无特定数据库模型。

## 3. Riverpod 状态设计
- `navRailExpandedProvider`: StateProvider<bool>，默认 false (72px)。
- `aiPanelExpandedProvider`: StateProvider<bool>，默认 false (隐藏)。
- `currentNavIndexProvider`: StateProvider<int>，默认 0。

## 4. UI 规范
- **断点**：
  - Mobile: < 768px (本次简化处理，仅适配 Desktop / Tablet 思路)
  - Tablet: 768px ~ 1023px
  - Desktop: >= 1024px
- **热区**：48x48dp 最小触控/点击面积。
- **动效**：折叠面板时间控制在 400ms 以内（如 `Curves.easeOutCubic`，300ms）。
- **图标**：使用 `Icons.*_outlined`。
- **色彩**：利用 Material 3 `Theme.of(context).colorScheme`。
