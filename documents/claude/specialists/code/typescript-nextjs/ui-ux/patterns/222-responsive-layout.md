# Responsive Layout Specialist
# レスポンシブレイアウトスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 222.1–222.7 |
| **Specialist Type** | rule-set |
| **Purpose** | Mobile-first breakpoints, container queries, fluid typography, grid, responsive spacing |
| **Activation Trigger** | responsive, breakpoint, mobile, grid, layout, container query, fluid typography |
| **Complements** | 201.x spacing-scale, 202.x typography-scale |

---

## Rules

### 222.1 — Mobile-First Breakpoints

| Breakpoint | Width | Tailwind | AntD `xs/sm/md/lg/xl/xxl` |
|-----------|-------|----------|---------------------------|
| Base | 0–639px | (default) | xs: 0 |
| sm | 640px | `sm:` | sm: 576 |
| md | 768px | `md:` | md: 768 |
| lg | 1024px | `lg:` | lg: 992 |
| xl | 1280px | `xl:` | xl: 1200 |
| 2xl | 1536px | `2xl:` | xxl: 1600 |

```tsx
// ✅ Mobile-first: stack → row
<div className="flex flex-col md:flex-row gap-4">

// ✅ AntD Grid responsive
<Row gutter={[16, 16]}>
  <Col xs={24} md={12} xl={8}>Card</Col>
</Row>

// ❌ WRONG: Desktop-first (hiding on mobile)
<div className="flex flex-row sm:flex-col">  // → wrong direction
```

### 222.2 — Container Queries

Use container queries for component-level responsiveness (independent of viewport).

```tsx
// ✅ Tailwind v4 container queries
<div className="@container">
  <div className="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3">
    {/* Responds to container width, not viewport */}
  </div>
</div>

// ❌ WRONG: Viewport breakpoints for reusable components
// A card component should NOT use md: — it doesn't know its container
```

### 222.3 — Fluid Typography

```tsx
// ✅ clamp() for fluid sizing (min, preferred, max)
// globals.css
@theme {
  --text-fluid-sm: clamp(0.875rem, 0.8rem + 0.25vw, 1rem);
  --text-fluid-base: clamp(1rem, 0.9rem + 0.35vw, 1.125rem);
  --text-fluid-lg: clamp(1.25rem, 1rem + 0.75vw, 1.5rem);
  --text-fluid-xl: clamp(1.5rem, 1.2rem + 1vw, 2rem);
}

// ✅ Usage
<h1 className="text-fluid-xl">Responsive Heading</h1>

// ❌ WRONG: Fixed size that doesn't scale
<h1 className="text-2xl">  // → too large on mobile, too small on 4K
```

### 222.4 — 12-Column Grid

```tsx
// ✅ AntD Grid (24-column base, use even numbers for 12-col)
<Row gutter={[16, 16]}>
  <Col xs={24} md={12} lg={8}>{/* 1/1 → 1/2 → 1/3 */}</Col>
</Row>

// ✅ Tailwind CSS Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ❌ WRONG: Mixing AntD Grid and Tailwind grid on same element
```

### 222.5 — Responsive Spacing

| Viewport | Base Unit | Gap | Padding |
|----------|----------|-----|---------|
| Mobile (<640px) | 4px | gap-3 (12px) | p-4 (16px) |
| Tablet (640–1024px) | 4px | gap-4 (16px) | p-6 (24px) |
| Desktop (>1024px) | 4px | gap-6 (24px) | p-8 (32px) |

```tsx
// ✅ Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
<div className="gap-3 md:gap-4 lg:gap-6">

// ✅ AntD responsive gutter
<Row gutter={[{ xs: 8, sm: 16, md: 24 }, { xs: 8, sm: 16 }]}>
```

### 222.6 — Max Content Width

```tsx
// ✅ Constrain content for readability
<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
<article className="max-w-prose mx-auto">  {/* ~65ch for reading */}

// ❌ WRONG: Full-width text content (>80ch per line hurts readability)
```

### 222.7 — Responsive Visibility

```tsx
// ✅ Show/hide by breakpoint
<nav className="hidden md:flex">Desktop Nav</nav>
<button className="md:hidden">Mobile Menu</button>

// ✅ AntD responsive display
<Col xs={0} md={6}>Sidebar (hidden on mobile)</Col>

// ❌ WRONG: display:none with inline style for responsiveness
```
