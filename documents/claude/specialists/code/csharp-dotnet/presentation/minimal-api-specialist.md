# Minimal API Specialist — Generic
# Minimal APIスペシャリスト — 汎用
# Chuyen Gia Minimal API — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Minimal APIs, TypedResults
**Aspect**: Presentation — IEndpointGroup, TypedResults, Route Groups, Parameter Binding
**Purpose**: Consultation agent for /plan and /execute — Minimal API patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api.Endpoints` |
| **Variant** | ALL |
| **Naming Convention** | `{Feature}Endpoints.cs` |
| **Imports From** | Application (handler/service interfaces) |
| **Cannot Import** | Domain (entities directly), Infrastructure (repositories) |
| **Pattern Numbers** | 63.1, 63.2, 63.5, 63.7 |
| **Source Paths** | `**/Endpoints/*.cs` |
| **File Count** | 1 per resource group |
| **Imported By** | None (HTTP entry point — terminal) |
| **Dependencies** | None (ASP.NET Core built-in Minimal APIs) |
| **When To Use** | Minimal API endpoints, TypedResults, route groups, OpenAPI metadata |
| **Source Skeleton** | `src/{Domain}.Api/Endpoints/` |
| **Specialist Type** | code |
| **Purpose** | Generate Minimal API endpoint groups with IEndpointGroup auto-discovery and TypedResults |
| **Activation Trigger** | `files: **/Endpoints/*.cs; keywords: IEndpointGroup, MapEndpoints, TypedResults, MapGroup` |

---

## ROLE

**Your ONLY responsibility**: Enforce Minimal API standards — IEndpointGroup auto-discovery, TypedResults for compile-time safety + OpenAPI, [AsParameters] for complex queries, and FluentValidation endpoint filters.

---

## Patterns

### Pattern 63.1: IEndpointGroup Auto-Discovery (Mandatory)
> Source: E1 minimal-api

Every endpoint group implements `IEndpointGroup`. A single `app.MapEndpoints()` call discovers and registers all groups. Program.cs NEVER changes when adding endpoints.

```csharp
// DO — Interface for endpoint groups [E1]
public interface IEndpointGroup
{
    void Map(IEndpointRouteBuilder app);
}

// DO — Auto-discovery extension [E1]
public static class EndpointExtensions
{
    public static WebApplication MapEndpoints(this WebApplication app)
    {
        var groups = typeof(Program).Assembly
            .GetTypes()
            .Where(t => t.IsAssignableTo(typeof(IEndpointGroup))
                && !t.IsInterface && !t.IsAbstract)
            .Select(Activator.CreateInstance)
            .Cast<IEndpointGroup>();

        foreach (var group in groups)
            group.Map(app);

        return app;
    }
}

// DO — Program.cs — NEVER changes [E1]
var app = builder.Build();
app.MapEndpoints();
app.Run();
```

```csharp
// DO — One file per endpoint group [E1]
public sealed class OrderEndpoints : IEndpointGroup
{
    public void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapPost("/", CreateOrder)
            .WithName("CreateOrder")
            .WithSummary("Create a new order")
            .Produces<OrderResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .RequireAuthorization();
    }
}
```

```csharp
// DON'T — Endpoints scattered in Program.cs [E1]
app.MapGet("/orders", async (AppDbContext db) => await db.Orders.ToListAsync());

// DON'T — Manual MapGroup calls in Program.cs (grows with every feature) [E1]
app.MapGroup("/api/orders").MapOrderEndpoints();
app.MapGroup("/api/products").MapProductEndpoints();
```

### Pattern 63.2: TypedResults for OpenAPI
> Source: E1 minimal-api

Use `TypedResults` (not `Results`) for compile-time type safety AND correct OpenAPI schema generation.

```csharp
// DO — TypedResults with union return type [E1]
private static async Task<Results<Ok<OrderResponse>, NotFound>> GetOrder(
    Guid id, ISender sender, CancellationToken ct)
{
    var result = await sender.Send(new GetOrder.Query(id), ct);
    return result.IsSuccess
        ? TypedResults.Ok(result.Value)
        : TypedResults.NotFound();
}
```

```csharp
// DON'T — Untyped Results (no OpenAPI schema) [E1]
private static async Task<IResult> GetOrder(Guid id, AppDbContext db)
{
    var order = await db.Orders.FindAsync(id);
    return order is not null ? Results.Ok(order) : Results.NotFound();
}
```

### Pattern 63.5: FluentValidation with Endpoint Filters
> Source: E1 error-handling

Validate at the boundary. Use FluentValidation + generic endpoint filter.

```csharp
// DO — Generic validation filter [E1]
public class ValidationFilter<TRequest> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var validator = context.HttpContext.RequestServices.GetService<IValidator<TRequest>>();
        if (validator is null) return await next(context);

        var request = context.Arguments.OfType<TRequest>().FirstOrDefault();
        if (request is null) return await next(context);

        var result = await validator.ValidateAsync(request);
        if (!result.IsValid)
            return TypedResults.ValidationProblem(result.ToDictionary());

        return await next(context);
    }
}

// DO — Apply to endpoint [E1]
group.MapPost("/", CreateOrder)
    .AddEndpointFilter<ValidationFilter<CreateOrderRequest>>();
```

### Pattern 63.7: Parameter Binding and OpenAPI Metadata
> Source: E1 minimal-api

Use `[AsParameters]` for complex queries. Enrich OpenAPI with `.WithName()`, `.WithSummary()`, `.WithDescription()`.

```csharp
// DO — Complex query with [AsParameters] [E1]
public record ListOrdersQuery(int Page = 1, int PageSize = 20, string? Status = null);

group.MapGet("/", ([AsParameters] ListOrdersQuery query, ISender sender, CancellationToken ct) =>
    sender.Send(query, ct));

// DO — OpenAPI metadata on endpoints [E1]
group.MapPost("/", CreateOrder)
    .WithName("CreateOrder")
    .WithSummary("Create a new order")
    .Produces<OrderResponse>(StatusCodes.Status201Created)
    .ProducesValidationProblem();
```

---

*Minimal API Specialist v2.0 — Generic*
*Sources: E1 minimal-api, E1 error-handling*
*Pattern range: 63.1, 63.2, 63.5, 63.7*
