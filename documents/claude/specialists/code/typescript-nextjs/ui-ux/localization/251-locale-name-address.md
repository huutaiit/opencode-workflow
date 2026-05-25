# Locale Name & Address Specialist
# ロケール氏名・住所スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 251.1–251.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Name ordering, furigana fields, address hierarchy, phone format, honorifics |
| **Activation Trigger** | Name/address form fields, contact information UI |
| **Complements** | 250.x input-handling, 255.x pii-regulatory |

---

## Rules

### 251.1 — Name Field Ordering

| Locale | Order | Fields |
|--------|-------|--------|
| JP | 姓→名 (family→given) | `familyName` + `givenName` |
| VN | họ→đệm→tên (family→middle→given) | `ho` + `dem` + `ten` |

```tsx
// ✅ JP name fields
<div className="grid grid-cols-2 gap-4">
  <Form.Item label="姓" name="familyName" rules={[{ required: true }]}>
    <Input placeholder="山田" />
  </Form.Item>
  <Form.Item label="名" name="givenName" rules={[{ required: true }]}>
    <Input placeholder="太郎" />
  </Form.Item>
</div>

// ✅ VN name fields
<div className="grid grid-cols-3 gap-4">
  <Form.Item label="Họ" name="ho"><Input placeholder="Nguyễn" /></Form.Item>
  <Form.Item label="Tên đệm" name="dem"><Input placeholder="Văn" /></Form.Item>
  <Form.Item label="Tên" name="ten"><Input placeholder="An" /></Form.Item>
</div>
```

- ❌ NEVER use single "Full Name" field for JP/VN — always structured

### 251.2 — Furigana (フリガナ) Companion Fields

```tsx
// ✅ Furigana paired with kanji name
<div className="space-y-1">
  <Form.Item label="セイ（フリガナ）" name="familyNameKana" className="mb-1">
    <Input placeholder="ヤマダ" className="text-sm" />
  </Form.Item>
  <Form.Item label="姓" name="familyName">
    <Input placeholder="山田" />
  </Form.Item>
</div>
```

- ✅ Furigana field above or beside the kanji field
- ✅ Auto-suggest furigana from kanji input (client-side library)
- ✅ Accept both カタカナ and ひらがな — normalize to カタカナ on submit
- ❌ NEVER omit furigana for JP person names in official forms

### 251.3 — Address Hierarchy

```tsx
// ✅ JP address: large → small (〒→都道府県→市区町村→番地→建物名)
<Form.Item label="郵便番号" name="postalCode">
  <Input placeholder="100-0001" className="w-32"
    onChange={(e) => autoFillAddress(e.target.value)} />
</Form.Item>
<Form.Item label="都道府県" name="prefecture">
  <Select options={PREFECTURES_47} placeholder="東京都" />
</Form.Item>
<Form.Item label="市区町村" name="city">
  <Input placeholder="千代田区" />
</Form.Item>
<Form.Item label="番地" name="street">
  <Input placeholder="丸の内1-1-1" />
</Form.Item>
<Form.Item label="建物名" name="building">
  <Input placeholder="○○ビル 5F" />
</Form.Item>
```

- ✅ JP: Auto-fill prefecture + city from postal code (〒 API)
- ✅ VN: Province → District → Ward → Street hierarchy (varies by region)
- ❌ NEVER use single-line address for JP — always structured fields

### 251.4 — Phone Format

| Locale | Format | Validation |
|--------|--------|-----------|
| JP | +81-3-1234-5678 or 03-1234-5678 | `^\d{2,4}-\d{2,4}-\d{4}$` |
| VN | +84-28-1234-5678 or 028-1234-5678 | `^\d{3,4}-\d{3,4}-\d{3,4}$` |

- ✅ Auto-format with hyphens on blur
- ✅ Accept input with or without country code prefix
- ✅ `inputMode="tel"` for mobile numeric keyboard

### 251.5 — Honorific System

| Locale | Honorifics | Usage |
|--------|-----------|-------|
| JP | 様 (customer), 殿 (official doc), さん (casual) | Suffix after name |
| VN | Anh/Chị (peer), Ông/Bà (formal) | Prefix before name |

```tsx
// ✅ JP: Display with honorific suffix
<span>{familyName}{givenName} 様</span>

// ✅ VN: Display with honorific prefix
<span>{honorific} {ho} {dem} {ten}</span>
// e.g., "Ông Nguyễn Văn An"
```

- ✅ Default honorific: JP=様, VN=Ông/Bà (based on gender if known)
- ❌ NEVER omit honorific in customer-facing display
