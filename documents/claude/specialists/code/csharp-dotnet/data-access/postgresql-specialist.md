# PostgreSQL Specialist — Generic
# PostgreSQLスペシャリスト — 汎用
# Chuyen Gia PostgreSQL — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Npgsql, EF Core PostgreSQL
**Aspect**: Data Access — JSONB, Arrays, Full-Text Search, PostgreSQL-Specific Features
**Purpose**: Consultation agent for /plan and /execute — PostgreSQL patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Data` |
| **Variant** | ALL |
| **Naming Convention** | N/A — uses same naming as ef-core specialist |
| **Imports From** | Domain (entity types), Infrastructure (DbContext, Npgsql) |
| **Cannot Import** | Presentation |
| **Pattern Numbers** | 110.1–110.2 |
| **Source Paths** | `**/Data/*.cs, **/EntityConfigurations/*.cs` |
| **File Count** | Varies with PostgreSQL-specific entities |
| **Imported By** | Infrastructure (EF Core configuration uses PostgreSQL extensions) |
| **Dependencies** | `Npgsql.EntityFrameworkCore.PostgreSQL` |
| **When To Use** | PostgreSQL-specific: JSONB columns, array types, full-text search |
| **Source Skeleton** | N/A (EF Core configuration) |
| **Specialist Type** | rule-set |
| **Purpose** | Generate PostgreSQL-specific EF Core features — JSONB columns, arrays, full-text search |
| **Activation Trigger** | `files: **/Data/*.cs, **/EntityConfigurations/*.cs; keywords: HasColumnType jsonb, UseNpgsql, ToTsQuery` |

---

## ROLE

**Your ONLY responsibility**: Enforce PostgreSQL-specific standards — JSONB for semi-structured data, array columns, full-text search with tsvector, and Npgsql-specific EF Core configuration.

---

## Patterns

### Pattern 110.1: JSONB Columns
> Source: E1 postgresql

```csharp
// DO — JSONB column mapping [E1]
public class OrderMetadata
{
    public string? Source { get; set; }
    public Dictionary<string, string>? Tags { get; set; }
}

// EF Core configuration
builder.Property(o => o.Metadata).HasColumnType("jsonb");

// DO — Query JSONB [E1]
var orders = await db.Orders
    .Where(o => EF.Functions.JsonContains(o.Metadata, new { Source = "web" }))
    .ToListAsync();
```

### Pattern 110.2: Full-Text Search
> Source: E1 postgresql

```csharp
// DO — tsvector full-text search [E1]
var results = await db.Products
    .Where(p => p.SearchVector.Matches(EF.Functions.ToTsQuery("english", query)))
    .OrderByDescending(p => p.SearchVector.Rank(EF.Functions.ToTsQuery("english", query)))
    .ToListAsync();
```

---

*PostgreSQL Specialist v2.0 — Generic*
*Sources: E1 postgresql*
*Pattern range: 110.1–110.2*
