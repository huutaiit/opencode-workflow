# Animation & Transition Specialist
# アニメーション＆トランジションスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 212.1–212.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Duration conventions, easing functions, prefers-reduced-motion, AntD Motion |
| **Activation Trigger** | animation, transition, motion, hover, fade, slide |
| **Complements** | 96.x web-design-guidelines |

---

## Rules

### 212.1 — Duration Conventions

| Interaction | Duration | Tailwind | Rationale |
|-------------|---------|---------|-----------|
| Hover enter/exit | 150ms | duration-150 | Fast feedback |
| Focus | 0ms (instant) | — | Immediate response |
| Active/press | 100ms | duration-100 | Snappy feel |
| Tooltip appear | 200ms | duration-200 | Quick info |
| Dropdown open | 200ms | duration-200 | Medium reveal |
| Modal enter | 250–300ms | duration-300 | Smooth entrance |
| Modal exit | 200ms | duration-200 | Faster dismiss |
| Page transition | 300–400ms | duration-300 | Comfortable pace |
| Skeleton shimmer | 1.5–2s loop | animate-pulse | Continuous loading |

### 212.2 — Easing Functions

| Name | CSS | Tailwind | Use |
|------|-----|---------|-----|
| ease-out | cubic-bezier(0, 0, 0.58, 1) | ease-out | Elements entering view |
| ease-in | cubic-bezier(0.42, 0, 1, 1) | ease-in | Elements leaving view |
| ease-in-out | cubic-bezier(0.42, 0, 0.58, 1) | ease-in-out | Position changes |

```tsx
// ✅ Enter: ease-out, Exit: ease-in
<div className="transition-all duration-300 ease-out">  {/* entering */}
<div className="transition-opacity duration-200 ease-in"> {/* leaving */}
```

### 212.3 — Prefers-Reduced-Motion (MANDATORY)

```tsx
// ✅ Respect user preference
<div className="motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none">

// ✅ Global CSS approach
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- ❌ NEVER ignore prefers-reduced-motion — accessibility requirement (WCAG 2.3.3)

### 212.4 — AntD Motion Integration

AntD components have built-in animations. Respect their patterns:

```tsx
// ✅ AntD handles its own animations
<Modal open={isOpen} /* built-in fade + slide */}>
<Collapse /* built-in height animation */}>
<Dropdown /* built-in slide-up */ trigger={['click']}>

// ❌ WRONG: Adding extra transition to AntD animated components
<Modal className="transition-all duration-300"> {/* conflicts with built-in */}
```

### 212.5 — Common Transition Patterns

```tsx
// ✅ Fade in
<div className="opacity-0 animate-in fade-in duration-300">

// ✅ Slide up (toast, notification)
<div className="translate-y-4 animate-in slide-in-from-bottom duration-300">

// ✅ Scale (button press)
<button className="active:scale-[0.98] transition-transform duration-100">

// ✅ Height collapse (accordion)
<div className="grid transition-[grid-template-rows] duration-300"
     style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
  <div className="overflow-hidden">{content}</div>
</div>
```

### 212.6 — When NOT to Animate

- `prefers-reduced-motion: reduce` is set
- Purely decorative (no information conveyed)
- >5 seconds without pause control (WCAG 2.2.2)
- High-frequency repeated actions (debounce instead)
- Table row updates (data-heavy — skip animation)
