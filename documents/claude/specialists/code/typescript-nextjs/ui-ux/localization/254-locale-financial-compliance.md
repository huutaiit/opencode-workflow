# Locale Financial Compliance Specialist
# ロケール金融コンプライアンススペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 254.1–254.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Invoice formats, bank account validation, tax rounding, document numbering |
| **Activation Trigger** | Financial forms, invoice generation, bank account input, tax calculation |
| **Complements** | 253.x number-currency, 242.x banking-behavioral |

---

## Rules

### 254.1 — Invoice Format

| Locale | System | Format |
|--------|--------|--------|
| JP | Qualified Invoice (適格請求書) | T-prefix + 13 digits: `T1234567890123` |
| VN | e-Invoice (Hóa đơn điện tử) | XML-signed, Circular 78/2021/TT-BTC |

```tsx
// ✅ JP Qualified Invoice number input
<Form.Item
  label="適格請求書発行事業者登録番号"
  name="invoiceNumber"
  rules={[{
    pattern: /^T\d{13}$/,
    message: 'T + 13桁の数字で入力してください (例: T1234567890123)',
  }]}
>
  <Input placeholder="T1234567890123" maxLength={14} className="font-mono w-48" />
</Form.Item>

// ✅ VN e-Invoice reference
<Form.Item label="Mã hóa đơn" name="eInvoiceCode">
  <Input placeholder="C26TAA-12345678" className="font-mono" />
</Form.Item>
```

- ✅ JP: Validate T-prefix + exactly 13 digits
- ✅ VN: Validate against Circular 78 format
- ❌ NEVER accept invoice numbers without format validation

### 254.2 — Bank Account Validation

| Locale | Structure | Format |
|--------|----------|--------|
| JP (全銀) | 銀行4桁 + 支店3桁 + 口座7桁 | `0001-001-1234567` |
| VN | Varies by bank | 8–19 digits |

```tsx
// ✅ JP Zengin bank account fields
<div className="grid grid-cols-3 gap-4">
  <Form.Item label="銀行コード" name="bankCode"
    rules={[{ pattern: /^\d{4}$/, message: '4桁の数字' }]}>
    <Input placeholder="0001" maxLength={4} className="font-mono w-20" />
  </Form.Item>
  <Form.Item label="支店コード" name="branchCode"
    rules={[{ pattern: /^\d{3}$/, message: '3桁の数字' }]}>
    <Input placeholder="001" maxLength={3} className="font-mono w-16" />
  </Form.Item>
  <Form.Item label="口座番号" name="accountNumber"
    rules={[{ pattern: /^\d{7}$/, message: '7桁の数字' }]}>
    <Input placeholder="1234567" maxLength={7} className="font-mono w-24" />
  </Form.Item>
</div>
```

- ✅ JP: Separate fields for bank (4), branch (3), account (7)
- ✅ VN: Single field with min=8, max=19 digits
- ❌ NEVER combine JP bank fields into single input

### 254.3 — Tax Rounding Rules

| Locale | Rule | Method |
|--------|------|--------|
| JP | 切り捨て (truncation) | `Math.floor()` for consumption tax |
| VN | Nearest integer | `Math.round()` for VAT |

```tsx
// ✅ JP consumption tax calculation (切り捨て)
const calcJPTax = (amount: number, rate: number = 0.10) =>
  Math.floor(amount * rate);
// ¥999 × 10% = ¥99 (NOT ¥99.9 rounded to ¥100)

// ✅ VN VAT calculation (round to nearest)
const calcVNVAT = (amount: number, rate: number = 0.10) =>
  Math.round(amount * rate);
```

- ✅ JP: Always truncate (切り捨て) — legally required for consumption tax
- ❌ NEVER use `Math.round()` for JP tax — results in overcharge

### 254.4 — Document Numbering

| Locale | Pattern | Example |
|--------|---------|---------|
| JP | Era prefix + type + sequential | `R08-INV-0001` |
| VN | Year + type + sequential | `2026-HD-000001` |

```tsx
// ✅ JP document number display
<Descriptions.Item label="文書番号">
  <span className="font-mono text-sm">R08-INV-0001</span>
</Descriptions.Item>
// R08 = 令和8年, INV = Invoice, 0001 = sequential
```

- ✅ Zero-pad sequential numbers (4+ digits)
- ✅ Use era year prefix for JP official documents

### 254.5 — Tax Rate Display

```tsx
// ✅ JP dual tax rate (軽減税率 8% + standard 10%)
<Table columns={[
  { title: '品目', dataIndex: 'item' },
  { title: '税率', dataIndex: 'taxRate',
    render: (rate: number) => (
      <Tag color={rate === 0.08 ? 'blue' : 'default'}>
        {rate === 0.08 ? '※8%' : '10%'}
      </Tag>
    )},
  { title: '税込金額', dataIndex: 'totalWithTax',
    render: (v: number) => `¥${v.toLocaleString('ja-JP')}` },
]} />
// ※ = reduced rate marker (軽減税率)
```

- ✅ JP: Mark reduced rate items with ※ symbol
- ✅ Show tax breakdown subtotals by rate (8% subtotal + 10% subtotal)
- ❌ NEVER mix tax rates without clear visual differentiation
