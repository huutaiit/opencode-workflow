# Integration Testing Specialist — Generic
# 統合テストスペシャリスト — 汎用
# Chuyen Gia Integration Testing — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: xUnit v3, WebApplicationFactory, Testcontainers, Verify.Xunit
**Aspect**: Testing — WebApplicationFactory, Testcontainers, Snapshot Testing
**Purpose**: Consultation agent for /plan and /execute — integration testing patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Namespace Pattern** | `{Domain}.IntegrationTests` |
| **Variant** | ALL |
| **Pattern Numbers** | 67.1, 67.2, 67.6 |
| **Source Paths** | `tests/{Domain}.IntegrationTests/**/*.cs` |
| **File Count** | 1 per endpoint group |
| **Naming Convention** | `{Feature}Tests.cs`, `ApiFixture.cs` |
| **Imports From** | ALL (test scope — imports whatever it tests) |
| **Cannot Import** | N/A (test scope — no architectural import rules) |
| **Imported By** | None (test runner only — terminal) |
| **Dependencies** | `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers`, `Verify.Xunit` |
| **When To Use** | API endpoint tests, real DB with Testcontainers, snapshot testing |
| **Source Skeleton** | `tests/{Domain}.IntegrationTests/` |
| **Specialist Type** | code |
| **Purpose** | Generate integration tests with WebApplicationFactory and real databases via Testcontainers |
| **Activation Trigger** | `files: tests/**IntegrationTests/*.cs; keywords: WebApplicationFactory, Testcontainers, IClassFixture` |

---

## ROLE

**Your ONLY responsibility**: Enforce integration testing standards — WebApplicationFactory as the foundation, Testcontainers for real databases (never in-memory), Verify for complex response snapshots, and IClassFixture for shared expensive resources.

---

## Patterns

### Pattern 67.1: Integration Tests First — WebApplicationFactory
> Source: E1 testing, E1-rules testing

Integration tests are the highest-value tests. A single `WebApplicationFactory` test covers routing, binding, validation, business logic, and persistence.

```csharp
// DO — Integration test with WebApplicationFactory [E1]
public class CreateOrderTests(ApiFixture fixture) : IClassFixture<ApiFixture>
{
    private readonly HttpClient _client = fixture.CreateClient();

    [Fact]
    public async Task CreateOrder_ReturnsCreated_WithValidRequest()
    {
        // Arrange
        var request = new CreateOrderRequest("customer-1", [new("product-1", 2)]);

        // Act
        var response = await _client.PostAsJsonAsync("/api/orders", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        Assert.NotEqual(Guid.Empty, order.Id);
    }
}
```

### Pattern 67.2: Real Databases — Testcontainers (No In-Memory)
> Source: E1 testing, E1-rules testing, E2 testcontainers

Use Testcontainers to spin up real database instances. `UseInMemoryDatabase` hides real bugs.

```csharp
// DO — ApiFixture with Testcontainers [E1]
public class ApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:17")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync() => await _postgres.DisposeAsync();
}
```

```csharp
// DON'T — In-memory database [E1-rules]
services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));
// Hides: transactions, constraints, SQL translation, query behavior
```

### Pattern 67.6: Verify Snapshot Testing
> Source: E1 testing

Use Verify for complex response objects where manual assertions would be fragile.

```csharp
// DO — Snapshot test for complex responses [E1]
[Fact]
public async Task GetOrder_MatchesSnapshot()
{
    await SeedOrder(fixture);
    var response = await _client.GetAsync("/api/orders/known-id");
    var content = await response.Content.ReadAsStringAsync();
    await Verify(content);
}
// Creates OrderTests.GetOrder_MatchesSnapshot.verified.txt
```

---

*Integration Testing Specialist v2.0 — Generic*
*Sources: E1 testing, E1-rules testing, E2 testcontainers*
*Pattern range: 67.1, 67.2, 67.6*
