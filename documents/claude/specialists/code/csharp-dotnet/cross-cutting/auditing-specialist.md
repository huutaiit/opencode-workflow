# Auditing Specialist — Generic
# 監査スペシャリスト — 汎用
# Chuyen Gia Audit Trail — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, EF Core Interceptors
**Aspect**: Cross-Cutting — Audit Trail, Change Tracking, Who/What/When
**Purpose**: Consultation agent for /plan and /execute — auditing patterns for any .NET project

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Auditing` |
| **Variant** | ALL |
| **Pattern Numbers** | 86.1–86.2 |
| **Source Paths** | `**/Auditing/*.cs, **/Interceptors/**Audit*.cs` |
| **File Count** | 1 interceptor + 1 audit entity |
| **Naming Convention** | `AuditInterceptor.cs`, `AuditEntry.cs` |
| **Imports From** | Infrastructure (DbContext, HttpContextAccessor) |
| **Cannot Import** | Domain (no audit logic in domain), Presentation |
| **Imported By** | Infrastructure (registered as EF Core interceptor) |
| **Dependencies** | `Microsoft.EntityFrameworkCore` |
| **When To Use** | Audit trail, who/what/when tracking, change log, compliance |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Auditing/` |
| **Specialist Type** | code |
| **Purpose** | Generate EF Core SaveChangesInterceptor for automatic audit trail (who/what/when) |
| **Activation Trigger** | `files: **/Auditing/*.cs, **/Interceptors/**Audit*.cs; keywords: IAuditable, SaveChangesInterceptor, CreatedBy` |

---

## ROLE

**Your ONLY responsibility**: Enforce auditing standards — EF Core SaveChangesInterceptor for automatic audit trail, IAuditable interface on entities, and who/what/when capture without polluting domain logic.

---

## Patterns

### Pattern 86.1: IAuditable + SaveChangesInterceptor
> Source: E1 auditing

```csharp
// DO — Auditable interface [E1]
public interface IAuditable
{
    DateTimeOffset CreatedAt { get; set; }
    string CreatedBy { get; set; }
    DateTimeOffset? ModifiedAt { get; set; }
    string? ModifiedBy { get; set; }
}

// DO — Interceptor sets audit fields automatically [E1]
public sealed class AuditInterceptor(IHttpContextAccessor http, TimeProvider clock)
    : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct)
    {
        var userId = http.HttpContext?.User.FindFirst("sub")?.Value ?? "system";
        var now = clock.GetUtcNow();

        foreach (var entry in eventData.Context!.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedBy = userId;
            }
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.ModifiedAt = now;
                entry.Entity.ModifiedBy = userId;
            }
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }
}

// Register
services.AddSingleton<AuditInterceptor>();
services.AddDbContext<AppDbContext>((sp, options) =>
    options.AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));
```

### Pattern 86.2: Audit Log Table (Optional)
> Source: E1 auditing

```csharp
// DO — Separate audit log for compliance [E1]
public record AuditEntry(string EntityType, string EntityId, string Action,
    string? OldValues, string? NewValues, string UserId, DateTimeOffset Timestamp);
```

---

*Auditing Specialist v2.0 — Generic*
*Sources: E1 auditing*
*Pattern range: 86.1–86.2*
