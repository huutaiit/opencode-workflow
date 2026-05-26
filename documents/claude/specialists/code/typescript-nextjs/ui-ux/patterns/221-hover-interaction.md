# Hover & Interaction States Specialist
# ホバー＆インタラクション状態スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 221.1–221.8 |
| **Specialist Type** | rule-set |
| **Purpose** | Interactive states, touch targets, transition timing, focus ring |
| **Activation Trigger** | hover, interaction state, touch target, focus ring, active state, pressed state |
| **Complements** | 206.x component-states, 224.x focus-accessibility |

---

## Rules

### 221.1 — Nine Standard Interactive States

| # | State | Trigger | Tailwind | Visual Change |
|---|-------|---------|----------|---------------|
| 1 | Default | — | (base) | — |
| 2 | Hover | mouse enter | `hover:` | bg lighten/darken 8% |
| 3 | Focus | Tab key | `focus-visible:` | ring outline |
| 4 | Active/Pressed | mouse down | `active:` | scale(0.98) or darken 12% |
| 5 | Selected | click toggle | `aria-selected:` | bg-primary/10 + border-primary |
| 6 | Disabled | prop | `disabled:` | opacity-50 cursor-not-allowed |
| 7 | Loading | async | — | spinner + opacity-70 |
| 8 | Error | validation | — | border-error + text-error |
| 9 | Dragged | drag start | — | opacity-60 + shadow-lg |

### 221.2 — Hover Feedback

```tsx
// ✅ Tailwind hover utilities
<button className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 transition-colors">
<tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

// ✅ AntD components have built-in hover — do NOT override
// Button, Card, List.Item — hover states are automatic

// ❌ WRONG: Inline style for hover (impossible without JS)
// ❌ WRONG: Overriding AntD hover with !important
```

### 221.3 — Touch Targets (WCAG 2.5.8)

| Level | Min Size | Use Case |
|-------|----------|----------|
| AA | 24×24 px | Desktop secondary actions |
| AAA | 44×44 px | Mobile primary actions, nav |

```tsx
// ✅ Adequate touch target
<button className="min-h-[44px] min-w-[44px] p-3">
<IconButton className="p-2.5"> {/* icon 20px + padding = 40px ≥ 24px */}

// ❌ WRONG: Tiny icon button
<button className="p-0.5"><Icon size={16} /></button> // → 20px, fails AA
```

### 221.4 — Transition Timing

| State Change | Duration | Easing |
|-------------|----------|--------|
| Hover in/out | 150ms | ease-in-out |
| Focus ring | 0ms (instant) | — |
| Active/press | 50ms | ease-out |
| Color change | 150ms | ease-in-out |
| Layout shift | 200–300ms | ease-out |

```tsx
// ✅ Tailwind transition classes
<div className="transition-colors duration-150">       {/* hover color */}
<div className="transition-transform duration-200">    {/* layout */}
<div className="transition-shadow duration-150">       {/* elevation */}

// ❌ WRONG: Slow transitions (>300ms feels sluggish)
<div className="transition-all duration-700">
```

### 221.5 — Focus Ring Specification

- Ring width: ≥2px (`ring-2`)
- Contrast: ≥3:1 against adjacent colors
- Offset: 2px from element edge (`ring-offset-2`)
- Shape: follows border-radius of element

```tsx
// ✅ Standard focus ring
<button className="focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
<input className="focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none">

// ❌ WRONG: outline-none without ring replacement
<button className="outline-none">  // → invisible focus, fails WCAG
```

### 221.6 — Disabled State

```tsx
// ✅ Disabled pattern
<button disabled className="disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none">

// ✅ AntD disabled prop (auto-handles styling)
<Button disabled>Submit</Button>
<Input disabled />

// ❌ WRONG: Visual-only disable without actual disabled attribute
<button className="opacity-50">  // → still clickable
```

### 221.7 — Compound State Priority

When multiple states overlap, apply in this priority (highest first):
1. **Disabled** — overrides all (no hover, no focus ring)
2. **Error** — border-error visible through other states
3. **Focus** — ring visible on top of hover/selected
4. **Active** — momentary, on top of hover
5. **Hover** — lowest interactive state

### 221.8 — AntD Built-in States

AntD components handle states internally — extend, do NOT replace:

- ✅ Use `className` for additional Tailwind states on wrapper elements
- ✅ Use `styles` prop for AntD sub-component token overrides
- ❌ NEVER override `.ant-btn:hover` in global CSS
- ❌ NEVER use `!important` to fight AntD state styles
