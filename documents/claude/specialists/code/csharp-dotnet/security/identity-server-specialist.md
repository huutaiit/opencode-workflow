# Identity Server Specialist — Generic
# Identity Serverスペシャリスト — 汎用
# Chuyen Gia Identity Server — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Duende IdentityServer
**Aspect**: Security — OAuth 2.x/OIDC Server, Clients, Scopes, Grants
**Purpose**: Consultation agent for /plan and /execute — IdentityServer for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.IdentityServer` |
| **Variant** | ALL |
| **Pattern Numbers** | 117.1–117.2 |
| **Source Paths** | `**/IdentityServer/*.cs, appsettings*.json` |
| **File Count** | 5–10 config + entity files |
| **Naming Convention** | `Config.cs`, `{Grant}Profile.cs` |
| **Imports From** | Infrastructure (key storage, DB) |
| **Cannot Import** | Domain (no domain logic in auth server) |
| **Imported By** | Infrastructure (API projects validate tokens issued by this server) |
| **Dependencies** | `Duende.IdentityServer` |
| **When To Use** | Self-hosted OAuth2/OIDC provider, client credentials, authorization code flow |
| **Source Skeleton** | `src/{Domain}.IdentityServer/` |
| **Specialist Type** | code |
| **Purpose** | Generate Duende IdentityServer OAuth2/OIDC configuration with client types and token lifetimes |
| **Activation Trigger** | `files: **/IdentityServer/*.cs, appsettings*.json; keywords: AddIdentityServer, Clients, ApiScopes` |

---

## ROLE

**Your ONLY responsibility**: Enforce IdentityServer standards — proper grant types per client, scope design, token lifetime configuration, and PKCE for public clients.

---

## Patterns

### Pattern 117.1: Client Configuration
> Source: E1 identity-server

```csharp
// DO — Configured clients [E1]
builder.Services.AddIdentityServer()
    .AddInMemoryClients(new[]
    {
        // Machine-to-machine (API client)
        new Client
        {
            ClientId = "orders-api",
            AllowedGrantTypes = GrantTypes.ClientCredentials,
            ClientSecrets = { new Secret("secret".Sha256()) },
            AllowedScopes = { "orders.read", "orders.write" }
        },
        // SPA (public client with PKCE)
        new Client
        {
            ClientId = "spa-client",
            AllowedGrantTypes = GrantTypes.Code,
            RequirePkce = true,
            RequireClientSecret = false,
            RedirectUris = { "https://spa.example.com/callback" },
            AllowedScopes = { "openid", "profile", "orders.read" }
        }
    })
    .AddInMemoryApiScopes(new[]
    {
        new ApiScope("orders.read"),
        new ApiScope("orders.write")
    });
```

### Pattern 117.2: Token Lifetimes
> Source: E1 identity-server

```csharp
// DO — Short access tokens, longer refresh tokens [E1]
new Client
{
    AccessTokenLifetime = 300,       // 5 minutes
    AbsoluteRefreshTokenLifetime = 86400, // 24 hours
    SlidingRefreshTokenLifetime = 3600,   // 1 hour sliding
    RefreshTokenUsage = TokenUsage.OneTimeOnly,
    RefreshTokenExpiration = TokenExpiration.Sliding
}
```

---

*Identity Server Specialist v2.0 — Generic*
*Sources: E1 identity-server*
*Pattern range: 117.1–117.2*
