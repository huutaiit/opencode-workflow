# Health Check Specialist — Generic
# ヘルスチェックスペシャリスト — 汎用
# Chuyen Gia Health Check — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, IHealthCheck, AspNetCore.Diagnostics.HealthChecks
**Aspect**: Resilience — Liveness/Readiness Probes, Custom Checks, Kubernetes Integration
**Purpose**: Consultation agent for /plan and /execute — health check patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 100.1–100.2 |
| **Source Paths** | `**/Health/*.cs, Program.cs` |
| **File Count** | 1 per dependency + liveness check |
| **Naming Convention** | `{Dependency}HealthCheck.cs` |
| **Imports From** | Infrastructure (dependency clients) |
| **Cannot Import** | Domain |
| **Imported By** | Infrastructure (K8s probes, Aspire dashboard) |
| **Dependencies** | `AspNetCore.Diagnostics.HealthChecks` (community) |
| **When To Use** | Liveness/readiness probes, DB/Redis/external checks, Kubernetes integration |
| **Source Skeleton** | `src/{Domain}.Api/Health/` |
| **Specialist Type** | code |
| **Purpose** | Generate IHealthCheck implementations for liveness/readiness separation with Kubernetes probes |
| **Activation Trigger** | `files: **/Health/*.cs, Program.cs; keywords: IHealthCheck, MapHealthChecks, AddHealthChecks` |

---

## ROLE

**Your ONLY responsibility**: Enforce health check standards — separate liveness (app alive) and readiness (dependencies ready) endpoints, built-in + custom checks, and Kubernetes-compatible paths.

---

## Patterns

### Pattern 100.1: Liveness + Readiness
> Source: E1 health-check

```csharp
// DO — Separate liveness and readiness [E1]
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("Default")!,
        name: "sqlserver", tags: ["ready"])
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!,
        name: "redis", tags: ["ready"])
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"]);

// DO — Map endpoints [E1]
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
```

### Pattern 100.2: Custom Health Check
> Source: E1 health-check

```csharp
// DO — Custom check for external dependency [E1]
public sealed class PaymentGatewayHealthCheck(IPaymentGateway gateway) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct)
    {
        try
        {
            await gateway.PingAsync(ct);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Payment gateway unreachable", ex);
        }
    }
}

builder.Services.AddHealthChecks()
    .AddCheck<PaymentGatewayHealthCheck>("payment-gateway", tags: ["ready"]);
```

---

*Health Check Specialist v2.0 — Generic*
*Sources: E1 health-check*
*Pattern range: 100.1–100.2*
