# Next.js Architecture Master Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting master) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 0.1–0.5 |
| **Source Paths** | `src/app/`, `src/core/`, `src/domain/`, `src/infrastructure/`, `src/presentation/` |
| **File Count** | ~925 total files across 5 layers |
| **Naming Convention** | Layer-based folder structure, `@/` path aliases |
| **Barrel Export** | Per-layer `index.ts` files |
| **Imports From** | N/A (this IS the architecture master) |
| **Imported By** | N/A (all specialists reference this) |
| **Cannot Import** | N/A (cross-cutting — defines rules) |
| **Dependencies** | N/A (architecture) |
| **When To Use** | ANY file generation — verify path, check checklist, validate dependencies |
| **Source Skeleton** | `app/`, `core/`, `domain/`, `infrastructure/`, `presentation/` |
| **Specialist Type** | architecture-master |
| **Purpose** | Single source of truth for folder structure, file type→path mapping, dependency rules, feature checklist |
| **Activation Trigger** | phase: ALL; keywords: architecture, folder, path, newFeature, fileType, dependency |

---

## Description

This is the **Architecture Master** — the single source of truth for Next.js Clean Architecture. It consolidates folder structure, file type mapping, dependency rules, and feature completeness from specialists 50.x, 51.x, 52.x, 63.x, and 84.x into one reference.

**When to consult this file**:
- Creating any new file → §1 (folder tree) + §2 (file type mapping)
- Creating a new feature → §4 (checklist)
- Validating imports → §3 (dependency rules)
- Understanding known issues → §5 (compromises)

---

## Architecture: Folder Tree

```
src/
├── app/                                    # LAYER 1: App (Next.js Router — composition root)
│   ├── layout.tsx                          # Root layout
│   ├── page.tsx                            # Root page (redirect)
│   ├── globals.css
│   ├── [tenant_key]/                       # Dynamic tenant segment
│   │   ├── page.tsx                        # Tenant root
│   │   ├── (auth)/                         # Route group: no layout
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   └── (withLayout)/                   # Route group: with sidebar/header
│   │       ├── layout.tsx                  # 3-zone layout (Header + Sider + Content)
│   │       └── [prefix]/                   # Module prefix (cmn, sfa, tnt, ctm)
│   │           ├── page.tsx
│   │           ├── [application]/           # Dynamic application mapping (66 keys)
│   │           │   └── page.tsx
│   │           ├── calendar/
│   │           │   └── page.tsx
│   │           └── mail/
│   │               └── page.tsx
│   ├── login/                              # Login (no tenant)
│   ├── register/                           # Registration
│   └── tenant-registration/                # Tenant onboarding
│
├── core/                                   # LAYER 2: Core (leaf layer — imported by ALL)
│   ├── config/                             # (1 file) apiConfig.ts — API path functions
│   ├── constants/                          # (8+ files) App-wide constants + index.ts barrel
│   ├── di/                                 # DI wiring (see 51.x)
│   │   ├── factories/                      # (50 files) Factory functions
│   │   └── modules/                        # (52 files) Container modules
│   ├── i18n/                               # i18next config + locales (see 58.x)
│   │   └── locales/
│   │       ├── en-US/
│   │       └── ja-JP/
│   ├── services/                           # (4 files) Cross-cutting services
│   ├── styles/                             # (2 files) app.css, globals.css
│   ├── types/                              # (4 files) Shared TypeScript types
│   ├── ultis/                              # ⚠️ TYPO folder (see §5)
│   └── utils/                              # (4 files) Utility functions
│
├── domain/                                 # LAYER 3: Domain (entities, contracts, logic)
│   ├── entities/                           # (39 files) I-prefixed interfaces
│   │   ├── customer.ts                     # → exports ICustomer, IEmployees
│   │   ├── auth.ts                         # → exports IAuthModel
│   │   ├── common.ts                       # → exports IDataField, IDataSource, etc.
│   │   ├── tenant/                         # Subdirectory for tenant entities
│   │   ├── workflowRuntime/                # Subdirectory for workflow entities
│   │   └── index.ts                        # Barrel re-export
│   ├── repositories/                       # (51 files) Interface contracts
│   │   └── customerRepository.ts           # → exports CustomerRepository (interface)
│   └── use-cases/                          # (51 files) Pure functions (NOT classes)
│       └── customer/
│           └── getCustomersUsecase.ts       # → exports getCustomersUsecase()
│
├── infrastructure/                         # LAYER 4: Infrastructure (implementations)
│   ├── api/                                # API client modules
│   │   ├── axios.ts                        # Axios instance + interceptors (see 54.x)
│   │   └── {entity}/                       # Per-entity API module
│   │       └── customerApi.ts              # → exports customerApi object
│   ├── repositories/                       # (51 files) Repository implementations
│   │   ├── base/                           # BaseRepository (see 88.x)
│   │   └── customerRepositoryImpl.ts       # Implements CustomerRepository
│   └── store/                              # Redux store (see 53.x)
│       ├── store.ts                        # Store configuration
│       └── slices/                         # (4 slices)
│           ├── currentUserSlice.ts
│           ├── detailSlice.ts
│           ├── appSlice.ts
│           └── notificationSlice.ts
│
└── presentation/                           # LAYER 5: Presentation (UI)
    ├── hooks/                              # (15 files) Global hooks (see 86.x)
    ├── providers/                          # (8 files) Context providers (see 85.x)
    ├── shared/                             # Shared components
    │   ├── hooks/                          # Shared hook directory
    │   └── components/
    └── ui/
        ├── components/
        │   └── core/
        │       └── block/                  # Block rendering (see 56.x)
        ├── layouts/                        # App layouts (see 69.x)
        └── modules/                        # Feature modules (see 63.x)
            └── {code}_{name}/              # e.g., cmn001000_customer/
                ├── containers/             # DI containers (presentation-level)
                ├── blocks/                 # UI blocks
                ├── shared/                 # Module-specific shared
                └── {subcode}_{action}/     # Submodules
                    └── containers/
```

---

## Architecture: File Type Mapping

| # | File Type | Path Pattern | Example | Required | Naming Convention |
|---|-----------|-------------|---------|----------|-------------------|
| 1 | Entity Interface | `src/domain/entities/{entity}.ts` | `src/domain/entities/customer.ts` | YES | lowercase filename, I-prefix exports (`ICustomer`) |
| 2 | Repository Interface | `src/domain/repositories/{entity}Repository.ts` | `src/domain/repositories/customerRepository.ts` | YES | camelCase, suffix `Repository` |
| 3 | UseCase | `src/domain/use-cases/{entity}/{action}{Entity}Usecase.ts` | `src/domain/use-cases/customer/getCustomersUsecase.ts` | YES | camelCase, suffix `Usecase`, pure function |
| 4 | DI Factory | `src/core/di/factories/{entity}Factory.ts` | `src/core/di/factories/customerFactory.ts` | YES | camelCase, suffix `Factory` |
| 5 | DI Container | `src/core/di/modules/{entity}Container.ts` | `src/core/di/modules/customerContainer.ts` | YES | camelCase, suffix `Container` |
| 6 | API Client | `src/infrastructure/api/{entity}/{entity}Api.ts` | `src/infrastructure/api/customer/customerApi.ts` | YES | camelCase, suffix `Api`, object export |
| 7 | Repository Impl | `src/infrastructure/repositories/{entity}RepositoryImpl.ts` | `src/infrastructure/repositories/customerRepositoryImpl.ts` | YES | camelCase, suffix `RepositoryImpl` |
| 8 | Redux Slice | `src/infrastructure/store/slices/{name}Slice.ts` | `src/infrastructure/store/slices/currentUserSlice.ts` | OPTIONAL | camelCase, suffix `Slice` |
| 9 | Module Folder | `src/presentation/ui/modules/{code}_{name}/` | `src/presentation/ui/modules/cmn001000_customer/` | YES | `{moduleCode}_{moduleName}/` |
| 10 | Presentation Container | `src/presentation/ui/modules/{code}_{name}/containers/` | `.../cmn001000_customer/containers/` | YES | Inside module folder |
| 11 | Block Component | `src/presentation/ui/modules/{code}_{name}/blocks/` | `.../cmn001000_customer/blocks/` | YES | Inside module folder |
| 12 | Global Hook | `src/presentation/hooks/use{Name}.ts` | `src/presentation/hooks/usePermission.ts` | OPTIONAL | `use` prefix, camelCase |
| 13 | Shared Hook | `src/presentation/shared/hooks/use{Name}.ts` | `src/presentation/shared/hooks/useDebounce.ts` | OPTIONAL | `use` prefix, camelCase |
| 14 | Provider | `src/presentation/providers/{Name}Provider.tsx` | `src/presentation/providers/AuthProvider.tsx` | OPTIONAL | PascalCase, suffix `Provider` |

---

## Architecture: Dependency Rules

### Layer Dependencies

```
App (composition root) ──→ can import from ALL layers
Presentation ──→ Domain, Core (CANNOT import Infrastructure — use Core DI)
Infrastructure ──→ Domain, Core (CANNOT import Presentation)
Domain ──→ Core ONLY (CANNOT import Presentation, Infrastructure)
Core ──→ NOTHING (leaf layer)
```

| From | Can Import | CANNOT Import |
|------|-----------|---------------|
| App | All layers | — (composition root) |
| Presentation | Domain, Core | Infrastructure, App |
| Infrastructure | Domain, Core | Presentation, App |
| Domain | Core | Presentation, Infrastructure, App |
| Core | — | Any other layer |

**Exception**: Presentation may import store hooks (`useAppDispatch`, `useAppSelector`) from Infrastructure — these are typed wrappers, not raw infrastructure.

### Module Hierarchy (4 Rules)

| # | Rule | Description |
|---|------|-------------|
| R1 | `cmn*` modules are SHARED | Any module can import from `cmn*` modules |
| R2 | `sfa*` modules are ISOLATED | Cannot import from `tnt*`, `ctm*`, or other `sfa*` |
| R3 | `tnt*` modules are ISOLATED | Cannot import from `sfa*`, `ctm*`, or other `tnt*` |
| R4 | `ctm*` modules are ISOLATED | Cannot import from `sfa*`, `tnt*` |

**Allowed/Forbidden Import Table**:

| Source Module | Can Import From | CANNOT Import From |
|--------------|----------------|-------------------|
| `cmn*` | `core/` only | `sfa*`, `tnt*`, `ctm*` (they import cmn, not vice versa) |
| `sfa*` | `cmn*`, `core/` | `tnt*`, `ctm*`, other `sfa*` modules |
| `tnt*` | `cmn*`, `core/` | `sfa*`, `ctm*`, other `tnt*` modules |
| `ctm*` | `cmn*`, `core/` | `sfa*`, `tnt*` |

**Cross-module Communication**:
- State sharing → Redux store ONLY (dispatch action, select state)
- Logic sharing → `core/services/` ONLY (shared utilities)
- FORBIDDEN: Direct import between non-cmn module presentation folders

---

## Architecture: Feature Completeness

> Khi tạo feature mới hoặc thêm vào module có sẵn, PHẢI đảm bảo đủ các file REQUIRED theo DI chain.

### Rule 1: New Feature (new entity + UI module) → PHẢI có

| # | File Type | Layer | Required | DI Chain Order |
|---|-----------|-------|----------|----------------|
| 1 | Entity Interface | Domain | YES | — (data contract) |
| 2 | Repository Interface | Domain | YES | — (dependency contract) |
| 3 | UseCase(s) | Domain | YES | Called by Container |
| 4 | API Client | Infrastructure | YES | Called by Repository Impl |
| 5 | Repository Impl | Infrastructure | YES | Implements Repository Interface |
| 6 | DI Factory | Core | YES | Creates Repository Impl |
| 7 | DI Container | Core | YES | Wires Factory → UseCase → Component |
| 8 | Module Folder | Presentation | YES | `{code}_{name}/` |
| 9 | Container(s) | Presentation | YES | Uses DI Container |
| 10 | Block(s) | Presentation | YES | UI components |

### Rule 2: Add Action to Existing Module → PHẢI có

| # | File | Action | Required |
|---|------|--------|----------|
| 1 | `domain/use-cases/{entity}/{action}{Entity}Usecase.ts` | Thêm usecase function | REQUIRED |
| 2 | `domain/entities/{entity}.ts` | Thêm interface (nếu response shape mới) | CONDITIONAL |
| 3 | `infrastructure/api/{entity}/{entity}Api.ts` | Thêm API method | REQUIRED |
| 4 | `infrastructure/repositories/{entity}RepositoryImpl.ts` | Thêm method implement | REQUIRED |
| 5 | `domain/repositories/{entity}Repository.ts` | Thêm method vào interface | REQUIRED |
| 6 | `core/di/modules/{entity}Container.ts` | Wire usecase mới | REQUIRED |
| 7 | `presentation/ui/modules/{code}_{name}/containers/` | Thêm container gọi usecase | REQUIRED |

### Rule 3: Validation

- Mỗi Repository Interface (domain) PHẢI có đúng 1 RepositoryImpl (infrastructure)
- Mỗi UseCase PHẢI được wire trong DI Container (core/di/modules/)
- Mỗi DI Factory PHẢI tạo RepositoryImpl (không tạo trực tiếp trong container)
- Mỗi UseCase function PHẢI nhận `(repository, ...args)` — repository first
- Mỗi Entity Interface PHẢI dùng I-prefix (`ICustomer`, không phải `Customer`)
- Module folder PHẢI theo format `{code}_{name}/` (ví dụ: `cmn001000_customer/`)

### DI Wiring Order

```
Component → Container → UseCase(repository, ...args) → Repository → API Client → Axios
(presentation)  (core)     (domain)                     (infra)      (infra)      (infra)
```

### Example: Feature "Customer" (new entity + module)

```
REQUIRED (10 files — full DI chain):
  src/domain/entities/customer.ts                              # ICustomer, ICustomerDetail
  src/domain/repositories/customerRepository.ts                # CustomerRepository interface
  src/domain/use-cases/customer/getCustomersUsecase.ts         # getCustomersUsecase(repo, params)
  src/domain/use-cases/customer/getCustomerDetailUsecase.ts    # getCustomerDetailUsecase(repo, id)
  src/infrastructure/api/customer/customerApi.ts               # customerApi.getList(), .getDetail()
  src/infrastructure/repositories/customerRepositoryImpl.ts    # implements CustomerRepository
  src/core/di/factories/customerFactory.ts                     # () => new CustomerRepositoryImpl(customerApi)
  src/core/di/modules/customerContainer.ts                     # wires factory → usecases → component
  src/presentation/ui/modules/cmn001000_customer/containers/   # UI containers
  src/presentation/ui/modules/cmn001000_customer/blocks/       # UI blocks

OPTIONAL:
  src/infrastructure/store/slices/customerSlice.ts             # Chỉ nếu cần global state
  src/presentation/hooks/useCustomer.ts                        # Chỉ nếu cần shared hook
```

### Example: Add "delete" action to existing Customer module

```
REQUIRED:
  src/domain/use-cases/customer/deleteCustomerUsecase.ts       # deleteCustomerUsecase(repo, id)
  src/domain/repositories/customerRepository.ts                # + delete(id) method
  src/infrastructure/api/customer/customerApi.ts               # + customerApi.delete(id)
  src/infrastructure/repositories/customerRepositoryImpl.ts    # + delete(id) implement
  src/core/di/modules/customerContainer.ts                     # + wire deleteCustomerUsecase

KHÔNG CẦN:
  Tạo entity mới                  # Delete dùng ICustomer có sẵn
  Tạo factory mới                 # Factory đã tạo CustomerRepositoryImpl
  Tạo module folder mới           # cmn001000_customer/ đã tồn tại
```

---

## §5 — Known Compromises (Pattern 0.5)

| # | Issue | Location | Impact | Status |
|---|-------|----------|--------|--------|
| 1 | `ultis/` folder typo | `src/core/ultis/` | Both `ultis/` and `utils/` exist | Document only — do not rename (would break imports) |
| 2 | `opporttunity.ts` entity typo | `src/domain/entities/` | Double-t in filename | Document only — would break imports |
| 3 | `no-explicit-any: 'off'` | `eslint.config.mjs` | `any` used broadly in use-cases and containers | Gradually type — not blocking |
| 4 | DI parameter order inconsistency | Use-cases (domain/) | 40% `(param, repo)` vs 60% `(repo, payload)` | Standardize NEW code to `(repository, ...args)`. See 51.x Migration Guide |
| 5 | BaseRepository empty error handling | `src/infrastructure/repositories/base/` | `executeWithErrorHandling` is essentially no-op | See 88.x for details |
| 6 | `Factory` suffix on DI containers | `src/core/di/factories/` | e.g., `getCustomersFactory` looks like factory pattern | Naming convention — document, do not rename |
| 7 | Old data-fetching paths in code | Various | `core/usecases/` → `domain/use-cases/` migration | Corrected in 62.x specialist, old code may exist |

---

## Related Specialists

| Pattern | Specialist | Relationship |
|---------|-----------|-------------|
| 50.x | Clean Architecture | Layer definitions, ESLint rules — this file CONSOLIDATES 50.x |
| 51.x | Frontend DI | DI chain, factory/container wiring, parameter order |
| 52.x | Multi-tenant Routing | App layer routing structure |
| 53.x | Redux Toolkit | Infrastructure store, 4 slices |
| 63.x | Module Organization | 26 module codes, module hierarchy |
| 84.x | Core Layer | 9 core subfolders detail |
| 86.x | Hook Patterns | Global hooks inventory + creation guide |
| 88.x | BaseRepository | Base repository implementation |
