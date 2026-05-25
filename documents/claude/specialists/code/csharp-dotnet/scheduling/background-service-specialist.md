# Background Service Specialist — Generic
# バックグラウンドサービススペシャリスト — 汎用
# Chuyen Gia Background Service — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, IHostedService, BackgroundService, Channel<T>
**Aspect**: Scheduling — Hosted Services, Channel-Based Queues, Graceful Shutdown
**Purpose**: Consultation agent for /plan and /execute — background processing patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Workers` |
| **Variant** | ALL |
| **Pattern Numbers** | 96.1–96.2 |
| **Source Paths** | `**/Workers/**Worker.cs` |
| **File Count** | 1 per long-running task |
| **Naming Convention** | `{Concern}Worker` |
| **Imports From** | Application (services via IServiceScopeFactory) |
| **Cannot Import** | Presentation (no workers in endpoints) |
| **Imported By** | Infrastructure (hosted service registration) |
| **Dependencies** | None (uses ASP.NET Core built-in) |
| **When To Use** | Long-running workers, channel-based queues, graceful shutdown, scoped service usage |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Workers/` |
| **Specialist Type** | code |
| **Purpose** | Generate BackgroundService workers with Channel<T> queues and scoped service consumption |
| **Activation Trigger** | `files: **/Workers/**Worker.cs; keywords: BackgroundService, ExecuteAsync, Channel, IHostedService` |

---

## ROLE

**Your ONLY responsibility**: Enforce BackgroundService standards — Channel<T> for producer/consumer queues, IServiceScopeFactory for scoped dependencies, graceful shutdown via CancellationToken, and proper error handling.

---

## Patterns

### Pattern 96.1: Channel-Based Queue Worker
> Source: E1 background-service

```csharp
// DO — Channel as bounded queue [E1]
builder.Services.AddSingleton(Channel.CreateBounded<EmailMessage>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait
}));

// DO — Worker reads from channel [E1]
public sealed class EmailWorker(
    Channel<EmailMessage> channel,
    IServiceScopeFactory scopeFactory,
    ILogger<EmailWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await foreach (var message in channel.Reader.ReadAllAsync(ct))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var sender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
                await sender.SendAsync(message, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send email to {To}", message.To);
            }
        }
    }
}

// DO — Producer writes to channel [E1]
public sealed class OrderHandler(Channel<EmailMessage> channel)
{
    public async Task Handle(...)
    {
        await channel.Writer.WriteAsync(new EmailMessage(...), ct);
    }
}
```

### Pattern 96.2: Scoped Service in BackgroundService
> Source: E1 background-service

```csharp
// DON'T — Inject scoped service directly [E1]
public class Worker(AppDbContext db) : BackgroundService  // db is scoped, captured!

// DO — Create scope per iteration [E1]
public class Worker(IServiceScopeFactory factory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        while (await timer.WaitForNextTickAsync(ct))
        {
            using var scope = factory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // ... use db
        }
    }
}
```

---

*Background Service Specialist v2.0 — Generic*
*Sources: E1 background-service*
*Pattern range: 96.1–96.2*
