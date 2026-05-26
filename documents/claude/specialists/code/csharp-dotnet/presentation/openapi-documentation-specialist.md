# OpenAPI Documentation Specialist — Generic
# OpenAPIドキュメントスペシャリスト — 汎用
# Chuyen Gia OpenAPI Documentation — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Microsoft.AspNetCore.OpenApi, Scalar
**Aspect**: Presentation — OpenAPI 3.1 Generation, Schema Customization, Scalar UI
**Purpose**: Consultation agent for /plan and /execute — OpenAPI documentation for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Naming Convention** | N/A — configuration pattern, not standalone files |
| **Imports From** | Presentation (endpoint metadata) |
| **Cannot Import** | N/A (documentation middleware) |
| **Pattern Numbers** | 108.1–108.2 |
| **Source Paths** | `Program.cs, **/Endpoints/*.cs` |
| **File Count** | Cross-cutting: metadata enrichment |
| **Imported By** | Presentation (endpoints enriched with OpenAPI metadata) |
| **Dependencies** | `Microsoft.AspNetCore.OpenApi`, `Scalar.AspNetCore` (optional) |
| **When To Use** | OpenAPI 3.1 generation, Scalar/Swagger UI, schema customization |
| **Source Skeleton** | N/A (configuration pattern) |
| **Specialist Type** | rule-set |
| **Purpose** | Generate OpenAPI 3.1 specifications with Scalar UI and endpoint metadata enrichment |
| **Activation Trigger** | `files: Program.cs, **/Endpoints/*.cs; keywords: MapOpenApi, MapScalarApiReference, WithSummary` |

---

## ROLE

**Your ONLY responsibility**: Enforce OpenAPI documentation standards — TypedResults for auto-schema, WithName/WithSummary/WithDescription on every endpoint, operation filters for customization, and Scalar UI for modern docs.

---

## Patterns

### Pattern 108.1: Built-in OpenAPI (.NET 9+)
> Source: E1 openapi

```csharp
// DO — .NET 9 built-in OpenAPI [E1]
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, ct) =>
    {
        document.Info = new() { Title = "Orders API", Version = "v1" };
        return Task.CompletedTask;
    });
});

app.MapOpenApi();          // /openapi/v1.json
app.MapScalarApiReference(); // /scalar/v1 — modern UI

// DO — Endpoint metadata drives the schema [E1]
group.MapPost("/", CreateOrder)
    .WithName("CreateOrder")
    .WithSummary("Create a new order")
    .WithDescription("Creates a new order and returns the created resource.")
    .Produces<OrderResponse>(StatusCodes.Status201Created)
    .ProducesValidationProblem()
    .ProducesProblem(StatusCodes.Status500InternalServerError);
```

### Pattern 108.2: Swashbuckle (.NET 8)
> Source: E1 openapi

```csharp
// DO — Swashbuckle for .NET 8 [E1]
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Orders API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
});

app.UseSwagger();
app.UseSwaggerUI();
```

---

*OpenAPI Documentation Specialist v2.0 — Generic*
*Sources: E1 openapi*
*Pattern range: 108.1–108.2*
