# Locale Date & Calendar Specialist
# ロケール日付・カレンダースペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 252.1–252.7 |
| **Specialist Type** | code |
| **Purpose** | Date formatting, era year, fiscal year, holidays, timezone |
| **Activation Trigger** | Date display, calendar, fiscal period |
| **Complements** | 253.x number-currency |

---

## Rules

### 252.1 — Date Formatting (intl package)

```dart
import 'package:intl/intl.dart';

// ✅ JP date format
DateFormat('yyyy年MM月dd日', 'ja').format(date)  // 2026年04月05日
DateFormat('yyyy/MM/dd', 'ja').format(date)       // 2026/04/05

// ✅ VN date format
DateFormat('dd/MM/yyyy', 'vi').format(date)       // 05/04/2026
```

- ❌ NEVER use MM/dd/yyyy (US format)

### 252.2 — Era Year (和暦)

```dart
String toWareki(DateTime date) {
  final year = date.year;
  if (year >= 2019) return '令和${year - 2018}年';
  if (year >= 1989) return '平成${year - 1988}年';
  return '昭和${year - 1925}年';
}
```

### 252.3 — Fiscal Year

```dart
int getJPFiscalYear(DateTime date) =>
  date.month >= 4 ? date.year : date.year - 1;
```

### 252.4 — Date Picker Locale

```dart
// ✅ Localized DatePicker
showDatePicker(
  context: context,
  locale: const Locale('ja'),
  firstDate: DateTime(2020),
  lastDate: DateTime(2030),
)
```

### 252.5 — Timezone

Store UTC, display in user timezone. Use `timezone` package for JP (UTC+9) and VN (UTC+7).

### 252.6 — Date Range

JP uses 〜 (U+301C): `2026年4月1日 〜 2027年3月31日`
VN uses -: `01/04/2026 - 31/03/2027`
