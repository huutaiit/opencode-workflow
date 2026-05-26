# Validation Specialist — Generic
# バリデーションスペシャリスト — 汎用
# Chuyen Gia Validation — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, FluentValidation
**Aspect**: Application — Cross-Layer Validation, Rule Builders, Async Validators
**Purpose**: Consultation agent for /plan and /execute — validation patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Namespace Pattern** | `{Domain}.Application.Validators` |
| **Variant** | ALL |
| **Naming Convention** | `{Request}Validator.cs` |
| **Imports From** | Application (request types), Domain (entity constraints) |
| **Cannot Import** | Infrastructure, Presentation |
| **Pattern Numbers** | 105.1–105.3 |
| **Source Paths** | `**/Validators/**Validator.cs` |
| **File Count** | 1 per request type |
| **Imported By** | Application (pipeline behavior calls validators) |
| **Dependencies** | `FluentValidation`, `FluentValidation.DependencyInjectionExtensions` |
| **When To Use** | Request validation, cross-property rules, async validators, conditional rules |
| **Source Skeleton** | `src/{Domain}.Application/Validators/` |
| **Specialist Type** | code |
| **Purpose** | Generate FluentValidation validators with async rules and MediatR pipeline integration |
| **Activation Trigger** | `files: **/Validators/**Validator.cs; keywords: AbstractValidator, RuleFor, ValidateAsync` |

---

## ROLE

**Your ONLY responsibility**: Enforce FluentValidation standards — one validator per request, validate at system boundary (not in domain), auto-register via DI, and integration with MediatR pipeline behavior.

---

## Patterns

### Pattern 105.1: Validator Per Request
> Source: E1 validation

```csharp
// DO — Validator class per request [E1]
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty().WithMessage("Customer ID is required");
        RuleFor(x => x.Items).NotEmpty().WithMessage("At least one item is required");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId).NotEmpty();
            item.RuleFor(x => x.Quantity).GreaterThan(0);
        });
    }
}

// DO — Auto-register all validators [E1]
builder.Services.AddValidatorsFromAssembly(typeof(CreateOrderValidator).Assembly);
```

### Pattern 105.2: MediatR Pipeline Validation
> Source: E1 validation

```csharp
// DO — ValidationBehavior runs before handler [E1]
public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(TRequest request,
        RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = (await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, ct))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count > 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

### Pattern 105.3: Async Validation (DB Check)
> Source: E1 validation

```csharp
// DO — Async validator for uniqueness check [E1]
public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserValidator(AppDbContext db)
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MustAsync(async (email, ct) =>
                !await db.Users.AnyAsync(u => u.Email == email, ct))
            .WithMessage("Email already registered");
    }
}
```

---

*Validation Specialist v2.0 — Generic*
*Sources: E1 validation*
*Pattern range: 105.1–105.3*
