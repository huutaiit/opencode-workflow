# Locale Encoding & Export Specialist
# ロケールエンコーディング・エクスポートスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 257.1–257.5 |
| **Specialist Type** | rule-set |
| **Purpose** | CSV/Excel encoding, BOM handling, file sharing |
| **Activation Trigger** | File export, CSV download, data export |
| **Complements** | 231.x bi-output, 253.x number-currency |

---

## Rules

### 257.1 — CSV Export with BOM

```dart
// ✅ UTF-8 with BOM for Excel compatibility
import 'dart:convert';
import 'dart:io';

Future<void> exportCSV(List<List<String>> data, String filename) async {
  final csv = data.map((row) =>
    row.map((cell) => '"${cell.replaceAll('"', '""')}"').join(',')
  ).join('\r\n');

  final bom = '\uFEFF';
  final file = File('${directory.path}/$filename');
  await file.writeAsString(bom + csv, encoding: utf8);

  await Share.shareFiles([file.path]);
}
```

- ✅ Always add BOM for CSV files intended for Excel
- ❌ NEVER export without BOM for JP Windows users

### 257.2 — PDF Export

Use `pdf` package with CJK font embedding (see 231.x).

### 257.3 — File Sharing

```dart
// ✅ Share via platform share sheet
import 'package:share_plus/share_plus.dart';
await Share.shareXFiles([XFile(filePath)], text: '月次レポート');
```

### 257.4 — Filename Encoding

```dart
// ✅ Safe filename (replace special chars)
String safeFilename(String name) =>
  name.replaceAll(RegExp(r'[<>:"/\\|?*]'), '_');

// Example: 月次売上_令和8年4月_20260405.csv
```

### 257.5 — Number Format in Exports

- ✅ Export raw numbers without formatting in CSV
- ✅ Format only in display layer
