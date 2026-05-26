# Locale PII & Regulatory Specialist
# ロケールPII・規制スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 255.1–255.5 |
| **Specialist Type** | rule-set |
| **Purpose** | National ID masking, check digit validation, business registration, data retention, consent UI |
| **Activation Trigger** | PII data display, ID number input, consent management |
| **Complements** | 254.x financial-compliance, 242.x banking-behavioral |

---

## Rules

### 255.1 — National ID Masking

| Locale | ID Type | Format | Display |
|--------|---------|--------|---------|
| JP | My Number (マイナンバー) | 12 digits | `****-****-1234` (last 4 only) |
| VN | CCCD (Căn cước công dân) | 12 digits | `********1234` (last 4 only) |

```tsx
// ✅ Masked display
const maskNationalId = (id: string, locale: 'ja' | 'vi') => {
  const last4 = id.slice(-4);
  return locale === 'ja' ? `****-****-${last4}` : `********${last4}`;
};

// ✅ Input with toggle visibility
<Form.Item label="マイナンバー" name="myNumber">
  <Input.Password
    placeholder="123456789012"
    maxLength={12}
    visibilityToggle={{ visible: showId, onVisibleChange: setShowId }}
    className="font-mono w-48"
  />
</Form.Item>
```

- ✅ Default display: masked (show last 4 only)
- ✅ Full view requires explicit user action + audit log
- ❌ NEVER display full My Number without masking
- ❌ NEVER log full national ID to browser console or analytics

### 255.2 — Check Digit Algorithms

```tsx
// ✅ JP My Number check digit (modulus 11 weighted sum)
const validateMyNumber = (num: string): boolean => {
  if (num.length !== 12) return false;
  const digits = num.split('').map(Number);
  const weights = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = digits.slice(0, 11).reduce((acc, d, i) => acc + d * weights[i], 0);
  const remainder = sum % 11;
  const checkDigit = remainder <= 1 ? 0 : 11 - remainder;
  return digits[11] === checkDigit;
};

// ✅ VN CCCD province prefix validation
const validVNProvinces = ['001','002','004','006','008','010'/* ... */];
const validateCCCD = (id: string): boolean =>
  id.length === 12 && validVNProvinces.includes(id.slice(0, 3));
```

- ✅ Validate check digit on blur before submission
- ✅ Show inline error: `マイナンバーが正しくありません`

### 255.3 — Business Registration Numbers

| Locale | Type | Format | Validation |
|--------|------|--------|-----------|
| JP | 法人番号 (Corporate Number) | 13 digits | Check digit (modulus 9) |
| VN | Mã số thuế (MST) | 10 or 13 digits | 10-digit base + 3-digit branch |

```tsx
// ✅ JP Corporate Number input
<Form.Item label="法人番号" name="corporateNumber"
  rules={[{ pattern: /^\d{13}$/, message: '13桁の数字で入力してください' }]}
  extra="国税庁法人番号公表サイトで確認できます">
  <Input placeholder="1234567890123" maxLength={13} className="font-mono w-44" />
</Form.Item>
```

- ✅ Link to verification site for user self-service lookup
- ❌ NEVER store business registration numbers without validation

### 255.4 — Data Retention Rules

| Locale | Law | Key Requirements |
|--------|-----|-----------------|
| JP | APPI (個人情報保護法) | Purpose limitation, consent required, right to deletion |
| VN | Decree 13/2023/NĐ-CP | Data localization, cross-border transfer restrictions |

```tsx
// ✅ Retention period indicator
<Descriptions.Item label="データ保持期間">
  <span className="text-sm">
    保存期限: {retentionDate} ({retentionDays}日後に自動削除)
  </span>
</Descriptions.Item>
```

- ✅ Display data retention period to users
- ✅ Provide deletion request UI (right to erasure)
- ❌ NEVER retain PII beyond stated retention period

### 255.5 — Consent UI Patterns

```tsx
// ✅ JP APPI consent form
<div className="space-y-4 p-4 border border-gray-200 rounded-lg">
  <h3 className="font-medium text-base">個人情報の取り扱いについて</h3>
  <div className="max-h-48 overflow-y-auto text-sm text-gray-700 p-3 bg-gray-50 rounded">
    {privacyPolicyText}
  </div>
  <Checkbox
    checked={consented}
    onChange={(e) => setConsented(e.target.checked)}
  >
    <span className="text-sm">上記の内容に同意します</span>
  </Checkbox>
  <Button type="primary" disabled={!consented}>
    同意して次へ進む
  </Button>
</div>
```

- ✅ Consent must be affirmative action (unchecked by default)
- ✅ Show full privacy policy text (scrollable) before consent checkbox
- ✅ Record consent timestamp and version for audit
- ❌ NEVER pre-check consent checkbox
- ❌ NEVER bundle multiple consent purposes into one checkbox
