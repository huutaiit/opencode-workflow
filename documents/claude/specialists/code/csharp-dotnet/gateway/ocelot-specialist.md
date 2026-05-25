# Ocelot Specialist — Generic
# Ocelotスペシャリスト — 汎用
# Chuyen Gia Ocelot — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Ocelot
**Aspect**: Gateway — Route Templating, Aggregation, Rate Limiting, Auth Delegation
**Purpose**: Consultation agent for /plan and /execute — Ocelot API gateway for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Gateway` |
| **Variant** | ALL |
| **Pattern Numbers** | 114.1 |
| **Source Paths** | `ocelot.json, **/Gateway/*.cs` |
| **File Count** | 1 config file + Program.cs setup |
| **Naming Convention** | `ocelot.json`, `ocelot.{env}.json` |
| **Imports From** | Infrastructure (downstream service URLs from config) |
| **Cannot Import** | Domain, Application (gateway routes, doesn't process) |
| **Imported By** | Infrastructure (API gateway deployment) |
| **Dependencies** | `Ocelot` |
| **When To Use** | API gateway with rich routing, request aggregation, auth delegation |
| **Source Skeleton** | `src/{Domain}.Gateway/`, `ocelot.json` |
| **Specialist Type** | code |
| **Purpose** | Generate Ocelot API gateway route configurations with aggregation and auth delegation |
| **Activation Trigger** | `files: ocelot.json, **/Gateway/*.cs; keywords: Ocelot, Routes, UpstreamPathTemplate, Aggregation` |

---

## ROLE

**Your ONLY responsibility**: Enforce Ocelot standards — ocelot.json routing, request aggregation, rate limiting delegation, and authentication forwarding.

---

## Patterns

### Pattern 114.1: Route Configuration
> Source: E1 ocelot

```json
// DO — ocelot.json [E1]
{
  "Routes": [{
    "UpstreamPathTemplate": "/api/orders/{everything}",
    "UpstreamHttpMethod": ["GET", "POST", "PUT", "DELETE"],
    "DownstreamPathTemplate": "/api/orders/{everything}",
    "DownstreamScheme": "https",
    "DownstreamHostAndPorts": [{ "Host": "orders-service", "Port": 8080 }],
    "AuthenticationOptions": { "AuthenticationProviderKey": "Bearer" },
    "RateLimitOptions": { "EnableRateLimiting": true, "Period": "1m", "Limit": 100 }
  }]
}
```

```csharp
// DO — Setup [E1]
builder.Configuration.AddJsonFile("ocelot.json");
builder.Services.AddOcelot();
app.UseOcelot().Wait();
```

---

*Ocelot Specialist v2.0 — Generic*
*Sources: E1 ocelot*
*Pattern range: 114.1*
