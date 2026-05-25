# Visual Hierarchy Specialist
# ビジュアルヒエラルキースペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 226.1–226.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Spacing rhythm, alignment, action hierarchy, content density |
| **Activation Trigger** | visual hierarchy, whitespace, spacing, alignment, density |
| **Complements** | 201.x spacing-scale, 202.x typography-scale |

---

## Rules

### 226.1 — Whitespace Rhythm

| Relationship | dp | Widget |
|-------------|-----|--------|
| Inline | 4–8 | `SizedBox(width: 4)` |
| Intra-group | 12–16 | `SizedBox(height: 12)` |
| Inter-group | 24–32 | `SizedBox(height: 24)` |
| Section | 48–64 | `SizedBox(height: 48)` |

### 226.2 — 8dp Grid

All spacing multiples of 8dp (4dp for fine adjustments).

- ❌ WRONG: Non-grid values like `EdgeInsets.all(13)` or `SizedBox(height: 7)`
- ❌ WRONG: All actions same visual weight (3 `FilledButton` in a row)

### 226.3 — Action Hierarchy (MD3 Buttons)

| Level | Button | Visual Weight |
|-------|--------|--------------|
| Primary | `FilledButton` | Highest — filled bg |
| Secondary | `OutlinedButton` | Medium — outlined |
| Tertiary | `TextButton` | Lowest — text only |

```dart
// ✅ Clear action hierarchy
Row(children: [
  TextButton(onPressed: onDelete, child: Text('Delete')),
  const SizedBox(width: 8),
  OutlinedButton(onPressed: onCancel, child: Text('Cancel')),
  const SizedBox(width: 8),
  FilledButton(onPressed: onSave, child: Text('Save')),
])
```

### 226.4 — Reading Flow

F-pattern for data-heavy. Left-aligned content by default.

### 226.5 — Density via VisualDensity

```dart
// ✅ Theme-level density
ThemeData(visualDensity: VisualDensity.compact)  // admin/data tables
ThemeData(visualDensity: VisualDensity.comfortable)  // default
ThemeData(visualDensity: VisualDensity.standard)  // spacious
```
