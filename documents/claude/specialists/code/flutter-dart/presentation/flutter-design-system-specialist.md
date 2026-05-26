# Flutter Design System Specialist
# Flutterデザインシステムスペシャリスト
# Chuyen Gia Design System Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Core |
| **Directory Pattern** | `lib/core/theme/`, `lib/core/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `app_{component}.dart` (core widgets), `app_spacing.dart`, `app_colors.dart`. Classes: `App{Name}` prefix for all shared components |
| **Imports From** | Core (theme tokens) |
| **Cannot Import** | Domain, Data, Features (design system is framework-level, not feature-level) |
| **Pattern Numbers** | 63.1–63.5 |
| **Source Paths** | `lib/core/theme/*.dart`, `lib/core/widgets/*.dart` |
| **File Count** | 5-10 token files + 10-20 shared component files per enterprise app |
| **Imported By** | ALL presentation widgets (shared components used across features) |
| **Dependencies** | None (Flutter SDK ThemeExtension) |
| **When To Use** | Building enterprise custom design system beyond raw Material 3 — branded components, semantic tokens |
| **Source Skeleton** | `lib/core/theme/app_spacing.dart`, `lib/core/theme/app_colors.dart`, `lib/core/widgets/app_button.dart`, `lib/core/widgets/app_text_field.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate enterprise design system with ThemeExtension tokens, semantic color system, typography scale, spacing grid, and branded component library |
| **Activation Trigger** | files: lib/core/theme/*.dart, lib/core/widgets/*.dart; keywords: designSystem, themeExtension, designToken, semanticColor, appButton, appTextField |

---

## Patterns

### Pattern 63.1: Design Tokens (ThemeExtension)

```dart
// lib/core/theme/app_spacing.dart
@immutable
class AppSpacing extends ThemeExtension<AppSpacing> {
  final double xs;
  final double sm;
  final double md;
  final double lg;
  final double xl;
  final double xxl;

  const AppSpacing({
    this.xs = 4, this.sm = 8, this.md = 16, this.lg = 24, this.xl = 32, this.xxl = 48,
  });

  @override
  AppSpacing copyWith({double? xs, double? sm, double? md, double? lg, double? xl, double? xxl}) {
    return AppSpacing(
      xs: xs ?? this.xs, sm: sm ?? this.sm, md: md ?? this.md,
      lg: lg ?? this.lg, xl: xl ?? this.xl, xxl: xxl ?? this.xxl,
    );
  }

  @override
  AppSpacing lerp(AppSpacing? other, double t) {
    if (other is! AppSpacing) return this;
    return AppSpacing(
      xs: lerpDouble(xs, other.xs, t)!, sm: lerpDouble(sm, other.sm, t)!,
      md: lerpDouble(md, other.md, t)!, lg: lerpDouble(lg, other.lg, t)!,
      xl: lerpDouble(xl, other.xl, t)!, xxl: lerpDouble(xxl, other.xxl, t)!,
    );
  }
}

// Register in ThemeData
ThemeData(
  useMaterial3: true,
  extensions: const [
    AppSpacing(),
    AppRadius(),
    AppShadows(),
  ],
)

// Usage
final spacing = Theme.of(context).extension<AppSpacing>()!;
Padding(padding: EdgeInsets.all(spacing.md), child: /* ... */)
```

### Pattern 63.2: Semantic Color System

```dart
// lib/core/theme/app_semantic_colors.dart
@immutable
class AppSemanticColors extends ThemeExtension<AppSemanticColors> {
  // Status colors
  final Color success;
  final Color successContainer;
  final Color warning;
  final Color warningContainer;
  final Color info;
  final Color infoContainer;

  // Surface hierarchy
  final Color surfaceSubtle;
  final Color surfaceElevated;

  // Text
  final Color textSubtle;
  final Color textDisabled;

  const AppSemanticColors({
    this.success = const Color(0xFF2E7D32),
    this.successContainer = const Color(0xFFE8F5E9),
    this.warning = const Color(0xFFED6C02),
    this.warningContainer = const Color(0xFFFFF3E0),
    this.info = const Color(0xFF0288D1),
    this.infoContainer = const Color(0xFFE1F5FE),
    this.surfaceSubtle = const Color(0xFFF5F5F5),
    this.surfaceElevated = const Color(0xFFFFFFFF),
    this.textSubtle = const Color(0xFF757575),
    this.textDisabled = const Color(0xFFBDBDBD),
  });

  // Dark mode variant
  static const dark = AppSemanticColors(
    success: Color(0xFF66BB6A),
    successContainer: Color(0xFF1B5E20),
    warning: Color(0xFFFFA726),
    warningContainer: Color(0xFFE65100),
    info: Color(0xFF29B6F6),
    infoContainer: Color(0xFF01579B),
    surfaceSubtle: Color(0xFF1E1E1E),
    surfaceElevated: Color(0xFF2C2C2C),
    textSubtle: Color(0xFFBDBDBD),
    textDisabled: Color(0xFF616161),
  );

  @override
  AppSemanticColors copyWith({/* ... */}) => /* ... */;
  @override
  AppSemanticColors lerp(AppSemanticColors? other, double t) => /* ... */;
}

// Usage
final colors = Theme.of(context).extension<AppSemanticColors>()!;
Container(
  color: colors.successContainer,
  child: Text('Approved', style: TextStyle(color: colors.success)),
)
```

### Pattern 63.3: Typography Scale

```dart
// lib/core/theme/app_text_styles.dart
class AppTextStyles {
  // Heading scale — based on 4px grid
  static const h1 = TextStyle(fontSize: 32, fontWeight: FontWeight.w700, height: 1.25);
  static const h2 = TextStyle(fontSize: 28, fontWeight: FontWeight.w600, height: 1.3);
  static const h3 = TextStyle(fontSize: 24, fontWeight: FontWeight.w600, height: 1.33);
  static const h4 = TextStyle(fontSize: 20, fontWeight: FontWeight.w500, height: 1.4);

  // Body scale
  static const bodyLarge = TextStyle(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5);
  static const bodyMedium = TextStyle(fontSize: 14, fontWeight: FontWeight.w400, height: 1.43);
  static const bodySmall = TextStyle(fontSize: 12, fontWeight: FontWeight.w400, height: 1.33);

  // Label scale
  static const labelLarge = TextStyle(fontSize: 14, fontWeight: FontWeight.w500, height: 1.43);
  static const labelMedium = TextStyle(fontSize: 12, fontWeight: FontWeight.w500, height: 1.33);
  static const labelSmall = TextStyle(fontSize: 11, fontWeight: FontWeight.w500, height: 1.45);

  // Caption
  static const caption = TextStyle(fontSize: 12, fontWeight: FontWeight.w400, height: 1.33, color: Color(0xFF757575));
}
```

### Pattern 63.4: Spacing/Sizing Constants

```dart
// 4px grid system
class AppDimensions {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;

  // Component-specific
  static const buttonHeight = 48.0;
  static const inputHeight = 56.0;
  static const cardRadius = 12.0;
  static const chipRadius = 8.0;
  static const avatarSizeSmall = 32.0;
  static const avatarSizeMedium = 48.0;
  static const avatarSizeLarge = 64.0;

  // Page padding
  static const pagePaddingH = 16.0;
  static const pagePaddingV = 24.0;
  static const pageEdgeInsets = EdgeInsets.symmetric(horizontal: pagePaddingH, vertical: pagePaddingV);
}
```

### Pattern 63.5: Custom Component Library

```dart
// lib/core/widgets/app_button.dart
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.filled,
    this.icon,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
        : Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
            Text(label),
          ]);

    return SizedBox(
      height: AppDimensions.buttonHeight,
      width: double.infinity,
      child: switch (variant) {
        AppButtonVariant.filled => FilledButton(onPressed: isLoading ? null : onPressed, child: child),
        AppButtonVariant.outlined => OutlinedButton(onPressed: isLoading ? null : onPressed, child: child),
        AppButtonVariant.text => TextButton(onPressed: isLoading ? null : onPressed, child: child),
      },
    );
  }
}

enum AppButtonVariant { filled, outlined, text }

// lib/core/widgets/app_text_field.dart
class AppTextField extends StatelessWidget {
  final String label;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final bool obscureText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final int maxLines;

  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.validator,
    this.keyboardType,
    this.obscureText = false,
    this.prefixIcon,
    this.suffixIcon,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboardType,
      obscureText: obscureText,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon) : null,
        suffixIcon: suffixIcon,
      ),
    );
  }
}

// Usage — consistent across entire app
AppButton(label: 'Save Contact', icon: Icons.save, onPressed: _onSave, isLoading: isSubmitting)
AppTextField(label: 'Email', controller: _emailController, validator: Validators.email, keyboardType: TextInputType.emailAddress, prefixIcon: Icons.email)
```

---

## MUST DO

- Use ThemeExtension for custom design tokens (not global constants)
- Prefix all shared widgets with `App` (AppButton, AppTextField, AppCard)
- Define semantic colors for status (success/warning/error/info)
- Use 4px grid system for spacing
- Support light + dark mode in all token definitions

## MUST NOT DO

- Hardcode colors in widgets (use Theme.of(context).extension<>())
- Create feature-specific design tokens (tokens are shared in core/)
- Skip dark mode support for custom tokens
- Use magic numbers for spacing (use AppDimensions constants)

---

## References

- [ThemeExtension](https://api.flutter.dev/flutter/material/ThemeExtension-class.html)
- [Material Design 3 Tokens](https://m3.material.io/foundations/design-tokens)
