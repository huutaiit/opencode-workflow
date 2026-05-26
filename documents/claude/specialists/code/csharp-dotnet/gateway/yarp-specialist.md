# YARP Specialist — Generic
# YARPスペシャリスト — 汎用
# Chuyen Gia YARP — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, YARP (Yet Another Reverse Proxy)
**Aspect**: Gateway — Route Config, Load Balancing, Transforms, Health Checks
**Purpose**: Consultation agent for /plan and /execute — YARP reverse proxy for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Gateway` |
| **Variant** | ALL |
| **Pattern Numbers** | 113.1–113.2 |
| **Source Paths** | `**/Gateway/appsettings.json, **/Gateway/*.cs` |
| **File Count** | 1 config + optional transform classes |
| **Naming Convention** | `{Concern}Transform.cs` |
| **Imports From** | Infrastructure (target service URLs from config) |
| **Cannot Import** | Domain, Application (gateway proxies, doesn't process) |
| **Imported By** | Infrastructure (reverse proxy deployment) |
| **Dependencies** | `Yarp.ReverseProxy` |
| **When To Use** | API gateway, reverse proxy, load balancing, request transforms |
| **Source Skeleton** | `src/{Domain}.Gateway/` |
| **Specialist Type** | code |
| **Purpose** | Generate YARP reverse proxy configurations with load balancing and request transforms |
| **Activation Trigger** | `files: **/Gateway/*.cs, **/Gateway/appsettings.json; keywords: ReverseProxy, Yarp, Clusters, Transforms` |

---

## ROLE

**Your ONLY responsibility**: Enforce YARP standards — configuration-based routing, cluster health checks, request/response transforms, and load balancing policies.

---

## Patterns

### Pattern 113.1: Configuration-Based Routing
> Source: E1 yarp

```json
// DO — appsettings.json route config [E1]
{
  "ReverseProxy": {
    "Routes": {
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/api/orders/{**catch-all}" }
      }
    },
    "Clusters": {
      "orders-cluster": {
        "Destinations": {
          "orders-1": { "Address": "https://orders-service:8080/" }
        },
        "HealthCheck": {
          "Active": { "Enabled": true, "Interval": "00:00:10", "Path": "/health/live" }
        }
      }
    }
  }
}
```

```csharp
// DO — Setup [E1]
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
app.MapReverseProxy();
```

### Pattern 113.2: Request Transforms
> Source: E1 yarp

```csharp
// DO — Add auth header transform [E1]
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(transforms =>
    {
        transforms.AddRequestTransform(async context =>
        {
            var token = context.HttpContext.Request.Headers.Authorization.FirstOrDefault();
            if (token is not null)
                context.ProxyRequest.Headers.Authorization = AuthenticationHeaderValue.Parse(token);
        });
    });
```

---

*YARP Specialist v2.0 — Generic*
*Sources: E1 yarp*
*Pattern range: 113.1–113.2*
