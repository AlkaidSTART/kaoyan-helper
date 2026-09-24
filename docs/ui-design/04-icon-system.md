# 图标系统规范 (Icon System)

> 原则：严禁使用任何系统 Emoji 代替功能图标与状态指示器。统一采用专业线性图标库，保持视觉骨骼一致。

---

## 1. 选型标准

采用 **Material Symbols Outlined**（Flutter 原生 `Icons.*_outlined` / `Icons.*_rounded`）：
- **零额外体积**：`uses-material-design: true` 原生内置。
- **视觉风格**：统一使用 `_outlined`（线框风格）作为常规态，激活/选中使用 `_rounded` 填充态。
- **规范尺寸**：
  - 小尺寸 (Inline / Badge)：`16dp`
  - 标准尺寸 (Button / ListTile / Input)：`20dp` ~ `24dp`
  - 大尺寸 (Empty State / Hero)：`32dp` ~ `48dp`

---

## 2. 状态圆点替代规范 (Status Dots)

严禁使用任何 Emoji 作为状态指示。状态指示统一使用组件级渲染：

```dart
// 状态圆点组件定义
class StatusDot extends StatelessWidget {
  final Color color;
  final double size;

  const StatusDot({super.key, required this.color, this.size = 8.0});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}
```

---

## 3. 全局业务图标映射表

| 场景 | 推荐图标 (Material Icons) | 备选图标 (Lucide) | 说明 |
|---|---|---|---|
| **考研倒计时** | `Icons.timer_outlined` | `timer` | AppBar / 看板卡片 |
| **今日刷题** | `Icons.assignment_outlined` | `clipboard-list` | 题量统计 |
| **目标/达成率** | `Icons.track_changes_outlined` | `target` | 目标进度 |
| **连续打卡** | `Icons.local_fire_department_outlined` | `flame` | 打卡天数 |
| **错题/待消除** | `Icons.error_outline_rounded` | `alert-circle` | 错题本 |
| **答对/已掌握** | `Icons.check_circle_outline_rounded` | `check-circle` | 选项正确反馈 |
| **答错/判定失败** | `Icons.cancel_outlined` | `x-circle` | 选项错误反馈 |
| **记忆闪卡** | `Icons.style_outlined` | `layers` | 闪卡背诵 |
| **官方解析** | `Icons.menu_book_outlined` | `book-open` | 题目解析 |
| **AI 助教/深度解析**| `Icons.auto_awesome` | `sparkles` | AI 关联入口 |
| **择校报录** | `Icons.school_outlined` | `graduation-cap` | 院校模块 |
| **目标收藏** | `Icons.star_outline_rounded` / `Icons.star_rounded` | `star` | 设为目标院校 |
| **搜索** | `Icons.search_rounded` | `search` | 全局/院校检索 |
| **设置** | `Icons.settings_outlined` | `settings` | 个人设置 |
