---
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
  - "src/**/*.css"
---
# React Frontend Rules — Feature-Sliced Design (FSD)
## Architecture
- React 19.x, TypeScript 5.x   # CONFIGURE: versions
- Feature-Sliced Design (FSD) — 6-layer strict hierarchy
- UI: Ant Design 5.x           # CONFIGURE: UI library
- State: Zustand 5.x (primary) # CONFIGURE: state management
- Data: TanStack Query v5
- Routing: React Router v7      # CONFIGURE: router
## Layer Hierarchy (CRITICAL)
```
App → Pages → Widgets → Features → Entities → Shared
```
- Upper layers import ONLY from lower layers — NEVER upward
- app/: providers, routing, global styles, app entry
- pages/: full page composition, route-level code splitting
- widgets/: self-contained UI blocks (sidebar, header, product card)
- features/: user interactions (CRUD, search, auth actions)
- entities/: business entities (User, Product, Order)
- shared/: reusable infrastructure (ui, lib, api, types, config)
## Folder Structure
```
src/
├── app/                    # Providers, routing, global config
│   ├── providers/          # ThemeProvider, QueryProvider, AuthProvider
│   ├── routes/             # Route definitions
│   └── styles/             # Global CSS
├── pages/                  # Route-level pages
│   └── {page-name}/
│       └── ui/
├── widgets/                # Self-contained UI blocks
│   └── {widget-name}/
│       ├── ui/
│       └── model/
├── features/               # User interactions
│   └── {feature-name}/
│       ├── ui/             # Feature UI components
│       ├── model/          # store.ts, hooks
│       ├── api/            # Feature-scoped API calls
│       └── lib/            # Feature utilities
├── entities/               # Business entities
│   └── {entity-name}/
│       ├── ui/             # Entity display components
│       ├── model/          # Entity types, store
│       ├── api/            # Entity CRUD API
│       └── lib/            # Entity helpers
└── shared/                 # Reusable infrastructure
    ├── ui/                 # Generic UI components
    ├── lib/                # Utilities, formatters
    ├── api/                # API client, interceptors
    ├── types/              # Global TypeScript types
    └── config/             # Constants, env config
```
## Naming
- Directories: `kebab-case`
- Components: `PascalCase.tsx`
- Hooks: `use{Name}.ts`
- Stores (Zustand): `use{Name}Store.ts` in `model/store.ts`
- Slices (RTK): `{name}Slice.ts` in `model/slice.ts`
- Contexts: `{Name}Context.tsx`, `{Name}Provider.tsx`
- API: `{entity}Api.ts` or `api/query.ts` (TanStack Query)
- Types: `types.ts` per module
## Import Rules
- ALWAYS top-down: App → Pages → Widgets → Features → Entities → Shared
- NEVER import from upper layers (features CANNOT import pages/widgets)
- Cross-slice imports at same level: via public API (`index.ts` barrel export)
- Use path aliases: `@/shared/*`, `@/entities/*`, `@/features/*`, etc.
## State Management
- Zustand (primary): client-side UI state, feature-scoped state
- TanStack Query: ALL server state (fetch, cache, mutation, invalidation)
- React Context: theme, locale, auth — simple state that changes infrequently
- NEVER duplicate server state in client stores — TanStack Query is the cache
## Data Fetching
- TanStack Query for all API calls — `useQuery`, `useMutation`
- Query keys: `['{entity}', params]` convention
- API client in `shared/api/` — axios or fetch wrapper
- Optimistic updates via `onMutate` + `onError` rollback
## Clean Architecture Mapping
- Domain → `entities/` (business logic, validation, types)
- Application → `features/` (use cases, orchestration)
- Presentation → `pages/`, `widgets/` (UI composition)
- Infrastructure → `shared/api/`, `shared/lib/` (API clients, storage)
## Modules
# CONFIGURE: list your project's feature modules
- {feature-name}: {description}

## KHI NAO KHONG AP DUNG (When NOT to Apply)
- **DO NOT use Redux/Zustand** for fewer than 3 shared state items — use React Context instead. Simple auth/theme/locale state does not need a state management library.
- **DO NOT use Feature-Sliced Design (FSD)** for projects with fewer than 5 features — a simple flat feature-based structure is sufficient and easier to navigate.
- **DO NOT create separate `entities/` layer** if there are no shared business entities across features — put entity types directly in the feature that owns them.
- **DO NOT use TanStack Query** for simple one-off API calls — `useEffect` + `fetch` is acceptable for non-cacheable, non-shared requests.
