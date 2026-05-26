# Tailwind CSS Specialist
# Tailwind CSSスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `globals.css`, `tailwind.config.*`, component files |
| **Variant** | ALL |
| **Pattern Numbers** | 119.1–119.7 |
| **Source Paths** | `**/*.tsx`, `globals.css`, `tailwind.config.ts` |
| **File Count** | N/A (applies to all component files) |
| **Naming Convention** | Tailwind utility classes, kebab-case CSS variables |
| **Imports From** | `tailwindcss`, `clsx`, `tailwind-merge` |
| **Imported By** | ALL component files |
| **Cannot Import** | N/A |
| **Dependencies** | tailwindcss@4, @tailwindcss/postcss@4, clsx, tailwind-merge, next-themes |
| **When To Use** | Utility-first CSS styling with responsive design, dark mode, design tokens |
| **Source Skeleton** | `globals.css`, `tailwind.config.ts`, `lib/utils.ts`, `postcss.config.mjs` |
| **Specialist Type** | tool |
| **Purpose** | Tailwind CSS v4: @theme directive, utility-first, responsive design, dark mode, design tokens, CSS variables |
| **Activation Trigger** | tailwind, css, className, clsx, responsive, dark mode, theme, styling |

---

## Rules

### 119.1 — Tailwind v4 @theme Directive

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Design tokens */
  --color-primary: #1677ff;
  --color-secondary: #722ed1;
  --color-destructive: #ff4d4f;
  --color-muted: #8c8c8c;

  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

### 119.2 — Utility-First Rules

```tsx
// ✅ Utility classes — no custom CSS
<div className="flex items-center gap-4 rounded-lg bg-white p-6 shadow-sm">
  <img className="h-12 w-12 rounded-full" src={avatar} alt="" />
  <div>
    <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
    <p className="text-sm text-muted">{email}</p>
  </div>
</div>

// ✅ Conditional classes with clsx
import { clsx } from 'clsx'

<button className={clsx(
  'rounded-md px-4 py-2 font-medium transition-colors',
  variant === 'primary' && 'bg-primary text-white hover:bg-primary/90',
  variant === 'outline' && 'border border-gray-300 bg-white hover:bg-gray-50',
  disabled && 'cursor-not-allowed opacity-50',
)}>
  {label}
</button>
```

**Rules**:
- Utility classes for ALL styling
- Avoid custom CSS unless absolutely necessary
- Maintain consistent class order (layout → spacing → typography → visual)
- Use `clsx` or `cn` helper for conditional classes

### 119.3 — Responsive Design (Mobile-First)

```tsx
// ✅ Mobile-first: base → sm → md → lg → xl → 2xl
<div className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2
  md:grid-cols-3
  lg:grid-cols-4
">
  {items.map(item => <Card key={item.id} item={item} />)}
</div>

// ✅ Responsive text
<h1 className="text-2xl font-bold md:text-3xl lg:text-4xl">
  Dashboard
</h1>
```

### 119.4 — Dark Mode (next-themes)

```tsx
// ✅ CSS variables + dark mode
@theme {
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
}

.dark {
  --color-background: #0a0a0a;
  --color-foreground: #ffffff;
}

// ✅ Usage with dark: variant
<div className="bg-background text-foreground">
  <div className="border border-gray-200 dark:border-gray-800">
    Content
  </div>
</div>
```

### 119.5 — cn() Helper (clsx + tailwind-merge)

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ Prevents class conflicts
cn('px-4 py-2', 'px-6') // → 'py-2 px-6' (px-6 wins, not both)
```

### 119.6 — Integration with next/image

```tsx
import Image from 'next/image'

// ✅ Tailwind classes on next/image
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  className="rounded-lg object-cover"
  priority // LCP image
/>

// ✅ Responsive with fill
<div className="relative aspect-video">
  <Image
    src="/banner.jpg"
    alt="Banner"
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
</div>
```

### 119.7 — Integration with Ant Design Components

AntD components chấp nhận `className` prop — LUÔN dùng Tailwind classes thay vì `style` prop.

```tsx
// ❌ WRONG: Inline styles — mất responsive, dark mode, CSS purging
<Button style={{ marginBottom: '16px', padding: '8px 24px' }}>Submit</Button>
<Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
    <Input style={{ width: '300px' }} />
  </div>
</Card>

// ✅ CORRECT: Tailwind className — responsive, dark mode, purgeable
<Button className="mb-4 px-6 py-2">Submit</Button>
<Card className="rounded-lg shadow-sm">
  <div className="flex items-center gap-3">
    <Input className="w-[300px] md:w-full" />
  </div>
</Card>
```

**Rules**:

| Concern | Use | NOT |
|---------|-----|-----|
| Layout (margin, padding, flex, grid) | Tailwind className | `style={{ margin, padding, display }}` |
| Spacing (gap, space between) | Tailwind `gap-*`, `space-y-*` | `style={{ gap, marginBottom }}` |
| Sizing (width, height) | Tailwind `w-*`, `h-*`, `max-w-*` | `style={{ width, height }}` |
| Colors (text, background, border) | Tailwind `text-*`, `bg-*`, `border-*` | `style={{ color, backgroundColor }}` |
| Typography (font size, weight) | Tailwind `text-*`, `font-*` | `style={{ fontSize, fontWeight }}` |
| Responsive | Tailwind `sm:`, `md:`, `lg:` | Manual media queries |
| Dark mode | Tailwind `dark:` | Runtime theme checks |
| Theme tokens (AntD brand colors) | ConfigProvider `theme={{ token }}` | Direct hex in className |
| Dynamic values (from state/props) | `style={{ width: dynamicPx }}` | ✅ Exception: dynamic only |

```tsx
// ✅ AntD ConfigProvider for theme tokens + Tailwind for utilities
<ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
  <div className="flex flex-col gap-6 p-6">
    <Table className="rounded-lg shadow-sm" dataSource={data} columns={columns} />
    <Space className="justify-end">
      <Button className="min-w-[120px]">Cancel</Button>
      <Button type="primary" className="min-w-[120px]">Save</Button>
    </Space>
  </div>
</ConfigProvider>

// ✅ Dynamic value is the ONLY exception for style prop
<Progress style={{ width: `${percentage}%` }} />
<div style={{ height: calculatedHeight }}>  {/* Dynamic from state */}
```

**AntD className compatibility**: Hầu hết AntD components (Button, Input, Select, Table, Card, Modal, Space, Form, Form.Item) đều nhận `className` prop. Tailwind classes MERGE với AntD internal styles — không gây conflict khi dùng cho layout/spacing.

**Anti-pattern detection**: Nếu thấy `style={{` trong AntD component cho static values (margin, padding, width, colors) → refactor thành Tailwind className.

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Custom CSS for layout | Inconsistent, hard to maintain | Tailwind flex/grid utilities |
| 2 | Inline styles | No responsive, no dark mode | Tailwind classes |
| 3 | `clsx` without `tailwind-merge` | Conflicting classes both apply | Use `cn()` helper |
| 4 | Desktop-first responsive | Harder to maintain | Mobile-first (base → sm → md) |
| 5 | Hardcoded colors | No theme consistency | CSS variables via @theme |
