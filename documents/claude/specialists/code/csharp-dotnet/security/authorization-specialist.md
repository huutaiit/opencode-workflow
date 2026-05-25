# Authorization Specialist — Generic
# 認可スペシャリスト — 汎用
# Chuyen Gia Phan Quyen — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Policy-Based Authorization
**Aspect**: Security — Authorization Policies, Claims, Requirements, Handlers
**Purpose**: Consultation agent for /plan and /execute — authorization patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Auth` |
| **Variant** | ALL |
| **Pattern Numbers** | 66.2, 66.7 |
| **Source Paths** | `**/Auth/*.cs, Program.cs` |
| **File Count** | 1 policy config + 1 per custom handler |
| **Naming Convention** | `{Requirement}Handler.cs` |
| **Imports From** | Application (user claims), Domain (user roles) |
| **Cannot Import** | N/A (authorization is cross-cutting — applied at middleware level, not a bounded module) |
| **Imported By** | Presentation (RequireAuthorization on endpoints) |
| **Dependencies** | None (uses ASP.NET Core built-in authorization) |
| **When To Use** | Policy-based authorization, custom requirements, claims-based access |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Auth/`, `AuthorizationPolicies.cs` |
| **Specialist Type** | code |
| **Purpose** | Generate policy-based authorization with custom requirements and IAuthorizationHandler |
| **Activation Trigger** | `files: **/Auth/*.cs, Program.cs; keywords: AddAuthorizationBuilder, AddPolicy, RequireAuthorization` |

---

## ROLE

**Your ONLY responsibility**: Enforce authorization standards — policy-based over role strings, custom IAuthorizationRequirement + handlers, claims, and RequireAuthorization on endpoints.

---

## Patterns

### Pattern 66.2: Policy-Based Authorization
> Source: E1 authentication

Policies over role strings. Policies are testable, composable, and more expressive.

```csharp
// DO — Define policies [E1]
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"))
    .AddPolicy("CanManageOrders", policy => policy
        .RequireAuthenticatedUser()
        .RequireClaim("permission", "orders:write"))
    .AddPolicy("MinimumAge", policy => policy
        .AddRequirements(new MinimumAgeRequirement(18)));

// DO — Custom requirement + handler [E1]
public class MinimumAgeRequirement(int minimumAge) : IAuthorizationRequirement
{
    public int MinimumAge => minimumAge;
}

public class MinimumAgeHandler(TimeProvider clock)
    : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, MinimumAgeRequirement requirement)
    {
        var dob = context.User.FindFirst("date_of_birth");
        if (dob is not null && DateOnly.TryParse(dob.Value, out var date)
            && date.AddYears(requirement.MinimumAge) <= DateOnly.FromDateTime(clock.GetUtcNow().DateTime))
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}

// DO — Protect endpoints [E1]
app.MapGroup("/api/admin")
    .RequireAuthorization("AdminOnly");

group.MapPost("/", CreateOrder)
    .RequireAuthorization("CanManageOrders");
```

```csharp
// DON'T — Magic role strings everywhere [E1]
[Authorize(Roles = "Admin,SuperAdmin,Manager")]  // Hard to refactor, not testable

// DON'T — Unmarked endpoints [E1-rules]
app.MapGet("/orders", GetOrders);  // No auth — inherits whatever global default is
```

### Pattern 66.7: 6-Layer Security Scan Checklist
> Source: E1 security-scan

| Layer | What | Tool/Method |
|-------|------|-------------|
| 1. Packages | Known CVEs | `dotnet list package --vulnerable --include-transitive` |
| 2. Secrets | Hardcoded secrets in source | Pattern scan (.cs, .json, .yml, .config) |
| 3. OWASP | Injection, XSS, deserialization | Code pattern analysis |
| 4. Auth | Missing [Authorize], weak JWT config | Configuration review |
| 5. CORS | Wildcard origins, overly broad | Policy review |
| 6. Data | PII in logs, unencrypted sensitive data | Log and response review |

---

*Authorization Specialist v2.0 — Generic*
*Sources: E1 authentication, E1 security-scan*
*Pattern range: 66.2, 66.7*
