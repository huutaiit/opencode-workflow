# Dapper Specialist — Generic
# Dapperスペシャリスト — 汎用
# Chuyen Gia Dapper — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Dapper
**Aspect**: Data Access — Micro-ORM, SqlMapper, Stored Procedures, When to Use vs EF Core
**Purpose**: Consultation agent for /plan and /execute — Dapper patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Data` |
| **Variant** | ALL |
| **Naming Convention** | `{Feature}ReadRepository.cs` |
| **Imports From** | Domain (DTO types), Infrastructure (IDbConnection) |
| **Cannot Import** | Presentation |
| **Pattern Numbers** | 109.1–109.2 |
| **Source Paths** | `**/ReadRepositories/*.cs, **/Queries/*.cs` |
| **File Count** | 1 per read model |
| **Imported By** | Application (CQRS query handlers use Dapper reads) |
| **Dependencies** | `Dapper` |
| **When To Use** | Read-heavy CQRS queries, complex SQL, stored procedures, performance-critical paths |
| **Source Skeleton** | N/A (query pattern on existing data access) |
| **Specialist Type** | code |
| **Purpose** | Generate Dapper micro-ORM queries for CQRS read-side and stored procedures |
| **Activation Trigger** | `files: **/ReadRepositories/*.cs; keywords: QueryAsync, SqlMapper, Dapper, IDbConnection` |

---

## ROLE

**Your ONLY responsibility**: Enforce Dapper standards — use for CQRS read-side queries where EF Core projections are insufficient, parameterized queries, multi-mapping for joins, and proper connection management.

---

## Patterns

### Pattern 109.1: Query with Dapper
> Source: E1 dapper

```csharp
// DO — Dapper for complex read queries [E1]
public sealed class OrderReadRepository(IDbConnectionFactory connectionFactory)
{
    public async Task<OrderDetailDto?> GetDetailAsync(Guid id, CancellationToken ct)
    {
        using var connection = connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<OrderDetailDto>(
            """
            SELECT o.Id, o.Status, o.Total, c.Name AS CustomerName, COUNT(ol.Id) AS ItemCount
            FROM Orders o
            JOIN Customers c ON o.CustomerId = c.Id
            LEFT JOIN OrderLines ol ON ol.OrderId = o.Id
            WHERE o.Id = @Id AND o.IsDeleted = 0
            GROUP BY o.Id, o.Status, o.Total, c.Name
            """, new { Id = id });
    }
}
```

### Pattern 109.2: When Dapper vs EF Core
> Source: E1 dapper

| Scenario | Use |
|----------|-----|
| CRUD with change tracking | EF Core |
| Complex joins/aggregates for reads | Dapper |
| Stored procedures | Dapper |
| Bulk insert/update | EF Core `ExecuteUpdate` or Dapper |
| Simple projections | EF Core `.Select()` |
| Performance-critical hot path | Dapper |

---

*Dapper Specialist v2.0 — Generic*
*Sources: E1 dapper*
*Pattern range: 109.1–109.2*
