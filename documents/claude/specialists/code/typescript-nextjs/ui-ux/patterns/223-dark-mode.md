# Dark Mode Specialist
# ダークモードスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 223.1–223.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Semantic token remapping, surface elevation in dark, text/image/shadow handling |
| **Activation Trigger** | dark mode, dark theme, theme switching, night mode, light/dark toggle |
| **Complements** | 200.x color-system, 203.x elevation-shadow |

---

## Rules

### 223.1 — Semantic Token Remapping (NOT Inversion)

Dark mode = remap semantic tokens to dark-appropriate values. NEVER use CSS `invert()` or `filter`.

```tsx
// ✅ AntD darkAlgorithm + ConfigProvider
import { theme, ConfigProvider } from 'antd';

<ConfigProvider theme={{
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
}}>

// ✅ next-themes integration
// layout.tsx
import { ThemeProvider } from 'next-themes';
<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>

// ❌ WRONG: CSS filter inversion
<body className="dark:invert">  // → destroys images, brand colors
// ❌ WRONG: Manual color swapping without system
```

### 223.2 — Surface Elevation (Lighter = Higher)

In dark mode, higher elevation surfaces are LIGHTER (opposite of light mode shadow).

| Level | Light Mode | Dark Mode | Tailwind |
|-------|-----------|-----------|----------|
| Base | `#f4f7fe` | `#0d1117` | `bg-background` |
| Surface | `#ffffff` | `#161b22` | `bg-surface dark:bg-gray-900` |
| Elevated | `#fff + shadow-sm` | `#1c2128` | `bg-white dark:bg-gray-800` |
| Overlay | `#fff + shadow-lg` | `#21262d` | `bg-white dark:bg-gray-700` |

```tsx
// ✅ Elevation via background lightness in dark
<div className="bg-white shadow-sm dark:bg-gray-800 dark:shadow-none">

// ❌ WRONG: Same shadow in dark (invisible on dark bg)
<div className="bg-white dark:bg-gray-900 shadow-md">  // → shadow invisible
```

### 223.3 — Text Colors (Off-White, NOT Pure White)

| Role | Light | Dark | Why |
|------|-------|------|-----|
| Primary text | `#111827` (gray-900) | `#ECEDEE` (off-white) | Pure white causes eye strain |
| Secondary text | `#6b7280` (gray-500) | `#8b949e` | Maintains hierarchy |
| Disabled text | `#9ca3af` (gray-400) | `#484f58` | Low emphasis |

```tsx
// ✅ Off-white text
<p className="text-gray-900 dark:text-gray-200">Primary</p>
<p className="text-gray-500 dark:text-gray-400">Secondary</p>

// ❌ WRONG: Pure white text
<p className="dark:text-white">  // → #ffffff causes eye strain on dark bg
```

### 223.4 — Image Treatment in Dark Mode

```tsx
// ✅ Reduce image brightness in dark mode
<img className="dark:brightness-90" src={photo} alt="" />
<div className="dark:brightness-90">{/* hero image container */}</div>

// ✅ next/image with dark treatment
<Image src={hero} alt="" className="dark:brightness-[0.85]" />

// ❌ WRONG: No image treatment (images glare on dark backgrounds)
// ❌ WRONG: Using CSS invert on images
```

### 223.5 — Shadow Handling in Dark Mode

Shadows are invisible on dark backgrounds. Replace with border or tint.

```tsx
// ✅ Shadow → border/tint swap
<div className="shadow-sm dark:shadow-none dark:border dark:border-gray-700">
<div className="shadow-md dark:shadow-none dark:ring-1 dark:ring-gray-700">

// ✅ AntD handles via darkAlgorithm automatically for its components

// ❌ WRONG: Keeping shadow in dark mode
<div className="shadow-lg">  // → invisible on dark, wasted render
```

### 223.6 — Theme Persistence & System Preference

```tsx
// ✅ next-themes handles: localStorage + system preference + SSR flash prevention
// Required: attribute="class" for Tailwind dark: prefix compatibility
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>

// ✅ Theme toggle component
const { theme, setTheme } = useTheme();
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>

// ❌ WRONG: Manual matchMedia without persistence
// ❌ WRONG: Separate CSS files for light/dark
```
