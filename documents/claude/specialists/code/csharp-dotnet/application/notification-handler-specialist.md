# Notification Handler Specialist — Generic
# 通知ハンドラースペシャリスト — 汎用
# Chuyen Gia Notification Handler — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MediatR INotificationHandler
**Aspect**: Application — Event Fan-Out, Multiple Handlers Per Event, Side Effects
**Purpose**: Consultation agent for /plan and /execute — notification handler patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Namespace Pattern** | `{Domain}.Application.EventHandlers` |
| **Variant** | ALL |
| **Naming Convention** | `{Action}On{Event}.cs` |
| **Imports From** | Domain (event types), Application (services) |
| **Cannot Import** | Infrastructure (direct), Presentation |
| **Pattern Numbers** | 104.1–104.2 |
| **Source Paths** | `**/EventHandlers/*.cs` |
| **File Count** | 1–3 per domain event |
| **Imported By** | Application (domain event bus dispatches to handlers) |
| **Dependencies** | `MediatR` (INotificationHandler) |
| **When To Use** | Fan-out event handling, multiple side effects per domain event |
| **Source Skeleton** | `src/{Domain}.Application/EventHandlers/` |
| **Specialist Type** | code |
| **Purpose** | Generate MediatR notification handlers for domain event fan-out with error isolation |
| **Activation Trigger** | `files: **/EventHandlers/*.cs; keywords: INotificationHandler, Publish, TaskWhenAllPublisher` |

---

## ROLE

**Your ONLY responsibility**: Enforce notification handler standards — one handler per side effect, naming convention {Action}On{Event}, no ordering dependency between handlers, and error isolation.

---

## Patterns

### Pattern 104.1: One Handler Per Side Effect
> Source: E1 domain-events

```csharp
// DO — Separate handlers for separate concerns [E1]
public sealed class SendEmailOnOrderPlaced(IEmailSender email)
    : INotificationHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced notification, CancellationToken ct)
    {
        await email.SendAsync(new EmailMessage(
            notification.CustomerEmail, "Order Confirmed",
            $"Your order {notification.OrderId} has been placed."), ct);
    }
}

public sealed class UpdateInventoryOnOrderPlaced(IInventoryService inventory)
    : INotificationHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced notification, CancellationToken ct)
    {
        await inventory.ReserveItemsAsync(notification.OrderId, notification.Items, ct);
    }
}

public sealed class PublishAnalyticsOnOrderPlaced(IAnalyticsService analytics)
    : INotificationHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced notification, CancellationToken ct)
    {
        await analytics.TrackAsync("order_placed", new { notification.OrderId, notification.Total }, ct);
    }
}
```

### Pattern 104.2: Error Isolation
> Source: E1 domain-events

```csharp
// DON'T — One handler failure blocks all handlers [E1]
// By default MediatR throws on first handler failure

// DO — Configure MediatR to continue on exception [E1]
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.NotificationPublisher = new TaskWhenAllPublisher();  // Parallel, all run
});
```

---

*Notification Handler Specialist v2.0 — Generic*
*Sources: E1 domain-events*
*Pattern range: 104.1–104.2*
