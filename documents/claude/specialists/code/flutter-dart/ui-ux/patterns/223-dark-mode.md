# Dark Mode Specialist
# ダークモードスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 223.1–223.6 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 brightness, tonal elevation, image treatment |
| **Activation Trigger** | dark mode, dark theme, brightness, theme switching |
| **Complements** | 200.x color-system, 203.x elevation-shadow |

---

## Rules

### 223.1 — MD3 Dark Theme

```dart
// ✅ Automatic dark palette from seed
MaterialApp(
  theme: ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: seedColor, brightness: Brightness.light),
    useMaterial3: true,
  ),
  darkTheme: ThemeData(
    colorScheme: ColorScheme.fromSeed(seedColor: seedColor, brightness: Brightness.dark),
    useMaterial3: true,
  ),
  themeMode: ThemeMode.system,  // Auto light/dark
)
```

### 223.2 — Tonal Elevation (No Shadows in Dark)

MD3 dark mode: elevation = lighter surface tint, NOT shadow.

| Elevation | Light | Dark |
|-----------|-------|------|
| 0 | surface | surface |
| 1 | surface + shadow | surfaceContainerLow (lighter tint) |
| 3 | surface + shadow | surfaceContainer |
| 6 | surface + shadow | surfaceContainerHigh |

### 223.3 — Text Colors

```dart
// ✅ Use ColorScheme roles — auto-adjust for dark
Text('Primary', style: TextStyle(color: colorScheme.onSurface))
Text('Secondary', style: TextStyle(color: colorScheme.onSurfaceVariant))

// ❌ WRONG: Pure white text
TextStyle(color: Colors.white)  // → too bright on dark surface
```

### 223.4 — Image Treatment

```dart
// ✅ Reduce image brightness in dark mode
ColorFiltered(
  colorFilter: isDark
    ? const ColorFilter.matrix([0.85, 0, 0, 0, 0, 0, 0.85, 0, 0, 0, 0, 0, 0.85, 0, 0, 0, 0, 0, 1, 0])
    : const ColorFilter.mode(Colors.transparent, BlendMode.multiply),
  child: Image.asset('photo.jpg'),
)
```

### 223.5 — Shadow in Dark Mode

MD3 handles automatically — Material widgets use tonal elevation in dark.

### 223.6 — Theme Persistence

```dart
// ✅ Save theme preference
final themeMode = ref.watch(themeModeProvider);  // Riverpod
// or SharedPreferences for persistence
```
