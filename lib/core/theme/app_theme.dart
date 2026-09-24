import 'package:flutter/material.dart';
import 'semantic_colors.dart';

class AppTheme {
  static ThemeData get warmAmber {
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: Color(0xFFE07B39),
      onPrimary: Color(0xFFFFFFFF),
      primaryContainer: Color(0xFFFFF3E8),
      onPrimaryContainer: Color(0xFF8C3B07),
      secondary: Color(0xFF765840),
      onSecondary: Color(0xFFFFFFFF),
      secondaryContainer: Color(0xFFFFDDBF),
      onSecondaryContainer: Color(0xFF2B1704),
      error: Color(0xFFD4453A),
      onError: Color(0xFFFFFFFF),
      errorContainer: Color(0xFFFBECEB),
      onErrorContainer: Color(0xFF410002),
      surface: Color(0xFFFFFDF9),
      onSurface: Color(0xFF3D2C1E),
      onSurfaceVariant: Color(0xFF7C6B5D),
      outline: Color(0xFFB0A395),
      outlineVariant: Color(0xFFE8DDD2),
      surfaceContainerLowest: Color(0xFFFFFBF5),
      surfaceContainerLow: Color(0xFFFFF8F0),
      surfaceContainer: Color(0xFFFFF5EC),
      surfaceContainerHigh: Color(0xFFFFF0E5),
      surfaceContainerHighest: Color(0xFFFFECE0),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.surfaceContainerLowest,
      cardTheme: CardTheme(
        color: colorScheme.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: colorScheme.outlineVariant),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surfaceContainerLowest,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: TextStyle(
          color: colorScheme.onSurface,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: colorScheme.surfaceContainerLowest,
        selectedIconTheme: IconThemeData(color: colorScheme.primary),
        unselectedIconTheme: IconThemeData(color: colorScheme.onSurfaceVariant),
        selectedLabelTextStyle: TextStyle(
          color: colorScheme.primary,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelTextStyle: TextStyle(
          color: colorScheme.onSurfaceVariant,
        ),
        indicatorColor: colorScheme.primaryContainer,
      ),
      extensions: const [
        SemanticColors.standard,
      ],
    );
  }
}
