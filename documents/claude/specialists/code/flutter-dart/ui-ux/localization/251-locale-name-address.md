# Locale Name & Address Specialist
# ロケール氏名・住所スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 251.1–251.5 |
| **Specialist Type** | code |
| **Purpose** | Name ordering, furigana, address hierarchy, phone format, honorifics |
| **Activation Trigger** | Name/address forms, contact information |
| **Complements** | 250.x input-handling, 255.x pii-regulatory |

---

## Rules

### 251.1 — Name Field Ordering

```dart
// ✅ JP: 姓→名
Row(children: [
  Expanded(child: TextFormField(decoration: InputDecoration(labelText: '姓', hintText: '山田'))),
  const SizedBox(width: 16),
  Expanded(child: TextFormField(decoration: InputDecoration(labelText: '名', hintText: '太郎'))),
])
```

- ❌ NEVER use single "Full Name" field for JP/VN

### 251.2 — Furigana Fields

```dart
// ✅ Furigana above kanji name
Column(children: [
  TextFormField(decoration: InputDecoration(labelText: 'セイ（フリガナ）', hintText: 'ヤマダ'),
    style: TextStyle(fontSize: 12)),
  const SizedBox(height: 4),
  TextFormField(decoration: InputDecoration(labelText: '姓', hintText: '山田')),
])
```

### 251.3 — JP Address Hierarchy

〒→都道府県→市区町村→番地→建物名. Auto-fill from postal code.

### 251.4 — Phone Format

| Locale | Format | KeyboardType |
|--------|--------|-------------|
| JP | 03-1234-5678 | `TextInputType.phone` |
| VN | 028-1234-5678 | `TextInputType.phone` |

### 251.5 — Honorifics

JP: suffix `様` (customer), VN: prefix `Ông/Bà` (formal)
