# Locale Number & Currency Specialist
# ロケール数値・通貨スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 253.1–253.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Number formatting, currency display, negative numbers, 万/億 grouping, Intl.NumberFormat |
| **Activation Trigger** | Numeric display, currency formatting, financial data rendering |
| **Complements** | 254.x financial-compliance, 252.x date-calendar |

---

## Rules

### 253.1 — Number Formatting

| Locale | Thousands Sep | Decimal Sep | Example |
|--------|--------------|------------|---------|
| JP | comma (,) | dot (.) | 1,234,567 |
| VN | dot (.) | comma (,) | 1.234.567 |

```tsx
// ✅ Locale-aware number formatting
const formatNumber = (value: number, locale: 'ja' | 'vi') =>
  new Intl.NumberFormat(locale === 'ja' ? 'ja-JP' : 'vi-VN').format(value);
// JP: 1,234,567
// VN: 1.234.567
```

- ❌ NEVER hardcode comma as thousands separator — use `Intl.NumberFormat`

### 253.2 — Currency Display

| Currency | Symbol | Position | Decimals | Example |
|----------|--------|----------|----------|---------|
| JPY (¥) | ¥ | Prefix | 0 | ¥1,234,567 |
| VND (₫) | ₫ | Suffix | 0 | 1.234.567₫ |

```tsx
// ✅ Currency formatting
const formatCurrency = (value: number, currency: 'JPY' | 'VND') =>
  new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
// JPY: ¥1,234,567
// VND: 1.234.567 ₫
```

- ✅ JPY: no decimal places (integer currency)
- ✅ VND: no decimal places (integer currency)
- ❌ NEVER display ¥1,234.56 — JPY has no fractional units

### 253.3 — Negative Number Display

| Context | JP | VN |
|---------|----|----|
| General | -1,234 | -1.234 |
| Financial (帳票) | △1,234 (triangle prefix) | (1.234) (parentheses) |
| Accounting | ▲1,234 (filled triangle) | -1.234 |

```tsx
// ✅ JP financial negative format
const formatJPFinancial = (value: number) => {
  if (value < 0) return `△${Math.abs(value).toLocaleString('ja-JP')}`;
  return value.toLocaleString('ja-JP');
};

// ✅ Styling: negative values in red
<span className={value < 0 ? 'text-error' : 'text-gray-900'}>
  {formatJPFinancial(value)}
</span>
```

- ✅ Use △ (U+25B3) for JP financial negatives — NOT minus sign
- ❌ NEVER use parentheses for JP financial negatives — that is US/VN convention

### 253.4 — 万/億 Grouping (JP Financial Reports)

```tsx
// ✅ JP large number grouping
const formatJPLargeNumber = (value: number): string => {
  const oku = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);
  const remainder = value % 10_000;

  const parts: string[] = [];
  if (oku > 0) parts.push(`${oku}億`);
  if (man > 0) parts.push(`${man.toLocaleString('ja-JP')}万`);
  if (remainder > 0 || parts.length === 0) parts.push(remainder.toLocaleString('ja-JP'));
  return parts.join('');
};
// 123,456,789 → "1億2,345万6,789"
// 50,000 → "5万"
// 300,000,000 → "3億"
```

- ✅ Use 万/億 grouping for values ≥ 10,000 in JP financial reports
- ✅ Display both formats in tooltips: `5万 (50,000)`
- ❌ NEVER display raw large numbers (>10,000) without 万/億 in JP 帳票

### 253.5 — Intl.NumberFormat Configuration

```tsx
// ✅ Reusable formatters (create once, reuse)
const JP_NUMBER = new Intl.NumberFormat('ja-JP');
const JP_CURRENCY = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
const JP_PERCENT = new Intl.NumberFormat('ja-JP', { style: 'percent', minimumFractionDigits: 1 });
const VN_NUMBER = new Intl.NumberFormat('vi-VN');
const VN_CURRENCY = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
```

- ✅ Create `Intl.NumberFormat` instances outside render — reuse for performance
- ✅ Use `minimumFractionDigits` / `maximumFractionDigits` for precision control
- ❌ NEVER use `Number.toFixed()` + manual formatting — use `Intl.NumberFormat`
