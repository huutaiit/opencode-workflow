# Domain Exception Specialist — Generic
# ドメイン例外スペシャリスト — 汎用
# Chuyen Gia Domain Exception — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Ardalis.Result (optional)
**Aspect**: Domain — Custom Exceptions, Result Types, Error Hierarchy
**Purpose**: Consultation agent for /plan and /execute — domain exception patterns

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Namespace Pattern** | `{Domain}.Domain.Exceptions` |
| **Variant** | ALL |
| **Naming Convention** | `{Domain}Exception.cs` |
| **Imports From** | None (Domain depends on nothing) |
| **Cannot Import** | Application, Infrastructure, Presentation |
| **Pattern Numbers** | 111.1–111.2 |
| **Source Paths** | `**/Domain/Exceptions/*.cs` |
| **File Count** | 3–10 per bounded context |
| **Imported By** | Application (handlers catch/handle domain exceptions) |
| **Dependencies** | `Ardalis.Result` (optional) |
| **When To Use** | Custom domain exceptions, Result<T> types, error hierarchy |
| **Source Skeleton** | `src/{Domain}.Domain/Exceptions/` |
| **Specialist Type** | code |
| **Purpose** | Generate custom domain exception hierarchy and Result<T> pattern for expected failures |
| **Activation Trigger** | `files: **/Domain/Exceptions/*.cs; keywords: DomainException, Result, Failure` |

---

## ROLE

**Your ONLY responsibility**: Enforce domain exception standards — Result pattern for expected failures, custom exception hierarchy for truly unexpected errors, and clear separation between expected (Result) and unexpected (Exception) failures.

---

## Patterns

### Pattern 111.1: Exception Hierarchy
> Source: E1 domain

```csharp
// DO — Base domain exception [E1]
public abstract class DomainException(string message) : Exception(message);

public sealed class OrderNotFoundException(Guid orderId)
    : DomainException($"Order {orderId} was not found");

public sealed class InsufficientStockException(string productId, int requested, int available)
    : DomainException($"Product {productId}: requested {requested}, available {available}");
```

### Pattern 111.2: Result vs Exception Decision
> Source: E1 domain

| Scenario | Use |
|----------|-----|
| Validation failure | `Result.Failure("...")` |
| Entity not found | `Result.Failure("...")` |
| Business rule violation | `Result.Failure("...")` |
| Null reference, DB connection lost | `Exception` (unexpected) |
| External service timeout | `Exception` (unexpected, caught by resilience) |

```csharp
// DO — Result for expected [E1]
public Result<Order> Cancel(string reason)
{
    if (Status == OrderStatus.Shipped)
        return Result.Failure<Order>("Cannot cancel a shipped order");
    Status = OrderStatus.Cancelled;
    return Result.Success(this);
}

// DON'T — Exception for expected failure [E1]
public void Cancel() => throw new InvalidOperationException("Cannot cancel shipped order");
```

---

*Domain Exception Specialist v2.0 — Generic*
*Sources: E1 domain*
*Pattern range: 111.1–111.2*
