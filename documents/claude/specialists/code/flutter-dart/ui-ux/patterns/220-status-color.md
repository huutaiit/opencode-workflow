# Status Color Specialist
# ステータスカラースペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 220.1–220.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Semantic status categories, badge/indicator patterns, color-blind safe |
| **Activation Trigger** | status color, badge, indicator, tag, semantic status |
| **Complements** | 200.x color-system, 206.x component-states |

---

## Rules

### 220.1 — Control Status

| Status | Color | Icon |
|--------|-------|------|
| Active | `Colors.green` | `Icons.check_circle` |
| Inactive | `colorScheme.onSurfaceVariant` | `Icons.remove_circle` |
| Disabled | `colorScheme.onSurface.withOpacity(0.38)` | `Icons.block` |

```dart
// ✅ Status chip with icon
Chip(
  avatar: Icon(Icons.check_circle, color: Colors.green, size: 18),
  label: Text('Active'),
  backgroundColor: Colors.green.withOpacity(0.1),
)
```

### 220.2–220.5 — Action, Workflow, User, AI Status

Same color mapping as web — use `Icon` + `Chip`/`Badge` widgets.

### 220.6 — Color-Blind Safe

- ✅ Every status uses icon + color + text label (triple redundancy)
- ❌ NEVER distinguish by hue alone
