# API Versioning Specialist — Generic
# APIバージョニングスペシャリスト — 汎用
# Chuyen Gia API Versioning — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Asp.Versioning
**Aspect**: Presentation — URL Segment Versioning, Deprecation Policies
**Purpose**: Consultation agent for /plan and /execute — API versioning patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Naming Convention** | N/A — configuration pattern, not standalone files |
| **Imports From** | Application (endpoint groups) |
| **Cannot Import** | N/A (configuration middleware) |
| **Pattern Numbers** | 63.6 |
| **Source Paths** | `**/Endpoints/*.cs, Program.cs` |
| **File Count** | Cross-cutting: applied to endpoint groups |
| **Imported By** | Presentation (versioned endpoint groups consume version config) |
| **Dependencies** | `Asp.Versioning` |
| **When To Use** | API versioning from day one, URL segment versioning, deprecation timeline |
| **Source Skeleton** | N/A (configuration pattern) |
| **Specialist Type** | rule-set |
| **Purpose** | Configure Asp.Versioning with URL segment default and deprecation policies |
| **Activation Trigger** | `files: **/Endpoints/*.cs, Program.cs; keywords: ApiVersion, UrlSegmentApiVersionReader, MapToApiVersion` |

---

## ROLE

**Your ONLY responsibility**: Enforce API versioning standards — version from day one, URL segment default, version entire groups (not individual endpoints), and proper deprecation with timeline.

---

## Patterns

### Pattern 63.6: API Versioning — URL Segment
> Source: E1 api-versioning

Version from day one. URL segment (`/api/v1/orders`) is default — discoverable and cache-friendly.

```csharp
// DO — Setup with Asp.Versioning [E1]
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// DO — Version the entire group [E1]
app.MapGroup("/api/v{version:apiVersion}/orders")
    .WithApiVersionSet(v1)
    .WithTags("Orders")
    .MapOrderEndpointsV1();

// DO — Deprecate with timeline [E1]
var v1 = app.NewApiVersionSet()
    .HasDeprecatedApiVersion(new ApiVersion(1, 0))
    .HasApiVersion(new ApiVersion(2, 0))
    .Build();
```

```csharp
// DON'T — Version individual endpoints [E1]
app.MapGet("/api/v1/orders", ListOrdersV1);
app.MapGet("/api/v2/orders/{id}", GetOrderV2);  // V2 only for this one?

// DON'T — Query string versioning (not cache-friendly) [E1]
GET /api/orders?api-version=2.0
```

---

*API Versioning Specialist v2.0 — Generic*
*Sources: E1 api-versioning*
*Pattern range: 63.6*
