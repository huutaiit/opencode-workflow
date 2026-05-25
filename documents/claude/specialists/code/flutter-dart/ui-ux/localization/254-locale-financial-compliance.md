# Locale Financial Compliance Specialist
# ロケール金融コンプライアンススペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 254.1–254.5 |
| **Specialist Type** | code |
| **Purpose** | Invoice formats, bank account validation, tax rounding |
| **Activation Trigger** | Financial forms, invoice, bank account, tax |
| **Complements** | 253.x number-currency, 242.x banking-behavioral |

---

## Rules

### 254.1 — Invoice Format

JP: T-prefix + 13 digits (`T1234567890123`)

```dart
TextFormField(
  decoration: InputDecoration(labelText: '適格請求書発行事業者登録番号', hintText: 'T1234567890123'),
  maxLength: 14,
  style: TextStyle(fontFamily: 'monospace'),
  validator: (v) => RegExp(r'^T\d{13}$').hasMatch(v ?? '') ? null : 'T + 13桁の数字',
)
```

### 254.2 — Bank Account (全銀)

```dart
// ✅ Separate fields: bank(4) + branch(3) + account(7)
Row(children: [
  SizedBox(width: 80, child: TextFormField(decoration: InputDecoration(labelText: '銀行コード'), maxLength: 4)),
  SizedBox(width: 64, child: TextFormField(decoration: InputDecoration(labelText: '支店コード'), maxLength: 3)),
  SizedBox(width: 96, child: TextFormField(decoration: InputDecoration(labelText: '口座番号'), maxLength: 7)),
])
```

### 254.3 — Tax Rounding

```dart
// ✅ JP: truncation (切り捨て)
int calcJPTax(int amount, {double rate = 0.10}) => (amount * rate).floor();

// ✅ VN: round to nearest
int calcVNVAT(int amount, {double rate = 0.10}) => (amount * rate).round();
```

- ❌ NEVER combine JP bank fields into single input
- ❌ NEVER use `Math.round()` equivalent for JP tax — legally must truncate

### 254.4–254.5

Same rules as web for tax rate display and document numbering.
