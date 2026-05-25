# Elevation & Shadow Specialist
# エレベーション＆シャドウスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 203.1–203.6 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 elevation scale, tonal elevation, shadow handling |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 203.1 — MD3 Elevation Scale

| Level | dp | Use | Widget |
|-------|-----|-----|--------|
| 0 | 0 | Surface content | — |
| 1 | 1 | Cards, raised surface | `Card(elevation: 1)` |
| 2 | 3 | FAB (resting) | `FloatingActionButton()` |
| 3 | 6 | Navigation drawer, modal bottom sheet | `NavigationDrawer()` |
| 4 | 8 | — | — |
| 5 | 12 | Dialog, full-screen dialog | `AlertDialog()` |

```dart
// ✅ Material widget with elevation
Card(elevation: 1, child: ...)
Material(elevation: 3, child: ...)

// ❌ WRONG: Arbitrary elevation values
Card(elevation: 7)  // → not in MD3 scale
```

### 203.2 — Tonal Elevation (Dark Mode)

MD3 uses surface tint (color overlay) instead of shadows in dark mode.

```dart
// ✅ MD3 handles tonal elevation automatically
// In dark mode: higher elevation = lighter surface tint
// Card(elevation: 1) → subtle primary tint overlay
// Dialog(elevation: 5) → more visible primary tint overlay

// ✅ Surface tint color from ColorScheme
Theme.of(context).colorScheme.surfaceTint  // Used for tonal overlay
```

### 203.3 — Dark Mode Shadow Handling

```dart
// ✅ MD3 dark mode: shadows become invisible — tonal elevation takes over
// No manual intervention needed — Material widgets handle automatically

// ❌ WRONG: Adding BoxShadow in dark mode — invisible on dark backgrounds
```

### 203.4 — Card Elevation Pattern

```dart
// ✅ Standard card
Card(
  elevation: 1,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  child: Padding(
    padding: const EdgeInsets.all(16),
    child: content,
  ),
)

// ✅ Outlined card (no elevation)
Card(
  elevation: 0,
  shape: RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(12),
    side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
  ),
)
```

### 203.5 — Input Focus Elevation

```dart
// ✅ Focus ring via InputDecoration (built-in)
// TextField automatically handles focus appearance via InputDecoration
// No manual elevation change needed for input focus
```

### 203.6 — Print Shadow

- Remove all elevation for print: use outlined cards
- BoxShadow don't render on paper
