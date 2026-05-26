# Glass Effects Specialist
# ガラスエフェクトスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 210.1–210.4 |
| **Specialist Type** | rule-set |
| **Purpose** | Glassmorphism recipe, calibrated defaults, dark mode fallback |
| **Activation Trigger** | glass, glassmorphism, frosted, backdrop, blur |
| **Complements** | 203.x elevation-shadow |

---

## Rules

### 210.1 — Glassmorphism Recipe

3 ingredients: backdrop-blur + semi-transparent bg + subtle border.

```tsx
// ✅ Standard glass card
<div className="backdrop-blur-md bg-white/60 border border-white/20 rounded-lg shadow-sm">
  {children}
</div>

// ✅ Glass navbar
<nav className="sticky top-0 z-[1020] backdrop-blur-lg bg-white/80 border-b border-gray-200/50">
```

### 210.2 — Calibrated Defaults

| Property | Value | Tailwind |
|----------|-------|---------|
| Blur radius | 8–12px | backdrop-blur-md (12px) |
| Background opacity | 55–75% | bg-white/60 to bg-white/75 |
| Border | 1px white/20–30% | border border-white/20 |
| Shadow | subtle | shadow-sm |

- ❌ Too much blur (>20px): content behind becomes unreadable
- ❌ Too transparent (<40%): text contrast fails WCAG
- ❌ No border: glass panel blends into background

### 210.3 — Dark Mode Glass

```tsx
// ✅ Dark glass — lighter border, darker bg
<div className={cn(
  "backdrop-blur-md rounded-lg border shadow-sm",
  "bg-white/60 border-white/20",           // light
  "dark:bg-gray-900/70 dark:border-white/10" // dark
)}>
```

### 210.4 — Performance & Fallback

- `backdrop-filter` is GPU-intensive — limit to 2–3 glass elements per page
- Fallback for unsupported browsers: solid bg with opacity

```tsx
// ✅ Fallback with @supports
<div className="bg-white/90 supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-md">
```

- ❌ NEVER use glass on scrolling content (causes jank)
- ❌ NEVER stack multiple glass layers (cumulative blur = unreadable)
