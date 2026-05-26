# CORS Specialist — Generic
# CORSスペシャリスト — 汎用
# Chuyen Gia CORS — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, CORS Middleware
**Aspect**: Security — CORS Policies, Origin Allowlisting, Credentials
**Purpose**: Consultation agent for /plan and /execute — CORS configuration for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api` |
| **Variant** | ALL |
| **Pattern Numbers** | 66.5 |
| **Source Paths** | `Program.cs` |
| **File Count** | 1 (CORS config in Program.cs) |
| **Naming Convention** | N/A (middleware configuration in Program.cs, not new file creation) |
| **Imports From** | Infrastructure (allowed origins from config) |
| **Cannot Import** | N/A (CORS is middleware configuration — not a bounded module) |
| **Imported By** | Presentation (CORS middleware protects all endpoints) |
| **Dependencies** | None (uses ASP.NET Core built-in CORS) |
| **When To Use** | CORS policy configuration, explicit origins, credentials, preflight |
| **Source Skeleton** | N/A (middleware configuration in Program.cs) |
| **Specialist Type** | code |
| **Purpose** | Configure CORS policies with explicit origin allowlisting and credential rules |
| **Activation Trigger** | `files: Program.cs; keywords: AddCors, WithOrigins, AllowCredentials, UseCors` |

---

## ROLE

**Your ONLY responsibility**: Enforce CORS standards — explicit origins only (no wildcard in production), named policies, WithMethods/WithHeaders restrictions, and AllowCredentials rules.

---

## Patterns

### Pattern 66.5: CORS — Explicit Origins Only
> Source: E1 security-scan, E1-rules security

Never wildcard in production. Explicit origins, methods, headers.

```csharp
// DO — Explicit origins [E1-rules]
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!)
              .AllowCredentials()
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization");
    });
});
```

```csharp
// DON'T — Wildcard in production [E1-rules]
policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();

// DON'T — Wildcard with credentials [E1]
policy.AllowAnyOrigin().AllowCredentials();  // Browsers block this, signals misunderstanding
```

---

*CORS Specialist v2.0 — Generic*
*Sources: E1 security-scan, E1-rules security*
*Pattern range: 66.5*
