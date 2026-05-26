# DI Configuration Specialist — Generic
# DI設定スペシャリスト — 汎用
# Chuyen Gia DI Configuration — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Microsoft.Extensions.DependencyInjection, Scrutor
**Aspect**: Infrastructure — DI Registration, Lifetime Management, Keyed Services
**Purpose**: Consultation agent for /plan and /execute — DI patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure` |
| **Variant** | ALL |
| **Pattern Numbers** | 65.1, 65.2, 65.3, 65.7 |
| **Source Paths** | `Program.cs, **/*Extensions.cs` |
| **File Count** | 1 per feature (extension method class) |
| **Naming Convention** | `{Feature}ServiceCollectionExtensions.cs` |
| **Imports From** | ALL (DI registration crosses all layers — registers services from Domain, Application, Infrastructure) |
| **Cannot Import** | N/A (DI setup references all layers by design — composition root) |
| **Imported By** | ALL (every layer consumes registered services) |
| **Dependencies** | `Microsoft.Extensions.DependencyInjection`, `Scrutor` (optional) |
| **When To Use** | DI registration, lifetime management, keyed services, assembly scanning |
| **Source Skeleton** | `Program.cs` |
| **Specialist Type** | code |
| **Purpose** | Generate DI registration patterns — Add{Feature}Services extensions, keyed services, lifetime management |
| **Activation Trigger** | `files: Program.cs, **/*Extensions.cs; keywords: AddScoped, AddSingleton, IServiceCollection` |

---

## ROLE

**Your ONLY responsibility**: Enforce DI standards — Add{Feature}Services extension methods, correct lifetime selection, never inject scoped into singleton, keyed services for multi-implementation, and Scrutor for convention-based registration.

---

## Patterns

### Pattern 65.1: Add{Feature}Services() Extension Methods
> Source: E2 di, E1 dependency-injection

Group related service registrations into extension methods. Program.cs composes them.

```csharp
// DO — Extension method per feature [E2]
public static class OrderServiceCollectionExtensions
{
    public static IServiceCollection AddOrderServices(this IServiceCollection services)
    {
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IOrderService, OrderService>();
        return services;
    }
}

// DO — Clean Program.cs [E2]
builder.Services
    .AddUserServices()
    .AddOrderServices()
    .AddEmailServices();
```

```csharp
// DON'T — 200+ lines of registrations in Program.cs [E2]
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
// ... 150 more lines ...
```

### Pattern 65.2: Lifetime Management — Singleton / Scoped / Transient
> Source: E2 di, E1 dependency-injection

| Lifetime | Use When | Examples |
|----------|----------|----------|
| **Singleton** | Stateless, thread-safe, expensive | Config, HttpClient factories, caches |
| **Scoped** | Stateful per-request, DB contexts | DbContext, repositories, user context |
| **Transient** | Lightweight, cheap to create | Validators, short-lived helpers |

### Pattern 65.3: Never Inject Scoped into Singleton
> Source: E2 di, E1 dependency-injection

A Singleton captures a Scoped service at construction — the Scoped service becomes a stale singleton.

```csharp
// DON'T — Singleton captures scoped service [E2]
public class CacheService  // Registered as Singleton
{
    private readonly IUserRepository _repo;  // Scoped — captured at startup, stale!
}

// DO — Use IServiceScopeFactory in singletons [E1]
public class OrderCache(IServiceScopeFactory scopeFactory)
{
    public async Task<Order?> GetAsync(Guid id)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Orders.FindAsync(id);
    }
}
```

### Pattern 65.7: Keyed Services (.NET 8+)
> Source: E1 dependency-injection

Register multiple implementations of the same interface, resolved by key.

```csharp
// DO — Keyed service registration [E1]
services.AddKeyedScoped<INotificationService, EmailNotificationService>("email");
services.AddKeyedScoped<INotificationService, SmsNotificationService>("sms");

// DO — Resolve via attribute [E1]
public sealed class OrderHandler([FromKeyedServices("email")] INotificationService notifier) { }

// DO — Decorator pattern with Scrutor [E1]
services.AddScoped<IOrderService, OrderService>();
services.Decorate<IOrderService, LoggingOrderService>();
```

---

*DI Configuration Specialist v2.0 — Generic*
*Sources: E2 di, E1 dependency-injection*
*Pattern range: 65.1–65.3, 65.7*
