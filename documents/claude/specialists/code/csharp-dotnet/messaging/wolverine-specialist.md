# Wolverine Specialist — Generic
# Wolverineスペシャリスト — 汎用
# Chuyen Gia Wolverine — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Wolverine (JasperFx)
**Aspect**: Messaging — Convention-Based Handlers, Mediator + Messaging Unified, Marten Integration
**Purpose**: Consultation agent for /plan and /execute — Wolverine messaging for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Application.Handlers` |
| **Variant** | ALL |
| **Pattern Numbers** | 91.1–91.2 |
| **Source Paths** | `**/Handlers/*.cs` |
| **File Count** | 1 per message type |
| **Naming Convention** | `{Command}Handler` (convention) |
| **Imports From** | Domain (entity types), Application (message types) |
| **Cannot Import** | Presentation (no messaging in endpoints) |
| **Imported By** | Application (bus invokes handlers) |
| **Dependencies** | `WolverineFx`, `WolverineFx.RabbitMQ` (optional) |
| **When To Use** | Convention-based handlers, unified mediator + messaging, Marten integration |
| **Source Skeleton** | `src/{Domain}.Application/Handlers/` |
| **Specialist Type** | code |
| **Purpose** | Generate Wolverine convention-based handlers with unified mediator + messaging |
| **Activation Trigger** | `files: **/Handlers/*.cs; keywords: WolverineFx, UseWolverine, HandleAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce Wolverine standards — convention-based handlers (no interface required), unified in-process mediator + external messaging, and Marten event sourcing integration.

---

## Patterns

### Pattern 91.1: Convention-Based Handlers
> Source: E1 wolverine

```csharp
// DO — No interface needed, just method signature [E1]
public static class CreateOrderHandler
{
    public static async Task<OrderResponse> HandleAsync(
        CreateOrderCommand command, AppDbContext db, CancellationToken ct)
    {
        var order = Order.Place(command.CustomerId);
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return new OrderResponse(order.Id);
    }
}

// Setup
builder.Host.UseWolverine(opts =>
{
    opts.Discovery.IncludeAssembly(typeof(CreateOrderHandler).Assembly);
});

// Send
await bus.InvokeAsync<OrderResponse>(new CreateOrderCommand("customer-1"));
```

### Pattern 91.2: External Messaging
> Source: E1 wolverine

```csharp
// DO — Same handler works for in-process AND external [E1]
opts.ListenToRabbitQueue("orders");
opts.PublishMessage<OrderPlaced>().ToRabbitExchange("events");
```

---

*Wolverine Specialist v2.0 — Generic*
*Sources: E1 wolverine*
*Pattern range: 91.1–91.2*
