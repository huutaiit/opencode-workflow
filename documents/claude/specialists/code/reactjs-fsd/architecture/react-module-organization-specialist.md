# React Module Organization Specialist
# Reactモジュール構成スペシャリスト
# Chuyen Gia To Chuc Module React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — barrel export and public API rules apply to every FSD slice) |
| **Directory Pattern** | `src/{layer}/{slice}/index.ts` for every slice in every FSD layer |
| **Variant** | enterprise |
| **Pattern Numbers** | 3.1–3.10 |
| **Source Paths** | `**/index.ts`, `**/index.tsx` |
| **File Count** | 30–80 index.ts files per project (1 per slice + 1 per segment) |
| **Naming Convention** | `index.ts` (barrel), `{Component}.tsx` (re-exported), `types.ts` (type-only exports) |
| **Imports From** | ALL (defines rules for — but itself is a rule-set that applies to all import paths) |
| **Cannot Import** | N/A (architecture specialist — defines import rules, not a code module) |
| **Imported By** | N/A (architecture reference — consumed by every specialist that creates index.ts files) |
| **Dependencies** | None (uses TypeScript module system only) |
| **When To Use** | Creating new FSD slices, refactoring import paths, adding components to public API, wrapping third-party libraries |
| **Source Skeleton** | `src/{layer}/{slice}/index.ts`, `src/shared/ui/{Component}/index.ts`, `src/shared/ui/{Component}/{Component}.tsx` |
| **Specialist Type** | architecture |
| **Purpose** | Define barrel export conventions, public API per FSD slice, re-export patterns, and AntD component wrapping strategy |
| **Activation Trigger** | phase: /plan, /design; keywords: barrelExport, publicApi, reExport, indexTs, moduleOrganization, importPath |

---

## Evidence Sources

- E1: TypeScript module resolution documentation
- E2: Feature-Sliced Design public API specification
- E3: Vite tree-shaking and module bundling behavior
- E4: AntD 5 component re-export patterns

---

## Role

You are a **React Module Organization Specialist** for enterprise FSD projects. Your responsibility is to define barrel export conventions, public API patterns per FSD slice, re-export strategies, and import path rules. You ensure clean module boundaries, prevent import chaos, and enable effective tree-shaking.

**Used by**: All specialists that create or export files, code agents structuring imports
**Not used by**: Non-FSD architectures

---

## Patterns

### Pattern 3.1: Barrel Export Convention (CRITICAL)

Every FSD slice MUST have an `index.ts` at its root. This is the ONLY entry point for external consumers.

```typescript
// src/features/auth/index.ts — Barrel export
// Components
export { LoginForm } from './ui/LoginForm';
export { AuthGuard } from './ui/AuthGuard';

// Hooks
export { useAuth } from './model/useAuth';
export { usePermissions } from './model/usePermissions';

// Types (type-only export for tree-shaking)
export type { AuthUser, AuthState, LoginCredentials } from './types/auth.types';

// Constants (if needed by consumers)
export { AUTH_ROLES } from './config/constants';
```

**Rules:**
- ONE `index.ts` per slice root — no nested barrel exports within a slice
- Export ONLY what consumers need — keep internals private
- Order: Components → Hooks → Types → Constants
- Never export implementation details (helpers, mappers, internal state)

---

### Pattern 3.2: Named vs Default Exports (CRITICAL)

Always use **named exports** for tree-shaking and refactoring safety.

```typescript
// GOOD: Named exports — tree-shakeable, explicit
export function UserCard({ user }: UserCardProps) { ... }
export function useUser(id: string) { ... }
export type { User, UserRole };

// BAD: Default exports — break tree-shaking, implicit names
export default function UserCard({ user }: UserCardProps) { ... }
// Consumer can rename arbitrarily: import Foo from './UserCard'
```

**Exceptions** (default export is acceptable):
1. **Page components** used with `React.lazy()` — Vite code splitting requires default exports
2. **Storybook stories** — CSF format requires `export default { ... }`

```typescript
// src/pages/dashboard/ui/DashboardPage.tsx — Exception for lazy loading
export default function DashboardPage() { ... }

// src/app/routes/routes.tsx
const DashboardPage = lazy(() => import('@/pages/dashboard'));
```

---

### Pattern 3.3: Re-export Patterns (HIGH)

Use explicit named re-exports. Avoid wildcard re-exports.

```typescript
// GOOD: Explicit re-exports — clear public API surface
// src/entities/user/index.ts
export { UserCard } from './ui/UserCard';
export { UserAvatar } from './ui/UserAvatar';
export { useUser } from './model/useUser';
export type { User, UserRole } from './types/user.types';

// BAD: Wildcard re-export — leaks internals, breaks tree-shaking
export * from './ui';
export * from './model';
export * from './types';
// This exports EVERYTHING, including internal helpers
```

**Layer barrel exports** (optional, for convenience):
```typescript
// src/entities/index.ts — Layer-level convenience barrel
// Only for frequently co-imported entities
export { UserCard, useUser } from './user';
export { ProductCard, useProduct } from './product';
export type { User } from './user';
export type { Product } from './product';

// Consumer can import from layer:
import { UserCard, ProductCard } from '@/entities';
// Or from specific slice:
import { UserCard } from '@/entities/user';
```

---

### Pattern 3.4: Circular Dependency Prevention (HIGH)

Import graph must be acyclic. Detect and fix circular dependencies.

**Detection tools:**
```bash
# Check for circular dependencies
npx madge --circular --extensions ts,tsx src/

# Visualize import graph
npx madge --image graph.svg --extensions ts,tsx src/
```

**Common circular patterns and fixes:**

```typescript
// CIRCULAR: entities/user imports entities/order, entities/order imports entities/user
// src/entities/user/model/types.ts
import { Order } from '@/entities/order'; // ← creates cycle if order imports user

// FIX Option 1: Shared types in shared/types/
// src/shared/types/associations.ts
export interface UserWithOrders {
  user: User;
  orders: Order[];
}

// FIX Option 2: Type-only imports (doesn't create runtime cycle)
import type { Order } from '@/entities/order'; // type-only — erased at compile time

// FIX Option 3: Interface segregation
// src/entities/user/model/types.ts
export interface UserOrderSummary {
  orderId: string;
  total: number;
  date: Date;
}
// User references OrderSummary (own type), not Order entity directly
```

**Rules:**
- Use `import type` whenever you only need the type (not runtime value)
- If two entities reference each other, extract shared types to `shared/types/`
- Never import across same-layer slices at runtime — only through `import type`

---

### Pattern 3.5: Type-Only Exports (HIGH)

Use `export type` for interfaces, type aliases, and enums that are only used as types.

```typescript
// src/entities/user/index.ts
// Runtime exports (included in bundle)
export { UserCard } from './ui/UserCard';
export { useUser } from './model/useUser';

// Type-only exports (erased at compile time — zero bundle impact)
export type { User, UserRole, UserState } from './types/user.types';
export type { UserCardProps } from './ui/UserCard';
```

```typescript
// Consumer — type-only import
import { UserCard, useUser } from '@/entities/user';
import type { User, UserRole } from '@/entities/user';
```

**tsconfig.json enforcement:**
```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,  // Forces explicit type imports
    "isolatedModules": true         // Ensures type-only imports are erased
  }
}
```

---

### Pattern 3.6: AntD Component Wrapping (HIGH)

Wrap AntD components in `shared/ui/` with project conventions. Never import AntD directly in features.

```typescript
// src/shared/ui/Table/Table.tsx — Wrap AntD Table with project defaults
import { Table as AntdTable, type TableProps as AntdTableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export interface TableProps<T> extends Omit<AntdTableProps<T>, 'locale'> {
  // Project-specific defaults
  emptyText?: string;
  stickyHeader?: boolean;
}

export function Table<T extends object>({
  emptyText = 'No data available',
  stickyHeader = true,
  pagination,
  ...props
}: TableProps<T>) {
  return (
    <AntdTable<T>
      sticky={stickyHeader}
      locale={{ emptyText }}
      pagination={pagination !== false ? {
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        ...pagination,
      } : false}
      {...props}
    />
  );
}

// src/shared/ui/Table/index.ts
export { Table } from './Table';
export type { TableProps } from './Table';
export type { ColumnsType } from 'antd/es/table';
```

**Wrapping strategy:**
| AntD Component | Wrapper Location | Why Wrap |
|---------------|-----------------|----------|
| Table | `shared/ui/Table/` | Custom pagination defaults, empty state, sticky header |
| Form | `shared/ui/Form/` | Validation patterns, layout defaults, error display |
| Modal | `shared/ui/Modal/` | Consistent sizing, close behavior, footer patterns |
| Button | `shared/ui/Button/` | Loading state defaults, icon alignment |
| Select | `shared/ui/Select/` | Async search, custom option rendering |

**Don't wrap** simple components with no project-specific defaults (Typography, Space, Divider).

---

### Pattern 3.7: Path Aliases Organization (MEDIUM)

Ensure Vite aliases and tsconfig paths are synchronized.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, 'src/app'),
      '@/pages': path.resolve(__dirname, 'src/pages'),
      '@/widgets': path.resolve(__dirname, 'src/widgets'),
      '@/features': path.resolve(__dirname, 'src/features'),
      '@/entities': path.resolve(__dirname, 'src/entities'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

```json
// tsconfig.json — MUST mirror Vite aliases exactly
{
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
  }
}
```

**Testing config** — Vitest must also resolve aliases:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    alias: {
      '@/app': path.resolve(__dirname, 'src/app'),
      '@/pages': path.resolve(__dirname, 'src/pages'),
      '@/widgets': path.resolve(__dirname, 'src/widgets'),
      '@/features': path.resolve(__dirname, 'src/features'),
      '@/entities': path.resolve(__dirname, 'src/entities'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

**Rules:**
- Use `@/{layer}` prefix for all cross-layer imports
- Relative paths (`./`, `../`) only within the same slice
- Never use `../../` to cross slice boundaries

---

### Pattern 3.8: Lazy Export Pattern (MEDIUM)

Dynamic `import()` for route-level code splitting. Requires default exports on page components.

```typescript
// src/app/routes/routes.tsx — Lazy loading pages
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

// Lazy imports — each page is a separate chunk
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const UsersPage = lazy(() => import('@/pages/users'));
const SettingsPage = lazy(() => import('@/pages/settings'));

// Route configuration
export const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={<Spin size="large" className="page-loader" />}>
        <DashboardPage />
      </Suspense>
    ),
  },
  {
    path: '/users',
    element: (
      <Suspense fallback={<Spin size="large" className="page-loader" />}>
        <UsersPage />
      </Suspense>
    ),
  },
];
```

```typescript
// src/pages/dashboard/ui/DashboardPage.tsx — Default export for lazy()
export default function DashboardPage() { ... }

// src/pages/dashboard/index.ts — Re-export for direct usage (non-lazy)
export { default as DashboardPage } from './ui/DashboardPage';
export type { DashboardPageProps } from './ui/DashboardPage';
```

**Chunk naming** for debugging:
```typescript
const UsersPage = lazy(() =>
  import(/* webpackChunkName: "users-page" */ '@/pages/users')
);
```

---

### Pattern 3.9: Feature Public API Design (MEDIUM)

Each feature exports a clear, minimal public API. Consumers should never need to access internals.

```typescript
// src/features/user-management/index.ts — Well-designed public API

// UI Components — what can be rendered
export { UserList } from './ui/UserList';
export { UserForm } from './ui/UserForm';
export { UserDetailCard } from './ui/UserDetailCard';

// Hooks — what can be called
export { useUsers } from './model/useUsers';
export { useCreateUser } from './model/useCreateUser';
export { useUpdateUser } from './model/useUpdateUser';
export { useDeleteUser } from './model/useDeleteUser';

// Types — what can be referenced
export type {
  User,
  UserRole,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
} from './types/user.types';

// DO NOT EXPORT:
// - Internal helpers (lib/formatUserName.ts)
// - Internal state (model/userFormStore.ts)
// - API functions (api/userApi.ts) — consumers use hooks, not raw API
// - Internal components (ui/UserFormFields.tsx) — only top-level components
```

**Public API design principles:**
1. **Minimal surface** — export only what consumers actually use
2. **Stable contracts** — internal refactoring shouldn't break consumers
3. **Self-documenting** — export names describe capability (useCreateUser, not useUserMutation)
4. **Type-safe** — export all types that consumers need for TypeScript inference

---

### Pattern 3.10: Anti-patterns (MEDIUM)

Common module organization mistakes.

**1. Export everything** — Barrel file re-exports all internals.
```typescript
// BAD: Exposes everything
export * from './ui';
export * from './model';
export * from './api';
export * from './lib';
// Consumers can import internal helpers, breaking encapsulation

// FIX: Explicit exports of public API only
export { UserCard } from './ui/UserCard';
export { useUser } from './model/useUser';
```

**2. Deep imports** — Bypassing barrel exports to access internals.
```typescript
// BAD: Deep import into slice internals
import { validateToken } from '@/features/auth/lib/validateToken';

// FIX: If needed externally, add to public API. Otherwise, it's internal.
import { validateToken } from '@/features/auth'; // Added to index.ts
```

**3. Mixed default/named exports** — Inconsistent export style within a project.
```typescript
// BAD: Same file uses both
export default UserCard;
export function UserAvatar() { ... }

// FIX: Always named exports (except lazy-loaded pages)
export function UserCard() { ... }
export function UserAvatar() { ... }
```

**4. Index.ts as code file** — Writing logic inside barrel files.
```typescript
// BAD: Business logic in index.ts
export function useAuth() {
  // 50 lines of hook logic...
}

// FIX: index.ts is re-export only, logic in separate files
export { useAuth } from './model/useAuth';
```

**5. Unnecessary re-export depth** — Nested barrels within a slice.
```
// BAD: Too many index.ts files
features/auth/
├── ui/
│   ├── LoginForm.tsx
│   ├── AuthGuard.tsx
│   └── index.ts        ← Unnecessary
├── model/
│   ├── useAuth.ts
│   └── index.ts        ← Unnecessary
└── index.ts             ← Only this one needed

// FIX: One barrel per slice root, import directly from files in index.ts
export { LoginForm } from './ui/LoginForm';
export { useAuth } from './model/useAuth';
```

---

## Abnormal Case Patterns

1. **Large shared/ui library** — When `shared/ui/` grows beyond 30 components, use sub-segments: `shared/ui/forms/`, `shared/ui/feedback/`, `shared/ui/layout/`. Each sub-segment gets its own index.ts.

2. **Circular barrel exports** — If index.ts A imports from index.ts B which imports from A, break the cycle by importing from specific files instead of barrels.

3. **Third-party type re-exports** — Re-export third-party types from `shared/ui/` wrappers so consumers don't need direct dependency: `export type { ColumnsType } from 'antd/es/table'` in `shared/ui/Table/index.ts`.

4. **Monorepo packages** — Each package has its own `src/index.ts` as the entry point. Follow same named export rules.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (3.1–3.10), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*React Module Organization Specialist | EPS v3.2 | Metadata v2.1*
