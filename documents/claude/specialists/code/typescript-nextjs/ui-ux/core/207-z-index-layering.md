# Z-Index Layering Specialist
# Zインデックスレイヤリングスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 207.1–207.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Z-index convention scale, stacking context, portal rendering |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 207.1 — Convention Scale

| Layer | Z-Index | Tailwind | AntD Token | Use |
|-------|---------|---------|-----------|-----|
| Base | 0 | z-0 | — | Normal flow |
| Elevated | 10 | z-10 | — | Sticky elements within page |
| Dropdown | 1000 | z-[1000] | zIndexPopupBase | Select, DatePicker |
| Sticky | 1020 | z-[1020] | — | Sticky headers, table headers |
| Fixed | 1030 | z-[1030] | — | Fixed navigation bars |
| Modal Backdrop | 1050 | z-[1050] | zIndexPopupBase+50 | Overlay backgrounds |
| Modal | 1055 | z-[1055] | — | Dialog content |
| Popover | 1070 | z-[1070] | zIndexPopup | Popovers, tooltips |
| Toast | 1090 | z-[1090] | — | Notification messages |

```tsx
// ✅ Use semantic tokens — NOT arbitrary values
<header className="sticky top-0 z-[1020] bg-white dark:bg-gray-900">
<div className="fixed bottom-4 right-4 z-[1090]">  {/* toast */}

// ❌ WRONG: Arbitrary z-index values
<div className="z-[9999]">  {/* z-index chaos */}
<div className="z-50">      {/* unclear intent */}
```

### 207.2 — Stacking Context Rules

`transform`, `opacity<1`, `filter`, `will-change` create new stacking contexts.

```tsx
// ⚠️ This creates a new stacking context — children z-index is LOCAL
<div className="transform hover:scale-105">
  <div className="z-[1090]">  {/* This z-index is relative to parent, not document */}
</div>

// ✅ Use Portal for elements that need document-level z-index
// AntD components (Modal, Popover, Tooltip) already use Portal
```

### 207.3 — Portal Rendering

AntD components render modals/popovers via Portal (appended to document.body).

```tsx
// ✅ AntD Modal — auto-portal, z-index managed internally
<Modal open={isOpen} onCancel={handleClose}>Content</Modal>

// ✅ Custom portal for non-AntD overlays
import { createPortal } from 'react-dom';
createPortal(<Toast />, document.body);

// ✅ AntD getPopupContainer — control portal target
<Select getPopupContainer={trigger => trigger.parentNode}>
```

### 207.4 — Isolation Strategy

Prevent z-index leaking between component libraries:

```tsx
// ✅ Isolate component library stacking
<div className="isolate">  {/* CSS isolation: isolate */}
  <ThirdPartyWidget />      {/* z-index stays local */}
</div>
```

### 207.5 — AntD Z-Index Configuration

```tsx
// ✅ Global z-index config via ConfigProvider
<ConfigProvider theme={{ token: {
  zIndexPopupBase: 1000,  // Base for all AntD popups
  // AntD auto-calculates: Dropdown=1050, Modal=1000, Notification=1010
}}}>

// ❌ WRONG: Override individual component z-index with inline styles
<Modal style={{ zIndex: 9999 }}>  {/* breaks the system */}
```
