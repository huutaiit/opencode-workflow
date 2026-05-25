# Domain Entity Specialist — Clean Architecture
# ドメインエンティティスペシャリスト — クリーンアーキテクチャ
# Chuyen Gia Entity Domain — Clean Architecture

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Clean Architecture)
**Technology**: C# 12-14, DDD Tactical Patterns
**Aspect**: Domain Layer — Aggregate Roots, Entities, Strongly-Typed IDs, Result Pattern
**Purpose**: Consultation agent for /plan and /execute — entity and aggregate patterns for Clean Architecture

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Namespace Pattern** | `{Domain}.Domain.Entities` |
| **Variant** | ALL |
| **Naming Convention** | `{Entity}.cs` (sealed class) |
| **Imports From** | None (Domain depends on nothing) |
| **Cannot Import** | Application, Infrastructure, Presentation |
| **Pattern Numbers** | 1.1, 1.3, 1.5 |
| **Source Paths** | `**/Domain/Entities/*.cs, **/Domain/Aggregates/*.cs` |
| **File Count** | 5–20 per bounded context |
| **Imported By** | Application (handlers create/modify entities) |
| **Dependencies** | None (DDD pattern — no external packages) |
| **When To Use** | Aggregate roots, entities, strongly-typed IDs, invariant enforcement |
| **Source Skeleton** | `src/{Domain}.Domain/Entities/`, `src/{Domain}.Domain/Common/` |
| **Specialist Type** | code |
| **Purpose** | Generate DDD aggregate roots with factory methods, strongly-typed IDs, and Result pattern |
| **Activation Trigger** | `files: **/Domain/Entities/*.cs, **/Domain/Aggregates/*.cs; keywords: AggregateRoot, Entity, StronglyTypedId` |

---

## ROLE

**Your ONLY responsibility**: Enforce aggregate root and entity standards — factory methods for creation, invariant enforcement, strongly-typed IDs, Result pattern for domain failures, and encapsulation of children behind the aggregate root.

---

## Patterns

### Pattern 1.1: Aggregate Root — Sole Entry Point
> Source: E1 ddd

Aggregate root owns all access to children. Enforces invariants in a single transaction. Factory methods for creation.

```csharp
// DO — Aggregate root with factory method and invariants [E1]
public sealed class Order : AggregateRoot
{
    private readonly List<OrderLine> _lines = [];
    public OrderNumber Number { get; private set; } = null!;
    public CustomerId CustomerId { get; private set; }
    public Money Total { get; private set; } = Money.Zero("USD");
    public OrderStatus Status { get; private set; }
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();

    private Order() { }  // EF Core

    public static Order Place(CustomerId customerId, OrderNumber number, DateTimeOffset now)
    {
        var order = new Order
        {
            Id = Guid.CreateVersion7(), CustomerId = customerId,
            Number = number, Status = OrderStatus.Placed, PlacedAt = now
        };
        order.RaiseDomainEvent(new OrderPlaced(order.Id, customerId, now));
        return order;
    }

    public Result AddLine(ProductId productId, int quantity, Money unitPrice)
    {
        if (Status is not OrderStatus.Placed)
            return Result.Failure("Cannot modify a confirmed order");
        if (quantity <= 0)
            return Result.Failure("Quantity must be positive");
        _lines.Add(new OrderLine(productId, quantity, unitPrice));
        RecalculateTotal();
        return Result.Success();
    }
}
```

### Pattern 1.3: Strongly-Typed IDs
> Source: E1 ddd

Prevent mixing up GUIDs from different entities.

```csharp
// DO — Readonly record struct for IDs [E1]
public readonly record struct CustomerId(Guid Value)
{
    public static CustomerId New() => new(Guid.CreateVersion7());
    public override string ToString() => Value.ToString();
}
public readonly record struct OrderId(Guid Value);
public readonly record struct ProductId(Guid Value);
```

### Pattern 1.5: Result Pattern in Domain
> Source: E1 ddd

Return `Result` from domain methods for expected failures (validation, state violations).

```csharp
// DO — Result from domain method [E1]
public Result Confirm()
{
    if (Status is not OrderStatus.Placed)
        return Result.Failure("Only placed orders can be confirmed");
    if (_lines.Count == 0)
        return Result.Failure("Cannot confirm an order with no lines");
    Status = OrderStatus.Confirmed;
    RaiseDomainEvent(new OrderConfirmed(Id));
    return Result.Success();
}
```

---

*Domain Entity Specialist v2.0 — Clean Architecture*
*Sources: E1 ddd, E5 ddd-dotnet*
*Pattern range: 1.1, 1.3, 1.5*
