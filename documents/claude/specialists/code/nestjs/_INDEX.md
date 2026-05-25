# NestJS Specialist Index

> **Stack**: NestJS 10.x + TypeScript 5.x
> **Architecture**: Clean Architecture (4-layer)
> **Variant**: ALL (async-blocking, single variant)
> **specialistDir**: nestjs
> **Total**: 111 specialists (93 code + 18 test-plan), 27 folders
> **Pattern Range**: 0.x + 201.x–297.x
> **Architecture Master**: `architecture/nestjs-architecture-master-specialist.md` (Pattern 0.x)
> **Rules Template**: `defaults/rules/backend-nestjs.md`
> **Stack Config**: `defaults/config/stacks/typescript-nestjs.json`

---

## Architecture Master (Pattern 0.x) — START HERE

| Pattern | Specialist | File |
|---------|-----------|------|
| 0.1–0.6 | Architecture Master (Folder Tree, File Type Mapping, Dependency Rules, Feature Completeness) | `architecture/nestjs-architecture-master-specialist.md` |

---

## Code Specialist Registry (93 specialists)

### ai-ml/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 1 | nestjs-llm-integration | `ai-ml/nestjs-llm-integration-specialist.md` | 292.1–292.7 |

### analytics/ (2)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 2 | nestjs-analytics | `analytics/nestjs-analytics-specialist.md` | 296.1–296.6 |
| 3 | nestjs-nl-to-sql | `analytics/nestjs-nl-to-sql-specialist.md` | 297.1–297.6 |

### api/ (6)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 4 | nestjs-controller-routing | `api/nestjs-controller-routing-specialist.md` | 205.1–205.10 |
| 5 | nestjs-validation-pipes | `api/nestjs-validation-pipes-specialist.md` | 206.1–206.8 |
| 6 | nestjs-middleware-interceptors | `api/nestjs-middleware-interceptors-specialist.md` | 207.1–207.8 |
| 7 | nestjs-swagger-openapi | `api/nestjs-swagger-openapi-specialist.md` | 208.1–208.8 |
| 8 | nestjs-graphql | `api/nestjs-graphql-specialist.md` | 273.1–273.8 |
| 9 | nestjs-sse | `api/nestjs-sse-specialist.md` | 288.1–288.5 |

### application/ (3)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 10 | nestjs-service-patterns | `application/nestjs-service-patterns-specialist.md` | 270.1–270.8 |
| 11 | nestjs-mapper-patterns | `application/nestjs-mapper-patterns-specialist.md` | 271.1–271.6 |
| 12 | nestjs-use-case-orchestration | `application/nestjs-use-case-orchestration-specialist.md` | 272.1–272.7 |

### architecture/ (4)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 13 | **nestjs-architecture-master** | `architecture/nestjs-architecture-master-specialist.md` | **0.1–0.6** |
| 14 | nestjs-clean-architecture | `architecture/nestjs-clean-architecture-specialist.md` | 260.1–260.8 |
| 15 | nestjs-architecture-patterns | `architecture/nestjs-architecture-patterns-specialist.md` | 261.1–261.6 |
| 16 | nestjs-distributed-patterns | `architecture/nestjs-distributed-patterns-specialist.md` | 262.1–262.7 |

### blockchain/ (9)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 17 | chaincode-core | `blockchain/chaincode-core-specialist.md` | 221.1–221.10 |
| 18 | chaincode-advanced | `blockchain/chaincode-advanced-specialist.md` | 230.1–230.7 |
| 19 | chaincode-queries-keys | `blockchain/chaincode-queries-keys-specialist.md` | 231.1–231.8 |
| 20 | fabric-network-setup | `blockchain/fabric-network-setup-specialist.md` | 232.1–232.10 |
| 21 | fabric-gateway-transactions | `blockchain/fabric-gateway-transactions-specialist.md` | 233.1–233.10 |
| 22 | fabric-chaincode-lifecycle | `blockchain/fabric-chaincode-lifecycle-specialist.md` | 234.1–234.10 |
| 23 | fabric-sdk-client-gateway | `blockchain/fabric-sdk-client-gateway-specialist.md` | 235.1–235.8 |
| 24 | fabric-sdk-transactions-events | `blockchain/fabric-sdk-transactions-events-specialist.md` | 236.1–236.8 |
| 25 | fabric-sdk-wallet-identity | `blockchain/fabric-sdk-wallet-identity-specialist.md` | 237.1–237.8 |

### cache/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 26 | nestjs-caching-redis | `cache/nestjs-caching-redis-specialist.md` | 212.1–212.8 |

### cloud/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 27 | nestjs-cloud-aws | `cloud/nestjs-cloud-aws-specialist.md` | 263.1–263.5 |

### core/ (6)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 28 | nestjs-module-architecture | `core/nestjs-module-architecture-specialist.md` | 201.1–201.8 |
| 29 | nestjs-dependency-injection | `core/nestjs-dependency-injection-specialist.md` | 202.1–202.8 |
| 30 | nestjs-error-handling | `core/nestjs-error-handling-specialist.md` | 203.1–203.8 |
| 31 | nestjs-configuration | `core/nestjs-configuration-specialist.md` | 204.1–204.8 |
| 32 | nestjs-decorators-lifecycle | `core/nestjs-decorators-lifecycle-specialist.md` | 274.1–274.8 |
| 33 | nestjs-configuration-advanced | `core/nestjs-configuration-advanced-specialist.md` | 283.1–283.5 |

### cross-cutting/ (6)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 34 | nestjs-domain-events-saga | `cross-cutting/nestjs-domain-events-saga-specialist.md` | 227.1–227.10 |
| 35 | nestjs-observability | `cross-cutting/nestjs-observability-specialist.md` | 228.1–228.8 |
| 36 | nestjs-aop-interceptors | `cross-cutting/nestjs-aop-interceptors-specialist.md` | 240.1–240.8 |
| 37 | nestjs-event-emitter | `cross-cutting/nestjs-event-emitter-specialist.md` | 241.1–241.8 |
| 38 | nestjs-distributed-tracing | `cross-cutting/nestjs-distributed-tracing-specialist.md` | 281.1–281.6 |
| 39 | nestjs-auditing | `cross-cutting/nestjs-auditing-specialist.md` | 284.1–284.5 |

### data/ (8)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 40 | nestjs-typeorm-entity-relations | `data/nestjs-typeorm-entity-relations-specialist.md` | 209.1–209.8 |
| 41 | nestjs-typeorm-queries-migrations | `data/nestjs-typeorm-queries-migrations-specialist.md` | 209.9–209.18 |
| 42 | nestjs-database-patterns | `data/nestjs-database-patterns-specialist.md` | 225.1–225.8 |
| 43 | nestjs-data-migration | `data/nestjs-data-migration-specialist.md` | 229.1–229.12 |
| 44 | nestjs-prisma | `data/nestjs-prisma-specialist.md` | 267.1–267.6 |
| 45 | nestjs-websocket-gateway | `data/nestjs-websocket-gateway-specialist.md` | 275.1–275.12 |
| 46 | nestjs-transaction-patterns | `data/nestjs-transaction-patterns-specialist.md` | 279.1–279.7 |
| 47 | nestjs-query-optimization | `data/nestjs-query-optimization-specialist.md` | 280.1–280.6 |

### devops/ (4)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 48 | nestjs-ci-cd-patterns | `devops/nestjs-ci-cd-patterns-specialist.md` | 242.1–242.8 |
| 49 | nestjs-kubernetes | `devops/nestjs-kubernetes-specialist.md` | 243.1–243.8 |
| 50 | nestjs-docker-compose | `devops/nestjs-docker-compose-specialist.md` | 244.1–244.6 |
| 51 | nestjs-k8s-advanced | `devops/nestjs-k8s-advanced-specialist.md` | 295.1–295.6 |

### domain/ (5)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 52 | nestjs-lending-domain | `domain/nestjs-lending-domain-specialist.md` | 217.1–217.10 |
| 53 | nestjs-risk-scoring | `domain/nestjs-risk-scoring-specialist.md` | 218.1–218.8 |
| 54 | nestjs-insurance-domain | `domain/nestjs-insurance-domain-specialist.md` | 219.1–219.10 |
| 55 | nestjs-banking-fiat-gateway | `domain/nestjs-banking-fiat-gateway-specialist.md` | 220.1–220.8 |
| 56 | nestjs-cbac-authorization | `domain/nestjs-cbac-authorization-specialist.md` | 222.1–222.8 |

### file-handling/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 57 | nestjs-file-handling | `file-handling/nestjs-file-handling-specialist.md` | 286.1–286.6 |

### financial/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 58 | nestjs-financial-domain | `financial/nestjs-financial-domain-specialist.md` | 290.1–290.7 |

### gateway/ (3)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 59 | nestjs-api-gateway-discovery | `gateway/nestjs-api-gateway-discovery-specialist.md` | 226.1–226.8 |
| 60 | nestjs-http-client | `gateway/nestjs-http-client-specialist.md` | 266.1–266.8 |
| 61 | nestjs-api-gateway-advanced | `gateway/nestjs-api-gateway-advanced-specialist.md` | 294.1–294.6 |

### infrastructure/ (5)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 62 | nestjs-docker-deployment | `infrastructure/nestjs-docker-deployment-specialist.md` | 224.1–224.8 |
| 63 | nestjs-nx-monorepo | `infrastructure/nestjs-nx-monorepo-specialist.md` | 223.1–223.8 |
| 64 | nestjs-logging | `infrastructure/nestjs-logging-specialist.md` | 258.1–258.8 |
| 65 | nestjs-monitoring | `infrastructure/nestjs-monitoring-specialist.md` | 259.1–259.9 |
| 66 | nestjs-graceful-shutdown | `infrastructure/nestjs-graceful-shutdown-specialist.md` | 282.1–282.5 |

### language/ (5)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 67 | nestjs-typescript-fundamentals | `language/nestjs-typescript-fundamentals-specialist.md` | 245.1–245.8 |
| 68 | nestjs-typescript-patterns | `language/nestjs-typescript-patterns-specialist.md` | 246.1–246.8 |
| 69 | nestjs-code-quality | `language/nestjs-code-quality-specialist.md` | 247.1–247.6 |
| 70 | nestjs-async-concurrency | `language/nestjs-async-concurrency-specialist.md` | 278.1–278.7 |
| 71 | nestjs-design-patterns | `language/nestjs-design-patterns-specialist.md` | 285.1–285.8 |

### messaging/ (3)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 72 | nestjs-microservices-transport | `messaging/nestjs-microservices-transport-specialist.md` | 210.1–210.8 |
| 73 | nestjs-grpc-patterns | `messaging/nestjs-grpc-patterns-specialist.md` | 210.9–210.16 |
| 74 | nestjs-kafka-advanced | `messaging/nestjs-kafka-advanced-specialist.md` | 291.1–291.6 |

### orchestration/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 75 | nestjs-bff-orchestration | `orchestration/nestjs-bff-orchestration-specialist.md` | 216.1–216.8 |

### patterns/ (8)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 76 | nestjs-cqrs | `patterns/nestjs-cqrs-specialist.md` | 250.1–250.8 |
| 77 | nestjs-resilience-patterns | `patterns/nestjs-resilience-patterns-specialist.md` | 251.1–251.10 |
| 78 | nestjs-pagination | `patterns/nestjs-pagination-specialist.md` | 252.1–252.8 |
| 79 | nestjs-search-criteria | `patterns/nestjs-search-criteria-specialist.md` | 253.1–253.5 |
| 80 | nestjs-crud-base | `patterns/nestjs-crud-base-specialist.md` | 254.1–254.6 |
| 81 | nestjs-workflow-orchestration | `patterns/nestjs-workflow-orchestration-specialist.md` | 276.1–276.8 |
| 82 | nestjs-state-machine | `patterns/nestjs-state-machine-specialist.md` | 287.1–287.5 |
| 83 | nestjs-feature-flags | `patterns/nestjs-feature-flags-specialist.md` | 289.1–289.5 |

### performance/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 84 | nestjs-performance | `performance/nestjs-performance-specialist.md` | 255.1–255.8 |

### scheduling/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 85 | nestjs-scheduling-queues | `scheduling/nestjs-scheduling-queues-specialist.md` | 256.1–256.8 |

### search/ (1)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 86 | nestjs-elasticsearch | `search/nestjs-elasticsearch-specialist.md` | 257.1–257.6 |

### security/ (5)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 87 | nestjs-auth-guards | `security/nestjs-auth-guards-specialist.md` | 213.1–213.10 |
| 88 | nestjs-security-advanced | `security/nestjs-security-advanced-specialist.md` | 214.1–214.8 |
| 89 | nestjs-oauth2-oidc | `security/nestjs-oauth2-oidc-specialist.md` | 264.1–264.6 |
| 90 | nestjs-owasp-security | `security/nestjs-owasp-security-specialist.md` | 277.1–277.7 |
| 91 | nestjs-keycloak | `security/nestjs-keycloak-specialist.md` | 293.1–293.6 |

### testing/ (2)

| # | Specialist | File | Patterns |
|---|-----------|------|---------|
| 92 | nestjs-testing-unit-integration | `testing/nestjs-testing-unit-integration-specialist.md` | 211.1–211.10 |
| 93 | nestjs-testing-advanced | `testing/nestjs-testing-advanced-specialist.md` | 265.1–265.6 |

---

## Test Plan Registry (18 specialists)

### test-plan/ — Strategy Hubs (4)

| # | Specialist | File | Routes To |
|---|-----------|------|-----------|
| 94 | tps-nestjs-unit | `test-plan/tps-nestjs-unit.md` | unit-domain, unit-application, unit-infrastructure, unit-presentation |
| 95 | tps-nestjs-integration | `test-plan/tps-nestjs-integration.md` | integration-database, integration-messaging, integration-api-contract, e2e |
| 96 | tps-nestjs-security | `test-plan/tps-nestjs-security.md` | security-auth, security-owasp |
| 97 | tps-nestjs-performance | `test-plan/tps-nestjs-performance.md` | performance-load, performance-stress |

### test-plan/ — Unit Layer-Specific (4)

| # | Specialist | File | Layer |
|---|-----------|------|-------|
| 98 | tps-nestjs-unit-domain | `test-plan/tps-nestjs-unit-domain.md` | Domain (pure TS, no DI) |
| 99 | tps-nestjs-unit-application | `test-plan/tps-nestjs-unit-application.md` | Application (mock ports) |
| 100 | tps-nestjs-unit-infrastructure | `test-plan/tps-nestjs-unit-infrastructure.md` | Infrastructure (test containers) |
| 101 | tps-nestjs-unit-presentation | `test-plan/tps-nestjs-unit-presentation.md` | Presentation (mock use cases) |

### test-plan/ — Integration Concern-Specific (3)

| # | Specialist | File | Concern |
|---|-----------|------|---------|
| 102 | tps-nestjs-integration-database | `test-plan/tps-nestjs-integration-database.md` | Testcontainers + migrations + transactions |
| 103 | tps-nestjs-integration-messaging | `test-plan/tps-nestjs-integration-messaging.md` | Kafka/RabbitMQ round-trip + DLQ |
| 104 | tps-nestjs-integration-api-contract | `test-plan/tps-nestjs-integration-api-contract.md` | Pact + OpenAPI validation |

### test-plan/ — Security + Performance + Fintech (6)

| # | Specialist | File | Focus |
|---|-----------|------|-------|
| 105 | tps-nestjs-security-auth | `test-plan/tps-nestjs-security-auth.md` | JWT, RBAC matrix, guard bypass |
| 106 | tps-nestjs-security-owasp | `test-plan/tps-nestjs-security-owasp.md` | Injection, headers, rate limit, SSRF |
| 107 | tps-nestjs-performance-load | `test-plan/tps-nestjs-performance-load.md` | k6, 5 load profiles, CI |
| 108 | tps-nestjs-performance-stress | `test-plan/tps-nestjs-performance-stress.md` | Memory leak, event loop, GC |
| 109 | tps-nestjs-financial-integrity | `test-plan/tps-nestjs-financial-integrity.md` | Decimal.js, ledger, idempotency |
| 110 | tps-nestjs-concurrency | `test-plan/tps-nestjs-concurrency.md` | Race condition, double-funding, distributed lock |

### test-plan/ — E2E (1)

| # | Specialist | File | Focus |
|---|-----------|------|-------|
| 111 | tps-nestjs-e2e | `test-plan/tps-nestjs-e2e.md` | Supertest + test containers + auth helpers |

---

## Folder Summary

| Folder | Code | Test Plan | Total | Key Concerns |
|--------|------|-----------|-------|-------------|
| ai-ml | 1 | — | 1 | LLM integration |
| analytics | 2 | — | 2 | BI, NL-to-SQL |
| api | 6 | — | 6 | Controllers, validation, middleware, Swagger, GraphQL, SSE |
| application | 3 | — | 3 | Services, mappers, use cases |
| architecture | 4 | — | 4 | Architecture master (0.x), clean arch, patterns, distributed |
| blockchain | 9 | — | 9 | Hyperledger Fabric chaincode + SDK |
| cache | 1 | — | 1 | Redis |
| cloud | 1 | — | 1 | AWS |
| core | 6 | — | 6 | Modules, DI, errors, config, decorators, config advanced |
| cross-cutting | 6 | — | 6 | Events, observability, AOP, tracing, auditing |
| data | 8 | — | 8 | TypeORM, Prisma, migration, WebSocket, transactions, query opt |
| devops | 4 | — | 4 | CI/CD, K8s, Docker Compose, K8s advanced |
| domain | 5 | — | 5 | Lending, risk, insurance, banking, CBAC |
| file-handling | 1 | — | 1 | File upload/storage |
| financial | 1 | — | 1 | Financial/banking domain |
| gateway | 3 | — | 3 | API gateway, HTTP client |
| infrastructure | 5 | — | 5 | Docker, Nx, logging, monitoring, graceful shutdown |
| language | 5 | — | 5 | TypeScript, async, design patterns |
| messaging | 3 | — | 3 | Transport, gRPC, Kafka advanced |
| orchestration | 1 | — | 1 | BFF |
| patterns | 8 | — | 8 | CQRS, resilience, pagination, search, CRUD, workflow, FSM, flags |
| performance | 1 | — | 1 | Node.js/NestJS optimization |
| scheduling | 1 | — | 1 | Cron, Bull queues |
| search | 1 | — | 1 | Elasticsearch |
| security | 5 | — | 5 | Auth, advanced, OAuth2, OWASP, Keycloak |
| testing | 2 | — | 2 | Unit/integration, advanced |
| test-plan | — | 18 | 18 | 4 hubs + 4 unit layers + 3 integration + 2 security + 2 perf + 2 fintech + 1 E2E |
| **Total** | **93** | **18** | **111** | |

---

*NestJS Specialist Index | EPS v10.0*
*Updated: 2026-04-07 — FIX-NESTJS-SPECIALIST-COMPLETION + test-plan expansion*
*Parser: specialist-load.js reads this file for specialist discovery and Architecture Master resolution*
