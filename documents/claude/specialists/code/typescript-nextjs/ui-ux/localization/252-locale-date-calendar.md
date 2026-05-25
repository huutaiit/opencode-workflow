# Locale Date & Calendar Specialist
# ロケール日付・カレンダースペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 252.1–252.7 |
| **Specialist Type** | rule-set |
| **Purpose** | Date formatting, era year, fiscal year, holidays, timezone, date picker locale |
| **Activation Trigger** | Date display, calendar components, fiscal period logic |
| **Complements** | 253.x number-currency, 254.x financial-compliance |

---

## Rules

### 252.1 — Date Format

| Locale | Format | Example |
|--------|--------|---------|
| JP | YYYY年MM月DD日 | 2026年04月05日 |
| JP (short) | YYYY/MM/DD | 2026/04/05 |
| VN | DD/MM/YYYY | 05/04/2026 |

```tsx
// ✅ Locale-aware formatting
const formatDate = (date: Date, locale: 'ja' | 'vi') =>
  locale === 'ja'
    ? `${date.getFullYear()}年${String(date.getMonth()+1).padStart(2,'0')}月${String(date.getDate()).padStart(2,'0')}日`
    : `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
```

- ❌ NEVER use MM/DD/YYYY (US format) for JP or VN systems

### 252.2 — Era Year (和暦)

| Era | Start | Conversion |
|-----|-------|-----------|
| 令和 (Reiwa) | 2019-05-01 | R1=2019, R8=2026 |
| 平成 (Heisei) | 1989-01-08 | H1=1989, H31=2019-04-30 |
| 昭和 (Showa) | 1926-12-25 | S1=1926, S64=1989-01-07 |

```tsx
// ✅ Era year conversion
const toWareki = (date: Date): string => {
  const year = date.getFullYear();
  if (year >= 2019) return `令和${year - 2018}年`;
  if (year >= 1989) return `平成${year - 1988}年`;
  return `昭和${year - 1925}年`;
};
// 2026 → "令和8年"
```

- ✅ Display both: `令和8年 (2026年)` in formal documents
- ✅ Accept either era or Western year in date input fields

### 252.3 — Fiscal Year (会計年度)

| Locale | Fiscal Year | Example |
|--------|------------|---------|
| JP | April 1 – March 31 | FY2026 = 2026/04/01 – 2027/03/31 |
| VN | January 1 – December 31 | FY2026 = calendar year |

```tsx
// ✅ JP fiscal year calculation
const getJPFiscalYear = (date: Date): number =>
  date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
// April(3)–Dec: same year, Jan(0)–Mar(2): previous year
```

- ✅ Label fiscal periods as `2026年度` (not `FY2026`) in JP context
- ❌ NEVER assume calendar year = fiscal year in JP systems

### 252.4 — Holiday Calendars (祝日)

JP holidays (祝日):

| Holiday | Date | Notes |
|---------|------|-------|
| 元日 | 1/1 | New Year |
| 天皇誕生日 | 2/23 | Emperor's Birthday |
| 憲法記念日 | 5/3 | Golden Week start |
| みどりの日 | 5/4 | Golden Week |
| こどもの日 | 5/5 | Golden Week end |
| 山の日 | 8/11 | Mountain Day |

VN holidays:

| Holiday | Date | Notes |
|---------|------|-------|
| Tết Nguyên Đán | Lunar 1/1 | ~Late Jan/Feb, multi-day |
| Ngày Giải phóng | 4/30 | Reunification Day |
| Quốc khánh | 9/2 | National Day |

- ✅ Use holiday API or static calendar — never hardcode moving dates
- ✅ Grey out holidays in date pickers, show tooltip with holiday name

### 252.5 — Timezone

| Locale | Timezone | UTC Offset |
|--------|----------|-----------|
| JP | Asia/Tokyo (JST) | UTC+9 |
| VN | Asia/Ho_Chi_Minh (ICT) | UTC+7 |

- ✅ Store all dates as UTC, display in user's locale timezone
- ✅ Show timezone indicator for cross-region systems: `14:00 JST`
- ❌ NEVER use `new Date()` without timezone awareness

### 252.6 — AntD Date Picker Locale

```tsx
import jaJP from 'antd/locale/ja_JP';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

// ✅ Locale-aware DatePicker
<ConfigProvider locale={locale === 'ja' ? jaJP : viVN}>
  <DatePicker format={locale === 'ja' ? 'YYYY年MM月DD日' : 'DD/MM/YYYY'} />
</ConfigProvider>
```

### 252.7 — Date Range Display

```tsx
// ✅ JP period display
<span>2026年4月1日 〜 2027年3月31日</span>  // Use 〜 not ~

// ✅ VN period display
<span>01/04/2026 - 31/03/2027</span>  // Use - not 〜
```

- ✅ JP uses 〜 (wave dash U+301C) for ranges
- ❌ NEVER use ASCII tilde (~) for JP date ranges
