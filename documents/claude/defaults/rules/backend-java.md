---
paths:
  - "backend/**/*.java"
  - "backend/**/*.xml"
  - "backend/**/pom.xml"
---
# Java Backend Rules — Reactive
## Architecture
- Clean Architecture + Hexagonal pattern
- Variant: **Reactive (WebFlux + R2DBC)** — NOT JPA, NOT Servlet, NOT Blocking
- Spring Boot 3.4.4, Java 21, PostgreSQL 17   # CONFIGURE: versions
- Spring Data R2DBC 3.4+ for async/non-blocking data access
## Layer Rules
- domain: entities (`@Table`), callbacks, enums. NO imports from other layers
- application: services, repositories, DTOs, mappers. Depends on domain ONLY
- infrastructure: VMs, VM mappers, config, security, Kafka. CANNOT import `rest.*`
- presentation (`rest/`): `@RestController` resources. CANNOT import domain directly
## Naming
- Domain prefix: `{DomainPrefix}{Type}{Entity}`   # CONFIGURE: e.g. CmnM*, SfaT*, CtmM*
- Resource: `{DomainPrefix}{EntityType}{EntityName}Resource.java` in `rest/{moduleCode}/`
- Service: `{Entity}ServiceImpl.java` in `application/service/{moduleCode}/impl/`
- Repository: `{Prefix}{Entity}Repository.java` in `application/repository/{moduleCode}/`
- DTO: `{Entity}DTO.java` in `application/service/dto/{moduleCode}/`
- VM: `{ShortName}VM.java`, `Create{Name}VM.java` in `infrastructure/web/rest/vm/{moduleCode}/`
- VM Mapper: `{Entity}VMMapper.java` in `infrastructure/web/rest/mapper/{moduleCode}/`
- Entity Mapper: `{Entity}Mapper.java` in `application/service/mapper/{moduleCode}/` (MapStruct)
## Module Structure
# CONFIGURE: list your Maven modules and their roles
- common/ (shared library — domain, application, infrastructure layers)
- {app-name}/ (presentation layer — controllers per business domain)
- gateway/ (API routing, auth — Spring Cloud Gateway)
## Auth
# CONFIGURE: choose one auth strategy
- Keycloak SSO with JWT/OAuth2
- SecurityWebFilterChain (WebFlux — NOT SecurityFilterChain)
- spring-boot-starter-oauth2-resource-server
## Response Format
- Return `Mono<ResponseEntity<T>>` from all controller methods
- Two-layer mapping: Entity ↔ DTO (MapStruct) ↔ VM (VMMapper)
## Cross-cutting Infrastructure
- GlobalExceptionHandler: `infrastructure/common/exception/GlobalExceptionHandler.java`
  — `@RestControllerAdvice` in infrastructure layer (Reactive variant — infra CAN import application DTOs)
- ErrorResponse: `application/service/dto/ErrorResponse.java`
## Code Generation
- Use EPS framework for code generation
- Entity → DAO → Repository → Service → Resource (annotated reactive controller)

## KHI NAO KHONG AP DUNG (When NOT to Apply)
- **DO NOT use Reactive/WebFlux** for simple CRUD applications — use blocking Spring MVC + virtual threads (Java 21+) instead. Reactive adds complexity without benefit when I/O concurrency is low.
- **DO NOT use R2DBC** if the project only does simple queries — JPA/Hibernate with virtual threads provides simpler code and better ecosystem support.
- **DO NOT use Hexagonal Architecture** for microservices with fewer than 3 modules — a simple layered architecture (Controller → Service → Repository) is sufficient.
- **DO NOT use Spring Modulith** for projects with fewer than 3 bounded contexts — the overhead of module boundaries and events is not justified.
