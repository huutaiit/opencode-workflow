# Entity Auditing Specialist
# エンティティ監査 スペシャリスト
# Chuyên Gia Kiểm Toán Entity

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Package** | Variant-dependent (see below) |
| **Maven Module** | `common` (Standard/Reactive), `backbone` (Clean-Modulith) |
| **Variant** | ALL |
| **Pattern Numbers** | 79.1–79.4 |
| **Source Paths** | Variant-dependent (see below) |
| **File Count** | 1 base class + ~87 entities |
| **Naming Convention** | Variant-dependent (see below) |
| **Base Class** | Variant-dependent (see below) |
| **Imports From** | (nothing — Domain is innermost layer) |
| **Cannot Import** | `application.*`, `infrastructure.*`, `rest.*` |
| **Dependencies** | Variant-dependent (see below) |
| **When To Use** | Entity audit fields — createdBy, updatedAt, soft delete, optimistic locking |
| **Source Skeleton** | Variant-dependent (see below) |
| **Specialist Type** | code |
| **Purpose** | Generate audit entity base class with timestamp/user tracking, soft delete, and optimistic locking |
| **Activation Trigger** | files: **/domain/common/**/*.java; keywords: auditing, auditEntity, softDelete, optimisticLocking, createdDate |

### Variant-Specific Rules

| Property | Reactive (R2DBC) | Clean-Modulith (Spring Data JDBC) |
|----------|-----------------|-----------------------------------|
| **Package** | `{rootPackage}.domain` | `{rootPackage}.common.domain` or inline in entity records |
| **Source Path** | `{sourceRoot}/domain/AbstractAuditingEntity.java` | Audit fields embedded in entity records |
| **Naming** | `AbstractAuditingEntity.java` | `AuditFields.java` (record) or flattened fields |
| **Base Class** | `AbstractAuditingEntity<Long>` (mutable, `Persistable<T>`) | None — audit fields are record components |
| **Dependencies** | Spring Data R2DBC callbacks (`AfterConvertCallback`, `AfterSaveCallback`) | `@EnableJdbcAuditing` + `@CreatedDate`/`@LastModifiedDate` |
| **isNew() strategy** | `Persistable.isNew()` + `@Transient persisted` flag | `id == null` (Spring Data JDBC default) |

---

**Title**: AbstractAuditingEntity — Timestamps, Soft Delete, and Optimistic Locking
**Domain**: Cross-Cutting / Auditing
**Pattern Range**: 79.1–79.4

---

## Description

All persistent entities extend `AbstractAuditingEntity<T>`, which provides
creation/update timestamps, user attribution, soft delete fields, and an optimistic
locking version counter. The `Persistable<ID>` interface tells Spring Data R2DBC
whether to INSERT or UPDATE without an extra SELECT round-trip.

---

## Key Concepts

- **`@CreatedDate` / `@LastModifiedDate`**: populated by Spring Data auditing
- **`@Version` (`updCnt`)**: starts at 1 on insert; auto-incremented by R2DBC on update
- **Soft delete**: `delFlg`, `delDate`, `delUserId` — records are never physically removed
- **`isPersisted()`**: returns `true` when `insDate` is already set (avoids SELECT before INSERT)
- **`prepareForCreate` / `prepareForUpdate`**: explicit user attribution (no AuditorAware magic)

---

## Pattern 79.1 — AbstractAuditingEntity

#### Reactive
```java
package {rootPackage}.common.domain;

import org.springframework.data.annotation.*;
import org.springframework.data.domain.Persistable;

@SuppressWarnings("java:S2160")
public abstract class AbstractAuditingEntity<T extends Serializable>
        implements Persistable<T> {

    @CreatedDate  private Instant insDate;
    @LastModifiedDate  private Instant updDate;
    private Long insUserId;
    private Long updUserId;
    private Boolean delFlg = Boolean.FALSE;
    private Instant delDate;
    private Long    delUserId;
    @Version  private Integer updCnt = 1;

    @Transient  private boolean persisted;

    @Override @Transient
    public boolean isNew() { return !persisted || getId() == null; }

    // Persistence marking handled by R2DBC AfterConvertCallback / AfterSaveCallback
    // See r2dbc-callback-specialist.md Pattern 34.x
}
```

#### Clean-Modulith (Spring Data JDBC)
```java
package {rootPackage}.common.domain;

// Spring Data JDBC uses records — no Persistable interface needed
// isNew() determined by id == null (Spring Data JDBC default)
// No callbacks needed — @CreatedDate/@LastModifiedDate work via @EnableJdbcAuditing

public record AuditFields(
    Instant insDate,
    Instant updDate,
    Long insUserId,
    Long updUserId,
    Boolean delFlg,
    Instant delDate,
    Long delUserId,
    @Version Integer updCnt
) {
    public static AuditFields forCreate(Long userId) {
        return new AuditFields(null, null, userId, userId, false, null, null, 1);
    }
}

// Entity embeds audit fields:
// public record CmnMCustomer(Long customerId, String customerName, ..., AuditFields audit) {}
// Or flatten audit fields directly into the record.
```

---

## Pattern 79.2 — Concrete Entity Example

```java
@Table("cmn_m_customer")
@Data
@EqualsAndHashCode(callSuper = false)
public class CmnMCustomer extends AbstractAuditingEntity<Long> {

    @Id
    private Long customerId;

    @NotNull
    @Size(max = 200)
    private String customerName;

    private String customerCode;

    private String address;

    @Override
    public Long getId() {
        return customerId;
    }
}
```

---

## Pattern 79.3 — prepareForCreate / prepareForUpdate Helpers

These helpers are called from service methods before saving:

```java
// In AbstractAuditingEntity
public void prepareForCreate(Long userId) {
    this.insUserId = userId;
    this.updUserId = userId;
    this.delFlg    = Boolean.FALSE;
    // insDate/updDate set automatically by @CreatedDate / @LastModifiedDate
}

public void prepareForUpdate(Long userId) {
    this.updUserId = userId;
    // updDate set automatically by @LastModifiedDate
}

public void markAsDeleted(Long userId) {
    this.delFlg    = Boolean.TRUE;
    this.delDate   = Instant.now();
    this.delUserId = userId;
    this.updUserId = userId;
}
```

### Service Usage

#### Reactive
```java
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerService {

    private final CmnMCustomerRepository repository;

    public Mono<CmnMCustomer> create(CmnMCustomer entity, Long userId) {
        entity.prepareForCreate(userId);
        return repository.save(entity);
    }

    public Mono<CmnMCustomer> update(CmnMCustomer entity, Long userId) {
        entity.prepareForUpdate(userId);
        return repository.save(entity);
    }

    public Mono<Void> softDelete(Long id, Long userId) {
        return repository.findById(id)
            .doOnNext(e -> e.markAsDeleted(userId))
            .flatMap(repository::save)
            .then();
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerService {

    private final CmnMCustomerRepository repository;

    public CmnMCustomer create(CmnMCustomer entity, Long userId) {
        entity.prepareForCreate(userId);
        return repository.save(entity);
    }

    public CmnMCustomer update(CmnMCustomer entity, Long userId) {
        entity.prepareForUpdate(userId);
        return repository.save(entity);
    }

    public void softDelete(Long id, Long userId) {
        var entity = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Customer", id));
        entity.markAsDeleted(userId);
        repository.save(entity);
    }
}
```

---

## Pattern 79.4 — Auditing Enablement

#### Reactive
```java
@Configuration
@EnableR2dbcAuditing
public class DatabaseConfiguration {
    // No AuditorAware bean needed — user attribution is explicit via prepareForCreate()
}
```

#### Clean-Modulith / Standard
```java
@Configuration
@EnableJdbcAuditing
public class DatabaseConfiguration {
    // @CreatedDate / @LastModifiedDate work automatically with Spring Data JDBC
}
```

### Liquibase Column Baseline

```sql
-- All audited tables include these columns
ALTER TABLE cmn_m_customer ADD COLUMN ins_date    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cmn_m_customer ADD COLUMN upd_date    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cmn_m_customer ADD COLUMN ins_user_id BIGINT;
ALTER TABLE cmn_m_customer ADD COLUMN upd_user_id BIGINT;
ALTER TABLE cmn_m_customer ADD COLUMN del_flg     BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE cmn_m_customer ADD COLUMN del_date    TIMESTAMPTZ;
ALTER TABLE cmn_m_customer ADD COLUMN del_user_id BIGINT;
ALTER TABLE cmn_m_customer ADD COLUMN upd_cnt     INTEGER     NOT NULL DEFAULT 1;
```

---

## Anti-Patterns

- DO NOT use `@CreatedBy` / `@LastModifiedBy` with `AuditorAware` — reactive context makes SecurityContext unreliable; use explicit `prepareForCreate(userId)` instead
- DO NOT start `updCnt` at 0 — Spring Data R2DBC treats 0 as "new entity" and may INSERT instead of UPDATE
- DO NOT physically DELETE audited rows — always soft-delete with `delFlg=true`
- DO NOT omit R2DBC callback registration for `markPersisted()` — causes redundant SELECT on every save (see r2dbc-callback-specialist.md)
- DO NOT expose `delFlg=true` rows in query results — add `WHERE del_flg = false` to all repository queries

---

## Related Specialists

- `data-access/java-r2dbc-specialist.md` — R2DBC repository conventions that inherit from this base
- `cross-cutting/domain-events-specialist.md` — domain events triggered after create/update/delete
- `domain/java-domain-specialist.md` — full entity class conventions
