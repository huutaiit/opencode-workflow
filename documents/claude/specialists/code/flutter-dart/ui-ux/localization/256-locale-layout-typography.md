# Locale Layout & Typography Specialist
# ロケールレイアウト・タイポグラフィスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 256.1–256.5 |
| **Specialist Type** | rule-set |
| **Purpose** | CJK text layout, column width, text wrapping, mixed-script |
| **Activation Trigger** | JP/VN text display, CJK layout |
| **Complements** | 202.x typography-scale, 250.x input-handling |

---

## Rules

### 256.1 — CJK Character Width

JP characters ~2× wider than Latin. Adjust widths:

```dart
// ✅ JP-aware column widths in DataTable
DataColumn(label: SizedBox(width: 200, child: Text('取引先名')))
DataColumn(label: SizedBox(width: 140, child: Text('ステータス')))
```

### 256.2 — Text Wrapping

```dart
// ✅ JP: don't break mid-word
Text(jpText, style: TextStyle(locale: Locale('ja')))  // Flutter handles CJK breaks

// ✅ VN: allow syllable breaks
Text(vnText, style: TextStyle(locale: Locale('vi'), height: 1.5))
```

### 256.3 — Line Height

```dart
// ✅ Relaxed line height for CJK/VN
Text(content, style: TextStyle(height: 1.6))  // JP
Text(content, style: TextStyle(height: 1.5))  // VN (diacritics)
```

### 256.4 — Table Alignment

- Numeric columns: right-aligned with `tabular-nums` (via `fontFeatures: [FontFeature.tabularFigures()]`)
- Short JP labels: center-aligned
- Long JP labels: left-aligned

- ❌ NEVER use `leading-tight` (height: 1.2) for body text with CJK/VN characters
- ❌ WRONG: Fixed narrow columns for JP text (`SizedBox(width: 100)` for 取引先名 → truncated)

### 256.5 — Mixed Content

```dart
// ✅ Set locale on Text for proper line breaking
Text('取引先ABCの情報', style: TextStyle(locale: Locale('ja')))
```
