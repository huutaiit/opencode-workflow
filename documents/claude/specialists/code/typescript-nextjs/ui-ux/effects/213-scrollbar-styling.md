# Scrollbar Styling Specialist
# スクロールバースタイリングスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 213.1–213.4 |
| **Specialist Type** | rule-set |
| **Purpose** | Scrollbar width, track/thumb styling, hover states, cross-browser |
| **Activation Trigger** | scrollbar, scroll, overflow |
| **Complements** | — |

---

## Rules

### 213.1 — Thin Scrollbar (Default)

```css
/* globals.css — apply globally */
* {
  scrollbar-width: thin;                    /* Firefox */
  scrollbar-color: #d1d5db transparent;     /* Firefox: thumb track */
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

*::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
```

### 213.2 — Dark Mode Scrollbar

```css
.dark *::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark *::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

.dark * {
  scrollbar-color: #4b5563 transparent;
}
```

### 213.3 — Hidden Scrollbar (Scroll Container)

For horizontal scroll containers (tabs, carousels):

```tsx
// ✅ Hide scrollbar but keep scroll functionality
<div className="overflow-x-auto scrollbar-hide">
  {/* horizontal scroll content */}
</div>

// CSS utility
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### 213.4 — Auto-Show Scrollbar

Show scrollbar only on hover (macOS-like behavior):

```css
.scrollbar-auto *::-webkit-scrollbar-thumb {
  background: transparent;
}

.scrollbar-auto:hover *::-webkit-scrollbar-thumb {
  background: #d1d5db;
}
```

- ❌ NEVER hide vertical scrollbar on data tables — users need scroll indication
- ✅ OK to hide scrollbar on horizontal tab bars (scroll hint via fade/arrow instead)
