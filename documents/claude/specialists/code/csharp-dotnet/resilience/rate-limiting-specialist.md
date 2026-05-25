# Rate Limiting Specialist — Generic
# レート制限スペシャリスト — 汎用
# Chuyen Gia Rate Limiting — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, ASP.NET Core RateLimiting Middleware
**Aspect**: Resilience — Fixed Window, Sliding Window, Token Bucket, Per-Endpoint Policies
**Purpose**: Consultation agent for /plan and /execute — rate limiting patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 68.5 |
| **Source Paths** | `Program.cs, **/Endpoints/*.cs` |
| **File Count** | Cross-cutting: config + endpoint annotations |
| **Naming Convention** | N/A (middleware configuration in Program.cs, not new file creation) |
| **Imports From** | Presentation (endpoint metadata) |
| **Cannot Import** | N/A (middleware configuration) |
| **Imported By** | Presentation (endpoints annotated with RequireRateLimiting) |
| **Dependencies** | None (uses ASP.NET Core built-in) |
| **When To Use** | API rate limiting, fixed/sliding window, token bucket, 429 ProblemDetails |
| **Source Skeleton** | N/A (middleware configuration in Program.cs) |
| **Specialist Type** | rule-set |
| **Purpose** | Configure ASP.NET Core rate limiting with fixed/sliding window and ProblemDetails 429 response |
| **Activation Trigger** | `files: Program.cs, **/Endpoints/*.cs; keywords: AddRateLimiter, RequireRateLimiting, FixedWindowLimiter` |

---

## ROLE

**Your ONLY responsibility**: Enforce rate limiting standards — .NET built-in AddRateLimiter, named policies, ProblemDetails with Retry-After on 429, and RequireRateLimiting on endpoints/groups.

---

## Patterns

### Pattern 68.5: Rate Limiting (.NET Built-in)
> Source: E1 resilience

Use .NET's built-in `AddRateLimiter()` — no external packages. Return ProblemDetails with Retry-After on 429.

```csharp
// DO — Rate limiting with ProblemDetails response [E1]
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromSeconds(60);
        opt.QueueLimit = 0;
    });

    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails { Title = "Too many requests", Status = 429 }, ct);
    };
});

app.UseRateLimiter();

// Apply to endpoints
group.MapGet("/", ListOrders).RequireRateLimiting("api");
```

---

*Rate Limiting Specialist v2.0 — Generic*
*Sources: E1 resilience*
*Pattern range: 68.5*
