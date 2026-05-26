# Exception Handling Specialist — Generic
# 例外処理スペシャリスト — 汎用
# Chuyen Gia Xu Ly Ngoai Le — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, ProblemDetails RFC 9457, Result Pattern
**Aspect**: Cross-Cutting — Global Exception Handling, ProblemDetails, Result Pattern
**Purpose**: Consultation agent for /plan and /execute — error handling patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api.Middleware` |
| **Variant** | ALL |
| **Pattern Numbers** | 63.3, 63.4 |
| **Source Paths** | `**/Middleware/**Exception*.cs, Program.cs` |
| **File Count** | 1–2 per project |
| **Naming Convention** | `GlobalExceptionHandler.cs` |
| **Imports From** | ALL (catches exceptions from any layer — global handler) |
| **Cannot Import** | N/A (exception handler is global — pipeline component) |
| **Imported By** | Presentation (UseExceptionHandler in pipeline) |
| **Dependencies** | None (uses ASP.NET Core built-in) |
| **When To Use** | Global exception handling, ProblemDetails RFC 7807/9457, Result pattern mapping |
| **Source Skeleton** | `src/{Domain}.Api/Middleware/` |
| **Specialist Type** | code |
| **Purpose** | Generate IExceptionHandler and ProblemDetails mapping for RFC 9457 error compliance |
| **Activation Trigger** | `files: **/Middleware/**Exception*.cs; keywords: IExceptionHandler, ProblemDetails, UseExceptionHandler` |

---

## ROLE

**Your ONLY responsibility**: Enforce error handling standards — Result pattern for expected failures, ProblemDetails for ALL API errors, global IExceptionHandler for unexpected crashes, and typed error records.

---

## Patterns

### Pattern 63.3: Result Pattern for Expected Failures
> Source: E1 error-handling, E1-rules error-handling

Use Result/Result<T> for expected failures (not found, validation, conflict). Reserve exceptions for unexpected crashes only.

```csharp
// DO — Result pattern for business logic [E1]
public Result<Order> GetOrder(Guid id)
{
    var order = db.Orders.Find(id);
    return order is not null
        ? Result.Success(order)
        : Result.Failure<Order>($"Order {id} not found");
}

// DO — Typed error records [E1]
public abstract record Error(string Code, string Message);
public record NotFoundError(string Entity, object Id)
    : Error("not_found", $"{Entity} with ID {Id} was not found");
public record ValidationError(string Field, string Message)
    : Error("validation", Message);

// DO — Map errors to HTTP status codes [E1]
public static IResult ToHttpResult(this Error error) => error switch
{
    NotFoundError => TypedResults.Problem(title: error.Message, statusCode: 404),
    ValidationError => TypedResults.Problem(title: error.Message, statusCode: 400),
    ConflictError => TypedResults.Problem(title: error.Message, statusCode: 409),
    _ => TypedResults.Problem(title: error.Message, statusCode: 500)
};
```

```csharp
// DON'T — Exceptions for expected outcomes [E1-rules]
public Order GetOrder(Guid id)
{
    return db.Orders.Find(id)
        ?? throw new NotFoundException($"Order {id} not found");  // Expected failure!
}

// DON'T — Bare strings or ad-hoc JSON for errors [E1-rules]
return Results.BadRequest("Something went wrong");
return Results.BadRequest(new { error = "Invalid input" });
```

### Pattern 63.4: ProblemDetails (RFC 9457) — Always
> Source: E1 error-handling, E1-rules error-handling

Every API error returns ProblemDetails. Global exception handler catches unexpected crashes.

```csharp
// DO — Result to ProblemDetails mapping [E1]
public static class ResultExtensions
{
    public static IResult ToProblemDetails(this Result result, int statusCode = 400)
    {
        return TypedResults.Problem(
            title: "One or more errors occurred",
            statusCode: statusCode,
            extensions: new Dictionary<string, object?>
            {
                ["errors"] = result.Errors
            });
    }
}

// DO — Global exception handler [E1-rules]
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(exception, "Unhandled exception for {Method} {Path}",
            context.Request.Method, context.Request.Path);

        var problem = new ProblemDetails
        {
            Title = "An unexpected error occurred",
            Status = StatusCodes.Status500InternalServerError,
            Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1"
        };

        context.Response.StatusCode = problem.Status.Value;
        await context.Response.WriteAsJsonAsync(problem);
    });
});
```

---

*Exception Handling Specialist v2.0 — Generic*
*Sources: E1 error-handling, E1-rules error-handling*
*Pattern range: 63.3, 63.4*
