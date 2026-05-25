# Domain Value Object Specialist — Clean Architecture
# ドメイン値オブジェクトスペシャリスト — クリーンアーキテクチャ
# Chuyen Gia Value Object Domain — Clean Architecture

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Clean Architecture)
**Technology**: C# 12-14, EF Core 8 Complex Types
**Aspect**: Domain Layer — Value Objects, Immutability, Structural Equality
**Purpose**: Consultation agent for /plan and /execute — value object patterns for Clean Architecture

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Namespace Pattern** | `{Domain}.Domain.ValueObjects` |
| **Variant** | ALL |
| **Naming Convention** | `{Name}.cs` (sealed record) |
| **Imports From** | None (Domain depends on nothing) |
| **Cannot Import** | Application, Infrastructure, Presentation |
| **Pattern Numbers** | 1.2 |
| **Source Paths** | `**/Domain/ValueObjects/*.cs` |
| **File Count** | 5–15 per bounded context |
| **Imported By** | Domain (entities compose value objects), Infrastructure (EF Core complex type mapping) |
| **Dependencies** | None (C# records — no external packages) |
| **When To Use** | Immutable value types, money, addresses, EF Core 8 complex types |
| **Source Skeleton** | `src/{Domain}.Domain/ValueObjects/` |
| **Specialist Type** | code |
| **Purpose** | Generate immutable value objects as sealed records with constructor validation and equality |
| **Activation Trigger** | `files: **/Domain/ValueObjects/*.cs; keywords: sealed record, Money, Address, ValueObject` |

---

## ROLE

**Your ONLY responsibility**: Enforce value object standards — sealed records with constructor validation, structural equality, operator overloading, and EF Core complex type mapping.

---

## Patterns

### Pattern 1.2: Value Objects as Records
> Source: E1 ddd, E2 csharp-coding-standards-value-objects

Sealed records with constructor validation. Structural equality. No public setters.

```csharp
// DO — Value object with validation [E1]
public sealed record Money
{
    public decimal Amount { get; }
    public string Currency { get; }
    public Money(decimal amount, string currency)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(amount);
        ArgumentException.ThrowIfNullOrWhiteSpace(currency);
        Amount = amount; Currency = currency.ToUpperInvariant();
    }
    public static Money Zero(string currency) => new(0, currency);
    public static Money operator +(Money left, Money right)
    {
        if (left.Currency != right.Currency)
            throw new InvalidOperationException($"Cannot add {left.Currency} and {right.Currency}");
        return new Money(left.Amount + right.Amount, left.Currency);
    }
}

// DO — Address value object [E1]
public sealed record Address(string Street, string City, string PostalCode, string Country)
{
    public Address(string street, string city, string postalCode, string country) : this(
        street ?? throw new ArgumentNullException(nameof(street)),
        city ?? throw new ArgumentNullException(nameof(city)),
        postalCode ?? throw new ArgumentNullException(nameof(postalCode)),
        country ?? throw new ArgumentNullException(nameof(country)))
    { }
}
```

```csharp
// DON'T — Mutable value object [E1]
public class Money
{
    public decimal Amount { get; set; }   // Mutable — not a value object
    public string Currency { get; set; }  // Can be changed after creation
}

// DON'T — Primitive obsession [E1]
public class Order
{
    public decimal TotalAmount { get; set; }  // What currency? What precision?
    public string CustomerEmail { get; set; } // No validation
}
```

---

*Domain Value Object Specialist v2.0 — Clean Architecture*
*Sources: E1 ddd, E2 csharp-coding-standards-value-objects*
*Pattern range: 1.2*
