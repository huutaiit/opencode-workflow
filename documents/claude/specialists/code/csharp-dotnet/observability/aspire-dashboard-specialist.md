# Aspire Dashboard Specialist — Generic
# Aspireダッシュボードスペシャリスト — 汎用
# Chuyen Gia Aspire Dashboard — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, .NET Aspire, ServiceDefaults
**Aspect**: Observability — Aspire Dashboard, Service Defaults, Resource Visualization
**Purpose**: Consultation agent for /plan and /execute — Aspire observability dashboard

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Solution}.ServiceDefaults` |
| **Variant** | ALL |
| **Pattern Numbers** | 103.1 |
| **Source Paths** | `**/ServiceDefaults/Extensions.cs` |
| **File Count** | 1 extension class |
| **Naming Convention** | `Extensions.cs` (in ServiceDefaults project) |
| **Imports From** | ALL (service defaults apply to all projects — shared infrastructure) |
| **Cannot Import** | N/A (service defaults is shared infrastructure — referenced by all projects) |
| **Imported By** | ALL (every service project calls AddServiceDefaults) |
| **Dependencies** | `Aspire.ServiceDefaults` |
| **When To Use** | Local development dashboard, service health visualization, log/trace/metrics UI |
| **Source Skeleton** | `src/{Solution}.ServiceDefaults/` |
| **Specialist Type** | code |
| **Purpose** | Configure .NET Aspire ServiceDefaults for unified observability, health checks, and resilience |
| **Activation Trigger** | `files: **/ServiceDefaults/*.cs; keywords: AddServiceDefaults, ConfigureOpenTelemetry` |

---

## ROLE

**Your ONLY responsibility**: Enforce Aspire ServiceDefaults standards — AddServiceDefaults() for unified observability, dashboard for local dev, and OpenTelemetry integration via Aspire conventions.

---

## Patterns

### Pattern 103.1: ServiceDefaults Setup
> Source: E1 aspire

```csharp
// DO — ServiceDefaults project [E1]
public static class Extensions
{
    public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
    {
        builder.ConfigureOpenTelemetry();
        builder.AddDefaultHealthChecks();
        builder.Services.AddServiceDiscovery();
        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });
        return builder;
    }
}

// DO — Use in each service [E1]
builder.AddServiceDefaults();
// Gets: OpenTelemetry, health checks, service discovery, resilience — all in one line
```

---

*Aspire Dashboard Specialist v2.0 — Generic*
*Sources: E1 aspire*
*Pattern range: 103.1*
