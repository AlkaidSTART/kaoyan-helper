import 'package:flutter/material.dart';

class SunriseSubmitButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;

  const SunriseSubmitButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
  });

  @override
  State<SunriseSubmitButton> createState() => _SunriseSubmitButtonState();
}

class _SunriseSubmitButtonState extends State<SunriseSubmitButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isEnabled = widget.onPressed != null && !widget.isLoading;

    return MouseRegion(
      cursor: isEnabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      child: GestureDetector(
        onTapDown: isEnabled ? (_) => setState(() => _isPressed = true) : null,
        onTapUp: isEnabled ? (_) => setState(() => _isPressed = false) : null,
        onTapCancel: isEnabled
            ? () => setState(() => _isPressed = false)
            : null,
        onTap: isEnabled ? widget.onPressed : null,
        child: AnimatedScale(
          scale: _isPressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 90),
          curve: Curves.easeOut,
          child: Container(
            height: 48,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: isEnabled
                  ? const LinearGradient(
                      colors: [
                        Color(0xFFE67E22), // 晨曦朝阳深橙
                        Color(0xFFF39C12), // 晨曦朝阳金橙
                      ],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    )
                  : const LinearGradient(
                      colors: [Color(0xFFDFD5CA), Color(0xFFEADFD4)],
                    ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: isEnabled
                  ? [
                      BoxShadow(
                        color: const Color(0xFFE67E22).withAlpha(60),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            alignment: Alignment.center,
            child: widget.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(
                    widget.text,
                    style: TextStyle(
                      color: isEnabled ? Colors.white : const Color(0xFF7C6B5D),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
