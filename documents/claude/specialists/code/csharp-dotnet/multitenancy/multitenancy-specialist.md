# Multitenancy Specialist — Generic
# マルチテナンシースペシャリスト — 汎用
# Chuyen Gia Multitenancy — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Finbuckle.MultiTenant
**Aspect**: Multitenancy — Tenant Resolution, Data Isolation, Per-Tenant Config
**Purpose**: Consultation agent for /plan and /execute — multitenancy for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Tenants` |
| **Variant** | ALL |
| **Pattern Numbers** | 116.1–116.2 |
| **Source Paths** | `**/Tenants/*.cs, Program.cs` |
| **File Count** | 1 config + tenant entity |
| **Naming Convention** | `TenantInfo.cs` |
| **Imports From** | Infrastructure (DbContext, HttpContext) |
| **Cannot Import** | Domain (no tenant logic in domain layer) |
| **Imported By** | ALL (tenant context flows through all layers via middleware) |
| **Dependencies** | `Finbuckle.MultiTenant` |
| **When To Use** | SaaS applications, tenant resolution, data isolation strategies |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Tenants/` |
| **Specialist Type** | code |
| **Purpose** | Configure Finbuckle.MultiTenant resolution strategies and EF Core row-level data isolation |
| **Activation Trigger** | `files: **/Tenants/*.cs, Program.cs; keywords: MultiTenant, TenantInfo, HasQueryFilter, WithHeaderStrategy` |

---

## ROLE

**Your ONLY responsibility**: Enforce multitenancy standards — Finbuckle for tenant resolution, data isolation strategy (DB-per-tenant, schema, row-level), and EF Core global query filter for row-level isolation.

---

## Patterns

### Pattern 116.1: Tenant Resolution
> Source: E1 multitenancy

```csharp
// DO — Finbuckle setup [E1]
builder.Services.AddMultiTenant<TenantInfo>()
    .WithHeaderStrategy("X-Tenant")         // Resolve from header
    .WithEFCoreStore<TenantDbContext, TenantInfo>();

app.UseMultiTenant();

// DO — Access tenant in code [E1]
public sealed class OrderService(IMultiTenantContextAccessor<TenantInfo> tenantAccessor)
{
    public string GetTenantId() => tenantAccessor.MultiTenantContext?.TenantInfo?.Id
        ?? throw new InvalidOperationException("No tenant context");
}
```

### Pattern 116.2: Row-Level Isolation via EF Core
> Source: E1 multitenancy

```csharp
// DO — Global query filter per tenant [E1]
public interface ITenantEntity { string TenantId { get; set; } }

protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Order>().HasQueryFilter(
        o => o.TenantId == _tenantAccessor.MultiTenantContext!.TenantInfo!.Id);
}
```

---

*Multitenancy Specialist v2.0 — Generic*
*Sources: E1 multitenancy*
*Pattern range: 116.1–116.2*
