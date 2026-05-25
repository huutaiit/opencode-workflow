# Locale Number & Currency Specialist
# ロケール数値・通貨スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 253.1–253.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Number formatting, currency, negative numbers, 万/億 |
| **Activation Trigger** | Numeric display, currency formatting |
| **Complements** | 254.x financial-compliance |

---

## Rules

### 253.1 — Number Formatting

```dart
import 'package:intl/intl.dart';

// ✅ Locale-aware formatting
NumberFormat('#,###', 'ja').format(1234567)  // JP: 1,234,567
NumberFormat('#.###', 'vi').format(1234567)  // VN: 1.234.567
```

### 253.2 — Currency Display

```dart
// ✅ Currency formatting
NumberFormat.currency(locale: 'ja', symbol: '¥', decimalDigits: 0).format(1234567)  // ¥1,234,567
NumberFormat.currency(locale: 'vi', symbol: '₫', decimalDigits: 0).format(1234567)  // 1.234.567₫
```

### 253.3 — Negative Numbers (JP Financial)

```dart
String formatJPFinancial(num value) {
  if (value < 0) return '△${NumberFormat('#,###', 'ja').format(value.abs())}';
  return NumberFormat('#,###', 'ja').format(value);
}
```

- ✅ Use △ (U+25B3) for JP financial negatives
- ❌ NEVER use parentheses for JP financial negatives — that is US/VN convention
- ❌ NEVER hardcode comma as thousands separator — use `NumberFormat`

### 253.4 — 万/億 Grouping

```dart
String formatJPLargeNumber(num value) {
  final oku = value ~/ 100000000;
  final man = (value % 100000000) ~/ 10000;
  final rem = value % 10000;
  final parts = <String>[];
  if (oku > 0) parts.add('${oku}億');
  if (man > 0) parts.add('${NumberFormat('#,###', 'ja').format(man)}万');
  if (rem > 0 || parts.isEmpty) parts.add(NumberFormat('#,###', 'ja').format(rem));
  return parts.join('');
}
```

### 253.5 — Reusable Formatters

```dart
// ✅ Create once, reuse
final jpNumber = NumberFormat('#,###', 'ja');
final jpCurrency = NumberFormat.currency(locale: 'ja', symbol: '¥', decimalDigits: 0);
final jpPercent = NumberFormat.percentPattern('ja');
```
