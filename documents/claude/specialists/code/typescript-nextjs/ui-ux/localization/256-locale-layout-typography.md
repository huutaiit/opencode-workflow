# Locale Layout & Typography Specialist
# ロケールレイアウト・タイポグラフィスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 256.1–256.5 |
| **Specialist Type** | rule-set |
| **Purpose** | CJK column width, collation sort, word-break, vertical text, form field byte limits |
| **Activation Trigger** | Table layout with CJK text, sort ordering, typography rules |
| **Complements** | 251.x name-address, 250.x input-handling |

---

## Rules

### 256.1 — CJK Column Width Adjustment

JP text characters are ~2x width of Latin characters. Table columns must auto-size.

```tsx
// ✅ Table column width hints for CJK
const columns = [
  { title: '取引先名', dataIndex: 'name', width: 200,   // ~10 JP chars
    className: 'whitespace-nowrap' },
  { title: '部門', dataIndex: 'department', width: 120,  // ~6 JP chars
    className: 'whitespace-nowrap' },
  { title: '金額', dataIndex: 'amount', width: 100,
    className: 'text-right font-mono' },
];

// ✅ Auto-size with min-width
<Table
  columns={columns}
  scroll={{ x: 'max-content' }}
  className="[&_th]:whitespace-nowrap"
/>
```

- ✅ Set column `width` assuming 1 JP char ≈ 20px at 14px font
- ✅ Use `scroll={{ x: 'max-content' }}` for horizontal overflow
- ❌ NEVER use fixed narrow columns for JP text — causes excessive wrapping

### 256.2 — Collation Sort Order

| Locale | Sort Rule | Implementation |
|--------|----------|---------------|
| JP | Furigana reading order (五十音順) | `Intl.Collator('ja')` or server-side furigana sort |
| VN | Diacritical-aware (ă before â) | `Intl.Collator('vi')` |

```tsx
// ✅ Locale-aware sorting
const jpCollator = new Intl.Collator('ja', { sensitivity: 'base' });
const vnCollator = new Intl.Collator('vi', { sensitivity: 'accent' });

// JP: Sort by furigana (requires furigana field)
data.sort((a, b) => jpCollator.compare(a.nameKana, b.nameKana));

// VN: Diacritical-aware sort
data.sort((a, b) => vnCollator.compare(a.name, b.name));
```

- ✅ JP: Sort by furigana (nameKana) — NOT by kanji code point
- ✅ VN: ă < â < a in Vietnamese alphabetical order
- ❌ NEVER sort JP names by raw kanji — results in meaningless order

### 256.3 — Word-Break Rules

```tsx
// ✅ JP: keep-all prevents mid-word breaks in CJK
<p className="break-keep">
  東京都千代田区丸の内一丁目一番地
</p>

// ✅ VN: break-word for long Vietnamese words
<p className="break-words">
  Thành phố Hồ Chí Minh, Quận 1, Phường Bến Nghé
</p>

// ✅ Table cell with CJK truncation
<span className="block truncate max-w-[200px]" title={fullText}>
  {fullText}
</span>
```

- ✅ JP: `className="break-keep"` (word-break: keep-all)
- ✅ VN: `className="break-words"` (word-break: break-word)
- ❌ NEVER use `break-all` for JP text — breaks mid-character compound

### 256.4 — Vertical Text Rendering

```tsx
// ✅ Vertical text for traditional JP documents
<div className="[writing-mode:vertical-rl] [text-orientation:mixed] h-[400px] p-4">
  <p className="text-base leading-loose">
    令和八年度予算案について
  </p>
</div>

// ✅ Vertical header for narrow table columns
<th className="[writing-mode:vertical-rl] [text-orientation:mixed] h-24 w-8 text-center text-xs">
  承認状態
</th>
```

- ✅ Use `writing-mode: vertical-rl` for traditional layout (right-to-left columns)
- ✅ Use `text-orientation: mixed` to keep Latin text horizontal within vertical flow
- ❌ NEVER use vertical text for form inputs — only display/headers

### 256.5 — Form Field Length Limits

| Field Type | JP Rule | Validation |
|-----------|---------|-----------|
| Name (氏名) | 全角20文字 | `maxLength={20}` + byte-count |
| Address (住所) | 全角50文字 | `maxLength={50}` + byte-count |
| Company (会社名) | 全角40文字 | `maxLength={40}` + byte-count |

```tsx
// ✅ Byte-count validation for CJK
const getByteLength = (str: string): number =>
  new Blob([str]).size;

const validateByteLength = (maxBytes: number) => ({
  validator: (_: unknown, value: string) =>
    getByteLength(value) <= maxBytes
      ? Promise.resolve()
      : Promise.reject(`${maxBytes}バイト以内で入力してください`),
});

// ✅ Character count indicator
<Form.Item label="氏名" extra={`${value.length}/20文字`}>
  <Input maxLength={20} value={value} onChange={e => setValue(e.target.value)} />
</Form.Item>
```

- ✅ Show character count: `{current}/{max}文字`
- ✅ Validate both character count AND byte length (for DB storage)
- ❌ NEVER use `maxLength` alone for CJK — 1 全角 char = 3 bytes in UTF-8
