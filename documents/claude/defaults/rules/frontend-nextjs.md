---
paths:
  - "frontend/**/*.tsx"
  - "frontend/**/*.ts"
  - "frontend/**/*.css"
---
# Next.js Frontend Rules — Clean Architecture
## Architecture
- Next.js 16.x with App Router, React 19.x, TypeScript 5.x   # CONFIGURE: versions
- Clean Architecture **5-Layer** (App / Core / Domain / Infrastructure / Presentation)
- UI: Ant Design 5.x           # CONFIGURE: UI library
- State: Redux Toolkit          # CONFIGURE: state management
- Auth: NextAuth                # CONFIGURE: auth strategy
- i18n: i18next                 # CONFIGURE: locales
## Layer Rules
- app (`src/app/`): Next.js routing, layouts, pages — composition root, imports ALL layers
- core (`src/core/`): DI factories/containers, config, constants, i18n — leaf layer, imported by ALL
- domain (`src/domain/`): entity interfaces, repository interfaces, use-cases — NO framework imports
- infrastructure (`src/infrastructure/`): API clients, repo impls, store — implements domain ports
- presentation (`src/presentation/`): hooks, providers, UI modules
## Naming
- Path aliases: `@/domain/*`, `@/core/*`, `@/infrastructure/*`, `@/presentation/*`, `@/app/*`
- Entity: `I{Entity}.ts` in `domain/entities/`
- Repository interface: `I{Entity}Repository.ts` in `domain/repositories/`
- Repository impl: `{entity}Repository.ts` in `infrastructure/repositories/`
- API client: `{moduleCode}Api.ts` in `infrastructure/api/`
- Use case: `{action}{Entity}UseCase.ts` in `domain/usecases/`
- DI factory: `{entity}Factory.ts` in `core/di/factories/`
- UI module: `presentation/ui/modules/{moduleCode}/`
- Hook: `use{Name}.ts` in `presentation/hooks/`
## Import Rules
- ALWAYS use `@/` layer-qualified imports, NEVER relative cross-layer imports
- ESLint `no-restricted-imports` enforces layer boundaries
- domain CANNOT import infrastructure, presentation, app
- infrastructure CANNOT import presentation, app
- presentation CANNOT import app
## Routing
# CONFIGURE: define your project's routing pattern
- Route pattern: `src/app/[tenant_key]/(withLayout)/[prefix]/[application]/page.tsx`
- Route groups: `(auth)/` (no layout), `(withLayout)/` (sidebar + header)
## Modules
# CONFIGURE: list your project's module codes and their business domains
- {moduleCode}: {description}

## KHI NAO KHONG AP DUNG (When NOT to Apply)
- **DO NOT use Clean Architecture** for projects with fewer than 5 pages — use Feature-Based or simple flat structure instead. Empty domain/infrastructure layers add complexity without value.
- **DO NOT use separate domain layer** if the frontend has no business logic beyond API calls and display — domain layer will be empty.
- **DO NOT use DI factories/containers** unless the project has 10+ modules with shared dependencies. Simpler projects should use direct imports.
- **DO NOT force path aliases** (`@/domain/*`, etc.) for projects with fewer than 3 layers — relative imports are clearer for small codebases.
