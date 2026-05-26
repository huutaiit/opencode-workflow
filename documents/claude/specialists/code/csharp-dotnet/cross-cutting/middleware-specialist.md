# Middleware Specialist — Generic
# ミドルウェアスペシャリスト — 汎用
# Chuyen Gia Middleware — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, ASP.NET Core Middleware Pipeline
**Aspect**: Cross-Cutting — Custom Middleware, IMiddleware, Pipeline Ordering
**Purpose**: Consultation agent for /plan and /execute — middleware patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api.Middleware` |
| **Variant** | ALL |
| **Pattern Numbers** | 84.1–84.2 |
| **Source Paths** | `**/Middleware/**Middleware.cs` |
| **File Count** | 2–5 per project |
| **Naming Convention** | `{Concern}Middleware` |
| **Imports From** | ALL (middleware crosses layers — intercepts requests and accesses services from any layer) |
| **Cannot Import** | N/A (middleware intercepts all requests — pipeline component) |
| **Imported By** | Presentation (UseMiddleware in pipeline) |
| **Dependencies** | None (uses ASP.NET Core built-in) |
| **When To Use** | Custom middleware, request/response logging, correlation IDs, pipeline ordering |
| **Source Skeleton** | `src/{Domain}.Api/Middleware/` |
| **Specialist Type** | code |
| **Purpose** | Generate custom ASP.NET Core middleware with IMiddleware and correct pipeline ordering |
| **Activation Trigger** | `files: **/Middleware/**Middleware.cs; keywords: IMiddleware, InvokeAsync, UseMiddleware` |

---

## ROLE

**Your ONLY responsibility**: Enforce middleware standards — use IMiddleware (DI-friendly), correct pipeline ordering, request/response logging without PII, and correlation ID propagation.

---

## Patterns

### Pattern 84.1: IMiddleware with DI
> Source: E1 middleware

```csharp
// DO — IMiddleware for DI support [E1]
public sealed class CorrelationIdMiddleware(ILogger<CorrelationIdMiddleware> logger) : IMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
            ?? Guid.NewGuid().ToString();
        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers["X-Correlation-ID"] = correlationId;

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await next(context);
        }
    }
}

// Register
builder.Services.AddTransient<CorrelationIdMiddleware>();
app.UseMiddleware<CorrelationIdMiddleware>();
```

### Pattern 84.2: Pipeline Ordering
> Source: E1 middleware

```csharp
// DO — Correct middleware order [E1]
app.UseExceptionHandler();     // 1. Catch unhandled exceptions
app.UseHsts();                 // 2. Security headers
app.UseHttpsRedirection();     // 3. HTTPS redirect
app.UseCors();                 // 4. CORS
app.UseAuthentication();       // 5. Auth
app.UseAuthorization();        // 6. AuthZ
app.UseRateLimiter();          // 7. Rate limiting
app.UseOutputCache();          // 8. Caching
app.MapEndpoints();            // 9. Endpoints
```

---

*Middleware Specialist v2.0 — Generic*
*Sources: E1 middleware*
*Pattern range: 84.1–84.2*
