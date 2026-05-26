# EF Core Interceptor Specialist — Generic
# EF Coreインターセプタースペシャリスト — 汎用
# Chuyen Gia EF Core Interceptor — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: Entity Framework Core 8+, C# 12-14
**Aspect**: Data Access — SaveChangesInterceptor, DbCommandInterceptor, Soft Delete, Query Tagging
**Purpose**: Consultation agent for /plan and /execute — EF Core interceptor patterns

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Data.Interceptors` |
| **Variant** | ALL |
| **Naming Convention** | `{Concern}Interceptor.cs` |
| **Imports From** | Domain (entity interfaces), Infrastructure (DbContext) |
| **Cannot Import** | Presentation |
| **Pattern Numbers** | 64.91–64.92 |
| **Source Paths** | `**/Data/Interceptors/*.cs` |
| **File Count** | 2–4 per project |
| **Imported By** | Infrastructure (registered in DbContext options) |
| **Dependencies** | `Microsoft.EntityFrameworkCore` |
| **When To Use** | Audit logging, soft delete, domain event dispatch, query tagging |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Data/Interceptors/` |
| **Specialist Type** | code |
| **Purpose** | Generate EF Core interceptors for soft delete, audit logging, and domain event dispatch |
| **Activation Trigger** | `files: **/Data/Interceptors/*.cs; keywords: SaveChangesInterceptor, DbCommandInterceptor` |

---

## ROLE

**Your ONLY responsibility**: Enforce EF Core interceptor standards — SaveChangesInterceptor for audit/soft-delete, DbCommandInterceptor for query tagging, and proper interceptor registration via AddInterceptors.

---

## Patterns

### Pattern 64.91: Soft Delete Interceptor
> Source: E1 ef-core

```csharp
// DO — Soft delete via interceptor [E1]
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTimeOffset? DeletedAt { get; set; }
}

public sealed class SoftDeleteInterceptor(TimeProvider clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct)
    {
        foreach (var entry in eventData.Context!.ChangeTracker.Entries<ISoftDeletable>()
            .Where(e => e.State == EntityState.Deleted))
        {
            entry.State = EntityState.Modified;
            entry.Entity.IsDeleted = true;
            entry.Entity.DeletedAt = clock.GetUtcNow();
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }
}

// DO — Global query filter [E1]
modelBuilder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted);
```

### Pattern 64.92: Interceptor Registration
> Source: E1 ef-core

```csharp
// DO — Register interceptors via DI [E1]
services.AddSingleton<AuditInterceptor>();
services.AddSingleton<SoftDeleteInterceptor>();
services.AddSingleton<DomainEventDispatcher>();

services.AddDbContext<AppDbContext>((sp, options) =>
    options
        .UseSqlServer(connectionString)
        .AddInterceptors(
            sp.GetRequiredService<AuditInterceptor>(),
            sp.GetRequiredService<SoftDeleteInterceptor>(),
            sp.GetRequiredService<DomainEventDispatcher>()));
```

---

*EF Core Interceptor Specialist v2.0 — Generic*
*Sources: E1 ef-core*
*Pattern range: 64.91–64.92*
