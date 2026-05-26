# Outbox Pattern Specialist — Generic
# Outboxパターンスペシャリスト — 汎用
# Chuyen Gia Outbox Pattern — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MassTransit Outbox, EF Core
**Aspect**: Messaging — Transactional Outbox, Inbox, Message Deduplication
**Purpose**: Consultation agent for /plan and /execute — outbox pattern for reliable messaging

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Outbox` |
| **Variant** | ALL |
| **Pattern Numbers** | 92.1–92.2 |
| **Source Paths** | `**/Outbox/*.cs, **/Migrations/*.cs` |
| **File Count** | 1 outbox config + migration |
| **Naming Convention** | `OutboxMessage.cs`, `OutboxDbContext.cs` |
| **Imports From** | Infrastructure (DbContext, MassTransit) |
| **Cannot Import** | Domain, Presentation |
| **Imported By** | Infrastructure (message delivery service publishes after commit) |
| **Dependencies** | `MassTransit.EntityFrameworkCore` |
| **When To Use** | Reliable messaging with DB transactions, at-least-once delivery, deduplication |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Outbox/` |
| **Specialist Type** | code |
| **Purpose** | Generate transactional outbox pattern with MassTransit EF Core for reliable messaging |
| **Activation Trigger** | `files: **/Outbox/*.cs; keywords: AddEntityFrameworkOutbox, UseBusOutbox, OutboxMessage` |

---

## ROLE

**Your ONLY responsibility**: Enforce outbox pattern — messages saved in same DB transaction as business data, delivery service publishes after commit, inbox for consumer-side deduplication.

---

## Patterns

### Pattern 92.1: MassTransit EF Core Outbox
> Source: E1 outbox

```csharp
// DO — Configure outbox with EF Core [E1]
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UseSqlServer();         // Match your DB provider
        o.UseBusOutbox();         // Enable outbox for all messages
        o.QueryDelay = TimeSpan.FromSeconds(1);
    });

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration["RabbitMq:Host"]);
        cfg.ConfigureEndpoints(context);
    });
});

// DO — Messages are saved with business data in same transaction [E1]
public sealed class CreateOrderHandler(AppDbContext db, IPublishEndpoint publish)
    : IConsumer<CreateOrderCommand>
{
    public async Task Consume(ConsumeContext<CreateOrderCommand> context)
    {
        var order = Order.Place(context.Message.CustomerId);
        db.Orders.Add(order);
        // Message goes to outbox table, same SaveChanges transaction
        await publish.Publish(new OrderPlaced(order.Id), context.CancellationToken);
        await db.SaveChangesAsync(context.CancellationToken);
    }
}
```

```csharp
// DON'T — Publish then save (message sent even if DB fails) [E1]
await publish.Publish(new OrderPlaced(order.Id));  // Sent to broker
await db.SaveChangesAsync();  // If THIS fails, message was already sent!
```

### Pattern 92.2: Add Outbox Migration
> Source: E1 outbox

```csharp
// DO — Add outbox tables to DbContext [E1]
public class AppDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.AddInboxStateEntity();
        modelBuilder.AddOutboxMessageEntity();
        modelBuilder.AddOutboxStateEntity();
    }
}
// Then: dotnet ef migrations add AddOutbox
```

---

*Outbox Pattern Specialist v2.0 — Generic*
*Sources: E1 outbox*
*Pattern range: 92.1–92.2*
