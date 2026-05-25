# Backend Clean Architecture Specialist
# バックエンドクリーンアーキテクチャスペシャリスト
# Chuyen Gia Kien Truc Clean Architecture Backend

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting architecture definition) |
| **Package** | `{rootPackage}.*` (defines ALL packages) |
| **Maven Module** | all modules (defines deployment rules) |
| **Variant** | ALL |
| **Pattern Numbers** | 0.1–0.6 |
| **Source Paths** | `{sourceRoot}/` |
| **File Count** | ~2,100+ across all modules |
| **Naming Convention** | `{DomainPrefix}{EntityType}{EntityName}` (e.g., CmnMCustomer) |
| **Base Class** | N/A (this IS the architecture) |
| **Imports From** | N/A (all specialists follow this architecture) |
| **Cannot Import** | N/A (defines the rules for all layers) |
| **Dependencies** | None (architecture definition) |
| **When To Use** | Defining 4-layer Clean Architecture structure with module codes and layer constraints |
| **Source Skeleton** | N/A (architecture rules applied to all specialists) |
| **Specialist Type** | architecture |
| **Purpose** | Define project-specific 4-layer structure — module codes, file type mappings, layer constraints, Maven modules |
| **Activation Trigger** | phase: /plan, /design; keywords: projectArchitecture, layerStructure, moduleCode, fileMapping |

---

## ROLE

You are a **Backend Clean Architecture Specialist**.

**Your ONLY responsibility**: Define the 4-layer Clean Architecture structure, module code system, layer dependency constraints, file type→path mappings, and Maven module deployment rules for the backend. Every other backend specialist MUST conform to this structure.

---

## SCOPE

### What You Handle

- 4-layer Clean Architecture layout (Domain, Application, Infrastructure, Presentation)
- Module code system (`{prefix}{type}{sequence}`)
- Layer dependency rules (what can import what)
- File type → package path mapping (14 file types)
- Maven module deployment rules (which file goes in which module)
- Cross-module feature scaffolding (complete file set for a new entity)

### What You DON'T Handle

- Specific entity implementation → `java-domain-specialist`
- Service implementation details → `crud-service-base-specialist`
- REST controller patterns → `annotated-reactive-controller-specialist`
- Database access patterns → `java-data-access-specialist`

---

## APPROVED PATTERNS

## Architecture: Folder Tree

| Layer | Package | Maven Module | Contents | File Count |
|-------|---------|-------------|----------|------------|
| **Domain** | `.domain.{moduleCode}` | common | Entities (`@Table`), Callbacks, Enums | ~195 |
| **Application** | `.application.{service,repository}.{moduleCode}` | common | Services, Repos, DTOs, RowMappers, SqlHelpers | ~1,098 |
| **Infrastructure** | `.infrastructure.{web,config,kafka,security,...}` | common | VMs, VM Mappers, Config, Security, Integrations | ~376 |
| **Presentation (REST)** | `.rest.{moduleCode}` | core-manager / sfa-manager | REST Resources (`@RestController`) | ~72 |

**Note**: All layers except Presentation are in the `common` Maven module (shared library). Presentation layer is split across microservice modules based on domain prefix.

---

### Pattern 0.2: Module Code System

```
Format: {prefix}{type}{sequence}

Prefixes:
├── cmn  = Common (shared business entities)
├── sfa  = Sales Force Automation
├── ctm  = Customization (page builder)
└── tnt  = Tenant management

Types (embedded in entity name, not module code):
├── M = Master entity (e.g., CmnMCustomer)
└── T = Transaction entity (e.g., CmnTSchedule)

Sequence: 001000, 002000, ... (6-digit zero-padded)

Examples:
  cmn001000 = Customer module
  cmn002000 = Category module
  sfa002000 = Opportunity module
  ctm001000 = Screen/Page builder module
  tnt001000 = Tenant module
```

**Source**: Verified across 87 entities in `common` module.

---

## Architecture: Dependency Rules

```
         ┌─────────────────────────────────────────────┐
         │              Presentation (REST)             │
         │     .rest.{moduleCode}/*Resource.java        │
         │     Imports: Application, Infrastructure(VM) │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Infrastructure                  │
         │     .infrastructure.{web,config,kafka,...}   │
         │     Imports: Application, Domain             │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Application                     │
         │     .application.{service,repository}        │
         │     Imports: Domain ONLY                     │
         └──────────────┬──────────────────────────────┘
                        │ can import ↓
         ┌──────────────┴──────────────────────────────┐
         │              Domain (innermost)              │
         │     .domain.{moduleCode}                     │
         │     Imports: NOTHING external                │
         └─────────────────────────────────────────────┘
```

**FORBIDDEN DIRECTIONS**:
- Domain → Application, Infrastructure, REST
- Application → Infrastructure, REST
- Infrastructure → REST

**Note**: The one exception is Application layer importing `common.filters.*` (infrastructure package for SearchCriteria filter types like `TextFilter`, `DateFilter`). This is a pragmatic compromise in the current codebase.

---

### Reactive Variant — Known Pragmatic Compromises

> Reactive variant su dung **Pragmatic Layered Architecture**, KHONG phai Clean Architecture chuan.
> Cac compromises duoi day la chap nhan duoc vi Reactive structure da on dinh (60+ specialists, ~2100 files).

| # | Compromise | Ly do chap nhan |
|---|-----------|-----------------|
| 1 | ViewModel (`infrastructure.web.rest.vm`) thuoc presentation concern nhung dat trong infrastructure | Migration 60+ specialists co rui ro lon. Fix trong 47.x cho projects moi |
| 2 | Repository interface + impl nam cung package (`application.repository`) | Spring Data ReactiveCrudRepository la framework-dependent interface. Tach port/impl khong co y nghia vi interface ban than da la Spring |
| 3 | Khong co `usecase/` rieng — ServiceImpl lam ca CRUD lan orchestration | Reactive variant thiet ke cho CRUD-heavy apps. UseCase class them overhead cho 80% code la CRUD don gian |
| 4 | Controller package la `.rest.{moduleCode}` (top-level), khong phai `presentation/controller/` | Maven multi-module: controllers nam trong microservice modules rieng (core-manager, sfa-manager) |

---

## Architecture: File Type Mapping

#### Reactive
| # | File Type | Layer | Package Path | Naming Convention | Base Class |
|---|-----------|-------|-------------|-------------------|-----------|
| 1 | Entity | Domain | `.domain.{moduleCode}` | `{Prefix}{Type}{Entity}.java` | `AbstractAuditingEntity<Long>` + `Persistable<Long>` |
| 2 | Callback | Domain | `.domain.{moduleCode}` | `{Entity}Callback.java` | `BeforeConvertCallback<T>`, `AfterConvertCallback<T>` |
| 3 | Service Interface | Application | `.application.service.{moduleCode}` | `{Entity}Service.java` | `SimpleCrudService<T, DTO, Long>` |
| 4 | Service Impl | Application | `.application.service.{moduleCode}.impl` | `{Entity}ServiceImpl.java` | `SimpleCrudServiceImpl<T, DTO, Long, R, M>` |
| 5 | DTO | Application | `.application.service.dto.{moduleCode}` | `{Entity}DTO.java` | `BaseDTO` |
| 6 | SearchCriteria | Application | `.application.service.dto.{moduleCode}` | `{Entity}SearchCriteria.java` | N/A |
| 7 | Repository Interface | Application | `.application.repository.{moduleCode}` | `{Entity}Repository.java` | `ReactiveCrudRepository<T, Long>` |
| 8 | RepositoryInternal | Application | `.application.repository.{moduleCode}` | `{Entity}RepositoryInternal.java` | N/A |
| 9 | RepositoryInternalImpl | Application | `.application.repository.{moduleCode}` | `{Entity}RepositoryInternalImpl.java` | `SimpleR2dbcRepository<T, Long>` |
| 10 | SqlHelper | Application | `.application.repository.{moduleCode}` | `{Entity}SqlHelper.java` | N/A |
| 11 | RowMapper | Application | `.application.repository.rowmapper.{moduleCode}` | `{Entity}RowMapper.java` | `BiFunction<Row, String, T>` |
| 12 | VM (ViewModel) | Infrastructure | `.infrastructure.web.rest.vm.{moduleCode}` | `{ShortName}VM.java` | N/A |
| 13 | VM Mapper | Infrastructure | `.infrastructure.web.rest.mapper.{moduleCode}` | `{Entity}VMMapper.java` | `EntityMapper<DTO, VM>` |
| 14 | REST Resource | Presentation | `.rest.{moduleCode}` (in microservice) | `{Entity}Resource.java` | N/A (`@RestController`) |

#### Clean-Modulith
| # | File Type | Layer | Package Path | Naming Convention | Base Class |
|---|-----------|-------|-------------|-------------------|-----------|
| 1 | Entity | Domain | `.domain.{moduleCode}` | `{Prefix}{Type}{Entity}.java` | Java `record` with audit fields |
| 2 | Service Interface | Application | `.application.service.{moduleCode}` | `{Entity}Service.java` | `SimpleCrudService<T, DTO, Long>` |
| 3 | Service Impl | Application | `.application.service.{moduleCode}.impl` | `{Entity}ServiceImpl.java` | `SimpleCrudServiceImpl<T, DTO, Long, R, M>` |
| 4 | DTO | Application | `.application.service.dto.{moduleCode}` | `{Entity}DTO.java` | `BaseDTO` |
| 5 | SearchCriteria | Application | `.application.service.dto.{moduleCode}` | `{Entity}SearchCriteria.java` | N/A |
| 6 | Repository Interface | Application | `.application.repository.{moduleCode}` | `{Entity}Repository.java` | `CrudRepository<T, Long>` |
| 7 | Custom Repository | Application | `.application.repository.{moduleCode}` | `{Entity}CustomRepository.java` | N/A (JdbcClient queries) |
| 8 | Mapper | Application | `.application.service.mapper.{moduleCode}` | `{Entity}Mapper.java` | MapStruct `@Mapper` |
| 9 | VM (ViewModel) | Infrastructure | `.infrastructure.web.rest.vm.{moduleCode}` | `{ShortName}VM.java` | N/A |
| 10 | VM Mapper | Infrastructure | `.infrastructure.web.rest.mapper.{moduleCode}` | `{Entity}VMMapper.java` | `EntityMapper<DTO, VM>` |
| 11 | REST Resource | Presentation | `.rest.{moduleCode}` (in microservice) | `{Entity}Resource.java` | N/A (`@RestController`) |

---

### Pattern 0.5: Maven Module Deployment Rules

| File Type | Maven Module | Rationale |
|-----------|-------------|-----------|
| Entity, Callback, Service, Repository, DTO, RowMapper, VM, VM Mapper | `common` | Shared library across all microservices |
| REST Resource (cmn*, ctm*) | `core-manager` | Core business REST endpoints |
| REST Resource (sfa*) | `sfa-manager` | SFA-specific REST endpoints |
| REST Resource (tnt*) | `tenant-manager` | Tenant management endpoints |
| Configurations, Security | `common` (shared), `gateway` (gateway-specific) | Infrastructure config |
| Batch Jobs | `batch-core`, `batch-tenant`, `batch-workflow` | Batch processing modules |

---

### Pattern 0.6: Cross-Module Feature Complete Example

Full file set for adding a new `cmn020000` (Example) entity:

```
backend/common/src/main/java/{rootPackage.path}/{app-prefix}/
├── domain/cmn020000/
│   ├── CmnMExample.java                           # Entity
│   └── CmnMExampleCallback.java                   # R2DBC Callback
├── application/
│   ├── service/cmn020000/
│   │   ├── CmnMExampleService.java                # Service Interface
│   │   └── impl/CmnMExampleServiceImpl.java       # Service Impl
│   ├── service/dto/cmn020000/
│   │   ├── CmnMExampleDTO.java                    # DTO
│   │   └── ExampleSearchCriteria.java             # Search Criteria
│   ├── service/mapper/cmn020000/
│   │   └── CmnMExampleMapper.java                 # Entity↔DTO Mapper
│   └── repository/cmn020000/
│       ├── CmnMExampleRepository.java             # Repository Interface
│       ├── CmnMExampleRepositoryInternal.java     # Internal Interface
│       ├── CmnMExampleRepositoryInternalImpl.java # Internal Impl
│       └── CmnMExampleSqlHelper.java              # SQL Helper
├── application/repository/rowmapper/cmn020000/
│   └── CmnMExampleRowMapper.java                  # RowMapper
└── infrastructure/web/rest/
    ├── vm/cmn020000/
    │   ├── ExampleVM.java                          # ViewModel
    │   ├── ExampleDetailVM.java                    # Detail VM
    │   └── CreateExampleVM.java                    # Create Request VM
    └── mapper/cmn020000/
        └── CmnMExampleVMMapper.java               # DTO↔VM Mapper

backend/core-manager/src/main/java/{rootPackage.path}/{app-prefix}/
└── rest/cmn020000/
    └── CmnMExampleResource.java                    # REST Controller
```

**Note**: A single entity generates 15+ files across 4 layers. Use EPS code generation (NOT JHipster CLI) to scaffold these files.

---

### Pattern 0.7: Clean-Modulith — Complete Folder Tree (4-Layer)

> Ap dung cho **Clean-Modulith variant ONLY**. Reactive variant xem Pattern 0.4 Reactive table.

#### Layer Definition

| Layer | Top-level Package | Dependency Rule |
|-------|-------------------|----------------|
| **Domain** | `{rootPackage}.domain` | Imports: NOTHING (only JDK) |
| **Application** | `{rootPackage}.application` | Imports: domain ONLY |
| **Infrastructure** | `{rootPackage}.infrastructure` | Imports: application, domain |
| **Presentation** | `{rootPackage}.presentation` | Imports: application, domain (KHONG import infrastructure) |

#### Complete File Type Table (18 types)

| # | File Type | Layer | Package Path | Naming Convention | Required? |
|---|-----------|-------|-------------|-------------------|-----------|
| 1 | Entity | Domain | `.domain.model` | `{Entity}.java` | REQUIRED per entity |
| 2 | Value Object | Domain | `.domain.valueobject` | `{Concept}.java` | OPTIONAL |
| 3 | Domain Event | Domain | `.domain.event` | `{Entity}{Action}Event.java` | OPTIONAL |
| 4 | Domain Service | Domain | `.domain.service` | `{Concept}DomainService.java` | OPTIONAL |
| 5 | Domain Exception | Domain | `.domain.exception` | `{Entity}NotFoundException.java` | REQUIRED per entity |
| 6 | UseCase | Application | `.application.usecase.{feature}` | `{Feature}UseCase.java` | REQUIRED per feature |
| 7 | Command/Query | Application | `.application.usecase.{feature}` | `{Feature}Command.java` | OPTIONAL |
| 8 | Output Port (interface) | Application | `.application.port` | `{Entity}Gateway.java` | REQUIRED per external dep |
| 9 | Application DTO | Application | `.application.dto` | `{Feature}Result.java` | OPTIONAL |
| 10 | Application Exception | Application | `.application.exception` | `{Feature}Exception.java` | OPTIONAL |
| 11 | Adapter Impl (JDBC) | Infrastructure | `.infrastructure.adapter` | `{Entity}JdbcGateway.java` | REQUIRED per port |
| 12 | Adapter Impl (REST) | Infrastructure | `.infrastructure.adapter` | `{System}RestGateway.java` | REQUIRED per port |
| 13 | Spring Data Repository | Infrastructure | `.infrastructure.persistence` | `{Entity}CrudRepository.java` | REQUIRED per entity |
| 14 | Messaging | Infrastructure | `.infrastructure.messaging` | `{Topic}Producer.java` | OPTIONAL |
| 15 | Config | Infrastructure | `.infrastructure.config` | `{Feature}Config.java` | AS NEEDED |
| 16 | Controller | Presentation | `.presentation.controller.{feature}` | `{Feature}Controller.java` | REQUIRED per feature |
| 17 | Request DTO | Presentation | `.presentation.dto.{feature}` | `{Feature}Request.java` | REQUIRED per controller |
| 18 | Response DTO | Presentation | `.presentation.dto.{feature}` | `{Feature}Response.java` | REQUIRED per controller |

#### Dependency Rules (Sub-folder Level)

```
domain/model      → domain/valueobject, domain/exception
domain/event      → domain/model
domain/service    → domain/model, domain/valueobject
domain/exception  → NOTHING

application/usecase → domain/*, application/port
application/port    → domain/model (param/return types only)
application/dto     → NOTHING (pure data)

infrastructure/adapter      → application/port, domain/model, infrastructure/persistence
infrastructure/persistence  → domain/model
infrastructure/messaging    → domain/event
infrastructure/config       → NOTHING (Spring config only)

presentation/controller → application/usecase, presentation/dto
presentation/dto        → NOTHING (pure data)

FORBIDDEN:
  domain → application, infrastructure, presentation
  application → infrastructure, presentation
  presentation → infrastructure
  infrastructure → presentation
```

---

## Architecture: Feature Completeness

> Khi tao 1 feature, PHAI dam bao du cac file REQUIRED. File OPTIONAL chi tao khi can.

#### Rule 1: Entity → PHAI co

| File | Layer | Required? |
|------|-------|-----------|
| Entity | domain/model | REQUIRED |
| DomainException | domain/exception | REQUIRED |
| Output Port (Gateway interface) | application/port | REQUIRED |
| Adapter Impl | infrastructure/adapter | REQUIRED (1 per port) |
| Spring Data Repository | infrastructure/persistence | REQUIRED |

#### Rule 2: Feature (business flow) → PHAI co

| File | Layer | Required? |
|------|-------|-----------|
| UseCase | application/usecase/{feature} | REQUIRED |
| Controller | presentation/controller/{feature} | REQUIRED |
| Request DTO | presentation/dto/{feature} | REQUIRED |
| Response DTO | presentation/dto/{feature} | REQUIRED |

#### Rule 3: Validation

- Moi Output Port (interface) PHAI co it nhat 1 Adapter Impl
- Moi UseCase PHAI co it nhat 1 Controller goi no
- Moi Controller PHAI co Request + Response DTO
- Moi Entity PHAI co 1 Output Port (cho persistence)

#### Example: Feature "Ingest"

```
REQUIRED:
  domain/model/ApiCallLedger.java
  domain/exception/LedgerNotFoundException.java
  application/usecase/ingest/IngestUseCase.java
  application/port/LedgerGateway.java
  application/port/TargetSystemGateway.java
  infrastructure/adapter/LedgerJdbcGateway.java      (implements LedgerGateway)
  infrastructure/adapter/BravoRestGateway.java        (implements TargetSystemGateway)
  infrastructure/persistence/LedgerCrudRepository.java
  presentation/controller/ingest/IngestController.java
  presentation/dto/ingest/IngestRequest.java
  presentation/dto/ingest/IngestResponse.java

OPTIONAL (tao khi can):
  domain/event/LedgerCreatedEvent.java
  domain/valueobject/TransactionId.java
  application/usecase/ingest/IngestCommand.java
  infrastructure/messaging/EventExternalizationConfig.java
  infrastructure/config/RestClientConfig.java
```

---

### Pattern 0.9: Clean-Modulith Cross-Module Example

Full file set cho feature "Ingest" trong Clean-Modulith variant:

```
backbone/src/main/java/{rootPackage.path}/
├── domain/
│   ├── model/
│   │   └── ApiCallLedger.java                    # Entity (record)
│   ├── event/
│   │   └── LedgerCreatedEvent.java               # @Externalized domain event
│   ├── service/
│   │   └── TierClassificationService.java        # Cross-entity domain logic
│   └── exception/
│       └── LedgerNotFoundException.java           # Domain exception
│
├── application/
│   ├── usecase/
│   │   └── ingest/
│   │       ├── IngestUseCase.java                 # Orchestration (@Service, @Transactional)
│   │       └── IngestCommand.java                 # Input command (record)
│   └── port/
│       ├── LedgerGateway.java                     # Output port — data access contract
│       ├── TargetSystemGateway.java               # Output port — external system contract
│       └── DlqGateway.java                        # Output port — dead letter queue
│
├── infrastructure/
│   ├── adapter/
│   │   ├── LedgerJdbcGateway.java                 # implements LedgerGateway
│   │   ├── BravoRestGateway.java                  # implements TargetSystemGateway
│   │   ├── MesRestGateway.java                    # implements TargetSystemGateway
│   │   └── BravoTokenProvider.java                # Auth helper
│   ├── persistence/
│   │   └── LedgerCrudRepository.java              # Spring Data JDBC
│   ├── kafka/
│   │   └── EventExternalizationConfig.java        # Spring Modulith event externalization
│   └── config/
│       └── RestClientConfig.java                  # Per-system RestClient beans
│
├── presentation/
│   ├── controller/
│   │   └── ingest/
│   │       └── IngestController.java              # REST entry point
│   └── dto/
│       └── ingest/
│           ├── IngestRequest.java                 # API input
│           └── IngestResponse.java                # API output
│
└── BackboneApplication.java
```

**Note**: Clean-Modulith feature generates ~15 files across 4 layers. UseCase + Port + Adapter la CORE — khong duoc bo qua.

---

## REJECTED PATTERNS

### Rejected 1: Putting REST Resources in common Module

```java
// WRONG: REST controllers belong in microservice modules, NOT common
package {rootPackage}.rest.{moduleCode}; // in common module
@RestController
public class XxxResource { ... }
```

**Fix**: Place REST Resources in `core-manager` (for cmn/ctm), `sfa-manager` (for sfa), or `tenant-manager` (for tnt).

### Rejected 2: Domain Layer Importing Application Layer

```java
// WRONG: Domain must NOT import from Application
package {rootPackage}.domain.{moduleCode};
import {rootPackage}.application.service.dto.{moduleCode}.XxxDTO; // FORBIDDEN
```

**Fix**: Domain entities are self-contained. DTOs belong in Application layer. Use mappers to convert between layers.

### Rejected 3: Skipping the DTO/VM Separation

#### Reactive
```java
// WRONG: Returning entity directly from REST controller
@GetMapping("/{id}")
public Mono<ResponseEntity<CmnMCustomer>> getById(@PathVariable Long id) {
    return repository.findById(id).map(ResponseEntity::ok); // Exposes domain to API
}
```

#### Clean-Modulith / Standard
```java
// WRONG: Returning entity directly from REST controller
@GetMapping("/{id}")
public ResponseEntity<CmnMCustomer> getById(@PathVariable Long id) {
    return repository.findById(id)
        .map(ResponseEntity::ok)
        .orElseThrow(() -> new EntityNotFoundException("Customer", id));
}
```

**Fix**: Entity → DTO (Application mapper) → VM (Infrastructure mapper) → REST response. This ensures API contract stability even when domain model changes.

---

## DECISION TREE

```
Architecture question?
├─ Where does this file go?
│   → Pattern 0.4 (File Type → Path Mapping table)
├─ Which Maven module?
│   → Pattern 0.5 (Deployment Rules)
├─ Can layer X import layer Y?
│   → Pattern 0.3 (Layer Dependency Rules)
├─ What's the module code format?
│   → Pattern 0.2 (Module Code System)
├─ How to scaffold a new entity?
│   → Pattern 0.6 (Cross-Module Example)
├─ What's the overall architecture?
│   → Pattern 0.1 (4-Layer Overview)
└─ Specific file type patterns?
    ├─ Entity → java-domain-specialist (1.x)
    ├─ Service → crud-service-base-specialist (45.x)
    ├─ Controller → annotated-reactive-controller-specialist (42.x)
    ├─ Repository → java-data-access-specialist (17.x)
    ├─ RowMapper → r2dbc-rowmapper-specialist (46.x)
    └─ VM → viewmodel-specialist (47.x)
```

---

## KEYWORDS

- clean architecture
- layer structure
- module code
- package path
- file placement
- maven module
- layer dependency
- domain layer
- application layer
- infrastructure layer
- presentation layer
- entity scaffolding
- cross-cutting architecture

---

## Related Specialists

- `domain/java-domain-specialist.md` — Entity patterns (Domain layer)
- `domain/java-dto-specialist.md` — DTO patterns (Application layer)
- `patterns/crud-service-base-specialist.md` — Service base class patterns
- `patterns/annotated-reactive-controller-specialist.md` — REST controller patterns
- `patterns/viewmodel-specialist.md` — VM + VM Mapper patterns
- `data-access/r2dbc-rowmapper-specialist.md` — RowMapper patterns
- `patterns/search-criteria-specialist.md` — SearchCriteria patterns
