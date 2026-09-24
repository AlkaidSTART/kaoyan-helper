import 'package:flutter/material.dart';

@immutable
class SemanticColors extends ThemeExtension<SemanticColors> {
  final Color success;
  final Color successContainer;
  final Color warning;
  final Color warningContainer;
  final Color danger;
  final Color dangerContainer;

  // 学科专属色
  final Color politics;
  final Color politicsContainer;
  final Color politicsText;

  final Color english;
  final Color englishContainer;
  final Color englishText;

  final Color math;
  final Color mathContainer;
  final Color mathText;

  final Color major;
  final Color majorContainer;
  final Color majorText;

  const SemanticColors({
    required this.success,
    required this.successContainer,
    required this.warning,
    required this.warningContainer,
    required this.danger,
    required this.dangerContainer,
    required this.politics,
    required this.politicsContainer,
    required this.politicsText,
    required this.english,
    required this.englishContainer,
    required this.englishText,
    required this.math,
    required this.mathContainer,
    required this.mathText,
    required this.major,
    required this.majorContainer,
    required this.majorText,
  });

  static const standard = SemanticColors(
    success: Color(0xFF2E9E6E),
    successContainer: Color(0xFFEAF5F0),
    warning: Color(0xFFD4912A),
    warningContainer: Color(0xFFFBF4EA),
    danger: Color(0xFFD4453A),
    dangerContainer: Color(0xFFFBECEB),
    politics: Color(0xFFC84630),
    politicsContainer: Color(0xFFFDF0EE),
    politicsText: Color(0xFF932917),
    english: Color(0xFF2B5C8F),
    englishContainer: Color(0xFFEEF4FB),
    englishText: Color(0xFF1A4068),
    math: Color(0xFF1E7E88),
    mathContainer: Color(0xFFEBF7F8),
    mathText: Color(0xFF135961),
    major: Color(0xFF2E7D5B),
    majorContainer: Color(0xFFEEF7F2),
    majorText: Color(0xFF1D5A40),
  );

  @override
  SemanticColors copyWith({
    Color? success,
    Color? successContainer,
    Color? warning,
    Color? warningContainer,
    Color? danger,
    Color? dangerContainer,
    Color? politics,
    Color? politicsContainer,
    Color? politicsText,
    Color? english,
    Color? englishContainer,
    Color? englishText,
    Color? math,
    Color? mathContainer,
    Color? mathText,
    Color? major,
    Color? majorContainer,
    Color? majorText,
  }) {
    return SemanticColors(
      success: success ?? this.success,
      successContainer: successContainer ?? this.successContainer,
      warning: warning ?? this.warning,
      warningContainer: warningContainer ?? this.warningContainer,
      danger: danger ?? this.danger,
      dangerContainer: dangerContainer ?? this.dangerContainer,
      politics: politics ?? this.politics,
      politicsContainer: politicsContainer ?? this.politicsContainer,
      politicsText: politicsText ?? this.politicsText,
      english: english ?? this.english,
      englishContainer: englishContainer ?? this.englishContainer,
      englishText: englishText ?? this.englishText,
      math: math ?? this.math,
      mathContainer: mathContainer ?? this.mathContainer,
      mathText: mathText ?? this.mathText,
      major: major ?? this.major,
      majorContainer: majorContainer ?? this.majorContainer,
      majorText: majorText ?? this.majorText,
    );
  }

  @override
  SemanticColors lerp(ThemeExtension<SemanticColors>? other, double t) {
    if (other is! SemanticColors) return this;
    return SemanticColors(
      success: Color.lerp(success, other.success, t)!,
      successContainer: Color.lerp(successContainer, other.successContainer, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningContainer: Color.lerp(warningContainer, other.warningContainer, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerContainer: Color.lerp(dangerContainer, other.dangerContainer, t)!,
      politics: Color.lerp(politics, other.politics, t)!,
      politicsContainer: Color.lerp(politicsContainer, other.politicsContainer, t)!,
      politicsText: Color.lerp(politicsText, other.politicsText, t)!,
      english: Color.lerp(english, other.english, t)!,
      englishContainer: Color.lerp(englishContainer, other.englishContainer, t)!,
      englishText: Color.lerp(englishText, other.englishText, t)!,
      math: Color.lerp(math, other.math, t)!,
      mathContainer: Color.lerp(mathContainer, other.mathContainer, t)!,
      mathText: Color.lerp(mathText, other.mathText, t)!,
      major: Color.lerp(major, other.major, t)!,
      majorContainer: Color.lerp(majorContainer, other.majorContainer, t)!,
      majorText: Color.lerp(majorText, other.majorText, t)!,
    );
  }
}
