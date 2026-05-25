# Output Cache Specialist — Generic
# 出力キャッシュスペシャリスト — 汎用
# Chuyen Gia Output Cache — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, OutputCache Middleware
**Aspect**: Caching — Response Caching, Cache Profiles, Vary-By, Revalidation
**Purpose**: Consultation agent for /plan and /execute — output caching for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 99.1 |
| **Source Paths** | `Program.cs, **/Endpoints/*.cs` |
| **File Count** | Cross-cutting: configuration + endpoint annotations |
| **Naming Convention** | N/A (middleware configuration + endpoint attributes, not new file creation) |
| **Imports From** | Presentation (endpoint metadata) |
| **Cannot Import** | N/A (middleware configuration) |
| **Imported By** | Presentation (endpoints annotated with CacheOutput) |
| **Dependencies** | None (uses ASP.NET Core built-in) |
| **When To Use** | Response caching, GET endpoint caching, vary-by query/header |
| **Source Skeleton** | N/A (middleware configuration in Program.cs) |
| **Specialist Type** | rule-set |
| **Purpose** | Configure OutputCache middleware with named policies, vary-by, and tag-based eviction |
| **Activation Trigger** | `files: Program.cs, **/Endpoints/*.cs; keywords: CacheOutput, AddOutputCache, EvictByTagAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce output cache standards — named policies, vary-by query string, tag-based eviction, and cache only GET responses.

---

## Patterns

### Pattern 99.1: Output Cache Setup
> Source: E1 output-cache

```csharp
// DO — Output cache with named policies [E1]
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(b => b.NoCache());  // No cache by default
    options.AddPolicy("ByIdCache", b => b.Expire(TimeSpan.FromMinutes(5)).Tag("orders"));
    options.AddPolicy("ListCache", b => b
        .Expire(TimeSpan.FromMinutes(1))
        .SetVaryByQuery("page", "pageSize", "status")
        .Tag("orders"));
});

app.UseOutputCache();

// DO — Apply to endpoints [E1]
group.MapGet("/{id:guid}", GetOrder).CacheOutput("ByIdCache");
group.MapGet("/", ListOrders).CacheOutput("ListCache");

// DO — Evict on write [E1]
group.MapPost("/", async (CreateOrderRequest req, IOutputCacheStore cache, ...) =>
{
    // ... create order
    await cache.EvictByTagAsync("orders", ct);
    return TypedResults.Created(...);
});
```

---

*Output Cache Specialist v2.0 — Generic*
*Sources: E1 output-cache*
*Pattern range: 99.1*
