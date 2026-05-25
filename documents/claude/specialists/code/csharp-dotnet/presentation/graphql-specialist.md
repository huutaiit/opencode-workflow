# GraphQL Specialist — Generic
# GraphQLスペシャリスト — 汎用
# Chuyen Gia GraphQL — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, HotChocolate
**Aspect**: Presentation — Schema Design, Resolvers, DataLoader, Filtering/Sorting/Paging
**Purpose**: Consultation agent for /plan and /execute — GraphQL patterns for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | WebAPI |
| **Namespace Pattern** | `{Domain}.Api.GraphQL` |
| **Variant** | ALL |
| **Naming Convention** | `{Type}Type.cs`, `{Entity}Resolver.cs` |
| **Imports From** | Application (service/handler interfaces) |
| **Cannot Import** | Domain (entities directly), Infrastructure |
| **Pattern Numbers** | 106.1–106.2 |
| **Source Paths** | `**/GraphQL/*.cs` |
| **File Count** | 2–5 (Query + Mutation + types) |
| **Imported By** | None (HTTP entry point — terminal) |
| **Dependencies** | `HotChocolate.AspNetCore`, `HotChocolate.Data` |
| **When To Use** | GraphQL APIs, schema-first/code-first, DataLoader for N+1, filtering/paging |
| **Source Skeleton** | `src/{Domain}.Api/GraphQL/` |
| **Specialist Type** | code |
| **Purpose** | Generate HotChocolate GraphQL schema, resolvers, and DataLoaders for N+1 prevention |
| **Activation Trigger** | `files: **/GraphQL/*.cs; keywords: QueryType, MutationType, AddGraphQLServer, DataLoader` |

---

## ROLE

**Your ONLY responsibility**: Enforce HotChocolate GraphQL standards — code-first schema, DataLoader for N+1 prevention, filtering/sorting/paging, and proper error handling.

---

## Patterns

### Pattern 106.1: Code-First Schema
> Source: E1 graphql

```csharp
// DO — Code-first with annotations [E1]
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddFiltering()
    .AddSorting()
    .AddProjections();

[QueryType]
public sealed class Query
{
    [UsePaging] [UseProjection] [UseFiltering] [UseSorting]
    public IQueryable<Order> GetOrders(AppDbContext db) => db.Orders;
}
```

### Pattern 106.2: DataLoader for N+1
> Source: E1 graphql

```csharp
// DO — Batch DataLoader [E1]
public sealed class CustomerByIdDataLoader(
    IBatchScheduler batchScheduler, AppDbContext db)
    : BatchDataLoader<Guid, Customer>(batchScheduler)
{
    protected override async Task<IReadOnlyDictionary<Guid, Customer>> LoadBatchAsync(
        IReadOnlyList<Guid> keys, CancellationToken ct)
    {
        return await db.Customers
            .Where(c => keys.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, ct);
    }
}
```

---

*GraphQL Specialist v2.0 — Generic*
*Sources: E1 graphql*
*Pattern range: 106.1–106.2*
