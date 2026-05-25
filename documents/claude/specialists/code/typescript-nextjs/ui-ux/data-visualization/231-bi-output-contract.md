# BI Output Contract Specialist
# BIアウトプット契約スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 231.1–231.6 |
| **Specialist Type** | contract |
| **Purpose** | Print layouts, PDF export, drill-down state, server-side aggregation interface |
| **Activation Trigger** | Report export, print layout, PDF generation, drill-down navigation |
| **Complements** | 230.x chart-types, 240.x government-form-layout |

---

## Rules

### 231.1 — Print Layout Sizes

| Layout | Width | Height | Use |
|--------|-------|--------|-----|
| A4 Portrait | 210mm | 297mm | Standard reports, 月次報告 |
| A4 Landscape | 297mm | 210mm | Wide tables, comparison charts |
| A3 Portrait | 297mm | 420mm | Detailed 帳票, multi-section |
| A3 Landscape | 420mm | 297mm | Dashboard snapshots, 一覧表 |

```css
/* ✅ Print media query */
@media print {
  .print-a4-portrait { width: 210mm; min-height: 297mm; }
  .print-a4-landscape { width: 297mm; min-height: 210mm; }
  .print-a3-landscape { width: 420mm; min-height: 297mm; }
}
```

### 231.2 — PDF Export Requirements

- ✅ Font embedding: Noto Sans JP (or IPA明朝 for formal 帳票)
- ✅ Color space: sRGB for screen, CMYK option for professional print
- ✅ Vector charts (SVG → PDF path conversion, NOT rasterized screenshots)
- ❌ NEVER use canvas `toDataURL()` for chart export — loses resolution at print DPI

### 231.3 — WCAG AAA for Printed Reports

| Requirement | Criteria |
|------------|---------|
| Text contrast | ≥7:1 ratio (AAA) for body text |
| Font size | ≥10pt body, ≥12pt headers |
| Line spacing | ≥1.5× for body paragraphs |
| Chart labels | ≥8pt minimum, high contrast on white background |

- ✅ Force `className="print:text-black print:bg-white"` for print styles
- ❌ NEVER rely on color alone in printed charts — add patterns/labels

### 231.4 — Drill-Down State Contract

State encoded in URL params for shareable deep-links.

```tsx
// ✅ URL param structure
// /reports/sales?period=2026-Q1&region=tokyo&level=branch&branch=shibuya

interface DrillDownState {
  period: string;      // ISO period or JP fiscal (R08-Q1)
  region?: string;     // Top-level filter
  level: 'summary' | 'region' | 'branch' | 'detail';
  [dimension: string]: string | undefined;
}

// ✅ Breadcrumb reflects drill path
<Breadcrumb items={[
  { title: '全体', href: '?level=summary' },
  { title: '東京', href: '?level=region&region=tokyo' },
  { title: '渋谷支店', href: '?level=branch&branch=shibuya' },
]} />
```

### 231.5 — Server-Side Aggregation Interface

```typescript
// ✅ Aggregation request contract
interface AggregationRequest {
  dataSource: string;
  dimensions: string[];       // GROUP BY fields
  measures: { field: string; fn: 'sum' | 'avg' | 'count' | 'min' | 'max' }[];
  filters: { field: string; op: 'eq' | 'gt' | 'lt' | 'between' | 'in'; value: unknown }[];
  sort: { field: string; order: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}
```

- ✅ All aggregation server-side — NEVER fetch raw rows to client for chart rendering
- ❌ NEVER `SELECT *` — always project only required columns

### 231.6 — Export File Naming Convention

```
{org}_{report-type}_{period}_{timestamp}.{ext}
// Example: acme_monthly-sales_202604_20260405T1430.pdf
// JP: 株式会社エース_月次売上_令和8年4月_20260405.pdf
```

- ✅ Use `encodeURIComponent` for JP characters in download filenames
- ✅ Include generation timestamp for audit trail
