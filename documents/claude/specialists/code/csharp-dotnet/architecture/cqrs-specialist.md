# CQRS Specialist — Generic
# CQRSスペシャリスト — 汎用
# Chuyen Gia CQRS — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MediatR, CQRS
**Aspect**: Architecture — Command/Query Separation, Read/Write Models, Eventual Consistency
**Purpose**: Consultation agent for /plan and /execute — CQRS architectural patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-layer — defines read/write separation across Application and Domain layers) |
| **Namespace Pattern** | `{Domain}.Application.{Commands,Queries}` |
| **Variant** | ALL |
| **Pattern Numbers** | 83.1–83.3 |
| **Source Paths** | `**/Commands/**/*.cs, **/Queries/**/*.cs` |
| **File Count** | Depends on feature count |
| **Naming Convention** | N/A (defines read/write separation, not file naming — architecture specialist) |
| **Imports From** | N/A (defines read/write model separation — not a code module with its own imports) |
| **Cannot Import** | N/A (defines the CQRS boundaries — not subject to import restrictions itself) |
| **Imported By** | ALL (read/write separation informs handler + data access design) |
| **Dependencies** | `MediatR` |
| **When To Use** | Command/Query separation, different read/write models, eventual consistency |
| **Source Skeleton** | `src/{Domain}.Application/Commands/`, `src/{Domain}.Application/Queries/` |
| **Specialist Type** | architecture |
| **Purpose** | Define CQRS command/query separation with independent read and write model paths |
| **Activation Trigger** | `phase: ALL; keywords: commandQuery, readModel, writeModel, eventualConsistency` |

---

## ROLE

**Your ONLY responsibility**: Enforce CQRS architectural standards — commands modify state (return Result), queries are read-only (return DTOs), separate models for read/write, and clear boundary between command and query paths.

---

## Patterns

### Pattern 83.1: Command vs Query Separation
> Source: E1 cqrs

```csharp
// DO — Commands modify state, return Result [E1]
public record CreateOrderCommand(string CustomerId, List<ItemDto> Items) : IRequest<Result<Guid>>;

// DO — Queries are read-only, return DTOs [E1]
public record GetOrderQuery(Guid Id) : IRequest<Result<OrderDto>>;

// DO — Queries can use optimized read path [E1]
public sealed class GetOrderHandler(AppDbContext db) : IRequestHandler<GetOrderQuery, Result<OrderDto>>
{
    public async Task<Result<OrderDto>> Handle(GetOrderQuery query, CancellationToken ct)
    {
        var dto = await db.Orders
            .Where(o => o.Id == query.Id)
            .Select(o => new OrderDto(o.Id, o.Status.ToString(), o.Total))  // Projection, no tracking
            .FirstOrDefaultAsync(ct);
        return dto is not null ? Result.Success(dto) : Result.Failure<OrderDto>("Not found");
    }
}
```

```csharp
// DON'T — Query that modifies state [E1]
public class GetOrderHandler : IRequestHandler<GetOrderQuery, OrderDto>
{
    public async Task<OrderDto> Handle(GetOrderQuery query, CancellationToken ct)
    {
        var order = await db.Orders.FindAsync(query.Id);
        order.LastAccessedAt = DateTime.UtcNow;  // Side effect in a query!
        await db.SaveChangesAsync(ct);
        return MapToDto(order);
    }
}
```

### Pattern 83.2: Read Model vs Write Model
> Source: E1 cqrs

```csharp
// DO — Write model: rich domain entity [E1]
public sealed class Order : AggregateRoot  // Full behavior, invariants
{
    public Result AddLine(...) { /* validates, updates Total */ }
    public Result Confirm() { /* checks status, raises event */ }
}

// DO — Read model: flat DTO for queries [E1]
public record OrderDto(Guid Id, string Status, decimal Total, int ItemCount);
// No behavior, no navigation properties, query-optimized
```

### Pattern 83.3: When NOT to Use CQRS
> Source: E1 cqrs

| Use CQRS When | Don't Use When |
|----------------|---------------|
| Read/write patterns differ significantly | Simple CRUD with identical read/write shapes |
| Read performance needs dedicated optimization | Small domain with few entities |
| Event sourcing or audit trail needed | Team unfamiliar with the pattern |
| Complex business rules on writes | Prototype or MVP |

---

## Architecture: Folder Tree

<!-- Parser-compatible alias for Pattern 83.1 -->

```
src/
├── {Domain}.Application/
│   ├── Commands/
│   │   └── {Feature}/
│   │       ├── {Feature}Command.cs
│   │       └── {Feature}CommandHandler.cs
│   └── Queries/
│       └── {Feature}/
│           ├── {Feature}Query.cs
│           └── {Feature}QueryHandler.cs
├── {Domain}.Domain/
│   ├── Entities/           # Write model (rich domain entities)
│   └── Events/
└── {Domain}.Api/
    └── Endpoints/          # Separate command/query endpoints
```

## Architecture: Dependency Rules

<!-- Parser-compatible alias for Pattern 83.1-83.2 -->

| From | Can Import | Cannot Import |
|------|-----------|--------------|
| Command Handler | Domain entities, Domain events | Query handlers, Read models |
| Query Handler | DbContext (read-only), Read DTOs | Domain entities (for write), Command handlers |
| Read Model (DTO) | (nothing — flat projection) | Domain entities, write logic |
| Write Model (Entity) | Domain events, value objects | Read DTOs |

FORBIDDEN:
- Query handlers that modify state (no SaveChanges in queries)
- Command handlers that return full entity/DTO (return Result<Id> or Result only)
- Mixing read and write models in the same handler

## Architecture: File Type Mapping

<!-- Parser-compatible mapping for plan §0.1 -->

| File Type | Layer | Path Pattern |
|-----------|-------|-------------|
| Command | Application | `{Domain}.Application/Commands/{Feature}/{Feature}Command.cs` |
| Command Handler | Application | `{Domain}.Application/Commands/{Feature}/{Feature}CommandHandler.cs` |
| Query | Application | `{Domain}.Application/Queries/{Feature}/{Feature}Query.cs` |
| Query Handler | Application | `{Domain}.Application/Queries/{Feature}/{Feature}QueryHandler.cs` |
| Write Model | Domain | `{Domain}.Domain/Entities/*.cs` |
| Read DTO | Application | `{Domain}.Application/DTOs/*Dto.cs` |

## Architecture: Feature Completeness

<!-- Parser-compatible checklist for plan verification -->

### Rule 1: New Write Operation → MUST have

- [ ] Command record in `Commands/{Feature}/`
- [ ] CommandHandler returning `Result<T>` (not full DTO)
- [ ] POST/PUT/DELETE endpoint
- [ ] Domain entity with behavior (not anemic)

### Rule 2: New Read Operation → MUST have

- [ ] Query record in `Queries/{Feature}/`
- [ ] QueryHandler using projection (`.Select()`, `AsNoTracking()`)
- [ ] GET endpoint returning DTO (not entity)

### Rule 3: Validation

- [ ] No `SaveChangesAsync` in query handlers
- [ ] No full entity returns from command handlers
- [ ] Commands and queries in separate namespace folders

---

*CQRS Specialist v2.0 — Generic*
*Sources: E1 cqrs*
*Pattern range: 83.1–83.3*
