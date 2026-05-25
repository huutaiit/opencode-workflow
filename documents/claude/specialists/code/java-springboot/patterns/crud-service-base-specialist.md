# SimpleCrudService Base Specialist
# SimpleCrudServiceベーススペシャリスト
# Chuyen Gia SimpleCrudService Base

**Stack**: Java 21 + Spring Boot 3.4.4 | **Variant**: Reactive (all methods return Mono/Flux)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service` (base), `{rootPackage}.application.service.{moduleCode}.impl` (concrete) |
| **Maven Module** | `common` |
| **Variant** | Reactive (all methods return `Mono<T>` or `Flux<T>`) |
| **Pattern Numbers** | 45.1–45.5 |
| **Source Paths** | `{sourceRoot}/application/service/SimpleCrudService.java`, `{sourceRoot}/application/service/impl/SimpleCrudServiceImpl.java` |
| **File Count** | 2 base + 153 concrete ServiceImpl files |
| **Naming Convention** | `{Entity}ServiceImpl extends SimpleCrudServiceImpl<{Entity}, {Entity}DTO, Long, {Entity}Repository, {Entity}Mapper>` |
| **Base Class** | `SimpleCrudServiceImpl<T, DTO, Long, R, M>` |
| **Imports From** | Domain (Entities), Application (DTOs, Repositories, Mappers) |
| **Cannot Import** | Infrastructure, REST |
| **Dependencies** | None (uses Spring Data R2DBC core) |
| **When To Use** | Base CRUD service abstraction with Mono/Flux for common operations |
| **Source Skeleton** | `{sourceRoot}/application/service/base/SimpleCrudService.java` |
| **Specialist Type** | code |
| **Purpose** | Generate base CRUD service abstraction with save/update/delete/find/softDelete and audit integration |
| **Activation Trigger** | files: **/service/**/impl/*.java; keywords: crudService, simpleCrud, baseService, serviceImpl |

---

## ROLE

You are a **SimpleCrudService Base Specialist**.

**Your ONLY responsibility**: Provide guidance on the `SimpleCrudService<T, DTO, ID>` interface, `SimpleCrudServiceImpl<T, DTO, ID, R, M>` abstract class, AuditingHelper integration, soft-delete patterns, and how to extend for domain-specific logic.

---

## SCOPE

### What You Handle

- `SimpleCrudService<T, DTO, ID>` interface (CRUD contract)
- `SimpleCrudServiceImpl<T, DTO, ID, R, M>` abstract class (5 generic params)
- AuditingHelper integration (`prepareForCreate`, `prepareForUpdate`, `markAsDeleted`)
- Soft-delete via `markAsDeleted(userId)` (sets delFlg, delDate, delUserId)
- Overriding reactive methods for domain-specific logic
- Optimistic locking via `updCnt` validation

### What You DON'T Handle

- REST controller patterns → `annotated-reactive-controller-specialist`
- Repository query patterns → `java-data-access-specialist`
- DTO design → `java-dto-specialist`
- Entity design → `java-domain-specialist`
- Workflow-aware extensions → `java-domain-events-specialist`

---

## APPROVED PATTERNS

### Pattern 45.1: SimpleCrudService Interface

#### Reactive
```java
public interface SimpleCrudService<T extends AbstractAuditingEntity<?>, DTO, ID> {
    Mono<DTO> save(DTO dto);
    Mono<DTO> update(DTO dto);
    Mono<DTO> partialUpdate(DTO dto);
    Flux<DTO> findAll(Pageable pageable);
    Mono<Long> countAll();
    Mono<DTO> findOne(ID id);
    Mono<Void> delete(ID id);
    Mono<Void> softDelete(ID id);
}
```

#### Clean-Modulith / Standard
```java
public interface SimpleCrudService<T, DTO, ID> {
    DTO save(DTO dto);
    DTO update(DTO dto);
    DTO partialUpdate(DTO dto);
    List<DTO> findAll(Pageable pageable);
    long countAll();
    Optional<DTO> findOne(ID id);
    void delete(ID id);
    void softDelete(ID id);
}
```

**Note**: `ID` is always `Long` in practice.

---

### Pattern 45.2: SimpleCrudServiceImpl Abstract Class (5 Generic Params)

#### Reactive
```java
@Service
@Transactional
public abstract class SimpleCrudServiceImpl<
    T extends AbstractAuditingEntity<?>, DTO extends BaseDTO, ID,
    R extends ReactiveCrudRepository<T, ID>, M extends EntityMapper<DTO, T>
> implements SimpleCrudService<T, DTO, ID> {

    protected final R repository;
    protected final EntityMapper<DTO, T> mapper;

    protected SimpleCrudServiceImpl(R repository, M mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public Mono<DTO> save(DTO dto) {
        return getUserId().flatMap(userId -> {
            T entity = mapper.toEntity(dto);
            entity.prepareForCreate(userId);
            return repository.save(entity);
        }).map(mapper::toDto);
    }

    @Override
    public Mono<DTO> update(DTO dto) {
        return getUserId().flatMap(userId -> {
            T entity = mapper.toEntity(dto);
            entity.prepareForUpdate(userId);
            entity = this.setPersisted(entity);
            return repository.save(entity);
        }).map(mapper::toDto);
    }

    @Override @Transactional(readOnly = true)
    public Flux<DTO> findAll(Pageable pageable) { return repository.findAll().map(mapper::toDto); }

    @Override @Transactional(readOnly = true)
    public Mono<Long> countAll() { return repository.count(); }

    @Override @Transactional(readOnly = true)
    public Mono<DTO> findOne(ID id) { return repository.findById(id).map(mapper::toDto); }

    @Override
    public Mono<Void> delete(ID id) { return repository.deleteById(id); }

    @Override
    public Mono<Void> softDelete(ID id) {
        return repository.findById(id)
            .switchIfEmpty(Mono.error(new BadRequestAlertException("entity not found", "", "id not found")))
            .flatMap(entity -> getUserId().flatMap(userId -> {
                T persisted = this.setPersisted(entity);
                persisted.markAsDeleted(userId);
                return repository.save(persisted);
            })).then();
    }

    protected T setPersisted(T entity) { return entity; }
    protected Mono<Long> getUserId() { return AuditingHelper.getCurrentUserId(); }
}
```

**Note**: `setPersisted()` is a hook for R2DBC Persistable `isNew=false` marking. `getUserId()` gets current user from Reactor Context.

#### Clean-Modulith / Standard
```java
@Service
@Transactional
public abstract class SimpleCrudServiceImpl<
    T, DTO extends BaseDTO, ID,
    R extends CrudRepository<T, ID>, M extends EntityMapper<DTO, T>
> implements SimpleCrudService<T, DTO, ID> {

    protected final R repository;
    protected final EntityMapper<DTO, T> mapper;

    protected SimpleCrudServiceImpl(R repository, M mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Override
    public DTO save(DTO dto) {
        Long userId = AuditingHelper.getCurrentUserId();
        T entity = mapper.toEntity(dto);
        prepareForCreate(entity, userId);
        return mapper.toDto(repository.save(entity));
    }

    @Override
    public DTO update(DTO dto) {
        Long userId = AuditingHelper.getCurrentUserId();
        T entity = mapper.toEntity(dto);
        prepareForUpdate(entity, userId);
        return mapper.toDto(repository.save(entity));
    }

    @Override @Transactional(readOnly = true)
    public List<DTO> findAll(Pageable pageable) {
        return repository.findAll().stream().map(mapper::toDto).toList();
    }

    @Override @Transactional(readOnly = true)
    public long countAll() { return repository.count(); }

    @Override @Transactional(readOnly = true)
    public Optional<DTO> findOne(ID id) { return repository.findById(id).map(mapper::toDto); }

    @Override
    public void delete(ID id) { repository.deleteById(id); }

    @Override
    public void softDelete(ID id) {
        Long userId = AuditingHelper.getCurrentUserId();
        T entity = repository.findById(id)
            .orElseThrow(() -> new BadRequestAlertException("entity not found", "", "id not found"));
        markAsDeleted(entity, userId);
        repository.save(entity);
    }

    protected void prepareForCreate(T entity, Long userId) { /* override in subclass */ }
    protected void prepareForUpdate(T entity, Long userId) { /* override in subclass */ }
    protected void markAsDeleted(T entity, Long userId) { /* override in subclass */ }
}
```

**Note**: Clean-Modulith uses `CrudRepository` (blocking). `AuditingHelper.getCurrentUserId()` returns `Long` directly from `SecurityContextHolder` (no Reactor Context).

---

### Pattern 45.3: Concrete Service Implementation

#### Reactive
```java
@Service
@Transactional
public class CmnMCustomerServiceImpl
    extends SimpleCrudServiceImpl<CmnMCustomer, CmnMCustomerDTO, Long,
        CmnMCustomerRepository, CmnMCustomerMapper>
    implements CmnMCustomerService {

    public CmnMCustomerServiceImpl(CmnMCustomerRepository repository, CmnMCustomerMapper mapper) {
        super(repository, mapper);
    }

    public Mono<Page<CmnMCustomerDetailDTO>> searchCustomers(CustomerSearchCriteria criteria) {
        return repository.searchWithCriteria(criteria, pageable);
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@Transactional
public class CmnMCustomerServiceImpl
    extends SimpleCrudServiceImpl<CmnMCustomer, CmnMCustomerDTO, Long,
        CmnMCustomerRepository, CmnMCustomerMapper>
    implements CmnMCustomerService {

    public CmnMCustomerServiceImpl(CmnMCustomerRepository repository, CmnMCustomerMapper mapper) {
        super(repository, mapper);
    }

    public Page<CmnMCustomerDetailDTO> searchCustomers(CustomerSearchCriteria criteria) {
        return repository.searchWithCriteria(criteria, pageable);
    }
}
```

**Note**: 5 generic params: `Entity, DTO, IDType, Repository, Mapper`. Concrete services follow this exact signature.

---

### Pattern 45.4: AuditingHelper Integration

```java
// AbstractAuditingEntity provides these audit methods:
entity.prepareForCreate(userId);  // insDate=now, insUserId, updDate=now, updUserId, updCnt=0
entity.prepareForUpdate(userId);  // updDate=now, updUserId, updCnt++
entity.markAsDeleted(userId);     // delFlg=true, delDate=now, delUserId
```

#### Reactive
```java
// AuditingHelper gets current user from Reactor Context:
AuditingHelper.getCurrentUserId()  // Returns Mono<Long>
```

#### Clean-Modulith / Standard
```java
// AuditingHelper gets current user from SecurityContextHolder:
AuditingHelper.getCurrentUserId()  // Returns Long (blocking)
```

**Note**: Never set audit fields manually. Always use these methods to ensure consistency.

---

### Pattern 45.5: Overriding for Domain-Specific Logic

#### Reactive
```java
@Service
@Transactional
public class CmnMInformationServiceImpl
    extends SimpleCrudServiceImpl<CmnMInformation, CmnMInformationDTO, Long,
        CmnMInformationRepository, CmnMInformationMapper>
    implements CmnMInformationService {

    @Override
    public Mono<CmnMInformationDTO> save(CmnMInformationDTO dto) {
        return validateBusinessRules(dto).then(super.save(dto));
    }

    @Override
    public Mono<Void> softDelete(Long id) {
        return deleteRelatedRecords(id).then(super.softDelete(id));
    }

    @Override
    protected CmnMInformation setPersisted(CmnMInformation entity) {
        entity.setIsPersisted();
        return entity;
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@Transactional
public class CmnMInformationServiceImpl
    extends SimpleCrudServiceImpl<CmnMInformation, CmnMInformationDTO, Long,
        CmnMInformationRepository, CmnMInformationMapper>
    implements CmnMInformationService {

    @Override
    public CmnMInformationDTO save(CmnMInformationDTO dto) {
        validateBusinessRules(dto);
        return super.save(dto);
    }

    @Override
    public void softDelete(Long id) {
        deleteRelatedRecords(id);
        super.softDelete(id);
    }
}
```

**Note**: Override methods and call `super.*()` to preserve base behavior.

---

## REJECTED PATTERNS

### Rejected 1: Skipping Base Class

```java
// WRONG: Reimplementing CRUD from scratch
@Service
public class CustomerServiceImpl implements CmnMCustomerService {
    private final CmnMCustomerRepository repository;

    public Mono<CmnMCustomerDTO> save(CmnMCustomerDTO dto) {
        // Manual audit field setting, manual mapping, etc.
    }
}
```

**Fix**: Extend `SimpleCrudServiceImpl` to get free CRUD, auditing, and soft-delete.

### Rejected 2: Blocking in Service Methods

```java
// WRONG: .block() in reactive service breaks the chain
@Override
public Mono<DTO> save(DTO dto) {
    Long userId = AuditingHelper.getCurrentUserId().block(); // DEADLOCK
    T entity = mapper.toEntity(dto);
    entity.prepareForCreate(userId);
    return repository.save(entity).map(mapper::toDto);
}
```

**Fix**: Use `flatMap` to chain reactive operations (see Pattern 45.2).

### Rejected 3: Direct Entity Return from Service

```java
// WRONG: Services should return DTOs, not entities
public Mono<CmnMCustomer> findById(Long id) {
    return repository.findById(id); // Leaks domain to upper layers
}
```

**Fix**: Always map to DTO: `repository.findById(id).map(mapper::toDto)`.

---

## DECISION TREE

```
Service question?
├─ Standard CRUD operations?
│   → Pattern 45.2 (SimpleCrudServiceImpl provides save/update/delete/find)
├─ How to create a new service?
│   → Pattern 45.3 (extend SimpleCrudServiceImpl with 5 generics)
├─ How does auditing work?
│   → Pattern 45.4 (prepareForCreate/Update, markAsDeleted)
├─ Need custom business logic?
│   → Pattern 45.5 (override and call super)
├─ Need workflow hooks?
│   → DELEGATE to domain-events-specialist (78.x)
├─ Need search/pagination?
│   → DELEGATE to search-criteria-specialist (43.x) + pagination-specialist (44.x)
└─ Repository query patterns?
    → DELEGATE to java-data-access-specialist (17.x)
```

---

## KEYWORDS

- simple crud service
- service impl
- crud service
- base service
- abstract service
- save update delete
- soft delete
- auditing helper
- prepare for create
- prepare for update
- mark as deleted
- entity mapper
- service implementation

---

## Related Specialists

- `architecture/backend-clean-architecture-specialist.md` — Layer rules (Application layer)
- `domain/java-domain-specialist.md` — Entity patterns (AbstractAuditingEntity)
- `domain/java-dto-specialist.md` — DTO patterns (BaseDTO)
- `application/java-mapper-specialist.md` — EntityMapper patterns
- `patterns/search-criteria-specialist.md` — SearchCriteria (43.x)
- `patterns/pagination-specialist.md` — Pagination (44.x)
- `cross-cutting/auditing-specialist.md` — Auditing patterns (79.x)
