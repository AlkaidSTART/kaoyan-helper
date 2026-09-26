# P1: 择校模块移动端适配与触摸事件设计规范

## 1. 响应式布局架构 (`SchoolRowItem`)

```
窄屏移动端 (< 600px) 布局结构：
┌─────────────────────────────────────────────────────────────┐
│ 浙江大学  [985] [211] [双一流]          [★ 收藏] [▼ 展开]   │ (Row 1)
│ 计算机科学与技术学院 · 085404 计算机专硕                       │ (Row 2)
│ [● 8.2:1 报录]                                              │ (Row 3)
├─────────────────────────────────────────────────────────────┤
│ (展开后) 历年报录与复试线趋势：                               │
│ [<- 水平滚动容器 (SingleChildScrollView: Axis.horizontal) ->]│
│  年份   | 计划招生 | 实际报名 | 最终录取 | 复试分数线          │
│ 2024 年 |   45 人  |  380 人  |   48 人  |   382 分            │
└─────────────────────────────────────────────────────────────┘
```

宽屏端 (`>= 600px`)：保持原有三列横向流，兼顾桌面端视野利用率。

## 2. 触控手势时序与交互契约

```
用户交互
  ├── 单击 (onTap) ──> HapticFeedback.lightImpact() ──> 展开/收起历年趋势
  ├── 双击 (onDoubleTap) ──> HapticFeedback.selectionClick() ──> 切换目标院校状态 ──> SnackBar 反馈
  ├── 长按 (onLongPress) ──> HapticFeedback.mediumImpact() ──> 弹出底部 ActionSheet (复制专业代码 / 设为目标)
  └── 下拉 (RefreshIndicator) ──> HapticFeedback.lightImpact() ──> 刷新院校数据
```

## 3. 样式与触控规范
- 触控按钮尺寸：`IconButton` 或热区包装保证 `BoxConstraints(minWidth: 48, minHeight: 48)`。
- 表格横向滚动容器最小宽度：`minWidth: 460`，确保 5 列文本舒适阅读不截断。
- 标签筛选横滑：`SingleChildScrollView(scrollDirection: Axis.horizontal, physics: BouncingScrollPhysics())`。
