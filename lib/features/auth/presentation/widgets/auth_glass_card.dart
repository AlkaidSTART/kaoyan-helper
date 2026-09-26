import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth_notifier.dart';
import 'oauth_button_row.dart';
import 'sunrise_button.dart';

class AuthGlassCard extends ConsumerStatefulWidget {
  final VoidCallback? onLoginSuccess;

  const AuthGlassCard({super.key, this.onLoginSuccess});

  @override
  ConsumerState<AuthGlassCard> createState() => _AuthGlassCardState();
}

class _AuthGlassCardState extends ConsumerState<AuthGlassCard>
    with SingleTickerProviderStateMixin {
  int _activeTab = 0; // 0: 验证码, 1: 密码
  final TextEditingController _targetController = TextEditingController();
  final TextEditingController _secretController = TextEditingController();
  bool _obscurePassword = true;
  bool _agreedToTerms = false;
  int _countdownSeconds = 0;

  late final AnimationController _shakeController;
  late final Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
    );

    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -4.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -4.0, end: 4.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 4.0, end: -3.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -3.0, end: 2.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 2.0, end: 0.0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shakeController, curve: Curves.linear));
  }

  @override
  void dispose() {
    _shakeController.dispose();
    _targetController.dispose();
    _secretController.dispose();
    super.dispose();
  }

  void _triggerShake() {
    _shakeController.forward(from: 0.0);
  }

  void _handleSendCode() async {
    final target = _targetController.text.trim();
    if (target.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('请输入邮箱地址')));
      _triggerShake();
      return;
    }
    final success = await ref
        .read(authNotifierProvider.notifier)
        .sendCode(target);
    if (success && mounted) {
      setState(() => _countdownSeconds = 60);
      _startCountdown();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('验证码已发送，请前往邮箱查收')));
    }
  }

  void _startCountdown() async {
    while (_countdownSeconds > 0 && mounted) {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        setState(() => _countdownSeconds--);
      }
    }
  }

  void _handleSubmit() async {
    final authState = ref.read(authNotifierProvider);
    if (authState.isLoading) return;

    if (!_agreedToTerms) {
      _triggerShake();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('请先勾选并同意服务协议与隐私政策')));
      return;
    }

    final target = _targetController.text.trim();
    final secret = _secretController.text.trim();

    if (target.isEmpty || secret.isEmpty) {
      _triggerShake();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_activeTab == 0 ? '请填写完整的邮箱与验证码' : '请填写邮箱与密码')),
      );
      return;
    }

    bool success = false;
    if (_activeTab == 0) {
      success = await ref
          .read(authNotifierProvider.notifier)
          .loginWithCode(target, secret);
    } else {
      success = await ref
          .read(authNotifierProvider.notifier)
          .loginWithPassword(target, secret);
    }

    if (success && mounted) {
      widget.onLoginSuccess?.call();
    } else if (mounted) {
      _triggerShake();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    return AnimatedBuilder(
      animation: _shakeAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_shakeAnimation.value, 0),
          child: child,
        );
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            width: 400,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
            decoration: BoxDecoration(
              color: const Color(0xCCFFFDF9), // 80% 暖白毛玻璃
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: Colors.white.withAlpha(165),
                width: 1.5,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1F2C2623),
                  blurRadius: 24,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 主副标题
                const Text(
                  '开启今日研途',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF204374), // 深墨蓝
                    letterSpacing: 0.5,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        '桌前书本已备齐，向上生长正当时',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF6E6259), // 暖灰褐
                        ),
                      ),
                    ),
                    InkWell(
                      borderRadius: BorderRadius.circular(6),
                      onTap: () {
                        // 后端仅支持邮箱验证码登录，此处预填示例邮箱与演示码便于联调。
                        setState(() {
                          _targetController.text = 'user@example.com';
                          _secretController.text = _activeTab == 0
                              ? '123456'
                              : 'password123';
                          _agreedToTerms = true;
                        });
                        ref.read(authNotifierProvider.notifier).clearError();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE67E22).withAlpha(25),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: const Color(0xFFE67E22).withAlpha(60),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.bolt_outlined,
                              size: 13,
                              color: Color(0xFFE67E22),
                            ),
                            SizedBox(width: 2),
                            Text(
                              '填入示例邮箱',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFE67E22),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Tab 切换：验证码登录 / 密码登录
                Container(
                  height: 38,
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3ECE4),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      _buildTabItem(title: '验证码登录', index: 0),
                      _buildTabItem(title: '密码登录', index: 1),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 错误提示条
                if (authState.errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFBECEB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFFD4453A).withAlpha(60),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.error_outline_rounded,
                          size: 16,
                          color: Color(0xFFD4453A),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            authState.errorMessage!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFD4453A),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // 邮箱输入框（后端仅支持邮箱验证码登录）
                _buildInputField(
                  controller: _targetController,
                  hintText: '考研备考邮箱',
                  icon: Icons.person_outline_rounded,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),

                // 密码或验证码输入框
                if (_activeTab == 0)
                  _buildCodeInputField()
                else
                  _buildPasswordInputField(),

                const SizedBox(height: 20),

                // 登录提交主按钮
                SunriseSubmitButton(
                  text: '进入自习室 · 开启专注',
                  isLoading: authState.isLoading,
                  onPressed: _handleSubmit,
                ),
                const SizedBox(height: 18),

                // 第三方快速登录分隔
                Row(
                  children: [
                    const Expanded(child: Divider(color: Color(0xFFDFD5CA))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0),
                      child: Text(
                        '快速登录',
                        style: TextStyle(
                          fontSize: 12,
                          color: const Color(0xFF6E6259).withAlpha(180),
                        ),
                      ),
                    ),
                    const Expanded(child: Divider(color: Color(0xFFDFD5CA))),
                  ],
                ),
                const SizedBox(height: 14),

                // 第三方图标
                const OAuthButtonRow(),
                const SizedBox(height: 16),

                // 协议勾选行
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 22,
                      height: 22,
                      child: Checkbox(
                        value: _agreedToTerms,
                        activeColor: const Color(0xFFE67E22),
                        onChanged: (val) {
                          setState(() => _agreedToTerms = val ?? false);
                        },
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '我已阅读并同意《服务协议》与《隐私政策》',
                        style: TextStyle(
                          fontSize: 11,
                          color: const Color(0xFF6E6259).withAlpha(200),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem({required String title, required int index}) {
    final isSelected = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (_activeTab != index) {
            setState(() {
              _activeTab = index;
              _secretController.clear();
              ref.read(authNotifierProvider.notifier).clearError();
            });
          }
        },
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Colors.black.withAlpha(12),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected
                  ? const Color(0xFF204374)
                  : const Color(0xFF7C6B5D),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(180),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDFD5CA), width: 1.5),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(fontSize: 14, color: Color(0xFF2C2623)),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFB0A395)),
          prefixIcon: Icon(icon, size: 18, color: const Color(0xFF7C6B5D)),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildCodeInputField() {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(180),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDFD5CA), width: 1.5),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _secretController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(fontSize: 14, color: Color(0xFF2C2623)),
              decoration: const InputDecoration(
                hintText: '6 位验证码',
                hintStyle: TextStyle(fontSize: 13, color: Color(0xFFB0A395)),
                prefixIcon: Icon(
                  Icons.shield_outlined,
                  size: 18,
                  color: Color(0xFF7C6B5D),
                ),
                counterText: '',
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: TextButton(
              onPressed: _countdownSeconds > 0 ? null : _handleSendCode,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                foregroundColor: const Color(0xFFE67E22),
              ),
              child: Text(
                _countdownSeconds > 0 ? '$_countdownSeconds 秒' : '获取验证码',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _countdownSeconds > 0
                      ? const Color(0xFFB0A395)
                      : const Color(0xFFE67E22),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordInputField() {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(180),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDFD5CA), width: 1.5),
      ),
      child: TextField(
        controller: _secretController,
        obscureText: _obscurePassword,
        style: const TextStyle(fontSize: 14, color: Color(0xFF2C2623)),
        decoration: InputDecoration(
          hintText: '请输入登录密码',
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFB0A395)),
          prefixIcon: const Icon(
            Icons.lock_outline_rounded,
            size: 18,
            color: Color(0xFF7C6B5D),
          ),
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
              size: 18,
              color: const Color(0xFF7C6B5D),
            ),
            onPressed: () =>
                setState(() => _obscurePassword = !_obscurePassword),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 12,
          ),
        ),
      ),
    );
  }
}
