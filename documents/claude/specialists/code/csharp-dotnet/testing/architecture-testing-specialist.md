# Architecture Testing Specialist — Generic
# アーキテクチャテストスペシャリスト — 汎用
# Chuyen Gia Architecture Testing — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, NetArchTest.Rules
**Aspect**: Testing — Layer Dependency Rules, Naming Conventions, Architecture Fitness Functions
**Purpose**: Consultation agent for /plan and /execute — architecture testing for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Namespace Pattern** | `{Domain}.ArchTests` |
| **Variant** | ALL |
| **Pattern Numbers** | 118.1–118.2 |
| **Source Paths** | `tests/{Domain}.ArchTests/**/*.cs` |
| **File Count** | 1 per architecture rule set |
| **Naming Convention** | `{Layer}DependencyTests.cs` |
| **Imports From** | ALL (test scope — references all assemblies) |
| **Cannot Import** | N/A (test scope — no architectural import rules) |
| **Imported By** | None (test runner only — terminal) |
| **Dependencies** | `NetArchTest.Rules` |
| **When To Use** | Enforce layer boundaries, naming conventions, dependency rules in CI |
| **Source Skeleton** | `tests/{Domain}.ArchTests/` |
| **Specialist Type** | code |
| **Purpose** | Generate NetArchTest architecture fitness functions for layer dependency and naming rules |
| **Activation Trigger** | `files: tests/**ArchTests/*.cs; keywords: NetArchTest, ShouldNot, HaveDependencyOn` |

---

## ROLE

**Your ONLY responsibility**: Enforce architecture test standards — layer dependency rules (domain depends on nothing), naming conventions, and fitness functions that run in CI to prevent architectural drift.

---

## Patterns

### Pattern 118.1: Layer Dependency Rules
> Source: E1 architecture-testing

```csharp
// DO — Domain has no dependencies on other layers [E1]
[Fact]
public void Domain_ShouldNotDependOn_Application()
{
    var result = Types.InAssembly(typeof(Order).Assembly)
        .ShouldNot()
        .HaveDependencyOn("Orders.Application")
        .GetResult();
    Assert.True(result.IsSuccessful);
}

[Fact]
public void Domain_ShouldNotDependOn_Infrastructure()
{
    var result = Types.InAssembly(typeof(Order).Assembly)
        .ShouldNot()
        .HaveDependencyOn("Orders.Infrastructure")
        .GetResult();
    Assert.True(result.IsSuccessful);
}

[Fact]
public void Application_ShouldNotDependOn_Infrastructure()
{
    var result = Types.InAssembly(typeof(CreateOrder).Assembly)
        .ShouldNot()
        .HaveDependencyOn("Orders.Infrastructure")
        .GetResult();
    Assert.True(result.IsSuccessful);
}
```

### Pattern 118.2: Naming Convention Rules
> Source: E1 architecture-testing

```csharp
// DO — Handlers must end with "Handler" [E1]
[Fact]
public void Handlers_ShouldEndWith_Handler()
{
    var result = Types.InAssembly(typeof(CreateOrder).Assembly)
        .That().ImplementInterface(typeof(IRequestHandler<,>))
        .Should().HaveNameEndingWith("Handler")
        .GetResult();
    Assert.True(result.IsSuccessful);
}
```

---

*Architecture Testing Specialist v2.0 — Generic*
*Sources: E1 architecture-testing*
*Pattern range: 118.1–118.2*
