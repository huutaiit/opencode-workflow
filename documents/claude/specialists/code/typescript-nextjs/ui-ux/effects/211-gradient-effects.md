# Gradient Effects Specialist
# グラデーションエフェクトスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 211.1–211.4 |
| **Specialist Type** | rule-set |
| **Purpose** | Card gradient, layout gradient, text gradient, dark mode variants |
| **Activation Trigger** | gradient, fade, blend |
| **Complements** | 200.x color-system |

---

## Rules

### 211.1 — Card Gradient

Subtle gradient backgrounds for cards and panels.

```tsx
// ✅ Subtle gradient card
<div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border p-6">

// ✅ Accent gradient (primary tinted)
<div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-6">

// ❌ WRONG: Strong multi-color gradients — looks unprofessional
<div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
```

### 211.2 — Layout Gradient

Background gradients for sections and hero areas.

```tsx
// ✅ Section fade
<section className="bg-gradient-to-b from-gray-50 to-white py-16">

// ✅ Hero gradient overlay on image
<div className="relative">
  <Image src="/hero.jpg" fill className="object-cover" alt="" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <h1 className="relative text-white">Title</h1>
</div>
```

### 211.3 — Text Gradient

Decorative only — never for body text.

```tsx
// ✅ Headline text gradient
<h1 className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent text-4xl font-bold">
  Dashboard
</h1>

// ❌ WRONG: Text gradient on body text — hard to read
// ❌ WRONG: Text gradient on small text — invisible
```

### 211.4 — Dark Mode Gradients

Reduce gradient intensity in dark mode — subtlety matters more.

```tsx
<div className={cn(
  "bg-gradient-to-br rounded-lg p-6",
  "from-white to-gray-50",           // light: visible gradient
  "dark:from-gray-800 dark:to-gray-850" // dark: very subtle
)}>
```

- ❌ NEVER use bright gradients in dark mode — causes eye strain
- ✅ Use tonal gradients (same hue, ±1 shade) for dark mode
