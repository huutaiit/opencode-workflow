# Visual Hierarchy Specialist
# ビジュアルヒエラルキースペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 226.1–226.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Whitespace rhythm, alignment grid, size contrast, reading flow, content density |
| **Activation Trigger** | visual hierarchy, whitespace, spacing rhythm, alignment, content density, layout |
| **Complements** | 201.x spacing-scale, 202.x typography-scale, 222.x responsive-layout |

---

## Rules

### 226.1 — Whitespace Rhythm

Consistent vertical spacing creates rhythm. Use a repeating scale, NOT arbitrary values.

| Relationship | Spacing | Tailwind | Use |
|-------------|---------|----------|-----|
| Inline (related) | 4–8px | `gap-1` / `gap-2` | Icon + label, tag group |
| Intra-group | 12–16px | `space-y-3` / `space-y-4` | Form fields, list items |
| Inter-group | 24–32px | `space-y-6` / `space-y-8` | Sections within a card |
| Section | 48–64px | `space-y-12` / `space-y-16` | Page sections |

```tsx
// ✅ Consistent vertical rhythm
<div className="space-y-8">
  <section className="space-y-4">{/* Form group 1 */}</section>
  <section className="space-y-4">{/* Form group 2 */}</section>
</div>

// ❌ WRONG: Arbitrary spacing breaks rhythm
<div className="mt-3 mb-7 pt-5">  // → inconsistent, hard to maintain
```

### 226.2 — 8px Alignment Grid

All spacing, sizing, and positioning align to 8px grid (4px for fine adjustments).

```tsx
// ✅ 8px-aligned values: 8, 16, 24, 32, 40, 48
<div className="p-4 gap-4">   {/* 16px = 2×8 ✅ */}
<div className="p-6 gap-6">   {/* 24px = 3×8 ✅ */}
<div className="p-8 gap-8">   {/* 32px = 4×8 ✅ */}
<div className="h-10 w-10">   {/* 40px = 5×8 ✅ */}

// ✅ 4px for fine adjustments
<div className="p-2 gap-2">   {/* 8px = 1×8 ✅ */}
<div className="p-1 gap-1">   {/* 4px = 0.5×8 ✅ */}

// ❌ WRONG: Non-grid values
<div className="p-[13px] gap-[7px]">  // → off-grid, misaligned
```

### 226.3 — Size Contrast (Action Hierarchy)

| Level | Button | Font | Visual Weight |
|-------|--------|------|--------------|
| Primary | `type="primary"` size="large" | `text-base font-semibold` | Filled bg + bold |
| Secondary | `type="default"` | `text-sm font-medium` | Outlined/ghost |
| Tertiary | `type="link"` or `type="text"` | `text-sm font-normal` | Text only |

```tsx
// ✅ Clear action hierarchy
<div className="flex items-center gap-3">
  <Button type="primary" size="large">Save Changes</Button>
  <Button>Cancel</Button>
  <Button type="link">Delete</Button>
</div>

// ❌ WRONG: All actions same weight
<div className="flex gap-2">
  <Button type="primary">Save</Button>
  <Button type="primary">Cancel</Button>
  <Button type="primary">Delete</Button>
</div>
```

### 226.4 — Reading Flow Patterns

| Pattern | Layout | Best For |
|---------|--------|----------|
| F-pattern | Left-aligned content | Text-heavy pages, dashboards |
| Z-pattern | Hero → CTA flow | Landing pages, marketing |

```tsx
// ✅ F-pattern: align key info to left
<div className="max-w-4xl">
  <h1 className="text-left text-2xl font-bold">Title</h1>
  <p className="text-left text-gray-600">Description</p>
  <div className="mt-6">{/* Content grid, left-aligned */}</div>
</div>

// ✅ Z-pattern: top-left brand → top-right CTA → bottom-left info → bottom-right action
// Used for landing/hero sections

// ❌ WRONG: Center-aligned body text (breaks F-pattern scanning)
<p className="text-center">Long paragraph text...</p>  // → hard to scan
```

### 226.5 — Content Density Levels

| Level | Row Height | Padding | Font | Use Case |
|-------|-----------|---------|------|----------|
| Compact | 32px | `py-1 px-2` | `text-xs` | Data tables, admin |
| Comfortable | 44px | `py-2 px-3` | `text-sm` | Default, forms |
| Spacious | 56px | `py-3 px-4` | `text-base` | Public pages, mobile |

```tsx
// ✅ AntD Table density via size prop
<Table size="small" />    {/* compact */}
<Table size="middle" />   {/* comfortable */}
<Table size="large" />    {/* spacious */}

// ✅ Configurable density (user preference)
<div className={cn(
  density === 'compact' && 'text-xs [&_td]:py-1',
  density === 'comfortable' && 'text-sm [&_td]:py-2',
  density === 'spacious' && 'text-base [&_td]:py-3',
)}>

// ❌ WRONG: One-size-fits-all density for all contexts
```
