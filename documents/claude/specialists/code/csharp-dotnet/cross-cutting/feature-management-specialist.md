# Feature Management Specialist — Generic
# フィーチャー管理スペシャリスト — 汎用
# Chuyen Gia Feature Management — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Microsoft.FeatureManagement
**Aspect**: Cross-Cutting — Feature Flags, Filters, A/B Testing, Gradual Rollout
**Purpose**: Consultation agent for /plan and /execute — feature flag patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 85.1–85.2 |
| **Source Paths** | `Program.cs, appsettings*.json` |
| **File Count** | Configuration + inline feature checks |
| **Naming Convention** | N/A (configuration in Program.cs + feature checks via DI, not new file creation) |
| **Imports From** | ALL (feature flags checked across layers — services, endpoints, middleware) |
| **Cannot Import** | N/A (feature management is cross-cutting — checked everywhere) |
| **Imported By** | ALL (services/endpoints check feature flags before execution) |
| **Dependencies** | `Microsoft.FeatureManagement.AspNetCore` |
| **When To Use** | Feature flags, percentage rollout, targeting filters, trunk-based development |
| **Source Skeleton** | N/A (configuration pattern in Program.cs + appsettings.json) |
| **Specialist Type** | rule-set |
| **Purpose** | Configure Microsoft.FeatureManagement with percentage filters and endpoint-level feature gates |
| **Activation Trigger** | `files: Program.cs, appsettings*.json; keywords: IFeatureManager, IsEnabledAsync, FeatureGate` |

---

## ROLE

**Your ONLY responsibility**: Enforce feature flag standards — Microsoft.FeatureManagement for consistent flag evaluation, feature filters for gradual rollout, and endpoint-level feature gates.

---

## Patterns

### Pattern 85.1: Feature Flag Setup
> Source: E1 feature-flags

```csharp
// DO — Register feature management [E1]
builder.Services.AddFeatureManagement()
    .AddFeatureFilter<PercentageFilter>()
    .AddFeatureFilter<TargetingFilter>();

// appsettings.json
// "FeatureManagement": {
//   "NewCheckout": true,
//   "BetaFeature": { "EnabledFor": [{ "Name": "Percentage", "Parameters": { "Value": 25 } }] }
// }

// DO — Check in code [E1]
public sealed class OrderService(IFeatureManager features)
{
    public async Task<Result> CreateAsync(CreateOrderRequest request, CancellationToken ct)
    {
        if (await features.IsEnabledAsync("NewCheckout"))
            return await NewCheckoutFlow(request, ct);
        return await LegacyCheckoutFlow(request, ct);
    }
}
```

### Pattern 85.2: Endpoint-Level Feature Gate
> Source: E1 feature-flags

```csharp
// DO — Gate entire endpoint groups [E1]
app.MapGroup("/api/v2/orders")
    .AddEndpointFilter(async (context, next) =>
    {
        var features = context.HttpContext.RequestServices.GetRequiredService<IFeatureManager>();
        if (!await features.IsEnabledAsync("OrdersV2"))
            return TypedResults.NotFound();
        return await next(context);
    });
```

---

*Feature Management Specialist v2.0 — Generic*
*Sources: E1 feature-flags*
*Pattern range: 85.1–85.2*
