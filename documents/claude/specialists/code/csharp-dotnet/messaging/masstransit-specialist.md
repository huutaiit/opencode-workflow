# MassTransit Specialist — Generic
# MassTransitスペシャリスト — 汎用
# Chuyen Gia MassTransit — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MassTransit, RabbitMQ/Azure Service Bus
**Aspect**: Messaging — Consumer/Producer, Saga State Machines, Transport Abstraction
**Purpose**: Consultation agent for /plan and /execute — MassTransit distributed messaging for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Messaging` |
| **Variant** | ALL |
| **Pattern Numbers** | 90.1–90.3 |
| **Source Paths** | `**/Messaging/*.cs, **/Consumers/*.cs` |
| **File Count** | 1 per consumer + 1 per saga |
| **Naming Convention** | `{Event}Consumer`, `{Saga}StateMachine` |
| **Imports From** | Domain (event types), Application (handler interfaces) |
| **Cannot Import** | Presentation (no messaging in controllers) |
| **Imported By** | Application (handlers publish messages) |
| **Dependencies** | `MassTransit`, `MassTransit.RabbitMQ` or `MassTransit.AzureServiceBusCore` |
| **When To Use** | Distributed messaging, saga orchestration, event-driven architecture |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Messaging/` |
| **Specialist Type** | code |
| **Purpose** | Generate MassTransit consumers, saga state machines, and transport configuration |
| **Activation Trigger** | `files: **/Messaging/*.cs, **/Consumers/*.cs; keywords: IConsumer, MassTransit, AddMassTransit` |

---

## ROLE

**Your ONLY responsibility**: Enforce MassTransit standards — consumer/producer patterns, transport abstraction (swap RabbitMQ/Azure SB without code changes), saga state machines for long-running processes, and proper error handling with retry/dead-letter.

---

## Patterns

### Pattern 90.1: Consumer Registration
> Source: E1 messaging

```csharp
// DO — Register MassTransit with consumers [E1]
builder.Services.AddMassTransit(x =>
{
    x.AddConsumersFromNamespaceContaining<OrderPlacedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration["RabbitMq:Host"]);
        cfg.ConfigureEndpoints(context);
    });
});

// DO — Consumer [E1]
public sealed class OrderPlacedConsumer(IEmailSender email) : IConsumer<OrderPlaced>
{
    public async Task Consume(ConsumeContext<OrderPlaced> context)
    {
        await email.SendAsync(new EmailMessage(
            To: context.Message.CustomerEmail,
            Subject: "Order Confirmed",
            HtmlBody: $"Order {context.Message.OrderId} has been placed."), context.CancellationToken);
    }
}
```

### Pattern 90.2: Saga State Machine
> Source: E1 messaging

```csharp
// DO — Saga for long-running process [E1]
public sealed class OrderSaga : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; } = null!;
    public Guid OrderId { get; set; }
}

public sealed class OrderStateMachine : MassTransitStateMachine<OrderSaga>
{
    public State Placed { get; private set; } = null!;
    public State PaymentReceived { get; private set; } = null!;
    public Event<OrderPlaced> OrderPlacedEvent { get; private set; } = null!;
    public Event<PaymentCompleted> PaymentCompletedEvent { get; private set; } = null!;

    public OrderStateMachine()
    {
        InstanceState(x => x.CurrentState);
        Event(() => OrderPlacedEvent, x => x.CorrelateById(ctx => ctx.Message.OrderId));
        Event(() => PaymentCompletedEvent, x => x.CorrelateById(ctx => ctx.Message.OrderId));

        Initially(
            When(OrderPlacedEvent)
                .Then(ctx => ctx.Saga.OrderId = ctx.Message.OrderId)
                .TransitionTo(Placed));

        During(Placed,
            When(PaymentCompletedEvent)
                .TransitionTo(PaymentReceived)
                .Finalize());
    }
}
```

### Pattern 90.3: Error Handling
> Source: E1 messaging

```csharp
// DO — Configure retry + dead-letter [E1]
cfg.ReceiveEndpoint("order-placed", e =>
{
    e.UseMessageRetry(r => r.Incremental(3, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(2)));
    e.ConfigureConsumer<OrderPlacedConsumer>(context);
});
```

---

*MassTransit Specialist v2.0 — Generic*
*Sources: E1 messaging*
*Pattern range: 90.1–90.3*
