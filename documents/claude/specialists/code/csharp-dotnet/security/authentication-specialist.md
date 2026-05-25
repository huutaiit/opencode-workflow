# Authentication Specialist — Generic
# 認証スペシャリスト — 汎用
# Chuyen Gia Xac Thuc — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, JWT Bearer, OAuth2/OIDC
**Aspect**: Security — JWT Authentication, Token Validation
**Purpose**: Consultation agent for /plan and /execute — authentication patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Auth` |
| **Variant** | ALL |
| **Pattern Numbers** | 66.1 |
| **Source Paths** | `**/Auth/*.cs, Program.cs` |
| **File Count** | 1–3 auth config files |
| **Naming Convention** | `AuthenticationConfig.cs` |
| **Imports From** | Infrastructure (key management) |
| **Cannot Import** | Domain (no auth logic in domain) |
| **Imported By** | Presentation (authentication middleware protects endpoints) |
| **Dependencies** | `Microsoft.AspNetCore.Authentication.JwtBearer` |
| **When To Use** | JWT Bearer authentication, token validation, signing key configuration |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Auth/` |
| **Specialist Type** | code |
| **Purpose** | Generate JWT Bearer authentication with token validation and signing key configuration |
| **Activation Trigger** | `files: Program.cs, **/Auth/*.cs; keywords: AddAuthentication, JwtBearerDefaults, TokenValidationParameters` |

---

## ROLE

**Your ONLY responsibility**: Enforce authentication standards — JWT Bearer configuration, token validation parameters, issuer/audience/lifetime validation, signing key security, and ClockSkew tuning.

---

## Patterns

### Pattern 66.1: JWT Bearer Authentication
> Source: E1 authentication

Use JWT for APIs. Validate issuer, audience, lifetime, and signing key. Never disable validation parameters.

```csharp
// DO — Secure JWT configuration [E1]
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Convert.FromBase64String(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.FromMinutes(1)  // Default 5 min is too generous
        };
    });

builder.Services.AddAuthorization();
```

```csharp
// DON'T — Disabled validation [E1]
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = false,      // Anyone can issue tokens
    ValidateAudience = false,    // Token works for any app
    ValidateLifetime = false,    // Expired tokens accepted
};

// DON'T — Short signing key [E1-rules]
IssuerSigningKey = new SymmetricSecurityKey("short-key"u8.ToArray());  // < 256 bits
```

---

*Authentication Specialist v2.0 — Generic*
*Sources: E1 authentication*
*Pattern range: 66.1*
