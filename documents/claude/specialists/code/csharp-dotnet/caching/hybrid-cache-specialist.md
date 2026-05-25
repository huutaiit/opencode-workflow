# Hybrid Cache Specialist — Generic
# ハイブリッドキャッシュスペシャリスト — 汎用
# Chuyen Gia Hybrid Cache — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 9+ | **Variant**: ALL (Generic)
**Technology**: C# 13-14, HybridCache (.NET 9 GA)
**Aspect**: Caching — Two-Level Cache, Stampede Protection, Tag-Based Invalidation
**Purpose**: Consultation agent for /plan and /execute — HybridCache for .NET 9+ projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Caching` |
| **Variant** | ALL |
| **Pattern Numbers** | 98.1–98.2 |
| **Source Paths** | `**/Caching/*.cs, Program.cs` |
| **File Count** | Configuration + usage in services |
| **Naming Convention** | N/A (injected via DI — no dedicated file creation) |
| **Imports From** | Application (services inject HybridCache) |
| **Cannot Import** | Domain, Presentation |
| **Imported By** | Application (services use GetOrCreateAsync for stampede protection) |
| **Dependencies** | `Microsoft.Extensions.Caching.Hybrid` |
| **When To Use** | Two-level caching (L1 memory + L2 distributed), stampede protection, tag invalidation |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Caching/` |
| **Specialist Type** | rule-set |
| **Purpose** | Generate HybridCache two-level caching with stampede protection and tag-based invalidation (.NET 9+) |
| **Activation Trigger** | `files: **/Caching/*.cs, Program.cs; keywords: HybridCache, GetOrCreateAsync, RemoveByTagAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce HybridCache standards — GetOrCreateAsync for stampede protection, tag-based invalidation, and proper expiration configuration.

---

## Patterns

### Pattern 98.1: GetOrCreateAsync (Stampede Protection)
> Source: E1 hybrid-cache

```csharp
// DO — HybridCache setup [E1]
builder.Services.AddHybridCache(options =>
{
    options.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),
        LocalCacheExpiration = TimeSpan.FromMinutes(1)
    };
});

// DO — GetOrCreateAsync — only ONE factory call even under concurrent requests [E1]
public sealed class OrderService(HybridCache cache, AppDbContext db)
{
    public async Task<OrderDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await cache.GetOrCreateAsync(
            $"order:{id}",
            async token => await db.Orders
                .Where(o => o.Id == id)
                .Select(o => new OrderDto(o.Id, o.Status.ToString(), o.Total))
                .FirstOrDefaultAsync(token),
            tags: ["orders"],
            cancellationToken: ct);
    }
}
```

### Pattern 98.2: Tag-Based Invalidation
> Source: E1 hybrid-cache

```csharp
// DO — Invalidate all entries with tag [E1]
await cache.RemoveByTagAsync("orders", ct);
// All entries tagged "orders" are evicted from both L1 and L2
```

---

*Hybrid Cache Specialist v2.0 — Generic*
*Sources: E1 hybrid-cache*
*Pattern range: 98.1–98.2*
