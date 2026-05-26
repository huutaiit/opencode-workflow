# Vertical Slice Architecture Specialist — Generic
# 垂直スライスアーキテクチャスペシャリスト — 汎用
# Chuyen Gia Vertical Slice — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, MediatR or FastEndpoints
**Aspect**: Architecture — Feature Folders, Per-Feature Handler/Validator/Endpoint
**Purpose**: Consultation agent for /plan and /execute — Vertical Slice patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-layer — defines per-feature organization across all layers) |
| **Namespace Pattern** | `{Domain}.Features.{Feature}` |
| **Variant** | ALL |
| **Pattern Numbers** | 81.1–81.3 |
| **Source Paths** | `**/Features/**/*.cs` |
| **File Count** | 3–5 per feature (handler + validator + endpoint) |
| **Naming Convention** | Feature-based folders |
| **Imports From** | N/A (each feature is self-contained — no cross-feature imports by design) |
| **Cannot Import** | N/A (no shared service layer by design — cross-feature via domain events only) |
| **Imported By** | ALL (feature organization informs all file placement) |
| **Dependencies** | `MediatR` or `FastEndpoints` (optional) |
| **When To Use** | Feature-folder organization, minimal shared abstractions, per-feature isolation |
| **Source Skeleton** | `src/Features/{Feature}/` |
| **Specialist Type** | architecture |
| **Purpose** | Define Vertical Slice architecture with per-feature handler/validator/endpoint isolation |
| **Activation Trigger** | `phase: ALL; keywords: featureFolder, verticalSlice, REPR` |

---

## ROLE

**Your ONLY responsibility**: Enforce Vertical Slice standards — one folder per feature containing endpoint + handler + validator + model, minimize shared abstractions, and cross-feature communication via events only.

---

## Patterns

### Pattern 81.1: Feature Folder Structure
> Source: E1 architecture

```
src/
├── Features/
│   ├── Orders/
│   │   ├── CreateOrder.cs          # Command + Handler + Response
│   │   ├── CreateOrderValidator.cs
│   │   ├── CreateOrderEndpoint.cs
│   │   ├── GetOrder.cs             # Query + Handler + Response
│   │   └── GetOrderEndpoint.cs
│   └── Products/
│       ├── CreateProduct.cs
│       └── ListProducts.cs
├── Common/                          # Minimal shared (Result, ProblemDetails mapping)
└── Program.cs
```

### Pattern 81.2: Single-File Feature (MediatR)
> Source: E1 architecture

```csharp
// DO — Everything for one use case in one file [E1]
public static class CreateOrder
{
    public record Command(string CustomerId, List<OrderItem> Items) : IRequest<Result<OrderResponse>>;

    public record OrderResponse(Guid Id, string Status, decimal Total);

    internal sealed class Handler(AppDbContext db) : IRequestHandler<Command, Result<OrderResponse>>
    {
        public async Task<Result<OrderResponse>> Handle(Command cmd, CancellationToken ct)
        {
            var order = Order.Place(new CustomerId(Guid.Parse(cmd.CustomerId)));
            foreach (var item in cmd.Items)
                order.AddLine(new ProductId(item.ProductId), item.Quantity, item.UnitPrice);

            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);
            return new OrderResponse(order.Id, order.Status.ToString(), order.Total.Amount);
        }
    }
}
```

### Pattern 81.3: No Shared Service Layer
> Source: E1 architecture

```csharp
// DON'T — Shared service that every feature depends on [E1]
public class OrderService  // God class that grows with every feature
{
    public Task<Order> CreateOrder(...) { }
    public Task<Order> GetOrder(...) { }
    public Task CancelOrder(...) { }
    public Task RefundOrder(...) { }
}

// DO — Each feature is self-contained, no shared orchestration layer
// Cross-feature: use domain events (MediatR INotification)
```

---

## Architecture: Folder Tree

<!-- Parser-compatible alias for Pattern 81.1 -->

```
src/
├── Features/
│   ├── Orders/
│   │   ├── CreateOrder.cs          # Command + Handler + Response
│   │   ├── CreateOrderValidator.cs
│   │   ├── CreateOrderEndpoint.cs
│   │   ├── GetOrder.cs             # Query + Handler + Response
│   │   └── GetOrderEndpoint.cs
│   └── Products/
│       ├── CreateProduct.cs
│       └── ListProducts.cs
├── Common/                          # Minimal shared (Result, ProblemDetails mapping)
└── Program.cs
```

## Architecture: Dependency Rules

<!-- Parser-compatible alias for Pattern 81.3 -->

| From | Can Import | Cannot Import |
|------|-----------|--------------|
| Feature A | Common, Domain Events | Feature B (direct) |
| Common | (nothing — shared kernel only) | Any Feature |
| Program.cs | All Features (registration) | Feature internals |

FORBIDDEN:
- Direct cross-feature imports (use domain events or integration events)
- Shared service classes that orchestrate multiple features

## Architecture: File Type Mapping

<!-- Parser-compatible mapping for plan §0.1 -->

| File Type | Layer | Path Pattern |
|-----------|-------|-------------|
| Command + Handler | Feature | `Features/{Feature}/Create{Feature}.cs` |
| Query + Handler | Feature | `Features/{Feature}/Get{Feature}.cs` |
| Validator | Feature | `Features/{Feature}/*Validator.cs` |
| Endpoint | Feature | `Features/{Feature}/*Endpoint.cs` |
| Shared Result | Common | `Common/Result.cs` |
| Program Entry | Host | `Program.cs` |

## Architecture: Feature Completeness

<!-- Parser-compatible checklist for plan verification -->

### Rule 1: New Feature → MUST have

- [ ] Feature folder in `Features/{Feature}/`
- [ ] Command or Query record + Handler in single file
- [ ] Validator for the command/query
- [ ] Endpoint exposing the handler
- [ ] Unit test in `Tests/Features/{Feature}/`

### Rule 2: Cross-Feature Communication → MUST use

- [ ] Domain events (MediatR INotification) — no direct imports
- [ ] Shared contracts in `Common/` only for truly shared types (Result, base types)

### Rule 3: Validation

- [ ] No cross-feature direct references
- [ ] No shared service classes (OrderService, ProductService, etc.)
- [ ] Each feature folder is self-contained

---

*Vertical Slice Architecture Specialist v2.0 — Generic*
*Sources: E1 architecture*
*Pattern range: 81.1–81.3*
