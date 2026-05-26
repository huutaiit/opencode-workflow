# Laravel Scout & Elasticsearch Specialist — Search
# Laravel Scout & Elasticsearchスペシャリスト — 検索
# Chuyen Gia Scout va Elasticsearch Laravel — Tim Kiem

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Scout
**Aspect**: Full-Text Search
**Category**: search
**Purpose**: Knowledge provider for Laravel Scout search integration — searchable models, custom engines, Meilisearch/Algolia/Elasticsearch integration, and search testing

---

## Metadata

```json
{
  "id": "laravel-scout-elasticsearch-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Scout",
  "aspect": "Full-Text Search",
  "category": "search",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Scout — driver-based full-text search abstraction",
    "E2: Meilisearch/Algolia — cloud/self-hosted search engines",
    "E3: Elasticsearch via Scout — custom engine driver integration",
    "E4: Searchable model trait — toSearchableArray(), searchable indexes"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 366.1–366.6 |
| **Directory Pattern** | `app/Models/`, `config/scout.php` |
| **Naming Convention** | `Searchable` trait on models |
| **Imports From** | Domain (models) |
| **Imported By** | Application (controllers, services) |
| **Cannot Import** | Presentation layer |
| **Dependencies** | `laravel/scout`, `meilisearch/meilisearch-php` or `algolia/algoliasearch-client-php` |
| **When To Use** | Full-text search, autocomplete, faceted filtering |
| **Source Skeleton** | `app/Models/{Model}.php` with `Searchable` trait |
| **Specialist Type** | code |
| **Purpose** | Laravel Scout search integration — indexing, searching, custom engines |
| **Activation Trigger** | files: `config/scout.php`; keywords: Scout, Searchable, search, full-text, Meilisearch, Algolia, Elasticsearch |

---

## Role

You are a **Laravel Scout & Elasticsearch Specialist**. Your responsibility is to provide best practices for Laravel 11+ full-text search using Scout — searchable model configuration, engine drivers (Meilisearch, Algolia, Elasticsearch), custom search logic, and search testing strategies.

**Used by**: Any code agent implementing search functionality in Laravel applications
**Not used by**: Non-Laravel stacks, projects using only database LIKE queries

---

## Patterns

### Pattern 366.1: Scout Setup

**Category**: Configuration
**Description**: Install and configure Laravel Scout with a search engine driver.

```bash
# Installation
composer require laravel/scout
php artisan vendor:publish --provider="Laravel\Scout\ScoutServiceProvider"

# Meilisearch driver
composer require meilisearch/meilisearch-php http-interop/http-factory-guzzle

# Algolia driver
composer require algolia/algoliasearch-client-php
```

```php
<?php

// config/scout.php
declare(strict_types=1);

return [
    'driver' => env('SCOUT_DRIVER', 'meilisearch'),

    'prefix' => env('SCOUT_PREFIX', ''),

    'queue' => env('SCOUT_QUEUE', true), // Queue index operations

    'after_commit' => true, // Wait for DB transaction commit

    'chunk' => [
        'searchable' => 500,
        'unsearchable' => 500,
    ],

    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://127.0.0.1:7700'),
        'key' => env('MEILISEARCH_KEY'),
        'index-settings' => [
            \App\Models\Product::class => [
                'filterableAttributes' => ['category', 'brand', 'price', 'in_stock'],
                'sortableAttributes' => ['price', 'created_at', 'name'],
                'searchableAttributes' => ['name', 'description', 'sku'],
            ],
        ],
    ],

    'algolia' => [
        'id' => env('ALGOLIA_APP_ID', ''),
        'secret' => env('ALGOLIA_SECRET', ''),
    ],
];
```

**Key Points**:
- Set `queue => true` to avoid blocking HTTP requests with index operations
- `after_commit => true` prevents indexing uncommitted data
- Meilisearch index-settings define filterable, sortable, and searchable attributes
- Use `SCOUT_PREFIX` to namespace indexes per environment (dev_, staging_, prod_)

---

### Pattern 366.2: Searchable Model

**Category**: Model Configuration
**Description**: Configure Eloquent models with the Searchable trait and custom searchable data.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Scout\Searchable;

final class Product extends Model
{
    use Searchable;

    /**
     * Customize the index name.
     */
    public function searchableAs(): string
    {
        return 'products_index';
    }

    /**
     * Define the searchable data array.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->getKey(),
            'name' => $this->name,
            'description' => $this->description,
            'sku' => $this->sku,
            'price' => (float) $this->price,
            'category' => $this->category?->name,
            'brand' => $this->brand?->name,
            'tags' => $this->tags->pluck('name')->toArray(),
            'in_stock' => $this->stock_quantity > 0,
            'created_at' => $this->created_at?->timestamp,
        ];
    }

    /**
     * Determine if the model should be searchable.
     */
    public function shouldBeSearchable(): bool
    {
        return $this->is_published && ! $this->is_archived;
    }

    /** @return BelongsTo<Category, Product> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsToMany<Tag> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }
}
```

**Key Points**:
- `toSearchableArray()` controls exactly what data is indexed — flatten relationships
- `shouldBeSearchable()` prevents draft/archived records from being indexed
- `searchableAs()` customizes the index name — useful for multi-tenant indexes
- Load relationships before indexing: `Product::with(['category', 'tags'])->searchable()`

---

### Pattern 366.3: Custom Search Engine

**Category**: Engine Extension
**Description**: Build a custom Scout engine driver for specialized search backends.

```php
<?php

declare(strict_types=1);

namespace App\Search\Engines;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\LazyCollection;
use Laravel\Scout\Builder;
use Laravel\Scout\Engines\Engine;

final class ElasticsearchEngine extends Engine
{
    public function __construct(
        private readonly \Elastic\Elasticsearch\Client $client,
    ) {}

    public function update($models): void
    {
        if ($models->isEmpty()) {
            return;
        }

        $params = ['body' => []];

        foreach ($models as $model) {
            $params['body'][] = [
                'index' => [
                    '_index' => $model->searchableAs(),
                    '_id' => $model->getScoutKey(),
                ],
            ];
            $params['body'][] = $model->toSearchableArray();
        }

        $this->client->bulk($params);
    }

    public function delete($models): void
    {
        if ($models->isEmpty()) {
            return;
        }

        $params = ['body' => []];

        foreach ($models as $model) {
            $params['body'][] = [
                'delete' => [
                    '_index' => $model->searchableAs(),
                    '_id' => $model->getScoutKey(),
                ],
            ];
        }

        $this->client->bulk($params);
    }

    public function search(Builder $builder): mixed
    {
        return $this->performSearch($builder, [
            'index' => $builder->model->searchableAs(),
            'body' => [
                'query' => [
                    'multi_match' => [
                        'query' => $builder->query,
                        'fields' => ['name^3', 'description', 'sku^2'],
                        'fuzziness' => 'AUTO',
                    ],
                ],
                'size' => $builder->limit ?? 25,
            ],
        ]);
    }

    public function paginate(Builder $builder, $perPage, $page): mixed
    {
        return $this->performSearch($builder, [
            'index' => $builder->model->searchableAs(),
            'body' => [
                'query' => [
                    'multi_match' => [
                        'query' => $builder->query,
                        'fields' => ['name^3', 'description'],
                    ],
                ],
                'from' => ($page - 1) * $perPage,
                'size' => $perPage,
            ],
        ]);
    }

    public function mapIds($results): Collection
    {
        return collect($results['hits']['hits'])->pluck('_id');
    }

    public function map(Builder $builder, $results, $model): Collection
    {
        if ($results['hits']['total']['value'] === 0) {
            return $model->newCollection();
        }

        $ids = $this->mapIds($results)->all();
        return $model->getScoutModelsByIds($builder, $ids)
            ->filter(fn ($model) => in_array($model->getScoutKey(), $ids));
    }

    public function getTotalCount($results): int
    {
        return $results['hits']['total']['value'] ?? 0;
    }

    public function flush($model): void
    {
        $this->client->indices()->delete([
            'index' => $model->searchableAs(),
        ]);
    }

    public function lazyMap(Builder $builder, $results, $model): LazyCollection
    {
        return LazyCollection::make($this->map($builder, $results, $model)->all());
    }

    public function createIndex($name, array $options = []): mixed
    {
        return $this->client->indices()->create([
            'index' => $name,
            'body' => $options,
        ]);
    }

    public function deleteIndex($name): mixed
    {
        return $this->client->indices()->delete(['index' => $name]);
    }

    private function performSearch(Builder $builder, array $params): mixed
    {
        if (! empty($builder->wheres)) {
            $filters = [];
            foreach ($builder->wheres as $field => $value) {
                $filters[] = ['term' => [$field => $value]];
            }
            $params['body']['query'] = [
                'bool' => [
                    'must' => [$params['body']['query']],
                    'filter' => $filters,
                ],
            ];
        }

        return $this->client->search($params);
    }
}
```

**Key Points**:
- Extend `Laravel\Scout\Engines\Engine` abstract class
- Implement all required methods: update, delete, search, paginate, mapIds, map, etc.
- Use bulk operations for batch indexing efficiency
- Field boosting (`name^3`) prioritizes matches in important fields

---

### Pattern 366.4: Meilisearch/Algolia Integration

**Category**: Driver Configuration
**Description**: Configure and use Meilisearch or Algolia as Scout search backends.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'category' => ['nullable', 'string'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', 'in:price_asc,price_desc,relevance'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Product::search($validated['q']);

        // Meilisearch filters
        if ($request->filled('category')) {
            $query->where('category', $validated['category']);
        }

        if ($request->filled('min_price') || $request->filled('max_price')) {
            $query->options([
                'filter' => $this->buildPriceFilter(
                    $validated['min_price'] ?? null,
                    $validated['max_price'] ?? null,
                ),
            ]);
        }

        // Sorting
        if ($validated['sort'] ?? null) {
            $query->options([
                'sort' => match ($validated['sort']) {
                    'price_asc' => ['price:asc'],
                    'price_desc' => ['price:desc'],
                    default => [],
                },
            ]);
        }

        $results = $query->paginate(perPage: $validated['per_page'] ?? 20);

        return response()->json($results);
    }

    /**
     * @return array<string>
     */
    private function buildPriceFilter(?float $min, ?float $max): array
    {
        $filters = [];

        if ($min !== null) {
            $filters[] = "price >= {$min}";
        }
        if ($max !== null) {
            $filters[] = "price <= {$max}";
        }

        return $filters;
    }
}
```

**Key Points**:
- `Product::search()` returns a Scout Builder — chain `where()`, `options()`, `paginate()`
- Meilisearch filters use string syntax: `"price >= 100"`, `"category = Electronics"`
- `options()` passes driver-specific parameters (sort, facets, highlight)
- Validate search input — prevent abuse with length limits and whitelist filters

---

### Pattern 366.5: Elasticsearch via Scout

**Category**: Elasticsearch Integration
**Description**: Register a custom Elasticsearch Scout driver with service provider wiring.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Search\Engines\ElasticsearchEngine;
use Elastic\Elasticsearch\ClientBuilder;
use Illuminate\Support\ServiceProvider;
use Laravel\Scout\EngineManager;

final class SearchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\Elastic\Elasticsearch\Client::class, function (): \Elastic\Elasticsearch\Client {
            return ClientBuilder::create()
                ->setHosts(config('services.elasticsearch.hosts', ['localhost:9200']))
                ->setBasicAuthentication(
                    username: config('services.elasticsearch.username', ''),
                    password: config('services.elasticsearch.password', ''),
                )
                ->build();
        });
    }

    public function boot(): void
    {
        resolve(EngineManager::class)->extend('elasticsearch', function (): ElasticsearchEngine {
            return new ElasticsearchEngine(
                client: $this->app->make(\Elastic\Elasticsearch\Client::class),
            );
        });
    }
}
```

```php
<?php

// config/services.php — Elasticsearch configuration
return [
    // ... other services

    'elasticsearch' => [
        'hosts' => explode(',', env('ELASTICSEARCH_HOSTS', 'localhost:9200')),
        'username' => env('ELASTICSEARCH_USERNAME', ''),
        'password' => env('ELASTICSEARCH_PASSWORD', ''),
    ],
];
```

**Key Points**:
- Register the Elasticsearch client as a singleton in the service provider
- Extend `EngineManager` in boot() to register the custom driver
- Set `SCOUT_DRIVER=elasticsearch` in `.env` to activate
- Use `config/services.php` for external service credentials

---

### Pattern 366.6: Search Testing

**Category**: Testing
**Description**: Test search functionality with Scout's fake driver and integration tests.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Search;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Scout\Scout;
use Tests\TestCase;

final class ProductSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_returns_matching_products(): void
    {
        // Use database driver for integration testing
        config(['scout.driver' => 'database']);

        Product::factory()->create(['name' => 'Premium Widget', 'is_published' => true]);
        Product::factory()->create(['name' => 'Basic Gadget', 'is_published' => true]);
        Product::factory()->create(['name' => 'Widget Pro Max', 'is_published' => true]);

        $results = Product::search('Widget')->get();

        $this->assertCount(2, $results);
        $this->assertTrue($results->every(
            fn (Product $p) => str_contains($p->name, 'Widget'),
        ));
    }

    public function test_unpublished_products_not_indexed(): void
    {
        $product = Product::factory()->create([
            'name' => 'Draft Product',
            'is_published' => false,
        ]);

        $this->assertFalse($product->shouldBeSearchable());
    }

    public function test_searchable_array_structure(): void
    {
        $product = Product::factory()
            ->for(\App\Models\Category::factory()->create(['name' => 'Electronics']))
            ->create(['name' => 'Test Product', 'price' => 29.99]);

        $searchable = $product->toSearchableArray();

        $this->assertArrayHasKey('name', $searchable);
        $this->assertArrayHasKey('price', $searchable);
        $this->assertArrayHasKey('category', $searchable);
        $this->assertSame('Electronics', $searchable['category']);
        $this->assertSame(29.99, $searchable['price']);
    }

    public function test_search_api_endpoint(): void
    {
        config(['scout.driver' => 'database']);

        Product::factory()->count(5)->create([
            'is_published' => true,
            'name' => 'Searchable Item',
        ]);

        $response = $this->getJson('/api/search?q=Searchable&per_page=3');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'price']],
                'meta' => ['current_page', 'total'],
            ]);
    }
}
```

**Key Points**:
- Use `'database'` driver in tests for integration testing without external services
- Test `toSearchableArray()` to verify indexed data structure
- Test `shouldBeSearchable()` to verify filtering logic
- `Scout::fake()` available for unit tests that don't need actual search results
- Test API endpoints with `getJson()` for end-to-end search validation

---

## Best Practices

- **Queue index operations** — set `SCOUT_QUEUE=true` to avoid blocking HTTP requests
- **Use `after_commit`** — prevent indexing uncommitted/rolled-back data
- **Define `shouldBeSearchable()`** — keep draft, archived, and soft-deleted records out of the index
- **Flatten relationships in `toSearchableArray()`** — search engines work with flat documents
- **Use database driver in tests** — avoid external service dependencies in CI/CD
- **Prefix indexes per environment** — `SCOUT_PREFIX=dev_` prevents cross-environment data mixing
- **Batch import with `scout:import`** — `php artisan scout:import "App\Models\Product"`
- **Monitor index size** — large indexes increase search latency and hosting costs

---

## Abnormal Case Patterns

1. **N+1 during import** — `scout:import` triggers `toSearchableArray()` per model without eager loading. Fix: define `makeAllSearchableUsing()` on the model to add `with()`.

2. **Stale search index** — model updated but index not refreshed due to failed queue job. Fix: implement retry logic and schedule periodic `scout:import --chunk=500`.

3. **Search returns deleted records** — soft-deleted models still in index. Fix: implement `shouldBeSearchable()` returning `! $this->trashed()` and call `unsearchable()` on delete.

4. **Meilisearch filterable attribute not set** — `where()` clause silently ignored. Fix: declare filterable attributes in `config/scout.php` index-settings and run `scout:sync-index-settings`.

5. **Timeout on large batch import** — indexing millions of records times out. Fix: use `scout:import` with `--chunk` flag and queue workers with higher memory limits.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (366.1–366.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Scout & Elasticsearch Specialist — Search | EPS v3.2*
