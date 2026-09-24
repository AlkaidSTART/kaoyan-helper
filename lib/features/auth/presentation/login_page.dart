import 'package:flutter/material.dart';
import 'widgets/auth_glass_card.dart';

class LoginPage extends StatelessWidget {
  final VoidCallback? onLoginSuccess;

  const LoginPage({super.key, this.onLoginSuccess});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 840;

          if (isWide) {
            // 桌面端宽屏：全屏自习室摄影底图 + 右侧偏中避让悬浮毛玻璃卡片
            return Stack(
              fit: StackFit.expand,
              children: [
                // 背景图层 (左偏居中，完整露出左侧题干书堆与右侧晨曦)
                Image.asset(
                  'assets/logo.png',
                  fit: BoxFit.cover,
                  alignment: Alignment.centerLeft,
                ),

                // 悬浮认证卡片（右间距 80dp，垂直居中）
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 80.0),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(vertical: 24.0),
                      child: AuthGlassCard(onLoginSuccess: onLoginSuccess),
                    ),
                  ),
                ),
              ],
            );
          }

          // 移动端/窄屏：自适应居中或流式布局
          return Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                'assets/logo.png',
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
              ),
              Container(
                color: Colors.black.withAlpha(40), // 微弱暗色遮罩保可读性
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20.0),
                  child: AuthGlassCard(onLoginSuccess: onLoginSuccess),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
