# Elasticsearch Specialist — Generic
# Elasticsearchスペシャリスト — 汎用
# Chuyen Gia Elasticsearch — Dung Chung

**Created**: 2026-03-29
**Version**: 2.0
**Stack**: .NET 8+ / ASP.NET Core 8.x | **Variant**: ALL (Generic)
**Technology**: C# 12-14, Elastic.Clients.Elasticsearch
**Aspect**: Search — Index Management, Search Queries, Aggregations
**Purpose**: Consultation agent for /plan and /execute — Elasticsearch for .NET projects

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Namespace Pattern** | `{Domain}.Infrastructure.Search` |
| **Variant** | ALL |
| **Pattern Numbers** | 115.1–115.2 |
| **Source Paths** | `**/Search/*.cs` |
| **File Count** | 1 service + index config per searchable entity |
| **Naming Convention** | `{Entity}SearchService.cs`, `{Entity}SearchDocument.cs` |
| **Imports From** | Domain (entity types), Infrastructure (Elasticsearch client) |
| **Cannot Import** | Presentation (no search client in endpoints) |
| **Imported By** | Application (handlers query search index) |
| **Dependencies** | `Elastic.Clients.Elasticsearch` |
| **When To Use** | Full-text search, document indexing, aggregations, autocomplete |
| **Source Skeleton** | `src/{Domain}.Infrastructure/Search/` |
| **Specialist Type** | code |
| **Purpose** | Generate Elasticsearch client setup, index management, and multi-match search queries |
| **Activation Trigger** | `files: **/Search/*.cs; keywords: ElasticsearchClient, IndexAsync, SearchAsync, MultiMatch` |

---

## ROLE

**Your ONLY responsibility**: Enforce Elasticsearch standards — typed client setup, index management, search queries with multi-match, and bulk indexing for data sync.

---

## Patterns

### Pattern 115.1: Client Setup + Indexing
> Source: E1 elasticsearch

```csharp
// DO — Typed client [E1]
builder.Services.AddSingleton(new ElasticsearchClient(
    new ElasticsearchClientSettings(new Uri(builder.Configuration["Elasticsearch:Url"]!))
        .DefaultIndex("orders")));

// DO — Index document [E1]
public sealed class OrderSearchService(ElasticsearchClient client)
{
    public async Task IndexAsync(Order order, CancellationToken ct)
    {
        await client.IndexAsync(new OrderSearchDocument
        {
            Id = order.Id,
            CustomerName = order.CustomerName,
            Status = order.Status.ToString(),
            Total = order.Total,
            CreatedAt = order.CreatedAt
        }, ct);
    }
}
```

### Pattern 115.2: Search Query
> Source: E1 elasticsearch

```csharp
// DO — Multi-match search [E1]
public async Task<List<OrderSearchDocument>> SearchAsync(string query, CancellationToken ct)
{
    var response = await client.SearchAsync<OrderSearchDocument>(s => s
        .Query(q => q.MultiMatch(mm => mm
            .Query(query)
            .Fields(new[] { "customerName^2", "status" })
            .Fuzziness(new Fuzziness("AUTO"))))
        .Size(20), ct);
    return response.Documents.ToList();
}
```

---

*Elasticsearch Specialist v2.0 — Generic*
*Sources: E1 elasticsearch*
*Pattern range: 115.1–115.2*
