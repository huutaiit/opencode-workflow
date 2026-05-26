# React Monorepo Specialist
# Reactモノレポスペシャリスト
# Chuyen Gia Monorepo React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — monorepo structure encompasses all layers across multiple apps) |
| **Directory Pattern** | `apps/{app}/src/` (FSD per app), `packages/ui/src/`, `packages/hooks/src/`, `packages/config/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 4.1–4.10 |
| **Source Paths** | `apps/**`, `packages/**`, `turbo.json`, `nx.json` |
| **File Count** | 5–15 config files (turbo.json, package.json per workspace, shared tsconfig) |
| **Naming Convention** | `packages/{name}/src/index.ts` (shared package entry), `apps/{name}/` (app entry) |
| **Imports From** | ALL (cross-workspace imports via @company/* aliases) |
| **Cannot Import** | N/A (architecture specialist — defines workspace boundary rules) |
| **Imported By** | N/A (architecture reference — consumed by all app-level and package-level specialists) |
| **Dependencies** | `turbo:2.x` or `nx:20.x` (monorepo tool), `@changesets/cli:2.x` (versioning) |
| **When To Use** | Multi-app projects sharing UI components, design tokens, or hooks; teams needing independent deployments with shared code |
| **Source Skeleton** | `turbo.json`, `apps/{app}/package.json`, `packages/ui/package.json`, `packages/ui/src/index.ts`, `packages/hooks/src/index.ts`, `packages/config/tsconfig.base.json` |
| **Specialist Type** | architecture |
| **Purpose** | Define Turborepo/Nx monorepo setup with shared packages, design token sharing, workspace boundaries, and build cache strategy |
| **Activation Trigger** | phase: /plan, /design; keywords: monorepo, turborepo, nx, sharedPackages, workspace, moduleFederation, microFrontend |

---

## Evidence Sources

- E1: Turborepo official documentation (v2.x)
- E2: Nx documentation (v20.x) — module boundaries, affected commands
- E3: pnpm workspaces specification
- E4: Module Federation plugin for Vite

---

## Role

You are a **React Monorepo Specialist** for enterprise projects that span multiple applications sharing code. Your responsibility is to define monorepo tooling (Turborepo/Nx), shared package structure, workspace boundaries, build caching, and deployment strategies. Each app within the monorepo follows FSD independently.

**Used by**: Architecture agents for multi-app projects, DevOps specialists for CI/CD pipelines
**Not used by**: Single-app projects, non-React monorepos

---

## Patterns

### Pattern 4.1: Turborepo Workspace Setup (CRITICAL)

Standard monorepo structure with Turborepo orchestration and pnpm workspaces.

```
my-enterprise/
├── apps/
│   ├── web-admin/              # Admin dashboard (React FSD)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── widgets/
│   │   │   ├── features/
│   │   │   ├── entities/
│   │   │   └── shared/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── web-portal/             # Customer portal (React FSD)
│   │   ├── src/                # Same FSD structure
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── mobile-web/             # Mobile web (React FSD)
│       └── ...
├── packages/
│   ├── ui/                     # Shared design system
│   ├── hooks/                  # Shared hooks
│   ├── api-client/             # Shared API client
│   ├── config/                 # Shared configs (ESLint, TS, Vite)
│   └── types/                  # Shared TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

### Pattern 4.2: Shared UI Package — Design System (CRITICAL)

Centralized design system package consumed by all apps. Wraps AntD with project conventions.

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Table/
│   │   │   ├── Table.tsx
│   │   │   └── index.ts
│   │   ├── Form/
│   │   │   ├── FormField.tsx
│   │   │   └── index.ts
│   │   └── index.ts            # All component exports
│   ├── theme/
│   │   ├── tokens.ts           # AntD design tokens
│   │   ├── ThemeProvider.tsx
│   │   └── index.ts
│   └── index.ts                # Package entry point
├── package.json
└── tsconfig.json
```

```json
// packages/ui/package.json
{
  "name": "@company/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./theme": "./src/theme/index.ts",
    "./components/*": "./src/components/*/index.ts"
  },
  "peerDependencies": {
    "antd": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@company/config": "workspace:*"
  }
}
```

```typescript
// packages/ui/src/index.ts — Package entry
// Components
export { Button } from './components/Button';
export { Table } from './components/Table';
export { FormField } from './components/Form';

// Theme
export { ThemeProvider, useTheme } from './theme';
export { themeTokens } from './theme/tokens';

// Types
export type { ButtonProps } from './components/Button';
export type { TableProps } from './components/Table';
export type { ThemeConfig } from './theme';
```

```typescript
// apps/web-admin/src/shared/ui/index.ts — App consumes from package
// Re-export from shared package for FSD compliance
export { Button, Table, FormField, ThemeProvider } from '@company/ui';
export type { ButtonProps, TableProps } from '@company/ui';
```

---

### Pattern 4.3: Shared Config Package (HIGH)

Centralize ESLint, TypeScript, and Vite configurations.

```
packages/config/
├── eslint/
│   ├── base.js               # Shared ESLint rules
│   ├── react.js              # React-specific rules
│   └── index.js              # Export all presets
├── typescript/
│   ├── tsconfig.base.json    # Base TS config
│   ├── tsconfig.react.json   # React-specific TS config
│   └── tsconfig.node.json    # Node/scripts TS config
├── vite/
│   ├── base.ts               # Shared Vite config
│   └── index.ts
└── package.json
```

```json
// packages/config/typescript/tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

```json
// apps/web-admin/tsconfig.json — App extends shared config
{
  "extends": "@company/config/typescript/tsconfig.react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/app/*": ["src/app/*"],
      "@/pages/*": ["src/pages/*"],
      "@/widgets/*": ["src/widgets/*"],
      "@/features/*": ["src/features/*"],
      "@/entities/*": ["src/entities/*"],
      "@/shared/*": ["src/shared/*"]
    }
  },
  "include": ["src"]
}
```

---

### Pattern 4.4: Design Token Sharing (HIGH)

AntD theme tokens shared across all apps via a package.

```typescript
// packages/ui/src/theme/tokens.ts — Single source of design tokens
import type { ThemeConfig } from 'antd';

export const brandTokens = {
  colorPrimary: '#1677ff',
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  borderRadius: 6,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: 14,
  controlHeight: 36,
} as const;

export const lightTheme: ThemeConfig = {
  token: {
    ...brandTokens,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
  },
  components: {
    Button: { controlHeight: 36, paddingContentHorizontal: 20 },
    Input: { controlHeight: 36 },
    Table: { headerBg: '#fafafa', borderColor: '#f0f0f0' },
  },
};

export const darkTheme: ThemeConfig = {
  token: {
    ...brandTokens,
    colorBgContainer: '#141414',
    colorBgLayout: '#000000',
  },
  algorithm: undefined, // Will use AntD dark algorithm at runtime
};
```

```typescript
// packages/ui/src/theme/ThemeProvider.tsx
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import { createContext, useContext, useState } from 'react';
import { lightTheme, darkTheme } from './tokens';

type ThemeMode = 'light' | 'dark';

const ThemeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
}>({ mode: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const themeConfig = mode === 'light' ? lightTheme : {
    ...darkTheme,
    algorithm: antdTheme.darkAlgorithm,
  };

  return (
    <ThemeContext.Provider value={{ mode, toggle: () => setMode(m => m === 'light' ? 'dark' : 'light') }}>
      <ConfigProvider theme={themeConfig}>
        <AntdApp>
          {children}
        </AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

### Pattern 4.5: Nx Module Boundaries (HIGH)

Enforce import rules across packages using Nx project tags or ESLint boundary rules.

```json
// nx.json (if using Nx instead of Turborepo)
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*"]
  },
  "targetDefaults": {
    "build": { "dependsOn": ["^build"], "cache": true },
    "test": { "cache": true }
  }
}
```

```json
// packages/ui/project.json — Nx project config
{
  "tags": ["scope:shared", "type:ui"]
}
```

```json
// apps/web-admin/project.json
{
  "tags": ["scope:admin", "type:app"]
}
```

```javascript
// .eslintrc.js — Nx boundary enforcement
module.exports = {
  rules: {
    '@nx/enforce-module-boundaries': ['error', {
      enforceBuildableLibDependency: true,
      allow: [],
      depConstraints: [
        // Apps can import shared packages
        { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['scope:shared'] },
        // UI package cannot import from apps
        { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['scope:shared'] },
        // Shared packages can only import other shared
        { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
      ],
    }],
  },
};
```

**Turborepo equivalent**: Use ESLint `no-restricted-imports` rule:
```javascript
// apps/web-admin/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['../../../packages/*/src/*'], message: 'Import from package public API, not source files' },
        { group: ['@company/admin-*'], message: 'Cannot import admin-specific packages from portal' },
      ],
    }],
  },
};
```

---

### Pattern 4.6: Internal Package Pattern (MEDIUM)

Use `@company/` scoped packages for internal libraries.

```json
// packages/hooks/package.json
{
  "name": "@company/hooks",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

```typescript
// packages/hooks/src/index.ts
export { useDebounce } from './useDebounce';
export { useMediaQuery } from './useMediaQuery';
export { useLocalStorage } from './useLocalStorage';
export { useIntersectionObserver } from './useIntersectionObserver';
export { useEventListener } from './useEventListener';
```

```typescript
// apps/web-admin/src/shared/hooks/index.ts — Re-export in FSD layer
export { useDebounce, useMediaQuery, useLocalStorage } from '@company/hooks';

// App-specific hooks stay in shared/hooks/
export { useAdminPermissions } from './useAdminPermissions';
```

**Internal package naming conventions:**
| Package | Name | Purpose |
|---------|------|---------|
| Design system | `@company/ui` | AntD wrappers, components |
| Shared hooks | `@company/hooks` | useDebounce, useMediaQuery |
| API client | `@company/api-client` | Axios instance, interceptors |
| Types | `@company/types` | Shared TypeScript interfaces |
| Config | `@company/config` | ESLint, TS, Vite presets |
| Utilities | `@company/utils` | formatDate, formatCurrency |

---

### Pattern 4.7: Build Cache Strategy (MEDIUM)

Optimize CI/CD with Turborepo remote caching or Nx computation caching.

```json
// turbo.json — Task caching configuration
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json", "vite.config.ts"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "**/*.test.ts", "**/*.test.tsx"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "inputs": ["src/**/*.ts", "src/**/*.tsx", ".eslintrc.*"],
      "outputs": [],
      "cache": true
    }
  }
}
```

**Remote caching setup:**
```bash
# Turborepo remote cache (Vercel)
npx turbo login
npx turbo link

# Self-hosted remote cache
# Set TURBO_REMOTE_CACHE_SIGNATURE_KEY and TURBO_API in CI
```

**CI pipeline with caching:**
```yaml
# .github/workflows/ci.yml
- name: Cache turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}

- name: Build affected
  run: pnpm turbo build --filter=...[HEAD~1]

- name: Test affected
  run: pnpm turbo test --filter=...[HEAD~1]
```

---

### Pattern 4.8: Micro-Frontend with Module Federation (MEDIUM)

Runtime module loading for large organizations with independent deployment.

```typescript
// apps/shell/vite.config.ts — Host/Shell app
import { defineConfig } from 'vite';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      name: 'shell',
      remotes: {
        adminApp: 'http://localhost:3001/assets/remoteEntry.js',
        portalApp: 'http://localhost:3002/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', 'antd', '@tanstack/react-query', 'zustand'],
    }),
  ],
});
```

```typescript
// apps/admin/vite.config.ts — Remote/Micro-frontend
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      name: 'adminApp',
      filename: 'remoteEntry.js',
      exposes: {
        './UserManagement': './src/features/user-management/index.ts',
        './Dashboard': './src/pages/dashboard/index.ts',
      },
      shared: ['react', 'react-dom', 'antd', '@tanstack/react-query', 'zustand'],
    }),
  ],
});
```

```typescript
// apps/shell/src/app/routes/routes.tsx — Shell loads remote modules
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

const RemoteUserManagement = lazy(() => import('adminApp/UserManagement'));
const RemoteDashboard = lazy(() => import('adminApp/Dashboard'));

export const routes = [
  {
    path: '/admin/users',
    element: (
      <Suspense fallback={<Spin />}>
        <RemoteUserManagement />
      </Suspense>
    ),
  },
];
```

**When to use Module Federation:**
- 3+ independent teams deploying different parts of the same app
- Need independent deployment cycles
- Different teams own different features

**When NOT to use:**
- Single team, single deployment — just use packages
- Less than 3 apps — overhead isn't worth it

---

### Pattern 4.9: Shared Type Packages (MEDIUM)

API types shared between frontend and BFF (Backend-For-Frontend).

```
packages/types/
├── src/
│   ├── api/
│   │   ├── user.types.ts      # User API request/response types
│   │   ├── order.types.ts     # Order API types
│   │   ├── pagination.types.ts
│   │   └── index.ts
│   ├── domain/
│   │   ├── user.ts            # User domain type
│   │   ├── order.ts           # Order domain type
│   │   └── index.ts
│   └── index.ts
└── package.json
```

```typescript
// packages/types/src/api/user.types.ts
export interface UserListRequest {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse {
  items: UserDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
}
```

```typescript
// apps/web-admin/src/entities/user/types/user.types.ts — Domain type
import type { UserDTO } from '@company/types/api';

// Domain model — may differ from API shape
export interface User {
  id: string;
  email: string;
  displayName: string;  // Derived: firstName + lastName
  role: UserRole;
  createdAt: Date;      // Parsed from string
}
```

---

### Pattern 4.10: Anti-patterns (MEDIUM)

Common monorepo mistakes.

**1. Shared everything** — Putting all code in packages instead of apps.
```
// BAD: Everything is a shared package
packages/
├── user-feature/        ← This is an APP feature, not shared
├── checkout-feature/    ← This is an APP feature, not shared
├── ui/                  ← OK: genuinely shared
└── hooks/               ← OK: genuinely shared

// FIX: Only truly shared code goes in packages/
// Feature-specific code stays in apps/{app}/src/features/
```

**2. Circular workspace dependencies** — Package A depends on B, B depends on A.
```json
// BAD: Circular dependency
// packages/ui/package.json → depends on @company/hooks
// packages/hooks/package.json → depends on @company/ui

// FIX: Extract common dependency to a third package
// packages/core/  ← Both ui and hooks depend on core, not each other
```

**3. Version drift** — Different apps using different versions of shared packages.
```bash
# Detect version mismatches
npx syncpack list-mismatches

# Fix: Use workspace:* protocol
# "dependencies": { "@company/ui": "workspace:*" }
```

**4. Cache invalidation issues** — Too broad input patterns invalidate cache unnecessarily.
```json
// BAD: Any file change invalidates build cache
{ "inputs": ["**/*"] }

// FIX: Specific inputs
{ "inputs": ["src/**/*.ts", "src/**/*.tsx", "tsconfig.json"] }
```

**5. Missing peer dependencies** — Shared packages bundle React instead of using the app's React.
```json
// BAD: React in "dependencies"
{ "dependencies": { "react": "^19.0.0" } }

// FIX: React in "peerDependencies"
{ "peerDependencies": { "react": "^19.0.0" } }
```

---

## Abnormal Case Patterns

1. **Gradual monorepo adoption** — Start with a single app, extract shared code when the second app needs it. Don't pre-create packages.

2. **Mixed framework monorepo** — React + Vue + Angular in same monorepo. Use Nx with framework-specific executors. Each framework has its own shared packages.

3. **Monorepo without Turborepo/Nx** — Small monorepos (2-3 apps) can use pnpm workspaces + npm scripts. Add Turborepo when build times exceed 3 minutes.

4. **Package publishing** — If packages are published to npm (not just internal), use Changesets for versioning: `pnpm changeset`, `pnpm changeset version`, `pnpm changeset publish`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (4.1–4.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Monorepo Specialist | EPS v3.2 | Metadata v2.1*
