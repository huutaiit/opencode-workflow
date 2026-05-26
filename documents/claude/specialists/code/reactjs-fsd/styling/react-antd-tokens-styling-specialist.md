# React AntD Tokens & CSS Modules Specialist
# React AntDトークン・CSSモジュールスペシャリスト
# Chuyen Gia AntD Tokens & CSS Modules React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, App |
| **Directory Pattern** | `src/shared/styles/`, `src/shared/config/theme.config.ts` |
| **Variant** | enterprise |
| **Pattern Numbers** | 80.1–80.10 |
| **Source Paths** | `src/shared/styles/**`, `**/*.module.css`, `src/shared/config/theme*` |
| **File Count** | 5–15 style files |
| **Naming Convention** | `{Component}.module.css`, `global.css`, `variables.css`, `theme.config.ts` |
| **Imports From** | Shared (theme config) |
| **Cannot Import** | Features, Pages |
| **Imported By** | ALL UI components |
| **Dependencies** | `antd:5.x` (design tokens, cssinjs) |
| **When To Use** | Project styling setup, AntD token customization, CSS Modules, dark mode |
| **Source Skeleton** | `src/shared/config/theme.config.ts`, `src/shared/styles/global.css`, `src/shared/styles/variables.css` |
| **Specialist Type** | code |
| **Purpose** | Generate AntD design tokens + CSS Modules styling — token system, CSS variable injection, dark/light theme switching |
| **Activation Trigger** | files: **/*.module.css, src/shared/styles/**; keywords: designToken, cssModules, themeSwitch, darkMode, antdStyling |

---

## Evidence Sources

- E1: AntD 5 Design Token system documentation
- E2: CSS Modules specification
- E3: Vite CSS Modules configuration
- E4: CSS custom properties (variables) for theming

---

## Patterns

### Pattern 80.1: AntD Token System Overview (CRITICAL)

```
Token Hierarchy:
  Seed Tokens (you set)       → colorPrimary, borderRadius, fontSize
    ↓ Algorithms derive
  Map Tokens (auto-generated) → colorPrimaryHover, colorPrimaryActive
    ↓ Semantic mapping
  Alias Tokens (semantic)     → colorBgContainer, colorTextBase
    ↓ Component usage
  Component Tokens (specific) → Button.controlHeight, Table.headerBg
```

```typescript
// src/shared/config/theme.config.ts
import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    // Seed tokens — change these to brand the entire app
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    // Component tokens — override specific components
    Button: { controlHeight: 36, paddingContentHorizontal: 20 },
    Input: { controlHeight: 36 },
    Table: { headerBg: '#fafafa' },
  },
};
```

### Pattern 80.2: CSS Modules with AntD Tokens (CRITICAL)

Use CSS variables injected by AntD for consistent styling.

```typescript
// Enable CSS variable mode in ConfigProvider
<ConfigProvider theme={{ ...themeConfig, cssVar: true, hashed: false }}>
```

```css
/* src/features/dashboard/ui/DashboardPage.module.css */
.container {
  padding: 24px;
  background: var(--ant-color-bg-container);
  border-radius: var(--ant-border-radius-lg);
}

.title {
  color: var(--ant-color-text);
  font-size: var(--ant-font-size-heading-4);
  margin-bottom: var(--ant-margin-lg);
}

.highlight {
  color: var(--ant-color-primary);
  font-weight: var(--ant-font-weight-strong);
}

.card:hover {
  border-color: var(--ant-color-primary-hover);
  box-shadow: var(--ant-box-shadow);
}
```

```typescript
// Usage in component
import styles from './DashboardPage.module.css';

function DashboardPage() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Dashboard</h2>
      <span className={styles.highlight}>Revenue: $10,000</span>
    </div>
  );
}
```

### Pattern 80.3: Component Token Override (HIGH)

```typescript
// Per-component customization via ConfigProvider
const themeConfig: ThemeConfig = {
  components: {
    Button: {
      controlHeight: 36,
      paddingContentHorizontal: 20,
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
      borderColorDisabled: '#d9d9d9',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
      rowHoverBg: '#f5f5f5',
      borderColor: '#f0f0f0',
      headerSortActiveBg: '#f0f0f0',
    },
    Card: {
      paddingLG: 20,
      headerBg: 'transparent',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      activeBarBorderWidth: 0,
      itemSelectedBg: '#e6f4ff',
    },
  },
};
```

### Pattern 80.4: CSS Variable Injection (HIGH)

```typescript
// Access tokens programmatically in components
import { theme } from 'antd';

function CustomComponent() {
  const { token } = theme.useToken();

  return (
    <div style={{
      color: token.colorText,
      background: token.colorBgContainer,
      borderRadius: token.borderRadius,
      padding: token.paddingLG,
      boxShadow: token.boxShadow,
    }}>
      Custom styled with AntD tokens
    </div>
  );
}
```

### Pattern 80.5: CSS Modules Naming Convention (HIGH)

```css
/* Naming: {Component}.module.css */
/* src/features/user/ui/UserCard.module.css */

/* Block */
.card { /* ... */ }

/* Element */
.cardHeader { /* ... */ }
.cardBody { /* ... */ }
.cardFooter { /* ... */ }

/* Modifier */
.cardActive { composes: card; border-color: var(--ant-color-primary); }
.cardDisabled { composes: card; opacity: 0.5; pointer-events: none; }
```

```typescript
// Vite handles .module.css automatically
import styles from './UserCard.module.css';

function UserCard({ active }: { active: boolean }) {
  return <div className={active ? styles.cardActive : styles.card}>...</div>;
}

// Multiple classes
import clsx from 'clsx';
<div className={clsx(styles.card, active && styles.cardActive, disabled && styles.cardDisabled)} />
```

### Pattern 80.6: Global Styles (HIGH)

```css
/* src/shared/styles/global.css */
/* Reset + base styles — imported in app entry */

/* AntD overrides that can't be done via tokens */
.ant-layout-sider {
  border-right: 1px solid var(--ant-color-border);
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: var(--ant-color-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--ant-color-text-quaternary); }

/* Page transitions */
.page-transition-enter { opacity: 0; }
.page-transition-enter-active { opacity: 1; transition: opacity 200ms; }
```

### Pattern 80.7: Scoped Styles per FSD Slice (MEDIUM-HIGH)

```
src/
├── shared/styles/
│   ├── global.css          # Global resets, scrollbar, transitions
│   └── variables.css       # CSS variables (non-AntD custom vars)
├── features/user-management/ui/
│   ├── UserList.module.css # Scoped to UserList component
│   └── UserForm.module.css # Scoped to UserForm component
├── widgets/header/ui/
│   └── Header.module.css   # Scoped to Header widget
└── pages/dashboard/ui/
    └── DashboardPage.module.css # Scoped to page
```

**Rules:**
- CSS Modules for component-scoped styles
- `global.css` for truly global styles (resets, scrollbar)
- AntD tokens for all color/spacing/typography values
- Never use `!important` to override AntD

### Pattern 80.8: Dark/Light Theme Switching (HIGH)

```typescript
import { theme as antdTheme } from 'antd';

function useThemeConfig(mode: 'light' | 'dark'): ThemeConfig {
  return useMemo(() => ({
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      ...(mode === 'dark' ? { colorBgContainer: '#141414' } : {}),
    },
    cssVar: true,
    hashed: false,
  }), [mode]);
}

// CSS Modules automatically use correct vars
/* .container { background: var(--ant-color-bg-container); } */
/* In light: #ffffff. In dark: #141414. No code change needed. */
```

### Pattern 80.9: PostCSS Configuration (MEDIUM)

```javascript
// postcss.config.js (Vite uses PostCSS by default)
export default {
  plugins: {
    'postcss-preset-env': {
      stage: 2,
      features: {
        'nesting-rules': true,         // CSS nesting
        'custom-media-queries': true,  // @custom-media
      },
    },
    autoprefixer: {},
  },
};
```

### Pattern 80.10: Anti-patterns (MEDIUM)

**1. Tailwind with AntD** — Conflicting utility classes with AntD styles.
```
// FIX: Use CSS Modules + AntD tokens. Not Tailwind.
```

**2. Inline styles for everything** — `style={{ color: '#1677ff' }}`.
```
// FIX: Use CSS Modules with AntD CSS variables: var(--ant-color-primary)
```

**3. !important overrides** — Fighting AntD specificity.
```
// FIX: Use ConfigProvider component tokens for customization
```

**4. Hardcoded colors** — `color: #333` instead of semantic token.
```
// FIX: color: var(--ant-color-text)
```

**5. Not enabling cssVar mode** — Missing CSS variable injection.
```
// FIX: <ConfigProvider theme={{ cssVar: true, hashed: false }}>
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (80.1–80.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React AntD Tokens & CSS Modules Specialist | EPS v3.2 | Metadata v2.1*
