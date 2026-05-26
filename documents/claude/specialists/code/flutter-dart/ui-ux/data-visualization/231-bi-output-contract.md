# BI Output Contract Specialist
# BIアウトプット契約スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 231.1–231.6 |
| **Specialist Type** | contract |
| **Purpose** | PDF export, print layouts, drill-down state, aggregation interface |
| **Activation Trigger** | Report export, PDF generation, drill-down navigation |
| **Complements** | 230.x chart-types, 240.x government-form-layout |

---

## Rules

### 231.1 — Print Layout (PDF)

```dart
// ✅ pdf package for Flutter PDF generation
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

final pdf = pw.Document();
pdf.addPage(pw.Page(
  pageFormat: PdfPageFormat.a4,
  margin: const pw.EdgeInsets.all(25 * PdfPageFormat.mm),
  build: (context) => pw.Column(children: [...]),
));
```

### 231.2 — PDF Font Embedding

```dart
// ✅ CJK font embedding
final notoSansJP = pw.Font.ttf(await rootBundle.load('assets/fonts/NotoSansJP-Regular.ttf'));
pw.Text('取引先情報', style: pw.TextStyle(font: notoSansJP, fontSize: 14))
```

### 231.3 — Chart Export

```dart
// ✅ Render chart to image for PDF
final image = await chartKey.currentContext?.toImage(pixelRatio: 3.0);
// Convert to PDF image
```

- ✅ Use pixelRatio ≥ 3.0 for print quality
- ❌ NEVER export charts at screen resolution (72dpi)

### 231.4 — Drill-Down State

```dart
// ✅ State in route params (go_router)
GoRoute(
  path: '/reports/sales',
  builder: (context, state) {
    final period = state.uri.queryParameters['period'];
    final level = state.uri.queryParameters['level'] ?? 'summary';
    return SalesReport(period: period, level: level);
  },
)
```

### 231.5 — Server-Side Aggregation

Same contract interface as web — fetch aggregated data, never raw rows.

### 231.6 — Export File Naming

Same convention: `{org}_{report-type}_{period}_{timestamp}.{ext}`

```dart
// ✅ Share/save PDF
await Share.shareFiles([filePath], text: '月次売上レポート');
```
