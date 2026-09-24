# P1 - 励志登录与用户认证设计

## 1. 接口与契约设计
- `AppException`: 领域统一异常基类（如 `AuthException`）。
- `AuthRepository`:
  - `Future<void> loginWithCode(String target, String code)`
  - `Future<void> loginWithPassword(String target, String password)`
  - `Future<void> sendCode(String target)`

## 2. 状态设计 (Riverpod)
- `AuthState`:
  - `bool isAuthenticated`
  - `bool isLoading`
  - `String? errorMessage`
- `authNotifierProvider`: `NotifierProvider<AuthNotifier, AuthState>`

## 3. UI 规范
- **背景层**：`assets/logo.png`，`BoxFit.cover`。
- **毛玻璃卡片**：
  - 宽度：`400dp`，内边距 `32dp`，圆角 `24dp`。
  - 材质：`BackdropFilter(sigma: 16)`，背景 `Color(0xCCFFFDF9)`。
  - 轮廓线：`Border.all(color: Colors.white.withOpacity(0.65), width: 1.5)`。
  - 阴影：`BoxShadow(color: Color(0x1F2C2623), blurRadius: 24, offset: Offset(0, 12))`。
- **色彩与字体**：
  - 主标题：深墨蓝 `#204374`，22sp Bold。
  - 副标题：暖灰褐 `#6E6259`，13sp。
  - 主操作按钮：晨曦双色渐变 `LinearGradient(colors: [Color(0xFFE67E22), Color(0xFFF39C12)])`。
  - 禁用/次要文字：`outline`、`onSurfaceVariant`。
- **动效**：按钮按压 `AnimatedScale(scale: 0.98, duration: 90ms)`。所有动效 <= 400ms。禁止使用任何 Emoji。
