# Color System Specialist
# カラーシステムスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 200.1–200.8 |
| **Specialist Type** | rule-set |
| **Purpose** | Semantic color roles, contrast rules, dark mode remapping, palette scale |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | 59.x theme-specialist (project override authority) |

---

## Rules

### 200.1 — Semantic Color Roles

Use semantic role names — NEVER raw hex in components.

```tsx
// ✅ AntD tokens via ConfigProvider
<ConfigProvider theme={{ token: {
  colorPrimary: '#1677ff',
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorInfo: '#1677ff',
}}}>

// ✅ Tailwind @theme CSS variables
// globals.css
@theme {
  --color-primary: #1677ff;
  --color-success: #52c41a;
  --color-warning: #faad14;
  --color-error: #ff4d4f;
}

// ✅ Usage in components
<div className="text-primary bg-primary/10 border-primary/20">
<Alert type="error" className="border-error bg-error/5">

// ❌ WRONG: Hardcoded hex in components
<div style={{ color: '#1677ff' }}>  // → use className="text-primary"
<span className="text-[#ff4d4f]">  // → use className="text-error"
```

### 200.2 — Contrast Rules (WCAG 2.2 AA)

| Requirement | Ratio | Example |
|------------|-------|---------|
| Normal text (<18px) | ≥4.5:1 | text-gray-900 on bg-white ✅ |
| Large text (≥18px or ≥14px bold) | ≥3:1 | text-gray-600 on bg-white ✅ |
| UI components (borders, icons) | ≥3:1 | border-gray-300 on bg-white ✅ |
| Focus indicators (WCAG 2.4.11) | ≥3:1 | focus-visible:ring-primary ✅ |

- ❌ NEVER use text-gray-400 on bg-white (ratio ~2.7:1 — fails AA)
- ❌ NEVER rely on color alone — always pair with icon/pattern (200.6)

### 200.3 — Dark Mode Token Remapping

Semantic remapping — NOT CSS invert().

| Token | Light | Dark |
|-------|-------|------|
| colorBgLayout | #f4f7fe | #0d1117 |
| colorText | #111827 (gray-900) | #e6edf3 (off-white, NOT pure white) |
| colorBgElevated | #ffffff + shadow | #1c2128 (lighter surface, NO shadow) |
| colorBorder | #d9d9d9 | #30363d |

```tsx
// ✅ AntD dark mode
<ConfigProvider theme={{
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: isDark ? THEME_TOKENS.dark : THEME_TOKENS.light,
}}>

// ✅ Tailwind dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

- ❌ WRONG: `filter: invert(1)` — destroys images, breaks brand colors
- ❌ WRONG: pure white (#ffffff) text on dark — causes eye strain

### 200.4 — Palette Scale

AntD: 13 preset palettes × 10 steps. Primary = 6th step.

```tsx
// ✅ AntD functional colors (auto-derived from seed)
// blue-1 → blue-10 (lightest → darkest)
// Primary color = blue-6 = #1677ff

// ✅ Tailwind scale mapping
@theme {
  --color-primary-50: #e6f4ff;   /* blue-1 */
  --color-primary-100: #bae0ff;  /* blue-2 */
  --color-primary-500: #4096ff;  /* blue-5 */
  --color-primary-600: #1677ff;  /* blue-6 = primary */
  --color-primary-700: #0958d9;  /* blue-7 */
}
```

### 200.5 — Status Colors

| Status | Color | AntD | Tailwind | Use |
|--------|-------|------|---------|-----|
| Success | Green | colorSuccess: #52c41a | text-success | Completed, approved |
| Warning | Amber | colorWarning: #faad14 | text-warning | Attention needed |
| Error | Red | colorError: #ff4d4f | text-error | Failed, rejected |
| Info | Blue | colorInfo: #1677ff | text-info | Informational |
| Neutral | Gray | colorTextSecondary | text-muted | Disabled, inactive |

### 200.6 — Color-Blind Safety

- ✅ Always pair color with icon: `<Tag icon={<CheckCircle />} color="success">`
- ✅ Use pattern/texture alongside color in charts (200.5 + 232.x)
- ❌ NEVER use red/green as sole differentiator

### 200.7 — Surface Hierarchy

| Level | Light | Dark | Tailwind |
|-------|-------|------|---------|
| Background | #f4f7fe | #0d1117 | bg-background |
| Surface | #ffffff | #161b22 | bg-surface |
| Elevated | #ffffff + shadow | #1c2128 | bg-elevated shadow-sm |
| Overlay | #000000/50 | #000000/60 | bg-black/50 |

### 200.8 — Brand Integration Rules

- Foundation sets structure (roles, contrast, scale) — NOT specific colors
- Brand color = override via 59.x theme-specialist or ConfigProvider
- ❌ NEVER put project-specific brand hex in this specialist
