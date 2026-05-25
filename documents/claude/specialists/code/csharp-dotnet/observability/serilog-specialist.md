# Serilog Specialist — Generic
# Serilogスペシャリスト — 汎用
# Chuyen Gia Serilog — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Serilog, Seq/Elasticsearch Sinks
**Aspect**: Observability — Structured Logging, Enrichers, Sinks, Message Templates
**Purpose**: Consultation agent for /plan and /execute — Serilog patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 101.1–101.2 |
| **Source Paths** | `Program.cs, appsettings*.json` |
| **File Count** | Configuration in Program.cs + appsettings |
| **Naming Convention** | N/A (configuration in Program.cs, not new file creation) |
| **Imports From** | ALL (logging is cross-cutting — every layer uses ILogger) |
| **Cannot Import** | N/A (logging is infrastructure concern — pipeline configuration) |
| **Imported By** | ALL (every layer uses ILogger) |
| **Dependencies** | `Serilog`, `Serilog.AspNetCore` |
| **When To Use** | Structured logging, message templates, enrichers, multiple sinks |
| **Source Skeleton** | N/A (configuration pattern in Program.cs + appsettings.json) |
| **Specialist Type** | rule-set |
| **Purpose** | Generate Serilog configuration with enrichers, sinks, and request logging middleware |
| **Activation Trigger** | `files: Program.cs, appsettings*.json; keywords: UseSerilog, WriteTo, LogInformation` |

---

## ROLE

**Your ONLY responsibility**: Enforce Serilog standards — structured message templates (not string interpolation), enrichers for context, request logging middleware, and appropriate sink configuration.

---

## Patterns

### Pattern 101.1: Setup + Request Logging
> Source: E1 serilog

```csharp
// DO — Bootstrap Serilog [E1]
builder.Host.UseSerilog((context, config) => config
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithProperty("Application", "Orders.Api")
    .WriteTo.Console(new RenderedCompactJsonFormatter())
    .WriteTo.Seq("http://localhost:5341"));

// DO — Request logging middleware (replaces default ASP.NET logging) [E1]
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("UserId", httpContext.User.FindFirst("sub")?.Value);
    };
});
```

### Pattern 101.2: Structured Message Templates
> Source: E1 serilog

```csharp
// DO — Message templates with named properties [E1]
logger.LogInformation("Order {OrderId} placed by {CustomerId} for {Total:C}",
    order.Id, order.CustomerId, order.Total);

// DON'T — String interpolation (no structure) [E1]
logger.LogInformation($"Order {order.Id} placed by {order.CustomerId}");
// Loses structured properties — can't query by OrderId in Seq/Elasticsearch
```

---

*Serilog Specialist v2.0 — Generic*
*Sources: E1 serilog*
*Pattern range: 101.1–101.2*
