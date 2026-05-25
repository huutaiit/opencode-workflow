# Color System Specialist
# カラーシステムスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 200.1–200.8 |
| **Specialist Type** | rule-set |
| **Purpose** | Semantic color roles, contrast rules, dark mode remapping, palette scale |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | material3-design-system (project override authority) |

---

## Rules

### 200.1 — Semantic Color Roles (MD3 ColorScheme)

Use `Theme.of(context).colorScheme` — NEVER raw hex in widgets.

```dart
// ✅ MD3 ColorScheme (29+ roles)
final colorScheme = Theme.of(context).colorScheme;

Container(
  color: colorScheme.primary,        // Primary actions
  child: Text('Label', style: TextStyle(color: colorScheme.onPrimary)),
)

// ✅ Seed-based color generation
ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF1677FF),
    brightness: Brightness.light,
  ),
  useMaterial3: true,
)

// ❌ WRONG: Hardcoded hex in widgets
Container(color: Color(0xFF1677FF))  // → use colorScheme.primary
```

### 200.2 — Contrast Rules (WCAG 2.2 AA)

| Requirement | Ratio | MD3 Mapping |
|------------|-------|-------------|
| Normal text | ≥4.5:1 | onSurface on surface |
| Large text | ≥3:1 | onSurfaceVariant on surfaceContainerHighest |
| UI components | ≥3:1 | outline on surface |
| Focus indicator | ≥3:1 | primary on surface |

- ❌ NEVER use `colorScheme.outline` text on `colorScheme.outlineVariant` bg

### 200.3 — Dark Mode Token Remapping

MD3 handles dark mode via `Brightness.dark` — automatic tone shift.

```dart
// ✅ MD3 dark mode
ThemeData(
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFF1677FF),
    brightness: Brightness.dark,  // Automatic dark palette
  ),
  useMaterial3: true,
)

// ✅ System preference detection
MaterialApp(
  themeMode: ThemeMode.system,  // auto light/dark
  theme: lightTheme,
  darkTheme: darkTheme,
)
```

- ❌ WRONG: Manual color inversion
- ❌ WRONG: Pure white text on dark — use `colorScheme.onSurface`

### 200.4 — Palette Scale (Tonal Palette)

MD3 generates 13 tones per color (0–100). Key tones:

| Tone | Light Use | Dark Use |
|------|----------|---------|
| 0 | — | onPrimary text |
| 10 | — | primary container bg |
| 40 | primary | — |
| 80 | — | primary |
| 90 | primaryContainer | — |
| 100 | onPrimary text | — |

### 200.5 — Status Colors

| Status | MD3 Role | Use |
|--------|---------|-----|
| Success | Custom `Colors.green` extended | Completed, approved |
| Warning | Custom `Colors.amber` extended | Attention needed |
| Error | `colorScheme.error` | Failed, rejected |
| Info | `colorScheme.primary` | Informational |
| Neutral | `colorScheme.onSurfaceVariant` | Disabled, inactive |

### 200.6 — Color-Blind Safety

- ✅ Always pair color with icon: `Icon(Icons.check_circle, color: successColor)`
- ✅ Use pattern/texture alongside color in charts
- ❌ NEVER use red/green as sole differentiator

### 200.7 — Surface Hierarchy (MD3 Surface Tint)

MD3 uses tonal elevation (surface tint) instead of shadows in dark mode.

| Level | Widget | Light | Dark |
|-------|--------|-------|------|
| 0 | Surface | surface | surface |
| 1 | Card | surfaceContainerLow | surfaceContainerLow |
| 2 | NavigationBar | surfaceContainer | surfaceContainer |
| 3 | Dialog | surfaceContainerHigh | surfaceContainerHigh |
| 5 | FAB | surfaceContainerHighest | surfaceContainerHighest |

### 200.8 — Brand Integration Rules

- Foundation sets structure — NOT specific colors
- Brand color = `ColorScheme.fromSeed(seedColor: brandColor)`
- ❌ NEVER put project-specific brand hex in this specialist
