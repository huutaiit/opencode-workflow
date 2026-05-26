# Focus & Accessibility Specialist
# フォーカス＆アクセシビリティスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 224.1–224.7 |
| **Specialist Type** | rule-set |
| **Purpose** | WCAG 2.2 focus appearance, keyboard navigation, focus trap, skip links, motion/contrast |
| **Activation Trigger** | accessibility, a11y, focus, keyboard navigation, skip link, screen reader, WCAG |
| **Complements** | 221.x hover-interaction, 200.x color-system |

---

## Rules

### 224.1 — Focus Appearance (WCAG 2.4.11)

| Requirement | Value | Implementation |
|------------|-------|----------------|
| Perimeter | ≥2px solid | `ring-2` |
| Contrast | ≥3:1 vs adjacent | `ring-primary-500` on white/dark bg |
| Offset | ≥2px from edge | `ring-offset-2` |
| Visibility | keyboard only | `focus-visible:` (NOT `focus:`) |

```tsx
// ✅ Standard focus ring for custom elements
<button className="focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none">

// ✅ AntD components have built-in focus — verify, don't override

// ❌ WRONG: outline-none without replacement
<button className="outline-none">  // → invisible focus = WCAG failure
// ❌ WRONG: focus: instead of focus-visible:
<button className="focus:ring-2">  // → shows ring on mouse click too
```

### 224.2 — Keyboard Navigation Patterns

| Key | Action | Context |
|-----|--------|---------|
| Tab | Move to next focusable | Global |
| Shift+Tab | Move to previous focusable | Global |
| Enter/Space | Activate button/link | Interactive elements |
| Escape | Close overlay/cancel | Modal, dropdown, popover |
| Arrow keys | Navigate within group | Menu, radio, tabs, listbox |
| Home/End | First/last item | Lists, menus |

```tsx
// ✅ Role + keyboard for custom components
<div role="listbox" onKeyDown={handleArrowNavigation}>
  <div role="option" tabIndex={0} aria-selected={selected}>

// ✅ AntD Menu, Tabs, Select — keyboard nav is built-in
// ❌ NEVER re-implement keyboard nav for AntD components
```

### 224.3 — Focus Trap for Modals

```tsx
// ✅ AntD Modal auto-traps focus — use as-is
<Modal open={open} onCancel={onClose}>

// ✅ Custom overlay — use focus-trap library
import { FocusTrap } from 'focus-trap-react';
<FocusTrap><div role="dialog" aria-modal="true">{children}</div></FocusTrap>

// ❌ WRONG: Modal without focus trap (Tab escapes to background)
```

### 224.4 — Skip Links

```tsx
// ✅ Skip to main content (first focusable element)
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg">
  Skip to main content
</a>
<main id="main-content" tabIndex={-1}>
```

### 224.5 — Touch Targets (WCAG 2.5.8)

| Level | Min Size | Spacing | Use |
|-------|----------|---------|-----|
| AA | 24×24 px | ≥2px gap | Desktop icons |
| AAA | 44×44 px | ≥8px gap | Mobile primary actions |

```tsx
// ✅ Adequate touch target with padding
<button className="min-h-[44px] min-w-[44px] p-3">
<a className="inline-flex items-center min-h-[44px] px-4">

// ❌ WRONG: Icon-only without adequate hit area
<button className="p-1"><CloseOutlined /></button>  // → ~24px, fails AAA
```

### 224.6 — Prefers-Reduced-Motion

```tsx
// ✅ Respect motion preference
<div className="transition-transform motion-reduce:transition-none motion-reduce:transform-none">

// ✅ Global in globals.css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// ❌ WRONG: Animations with no reduced-motion fallback
```

### 224.7 — Prefers-Contrast

```tsx
// ✅ High contrast support
<div className="border-gray-200 contrast-more:border-gray-900 contrast-more:border-2">
<span className="text-gray-500 contrast-more:text-gray-900">

// ✅ Tailwind v4 contrast-more: / contrast-less: variants
// ❌ WRONG: Thin low-contrast borders as sole separators
```
