---
paths:
  - "src/**/*.java"
  - "pom.xml"
---
# Java Backend Rules — Clean-Modulith
## Architecture
- Clean Architecture 4-Layer (domain / application / infrastructure / presentation)
- Spring Modulith — module boundaries enforced by @ApplicationModule + ModuleStructureTest
- Variant: **Clean-Modulith (Blocking + Virtual Threads)** — NOT Reactive, NOT JPA
- Spring Boot 3.5.3, Java 25, Spring Data JDBC + JdbcClient   # CONFIGURE: versions
## Layer Rules
- domain: NO framework imports, NO dependencies on other layers
- application: depends on domain ONLY. Defines Output Port interfaces (*Gateway)
- infrastructure: implements ports, framework configs. CANNOT import presentation
- presentation: controllers, DTOs, filters. CANNOT import infrastructure
## Naming
- UseCase: `{Name}UseCase.java` in `application/usecase/{feature}/`
- Port: `{Name}Gateway.java` in `application/port/`
- Adapter: `{Name}Gateway.java` or `{Name}Impl.java` in `infrastructure/adapter/`
- Config: `{Name}Configuration.java` or `{Name}Properties.java` in `infrastructure/config/`
- Controller: `{Name}Controller.java` in `presentation/controller/{feature}/`
- Repository: `{Name}Repository.java` in `infrastructure/persistence/`
## Auth
# CONFIGURE: choose auth strategy for your project
- X-API-Key / JWT Bearer / Keycloak SSO
## Response Format
# CONFIGURE: define your project's unified response envelope
- Unified: `{success, data, error, timestamp}`
- Error codes: E-series (E001-E009)
## Cross-cutting Presentation
- GlobalExceptionHandler: `presentation/controller/GlobalExceptionHandler.java`
  — cross-cutting @RestControllerAdvice, NOT per-feature sub-package
  (infrastructure CANNOT import presentation DTOs)
## DTO Sub-packages
# CONFIGURE: define your project's DTO organization
- `presentation/dto/common/` — shared DTOs (ApiResponse, ErrorDetail, PageResponse)
- `presentation/dto/{system}/` — per-system DTOs
