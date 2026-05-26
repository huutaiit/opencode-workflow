# Government Form Layout Specialist
# 行政帳票レイアウトスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 240.1–240.6 |
| **Specialist Type** | rule-set |
| **Purpose** | 帳票 formatting, PDF generation, hanko zones, watermark |
| **Activation Trigger** | Government/official document, 帳票 print layout |
| **Complements** | 231.x bi-output, 241.x jis-accessibility |

---

## Rules

### 240.1 — 帳票 Formatting (PDF Generation)

```dart
// ✅ pdf package — A4 portrait with Mincho font
final pdf = pw.Document();
pdf.addPage(pw.Page(
  pageFormat: PdfPageFormat.a4,
  margin: const pw.EdgeInsets.all(25 * PdfPageFormat.mm),
  build: (context) => pw.Column(children: [
    pw.Text('文書名', style: pw.TextStyle(font: minchoFont, fontSize: 14)),
  ]),
));
```

| Element | Rule |
|---------|------|
| Paper | A4 default, A3 for wide tables |
| Font | 明朝体 for formal, ゴシック体 for forms |
| Body size | 10.5pt |
| Margins | 25mm all sides |

- ❌ NEVER use decorative fonts in government forms
- ❌ NEVER reduce margins below 20mm — risks content clipping

### 240.2–240.6

Same rules as web — hanko zones (20mm×25mm), watermark overlay, page numbering (`X / Y ページ`), header/footer standards. All implemented via `pdf` package widget tree.
