# Typography Scale Specialist
# タイポグラフィスケールスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 202.1–202.8 |
| **Specialist Type** | rule-set |
| **Purpose** | Type scale hierarchy, line height, font stacks, fluid typography, CJK adjustments |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | 96.x web-design-guidelines |

---

## Rules

### 202.1 — Type Scale Hierarchy

| Role | AntD Size | Tailwind | Use |
|------|----------|---------|-----|
| Display | — | text-4xl (36px) | Hero headings |
| Headline | 24px (fontSizeHeading2) | text-2xl | Page titles |
| Title | 20px (fontSizeHeading3) | text-xl | Section headings |
| Subtitle | 16px (fontSizeHeading5) | text-base font-medium | Card headers |
| Body | 14px (fontSize) | text-sm | Default text (AntD base) |
| Caption | 12px (fontSizeSM) | text-xs | Labels, metadata |

```tsx
// ✅ Tailwind hierarchy
<h1 className="text-2xl font-bold lg:text-4xl">Page Title</h1>
<h2 className="text-xl font-semibold">Section</h2>
<p className="text-sm text-gray-600">Body text</p>
<span className="text-xs text-muted">Caption</span>
```

### 202.2 — Line Height Rules

| Context | Line Height | Tailwind |
|---------|------------|---------|
| Headings | 1.2–1.3× | leading-tight |
| Body text | 1.5–1.6× | leading-relaxed |
| Vietnamese text | ≥1.5× (diacritics) | leading-relaxed (mandatory) |
| Japanese text | 1.5–1.7× (vertical space) | leading-relaxed |
| Single-line (buttons, labels) | 1.0× | leading-none |

- ❌ WRONG: `leading-tight` for body text — cramped, hard to read
- ❌ WRONG: `leading-none` for Vietnamese — clips diacritics (ẫ, ệ, ỹ)

### 202.3 — Font Stack

```css
/* globals.css — @theme */
@theme {
  --font-sans: 'Noto Sans JP', 'Be Vietnam Pro', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

| Priority | Font | Purpose |
|----------|------|---------|
| 1 | Noto Sans JP | JP characters — purpose-built CJK |
| 2 | Be Vietnam Pro | VN diacritics — purpose-built |
| 3 | Inter | Latin — excellent UI font |
| 4 | system-ui | Fallback |

AntD: `fontFamily` token overrides default (AlibabaSans → Noto Sans JP)

### 202.4 — Weight Scale

| Weight | Tailwind | Use |
|--------|---------|-----|
| 400 Regular | font-normal | Body text |
| 500 Medium | font-medium | Labels, subtitles |
| 600 Semibold | font-semibold | Section headings |
| 700 Bold | font-bold | Page titles, emphasis |

- ❌ WRONG: font-thin (100), font-light (300) — too light for JP characters
- ❌ WRONG: font-black (900) — too heavy, CJK strokes merge

### 202.5 — Fluid Typography

```css
/* Responsive without breakpoints */
h1 { font-size: clamp(1.5rem, 1rem + 2.5vw, 2.25rem); }  /* 24px → 36px */
body { font-size: clamp(0.875rem, 0.8rem + 0.25vw, 1rem); } /* 14px → 16px */
```

```tsx
// ✅ Tailwind breakpoint approach (simpler)
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">Title</h1>
```

### 202.6 — Paragraph Rules

- Max width: 65–75ch (`max-w-prose` = 65ch)
- Paragraph spacing: `space-y-4` between paragraphs
- No orphans/widows in print: `text-pretty` (Tailwind v4)

### 202.7 — Code Font

```tsx
// ✅ Monospace for code blocks
<code className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
  {code}
</code>
```

### 202.8 — CJK Adjustments

- JP characters ~2× wider than Latin — adjust column widths
- `letter-spacing: -0.02em` for JP headings (tighter)
- `word-break: keep-all` for JP (don't break within words)
- `word-break: break-word` for VN (break at syllable boundaries)

```tsx
// ✅ JP text
<p className="break-keep tracking-tight">{jpText}</p>
// ✅ VN text
<p className="break-words leading-relaxed">{vnText}</p>
```
