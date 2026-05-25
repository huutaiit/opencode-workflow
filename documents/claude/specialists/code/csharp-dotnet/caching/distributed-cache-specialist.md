# Distributed Cache Specialist — Generic
# 分散キャッシュスペシャリスト — 汎用
# Chuyen Gia Distributed Cache — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, StackExchange.Redis, IDistributedCache
**Aspect**: Caching — Redis, IDistributedCache, Cache Invalidation, Serialization
**Purpose**: Consultation agent for /plan and /execute — distributed caching for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Caching` |
| **Variant** | ALL |
| **Pattern Numbers** | 97.1–97.2 |
| **Source Paths** | `**/Caching/*.cs, Program.cs` |
| **File Count** | 1 decorator per cached repository |
| **Naming Convention** | `Cached{Repository}.cs` |
| **Imports From** | Application (repository interface), Infrastructure (IDistributedCache) |
| **Cannot Import** | Domain, Presentation |
| **Imported By** | Application (cached repositories replace direct DB calls) |
| **Dependencies** | `Microsoft.Extensions.Caching.StackExchangeRedis`, `StackExchange.Redis` |
| **When To Use** | Multi-instance cache sharing, Redis patterns, cache-aside, invalidation |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Caching/` |
| **Specialist Type** | code |
| **Purpose** | Generate Redis distributed cache implementations with cache-aside pattern and invalidation |
| **Activation Trigger** | `files: **/Caching/*.cs; keywords: IDistributedCache, StackExchangeRedis, CacheAside` |

---

## ROLE

**Your ONLY responsibility**: Enforce distributed cache standards — IDistributedCache for abstraction, Redis for production, cache-aside pattern, proper expiration (sliding + absolute), and JSON serialization.

---

## Patterns

### Pattern 97.1: Redis Setup + Cache-Aside
> Source: E1 caching

```csharp
// DO — Redis distributed cache [E1]
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
    options.InstanceName = "Orders:";
});

// DO — Cache-aside pattern [E1]
public sealed class CachedOrderRepository(IOrderRepository inner, IDistributedCache cache)
    : IOrderRepository
{
    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var key = $"order:{id}";
        var cached = await cache.GetStringAsync(key, ct);
        if (cached is not null)
            return JsonSerializer.Deserialize<Order>(cached);

        var order = await inner.GetByIdAsync(id, ct);
        if (order is not null)
        {
            await cache.SetStringAsync(key, JsonSerializer.Serialize(order),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10),
                    SlidingExpiration = TimeSpan.FromMinutes(2)
                }, ct);
        }
        return order;
    }
}
```

### Pattern 97.2: Cache Invalidation
> Source: E1 caching

```csharp
// DO — Invalidate on write [E1]
public async Task UpdateAsync(Order order, CancellationToken ct)
{
    await inner.UpdateAsync(order, ct);
    await cache.RemoveAsync($"order:{order.Id}", ct);
}
```

---

*Distributed Cache Specialist v2.0 — Generic*
*Sources: E1 caching*
*Pattern range: 97.1–97.2*
