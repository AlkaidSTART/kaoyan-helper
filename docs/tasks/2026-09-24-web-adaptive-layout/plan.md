# Plan: Web Adaptive Layout

## 原始诉求
根据 `ui-design` 文件夹的内容开始完善 web 端的 UI。

## 决策论证
1. 参考 `docs/ui-design/03-layout-adaptive.md` 规范，Web端（桌面端）布局采用响应式三栏结构：
   - 顶部 AppBar (56px)
   - 左侧 NavigationRail (72px折叠 / 240px展开)
   - 中间内容区 (ConstrainedBox maxWidth: 960)
   - 右侧 AI Chat 面板 (400px)
2. 状态管理采用 Riverpod 管理侧边栏和 AI 面板的展开/折叠状态。
3. 暂时在 UI 层进行骨架搭建，实现自适应 Shell。

## 落地计划
1. 创建功能相关的 P0 - P3 文档。
2. 引入必要的依赖（如 `flutter_riverpod` 等，已在 pubspec.yaml 中提供）。
3. 实现自适应 Shell (AppShell)。
4. 实现 NavigationRail 与 Top AppBar。
5. 集成 Riverpod Providers。
6. 运行验证通过。
