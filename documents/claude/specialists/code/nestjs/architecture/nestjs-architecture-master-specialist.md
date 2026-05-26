# NestJS Architecture Master Specialist
# NestJS アーキテクチャマスタースペシャリスト
# Chuyen Gia Kien Truc Tong The NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Clean Architecture
**Aspect**: Architecture Master
**Category**: architecture
**Purpose**: Define NestJS Clean Architecture structure — monorepo layout, per-service 4-layer structure, file type mappings, dependency rules, feature completeness rules

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting architecture definition) |
| **Variant** | ALL |
| **Pattern Numbers** | 0.1–0.6 |
| **Directory Pattern** | N/A (defines paths for all specialists) |
| **Naming Convention** | Defined per file type in Pattern 0.3 |
| **Imports From** | N/A (all specialists follow this architecture) |
| **Imported By** | ALL (every specialist references this for layer rules) |
| **Cannot Import** | N/A (defines the rules for all layers) |
| **Dependencies** | None (architecture definition) |
| **When To Use** | Defining 4-layer Clean Architecture structure, layer constraints, file placement |
| **Source Skeleton** | N/A (architecture rules applied to all specialists) |
| **Specialist Type** | architecture |
| **Purpose** | Define NestJS Clean Architecture structure — monorepo layout, per-service 4-layer structure, file type mappings, dependency rules, feature completeness rules |
| **Activation Trigger** | phase: /plan, /design; keywords: projectArchitecture, layerStructure, serviceRegistry, folderTree |

---

## SCOPE

### What You Handle

- 4-layer Clean Architecture layout (Domain, Application, Infrastructure, Presentation)
- Monorepo system-level structure (apps/, libs/, docker, config)
- Per-service folder tree with BFF lighter variant
- File type → path mapping (36 file types)
- Layer dependency rules (what can import what)
- Feature completeness rules (minimum file set per feature)
- Service registry (p2plend 12 services — supplementary reference)

### What You DON'T Handle

- Clean Architecture implementation patterns → `nestjs-clean-architecture-specialist` (260.x)
- Specific entity/domain patterns → `nestjs-lending-domain-specialist` (217.x) etc.
- Testing patterns → `nestjs-testing-unit-integration-specialist` (211.x)
- DevOps/deployment → `nestjs-kubernetes-specialist` (243.x)

---

## APPROVED PATTERNS

## Architecture: Folder Tree

### Pattern 0.1: System-Level Monorepo

```
{project-root}/
├── apps/
│   ├── {service-name}/           # Microservice (full 4-layer Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   ├── shared/           # Cross-cutting within service (optional)
│   │   │   ├── {feature}/
│   │   │   │   └── {feature}.module.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/                 # E2E tests (*.e2e-spec.ts)
│   │   ├── Dockerfile
│   │   └── tsconfig.app.json
│   │
│   └── {bff-name}/              # BFF service (lighter — no domain layer)
│       └── src/
│           ├── application/      # Aggregation use cases
│           ├── infrastructure/   # Upstream service clients
│           ├── presentation/     # Controllers (API composition)
│           └── main.ts
│
├── libs/
│   └── shared/                   # Cross-service shared code
│       ├── domain/               # Shared domain primitives (BaseDomainEntity, ValueObject)
│       ├── dto/                  # Shared DTOs (PaginatedResult, ErrorResponse)
│       ├── decorators/           # Shared custom decorators
│       ├── filters/              # Shared exception filters
│       ├── guards/               # Shared auth guards
│       ├── interceptors/         # Shared interceptors (logging, correlation-id)
│       └── constants/            # Shared constants and enums
│
├── docker/                       # Docker Compose files
│   ├── docker-compose.yml        # Development stack
│   └── docker-compose.test.yml   # Test containers
│
├── k8s/                          # Kubernetes manifests (optional)
│   └── {service-name}/
│
├── nx.json                       # Nx monorepo config (if using Nx)
├── package.json                  # Root package.json
├── tsconfig.base.json            # Shared TS config
└── .env.example                  # Environment template
```

### Pattern 0.2: Per-Service Folder Tree (Full 4-Layer)

```
src/
├── domain/                       # Layer 1: Enterprise Business Rules (pure TypeScript)
│   ├── {feature}/
│   │   ├── entities/             # Domain entities (NO decorators)
│   │   └── value-objects/        # Value objects (Money, Email, etc.)
│   ├── ports/                    # Repository/service interfaces + Symbol tokens
│   ├── exceptions/               # Domain exceptions (NO HttpException)
│   └── events/                   # Domain event classes
│
├── application/                  # Layer 2: Application Business Rules
│   ├── {feature}/
│   │   ├── {action}.use-case.ts  # Use case (one class per business operation)
│   │   └── {entity}.mapper.ts    # Domain ↔ ORM mappers
│   ├── dto/                      # Input/Output DTOs (class-validator)
│   ├── commands/                 # CQRS commands (if using @nestjs/cqrs)
│   ├── queries/                  # CQRS queries
│   ├── events/                   # Application event handlers
│   ├── listeners/                # Event listeners
│   ├── sagas/                    # Process managers / saga orchestration
│   ├── services/                 # Application services (orchestration)
│   └── workflows/                # Business process workflows (276.x)
│       └── {process}/
│           ├── {process}.workflow.ts
│           └── steps/
│
├── infrastructure/               # Layer 3: Interface Adapters
│   ├── persistence/              # TypeORM/Prisma repositories
│   │   ├── entities/             # ORM entities (≠ domain entities, HAS decorators)
│   │   ├── migrations/           # Database migrations ({timestamp}-{name}.ts)
│   │   └── {entity}.repository.ts
│   ├── database/                 # Database module, data-source config
│   ├── http/                     # HTTP clients for external services
│   ├── grpc/                     # gRPC clients + controllers
│   ├── messaging/                # RabbitMQ, Kafka producers/consumers
│   ├── external/                 # Third-party API adapters
│   ├── auth/                     # Auth strategies (JWT, OAuth2, OIDC)
│   ├── cache/                    # Redis adapters
│   ├── config/                   # Configuration modules
│   ├── search/                   # Elasticsearch services
│   ├── scheduling/               # Cron jobs, Bull queue processors
│   ├── observability/            # Health checks, metrics, tracing
│   ├── resilience/               # Circuit breaker, retry policies
│   ├── blockchain/               # Hyperledger Fabric SDK (if used)
│   ├── logging/                  # Logger module, correlation-id
│   ├── file-storage/             # File upload/storage adapters
│   ├── ai/                       # LLM client adapters
│   ├── analytics/                # Analytics export, report service client
│   ├── audit/                    # Audit trail persistence
│   ├── feature-flags/            # Feature flag SDK adapters
│   └── security/                 # OWASP hardening, Keycloak client
│
├── presentation/                 # Layer 4: Frameworks & Drivers
│   ├── controllers/              # HTTP controllers (@Controller)
│   ├── resolvers/                # GraphQL resolvers (@Resolver)
│   ├── gateways/                 # WebSocket gateways (@WebSocketGateway)
│   ├── guards/                   # Auth guards (@CanActivate)
│   ├── interceptors/             # HTTP interceptors (@NestInterceptor)
│   ├── filters/                  # Exception filters (@Catch)
│   ├── pipes/                    # Validation pipes (@PipeTransform)
│   ├── middleware/               # HTTP middleware
│   └── health/                   # Health check controllers
│
├── shared/                       # Cross-cutting within service (optional)
│   ├── base/                     # Base entity, CRUD service
│   ├── decorators/               # Custom decorators
│   └── pagination/               # Paginated result DTO
│
├── {feature}/
│   └── {feature}.module.ts       # Feature module (wires all layers)
├── app.module.ts                 # Root module
└── main.ts                       # Bootstrap
```

**Tests** (co-located):
- Unit tests: `src/**/*.spec.ts` (next to source file)
- E2E tests: `test/**/*.e2e-spec.ts` (separate directory)

---

## Architecture: File Type Mapping

### Pattern 0.3: File Type → Path Mapping (36 types)

| # | File Type | Layer | Path | Naming Convention | Required? | Specialist Ref |
|---|-----------|-------|------|-------------------|-----------|----------------|
| 1 | Domain Entity | Domain | `domain/{feature}/entities/{entity}.entity.ts` | `{Entity}` (pure TS, NO decorators) | REQUIRED | 217–222 |
| 2 | Value Object | Domain | `domain/{feature}/value-objects/{name}.vo.ts` | `{Name}` (immutable) | OPTIONAL | 217–222 |
| 3 | Port Interface | Domain | `domain/ports/{name}.port.ts` | `{Name}Port` (interface + Symbol) | REQUIRED | 260.2 |
| 4 | Domain Exception | Domain | `domain/exceptions/{name}.exception.ts` | `{Name}Exception` | OPTIONAL | 260.3 |
| 5 | Domain Event | Domain | `domain/events/{entity}-{action}.event.ts` | `{Entity}{Action}Event` | OPTIONAL | 227.x |
| 6 | Use Case | Application | `application/{feature}/{action}-{entity}.use-case.ts` | `{Action}{Entity}UseCase` with `execute()` | REQUIRED | 270–272 |
| 7 | DTO | Application | `application/dto/{action}-{entity}.dto.ts` | `{Action}{Entity}Dto` (class-validator) | REQUIRED | 206.x |
| 8 | Mapper | Application | `application/{feature}/{entity}.mapper.ts` | `{Entity}Mapper` | REQUIRED | 271.x |
| 9 | Application Event | Application | `application/events/{entity}-{action}.event.ts` | `{Entity}{Action}Event` | OPTIONAL | 227.x |
| 10 | Event Listener | Application | `application/listeners/{entity}-{action}.listener.ts` | `{Entity}{Action}Listener` | OPTIONAL | 241.x |
| 11 | CQRS Command | Application | `application/commands/{action}.command.ts` | `{Action}Command` | OPTIONAL | 250.x |
| 12 | CQRS Query | Application | `application/queries/{action}.query.ts` | `{Action}Query` | OPTIONAL | 250.x |
| 13 | Workflow | Application | `application/workflows/{process}/{process}.workflow.ts` | `{Process}Workflow` | OPTIONAL | 276.x |
| 14 | Application Service | Application | `application/services/{entity}.service.ts` | `{Entity}Service` | OPTIONAL | 270.x |
| 15 | TypeORM Entity | Infrastructure | `infrastructure/persistence/entities/{entity}.entity.ts` | `{Entity}Entity` (@Entity) | REQUIRED | 209.x |
| 16 | Repository Impl | Infrastructure | `infrastructure/persistence/{entity}.repository.ts` | `TypeOrm{Entity}Repository` implements Port | REQUIRED | 209.x |
| 17 | Migration | Infrastructure | `infrastructure/persistence/migrations/{timestamp}-{name}.ts` | timestamp prefix | OPTIONAL | 229.x |
| 18 | HTTP Client | Infrastructure | `infrastructure/http/{service}.client.ts` | `{Service}Client` | OPTIONAL | 266.x |
| 19 | External Adapter | Infrastructure | `infrastructure/external/{provider}.adapter.ts` | `{Provider}Adapter` | OPTIONAL | 266.x |
| 20 | gRPC Client | Infrastructure | `infrastructure/grpc/{service}.grpc-client.ts` | `{Service}GrpcClient` | OPTIONAL | 210.x |
| 21 | Cache Service | Infrastructure | `infrastructure/cache/{concern}.cache.ts` | `{Concern}Cache` | OPTIONAL | 212.x |
| 22 | Auth Strategy | Infrastructure | `infrastructure/auth/{strategy}.strategy.ts` | `{Strategy}Strategy` | OPTIONAL | 213.x |
| 23 | Database Config | Infrastructure | `infrastructure/database/database.module.ts` | `DatabaseModule` | REQUIRED | 225.x |
| 24 | Search Service | Infrastructure | `infrastructure/search/{entity}-search.service.ts` | `{Entity}SearchService` | OPTIONAL | 257.x |
| 25 | Scheduler | Infrastructure | `infrastructure/scheduling/{job}.scheduler.ts` | `{Job}Scheduler` | OPTIONAL | 256.x |
| 26 | Queue Processor | Infrastructure | `infrastructure/scheduling/{queue}.processor.ts` | `{Queue}Processor` | OPTIONAL | 256.x |
| 27 | Config Module | Infrastructure | `infrastructure/config/{name}.config.ts` | `{name}Config` | OPTIONAL | 204.x |
| 28 | Controller | Presentation | `presentation/controllers/{entity}.controller.ts` | `{Entity}Controller` | REQUIRED | 205.x |
| 29 | GraphQL Resolver | Presentation | `presentation/resolvers/{entity}.resolver.ts` | `{Entity}Resolver` | OPTIONAL | 273.x |
| 30 | WebSocket Gateway | Presentation | `presentation/gateways/{feature}.gateway.ts` | `{Feature}Gateway` | OPTIONAL | 275.x |
| 31 | Guard | Presentation | `presentation/guards/{strategy}.guard.ts` | `{Strategy}Guard` | OPTIONAL | 213.x |
| 32 | Interceptor | Presentation | `presentation/interceptors/{name}.interceptor.ts` | `{Name}Interceptor` | OPTIONAL | 207.x |
| 33 | Pipe | Presentation | `presentation/pipes/{name}.pipe.ts` | `{Name}Pipe` | OPTIONAL | 206.x |
| 34 | Exception Filter | Presentation | `presentation/filters/{name}.filter.ts` | `{Name}Filter` | OPTIONAL | 203.x |
| 35 | Feature Module | Per-feature | `{feature}/{feature}.module.ts` | `{Feature}Module` | REQUIRED | 201.x |
| 36 | Health Controller | Presentation | `presentation/health/health.controller.ts` | `HealthController` | OPTIONAL | 259.x |

**Test files** (not in layer system):
- Unit: `src/**/*.spec.ts` (co-located) — 211.x
- E2E: `test/**/*.e2e-spec.ts` (separate) — 265.x

---

## Architecture: Dependency Rules

### Pattern 0.4: Layer Import Rules (STRICT — inward only)

```
         ┌─────────────────────────────────────────────┐
         │              Presentation                    │
         │     controllers/, guards/, pipes/, etc.      │
         │     Imports: Application (use cases)         │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Infrastructure                  │
         │     persistence/, messaging/, external/      │
         │     Imports: Domain (implements ports)       │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Application                     │
         │     use-cases/, dto/, mappers/, services/    │
         │     Imports: Domain ONLY                     │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Domain (innermost)              │
         │     entities/, ports/, exceptions/, events/  │
         │     Imports: NOTHING external                │
         └─────────────────────────────────────────────┘
```

**FORBIDDEN directions**:
- Domain → Application, Infrastructure, Presentation
- Application → Infrastructure, Presentation
- Infrastructure → Presentation

**Port/Adapter wiring**:
```
Domain defines port:       domain/ports/{name}.port.ts (interface + Symbol token)
Infrastructure implements: infrastructure/persistence/{name}.repository.ts
Module wires:              { provide: TOKEN, useClass: Implementation }
```

### Layer Import Table

| From \ To | Domain | Application | Infrastructure | Presentation |
|-----------|--------|-------------|---------------|-------------|
| **Domain** | Self | No | No | No |
| **Application** | Yes | Self | No | No |
| **Infrastructure** | Yes (implements) | Yes (for DI) | Self | No |
| **Presentation** | No | Yes | No | Self |

### Module Boundary Rules

```
Feature module exports:    Ports (interfaces) ONLY — NOT use cases
Feature module imports:    TypeOrmModule.forFeature() — scoped per module
Shared module:             @Global() only for cross-cutting (config, logging)
Circular dependency:       FORBIDDEN — use forwardRef() only when unavoidable
```

### DI Convention (D3 — Innovate Decision)

```
Parameter order: Ports/Repositories FIRST → Adapters/Services → Framework services → Logger LAST

UseCase naming:
  File:  {action}-{entity}.use-case.ts        (kebab-case)
  Class: {Action}{Entity}UseCase               (PascalCase)
  Method: execute(input): Promise<Output>

DTO naming:
  Request:  {action}-{entity}.request.dto.ts   → {Action}{Entity}RequestDto
  Response: {action}-{entity}.response.dto.ts  → {Action}{Entity}ResponseDto
```

---

## Architecture: Feature Completeness

### Pattern 0.5: Feature Completeness Rules

> When creating a new feature or adding an action, MUST ensure minimum files per Clean Architecture + NestJS Module pattern.

#### Rule 1: New Feature (new domain entity + full stack) → MUST have

| # | File | Layer | Required? | DI Chain |
|---|------|-------|-----------|----------|
| 1 | `domain/{feature}/entities/{entity}.entity.ts` | Domain | REQUIRED | Pure TS, factory method |
| 2 | `domain/ports/{entity}-repository.port.ts` | Domain | REQUIRED | Interface + Symbol token |
| 3 | `application/{feature}/create-{entity}.use-case.ts` | Application | REQUIRED | @Inject(TOKEN) |
| 4 | `application/{feature}/find-{entity}.use-case.ts` | Application | REQUIRED | @Inject(TOKEN) |
| 5 | `application/dto/create-{entity}.dto.ts` | Application | REQUIRED | class-validator |
| 6 | `application/{feature}/{entity}.mapper.ts` | Application | REQUIRED | Domain ↔ ORM |
| 7 | `infrastructure/persistence/entities/{entity}.entity.ts` | Infrastructure | REQUIRED | @Entity() TypeORM |
| 8 | `infrastructure/persistence/{entity}.repository.ts` | Infrastructure | REQUIRED | implements Port |
| 9 | `presentation/controllers/{entity}.controller.ts` | Presentation | REQUIRED | Inject use cases |
| 10 | `{feature}/{feature}.module.ts` | Module | REQUIRED | Wire all providers |

#### Rule 2: Add Action to Existing Feature → MUST have

| # | File | Action | Required? |
|---|------|--------|-----------|
| 1 | `application/{feature}/{action}-{entity}.use-case.ts` | New use case | REQUIRED |
| 2 | `application/dto/{action}-{entity}.dto.ts` | New DTO | REQUIRED |
| 3 | `domain/ports/{entity}-repository.port.ts` | Add method to interface | CONDITIONAL |
| 4 | `infrastructure/persistence/{entity}.repository.ts` | Implement new method | CONDITIONAL |
| 5 | `presentation/controllers/{entity}.controller.ts` | Add endpoint | REQUIRED |
| 6 | `{feature}/{feature}.module.ts` | Register new use case | REQUIRED |

#### Rule 3: Validation

- Every Port interface (domain) MUST have exactly 1 Repository implementation (infrastructure)
- Every Use Case MUST be registered in Feature Module providers
- Every Controller endpoint MUST delegate to Use Case (thin controller — validate + delegate + return)
- Domain entities MUST be pure TypeScript — NO `@Entity()`, `@Injectable()`, `HttpException`
- ORM entities (infrastructure) ≠ Domain entities (domain) — Mapper converts between them
- Module exports PORTS only — NOT Use Cases
- DI wiring: `{ provide: SYMBOL_TOKEN, useClass: Implementation }` — always use Symbol, not string

---

### Pattern 0.6: Service Registry (p2plend reference — supplementary)

> Non-parsed supplementary reference. 12 microservices for p2plend P2P Insurance-First Lending platform.

| # | Service | Port | Database | Transport | Domain |
|---|---------|------|----------|-----------|--------|
| 1 | user-service | 3001 | PostgreSQL | HTTP/gRPC | User management, KYC |
| 2 | loan-service | 3002 | PostgreSQL | HTTP/gRPC | Loan lifecycle, disbursement |
| 3 | risk-service | 3003 | PostgreSQL | gRPC | Credit scoring, risk assessment |
| 4 | insurance-service | 3004 | PostgreSQL | HTTP/gRPC | Policy management, claims |
| 5 | payment-service | 3005 | PostgreSQL | HTTP/Kafka | Payment processing, settlements |
| 6 | notification-service | 3006 | MongoDB | Kafka | Email, SMS, push notifications |
| 7 | document-service | 3007 | S3 + PostgreSQL | HTTP | Document upload, verification |
| 8 | reporting-service | 3008 | TimescaleDB | HTTP | Analytics, regulatory reports |
| 9 | blockchain-service | 3009 | Fabric Ledger | gRPC | Smart contracts, stablecoin |
| 10 | gateway-service | 3000 | Redis (cache) | HTTP | API gateway, rate limiting |
| 11 | auth-service | 3010 | Keycloak | HTTP | OAuth2/OIDC, SSO |
| 12 | scheduler-service | 3011 | Redis (Bull) | Kafka | Cron jobs, async processing |

---

## REJECTED PATTERNS (Anti-Patterns)

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | `@Entity()` on domain entity | Couples domain to ORM framework | Separate domain entity (pure TS) + ORM entity (infrastructure) |
| 2 | Controller with business logic | Violates thin controller principle | Move logic to Use Case |
| 3 | Use Case imports `@Req()` | Application layer depends on HTTP framework | Extract data in controller, pass DTO to use case |
| 4 | Repository returns ORM entity | Leaks infrastructure to application | Mapper converts ORM → Domain in repository |
| 5 | Circular module dependency | Breaks dependency direction | Use domain events or shared interface module |
| 6 | String DI token `'ORDER_REPO'` | Type-unsafe, collision-prone | Use Symbol: `Symbol('ORDER_REPOSITORY')` |
| 7 | Module exports Use Cases | Breaks encapsulation | Export Ports (interfaces) only |

---

## Quality Checklist

- [ ] **Q1**: All 4 `## Architecture:` headings present?
- [ ] **Q2**: File Type Mapping covers all 36 types?
- [ ] **Q3**: Dependency Rules diagram + import table consistent?
- [ ] **Q4**: Feature Completeness rules have examples?

---

*NestJS Architecture Master Specialist — Pattern 0.x | EPS v10.0*
*Authoritative source for layer boundaries per SPEC-INTEGRATION.md §4*
