# Java Domain Specialist
# ドメイン スペシャリスト
# Chuyên Gia Domain Java
**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Standard (JPA)

> ⚠️ **VARIANT WARNING**: This specialist is primarily for the **Standard (JPA)** variant.
> For **Reactive (R2DBC/WebFlux)**, see: `java-webflux-specialist.md`, `java-r2dbc-specialist.md`.
> For **Clean-Modulith (Spring Data JDBC)**, see: `spring-data-jdbc-specialist.md` Pattern 50.1 for immutable record entities.

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Package** | Variant-dependent (see below) |
| **Maven Module** | common (Standard/Reactive), backbone (Clean-Modulith) |
| **Variant** | Standard (JPA) — see variant table for others |
| **Pattern Numbers** | 4.1–4.N |
| **Source Paths** | Variant-dependent (see below) |
| **File Count** | ~100 entities |
| **Naming Convention** | Variant-dependent (see below) |
| **Base Class** | Variant-dependent (see below) |
| **Imports From** | (nothing — innermost layer) |
| **Cannot Import** | Application, Infrastructure, REST |
| **Dependencies** | Variant-dependent (see below) |
| **When To Use** | Domain entity creation |
| **Source Skeleton** | Variant-dependent (see below) |
| **Specialist Type** | code |
| **Purpose** | Generate domain entities with audit fields, validation constraints, and relationship mappings |
| **Activation Trigger** | files: **/domain/**/*.java; keywords: entity, domainModel, jpaEntity, aggregate |

### Variant-Specific Rules

| Property | Standard (JPA) | Clean-Modulith (Spring Data JDBC) |
|----------|---------------|-----------------------------------|
| **Package** | `{rootPackage}.domain.{moduleCode}` | `{rootPackage}.domain.model` |
| **Source Path** | `{sourceRoot}/domain/{moduleCode}/` | `{sourceRoot}/domain/model/` |
| **Naming** | `{DomainPrefix}{Type}{Entity}.java` (e.g., `CmnMCustomer.java`) | `{Entity}.java` (e.g., `ApiCallLedger.java`) |
| **Base Class** | `AbstractAuditingEntity<Long>` (mutable class) | None — immutable Java `record` |
| **Dependencies** | Spring Data JPA annotations (`@Entity`, `@Table`, `@Column`) | `@Id` only (Spring Data JDBC convention-based) |
| **Identity** | `@GeneratedValue(strategy=...)` | `id=null` → INSERT, `id!=null` → UPDATE |

> **Note**: `{DomainPrefix}{Type}{Entity}` naming (e.g., `CmnMCustomer`) is a **project-specific convention** for the Standard/Reactive variant, not a universal rule. Clean-Modulith uses plain entity names.

---

## Purpose
Generates JPA entity classes with proper annotations, relationships, audit fields, and domain logic.

## Patterns

### Pattern 1: Base Entity with Audit
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
```

### Pattern 2: Entity with Relationships
```java
@Entity
@Table(name = "loans")
public class Loan extends BaseEntity {
    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private LoanStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "borrower_id", nullable = false)
    private User borrower;

    @OneToMany(mappedBy = "loan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Payment> payments = new ArrayList<>();

    public void addPayment(Payment payment) {
        payments.add(payment);
        payment.setLoan(this);
    }
}
```

### Pattern 3: Value Object as Embeddable
```java
@Embeddable
public record Money(
    @Column(nullable = false) BigDecimal amount,
    @Column(nullable = false, length = 3) String currency
) {
    public Money {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount cannot be negative");
        }
    }

    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new IllegalArgumentException("Currency mismatch");
        }
        return new Money(this.amount.add(other.amount), this.currency);
    }
}
```

### Pattern 4: Enum with Business Logic
```java
public enum LoanStatus {
    PENDING, APPROVED, ACTIVE, OVERDUE, COMPLETED, DEFAULTED;

    public boolean canTransitionTo(LoanStatus target) {
        return switch (this) {
            case PENDING -> target == APPROVED;
            case APPROVED -> target == ACTIVE;
            case ACTIVE -> target == COMPLETED || target == OVERDUE;
            case OVERDUE -> target == COMPLETED || target == DEFAULTED;
            default -> false;
        };
    }
}
```

### Pattern 5: Entity Lifecycle Callbacks
```java
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.BORROWER;

    @PrePersist
    void prePersist() {
        this.email = this.email.toLowerCase().trim();
    }

    @PreUpdate
    void preUpdate() {
        if (this.role == UserRole.ADMIN && this.email == null) {
            throw new IllegalStateException("Admin must have email");
        }
    }
}
```

## Guidelines
- Use `UUID` as primary key type with `GenerationType.UUID`
- Always extend `BaseEntity` for audit fields
- Use `FetchType.LAZY` for all `@ManyToOne` and `@OneToMany`
- Prefer Java records for Value Objects with `@Embeddable`
- Keep domain logic in entities (DDD rich domain model)
- Use `@Version` for optimistic locking
- Validate state transitions within the entity

## REJECTED Patterns

- DO NOT use JPA `@Entity` in R2DBC variant — use `@Table` from Spring Data R2DBC
- DO NOT add business logic to DTOs — domain logic belongs in entities
- DO NOT use `@ManyToOne`/`@OneToMany` — R2DBC has no join annotations (use manual SQL joins)
- DO NOT skip `AbstractAuditingEntity` base class — all entities must extend it

---

## Clean-Modulith Entity (Spring Data JDBC)

#### Clean-Modulith / Standard

> Clean-Modulith entities dung Java `record` voi `@Id` annotation (Spring Data JDBC).
> KHONG dung JPA annotations (`@Entity`, `@Table`, `@ManyToOne`).
> Package: `{rootPackage}.domain.model` (NOT `domain.{moduleCode}`).
> Chi tiet: xem `data-access/spring-data-jdbc-specialist.md` (50.x).

### Pattern 1.9: Clean-Modulith Domain Entity

```java
// domain/model/ApiCallLedger.java
package {rootPackage}.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import java.time.Instant;
import java.util.UUID;

public record ApiCallLedger(
    @Id Long id,
    UUID callId,
    String sourceSystem,
    String sourceId,
    String type,
    int tier,
    String state,
    String requestPayload,
    String responsePayload,
    int retryCount,
    Instant scheduledRetryAt,
    Instant createdAt,
    Instant updatedAt,
    @Version Long version
) {
    /**
     * Factory method — id=null triggers INSERT in Spring Data JDBC.
     */
    public static ApiCallLedger create(UUID callId, String sourceSystem, String sourceId,
                                        String type, int tier, String requestPayload) {
        return new ApiCallLedger(
            null, callId, sourceSystem, sourceId,
            type, tier, "RECEIVED", requestPayload,
            null, 0, null, Instant.now(), Instant.now(), null
        );
    }

    /**
     * State transition — returns new record (immutable).
     */
    public ApiCallLedger withState(String newState) {
        return new ApiCallLedger(
            id, callId, sourceSystem, sourceId,
            type, tier, newState, requestPayload,
            responsePayload, retryCount, scheduledRetryAt,
            createdAt, Instant.now(), version
        );
    }
}
```

**Key Points**:
- Package: `{rootPackage}.domain.model` (theo Pattern 0.7)
- Java `record` — immutable, no boilerplate
- `@Id` only — NO `@Entity`, NO `@Table`, NO `@GeneratedValue`
- Factory method `create()` voi `id=null` — Spring Data JDBC auto-generates ID on INSERT
- State transition via `withXxx()` methods — returns new record
- Convention-based column mapping: `callId` → `call_id` (auto)

---

## Domain Service (Clean-Modulith Only)

#### Clean-Modulith / Standard

### Pattern 1.7: Domain Service

**Use Case**: Business logic that spans multiple entities or doesn't belong to a single entity.

```java
// domain/service/TierClassificationService.java
package {rootPackage}.domain.service;

import {rootPackage}.domain.model.ApiCallLedger;

public class TierClassificationService {

    public int classifyTier(String type) {
        return switch (type) {
            case "PROD_OUTPUT", "STOCK_ISSUE" -> 1;  // Hot lane
            case "MATERIAL_FULL" -> 2;                // Cold lane
            default -> 3;                             // Default
        };
    }
}
```

**Key Points**:
- Pure Java — NO Spring annotations (no @Service, no @Component)
- NO framework imports
- Stateless — logic only, no side effects
- Used by UseCase classes (injected manually or via constructor)

---

## Domain Exception (Clean-Modulith Only)

#### Clean-Modulith / Standard

### Pattern 1.8: Domain Exception

**Use Case**: Business rule violations expressed as exceptions in domain layer.

```java
// domain/exception/LedgerNotFoundException.java
package {rootPackage}.domain.exception;

public class LedgerNotFoundException extends RuntimeException {

    private final String entityName;
    private final Object id;

    public LedgerNotFoundException(String entityName, Object id) {
        super(entityName + " not found with id: " + id);
        this.entityName = entityName;
        this.id = id;
    }

    public String getEntityName() { return entityName; }
    public Object getId() { return id; }
}
```

```java
// domain/exception/DuplicateTransactionException.java
package {rootPackage}.domain.exception;

public class DuplicateTransactionException extends RuntimeException {

    public DuplicateTransactionException(String sourceSystem, String sourceId) {
        super("Duplicate transaction: " + sourceSystem + "/" + sourceId);
    }
}
```

**Key Points**:
- Pure Java — NO Spring annotations
- Extends `RuntimeException` (unchecked)
- Package: `{rootPackage}.domain.exception` (NOT infrastructure)
- Exception handler (`@ControllerAdvice`) trong presentation hoac infrastructure layer convert exception → HTTP response

---

## Related Specialists

- `cross-cutting/auditing-specialist.md` — AbstractAuditingEntity base class (79.x)
- `data-access/r2dbc-callback-specialist.md` — AfterConvertCallback for persisted flag (34.x)
- `application/java-mapper-specialist.md` — entity-to-DTO mapping (11.x)
- `application/usecase-port-specialist.md` — UseCase + Port patterns for Clean-Modulith (54.x)
