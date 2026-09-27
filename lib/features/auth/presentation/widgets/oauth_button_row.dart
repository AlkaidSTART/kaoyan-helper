import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class OAuthButtonRow extends StatelessWidget {
  const OAuthButtonRow({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildOAuthButton(
          tooltip: 'Google 账号登录',
          icon: const FaIcon(
            FontAwesomeIcons.google,
            size: 22,
            color: Color(0xFF4285F4),
          ),
          onTap: () {},
        ),
        const SizedBox(width: 20),
        _buildOAuthButton(
          tooltip: 'GitHub 账号登录',
          icon: const FaIcon(
            FontAwesomeIcons.github,
            size: 24,
            color: Color(0xFF24292E),
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
