# React FSD Architecture Specialist
# React FSDアーキテクチャスペシャリスト
# Chuyen Gia Kien Truc FSD React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — defines layer boundaries and import rules for the entire project) |
| **Directory Pattern** | `src/app/`, `src/pages/`, `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 1.1–1.13 |
| **Source Paths** | `src/app/**`, `src/pages/**`, `src/widgets/**`, `src/features/**`, `src/entities/**`, `src/shared/**` |
| **File Count** | Cross-cutting: applies to all project files (~200–500 files per project) |
| **Naming Convention** | N/A (architecture specialist — defines naming rules for other specialists, does not create files itself) |
| **Imports From** | N/A (architecture reference — defines import rules for other specialists, not itself an importable module) |
| **Cannot Import** | N/A (architecture reference — defines import restrictions for other code, is not itself imported) |
| **Imported By** | N/A (architecture reference — consumed by all other specialists as structural foundation) |
| **Dependencies** | `@feature-sliced/eslint-plugin:0.x` (FSD lint rules), `vite:6.x` (alias config), `antd:5.x` (UI framework) |
| **When To Use** | New project scaffolding, architecture review, folder structure validation, layer boundary enforcement, FSD onboarding |
| **Source Skeleton** | `src/app/index.tsx`, `src/app/providers/`, `src/pages/`, `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/ui/`, `src/shared/api/`, `src/shared/lib/`, `src/shared/config/` |
| **Specialist Type** | architecture |
| **Purpose** | Define FSD project structure — 6-layer hierarchy, slice isolation rules, public API conventions, provider composition order, Vite alias configuration, AntD integration placement |
| **Activation Trigger** | phase: /plan, /design; keywords: folderStructure, layerBoundary, fsd, sliceIsolation, publicApi, providerOrder, fsdMigration |

---

## Evidence Sources

- E1: feature-sliced.design official documentation (v2)
- E2: Feature-Sliced Design community best practices (GitHub discussions, official examples)
- E3: Ant Design 5 integration patterns with React 19
- E4: Vite 6 path alias and module resolution

---

## Role

You are a **React FSD Architecture Specialist** for enterprise Feature-Sliced Design projects. Your responsibility is to define and enforce the FSD 6-layer hierarchy (App → Pages → Widgets → Features → Entities → Shared), slice isolation rules, public API conventions (index.ts barrel exports), provider composition order, and Vite alias configuration. You are the structural authority — every other specialist follows the boundaries you define.

**Used by**: Architecture agents during /plan and /design phases, code agents needing structure guidance
**Not used by**: Non-React stacks, non-FSD architectures (Bulletproof React uses separate specialist)

---

## Patterns

### Pattern 1.1: FSD Layer Hierarchy (CRITICAL)

Strict top-down import rule. Upper layers import ONLY from lower layers.

```
App → Pages → Widgets → Features → Entities → Shared
 ↓       ↓        ↓         ↓          ↓         ↓
Can import everything below. Cannot import anything above.
```

**Layer responsibilities:**

| Layer | Responsibility | Composes From |
|-------|---------------|--------------|
| `app/` | Providers, routing, global styles, app entry | pages, shared |
| `pages/` | Full page composition, route-level code splitting | widgets, features, entities, shared |
| `widgets/` | Self-contained UI blocks (sidebar, header, product card) | features, entities, shared |
| `features/` | User interactions (CRUD, search, auth actions) | entities, shared |
| `entities/` | Business entities (User, Product, Order) | shared |
| `shared/` | Reusable infrastructure (ui, lib, api, types, config) | nothing (leaf layer) |

```
src/
├── app/          # Providers, routing, global styles
├── pages/        # Compose widgets/features into full pages
├── widgets/      # Compose features/entities into UI blocks
├── features/     # User interactions (CRUD, auth, search)
├── entities/     # Business entities (User, Product, Order)
└── shared/       # Reusable infra (ui, lib, api, types, config)
```

**Anti-pattern**: Importing from a higher layer.
```typescript
// FORBIDDEN — features/ importing from pages/
// src/features/auth/model/useAuth.ts
import { DashboardLayout } from '@/pages/dashboard'; // FSD VIOLATION
```

---

### Pattern 1.2: Slice Isolation Rules (CRITICAL)

Features CANNOT import from other features. Entities CANNOT import from other entities. Communication happens through shared/ or via composition in a higher layer.

```typescript
// src/features/checkout/model/useCheckout.ts

// ALLOWED: import from entities (lower layer)
import { useCartItems } from '@/entities/cart';
// ALLOWED: import from shared (lowest layer)
import { formatCurrency } from '@/shared/lib/format';

// FORBIDDEN: import from another feature (same layer)
// import { usePayment } from '@/features/payment'; // FSD VIOLATION — same layer
```

**Cross-feature communication patterns:**
1. **Via shared entities**: Extract shared logic to `entities/` layer
2. **Via event bus**: Use `shared/lib/eventBus.ts` for decoupled communication
3. **Via composition**: Higher layer (widget/page) composes multiple features
4. **Via shared state**: Zustand store in `shared/` when multiple features need same data

---

### Pattern 1.3: Public API Convention (CRITICAL)

Each slice exports ONLY its public API through barrel `index.ts`. Internal files are private — direct imports to internal paths are forbidden.

```typescript
// src/features/auth/index.ts — PUBLIC API
export { LoginForm } from './ui/LoginForm';
export { useAuth } from './model/useAuth';
export type { AuthUser, AuthState } from './types/auth.types';
// Internal: ./lib/validateToken.ts is NOT exported → private to this slice

// Consumer imports from public API only:
import { LoginForm, useAuth } from '@/features/auth';
// FORBIDDEN: import { validateToken } from '@/features/auth/lib/validateToken';
```

**Rules:**
- Every slice MUST have `index.ts` at its root
- Only export what consumers need — keep internals private
- Use `export type {}` for type-only exports (enables tree-shaking)
- Never re-export everything with `export * from`

---

### Pattern 1.4: Provider Composition Order (HIGH)

App.tsx wraps providers in correct dependency order. Outermost providers have no dependencies; innermost providers may depend on outer ones.

```typescript
// src/app/providers/AppProviders.tsx
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider, useThemeConfig } from '@/shared/config/theme';
import { queryClient } from '@/shared/api/queryClient';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const themeConfig = useThemeConfig();

  return (
    <BrowserRouter>
      <ErrorBoundary fallback={<ErrorPage />}>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider theme={themeConfig}>
            <AntdApp>
              <AuthProvider>
                <ThemeProvider>
                  {children}
                </ThemeProvider>
              </AuthProvider>
            </AntdApp>
          </ConfigProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
```

**Enterprise provider order (outermost → innermost):**
1. `BrowserRouter` — routing context (no deps)
2. `ErrorBoundary` — catches all errors (no deps)
3. `QueryClientProvider` — server state (no deps)
4. `ConfigProvider` (AntD) — design tokens (no deps)
5. `AntdApp` — AntD message/notification/modal (needs ConfigProvider)
6. `AuthProvider` — auth state (needs QueryClient for token refresh)
7. `ThemeProvider` — theme switching (needs ConfigProvider for AntD tokens)

**Anti-pattern**: Placing AuthProvider above QueryClientProvider when auth uses queries for token refresh.

---

### Pattern 1.5: FSD Segment Organization (HIGH)

Each slice follows standard segment layout: `ui/`, `model/`, `api/`, `lib/`, `config/`, `types/`.

```
src/features/user-management/
├── ui/                    # React components
│   ├── UserList.tsx
│   ├── UserForm.tsx
│   └── UserCard.tsx
├── model/                 # State, stores, hooks
│   ├── useUsers.ts        # TanStack Query hook
│   └── userStore.ts       # Zustand store (if local state needed)
├── api/                   # API calls
│   ├── userApi.ts         # Axios-based API functions
│   └── userApi.types.ts   # Request/response types
├── lib/                   # Utilities (private to this slice)
│   └── formatUserName.ts
├── types/                 # Type definitions
│   └── user.types.ts
└── index.ts               # Public API (barrel export)
```

**Segment rules:**
- `ui/` — React components only, no business logic
- `model/` — hooks, stores, business logic, state management
- `api/` — API calls, DTOs, request/response types
- `lib/` — pure utility functions, helpers (private)
- `types/` — TypeScript interfaces, enums, constants
- `config/` — slice-specific configuration

**Not all segments are required** — use only what the slice needs. A simple entity might only have `ui/` + `model/` + `index.ts`.

---

### Pattern 1.6: Cross-Slice Communication (HIGH)

When features need to interact, use one of these patterns instead of direct imports:

**Option A: Shared entity (preferred for data)**
```typescript
// src/entities/notification/model/notificationStore.ts
import { create } from 'zustand';

interface NotificationState {
  items: Notification[];
  add: (notification: Notification) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  add: (notification) => set((s) => ({ items: [...s.items, notification] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((n) => n.id !== id) })),
}));

// Both features/checkout and features/order can use this entity
```

**Option B: Event bus (preferred for actions)**
```typescript
// src/shared/lib/eventBus.ts
type EventMap = {
  'order:completed': { orderId: string; total: number };
  'cart:updated': { itemCount: number };
};

class TypedEventBus {
  private emitter = new EventTarget();

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    this.emitter.addEventListener(event, listener);
    return () => this.emitter.removeEventListener(event, listener);
  }
}

export const eventBus = new TypedEventBus();
```

**Option C: Composition in higher layer**
```typescript
// src/widgets/checkout-widget/ui/CheckoutWidget.tsx
// Widget composes features — they don't know about each other
import { CartSummary } from '@/features/cart';
import { PaymentForm } from '@/features/payment';
import { ShippingForm } from '@/features/shipping';

export function CheckoutWidget() {
  return (
    <div>
      <CartSummary />
      <ShippingForm />
      <PaymentForm />
    </div>
  );
}
```

---

### Pattern 1.7: Vite Alias Configuration (HIGH)

Configure path aliases for clean imports across FSD layers.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
// tsconfig.json — must mirror Vite aliases
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

**Rules:**
- Always use `@/{layer}` prefix for FSD imports — never relative paths across layers
- Relative paths (`./`, `../`) only within the same slice
- Aliases must be identical in Vite config and tsconfig.json

---

### Pattern 1.8: ESLint FSD Enforcement (HIGH)

Configure `@feature-sliced/eslint-plugin` for automated boundary enforcement.

```javascript
// eslint.config.js (flat config — ESLint 9+)
import fsd from '@feature-sliced/eslint-plugin';

export default [
  {
    plugins: {
      '@feature-sliced': fsd,
    },
    rules: {
      // Enforce layer import direction (app → pages → widgets → features → entities → shared)
      '@feature-sliced/layers-slices': 'error',
      // Enforce public API usage — no deep imports into slices
      '@feature-sliced/public-api': 'error',
      // Prevent cross-imports between slices on the same layer
      '@feature-sliced/no-cross-imports': 'error',
    },
  },
  {
    // Import restrictions for additional safety
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // Prevent bypassing public API
          { group: ['@/features/*/!(index)'], message: 'Import from feature public API only' },
          { group: ['@/entities/*/!(index)'], message: 'Import from entity public API only' },
        ],
      }],
    },
  },
];
```

**CI integration**: Add `eslint --rule '@feature-sliced/layers-slices: error'` to CI pipeline for automated boundary checks.

---

### Pattern 1.9: AntD Integration in FSD (MEDIUM-HIGH)

Defines where Ant Design components live within FSD architecture.

**Placement rules:**
| AntD Usage | FSD Location | Example |
|-----------|-------------|---------|
| Base components (Button, Input) | `shared/ui/` wrappers | `shared/ui/Button/Button.tsx` |
| ConfigProvider + theme | `app/providers/` | `app/providers/AntdProvider.tsx` |
| Form in a feature | `features/{name}/ui/` | `features/auth/ui/LoginForm.tsx` |
| Table in a widget | `widgets/{name}/ui/` | `widgets/user-table/ui/UserTable.tsx` |
| Design tokens | `shared/config/theme.ts` | Export `themeConfig` object |
| AntD message/notification | Via `AntdApp` context | `app/providers/` — AntdApp wraps all |

```typescript
// src/shared/ui/Button/Button.tsx — Wrap AntD for project conventions
import { Button as AntdButton, ButtonProps as AntdButtonProps } from 'antd';

interface ButtonProps extends AntdButtonProps {
  // Project-specific props can be added here
}

export function Button({ children, ...props }: ButtonProps) {
  return <AntdButton {...props}>{children}</AntdButton>;
}

// src/shared/ui/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

```typescript
// src/shared/config/theme.ts — AntD Design Tokens
import type { ThemeConfig } from 'antd';

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  components: {
    Button: { controlHeight: 36 },
    Input: { controlHeight: 36 },
    Table: { headerBg: '#fafafa' },
  },
};
```

**Anti-pattern**: Importing AntD directly in feature components without wrapping. This creates tight coupling and makes design system changes painful.

---

### Pattern 1.10: Module Boundary Enforcement (MEDIUM)

Strict layer dependency validation using automated tools.

```typescript
// scripts/check-boundaries.ts — Custom boundary checker
import { Project, SourceFile } from 'ts-morph';

const LAYER_ORDER = ['shared', 'entities', 'features', 'widgets', 'pages', 'app'];

function getLayer(filePath: string): string | null {
  for (const layer of LAYER_ORDER) {
    if (filePath.includes(`/src/${layer}/`)) return layer;
  }
  return null;
}

function checkImport(sourceLayer: string, targetLayer: string): boolean {
  const sourceIdx = LAYER_ORDER.indexOf(sourceLayer);
  const targetIdx = LAYER_ORDER.indexOf(targetLayer);
  // Can only import from lower layers (lower index)
  return targetIdx < sourceIdx;
}

// Run as: npx ts-node scripts/check-boundaries.ts
```

**Integration with CI:**
```yaml
# .github/workflows/architecture.yml
- name: Check FSD boundaries
  run: |
    npx eslint --rule '@feature-sliced/layers-slices: error' src/
    npx ts-node scripts/check-boundaries.ts
```

---

### Pattern 1.11: FSD Directory Template (MEDIUM)

Complete directory tree for scaffolding a new enterprise FSD project.

```
src/
├── app/
│   ├── providers/
│   │   ├── AppProviders.tsx          # All providers composed
│   │   ├── AntdProvider.tsx          # ConfigProvider + AntdApp
│   │   └── QueryProvider.tsx         # QueryClientProvider
│   ├── routes/
│   │   ├── AppRouter.tsx             # Route definitions
│   │   └── routes.tsx                # Route config array
│   ├── styles/
│   │   └── global.css                # Global styles, AntD overrides
│   ├── App.tsx                       # Root component
│   └── index.tsx                     # Entry point (createRoot)
├── pages/
│   ├── home/
│   │   ├── ui/HomePage.tsx
│   │   └── index.ts
│   ├── login/
│   │   ├── ui/LoginPage.tsx
│   │   └── index.ts
│   └── not-found/
│       ├── ui/NotFoundPage.tsx
│       └── index.ts
├── widgets/
│   ├── header/
│   │   ├── ui/Header.tsx
│   │   └── index.ts
│   ├── sidebar/
│   │   ├── ui/Sidebar.tsx
│   │   ├── model/useSidebar.ts
│   │   └── index.ts
│   └── user-table/
│       ├── ui/UserTable.tsx
│       ├── model/useUserTable.ts
│       └── index.ts
├── features/
│   ├── auth/
│   │   ├── ui/LoginForm.tsx
│   │   ├── model/useAuth.ts
│   │   ├── api/authApi.ts
│   │   └── index.ts
│   └── theme-switcher/
│       ├── ui/ThemeSwitcher.tsx
│       ├── model/useTheme.ts
│       └── index.ts
├── entities/
│   ├── user/
│   │   ├── ui/UserCard.tsx
│   │   ├── model/userStore.ts
│   │   ├── api/userApi.ts
│   │   ├── types/user.types.ts
│   │   └── index.ts
│   └── notification/
│       ├── ui/NotificationItem.tsx
│       ├── model/notificationStore.ts
│       └── index.ts
└── shared/
    ├── api/
    │   ├── apiClient.ts              # Axios instance + interceptors
    │   ├── queryClient.ts            # TanStack Query client config
    │   └── index.ts
    ├── config/
    │   ├── env.ts                    # Environment variables
    │   ├── theme.ts                  # AntD theme tokens
    │   └── index.ts
    ├── hooks/
    │   ├── useDebounce.ts
    │   ├── useMediaQuery.ts
    │   └── index.ts
    ├── lib/
    │   ├── format.ts                 # Formatters (date, currency)
    │   ├── validation.ts             # Common validators
    │   └── index.ts
    ├── types/
    │   ├── api.types.ts              # Pagination, ErrorResponse
    │   └── index.ts
    └── ui/
        ├── Button/
        │   ├── Button.tsx
        │   └── index.ts
        ├── ErrorBoundary/
        │   ├── ErrorBoundary.tsx
        │   └── index.ts
        └── index.ts
```

---

### Pattern 1.12: FSD Migration Guide (MEDIUM)

Moving from flat/feature-folder structure to FSD incrementally.

**Phase 1: Identify layers**
```
# Before (flat structure)
src/
├── components/     → shared/ui/ + entities/*/ui/ + features/*/ui/
├── hooks/          → shared/hooks/ + features/*/model/
├── services/       → shared/api/ + entities/*/api/
├── utils/          → shared/lib/
├── types/          → shared/types/ + entities/*/types/
└── pages/          → pages/ (keep)
```

**Phase 2: Move shared first** (lowest risk)
1. Create `src/shared/` with segments: `ui/`, `lib/`, `api/`, `hooks/`, `types/`, `config/`
2. Move truly reusable components, hooks, and utils
3. Update import paths to use `@/shared/` alias

**Phase 3: Extract entities**
1. Identify business objects (User, Product, Order)
2. Create `src/entities/{name}/` with segments
3. Move entity-specific components, hooks, and API calls

**Phase 4: Extract features**
1. Identify user interactions (login, create-order, search)
2. Create `src/features/{name}/` with segments
3. Move feature-specific logic from components/hooks/services

**Phase 5: Add boundaries**
1. Install `@feature-sliced/eslint-plugin`
2. Configure layer rules
3. Add barrel exports (index.ts) to every slice
4. Run boundary checker in CI

**Anti-pattern**: Attempting big-bang migration. Always migrate incrementally, one layer at a time.

---

### Pattern 1.13: Anti-patterns (MEDIUM)

Common FSD violations and their fixes.

**1. God Slice** — A single feature grows beyond 20 files.
```
# BAD: features/user-management/ has 30+ files
Fix: Split into features/user-list/, features/user-create/, features/user-edit/
     Extract shared user logic to entities/user/
```

**2. Layer Violation** — Feature imports from another feature or from a page.
```typescript
// BAD: Direct cross-feature import
import { usePayment } from '@/features/payment'; // in features/checkout
// FIX: Extract to entities/ or compose in widgets/
```

**3. Barrel Export Leak** — Internal files imported directly, bypassing index.ts.
```typescript
// BAD: Deep import into feature internals
import { validateToken } from '@/features/auth/lib/validateToken';
// FIX: Export through public API or keep as internal
```

**4. Shared God Module** — Everything dumped into `shared/` without segmentation.
```
# BAD: shared/ has 100+ files in flat structure
Fix: Use segments (ui/, lib/, api/, hooks/, types/, config/)
     If too many: create sub-segments (shared/ui/forms/, shared/ui/feedback/)
```

**5. Circular Dependencies** — Entity A imports Entity B, which imports Entity A.
```
Fix: Extract shared types to shared/types/
     Use event bus for cross-entity communication
     Check with: npx madge --circular src/
```

**6. Provider Ordering Bug** — QueryClientProvider inside AuthProvider, but auth needs queries.
```
Fix: Map provider dependency graph. Place providers that have no deps outermost.
     Auth depends on QueryClient → QueryClient must wrap Auth.
```

---

## Abnormal Case Patterns

1. **Monorepo with FSD** — Each app in `apps/` follows FSD independently. Shared packages in `packages/` are consumed as external libraries (see Pattern 4: Monorepo Specialist).

2. **FSD + Micro-frontends** — Each micro-frontend is a standalone FSD app. Cross-MFE communication via Module Federation runtime container.

3. **Legacy integration** — Legacy components placed in `shared/legacy/` with gradual migration path. ESLint warnings (not errors) for legacy imports.

4. **Test files location** — Co-locate tests with source: `features/auth/model/__tests__/useAuth.test.ts`. Test utilities in `shared/test/`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (1.1–1.13), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

## Architecture: Folder Tree

```
src/
├── app/                              # Providers, routing, global styles, entry point
│   ├── providers/                    # AppProviders, AuthProvider, ThemeProvider, QueryProvider
│   ├── routes/                       # AppRouter, route config, guards/
│   │   └── guards/                   # ProtectedRoute, RoleGuard
│   ├── layouts/                      # MainLayout (AntD Layout + Sider)
│   ├── store/                        # Redux store (nếu dùng RTK thay Zustand)
│   ├── styles/                       # Global CSS, AntD overrides
│   ├── App.tsx
│   └── index.tsx
├── pages/                            # Full page composition, route-level lazy load
│   └── {page-name}/
│       ├── ui/{Name}Page.tsx
│       └── index.ts
├── widgets/                          # Self-contained UI blocks
│   └── {widget-name}/
│       ├── ui/{Name}.tsx
│       ├── model/use{Name}.ts        # Widget-specific hook
│       └── index.ts
├── features/                         # User interactions (CRUD, search, auth)
│   └── {feature-name}/
│       ├── ui/{Name}.tsx
│       ├── ui/forms/{Entity}Form.tsx  # AntD forms
│       ├── ui/tables/{Entity}Table.tsx # AntD tables
│       ├── ui/modals/                 # Feature modals
│       ├── model/store.ts             # Zustand store
│       ├── model/use{Name}.ts         # Custom hook
│       ├── model/{flow}Machine.ts     # XState machine (nếu dùng)
│       ├── api/{name}Api.ts           # Feature-specific API
│       ├── __tests__/                 # Integration tests
│       └── index.ts
├── entities/                          # Business entities
│   └── {entity-name}/
│       ├── ui/{Name}Card.tsx
│       ├── model/store.ts             # Zustand store
│       ├── model/types.ts             # Entity types (IUser, IProduct)
│       ├── api/{name}Queries.ts       # TanStack Query hooks
│       ├── __tests__/
│       └── index.ts
└── shared/                            # Reusable infrastructure (leaf layer)
    ├── api/                           # Axios client, QueryClient, queryKeys, interceptors/
    │   ├── client.ts                  # Axios instance + interceptors
    │   ├── queryClient.ts             # TanStack Query client config
    │   └── queryKeys.ts              # Query key factories
    ├── config/                        # env.ts, theme.config.ts, feature-flags.ts
    ├── hooks/                         # useDebounce, useMediaQuery, useModal, usePermission
    ├── lib/                           # Pure utilities
    │   ├── auth/                      # useAuth, tokenStorage
    │   ├── di/                        # DI container (nếu dùng)
    │   ├── domain/                    # Domain models, validation schemas, events
    │   ├── security/                  # CSRF, sanitize, CSP
    │   ├── hoc/                       # withAuth, withPermission
    │   └── headless/                  # Headless UI hooks
    ├── realtime/                      # SignalR, Socket.IO clients
    ├── store/                         # App-level Zustand store (appStore.ts)
    ├── styles/                        # CSS variables, global overrides
    ├── test/                          # Test utils, MSW handlers
    ├── types/                         # API types, utility types, branded types
    └── ui/                            # Shared components
        ├── {Component}/               # Each component has own folder
        │   ├── {Component}.tsx
        │   └── index.ts
        ├── animation/
        ├── dnd/
        ├── form-fields/
        ├── loading/
        ├── modal/
        ├── skeleton/
        └── table/
```

---

## Architecture: File Type Mapping

| # | File Type | Layer | Path | Required? | Source |
|---|-----------|-------|------|-----------|--------|
| 1 | Page component | pages | `src/pages/{name}/ui/{Name}Page.tsx` | REQUIRED | react-router 1.x |
| 2 | Page public API | pages | `src/pages/{name}/index.ts` | REQUIRED | react-module-organization 3.x |
| 3 | Widget component | widgets | `src/widgets/{name}/ui/{Name}.tsx` | REQUIRED | Pattern 1.11 |
| 4 | Widget hook | widgets | `src/widgets/{name}/model/use{Name}.ts` | OPTIONAL | react-custom-hooks 12.x |
| 5 | Feature component | features | `src/features/{name}/ui/{Name}.tsx` | REQUIRED | Pattern 1.5 |
| 6 | Feature AntD form | features | `src/features/{name}/ui/forms/{Entity}Form.tsx` | OPTIONAL | react-antd-form 42.x |
| 7 | Feature AntD table | features | `src/features/{name}/ui/tables/{Entity}Table.tsx` | OPTIONAL | react-antd-table 41.x |
| 8 | Feature store | features | `src/features/{name}/model/store.ts` | OPTIONAL | react-zustand 15.x |
| 9 | Feature hook | features | `src/features/{name}/model/use{Name}.ts` | OPTIONAL | react-custom-hooks 12.x |
| 10 | Feature XState | features | `src/features/{name}/model/{flow}Machine.ts` | OPTIONAL | react-xstate 19.x |
| 11 | Entity component | entities | `src/entities/{name}/ui/{Name}Card.tsx` | OPTIONAL | Pattern 1.11 |
| 12 | Entity store | entities | `src/entities/{name}/model/store.ts` | OPTIONAL | react-zustand 15.x |
| 13 | Entity types | entities | `src/entities/{name}/model/types.ts` | REQUIRED | react-typescript-generics 8.x |
| 14 | Entity queries | entities | `src/entities/{name}/api/{name}Queries.ts` | REQUIRED | react-tanstack-query 20.x |
| 15 | Entity public API | entities | `src/entities/{name}/index.ts` | REQUIRED | react-module-organization 3.x |
| 16 | Shared UI component | shared | `src/shared/ui/{Name}/{Name}.tsx` + `index.ts` | OPTIONAL | react-compound-component 33.x |
| 17 | Shared hook | shared | `src/shared/hooks/use{Name}.ts` | OPTIONAL | react-custom-hooks 12.x |
| 18 | API client (Axios) | shared | `src/shared/api/client.ts` | REQUIRED | react-api-client 21.x |
| 19 | Query client | shared | `src/shared/api/queryClient.ts` | REQUIRED | react-tanstack-query 20.x |
| 20 | Query keys | shared | `src/shared/api/queryKeys.ts` | REQUIRED | react-tanstack-query 20.x |
| 21 | App-level store | shared | `src/shared/store/appStore.ts` | OPTIONAL | react-zustand 15.x |
| 22 | Auth utils | shared | `src/shared/lib/auth/useAuth.ts`, `tokenStorage.ts` | REQUIRED | react-auth-flow 44.x |
| 23 | App provider | app | `src/app/providers/{Name}Provider.tsx` | REQUIRED | react-provider-composition 5.x |
| 24 | Route config | app | `src/app/routes/routes.tsx` | REQUIRED | react-router 24.x |
| 25 | Route guard | app | `src/app/routes/guards/ProtectedRoute.tsx` | OPTIONAL | react-protected-routes 25.x |
| 26 | App layout | app | `src/app/layouts/MainLayout.tsx` | REQUIRED | react-antd-layout 40.x |
| 27 | Theme config | shared | `src/shared/config/theme.config.ts` | REQUIRED | react-antd-tokens-styling 73.x |

**Naming conventions** (verified from specialists):
- **Folders**: kebab-case (`create-product/`, `user-table/`)
- **Components**: PascalCase (`CreateProductForm.tsx`, `UserCard.tsx`)
- **Hooks**: `use` prefix + PascalCase (`useCreateProduct.ts`, `useDebounce.ts`)
- **Store files**: `store.ts` — NOT `{name}Store.ts` (react-zustand convention)
- **Query files**: `{name}Queries.ts` — NOT `{name}Api.ts` (react-tanstack-query convention)
- **Types files**: `types.ts` trong `model/` — NOT folder `types/` riêng (react-typescript-generics convention)
- **Public API**: mỗi slice có `index.ts` barrel export (react-module-organization convention)

---

## Architecture: Dependency Rules

### Layer Import Rules (STRICT — top-down only)

```
App      → Pages, Widgets, Features, Entities, Shared
Pages    → Widgets, Features, Entities, Shared
Widgets  → Features, Entities, Shared
Features → Entities, Shared
Entities → Shared
Shared   → NOTHING (leaf layer)
```

FORBIDDEN:
  Shared → Entities, Features, Widgets, Pages, App (shared không biết layer trên)
  Entities → Features (entity không biết feature nào dùng nó)
  Features → Widgets, Pages (feature không biết nơi hiển thị)
  Widgets → Pages (widget không biết page nào chứa nó)

### Slice Isolation Rules

Within same layer (features/, entities/, widgets/):
  features/auth/ → features/search/        (FORBIDDEN — cross-slice import)
  entities/user/ → entities/order/          (FORBIDDEN — entity không biết entity khác)
  widgets/header/ → widgets/sidebar/        (FORBIDDEN — widget isolated)

Cross-slice communication PHẢI qua:
  1. Props drilling từ page/widget (composition)
  2. Shared store (shared/lib hoặc app-level state)
  3. Event bus hoặc pub/sub pattern

### Public API Convention

Mỗi slice PHẢI có `index.ts` barrel export:
  ALLOWED:  `import { UserCard } from '@/entities/user'`         (qua index.ts)
  FORBIDDEN: `import { UserCard } from '@/entities/user/ui/UserCard'`  (deep import)

---

## Architecture: Feature Completeness

> Khi tạo slice mới hoặc thêm vào slice có sẵn, PHẢI đảm bảo đủ files REQUIRED và update public API.

### Rule 1: New Entity Slice → PHẢI có

| # | File | Required? | Lý do |
|---|------|-----------|-------|
| 1 | `entities/{name}/model/types.ts` | REQUIRED | Data contract (IEntity interface) |
| 2 | `entities/{name}/api/{name}Queries.ts` | REQUIRED | TanStack Query hooks (useQuery, useMutation) |
| 3 | `entities/{name}/index.ts` | REQUIRED | Public API — export types, hooks, components |

### Rule 2: New Feature Slice → PHẢI có

| # | File | Required? | Lý do |
|---|------|-----------|-------|
| 1 | `features/{name}/ui/{Name}.tsx` | REQUIRED | UI component cho user interaction |
| 2 | `features/{name}/model/store.ts` | CONDITIONAL | Zustand store — nếu cần local state |
| 3 | `features/{name}/model/use{Name}.ts` | CONDITIONAL | Custom hook — nếu có logic phức tạp |
| 4 | `features/{name}/index.ts` | REQUIRED | Public API |

### Rule 3: Validation

- Mỗi slice PHẢI có `index.ts` public API (KHÔNG deep import từ bên ngoài)
- Entity types nằm trong `model/{name}.types.ts` (KHÔNG tạo folder `types/` riêng)
- Entity API dùng TanStack Query → file tên `{name}Queries.ts` (KHÔNG dùng `{name}Api.ts`)
- Store files tên `store.ts` (KHÔNG dùng `{name}Store.ts`) — theo Zustand specialist
- Mỗi page component PHẢI lazy load: `React.lazy(() => import('./ui/HomePage'))`
- Feature KHÔNG được import từ feature khác (slice isolation)
- Entity KHÔNG được import từ entity khác (flat dependency)
- API client (Axios) ở `shared/api/client.ts` — KHÔNG ở entity hoặc feature
- Query config ở `shared/api/queryClient.ts` + `shared/api/queryKeys.ts`
- App-level store ở `shared/store/appStore.ts` — KHÔNG ở entity

### Example: New Entity "product"

```
REQUIRED:
  src/entities/product/model/types.ts            # IProduct, IProductFilter
  src/entities/product/api/productQueries.ts     # useProductsQuery(), useProductDetailQuery()
  src/entities/product/index.ts                  # export { useProductsQuery, type IProduct }

OPTIONAL:
  src/entities/product/model/store.ts            # Zustand store — chỉ nếu cần client-side state
  src/entities/product/ui/ProductCard.tsx         # Chỉ nếu entity cần UI component riêng

SAI (Claude thường mắc):
  src/entities/product/api/productApi.ts          # ❌ SAI tên — dùng productQueries.ts
  src/entities/product/types/product.types.ts     # ❌ SAI vị trí — types nằm trong model/types.ts
  src/entities/product/model/productStore.ts      # ❌ SAI tên — dùng store.ts
```

### Example: New Feature "create-product" (depends on product entity)

```
REQUIRED:
  src/features/create-product/ui/CreateProductForm.tsx    # AntD Form component
  src/features/create-product/model/useCreateProduct.ts   # Form logic, validation, mutation
  src/features/create-product/index.ts                    # export { CreateProductForm }

OPTIONAL:
  src/features/create-product/model/store.ts              # Chỉ nếu cần local state phức tạp
  src/features/create-product/ui/forms/ProductWizardForm.tsx  # Chỉ nếu multi-step form

IMPORTS:
  ✅ import { type IProduct } from '@/entities/product'    # OK — feature imports entity
  ✅ import { Button, Form } from '@/shared/ui'            # OK — feature imports shared
  ✅ import { apiClient } from '@/shared/api'              # OK — feature imports shared API
  ❌ import { EditProductForm } from '@/features/edit-product'  # FORBIDDEN — cross-feature
  ❌ import { productQueries } from '@/entities/product/api/productQueries'  # FORBIDDEN — deep import

KHÔNG CẦN:
  api/ file riêng        # Reuse entity queries: entities/product/api/productQueries.ts
  types/ file riêng      # Reuse entity types qua public API: import { type IProduct } from '@/entities/product'
```

---

*React FSD Architecture Specialist | EPS v3.2 | Metadata v2.1*
