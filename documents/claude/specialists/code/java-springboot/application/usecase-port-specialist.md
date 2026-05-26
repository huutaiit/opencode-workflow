# UseCase & Port Specialist
# ユースケース＆ポートスペシャリスト
# Chuyên Gia UseCase & Port

**Stack**: Java 21/25 LTS + Spring Boot 3.4.x | **Variant**: Clean-Modulith (Blocking + Virtual Threads)

> ⚠️ **VARIANT WARNING**: This specialist is for the **Clean-Modulith (Blocking)** variant.
> For Reactive services, see: `patterns/crud-service-base-specialist.md` (45.x).

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.usecase.{feature}`, `{rootPackage}.application.port` |
| **Maven Module** | backbone |
| **Variant** | Clean-Modulith (Blocking + VT) |
| **Pattern Numbers** | 54.1–54.4 |
| **Source Paths** | `{sourceRoot}/application/usecase/`, `{sourceRoot}/application/port/` |
| **Naming Convention** | `*UseCase.java`, `*Gateway.java` |
| **Imports From** | Domain (Entities, Events) |
| **Cannot Import** | `infrastructure.*`, `presentation.*` |
| **Dependencies** | None (pure application logic) |
| **When To Use** | Defining application business flows and output port contracts |
| **Specialist Type** | code |
| **Purpose** | Generate UseCase orchestration classes and Output Port (Gateway) interfaces for Clean-Modulith |
| **Activation Trigger** | files: **/usecase/**/*.java, **/port/**/*.java; keywords: useCase, gateway, outputPort, applicationPort |

---

## Purpose

Defines application-layer patterns for Clean-Modulith: UseCase classes that orchestrate domain logic, and Output Port interfaces (Gateway) that define contracts for external dependencies. UseCase + Port are the CORE of Clean Architecture — they define WHAT the application does and WHAT it needs from outside.

---

## Pattern 54.1: UseCase Class Structure

**Use Case**: Application-specific business flow orchestration.

```java
// application/usecase/ingest/IngestUseCase.java
package {rootPackage}.application.usecase.ingest;

import {rootPackage}.application.port.LedgerGateway;
import {rootPackage}.application.port.TargetSystemGateway;
import {rootPackage}.domain.event.LedgerCreatedEvent;
import {rootPackage}.domain.model.ApiCallLedger;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class IngestUseCase {

    private final LedgerGateway ledgerGateway;
    private final TargetSystemGateway targetSystemGateway;
    private final ApplicationEventPublisher eventPublisher;

    public IngestUseCase(LedgerGateway ledgerGateway,
                         TargetSystemGateway targetSystemGateway,
                         ApplicationEventPublisher eventPublisher) {
        this.ledgerGateway = ledgerGateway;
        this.targetSystemGateway = targetSystemGateway;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ApiCallLedger ingest(IngestCommand command) {
        // 1. Check idempotency via output port
        var existing = ledgerGateway.findBySourceSystemAndSourceId(
            command.sourceSystem(), command.sourceId());
        if (existing.isPresent()) {
            return existing.get();
        }

        // 2. Create domain entity
        var ledger = ApiCallLedger.create(
            UUID.randomUUID(), command.sourceSystem(), command.sourceId(),
            command.type(), classifyTier(command.type()), command.payload());
        var saved = ledgerGateway.save(ledger);

        // 3. Publish domain event
        eventPublisher.publishEvent(new LedgerCreatedEvent(
            saved.callId(), saved.type(), saved.tier(),
            saved.sourceSystem(), saved.createdAt()));

        return saved;
    }
}
```

**Key Points**:
- `@Service` — Spring manages lifecycle
- `@Transactional` — business flow is atomic
- Constructor injection of Output Ports (interfaces, NOT implementations)
- Returns domain entity — NOT DTO (controller handles DTO conversion)
- Imports ONLY from `domain.*` and `application.port.*`

---

## Pattern 54.2: Output Port (Gateway Interface)

**Use Case**: Define contracts for external dependencies.

```java
// application/port/LedgerGateway.java
package {rootPackage}.application.port;

import {rootPackage}.domain.model.ApiCallLedger;

import java.util.Optional;
import java.util.UUID;

public interface LedgerGateway {

    ApiCallLedger save(ApiCallLedger ledger);

    Optional<ApiCallLedger> findByCallId(UUID callId);

    Optional<ApiCallLedger> findBySourceSystemAndSourceId(
            String sourceSystem, String sourceId);
}
```

```java
// application/port/TargetSystemGateway.java
package {rootPackage}.application.port;

import {rootPackage}.domain.model.ApiCallLedger;

public interface TargetSystemGateway {

    TargetResponse forward(ApiCallLedger ledger);
}
```

**Key Points**:
- Pure Java interface — NO Spring annotations, NO framework imports
- Param/return types are domain entities or simple Java types
- Naming: `{Entity}Gateway` or `{System}Gateway`
- Package: `{rootPackage}.application.port` — centralized, not per-feature
- Each interface follows Interface Segregation Principle — only methods the use case needs

---

## Pattern 54.3: UseCase + Port Wiring

**Use Case**: How UseCase, Port, and Adapter connect at runtime.

```
                ┌─────────────────────────────┐
                │   presentation/controller/   │
                │   IngestController            │
                └──────────┬──────────────────┘
                           │ calls
                ┌──────────▼──────────────────┐
                │   application/usecase/        │
                │   IngestUseCase               │
                │   (depends on Port interfaces)│
                └──────────┬──────────────────┘
                           │ depends on (interface)
                ┌──────────▼──────────────────┐
                │   application/port/           │
                │   LedgerGateway (interface)   │
                │   TargetSystemGateway (intf)  │
                └──────────┬──────────────────┘
                           │ implemented by
                ┌──────────▼──────────────────┐
                │   infrastructure/adapter/     │
                │   LedgerJdbcGateway (impl)    │
                │   BravoRestGateway (impl)     │
                └─────────────────────────────┘
```

**Spring DI wires them automatically**:
- UseCase constructor declares `LedgerGateway` (interface)
- Spring finds `LedgerJdbcGateway` (`@Repository`, implements `LedgerGateway`)
- No explicit `@Bean` configuration needed

---

## Pattern 54.4: Rejected Patterns

### Rejected 1: UseCase returning DTO

```java
// WRONG: UseCase should NOT return presentation DTOs
public IngestResponse ingest(IngestCommand command) {
    // ... business logic ...
    return new IngestResponse(saved.callId()); // Presentation concern in application layer
}
```

**Fix**: UseCase returns domain entity. Controller converts to Response DTO.

### Rejected 2: UseCase importing infrastructure

```java
// WRONG: UseCase must NOT import infrastructure classes
import {rootPackage}.infrastructure.adapter.BravoRestGateway; // Direct dependency on impl
import {rootPackage}.infrastructure.persistence.LedgerCrudRepository;

public class IngestUseCase {
    private final BravoRestGateway bravoGateway; // Concrete class, not interface
}
```

**Fix**: UseCase depends on `application.port.*` interfaces ONLY.

### Rejected 3: Port interface with Spring annotations

```java
// WRONG: Port interface must be framework-free
package {rootPackage}.application.port;

import org.springframework.stereotype.Repository;
import org.springframework.data.repository.CrudRepository;

@Repository
public interface LedgerGateway extends CrudRepository<ApiCallLedger, Long> {
}
```

**Fix**: Port interface is pure Java. Spring annotations go on the implementation in infrastructure layer.

### Rejected 4: UseCase as interface + impl

```java
// UNNECESSARY: Don't create interface for UseCase
public interface IngestUseCase { ... }
public class IngestUseCaseImpl implements IngestUseCase { ... }
```

**Fix**: UseCase is a concrete class. No need for interface — Mockito can mock concrete classes.

---

## Guidelines

- UseCase class: 1 per business flow (NOT 1 per entity CRUD operation)
- Port interface: 1 per external dependency (NOT 1 per UseCase)
- UseCase returns domain entity — controller converts to DTO
- UseCase imports: `domain.*` + `application.port.*` ONLY
- Port interface: pure Java, NO framework annotations
- Port naming: `{Entity}Gateway` (data access) or `{System}Gateway` (external system)

## REJECTED Patterns

- DO NOT return DTOs from UseCase — controller handles conversion
- DO NOT import infrastructure classes in UseCase — use output ports
- DO NOT add Spring annotations to Port interfaces — keep framework-free
- DO NOT create UseCase interface + impl pair — concrete class is sufficient

---

## Related Specialists

- `architecture/backend-clean-architecture-specialist.md` — Layer rules, file type mapping (0.x)
- `data-access/jdbcclient-specialist.md` — Gateway implementation with JdbcClient (51.x)
- `gateway/restclient-specialist.md` — Gateway implementation with RestClient (53.x)
- `cross-cutting/spring-modulith-specialist.md` — Module boundaries, @ApplicationModule (52.x)
- `patterns/crud-service-base-specialist.md` — CRUD service patterns (45.x)
