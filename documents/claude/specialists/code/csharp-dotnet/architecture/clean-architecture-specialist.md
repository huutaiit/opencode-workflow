# Clean Architecture Specialist — Generic
# クリーンアーキテクチャスペシャリスト — 汎用
# Chuyen Gia Clean Architecture — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Ardalis/JasonTaylor Templates
**Aspect**: Architecture — Layer Boundaries, Dependency Rule, Project Organization
**Purpose**: Consultation agent for /plan and /execute — Clean Architecture structure for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-layer — defines the 4-layer structure that all specialists follow) |
| **Namespace Pattern** | `{Domain}.*` (defines all namespaces) |
| **Variant** | ALL |
| **Pattern Numbers** | 80.1–80.3 |
| **Source Paths** | `src/{Domain}.*/` |
| **File Count** | 4 projects per solution |
| **Naming Convention** | N/A (defines structure, not files — architecture specialist) |
| **Imports From** | N/A (defines rules for all layers — not a code module with its own imports) |
| **Cannot Import** | N/A (defines the import rules themselves — not subject to import restrictions) |
| **Imported By** | ALL (structural decisions inform every specialist) |
| **Dependencies** | None (architecture pattern) |
| **When To Use** | Project structure, layer boundaries, dependency rule enforcement |
| **Source Skeleton** | `src/{Domain}.Domain/`, `src/{Domain}.Application/`, `src/{Domain}.Infrastructure/`, `src/{Domain}.Api/` |
| **Specialist Type** | architecture |
| **Purpose** | Define Clean Architecture 4-layer project structure with inward dependency rule |
| **Activation Trigger** | `phase: ALL; keywords: layerBoundary, dependencyRule, projectStructure` |

---

## ROLE

**Your ONLY responsibility**: Enforce Clean Architecture project structure — 4-layer separation (Domain, Application, Infrastructure, Presentation), inward dependency rule, and project reference enforcement.

---

## Patterns

### Pattern 80.1: 4-Layer Project Structure
> Source: E1-rules architecture

```
src/
├── {Domain}.Domain/           # Entities, Value Objects, Domain Events, Interfaces
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Events/
│   └── Interfaces/            # Repository interfaces (no implementation)
├── {Domain}.Application/      # Use Cases, Commands, Queries, DTOs, Validators
│   ├── Commands/
│   ├── Queries/
│   ├── DTOs/
│   ├── Behaviors/
│   └── Validators/
├── {Domain}.Infrastructure/   # EF Core, External Services, DI Registration
│   ├── Data/
│   ├── Repositories/
│   ├── Services/
│   └── DependencyInjection.cs
└── {Domain}.Api/              # Endpoints, Controllers, Middleware, Program.cs
    ├── Endpoints/
    ├── Middleware/
    └── Program.cs
tests/
├── {Domain}.Tests/
└── {Domain}.IntegrationTests/
```

### Pattern 80.2: Dependency Rule — Inward Only
> Source: E1-rules architecture

```
Domain → (nothing)
Application → Domain
Infrastructure → Domain, Application
Presentation (Api) → Application
```

```xml
<!-- DO — .csproj references enforce dependency rule [E1-rules] -->
<!-- {Domain}.Application.csproj -->
<ProjectReference Include="..\{Domain}.Domain\{Domain}.Domain.csproj" />

<!-- {Domain}.Infrastructure.csproj -->
<ProjectReference Include="..\{Domain}.Application\{Domain}.Application.csproj" />

<!-- {Domain}.Api.csproj -->
<ProjectReference Include="..\{Domain}.Application\{Domain}.Application.csproj" />
<ProjectReference Include="..\{Domain}.Infrastructure\{Domain}.Infrastructure.csproj" />
```

```xml
<!-- DON'T — Domain referencing Infrastructure [E1-rules] -->
<!-- {Domain}.Domain.csproj -->
<ProjectReference Include="..\{Domain}.Infrastructure\..." />  <!-- VIOLATION -->
```

### Pattern 80.3: Infrastructure DependencyInjection.cs
> Source: E1-rules architecture, E2 di

Infrastructure registers its own services via `AddInfrastructureServices()`. Api project calls it in Program.cs.

```csharp
// DO — Infrastructure self-registration [E2]
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(config.GetConnectionString("Default")));
        services.AddScoped<IOrderRepository, OrderRepository>();
        return services;
    }
}

// Program.cs
builder.Services.AddInfrastructureServices(builder.Configuration);
```

---

## Architecture: Folder Tree

<!-- Parser-compatible alias for Pattern 80.1 -->

```
src/
├── {Domain}.Domain/           # Entities, Value Objects, Domain Events, Interfaces
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Events/
│   └── Interfaces/            # Repository interfaces (no implementation)
├── {Domain}.Application/      # Use Cases, Commands, Queries, DTOs, Validators
│   ├── Commands/
│   ├── Queries/
│   ├── DTOs/
│   ├── Behaviors/
│   └── Validators/
├── {Domain}.Infrastructure/   # EF Core, External Services, DI Registration
│   ├── Data/
│   ├── Repositories/
│   ├── Services/
│   └── DependencyInjection.cs
└── {Domain}.Api/              # Endpoints, Controllers, Middleware, Program.cs
    ├── Endpoints/
    ├── Middleware/
    └── Program.cs
tests/
├── {Domain}.Tests/
└── {Domain}.IntegrationTests/
```

## Architecture: Dependency Rules

<!-- Parser-compatible alias for Pattern 80.2 -->

| From | Can Import | Cannot Import |
|------|-----------|--------------|
| Domain | (nothing — innermost layer) | Application, Infrastructure, Api |
| Application | Domain | Infrastructure, Api |
| Infrastructure | Domain, Application | Api |
| Presentation (Api) | Application | Domain (direct), Infrastructure (direct) |

FORBIDDEN:
- Domain → Infrastructure or Application (innermost layer depends on nothing)
- Application → Api or Infrastructure (use cases depend only on domain)
- Api → Domain directly (must go through Application layer)

## Architecture: File Type Mapping

<!-- Parser-compatible mapping for plan §0.1 -->

| File Type | Layer | Path Pattern |
|-----------|-------|-------------|
| Entity | Domain | `{Domain}.Domain/Entities/*.cs` |
| Value Object | Domain | `{Domain}.Domain/ValueObjects/*.cs` |
| Domain Event | Domain | `{Domain}.Domain/Events/*.cs` |
| Repository Interface | Domain | `{Domain}.Domain/Interfaces/I*Repository.cs` |
| Command/Query | Application | `{Domain}.Application/Commands/*.cs`, `Queries/*.cs` |
| DTO | Application | `{Domain}.Application/DTOs/*.cs` |
| Validator | Application | `{Domain}.Application/Validators/*.cs` |
| Pipeline Behavior | Application | `{Domain}.Application/Behaviors/*.cs` |
| Repository Impl | Infrastructure | `{Domain}.Infrastructure/Repositories/*.cs` |
| DbContext | Infrastructure | `{Domain}.Infrastructure/Data/*DbContext.cs` |
| External Service | Infrastructure | `{Domain}.Infrastructure/Services/*.cs` |
| DI Registration | Infrastructure | `{Domain}.Infrastructure/DependencyInjection.cs` |
| Endpoint/Controller | Presentation | `{Domain}.Api/Endpoints/*.cs` |
| Middleware | Presentation | `{Domain}.Api/Middleware/*.cs` |
| Program Entry | Presentation | `{Domain}.Api/Program.cs` |

## Architecture: Feature Completeness

<!-- Parser-compatible checklist for plan verification -->

### Rule 1: New Domain Feature → MUST have

- [ ] Entity in `{Domain}.Domain/Entities/`
- [ ] Repository interface in `{Domain}.Domain/Interfaces/`
- [ ] Command OR Query in `{Domain}.Application/Commands/` or `Queries/`
- [ ] Repository implementation in `{Domain}.Infrastructure/Repositories/`
- [ ] Endpoint in `{Domain}.Api/Endpoints/`

### Rule 2: Add Operation to Existing Feature → MUST have

- [ ] Command/Query handler in Application layer
- [ ] Endpoint in Api layer
- [ ] Unit test in `{Domain}.Tests/`

### Rule 3: Validation

- [ ] All .csproj references follow inward dependency rule (Pattern 80.2)
- [ ] No Domain → Infrastructure references
- [ ] No Application → Api references

---

*Clean Architecture Specialist v2.0 — Generic*
*Sources: E1-rules architecture, E2 di*
*Pattern range: 80.1–80.3*
