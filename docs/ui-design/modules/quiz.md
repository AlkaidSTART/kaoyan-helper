# 模块设计：题库答题 (Quiz)

> 路由：`/quiz` | 角色：备考核心高频刷题场景

---

## 1. 界面与布局

- **居中专注容器**：`ConstrainedBox(maxWidth: 768)`，两侧大面积留白，避免宽屏长文本阅读疲劳。
- **题目行高**：`bodyLarge`（16sp），行高固定为 `26sp`（1.625x 舒适阅读比）。
- **数学公式**：行内与块级公式混排，统一由 `flutter_math_fork` 渲染。
- **图标规范**：一律使用 `Icons.*_outlined` / `Icons.*_rounded`，严禁 Emoji。

```
┌─────────────────────────────────────────────────────────────┐
| [TopBar] [Icon: arrow_back]  政治 · 马原   3/20  [Icon: bookmark] |
+─────────────────────────────────────────────────────────────+
| [Badge: 2024 真题 · 单选]                                    |
|                                                             |
| 题干正文:                                                    |
| "下列关于矛盾普遍性和特殊性关系的表述，正确的是："               |
|                                                             |
| ┌─────────────────────────────────────────────────────────┐ |
| │ [A] 矛盾普遍性寓于特殊性之中                             │ |
| └─────────────────────────────────────────────────────────┘ |
| ┌─────────────────────────────────────────────────────────┐ |
| │ [B] 矛盾特殊性可以脱离普遍性                             │ |
| │     (正确态: success 浅绿底 + 边框 + [Icon: check_circle])│ |
| └─────────────────────────────────────────────────────────┘ |
| ┌─────────────────────────────────────────────────────────┐ |
| │ [C] ... (点击错误态: danger 浅红底 + 抖动 + [Icon: cancel])│ |
| └─────────────────────────────────────────────────────────┘ |
| ┌─────────────────────────────────────────────────────────┐ |
| │ [D] ...                                                 │ |
| └─────────────────────────────────────────────────────────┘ |
|                                                             |
| === 判定后平滑展开 (AnimatedCrossFade) ====================  |
| [Icon: check_circle_outline] 正确答案: B                    |
|                                                             |
| [ExpansionTile]                                             |
|   leading: [Icon: menu_book_outlined]                       |
|   title: 官方解析                                           |
|   children: 矛盾的普遍性和特殊性是辩证统一的...              |
|                                                             |
| [底部操作栏] Row:                                           |
| [OutlinedButton.icon: (Icon: auto_awesome, 'AI 深度解析')]   |
| Spacer                                                      |
| [FilledButton.icon: (Icon: arrow_forward, '下一题')]        |
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 选项卡片组件结构 (QuizOptionCard)

每个选项由以下层级构成：

```dart
InkWell(
  onTap: isLocked ? null : () => onSelect(index),
  borderRadius: BorderRadius.circular(AppRadius.medium),
  child: AnimatedContainer(
    duration: const Duration(milliseconds: 200),
    curve: Curves.ease,
    padding: const EdgeInsets.all(AppSpacing.base),
    decoration: BoxDecoration(
      color: backgroundColor, // 默认 surface, 正确 success 浅底, 错误 danger 浅底
      borderRadius: BorderRadius.circular(AppRadius.medium),
      border: Border.all(color: borderColor, width: 1.5),
    ),
    child: Row(
      children: [
        // 选项序号徽标 (A, B, C, D)
        Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: badgeColor,
            borderRadius: BorderRadius.circular(AppRadius.small),
          ),
          child: Text(optionLetter, style: badgeTextStyle),
        ),
        const SizedBox(width: AppSpacing.md),
        // 选项文本 (支持数学公式)
        Expanded(child: optionContentWidget),
        // 判定反馈图标 (仅在判定后显示)
        if (state == OptionState.correct)
          const Icon(Icons.check_circle_rounded, color: Color(0xFF2E9E6E), size: 20),
        if (state == OptionState.wrong)
          const Icon(Icons.cancel_rounded, color: Color(0xFFD4453A), size: 20),
      ],
    ),
  ),
);
```

---

## 3. 交互与动效细节

1. **点击即防抖锁定**：
   - 触发点击即刻设置 `isLocked = true`，禁用其余选项交互。
2. **正确反馈 (Correct)**：
   - 边框变绿 (`#2E9E6E`)，背景淡入浅绿 (`#EAF5F0`)。
   - `AnimatedScale` 微弹：`1.0 -> 1.02 -> 1.0`（200ms）。
   - 右侧浮出 `Icons.check_circle_rounded`。
3. **错误反馈 (Wrong)**：
   - 边框变红 (`#D4453A`)，背景淡入浅红 (`#FBECEB`)。
   - 触发 180ms 水平抖动（`TweenSequence` ±4px）。
   - 右侧浮出 `Icons.cancel_rounded`。
   - 同时将正确答案项以绿色边框高亮标注。
4. **解析展开**：
   - `AnimatedCrossFade` 展开解析区，时长 250ms，严禁突兀弹跳。
5. **快捷键支持**：
   - 键盘 `A / B / C / D`：直接触发对应选项。
   - 键盘 `Enter` 或 `→`：进入下一题。
   - 键盘 `Cmd/Ctrl + J`：右侧呼出 AI 助教解析当前题。
