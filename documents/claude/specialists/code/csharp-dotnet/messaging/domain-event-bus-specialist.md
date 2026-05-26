# Domain Event Bus Specialist — Generic
# ドメインイベントバススペシャリスト — 汎用
# Chuyen Gia Domain Event Bus — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MediatR INotification
**Aspect**: Messaging — In-Process Event Dispatching, Module-to-Module Events
**Purpose**: Consultation agent for /plan and /execute — in-process domain event dispatching

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Events` |
| **Variant** | ALL |
| **Pattern Numbers** | 93.1–93.2 |
| **Source Paths** | `**/Events/*.cs, **/Interceptors/*.cs` |
| **File Count** | 1 dispatcher interceptor |
| **Naming Convention** | `DomainEventDispatcher.cs` |
| **Imports From** | Domain (event types), Infrastructure (DbContext) |
| **Cannot Import** | Presentation |
| **Imported By** | Application (domain events dispatched to notification handlers) |
| **Dependencies** | `MediatR` (INotification) |
| **When To Use** | In-process event fan-out, EF Core SaveChanges dispatch, module-to-module events |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Events/` |
| **Specialist Type** | code |
| **Purpose** | Generate in-process domain event dispatcher via EF Core SaveChanges interceptor |
| **Activation Trigger** | `files: **/Events/*.cs, **/Interceptors/*.cs; keywords: IPublisher, DomainEvent, SavedChangesAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce domain event dispatching — collect events from aggregates, dispatch after SaveChanges via interceptor, and use MediatR Publish for in-process fan-out.

---

## Patterns

### Pattern 93.1: Dispatch After SaveChanges
> Source: E1 domain-events

```csharp
// DO — Interceptor dispatches domain events after SaveChanges [E1]
public sealed class DomainEventDispatcher(IPublisher publisher) : SaveChangesInterceptor
{
    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken ct)
    {
        var domainEvents = eventData.Context!.ChangeTracker.Entries<AggregateRoot>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();

        foreach (var domainEvent in domainEvents)
            await publisher.Publish(domainEvent, ct);

        foreach (var entry in eventData.Context.ChangeTracker.Entries<AggregateRoot>())
            entry.Entity.ClearDomainEvents();

        return result;
    }
}
```

### Pattern 93.2: Handler Registration
> Source: E1 domain-events

```csharp
// DO — Multiple handlers per event [E1]
public sealed class SendEmailOnOrderPlaced(IEmailSender email)
    : INotificationHandler<OrderPlaced>
{
    public Task Handle(OrderPlaced e, CancellationToken ct) => /* send email */;
}

public sealed class UpdateInventoryOnOrderPlaced(IInventoryService inventory)
    : INotificationHandler<OrderPlaced>
{
    public Task Handle(OrderPlaced e, CancellationToken ct) => /* update stock */;
}
```

---

*Domain Event Bus Specialist v2.0 — Generic*
*Sources: E1 domain-events*
*Pattern range: 93.1–93.2*
