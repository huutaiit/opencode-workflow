# NestJS Elasticsearch Specialist — Search
# NestJS Elasticsearchスペシャリスト — 検索
# Chuyen Gia Elasticsearch NestJS — Tim Kiem

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/elasticsearch
**Aspect**: Elasticsearch Integration
**Category**: search
**Purpose**: Knowledge provider for NestJS Elasticsearch — index management, query DSL, aggregations, bulk operations, search service patterns, reindexing strategies

---

## Metadata

```json
{
  "id": "nestjs-elasticsearch-specialist",
  "technology": "NestJS 10+ Elasticsearch",
  "aspect": "Elasticsearch Integration",
  "category": "search",
  "subcategory": "nestjs",
  "lines": 300,
  "token_cost": 1800,
  "version": "1.0.0",
  "evidence": [
    "E1: @nestjs/elasticsearch — NestJS module wrapping @elastic/elasticsearch client",
    "E2: Elasticsearch 8.x — index management, query DSL, aggregations",
    "E3: Search service patterns — sync data from DB, search from ES"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 257.1–257.6 |
| **Directory Pattern** | `src/infrastructure/search/` |
| **Dependencies** | @nestjs/elasticsearch, @elastic/elasticsearch |
| **When To Use** | Full-text search with Elasticsearch — indexing, querying, aggregations |
| **Source Skeleton** | src/infrastructure/search/{entity}-search.service.ts, src/infrastructure/search/search-index.service.ts |
| **Specialist Type** | code |
| **Purpose** | Elasticsearch integration — indexing, search, aggregations, bulk operations |
| **Activation Trigger** | files: **/search/**; keywords: elasticsearch, elasticSearch, index, search, aggregation |

---

## Role

You are a **NestJS Elasticsearch Specialist**. You supply patterns for integrating Elasticsearch with NestJS — module setup, index management, search queries, aggregations, data synchronization from PostgreSQL, and reindexing strategies.

---

## Patterns

### Pattern 257.1: Module Setup

```typescript
@Module({
  imports: [
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: { apiKey: process.env.ES_API_KEY },
      maxRetries: 3,
      requestTimeout: 5000,
    }),
  ],
  providers: [ProductSearchService, OrderSearchService],
  exports: [ProductSearchService, OrderSearchService],
})
export class SearchModule {}
```

---

### Pattern 257.2: Index Management

```typescript
@Injectable()
export class SearchIndexService implements OnModuleInit {
  constructor(private readonly es: ElasticsearchService) {}

  async onModuleInit() {
    await this.ensureIndex('products', {
      mappings: {
        properties: {
          name: { type: 'text', analyzer: 'standard' },
          description: { type: 'text' },
          category: { type: 'keyword' },
          price: { type: 'float' },
          tags: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
      settings: { number_of_shards: 1, number_of_replicas: 1 },
    });
  }

  private async ensureIndex(name: string, body: any) {
    const exists = await this.es.indices.exists({ index: name });
    if (!exists) await this.es.indices.create({ index: name, body });
  }
}
```

---

### Pattern 257.3: Search Service

```typescript
@Injectable()
export class ProductSearchService {
  constructor(private readonly es: ElasticsearchService) {}

  async search(query: string, filters?: ProductFilters): Promise<SearchResult<Product>> {
    const must: any[] = [];
    const filter: any[] = [];

    if (query) {
      must.push({
        multi_match: { query, fields: ['name^3', 'description', 'tags^2'], fuzziness: 'AUTO' },
      });
    }
    if (filters?.category) filter.push({ term: { category: filters.category } });
    if (filters?.minPrice || filters?.maxPrice) {
      filter.push({ range: { price: { gte: filters.minPrice, lte: filters.maxPrice } } });
    }

    const result = await this.es.search({
      index: 'products',
      body: {
        query: { bool: { must, filter } },
        sort: [{ _score: 'desc' }, { createdAt: 'desc' }],
        from: filters?.offset || 0,
        size: filters?.limit || 20,
      },
    });

    return {
      data: result.hits.hits.map(hit => ({ id: hit._id, ...hit._source as any })),
      total: (result.hits.total as any).value,
    };
  }

  async index(product: Product): Promise<void> {
    await this.es.index({
      index: 'products',
      id: product.id,
      body: { name: product.name, description: product.description, category: product.category, price: product.price, tags: product.tags, createdAt: product.createdAt },
    });
  }

  async remove(productId: string): Promise<void> {
    await this.es.delete({ index: 'products', id: productId });
  }
}
```

---

### Pattern 257.4: Data Sync from DB

```typescript
// Sync on entity change via events
@OnEvent('product.created')
@OnEvent('product.updated')
async handleProductChange(event: ProductChangedEvent) {
  const product = await this.productRepo.findById(event.productId);
  if (product) await this.searchService.index(product);
}

@OnEvent('product.deleted')
async handleProductDeleted(event: ProductDeletedEvent) {
  await this.searchService.remove(event.productId);
}

// Full reindex (bulk)
async reindexAll() {
  const stream = await this.productRepo.createQueryBuilder('p').stream();
  const batch: any[] = [];

  for await (const row of stream) {
    batch.push({ index: { _index: 'products', _id: row.id } }, row);
    if (batch.length >= 2000) {
      await this.es.bulk({ body: batch });
      batch.length = 0;
    }
  }
  if (batch.length > 0) await this.es.bulk({ body: batch });
}
```

---

### Pattern 257.5: Aggregations

```typescript
async getCategoryStats(): Promise<CategoryStat[]> {
  const result = await this.es.search({
    index: 'products',
    body: {
      size: 0,
      aggs: {
        categories: {
          terms: { field: 'category', size: 50 },
          aggs: { avg_price: { avg: { field: 'price' } } },
        },
      },
    },
  });
  return result.aggregations.categories.buckets.map(b => ({
    category: b.key, count: b.doc_count, avgPrice: b.avg_price.value,
  }));
}
```

---

## Best Practices

- ES = search layer, PostgreSQL = source of truth
- Sync data via events — create/update/delete triggers ES update
- Use `multi_match` with field boosting for relevance ranking
- Bulk operations for reindexing — never index one-by-one for large datasets

---

## Abnormal Case Patterns

1. **Data drift** — ES out of sync with DB. Fix: periodic full reindex + event-based sync.
2. **Mapping conflict** — Field type changed. Fix: create new index, reindex, alias swap.
3. **Search slow** — Too many fields analyzed. Fix: use `keyword` for exact match, `text` for full-text only.
4. **Bulk timeout** — Too many docs per bulk. Fix: batch 1000-2000 docs per bulk request.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (257.1-257.5)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Elasticsearch Specialist — Search | EPS v3.2*
