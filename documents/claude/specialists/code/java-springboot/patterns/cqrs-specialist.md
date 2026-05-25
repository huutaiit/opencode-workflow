# CQRS Specialist
# CQRS スペシャリスト
# Chuyên Gia CQRS

**Role**: Command Query Responsibility Segregation Expert
**Technology Stack**: Spring WebFlux, R2DBC, Spring Boot
**Integration**: Core / SFA service layer (CQRS)
**Version**: Spring Boot 3.4.4

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Package** | `{rootPackage}.application.service.{moduleCode}` |
| **Maven Module** | `common` |
| **Variant** | Reactive (WebFlux + R2DBC) |
| **Pattern Numbers** | 33.1–33.3 |
| **Source Paths** | `{sourceRoot}/application/service/{moduleCode}/` |
| **File Count** | N/A (pattern applied to existing services) |
| **Naming Convention** | `{Entity}QueryService.java`, `{Entity}CommandService.java` |
| **Base Class** | N/A (interface separation pattern) |
| **Imports From** | Domain (Entities), Application (DTOs, Repositories) |
| **Cannot Import** | Infrastructure, REST (`rest.*`) |
| **Dependencies** | None (uses Spring WebFlux core) |
| **When To Use** | Separating command (write) and query (read) service paths |
| **Source Skeleton** | `{sourceRoot}/application/service/{moduleCode}/{Entity}CommandService.java`, `{sourceRoot}/application/service/{moduleCode}/{Entity}QueryService.java` |
| **Specialist Type** | code |
| **Purpose** | Generate separated command and query service interfaces with optimized read/write paths |
| **Activation Trigger** | files: **/service/**/*.java; keywords: cqrs, commandService, queryService, readWriteSeparation |

---

## Expertise Areas

1. **CQRS Lite**: Separate QueryService and CommandService at service layer (no separate event store)
2. **Query Optimization**: Read-optimized projections, joins, pagination
3. **Command Optimization**: Write-optimized, validation-heavy, event-publishing
4. **Interface Design**: Clear intent separation via naming and method signatures
5. **Registration Pattern**: Module-level CQRS for CRM entities

---

## Pattern Index

- [Pattern 33.1: QueryService vs CommandService Interfaces](#pattern-331-queryservice-vs-commandservice-interfaces)
- [Pattern 33.2: InformationQueryService Implementation](#pattern-332-informationqueryservice-implementation)
- [Pattern 33.3: InformationCommandService Implementation](#pattern-333-informationcommandservice-implementation)

---

## Pattern 33.1: QueryService vs CommandService Interfaces

**Use Case**: Explicit separation of read and write concerns at the interface level.

#### Reactive
```java
public interface InformationQueryService {
    Mono<PageResponse<InformationListDto>> search(
        InformationSearchCriteria criteria, PageRequest pageRequest);
    Mono<InformationDetailDto> getDetail(String informationId, String tenantId);
    Mono<InformationSummaryDto> getSummary(String informationId, String tenantId);
}

public interface InformationCommandService {
    Mono<InformationDetailDto> create(CreateInformationRequest request, String tenantId, Long userId);
    Mono<InformationDetailDto> update(String informationId, UpdateInformationRequest request,
        String tenantId, Long userId);
    Mono<Void> delete(String informationId, String tenantId, Long userId);
}
```

#### Clean-Modulith / Standard
```java
public interface InformationQueryService {
    PageResponse<InformationListDto> search(
        InformationSearchCriteria criteria, PageRequest pageRequest);
    InformationDetailDto getDetail(String informationId, String tenantId);
    InformationSummaryDto getSummary(String informationId, String tenantId);
}

public interface InformationCommandService {
    InformationDetailDto create(CreateInformationRequest request, String tenantId, Long userId);
    InformationDetailDto update(String informationId, UpdateInformationRequest request,
        String tenantId, Long userId);
    void delete(String informationId, String tenantId, Long userId);
}
```

**Key Rule**: Query services never write. Command services never return search results.

---

## Pattern 33.2: InformationQueryService Implementation

**Use Case**: Read-optimized service with caching and flat projections.

#### Reactive
```java
@Service
@RequiredArgsConstructor
public class InformationQueryServiceImpl implements InformationQueryService {

    private final InformationRepository informationRepository;
    private final RedisCacheAsideService cacheService;

    @Override
    public Mono<PageResponse<InformationListDto>> search(
            InformationSearchCriteria criteria, PageRequest pageRequest) {
        return informationRepository.findByCriteria(criteria, pageRequest)
            .map(InformationMapper::toListDto)
            .collectList()
            .zipWith(informationRepository.countByCriteria(criteria))
            .map(tuple -> PageResponse.of(tuple.getT1(), tuple.getT2(), pageRequest));
    }

    @Override
    public Mono<InformationDetailDto> getDetail(String informationId, String tenantId) {
        return cacheService.getOrLoad(
            "info:" + tenantId + ":" + informationId,
            informationRepository.findDetailById(informationId, tenantId)
                .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
                .map(InformationMapper::toDetailDto),
            Duration.ofMinutes(5)
        );
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@RequiredArgsConstructor
public class InformationQueryServiceImpl implements InformationQueryService {

    private final InformationRepository informationRepository;
    private final RedisCacheAsideService cacheService;

    @Override
    public PageResponse<InformationListDto> search(
            InformationSearchCriteria criteria, PageRequest pageRequest) {
        var page = informationRepository.findByCriteria(criteria, pageRequest);
        var dtos = page.getContent().stream()
            .map(InformationMapper::toListDto).toList();
        return PageResponse.of(dtos, page.getTotalElements(), pageRequest);
    }

    @Override
    public InformationDetailDto getDetail(String informationId, String tenantId) {
        return cacheService.getOrLoad(
            "info:" + tenantId + ":" + informationId,
            () -> {
                var entity = informationRepository.findDetailById(informationId, tenantId)
                    .orElseThrow(() -> new EntityNotFoundException("Information", informationId));
                return InformationMapper.toDetailDto(entity);
            },
            Duration.ofMinutes(5)
        );
    }
}
```

---

## Pattern 33.3: InformationCommandService Implementation

**Use Case**: Write-optimized service with validation, audit, and event publishing.

#### Reactive
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class InformationCommandServiceImpl implements InformationCommandService {

    private final InformationRepository informationRepository;
    private final InformationValidator validator;
    private final RedisCacheAsideService cacheService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public Mono<InformationDetailDto> create(
            CreateInformationRequest request, String tenantId, Long userId) {
        return validator.validateCreate(request, tenantId)
            .then(Mono.defer(() -> {
                var entity = InformationMapper.fromCreateRequest(request);
                entity.setTenantId(tenantId);
                entity.prepareForCreate(userId);
                return informationRepository.save(entity);
            }))
            .doOnNext(saved -> {
                eventPublisher.publishEvent(new InformationCreatedEvent(saved.getId(), tenantId));
            })
            .map(InformationMapper::toDetailDto);
    }

    @Override
    @InvalidateCache(keyPattern = "info:{tenantId}:{informationId}")
    public Mono<InformationDetailDto> update(
            String informationId,
            UpdateInformationRequest request,
            String tenantId,
            Long userId) {
        return informationRepository.findByIdAndTenantId(informationId, tenantId)
            .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
            .flatMap(existing -> {
                InformationMapper.applyUpdate(existing, request);
                existing.prepareForUpdate(userId); // sets updUserId, updDate, increments updCnt
                return informationRepository.save(existing);
            })
            .flatMap(saved -> {
                cacheService.evict("info:" + tenantId + ":" + informationId).subscribe();
                return informationRepository.findDetailById(informationId, tenantId);
            })
            .map(InformationMapper::toDetailDto);
    }

    @Override
    public Mono<Void> delete(String informationId, String tenantId, Long userId) {
        return informationRepository.findByIdAndTenantId(informationId, tenantId)
            .switchIfEmpty(Mono.error(new EntityNotFoundException("Information", informationId)))
            .flatMap(existing -> {
                existing.setDelFlg(true);
                existing.setDelDate(Instant.now());
                existing.setDelUserId(userId);
                return informationRepository.save(existing);
            })
            .doOnNext(deleted -> cacheService.evict("info:" + tenantId + ":" + informationId).subscribe())
            .then();
    }
}
```

#### Clean-Modulith / Standard
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class InformationCommandServiceImpl implements InformationCommandService {

    private final InformationRepository informationRepository;
    private final InformationValidator validator;
    private final RedisCacheAsideService cacheService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public InformationDetailDto create(
            CreateInformationRequest request, String tenantId, Long userId) {
        validator.validateCreate(request, tenantId);
        var entity = InformationMapper.fromCreateRequest(request);
        entity.prepareForCreate(userId);
        var saved = informationRepository.save(entity);
        eventPublisher.publishEvent(new InformationCreatedEvent(saved.getId(), tenantId));
        return InformationMapper.toDetailDto(saved);
    }

    @Override
    @Transactional
    public InformationDetailDto update(
            String informationId, UpdateInformationRequest request,
            String tenantId, Long userId) {
        var existing = informationRepository.findByIdAndTenantId(informationId, tenantId)
            .orElseThrow(() -> new EntityNotFoundException("Information", informationId));
        InformationMapper.applyUpdate(existing, request);
        existing.prepareForUpdate(userId);
        informationRepository.save(existing);
        cacheService.evict("info:" + tenantId + ":" + informationId);
        return InformationMapper.toDetailDto(
            informationRepository.findDetailById(informationId, tenantId).orElseThrow());
    }

    @Override
    @Transactional
    public void delete(String informationId, String tenantId, Long userId) {
        var existing = informationRepository.findByIdAndTenantId(informationId, tenantId)
            .orElseThrow(() -> new EntityNotFoundException("Information", informationId));
        existing.markAsDeleted(userId);
        informationRepository.save(existing);
        cacheService.evict("info:" + tenantId + ":" + informationId);
    }
}
```

**Router Registration** (functional endpoints — Reactive only):
```java
// router/InformationRouter.java
@Configuration
public class InformationRouter {

    @Bean
    public RouterFunction<ServerResponse> informationRoutes(
            InformationQueryHandler queryHandler,
            InformationCommandHandler commandHandler) {
        return route()
            .GET("/api/informations", queryHandler::search)
            .GET("/api/informations/{id}", queryHandler::getDetail)
            .POST("/api/informations", commandHandler::create)
            .PUT("/api/informations/{id}", commandHandler::update)
            .DELETE("/api/informations/{id}", commandHandler::delete)
            .build();
    }
}
```

---

## Anti-Patterns

- NO mixing search logic in CommandService — breaks read optimization
- NO returning mutable entities from QueryService — always map to DTOs
- NO calling CommandService from QueryService or vice versa — use events
- NO skipping validation in CommandService — always validate before write

---

## Related Specialists

- `application/java-handler-specialist.md` - Handler functions delegate to Query/CommandService
- `presentation/java-router-specialist.md` - RouterFunction wires handlers
- `cache/cache-specialist.md` - QueryService uses cache-aside; CommandService evicts
- `data-access/r2dbc-callback-specialist.md` - prepareForCreate/prepareForUpdate audit methods
