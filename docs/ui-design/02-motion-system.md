# 动效系统规范 (Motion System)

> 原则：克制、快速、反馈明确。严禁冗长回弹与超过 400ms 的炫技动效。

---

## 1. 动效时长与曲线分级 (Duration & Curve Tokens)

| 分级 | 时长 Token | 数值 | 推荐曲线 | 适用场景 |
|---|---|---|---|---|
| **快速 (Fast)** | `durationFast` | 100ms ~ 150ms | `Curves.ease` | 按钮点击微缩放、复选框/单选勾选 |
| **标准 (Standard)**| `durationBase` | 200ms ~ 250ms | `Curves.easeOut` | 侧栏展开折叠、抽屉滑入、选项状态判定 |
| **强调 (Emphasis)**| `durationSlow` | 300ms ~ 400ms | `Curves.easeInOut` | 页面切换 (Fade-through)、闪卡 3D 翻面、弹窗进出 |

> **硬性上限**：任何 UI 交互动效不得超过 400ms。

---

## 2. 核心微交互规范

### 2.1 按钮按压 (Press Feedback)
- 组件：`AnimatedScale`
- 参数：`scale: 0.98`，时长 `100ms`，释放后回弹 `100ms`。
- 效果：提供轻量实体物理按压反馈，免除突兀闪烁。

### 2.2 做题选项判定反馈 (Quiz Feedback)

#### 正确答案反馈：
1. 边框与背景色由 `outlineVariant` 在 150ms 内平滑过渡为 `success` 浅绿底 (`#EAF5F0`)。
2. 伴随 `AnimatedScale` 微弹：`1.0 -> 1.02 -> 1.0`（总耗时 200ms）。

#### 错误答案反馈：
1. 边框变红 (`danger`)。
2. 选项卡片触发**横向微颤**（Shake Animation）：
   - 振幅：`±4px`
   - 周期：`3 次`
   - 总耗时：`180ms`
   - 纯 Flutter 原生实现（`TweenAnimationBuilder` 或轻量 `AnimationController`）：

```dart
// 错误振动动画实现
Animation<double> createShakeAnimation(AnimationController controller) {
  return TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 0.0, end: -4.0), weight: 1),
    TweenSequenceItem(tween: Tween(begin: -4.0, end: 4.0), weight: 2),
    TweenSequenceItem(tween: Tween(begin: 4.0, end: -3.0), weight: 2),
    TweenSequenceItem(tween: Tween(begin: -3.0, end: 2.0), weight: 2),
    TweenSequenceItem(tween: Tween(begin: 2.0, end: 0.0), weight: 1),
  ]).animate(CurvedAnimation(parent: controller, curve: Curves.linear));
}
```

### 2.3 闪卡 3D 翻转与离场 (Flashcard Flip & Exit)

1. **点击翻面**：
   - 使用 `Transform` + `Matrix4.identity()..setEntry(3, 2, 0.001)..rotateY(angle)`。
   - 翻转耗时：`400ms`，曲线 `Curves.easeInOut`。
   - 在 `angle = pi/2` 时切换正背面组件渲染，避免镜像伪影。
2. **评级离场 (忘记 / 模糊 / 牢记)**：
   - 评级触发后卡片不二次翻回，直接触发滑出：
     - 牢记 (1)：卡片向右滑出 `SlideTransition(dx: 1.2)` + `FadeTransition(0.0)`，耗时 `200ms`。
     - 忘记 (3)：卡片向左滑出 `SlideTransition(dx: -1.2)` + `FadeTransition(0.0)`，耗时 `200ms`。
   - 下一张卡片淡入无缝补位。

### 2.4 数字滚动动效 (Number Ticker)
- 看板答题数、连续打卡天数、倒计时等核心数字变动：
- 使用 Flutter 原生 `TweenAnimationBuilder<int>`：
  - 时长：`350ms`
  - 曲线：`Curves.easeOutCubic`
  - 避免引入第三方重型包。

```dart
TweenAnimationBuilder<int>(
  tween: IntTween(begin: 0, end: targetCount),
  duration: const Duration(milliseconds: 350),
  curve: Curves.easeOutCubic,
  builder: (context, val, child) => Text('$val', style: textStyle),
);
```

---

## 3. 布局与容器过渡

### 3.1 NavigationRail 展开/折叠
- 桌面侧栏宽度切换（`72px <-> 240px`）。
- 采用 `AnimatedContainer`，时长 `200ms`，曲线 `Curves.easeOut`。

### 3.2 AI 助教面板滑入
- 桌面侧边面板宽度由 `0 -> 400px`。
- 采用 `AnimatedContainer`，时长 `250ms`，曲线 `Curves.easeOut`。

### 3.3 路由页面过渡
- 统一使用 `CustomTransitionPage` 实现 `FadeTransition`：
  - 时长：`300ms`
  - 严禁全屏左右滑动手势切页（桌面端与平板端避免手势冲突）。

---

## 4. 无障碍动效减弱 (Reduced Motion)

全工程必须响应系统"减弱动态效果"选项：

```dart
Duration accessibleDuration(BuildContext context, Duration normal) {
  final reduce = MediaQuery.maybeOf(context)?.accessibilityFeatures.reduceMotion ?? false;
  return reduce ? Duration.zero : normal;
}
```
凡检测到 `reduceMotion == true`，所有动画时长归零，瞬间切态。
