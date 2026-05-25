---
memory: project
---
# .NET Core Specialists INDEX
# .NET Coreスペシャリスト INDEX
# .NET Core Specialists INDEX

> **Total**: 75 specialists across 21 categories
> **Stack**: .NET 8+ / ASP.NET Core 8.x | C# 12-14
> **Variants**: simplified-clean, clean-no-repo, clean-cqrs, clean-minimal-api
> **Architecture**: Clean Architecture, Vertical Slice, Modular Monolith, CQRS

## Quick Reference: Which Specialist?

| Task | Specialist | Pattern | Category |
|------|-----------|---------|----------|
| **APPLICATION** | | | |
| Business logic orchestration (non-CQRS) | service | 2.x | application/ |
| CQRS command handling | command-handler | 10.x | application/ |
| CQRS query handling | query-handler | 11.x | application/ |
| MediatR pipeline behaviors | pipeline-behavior | 12.x | application/ |
| Event fan-out, side effects | notification-handler | 104.x | application/ |
| FluentValidation, async validators | validation | 105.x | application/ |
| DTO design, mapping | dto-mapper | 5.x | application/ |
| **ARCHITECTURE** | | | |
| Architecture Master (Folder Tree, Mapping, Rules, Checklist) | clean-architecture | 80.x | architecture/clean-architecture-specialist.md |
| Feature folders, per-feature isolation | vertical-slice | 81.x | architecture/ |
| Module boundaries, inter-module events | modular-monolith | 82.x | architecture/ |
| Command/Query separation | cqrs | 83.x | architecture/ |
| **CACHING** | | | |
| Redis, IDistributedCache | distributed-cache | 97.x | caching/ |
| HybridCache, stampede protection (.NET 9) | hybrid-cache | 98.x | caching/ |
| Response caching, OutputCache middleware | output-cache | 99.x | caching/ |
| **CROSS-CUTTING** | | | |
| Custom middleware, pipeline ordering | middleware | 84.x | cross-cutting/ |
| Feature flags, gradual rollout | feature-management | 85.x | cross-cutting/ |
| Audit trail, change tracking | auditing | 86.x | cross-cutting/ |
| ProblemDetails, Result pattern, global errors | exception-handling | 63.3-63.4 | cross-cutting/ |
| **DATA ACCESS** | | | |
| EF Core DbContext, queries, compiled queries | ef-core | 64.x | data-access/ |
| Database migrations, deployment safety | ef-migrations | 64.5x | data-access/ |
| SaveChanges/DbCommand interceptors | ef-interceptor | 64.91–64.92 | data-access/ |
| Micro-ORM, raw SQL, stored procedures | dapper | 109.x | data-access/ |
| DDD repository, Specification pattern | repository | 3.x | data-access/ |
| SQL Server optimization, indexing | mssql | 64.8x | data-access/ |
| PostgreSQL JSONB, arrays, full-text search | postgresql | 110.x | data-access/ |
| **DEVOPS** | | | |
| Multi-stage Dockerfile, docker-compose | docker | 72.1-72.3 | devops/ |
| GitHub Actions/Azure DevOps pipelines | cicd | 72.4-72.7 | devops/ |
| .NET Aspire AppHost, service discovery | aspire-orchestration | 71.x | devops/ |
| **DOMAIN** | | | |
| Aggregate roots, entities, strongly-typed IDs | domain-entity | 1.1, 1.3, 1.5 | domain/ |
| Value objects, immutability, records | domain-value-object | 1.2 | domain/ |
| Domain events, dependency direction | domain-event | 1.4, 1.6, 1.7 | domain/ |
| Bounded contexts, specifications, ACL | ddd-aggregate | 70.x | domain/ |
| Custom exceptions, Result types | domain-exception | 111.x | domain/ |
| **GATEWAY** | | | |
| YARP reverse proxy, load balancing | yarp | 113.x | gateway/ |
| Ocelot API gateway, aggregation | ocelot | 114.x | gateway/ |
| **INFRASTRUCTURE** | | | |
| DI registration, keyed services, Scrutor | di-configuration | 65.1-65.3, 65.7 | infrastructure/ |
| Options pattern, ValidateOnStart | options-configuration | 65.4-65.6 | infrastructure/ |
| IHttpClientFactory, typed clients | http-client | 87.x | infrastructure/ |
| Blob storage, file uploads, streaming | file-storage | 88.x | infrastructure/ |
| SMTP, MailKit, email templating | email | 89.x | infrastructure/ |
| **LANGUAGE** | | | |
| C# fundamentals, records, patterns | csharp-fundamentals | 60.x | language/ |
| API design, analyzers, code quality | csharp-code-quality | 62.x | language/ |
| **MESSAGING** | | | |
| MassTransit, consumers, saga state machines | masstransit | 90.x | messaging/ |
| Wolverine convention-based messaging | wolverine | 91.x | messaging/ |
| Transactional outbox, deduplication | outbox-pattern | 92.x | messaging/ |
| In-process event dispatching | domain-event-bus | 93.x | messaging/ |
| **MULTITENANCY** | | | |
| Tenant resolution, data isolation | multitenancy | 116.x | multitenancy/ |
| **OBSERVABILITY** | | | |
| Serilog structured logging | serilog | 101.x | observability/ |
| OpenTelemetry traces/metrics/logs | opentelemetry | 102.x | observability/ |
| Aspire dashboard, ServiceDefaults | aspire-dashboard | 103.x | observability/ |
| **PERFORMANCE** | | | |
| Memory, Span, object pooling, hot paths | performance | 69.x | performance/ |
| Async patterns, Channels, IAsyncEnumerable | concurrency | 61.x | performance/ |
| **PRESENTATION** | | | |
| API controllers (non-Minimal API) | controller | 4.x | presentation/ |
| Minimal API, TypedResults, IEndpointGroup | minimal-api | 63.1-63.2, 63.5, 63.7 | presentation/ |
| GraphQL, HotChocolate, DataLoader | graphql | 106.x | presentation/ |
| gRPC, Protocol Buffers, streaming | grpc | 107.x | presentation/ |
| API versioning, deprecation | api-versioning | 63.6 | presentation/ |
| OpenAPI 3.1, Scalar UI | openapi-documentation | 108.x | presentation/ |
| **REALTIME** | | | |
| SignalR hubs, groups, Redis backplane | signalr | 14.x | realtime/ |
| Server-Sent Events, IAsyncEnumerable | sse | 112.x | realtime/ |
| **RESILIENCE** | | | |
| Polly v8, retry, circuit breaker, fallback | polly-resilience | 68.1-68.4, 68.6-68.7 | resilience/ |
| Rate limiting, fixed/sliding/token bucket | rate-limiting | 68.5 | resilience/ |
| Liveness/readiness probes, K8s health | health-check | 100.x | resilience/ |
| **SCHEDULING** | | | |
| Hangfire jobs, dashboard | hangfire | 94.x | scheduling/ |
| Quartz.NET CRON triggers, clustering | quartz | 95.x | scheduling/ |
| BackgroundService, Channel queues | background-service | 96.x | scheduling/ |
| **SEARCH** | | | |
| Elasticsearch indexing, full-text search | elasticsearch | 115.x | search/ |
| **SECURITY** | | | |
| JWT Bearer authentication | authentication | 66.1 | security/ |
| Policy-based authorization, claims | authorization | 66.2, 66.7 | security/ |
| Secrets, OWASP, PII, HTTPS | data-protection | 66.3-66.4, 66.6 | security/ |
| CORS policies, explicit origins | cors | 66.5 | security/ |
| Duende IdentityServer, OAuth2/OIDC | identity-server | 117.x | security/ |
| **TESTING** | | | |
| Unit tests, AAA, data builders | unit-testing | 67.3-67.5, 67.7-67.9 | testing/ |
| WebApplicationFactory, Testcontainers | integration-testing | 67.1-67.2, 67.6 | testing/ |
| NetArchTest, layer dependency rules | architecture-testing | 118.x | testing/ |

## Source Path → Specialist Lookup

| Source Path Pattern | Primary Specialist | Secondary |
|--------------------|--------------------|-----------|
| `**/Domain/Entities/**` | domain-entity | ddd-aggregate |
| `**/Domain/ValueObjects/**` | domain-value-object | — |
| `**/Domain/Events/**` | domain-event | domain-event-bus |
| `**/Domain/Exceptions/**` | domain-exception | exception-handling |
| `**/Application/Services/**` | service | — |
| `**/Application/Commands/**` | command-handler | pipeline-behavior |
| `**/Application/Queries/**` | query-handler | — |
| `**/Application/Validators/**` | validation | — |
| `**/Application/EventHandlers/**` | notification-handler | — |
| `**/Application/DTOs/**` | dto-mapper | — |
| `**/Infrastructure/Repositories/**` | repository | ef-core |
| `**/Infrastructure/Data/**` | ef-core | ef-migrations |
| `**/Infrastructure/Data/Interceptors/**` | ef-interceptor | auditing |
| `**/Infrastructure/Messaging/**` | masstransit | wolverine |
| `**/Infrastructure/Jobs/**` | hangfire | quartz |
| `**/Infrastructure/Workers/**` | background-service | — |
| `**/Infrastructure/HttpClients/**` | http-client | polly-resilience |
| `**/Infrastructure/Storage/**` | file-storage | — |
| `**/Infrastructure/Email/**` | email | — |
| `**/Infrastructure/Auth/**` | authentication | authorization |
| `**/Infrastructure/Security/**` | data-protection | — |
| `**/Controllers/**` | controller | — |
| `**/Endpoints/**` | minimal-api | api-versioning |
| `**/GraphQL/**` | graphql | — |
| `**/Protos/**`, `**/Services/*GrpcService*` | grpc | — |
| `**/Hubs/**` | signalr | — |
| `**/Middleware/**` | middleware | exception-handling |
| `**/Filters/**` | minimal-api | validation |
| `**/Program.cs` | di-configuration | middleware |
| `**/appsettings*.json` | options-configuration | — |
| `**/Dockerfile` | docker | — |
| `**/.github/workflows/**` | cicd | — |
| `**/AppHost/**` | aspire-orchestration | aspire-dashboard |
| `**/Migrations/**` | ef-migrations | — |
| `**/*.Tests/**` | unit-testing | integration-testing |
| `**/*.IntegrationTests/**` | integration-testing | — |
| `**/*.ArchTests/**` | architecture-testing | — |

## Variant → Specialist Mapping

| Variant | Core (always loaded) | Variant-specific |
|---------|---------------------|------------------|
| **ALL variants** | csharp-fundamentals, csharp-code-quality, concurrency, performance, ef-core, ef-migrations, ef-interceptor, mssql, di-configuration, options-configuration, authentication, authorization, data-protection, cors, polly-resilience, rate-limiting, health-check, middleware, exception-handling, serilog, opentelemetry, docker, cicd, unit-testing, integration-testing | — |
| **simplified-clean** | + clean-architecture | service, repository, controller, dto-mapper, domain-entity, domain-value-object, domain-event, ddd-aggregate |
| **clean-no-repo** | + clean-architecture | service, controller, dto-mapper, domain-entity, domain-value-object, domain-event |
| **clean-cqrs** | + clean-architecture, cqrs | command-handler, query-handler, pipeline-behavior, notification-handler, validation, controller, dto-mapper, domain-entity, domain-value-object, domain-event, domain-event-bus |
| **clean-minimal-api** | + clean-architecture | service, minimal-api, api-versioning, openapi-documentation, dto-mapper, domain-entity, domain-value-object, domain-event |

### On-Demand Specialists (loaded when detected)
| Specialist | Loaded When |
|-----------|-------------|
| graphql | HotChocolate detected |
| grpc | Grpc.AspNetCore detected |
| signalr | SignalR hub detected |
| sse | SSE endpoint detected |
| masstransit | MassTransit detected |
| wolverine | WolverineFx detected |
| outbox-pattern | MassTransit.EntityFrameworkCore detected |
| hangfire | Hangfire detected |
| quartz | Quartz detected |
| background-service | BackgroundService subclass detected |
| distributed-cache | StackExchange.Redis detected |
| hybrid-cache | Microsoft.Extensions.Caching.Hybrid detected |
| output-cache | OutputCache middleware detected |
| postgresql | Npgsql detected |
| dapper | Dapper detected |
| elasticsearch | Elastic.Clients detected |
| multitenancy | Finbuckle.MultiTenant detected |
| identity-server | Duende.IdentityServer detected |
| yarp | Yarp.ReverseProxy detected |
| ocelot | Ocelot detected |
| feature-management | Microsoft.FeatureManagement detected |
| auditing | IAuditable interface detected |
| vertical-slice | Features/ folder structure detected |
| modular-monolith | Modules/ folder structure detected |
| aspire-orchestration | Aspire.Hosting detected |
| aspire-dashboard | Aspire.ServiceDefaults detected |
| architecture-testing | NetArchTest detected |
| domain-exception | Custom domain exception hierarchy detected |
| http-client | IHttpClientFactory usage detected |
| file-storage | BlobServiceClient or S3 detected |
| email | MailKit or FluentEmail detected |

---

*Generated: 2026-03-30*
*.NET Core Specialists v2.0 — 75 files across 21 concern-based folders*
