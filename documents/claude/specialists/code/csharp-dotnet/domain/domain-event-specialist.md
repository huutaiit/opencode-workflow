# Domain Event Specialist — Clean Architecture
# ドメインイベントスペシャリスト — クリーンアーキテクチャ
# Chuyen Gia Domain Event — Clean Architecture

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Clean Architecture)
**Technology**: C# 12-14, MediatR INotification
**Aspect**: Domain Layer — Domain Events, Event Raising, Side Effects
**Purpose**: Consultation agent for /plan and /execute — domain event patterns for Clean Architecture

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Namespace Pattern** | `{Domain}.Domain.Events` |
| **Variant** | ALL |
| **Naming Convention** | `{Entity}{Action}.cs` (sealed record) |
| **Imports From** | None (Domain depends on nothing) |
| **Cannot Import** | Application, Infrastructure, Presentation |
| **Pattern Numbers** | 1.4, 1.6, 1.7 |
| **Source Paths** | `**/Domain/Events/*.cs` |
| **File Count** | 1 per significant state change |
| **Imported By** | Application (notification handlers subscribe to events) |
| **Dependencies** | `MediatR` (INotification) |
| **When To Use** | Domain event raising, eventual consistency, side effect decoupling |
| **Source Skeleton** | `src/{Domain}.Domain/Events/` |
| **Specialist Type** | code |
| **Purpose** | Generate domain event records and establish dependency direction rules |
| **Activation Trigger** | `files: **/Domain/Events/*.cs; keywords: IDomainEvent, RaiseDomainEvent, INotification` |

---

## ROLE

**Your ONLY responsibility**: Enforce domain event standards — raise events when meaningful state changes occur, events are past-tense records, side effects subscribe in Application layer, and domain layer defines contracts only.

---

## Patterns

### Pattern 1.4: Domain Events
> Source: E1 ddd

Raise events when something meaningful happens. Side effects subscribe, aggregate stays focused.

```csharp
// DO — Domain event as sealed record [E1]
public sealed record OrderPlaced(Guid OrderId, CustomerId CustomerId, DateTimeOffset OccurredAt);
public sealed record OrderConfirmed(Guid OrderId);
public sealed record OrderCancelled(Guid OrderId, string Reason);

// DO — Raise in aggregate [E1]
order.RaiseDomainEvent(new OrderPlaced(order.Id, customerId, now));
```

```csharp
// DON'T — Send emails directly from domain [E1]
public class Order
{
    public void Confirm(IEmailService emailService)  // Domain knows about infrastructure!
    {
        Status = OrderStatus.Confirmed;
        emailService.Send(...);  // Side effect in domain
    }
}

// DON'T — Future-tense event names [E1]
public record OrderWillBeConfirmed(Guid OrderId);  // Events are facts, past tense
```

### Pattern 1.6: Dependency Direction — Domain Depends on Nothing
> Source: E1-rules architecture

```
Domain → (nothing)
Application → Domain
Infrastructure → Application
Presentation → Application
```

```csharp
// DON'T — Domain referencing infrastructure [E1-rules]
public class Order
{
    public async Task Save(AppDbContext db) { }  // Domain should NOT know about persistence
}
```

### Pattern 1.7: Shared Kernel — Contracts Only
> Source: E1-rules architecture

Shared kernel holds interfaces, DTOs, integration event definitions. Never business logic.

```csharp
// DO — Shared contract [E1-rules]
public interface IOrderPlaced { Guid OrderId { get; } DateTimeOffset OccurredAt { get; } }

// DON'T — Business logic in shared kernel [E1-rules]
public static class PricingCalculator { /* business rules */ }
```

---

*Domain Event Specialist v2.0 — Clean Architecture*
*Sources: E1 ddd, E1-rules architecture*
*Pattern range: 1.4, 1.6, 1.7*
