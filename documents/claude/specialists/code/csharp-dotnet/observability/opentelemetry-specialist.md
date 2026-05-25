# OpenTelemetry Specialist — Generic
# OpenTelemetryスペシャリスト — 汎用
# Chuyen Gia OpenTelemetry — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, OpenTelemetry .NET SDK
**Aspect**: Observability — Traces, Metrics, Logs, OTLP Exporters
**Purpose**: Consultation agent for /plan and /execute — OpenTelemetry for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 102.1–102.2 |
| **Source Paths** | `Program.cs` |
| **File Count** | Configuration in Program.cs |
| **Naming Convention** | N/A (configuration in Program.cs, not new file creation) |
| **Imports From** | ALL (telemetry is cross-cutting — captures traces/metrics from all layers) |
| **Cannot Import** | N/A (telemetry is infrastructure concern — pipeline configuration) |
| **Imported By** | ALL (traces/metrics captured from all layers) |
| **Dependencies** | `OpenTelemetry.Extensions.Hosting`, `OpenTelemetry.Exporter.OpenTelemetryProtocol` |
| **When To Use** | Distributed tracing, custom metrics, OTLP export to Jaeger/Prometheus/Grafana |
| **Source Skeleton** | N/A (configuration pattern in Program.cs) |
| **Specialist Type** | rule-set |
| **Purpose** | Generate OpenTelemetry traces, metrics, and logs pipeline with OTLP export configuration |
| **Activation Trigger** | `files: Program.cs; keywords: AddOpenTelemetry, WithTracing, WithMetrics, AddOtlpExporter` |

---

## ROLE

**Your ONLY responsibility**: Enforce OpenTelemetry standards — traces + metrics + logs pipeline, ASP.NET Core + HTTP + EF Core instrumentation, OTLP export, and custom Activity/Meter for business metrics.

---

## Patterns

### Pattern 102.1: Full Setup (Traces + Metrics + Logs)
> Source: E1 opentelemetry

```csharp
// DO — Complete OpenTelemetry pipeline [E1]
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("Orders.Api"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddSource("Orders.Api")
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddMeter("Orders.Api")
        .AddOtlpExporter());
```

### Pattern 102.2: Custom Business Metrics
> Source: E1 opentelemetry

```csharp
// DO — Custom meter for business metrics [E1]
public sealed class OrderMetrics
{
    private readonly Counter<long> _ordersPlaced;
    private readonly Histogram<double> _orderTotal;

    public OrderMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("Orders.Api");
        _ordersPlaced = meter.CreateCounter<long>("orders.placed", "orders");
        _orderTotal = meter.CreateHistogram<double>("orders.total", "USD");
    }

    public void RecordOrderPlaced(decimal total)
    {
        _ordersPlaced.Add(1);
        _orderTotal.Record((double)total);
    }
}
```

---

*OpenTelemetry Specialist v2.0 — Generic*
*Sources: E1 opentelemetry*
*Pattern range: 102.1–102.2*
