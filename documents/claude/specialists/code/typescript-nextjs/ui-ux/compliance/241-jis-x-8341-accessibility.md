# JIS X 8341 Accessibility Specialist
# JIS X 8341アクセシビリティスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 241.1–241.6 |
| **Specialist Type** | rule-set |
| **Purpose** | JIS X 8341-3:2016 compliance, ruby text, JP screen readers, form labels |
| **Activation Trigger** | Accessibility audit, JP government system, screen reader support |
| **Complements** | 200.x color-system, 240.x government-form-layout |

---

## Rules

### 241.1 — JIS X 8341-3:2016 Overview

JIS X 8341-3:2016 is a superset of WCAG 2.1 AA with JP-specific additions.

| WCAG Level | JIS Equivalent | Required For |
|-----------|---------------|-------------|
| A | 適合レベルA | All web content |
| AA | 適合レベルAA | Government systems (総務省指針) |
| AAA | 適合レベルAAA | Financial/banking (recommended) |

- ✅ Target AA minimum, AAA for financial applications
- ✅ Test with JP screen readers: NVDAjp, VoiceOver (macOS JP), PC-Talker

### 241.2 — Ruby Text for Kanji (フリガナ)

```tsx
// ✅ Ruby annotation for complex kanji
<ruby className="text-base">
  取引先<rp>(</rp><rt className="text-[0.6em] text-gray-500">とりひきさき</rt><rp>)</rp>
</ruby>

// ✅ Accessible ruby — screen readers announce both
<ruby aria-label="取引先（とりひきさき）">
  取引先<rp>(</rp><rt>とりひきさき</rt><rp>)</rp>
</ruby>
```

- ✅ Use `<ruby>/<rt>` for legal terms, person names, place names
- ✅ Ruby font size: 0.5–0.6em of parent
- ❌ NEVER use title attribute as furigana substitute — not accessible

### 241.3 — 読み上げ Screen Reader Patterns

```tsx
// ✅ NVDAjp-compatible aria-label (in Japanese)
<button aria-label="検索を実行する">
  <SearchOutlined />
</button>

// ✅ Live region for JP announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage} {/* "3件の検索結果があります" */}
</div>

// ✅ Table header reading order (JP: top-to-bottom, left-to-right)
<Table
  columns={columns}
  aria-label="取引一覧テーブル"
  summary="取引先名、金額、日付の一覧です"
/>
```

- ✅ All `aria-label` values in Japanese for JP systems
- ❌ NEVER use English aria-labels on JP-facing applications

### 241.4 — Color Contrast for Government Systems

JP government systems require higher contrast than standard WCAG AA.

| Element | Standard WCAG AA | JP Government (推奨) |
|---------|-----------------|---------------------|
| Body text | 4.5:1 | 5.0:1 |
| Large text | 3:1 | 4.0:1 |
| UI components | 3:1 | 3.5:1 |
| Focus indicator | 3:1 | 4.5:1 (visible at 2px+) |

- ✅ `className="text-gray-900 dark:text-gray-50"` (meets 5:1+)
- ❌ NEVER use `text-gray-500` for body text in government systems

### 241.5 — JP-Specific Form Labels (全角/半角)

```tsx
// ✅ Input type indication
<Form.Item
  label="電話番号"
  extra="半角数字で入力してください"
  rules={[{ pattern: /^[0-9-]+$/, message: '半角数字で入力してください' }]}
>
  <Input placeholder="03-1234-5678" inputMode="tel" />
</Form.Item>

// ✅ Full-width/half-width indicator
<Form.Item label="氏名" extra="全角で入力してください">
  <Input placeholder="山田 太郎" />
</Form.Item>
```

- ✅ Always indicate 全角 (full-width) or 半角 (half-width) in `extra` or help text
- ✅ Use `inputMode` attribute for mobile keyboard optimization
- ❌ NEVER silently reject input without explaining 全角/半角 requirement

### 241.6 — Keyboard Navigation (JIS 7.2.1)

```tsx
// ✅ Focus visible — 2px+ ring, high contrast
<Button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">

// ✅ Skip navigation link (Japanese)
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded">
  メインコンテンツへスキップ
</a>
```

- ✅ Tab order follows visual order (left→right, top→bottom)
- ✅ All interactive elements reachable via keyboard
- ❌ NEVER use `tabIndex` > 0 — disrupts natural order
