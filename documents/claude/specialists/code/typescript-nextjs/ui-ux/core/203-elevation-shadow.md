# Elevation & Shadow Specialist
# エレベーション＆シャドウスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 203.1–203.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Shadow scale, elevation hierarchy, dark mode shadow handling |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | 119.x tailwind-css-specialist |

---

## Rules

### 203.1 — Shadow Scale

| Level | Tailwind | Use | AntD Token |
|-------|---------|-----|-----------|
| None | shadow-none | Flat elements | — |
| Subtle | shadow-xs | Borders, dividers | — |
| Small | shadow-sm | Cards, inputs | boxShadow |
| Medium | shadow-md | Dropdowns, popovers | boxShadowSecondary |
| Large | shadow-lg | Modals, dialogs | boxShadowTertiary |
| Float | shadow-xl | Floating action buttons | — |

```tsx
// ✅ Consistent shadow usage
<Card className="shadow-sm hover:shadow-md transition-shadow">
<Modal className="shadow-lg">
<Popover className="shadow-md">
```

### 203.2 — Elevation Hierarchy

| Elevation | Z-Index | Shadow | Use |
|-----------|---------|--------|-----|
| Base (0) | z-0 | shadow-none | Page content |
| Raised (1) | z-10 | shadow-sm | Cards, panels |
| Floating (2) | z-20 | shadow-md | Dropdowns, popover |
| Overlay (3) | z-30 | shadow-lg | Modal, drawer |
| Toast (4) | z-40 | shadow-xl | Notifications |

### 203.3 — Dark Mode Shadow Handling

Shadows are invisible on dark backgrounds — use border/tint instead.

```tsx
// ✅ Light: shadow, Dark: border
<div className="shadow-sm dark:shadow-none dark:border dark:border-gray-700">
// ✅ Elevated surfaces are LIGHTER in dark mode (surface tint)
<div className="bg-white dark:bg-gray-800">  {/* base */}
<div className="bg-white shadow-sm dark:bg-gray-750"> {/* elevated = lighter */}
```

- ❌ WRONG: Same shadow in dark mode — invisible, wastes rendering

### 203.4 — Card Shadow Pattern

```tsx
// ✅ Standard card with hover elevation
<div className={cn(
  "rounded-lg border bg-white p-6",
  "shadow-sm hover:shadow-md transition-shadow duration-200",
  "dark:bg-gray-800 dark:border-gray-700 dark:shadow-none dark:hover:border-gray-600"
)}>
```

### 203.5 — Input Shadow (Focus Ring)

```tsx
// ✅ Focus ring = elevation change (not shadow-based)
<Input className="focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1" />
```

### 203.6 — Print Shadow

- ❌ Remove all shadows for print: `print:shadow-none`
- Box shadows don't render well on paper — use borders instead
