# Spacing Scale Specialist
# スペーシングスケールスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 201.1–201.6 |
| **Specialist Type** | rule-set |
| **Purpose** | 4dp base grid, spacing scale, density modes, touch target spacing |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 201.1 — 4dp Base Grid

ALL spacing = multiples of 4dp.

```dart
// ✅ Flutter EdgeInsets (4dp base)
const EdgeInsets.all(16)        // 4×4 = 16dp
const EdgeInsets.all(12)        // 4×3 = 12dp
const EdgeInsets.symmetric(horizontal: 24, vertical: 16)

// ✅ SizedBox for spacing
const SizedBox(height: 8)      // vertical spacer
const SizedBox(width: 12)      // horizontal spacer

// ❌ WRONG: Non-4dp values
const EdgeInsets.all(13)        // → not 4dp multiple
const SizedBox(height: 7)      // → not 4dp multiple
```

### 201.2 — Scale Definition

| Token | dp | Flutter |
|-------|-----|--------|
| xxs | 4 | `EdgeInsets.all(4)` |
| xs | 8 | `EdgeInsets.all(8)` |
| sm | 12 | `EdgeInsets.all(12)` |
| md | 16 | `EdgeInsets.all(16)` |
| lg | 24 | `EdgeInsets.all(24)` |
| xl | 32 | `EdgeInsets.all(32)` |
| xxl | 48 | `EdgeInsets.all(48)` |

### 201.3 — Section Spacing

| Context | Spacing | Implementation |
|---------|---------|---------------|
| Related items | 4–8dp | `SizedBox(height: 4)` or `SizedBox(height: 8)` |
| Siblings | 12–16dp | `SizedBox(height: 12)` |
| Sections | 24–32dp | `SizedBox(height: 24)` |
| Page padding | 16–24dp | `Padding(padding: EdgeInsets.all(16))` |
| Card padding | 16–24dp | `Padding(padding: EdgeInsets.all(16))` |

```dart
// ✅ Consistent section spacing
Column(
  children: [
    _buildSection1(),
    const SizedBox(height: 24),
    _buildSection2(),
    const SizedBox(height: 24),
    _buildSection3(),
  ],
)
```

### 201.4 — Density Modes

| Mode | Scale | Use Case |
|------|-------|---------|
| Compact | ×0.75 | Data tables, admin |
| Comfortable | ×1.0 | Standard layouts |
| Spacious | ×1.25 | Public-facing |

```dart
// ✅ VisualDensity for density control
ThemeData(
  visualDensity: VisualDensity.compact,  // or .comfortable, .standard
)
```

### 201.5 — Touch Target Spacing

- Minimum 8dp gap between interactive elements
- Touch target minimum: 48×48dp (MD3 standard)

```dart
// ✅ Adequate touch target
SizedBox(
  width: 48, height: 48,
  child: IconButton(icon: Icon(Icons.close), onPressed: onClose),
)

// ❌ WRONG: No minimum size constraint
IconButton(iconSize: 16, icon: Icon(Icons.close), onPressed: onClose)
```

### 201.6 — Responsive Spacing

| Window Class | Content Padding | Body Max Width |
|-------------|----------------|---------------|
| Compact (<600dp) | 16dp | 100% |
| Medium (600–840dp) | 24dp | 840dp |
| Expanded (>840dp) | 24dp | 1200dp |

```dart
// ✅ Responsive padding
Padding(
  padding: EdgeInsets.symmetric(
    horizontal: MediaQuery.sizeOf(context).width > 600 ? 24 : 16,
  ),
)
```
