import 'package:flutter/material.dart';

class OAuthButtonRow extends StatelessWidget {
  const OAuthButtonRow({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildOAuthButton(
          tooltip: 'Google 账号登录',
          icon: const Text(
            'G',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF4285F4),
            ),
          ),
          onTap: () {},
        ),
        const SizedBox(width: 20),
        _buildOAuthButton(
          tooltip: 'GitHub 账号登录',
          icon: const Icon(
            Icons.terminal_rounded,
            size: 22,
            color: Color(0xFF24292E),
          ),
          onTap: () {},
        ),
        const SizedBox(width: 20),
        _buildOAuthButton(
          tooltip: '微信快捷登录',
          icon: const Icon(
            Icons.chat_bubble_outline_rounded,
            size: 20,
            color: Color(0xFF07C160),
          ),
          onTap: () {},
        ),
      ],
    );
  }

  Widget _buildOAuthButton({
    required String tooltip,
    required Widget icon,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withAlpha(200),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFDFD5CA), width: 1.0),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(10),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: icon,
        ),
      ),
    );
  }
}
