# Unit Testing Specialist — Generic
# ユニットテストスペシャリスト — 汎用
# Chuyen Gia Unit Testing — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: xUnit v3, NSubstitute, AutoFixture, FluentAssertions
**Aspect**: Testing — AAA Pattern, Behavior Testing, Naming Conventions, Test Data Builders
**Purpose**: Consultation agent for /plan and /execute — unit testing patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Namespace Pattern** | `{Domain}.Tests` |
| **Variant** | ALL |
| **Pattern Numbers** | 67.3, 67.4, 67.5, 67.7, 67.8, 67.9 |
| **Source Paths** | `tests/{Domain}.Tests/**/*.cs` |
| **File Count** | 1:1 with source classes |
| **Naming Convention** | `MethodName_StateUnderTest_ExpectedBehavior` |
| **Imports From** | ALL (test scope — imports whatever it tests) |
| **Cannot Import** | N/A (test scope — no architectural import rules) |
| **Imported By** | None (test runner only — terminal) |
| **Dependencies** | `xunit` (v3), `NSubstitute`, `FluentAssertions` |
| **When To Use** | AAA pattern, behavior-driven assertions, test data builders, time testing |
| **Source Skeleton** | `tests/{Domain}.Tests/` |
| **Specialist Type** | code |
| **Purpose** | Generate xUnit unit tests with AAA pattern, FakeTimeProvider, and test data builders |
| **Activation Trigger** | `files: tests/**Tests/*.cs; keywords: Fact, Theory, Arrange, Assert, FakeTimeProvider` |

---

## ROLE

**Your ONLY responsibility**: Enforce unit testing standards — AAA pattern, test behavior not implementation, consistent naming, test data builders, FakeTimeProvider, and shared fixtures with correct mocking rules.

---

## Patterns

### Pattern 67.3: AAA Pattern — Mandatory
> Source: E1 testing, E1-rules testing

Every test has three clearly separated sections: Arrange, Act, Assert. No mixing.

```csharp
// DO — Clear AAA separation [E1-rules]
[Fact]
public async Task CreateOrder_WithValidItems_ReturnsSuccessResult()
{
    // Arrange
    var clock = new FakeTimeProvider(new DateTimeOffset(2025, 1, 15, 0, 0, 0, TimeSpan.Zero));
    var service = new OrderService(db, clock);
    var request = new CreateOrderRequest("customer-1", [new("product-1", 2)]);

    // Act
    var result = await service.CreateAsync(request);

    // Assert
    Assert.True(result.IsSuccess);
    Assert.NotEqual(Guid.Empty, result.Value.Id);
}
```

### Pattern 67.4: Test Behavior, Not Implementation
> Source: E1 testing, E1-rules testing

Assert on observable outcomes (HTTP response, database state, published event), not which internal methods were called.

```csharp
// DO — Assert observable outcome [E1-rules]
var order = await db.Orders.FindAsync(orderId);
Assert.NotNull(order);
Assert.Equal(OrderStatus.Created, order.Status);
```

```csharp
// DON'T — Verify internal method calls [E1-rules]
mock.Verify(x => x.AddAsync(It.IsAny<Order>()), Times.Once);
// Couples tests to implementation details
```

### Pattern 67.5: Test Naming Convention
> Source: E1 testing

Pattern: `MethodName_StateUnderTest_ExpectedBehavior`. One assertion concept per test.

```
CreateOrder_WithValidItems_ReturnsSuccessResult
CreateOrder_WithEmptyItems_ReturnsValidationError
CancelOrder_WhenAlreadyShipped_ReturnsConflict
```

### Pattern 67.7: Test Data Builders
> Source: E1 testing, E5 bdd-dotnet

Fluent builders for test data setup.

```csharp
// DO — Builder pattern for test data [E1]
public class OrderBuilder
{
    private string _customerId = "default-customer";
    private List<OrderItem> _items = [new("product-1", 1, 9.99m)];

    public OrderBuilder WithCustomer(string id) { _customerId = id; return this; }
    public OrderBuilder WithItems(params OrderItem[] items) { _items = [..items]; return this; }
    public Order Build() => Order.Create(_customerId, _items);
}
```

### Pattern 67.8: Testing Time-Dependent Code
> Source: E1 testing

Use `TimeProvider` (.NET 8+) and `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing`.

```csharp
// DO — FakeTimeProvider for time control [E1]
var clock = new FakeTimeProvider(new DateTimeOffset(2025, 6, 1, 0, 0, 0, TimeSpan.Zero));
clock.Advance(TimeSpan.FromDays(31));  // Time travel
```

### Pattern 67.9: Shared Fixtures and Mocking Rules
> Source: E1-rules testing, E5 bdd-dotnet

Use `IClassFixture<T>` for expensive shared resources. No mocking frameworks for things you own — use real or fake implementations.

```csharp
// DO — Fake implementation instead of mock [E5]
public class FakeClock : TimeProvider
{
    private DateTimeOffset _now;
    public override DateTimeOffset GetUtcNow() => _now;
    public void Advance(TimeSpan duration) => _now += duration;
}

// DON'T — Mock internal interfaces [E1-rules]
var mockRepo = new Mock<IOrderRepository>();
// If you own IOrderRepository, use the real implementation with Testcontainers
```

---

*Unit Testing Specialist v2.0 — Generic*
*Sources: E1 testing, E1-rules testing, E5 bdd-dotnet*
*Pattern range: 67.3–67.5, 67.7–67.9*
