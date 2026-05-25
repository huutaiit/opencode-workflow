# Spacing Scale Specialist
# スペーシングスケールスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 201.1–201.6 |
| **Specialist Type** | rule-set |
| **Purpose** | 4px base grid, spacing scale, density modes, touch target spacing |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | 119.x tailwind-css-specialist |

---

## Rules

### 201.1 — 4px Base Grid

ALL spacing = multiples of 4px. This creates visual rhythm consistency.

```tsx
// ✅ Tailwind (4px base = --spacing: 0.25rem)
<div className="p-4">        {/* 16px = 4×4 */}
<div className="gap-3">      {/* 12px = 4×3 */}
<div className="mb-6">       {/* 24px = 4×6 */}

// ✅ AntD tokens
// marginXXS=4, marginXS=8, marginSM=12, margin=16, marginMD=20, marginLG=24, marginXL=32, marginXXL=48

// ❌ WRONG: Arbitrary values
<div className="p-[13px]">   {/* Not 4px multiple */}
<div className="gap-[7px]">  {/* Not 4px multiple */}
```

### 201.2 — Scale Definition

| Token | Tailwind | px | AntD Token |
|-------|---------|-----|-----------|
| 0 | p-0 | 0 | — |
| 1 | p-1 | 4 | marginXXS |
| 2 | p-2 | 8 | marginXS |
| 3 | p-3 | 12 | marginSM |
| 4 | p-4 | 16 | margin |
| 5 | p-5 | 20 | marginMD |
| 6 | p-6 | 24 | marginLG |
| 8 | p-8 | 32 | marginXL |
| 10 | p-10 | 40 | — |
| 12 | p-12 | 48 | marginXXL |

### 201.3 — Section Spacing

| Context | Spacing | Tailwind |
|---------|---------|---------|
| Between related items (label→input) | 4–8px | space-y-1, space-y-2 |
| Between siblings (input→input) | 12–16px | space-y-3, space-y-4 |
| Between sections | 24–32px | space-y-6, space-y-8 |
| Page margin (content padding) | 16–24px | p-4, p-6 |
| Card internal padding | 16–24px | p-4, p-6 |

```tsx
// ✅ Consistent section spacing
<div className="space-y-6">
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">Section Title</h2>
    <div className="space-y-3">{/* form fields */}</div>
  </section>
  <section className="space-y-4">...</section>
</div>
```

### 201.4 — Density Modes

| Mode | Scale | Use Case |
|------|-------|---------|
| Compact | ×0.75 | Data tables, admin dashboards |
| Comfortable | ×1.0 (default) | Standard layouts |
| Spacious | ×1.25 | Marketing, public-facing |

```tsx
// ✅ AntD compact mode
<ConfigProvider theme={{ algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm] }}>
```

### 201.5 — Touch Target Spacing

- Minimum 8px gap between interactive elements (WCAG 2.5.8)
- Touch target minimum: 24×24px (AA), 44×44px (AAA)

```tsx
// ✅ Adequate spacing between buttons
<Space size="middle" className="gap-3">  {/* 12px gap */}
  <Button>Cancel</Button>
  <Button type="primary">Save</Button>
</Space>

// ❌ WRONG: Buttons touching
<div className="gap-0"><Button>A</Button><Button>B</Button></div>
```

### 201.6 — Responsive Spacing

| Breakpoint | Content Padding | Section Gap |
|-----------|----------------|-------------|
| Mobile (<640px) | p-4 (16px) | space-y-4 |
| Tablet (640–1024px) | p-6 (24px) | space-y-6 |
| Desktop (>1024px) | p-8 (32px) | space-y-8 |

```tsx
<main className="p-4 sm:p-6 lg:p-8">
  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
```
