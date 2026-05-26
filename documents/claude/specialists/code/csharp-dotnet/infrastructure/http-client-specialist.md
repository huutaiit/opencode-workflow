# HTTP Client Specialist — Generic
# HTTPクライアントスペシャリスト — 汎用
# Chuyen Gia HTTP Client — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, IHttpClientFactory
**Aspect**: Infrastructure — Typed Clients, Named Clients, Delegating Handlers, Connection Pooling
**Purpose**: Consultation agent for /plan and /execute — HTTP client patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.HttpClients` |
| **Variant** | ALL |
| **Pattern Numbers** | 87.1–87.3 |
| **Source Paths** | `**/HttpClients/*.cs` |
| **File Count** | 1 interface + 1 impl per external API |
| **Naming Convention** | `I{Service}Client` / `{Service}Client` |
| **Imports From** | Application (service interfaces), Infrastructure (resilience) |
| **Cannot Import** | Domain (no HTTP in domain), Presentation (no client in endpoints) |
| **Imported By** | Application (handlers call external APIs via typed clients) |
| **Dependencies** | `Microsoft.Extensions.Http` |
| **When To Use** | External API calls, typed HttpClient, delegating handlers, resilience integration |
| **Source Skeleton** | `src/{Domain}.Infrastructure/HttpClients/` |
| **Specialist Type** | code |
| **Purpose** | Generate typed HTTP clients with IHttpClientFactory, delegating handlers, and resilience |
| **Activation Trigger** | `files: **/HttpClients/*.cs; keywords: IHttpClientFactory, AddHttpClient, DelegatingHandler` |

---

## ROLE

**Your ONLY responsibility**: Enforce HTTP client standards — always use IHttpClientFactory (never `new HttpClient()`), typed clients with interface, delegating handlers for cross-cutting, and resilience handler integration.

---

## Patterns

### Pattern 87.1: Typed HTTP Client
> Source: E1 http-client

```csharp
// DO — Interface + typed client [E1]
public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(ChargeRequest request, CancellationToken ct);
}

public sealed class PaymentGatewayClient(HttpClient http) : IPaymentGateway
{
    public async Task<PaymentResult> ChargeAsync(ChargeRequest request, CancellationToken ct)
    {
        var response = await http.PostAsJsonAsync("/v1/charges", request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PaymentResult>(ct)
            ?? throw new InvalidOperationException("Empty response");
    }
}

// DO — Register with resilience [E1]
builder.Services.AddHttpClient<IPaymentGateway, PaymentGatewayClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["PaymentGateway:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(30);
})
.AddStandardResilienceHandler();
```

```csharp
// DON'T — new HttpClient() [E1]
var client = new HttpClient();  // Socket exhaustion, DNS caching issues
var response = await client.GetAsync("https://api.example.com/data");
```

### Pattern 87.2: Delegating Handler for Cross-Cutting
> Source: E1 http-client

```csharp
// DO — Auth token propagation [E1]
public sealed class AuthTokenHandler(IHttpContextAccessor http) : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = http.HttpContext?.Request.Headers.Authorization.FirstOrDefault();
        if (token is not null)
            request.Headers.Authorization = AuthenticationHeaderValue.Parse(token);
        return base.SendAsync(request, ct);
    }
}

builder.Services.AddTransient<AuthTokenHandler>();
builder.Services.AddHttpClient<ICatalogService, CatalogServiceClient>()
    .AddHttpMessageHandler<AuthTokenHandler>()
    .AddStandardResilienceHandler();
```

---

*HTTP Client Specialist v2.0 — Generic*
*Sources: E1 http-client*
*Pattern range: 87.1–87.3*
