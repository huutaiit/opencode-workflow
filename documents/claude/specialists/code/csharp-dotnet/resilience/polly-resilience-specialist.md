# Polly Resilience Specialist — Generic
# Polly耐障害性スペシャリスト — 汎用
# Chuyen Gia Polly Resilience — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Polly v8, Microsoft.Extensions.Http.Resilience
**Aspect**: Resilience — Retry, Circuit Breaker, Timeout, Fallback, Hedging
**Purpose**: Consultation agent for /plan and /execute — Polly v8 resilience patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Resilience` |
| **Variant** | ALL |
| **Pattern Numbers** | 68.1, 68.2, 68.3, 68.4, 68.6, 68.7 |
| **Source Paths** | `**/Resilience/*.cs, Program.cs` |
| **File Count** | 1 config per external dependency |
| **Naming Convention** | `{Service}ResilienceConfig.cs` |
| **Imports From** | Infrastructure (HttpClient, DB connections) |
| **Cannot Import** | Domain, Presentation |
| **Imported By** | Application, Infrastructure (via DI — all HTTP clients use resilience) |
| **Dependencies** | `Polly` (v8), `Microsoft.Extensions.Http.Resilience` |
| **When To Use** | HTTP resilience, database retry, circuit breaker, fallback, telemetry |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Resilience/` |
| **Specialist Type** | code |
| **Purpose** | Generate Polly v8 resilience pipelines — retry, circuit breaker, timeout, fallback, hedging |
| **Activation Trigger** | `files: **/Resilience/*.cs, Program.cs; keywords: AddStandardResilienceHandler, ResiliencePipeline, AddRetry` |

---

## ROLE

**Your ONLY responsibility**: Enforce Polly v8 resilience standards — AddStandardResilienceHandler for HTTP, named pipelines for non-HTTP, fallback for degradation, v8 API only (no v7), and OpenTelemetry integration.

---

## Patterns

### Pattern 68.1: AddStandardResilienceHandler — Default for HTTP
> Source: E1 resilience

For HTTP clients, `AddStandardResilienceHandler()` covers 90% of use cases: retry (3 attempts, exponential backoff, jitter), circuit breaker (10% failure ratio), attempt timeout (10s), total timeout (30s).

```csharp
// DO — Standard resilience handler [E1]
builder.Services.AddHttpClient<IPaymentGateway, PaymentGatewayClient>(client =>
{
    client.BaseAddress = new Uri("https://api.payments.example.com");
})
.AddStandardResilienceHandler();
// That's it. Production-ready defaults.
```

```csharp
// DON'T — Manual wrapping per call site [E1]
public async Task<Order> GetOrderAsync(Guid id)
{
    try { return await _pipeline.ExecuteAsync(async ct => ...); }
    catch (TimeoutRejectedException) { return Order.Empty; }
    catch (BrokenCircuitException) { return Order.Empty; }
}
// Resilience should be at the HttpClient level, not per method
```

### Pattern 68.2: Custom HTTP Resilience Configuration
> Source: E1 resilience

Override thresholds per-service with named resilience handlers.

```csharp
// DO — Named handler with per-service tuning [E1]
builder.Services.AddHttpClient<ICatalogService, CatalogServiceClient>(client =>
{
    client.BaseAddress = new Uri("https://api.catalog.example.com");
})
.AddResilienceHandler("catalog", builder =>
{
    builder.AddTimeout(TimeSpan.FromSeconds(15));
    builder.AddRetry(new HttpRetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,
        Delay = TimeSpan.FromMilliseconds(500),
    });
    builder.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,
        SamplingDuration = TimeSpan.FromSeconds(10),
        MinimumThroughput = 10,
        BreakDuration = TimeSpan.FromSeconds(30)
    });
    builder.AddTimeout(TimeSpan.FromSeconds(5));
});
```

### Pattern 68.3: Non-HTTP Resilience Pipelines
> Source: E1 resilience

For database, message queue, or any non-HTTP operation — register named pipeline, inject via `[FromKeyedServices]`.

```csharp
// DO — Named pipeline for database operations [E1]
builder.Services.AddResiliencePipeline("database", builder =>
{
    builder
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential,
            Delay = TimeSpan.FromMilliseconds(200),
            ShouldHandle = new PredicateBuilder()
                .Handle<TimeoutException>()
                .Handle<InvalidOperationException>(ex =>
                    ex.Message.Contains("deadlock", StringComparison.OrdinalIgnoreCase))
        })
        .AddTimeout(TimeSpan.FromSeconds(10));
});

// DO — Inject and use [E1]
public sealed class OrderRepository(
    AppDbContext db,
    [FromKeyedServices("database")] ResiliencePipeline pipeline)
{
    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await pipeline.ExecuteAsync(
            async token => await db.Orders.FindAsync([id], token), ct);
    }
}
```

### Pattern 68.4: Fallback for Graceful Degradation
> Source: E1 resilience

Use typed `ResiliencePipeline<T>` with fallback to return default values when all retries are exhausted.

```csharp
// DO — Typed pipeline with fallback [E1]
builder.Services.AddResiliencePipeline<string, HttpResponseMessage>("external-api", builder =>
{
    builder
        .AddFallback(new FallbackStrategyOptions<HttpResponseMessage>
        {
            FallbackAction = static args =>
            {
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"status\":\"degraded\",\"data\":[]}")
                };
                return Outcome.FromResultAsValueTask(response);
            }
        })
        .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
        {
            MaxRetryAttempts = 2,
            Delay = TimeSpan.FromMilliseconds(500)
        })
        .AddTimeout(TimeSpan.FromSeconds(5));
});
```

### Pattern 68.6: Polly v8 Only — No v7 API
> Source: E1 resilience

```csharp
// DON'T — Polly v7 syntax [E1]
var retryPolicy = Policy
    .Handle<HttpRequestException>()
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));

// DO — Polly v8 via DI [E1]
builder.Services.AddHttpClient<IDataService, DataServiceClient>()
    .AddStandardResilienceHandler();

// DON'T — Retry non-idempotent operations without idempotency key [E1]
// DO — Use idempotency key for non-idempotent operations [E1]
httpClient.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
```

### Pattern 68.7: Telemetry Integration
> Source: E1 resilience

```csharp
// DO — OpenTelemetry captures Polly metrics [E1]
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics.AddMeter("Polly"));
```

---

*Polly Resilience Specialist v2.0 — Generic*
*Sources: E1 resilience*
*Pattern range: 68.1–68.4, 68.6–68.7*
