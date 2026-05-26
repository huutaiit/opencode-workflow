# Theme System Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core (styles) + Presentation (providers) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 59.1–59.7 |
| **Source Paths** | `src/core/styles/` (app.css, globals.css), `src/presentation/providers/AntdProvider.tsx` |
| **File Count** | 3 core files + SCSS scattered in modules |
| **Naming Convention** | `{Component}.scss`, `globals.css` |
| **Barrel Export** | N/A (theme tokens configured via Ant Design ConfigProvider, not barrel-exported) |
| **Imports From** | N/A (CSS) |
| **Imported By** | App: root layout imports styles |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |
| **Dependencies** | antd@5, next-themes |
| **When To Use** | Theme system, dark mode, CSS variables |
| **Source Skeleton** | `core/styles/globals.css`, `core/styles/theme.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate CSS theme system with design tokens, dark mode toggle, and Ant Design token customization |
| **Activation Trigger** | files: `**/theme/**/*.ts`, `**/styles/**`; keywords: themeConfig, designToken, darkMode |

---

## Description

The application uses `next-themes` for dark/light mode switching and Ant Design's `ConfigProvider` for design token customization. `AntdProvider` is a wrapper that combines both, ensuring the correct Ant Design theme algorithm is applied based on the active theme.

---

## Key Concepts

### 59.1 — AntdProvider Wrapper

Combines `ThemeProvider` (next-themes) with `ConfigProvider` (Ant Design). Must wrap the root layout.

### 59.2 — Theme Algorithm Switching

- Light mode: `theme.defaultAlgorithm`
- Dark mode: `theme.darkAlgorithm`

Algorithm is selected based on `resolvedTheme` from `useTheme()`.

### 59.3 — Design Token Customization

| Token | Value | Purpose |
|-------|-------|---------|
| `colorPrimary` | `#f14d22` | Brand orange |
| `colorText` | `#111827` | Primary text |
| `colorBgLayout` | `#f4f7fe` | Page background |
| `borderRadius` | `6` | Consistent rounding |
| `fontFamily` | `'Noto Sans JP', sans-serif` | Japanese font |

---

## Code Examples

### AntdProvider (Pattern 59.1)

```typescript
// src/presentation/providers/AntdProvider.tsx
'use client';
import { ThemeProvider, useTheme } from 'next-themes';
import { ConfigProvider, theme as antdTheme } from 'antd';

// ✅ Extract tokens to centralized config — NEVER scatter hex values across files
// src/presentation/theme/tokens.ts
export const THEME_TOKENS = {
  light: {
    colorPrimary: '#1677ff',       // AntD default — override per project
    colorText: '#111827',
    colorBgLayout: '#f4f7fe',
    borderRadius: 6,
    fontFamily: "'Noto Sans JP', sans-serif",
  },
  dark: {
    colorPrimary: '#1677ff',
    colorText: '#e6edf3',
    colorBgLayout: '#0d1117',
    borderRadius: 6,
    fontFamily: "'Noto Sans JP', sans-serif",
  },
} as const;

// ❌ WRONG: Hardcoded hex scattered in component files
// const color = '#f14d22';  // → Move to THEME_TOKENS or CSS variable
// ❌ WRONG: Duplicate tokens across light/dark with spread
// const DARK = { ...LIGHT, colorBgLayout: '#0d1117' }; // → Hard to track overrides

const LIGHT_TOKENS = THEME_TOKENS.light;
const DARK_TOKENS = THEME_TOKENS.dark;

function AntdConfigProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: isDark ? DARK_TOKENS : LIGHT_TOKENS,
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AntdConfigProvider>{children}</AntdConfigProvider>
    </ThemeProvider>
  );
}
```

### Root Layout Integration (Pattern 59.1)

```typescript
// src/app/layout.tsx
import { AntdProvider } from '@/presentation/providers/AntdProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
```

### Theme Toggle (Pattern 59.2)

```typescript
// src/presentation/ui/common/ThemeToggle.tsx
import { useTheme } from 'next-themes';
import { Switch } from 'antd';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Switch
      checked={theme === 'dark'}
      onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      checkedChildren="Dark"
      unCheckedChildren="Light"
    />
  );
}
```

### 59.4 — CSS Hybrid Strategy

3 CSS methods coexist in the codebase:

| Method | Usage | When to Use |
|--------|-------|-------------|
| Tailwind CSS 4 | Primary (majority of components) | Utility classes, spacing, colors |
| SCSS | 23+ files in modules | Complex layouts, animations, legacy |
| CSS Variables | `globals.css` | Theme tokens, CSS custom properties |
| CSS Modules | 1 file (rare) | Scoped styles (avoid — use Tailwind) |

Decision matrix:
- Default: **Tailwind** utility classes
- Complex animation/layout: **SCSS** file
- Theme tokens: **CSS Variables** in globals.css
- Avoid: CSS Modules (only 1 file uses it)

### 59.5 — CSS Calc Heights

Layout uses CSS `calc()` for viewport-filling sections:

```css
/* Header: 64px, Sider: 200px */
.content-area {
  height: calc(100vh - 64px);
  overflow-y: auto;
}
```

### 59.6 — Global Styles Structure

```
src/core/styles/
├── app.css          ← Main styles, imports Tailwind
└── globals.css      ← CSS variables, resets
```

### 59.7 — Color Token System

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `colorPrimary` | `#f14d22` | `#f14d22` | Brand orange |
| `colorText` | `#111827` | `#e6edf3` | Primary text |
| `colorBgLayout` | `#f4f7fe` | `#0d1117` | Page background |
| `borderRadius` | `6` | `6` | Consistent rounding |
| `fontFamily` | `'Noto Sans JP'` | `'Noto Sans JP'` | Japanese font |

---

## Anti-Patterns

- Setting Ant Design tokens via CSS variables directly (bypass ConfigProvider)
- Using `localStorage` manually for theme persistence (next-themes handles this)
- Omitting `suppressHydrationWarning` on `<html>` (causes hydration mismatch with SSR)
- Creating separate ConfigProvider instances per module (breaks token inheritance)

---

## Related Specialists

- `block-screen-specialist.md` — Block components consume theme tokens
- `antd-form-specialist.md` — Form components styled by ConfigProvider
- `nextjs-clean-architecture-specialist.md` — Provider placement in architecture
