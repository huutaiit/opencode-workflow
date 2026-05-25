# Locale Encoding & Export Specialist
# ロケールエンコーディング・エクスポートスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 257.1–257.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Shift_JIS conversion, CSV encoding, PDF font embedding, email encoding, filename encoding |
| **Activation Trigger** | File export, CSV download, PDF generation, email sending |
| **Complements** | 231.x bi-output, 240.x government-form |

---

## Rules

### 257.1 — Shift_JIS to UTF-8 Conversion

For legacy JP government systems that require Shift_JIS input/output.

```tsx
// ✅ Encoding conversion (using TextDecoder/TextEncoder or iconv-lite)
// Server-side (Node.js):
import iconv from 'iconv-lite';

const utf8ToShiftJIS = (text: string): Buffer =>
  iconv.encode(text, 'Shift_JIS');

const shiftJISToUTF8 = (buffer: Buffer): string =>
  iconv.decode(buffer, 'Shift_JIS');

// ✅ Detect encoding on file upload
const detectEncoding = (buffer: Buffer): string => {
  // BOM detection: EF BB BF = UTF-8, FF FE = UTF-16LE
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'UTF-8';
  // Heuristic: look for Shift_JIS byte patterns (0x81-0x9F, 0xE0-0xEF lead byte)
  return 'Shift_JIS'; // Default assumption for JP government files
};
```

- ✅ Always handle Shift_JIS for legacy government data exchange
- ❌ NEVER assume all JP files are UTF-8

### 257.2 — CSV Export Encoding

| Locale | Encoding | BOM | Reason |
|--------|----------|-----|--------|
| JP | Shift_JIS + BOM | `\xFF\xFE` | Excel JP opens correctly |
| JP (modern) | UTF-8 + BOM | `\xEF\xBB\xBF` | Excel 2019+ support |
| VN | UTF-8 + BOM | `\xEF\xBB\xBF` | Excel compatibility |

```tsx
// ✅ CSV export with correct encoding
const exportCSV = (data: string[][], locale: 'ja' | 'vi', legacy = false) => {
  const csvContent = data.map(row => row.map(cell =>
    `"${cell.replace(/"/g, '""')}"`
  ).join(',')).join('\r\n');

  let blob: Blob;
  if (locale === 'ja' && legacy) {
    // Shift_JIS for legacy JP systems
    const encoded = iconv.encode(csvContent, 'Shift_JIS');
    blob = new Blob([encoded], { type: 'text/csv;charset=Shift_JIS' });
  } else {
    // UTF-8 with BOM
    const bom = '\uFEFF';
    blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  }
  return blob;
};
```

- ✅ Always include BOM for Excel compatibility
- ✅ Default to UTF-8+BOM; offer Shift_JIS option for legacy systems
- ❌ NEVER export CSV without BOM — Excel shows garbled JP/VN characters

### 257.3 — PDF Font Embedding

| Locale | Font | Usage |
|--------|------|-------|
| JP (formal) | IPA明朝 (IPAMincho) | Government 帳票, legal documents |
| JP (general) | Noto Sans JP | Business reports, UI prints |
| JP (Gothic) | IPAゴシック (IPAGothic) | Form labels, headers |
| VN | Be Vietnam Pro | All VN documents |

```tsx
// ✅ PDF generation font config (server-side)
const pdfFontConfig = {
  ja: {
    formal: { family: 'IPAMincho', path: '/fonts/ipaexm.ttf' },
    general: { family: 'NotoSansJP', path: '/fonts/NotoSansJP-Regular.otf' },
  },
  vi: {
    general: { family: 'BeVietnamPro', path: '/fonts/BeVietnamPro-Regular.ttf' },
  },
};
```

- ✅ Embed fonts in PDF — NEVER rely on system fonts
- ✅ Include Regular + Bold weights at minimum
- ❌ NEVER use sans-serif/serif generic family in PDF — renders differently per OS

### 257.4 — Email Encoding

| System | Encoding | Use Case |
|--------|----------|----------|
| Legacy JP gov | ISO-2022-JP | Government email systems (官公庁) |
| Modern JP/VN | UTF-8 | Standard business email |

- ✅ Subject encoding: `=?UTF-8?B?{base64}?=` (modern), `=?ISO-2022-JP?B?{base64}?=` (legacy)
- ✅ Default UTF-8; support ISO-2022-JP for legacy government systems
- ❌ NEVER send raw UTF-8 to known ISO-2022-JP systems — causes mojibake

### 257.5 — Filename Encoding for Downloads

```tsx
// ✅ RFC 5987 Content-Disposition for non-ASCII filenames
const getContentDisposition = (filename: string) => {
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
};
// filename: "月次報告_令和8年4月.csv"
```

- ✅ Use RFC 5987 `filename*=UTF-8''` for server-side headers
- ✅ Client-side: `a.download = filename` — browser handles encoding
- ❌ NEVER use ASCII-only filenames for JP documents — lose context
