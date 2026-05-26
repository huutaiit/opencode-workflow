---
paths:
  - "backend/**/*.ts"
  - "apps/**/*.ts"
  - "libs/**/*.ts"
  - "src/**/*.ts"
---
# NestJS Backend Rules — Clean Architecture
# DERIVED FROM: nestjs-architecture-master-specialist.md (Pattern 0.x)

## Architecture
- NestJS 10.x, TypeScript 5.x, Node.js 20+   # CONFIGURE: versions
- Clean Architecture 4-Layer (Domain, Application, Infrastructure, Presentation)
- Variant: **async-blocking** (single variant)
- ORM: TypeORM                                  # CONFIGURE: TypeORM or Prisma
- Monorepo: Nx (optional)                       # CONFIGURE: Nx or standalone

## Layer Rules
# DERIVED FROM: Architecture Master Pattern 0.4 (Dependency Rules)
- domain: entities, value objects, ports, exceptions, events. Pure TypeScript — NO framework imports, NO decorators. Imports NOTHING external.
- application: use cases, services, DTOs, mappers, commands, queries, sagas, workflows. Depends on domain ONLY. CANNOT import infrastructure or presentation.
- infrastructure: persistence (repos), messaging, external clients, config, cache, auth, logging, observability. Implements domain ports. CANNOT import presentation.
- presentation: controllers, resolvers, gateways, guards, interceptors, filters, pipes, middleware. Imports application (use cases). CANNOT import infrastructure directly.

## Naming
# DERIVED FROM: Architecture Master Pattern 0.3 (File Type Mapping)
- UseCase: `{action}-{entity}.use-case.ts` → `{Action}{Entity}UseCase` with `execute()` method
- DTO: `{action}-{entity}.dto.ts` → `{Action}{Entity}Dto` (class-validator)
- Controller: `{entity}.controller.ts` → `{Entity}Controller`
- Port: `{name}.port.ts` → `{Name}Port` (interface + Symbol token)
- Repository: `{entity}.repository.ts` → `TypeOrm{Entity}Repository` implements `{Entity}Port`
- Domain Entity: `{entity}.entity.ts` → `{Entity}` (pure TS, NO @Entity decorator)
- ORM Entity: `infrastructure/persistence/entities/{entity}.entity.ts` → `{Entity}Entity` (@Entity)
- Mapper: `{entity}.mapper.ts` → `{Entity}Mapper`
- Module: `{feature}.module.ts` → `{Feature}Module`
- Guard: `{strategy}.guard.ts` → `{Strategy}Guard`

## DI Convention
# DERIVED FROM: Innovate Decision D3 (Convention Canonical Rules)
- Parameter order: Ports/Repos FIRST → Adapters/Services → Framework → Logger LAST
- UseCase ONLY in application layer (prevent God class)
- DI token: `Symbol('TOKEN_NAME')` — NEVER string token
- Module exports: Ports ONLY — NOT Use Cases

## Auth
# CONFIGURE: choose auth strategy
- Keycloak SSO with Passport strategies
- JWT + Guards (@nestjs/passport, @nestjs/jwt)
- OAuth2/OIDC (@nestjs/passport + openid-client)

## Response Format
- Controllers return typed DTOs (not raw entities)
- Use interceptors for response transformation
- Global exception filter for error response format

## Modules
# CONFIGURE: list your NestJS modules
- {module-name}.module.ts — one module per bounded context
- Shared module: @Global() only for cross-cutting (config, logging)

## Cross-cutting
- Logging: Pino / Winston with correlation ID propagation
- Validation: class-validator + class-transformer (ValidationPipe global)
- Caching: @nestjs/cache-manager with Redis
- File handling: Multer with storage abstraction (S3, local FS)
- Analytics: Business metrics via custom decorators, complex reports delegate to Python service
- AI/ML: LLM integration via dedicated port/adapter in infrastructure
- Security: OWASP hardening, helmet.js, @nestjs/throttler
- Auditing: Entity change tracking via TypeORM subscribers

## KHI NAO KHONG AP DUNG (When NOT to Apply)
- DO NOT use Clean Architecture for simple CRUD microservices (<5 entities) — use standard NestJS modules
- DO NOT split monorepo if <3 services — use single app with module boundaries
- DO NOT create separate ORM entity + domain entity if entity has no business logic — pragmatic compromise allowed
