# Border Radius Specialist
# ボーダーラジアススペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 204.1–204.5 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 shape scale, consistency rules, component mapping |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 204.1 — MD3 Shape Scale

| Shape | Radius | Flutter |
|-------|--------|--------|
| None | 0dp | `BorderRadius.zero` |
| Extra Small | 4dp | `BorderRadius.circular(4)` |
| Small | 8dp | `BorderRadius.circular(8)` |
| Medium | 12dp | `BorderRadius.circular(12)` |
| Large | 16dp | `BorderRadius.circular(16)` |
| Extra Large | 28dp | `BorderRadius.circular(28)` |
| Full | 50% | `BorderRadius.circular(999)` |

### 204.2 — Component Type Mapping

| Component | Shape | Radius |
|-----------|-------|--------|
| Button | Full (pill) | `StadiumBorder()` |
| TextField | Extra Small | 4dp |
| Card | Medium | 12dp |
| Dialog | Extra Large | 28dp |
| Chip | Small | 8dp |
| FAB | Large | 16dp |
| FAB Extended | Large | 16dp |
| BottomSheet | Extra Large (top) | 28dp |
| Avatar | Full | `CircleBorder()` |
| Badge | Full | `StadiumBorder()` |

```dart
// ✅ MD3 shapes via ShapeBorder
Card(
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
)

ElevatedButton(
  style: ElevatedButton.styleFrom(shape: const StadiumBorder()),
  child: Text('Action'),
)
```

### 204.3 — Nested Radius Rule

Inner radius = outer radius - padding.

```dart
// ✅ Nested containers
Container(
  decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
  padding: const EdgeInsets.all(8),
  child: Container(
    decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),  // 16 - 8
  ),
)
```

### 204.4 — Consistency Rule

- ✅ Same component type = same radius everywhere
- ✅ Use `ThemeData.cardTheme`, `ThemeData.dialogTheme` for global consistency
- ❌ WRONG: Card with `BorderRadius.circular(12)` on one screen, `BorderRadius.circular(8)` on another
- ❌ WRONG: Arbitrary radius values not in MD3 scale (e.g., `BorderRadius.circular(7)`)

### 204.5 — Square Corners (When)

- Data tables: `BorderRadius.zero` for cells
- Full-width sections: no radius
- `Divider()`: no radius
