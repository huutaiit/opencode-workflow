# Government Form Layout Specialist
# 行政帳票レイアウトスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 240.1–240.6 |
| **Specialist Type** | rule-set |
| **Purpose** | 帳票 formatting, print margins, hanko zones, watermark, page numbering, header/footer |
| **Activation Trigger** | Government/official document rendering, 帳票 print layout |
| **Complements** | 231.x bi-output, 241.x jis-accessibility |

---

## Rules

### 240.1 — 帳票 (Chōhyō) Formatting Rules

Ref: 行政標準ガイドライン (Government Standard Guidelines)

| Element | Rule |
|---------|------|
| Paper size | A4 (default) or A3 for detailed tables |
| Orientation | Portrait for text-heavy, Landscape for wide tables |
| Font | 明朝体 (Mincho) for formal, ゴシック体 (Gothic) for forms |
| Font size | Title: 14pt, Section: 12pt, Body: 10.5pt, Notes: 9pt |
| Line spacing | 1.5× for body text |

- ✅ `className="font-serif print:text-[10.5pt] print:leading-relaxed"`
- ❌ NEVER use decorative fonts in government forms

### 240.2 — Print Margins (上下左右25mm)

```css
@media print {
  @page {
    margin: 25mm;          /* 上下左右 uniform 25mm */
    size: A4 portrait;     /* or A3 landscape */
  }
  @page :first { margin-top: 30mm; }  /* Extra top for title block */
}
```

- ✅ Inner content width: A4 portrait = 210 - 50 = 160mm
- ✅ Inner content width: A3 landscape = 420 - 50 = 370mm
- ❌ NEVER reduce margins below 20mm — risks content clipping on printers

### 240.3 — Hanko Stamp Placement Zones (印鑑欄)

```tsx
// ✅ Hanko zone layout — top-right of document
<div className="absolute top-0 right-0 flex gap-0 border border-gray-400 print:border-black">
  {['承認', '確認', '起案'].map(role => (
    <div key={role} className="w-[20mm] h-[25mm] border-r border-gray-400 print:border-black flex flex-col">
      <span className="text-[8pt] text-center border-b border-gray-400 px-1">{role}</span>
      <div className="flex-1" /> {/* Stamp image area */}
    </div>
  ))}
</div>
```

- ✅ Each hanko cell: 20mm wide × 25mm tall
- ✅ Role labels: 承認 (approval), 確認 (review), 起案 (draft)
- ✅ Right-to-left order: highest authority on the right

### 240.4 — Watermark Overlay

```tsx
// ✅ Watermark via CSS pseudo-element
<div className="relative">
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50 print:block">
    <span className="text-6xl font-bold text-gray-300/30 rotate-[-30deg] select-none">
      {watermark} {/* "DRAFT" / "下書き" / "CONFIDENTIAL" / "社外秘" */}
    </span>
  </div>
  {children}
</div>
```

- ✅ Supported values: `DRAFT` / `下書き`, `CONFIDENTIAL` / `社外秘`, `COPY` / `写`
- ❌ NEVER make watermark opaque — max `opacity-30`

### 240.5 — Page Numbering Convention

Format: `Page X of Y` / `X / Y ページ`

```tsx
// ✅ Page number footer (CSS counters for print)
// In print stylesheet:
// @page { @bottom-center { content: counter(page) " / " counter(pages) " ページ"; } }

// Screen preview:
<footer className="text-center text-xs text-gray-500 mt-4 print:hidden">
  {currentPage} / {totalPages} ページ
</footer>
```

### 240.6 — Header/Footer Standards

| Zone | Content |
|------|---------|
| Header left | Organization name (組織名) |
| Header center | Document title (文書名) |
| Header right | Document code (文書番号) e.g., `R08-ADM-0001` |
| Footer left | Classification (取扱区分): 公開/部外秘/極秘 |
| Footer center | Page numbering (240.5) |
| Footer right | Date (作成日): `令和8年4月5日` format |

- ✅ Header/footer font: 9pt, `className="text-[9pt] text-gray-600 print:text-black"`
- ❌ NEVER omit document code on official forms
