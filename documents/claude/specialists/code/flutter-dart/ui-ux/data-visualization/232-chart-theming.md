# Chart Theming Specialist
# チャートテーミングスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 232.1–232.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Chart axis, tooltip, legend, responsive sizing, dark mode colors |
| **Activation Trigger** | Chart styling, visualization theming |
| **Complements** | 200.x color-system, 230.x chart-types |

---

## Rules

### 232.1 — Axis Colors from Theme

```dart
// ✅ Derive chart colors from theme
final colorScheme = Theme.of(context).colorScheme;
FlLine(color: colorScheme.outlineVariant)          // grid lines
FlLine(color: colorScheme.onSurfaceVariant)        // axis
```

### 232.2 — Tooltip Styling

```dart
// ✅ Custom tooltip
LineTouchData(
  touchTooltipData: LineTouchTooltipData(
    getTooltipColor: (_) => colorScheme.surfaceContainerHighest,
    tooltipBorder: BorderSide(color: colorScheme.outlineVariant),
    tooltipRoundedRadius: 8,
    getTooltipItems: (spots) => spots.map((spot) =>
      LineTooltipItem(spot.y.toString(), TextStyle(color: colorScheme.onSurface, fontSize: 12)),
    ).toList(),
  ),
)
```

### 232.3 — Legend Layout

- Desktop: horizontal, above chart
- Mobile: below chart, scrollable if >5 items
- Max 8 visible items

### 232.4 — Responsive Chart Container

```dart
// ✅ Responsive container
LayoutBuilder(
  builder: (context, constraints) => SizedBox(
    height: constraints.maxWidth > 600 ? 400 : 240,
    child: chart,
  ),
)
```

### 232.5 — Dark Mode Chart Colors

Same palette shift as web — lighter colors for dark backgrounds.
Derive from `ColorScheme` — auto-adjusts for brightness.

### 232.6 — Theme Integration

```dart
// ✅ Single source of truth from Theme
final chartColors = [
  colorScheme.primary,
  colorScheme.secondary,
  colorScheme.tertiary,
  colorScheme.error,
  colorScheme.primaryContainer,
];
```

- ✅ Re-build chart on theme change (automatic with `Theme.of(context)`)
- ❌ NEVER hardcode chart colors independent of theme
