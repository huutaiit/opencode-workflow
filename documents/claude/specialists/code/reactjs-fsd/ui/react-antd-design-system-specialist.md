# React AntD Design System Specialist
# React AntDデザインシステムスペシャリスト
# Chuyen Gia AntD Design System React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, App |
| **Directory Pattern** | `src/shared/ui/`, `src/app/providers/ThemeProvider.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 34.1–34.10 |
| **Source Paths** | `src/shared/ui/**`, `src/app/providers/Theme*`, `src/shared/config/theme*` |
| **File Count** | 10–30 design system files |
| **Naming Convention** | `{Component}.tsx`, `theme.config.ts` |
| **Imports From** | Shared (config for tokens) |
| **Cannot Import** | Features, Pages |
| **Imported By** | ALL UI layers |
| **Dependencies** | `antd:5.x` (ConfigProvider, theme) |
| **When To Use** | Project theme setup, AntD customization, dark mode, design token management |
| **Source Skeleton** | `src/shared/config/theme.config.ts`, `src/app/providers/ThemeProvider.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate AntD design system — design tokens, ConfigProvider theme, dark/compact mode, component token overrides |
| **Activation Trigger** | files: src/shared/ui/**, src/shared/config/theme*; keywords: designSystem, designToken, darkMode, themeConfig |

---

## Evidence Sources

- E1: Ant Design 5 Design Token system (seed → map → alias)
- E2: AntD ConfigProvider theme API
- E3: CSS-in-JS with AntD (cssinjs)
- E4: Dark mode algorithm

---

## Patterns

### Pattern 34.1: Design Token System (CRITICAL)

```typescript
// AntD 5 token hierarchy: Seed → Map → Alias → Component
// Seed Tokens: colorPrimary, borderRadius, fontSize (you customize these)
// Map Tokens: derived from seeds (colorPrimaryHover, colorPrimaryActive)
// Alias Tokens: semantic (colorBgContainer, colorTextBase)
// Component Tokens: per-component overrides (Button.controlHeight)

import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    // Seed tokens — cascade down to all derived tokens
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "'Inter', -apple-system, sans-serif",
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    // Component-level token overrides
    Button: { controlHeight: 36, paddingContentHorizontal: 20 },
    Input: { controlHeight: 36 },
    Select: { controlHeight: 36 },
    Table: { headerBg: '#fafafa', rowHoverBg: '#f5f5f5', borderColor: '#f0f0f0' },
    Card: { paddingLG: 20 },
    Layout: { headerBg: '#ffffff', siderBg: '#ffffff', bodyBg: '#f5f5f5' },
    Menu: { itemBg: 'transparent', activeBarBorderWidth: 0 },
  },
};
```

### Pattern 34.2: ConfigProvider Theme (CRITICAL)

```typescript
import { ConfigProvider, App as AntdApp } from 'antd';
import { themeConfig } from '@/shared/config/theme.config';

function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <ConfigProvider theme={themeConfig} locale={enUS} componentSize="middle">
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
```

### Pattern 34.3: Dark Mode (CRITICAL)

```typescript
import { theme as antdTheme, type ThemeConfig } from 'antd';

const lightTheme: ThemeConfig = { token: { colorPrimary: '#1677ff' }, components: { Layout: { headerBg: '#fff' } } };

const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: { colorPrimary: '#1677ff', colorBgContainer: '#141414' },
  components: { Layout: { headerBg: '#141414', siderBg: '#1f1f1f' } },
};

function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const config = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ConfigProvider theme={config}>
      <AntdApp>
        <ThemeContext.Provider value={{ mode, toggle: () => setMode(m => m === 'light' ? 'dark' : 'light') }}>
          {children}
        </ThemeContext.Provider>
      </AntdApp>
    </ConfigProvider>
  );
}
```

### Pattern 34.4: Compact Mode (HIGH)

```typescript
const compactTheme: ThemeConfig = {
  algorithm: antdTheme.compactAlgorithm,
  token: { fontSize: 12, controlHeight: 28, borderRadius: 4 },
};

// Combine dark + compact
const darkCompactTheme: ThemeConfig = {
  algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm],
};
```

### Pattern 34.5: Component Wrapping Strategy (HIGH)

```typescript
// Wrap AntD components in shared/ui/ with project defaults
// src/shared/ui/Button/Button.tsx
import { Button as AntdButton, type ButtonProps as AntdButtonProps } from 'antd';

export interface ButtonProps extends AntdButtonProps {}

export function Button({ children, ...props }: ButtonProps) {
  return <AntdButton {...props}>{children}</AntdButton>;
}

// Wrap components that need project-specific defaults (Table, Form, Modal)
// Don't wrap simple passthrough components (Typography, Space, Divider)
```

### Pattern 34.6: CSS Variable Extraction (HIGH)

```typescript
// AntD 5 can export design tokens as CSS variables
<ConfigProvider theme={{ cssVar: true, hashed: false }}>

// Then use in CSS:
// .my-component { color: var(--ant-color-primary); background: var(--ant-color-bg-container); }

// Or extract token values programmatically:
import { theme } from 'antd';
function MyComponent() {
  const { token } = theme.useToken();
  return <div style={{ color: token.colorPrimary, borderRadius: token.borderRadius }}>...</div>;
}
```

### Pattern 34.7: Project Component Variants (MEDIUM-HIGH)

```typescript
// Create project-specific button variants using AntD tokens
function ActionButton({ variant, ...props }: ButtonProps & { variant: 'save' | 'cancel' | 'delete' }) {
  const variantConfig = { save: { type: 'primary' as const }, cancel: { type: 'default' as const }, delete: { type: 'primary' as const, danger: true } };
  return <Button {...variantConfig[variant]} {...props} />;
}
```

### Pattern 34.8: AntD Icon System (MEDIUM)

```typescript
import { UserOutlined, SettingOutlined, DashboardOutlined } from '@ant-design/icons';
// Tree-shakeable — only imported icons are bundled

// Custom icon from SVG
import Icon from '@ant-design/icons';
import CustomSvg from './custom.svg?react';
const CustomIcon = (props: any) => <Icon component={CustomSvg} {...props} />;
```

### Pattern 34.9: Multi-Brand Theming (MEDIUM)

```typescript
const brandThemes: Record<string, ThemeConfig> = {
  default: { token: { colorPrimary: '#1677ff' } },
  acme: { token: { colorPrimary: '#e63946', borderRadius: 8 } },
  globex: { token: { colorPrimary: '#722ed1', borderRadius: 4 } },
};

function BrandedApp({ brand = 'default' }: { brand: string }) {
  return <ConfigProvider theme={brandThemes[brand]}>{children}</ConfigProvider>;
}
```

### Pattern 34.10: Anti-patterns (MEDIUM)

**1. Global CSS overriding AntD** — `!important` everywhere. Use ConfigProvider tokens.
**2. Inline styles instead of tokens** — `style={{ color: '#1677ff' }}`. Use `token.colorPrimary`.
**3. Importing entire icon library** — `import * as Icons`. Import individual icons.
**4. Not using ConfigProvider** — Losing theme consistency across components.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (34.1–34.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React AntD Design System Specialist | EPS v3.2 | Metadata v2.1*
