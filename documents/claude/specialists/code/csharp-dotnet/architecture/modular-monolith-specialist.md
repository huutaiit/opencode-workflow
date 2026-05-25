# Modular Monolith Specialist — Generic
# モジュラーモノリススペシャリスト — 汎用
# Chuyen Gia Modular Monolith — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Module Isolation
**Aspect**: Architecture — Module Boundaries, Inter-Module Communication, Shared Kernel
**Purpose**: Consultation agent for /plan and /execute — Modular Monolith patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-layer — defines per-module 4-layer structure) |
| **Namespace Pattern** | `Modules.{Module}.*` |
| **Variant** | ALL |
| **Pattern Numbers** | 82.1–82.3 |
| **Source Paths** | `**/Modules/**/*.cs` |
| **File Count** | 4 projects per module |
| **Naming Convention** | Module-based folders |
| **Imports From** | N/A (each module is self-contained — cross-module via integration events only) |
| **Cannot Import** | N/A (defines inter-module boundaries — not subject to import restrictions itself) |
| **Imported By** | ALL (module boundaries inform all file placement) |
| **Dependencies** | None (architecture pattern) |
| **When To Use** | Module isolation, inter-module contracts, shared kernel, future microservices path |
| **Source Skeleton** | `src/Modules/{Module}/` |
| **Specialist Type** | architecture |
| **Purpose** | Define Modular Monolith structure with module isolation and inter-module event contracts |
| **Activation Trigger** | `phase: ALL; keywords: moduleBoundary, interModuleEvent, sharedKernel` |

---

## ROLE

**Your ONLY responsibility**: Enforce Modular Monolith standards — strong module boundaries, inter-module communication via integration events (not direct references), shared kernel for contracts only, and each module owns its own data.

---

## Patterns

### Pattern 82.1: Module Structure
> Source: E1 architecture

```
src/
├── Modules/
│   ├── Orders/
│   │   ├── Orders.Domain/
│   │   ├── Orders.Application/
│   │   ├── Orders.Infrastructure/
│   │   └── Orders.Api/
│   ├── Catalog/
│   │   ├── Catalog.Domain/
│   │   └── ...
│   └── SharedKernel/           # Contracts, integration events, base types
├── Host/                        # Single host that composes all modules
│   └── Program.cs
```

### Pattern 82.2: Inter-Module Communication — Events Only
> Source: E1 architecture

```csharp
// DO — Integration event in SharedKernel [E1]
public record OrderConfirmedIntegrationEvent(Guid OrderId, decimal Total);

// DO — Module A publishes
await mediator.Publish(new OrderConfirmedIntegrationEvent(order.Id, order.Total));

// DO — Module B subscribes
public class UpdateInventoryOnOrderConfirmed
    : INotificationHandler<OrderConfirmedIntegrationEvent>
{
    public Task Handle(OrderConfirmedIntegrationEvent e, CancellationToken ct) { /* ... */ }
}
```

```csharp
// DON'T — Direct cross-module reference [E1]
public class OrderService(ICatalogRepository catalogRepo)  // Orders depends on Catalog internals!
```

### Pattern 82.3: Each Module Owns Its Data
> Source: E1 architecture

```csharp
// DO — Separate DbContext per module [E1]
public class OrdersDbContext : DbContext { /* Orders tables only */ }
public class CatalogDbContext : DbContext { /* Catalog tables only */ }

// DON'T — Single shared DbContext across modules [E1]
public class AppDbContext : DbContext
{
    public DbSet<Order> Orders { get; set; }
    public DbSet<Product> Products { get; set; }  // Cross-module coupling!
}
```

---

## Architecture: Folder Tree

<!-- Parser-compatible alias for Pattern 82.1 -->

```
src/
├── Modules/
│   ├── Orders/
│   │   ├── Orders.Domain/
│   │   ├── Orders.Application/
│   │   ├── Orders.Infrastructure/
│   │   └── Orders.Api/
│   ├── Catalog/
│   │   ├── Catalog.Domain/
│   │   └── ...
│   └── SharedKernel/           # Contracts, integration events, base types
├── Host/                        # Single host that composes all modules
│   └── Program.cs
```

## Architecture: Dependency Rules

<!-- Parser-compatible alias for Pattern 82.2 -->

| From | Can Import | Cannot Import |
|------|-----------|--------------|
| Module.Domain | SharedKernel | Other Module.Domain, Application, Infrastructure, Api |
| Module.Application | Module.Domain, SharedKernel | Other Module.*, Infrastructure, Api |
| Module.Infrastructure | Module.Domain, Module.Application | Other Module.*, Api |
| Module.Api | Module.Application | Other Module.* (direct) |
| Host | All Module.Api, All Module.Infrastructure (DI registration) | Module internals |

FORBIDDEN:
- Direct cross-module references (use integration events via SharedKernel)
- Shared DbContext across modules
- Module A accessing Module B's database tables

## Architecture: File Type Mapping

<!-- Parser-compatible mapping for plan §0.1 -->

| File Type | Layer | Path Pattern |
|-----------|-------|-------------|
| Entity | Module.Domain | `Modules/{Module}/{Module}.Domain/Entities/*.cs` |
| Integration Event | SharedKernel | `Modules/SharedKernel/Events/*IntegrationEvent.cs` |
| Command/Query | Module.Application | `Modules/{Module}/{Module}.Application/Commands/*.cs` |
| Repository Impl | Module.Infrastructure | `Modules/{Module}/{Module}.Infrastructure/Repositories/*.cs` |
| DbContext | Module.Infrastructure | `Modules/{Module}/{Module}.Infrastructure/Data/*DbContext.cs` |
| Endpoint | Module.Api | `Modules/{Module}/{Module}.Api/Endpoints/*.cs` |
| Module DI | Module.Infrastructure | `Modules/{Module}/{Module}.Infrastructure/DependencyInjection.cs` |
| Program Entry | Host | `Host/Program.cs` |

## Architecture: Feature Completeness

<!-- Parser-compatible checklist for plan verification -->

### Rule 1: New Module → MUST have

- [ ] Module folder with 4-layer structure (Domain, Application, Infrastructure, Api)
- [ ] Own DbContext (no shared DbContext)
- [ ] DependencyInjection.cs for self-registration
- [ ] Integration events in SharedKernel for cross-module communication

### Rule 2: Cross-Module Communication → MUST use

- [ ] Integration events defined in SharedKernel
- [ ] No direct project references between modules
- [ ] Each module owns its data (separate DbContext)

### Rule 3: Validation

- [ ] No cross-module .csproj references (except SharedKernel)
- [ ] No shared DbContext across modules
- [ ] Host only references Module.Api and Module.Infrastructure (for DI)

---

*Modular Monolith Specialist v2.0 — Generic*
*Sources: E1 architecture*
*Pattern range: 82.1–82.3*
