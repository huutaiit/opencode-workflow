# Laravel Search & Filtering Specialist — Patterns
# Laravel検索・フィルタリングスペシャリスト — パターン
# Chuyen Gia Tim Kiem Va Loc Du Lieu Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Search & Filtering
**Aspect**: Search and Filtering
**Category**: patterns
**Purpose**: Knowledge provider for search and filtering in Laravel — Spatie query builder, Scout search, filter pipelines, dynamic sorting, faceted search, and full-text search

---

## Metadata

```json
{
  "id": "laravel-search-filtering-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Search and Filtering",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Spatie query builder — allowedFilters/allowedSorts for safe API filtering",
    "E2: Laravel Scout — driver-agnostic full-text search with Algolia/Meilisearch/database",
    "E3: Pipeline pattern — composable filter chains for complex query building"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 344.1–344.6 |
| **Directory Pattern** | `app/Filters/`, `app/Search/` |
| **Naming Convention** | `{Entity}Filter.php`, `{Entity}Search.php` |
| **Imports From** | Domain (models), Infrastructure (search engines) |
| **Imported By** | Presentation (controllers) |
| **Cannot Import** | Presentation (HTTP layer) |
| **Dependencies** | `spatie/laravel-query-builder`, `laravel/scout` |
| **When To Use** | List endpoints with user-controlled filtering, sorting, or search |
| **Source Skeleton** | `app/Filters/{Entity}Filter.php` |
| **Specialist Type** | code |
| **Purpose** | Search and filtering for Laravel — Spatie QB, Scout, filter pipelines, sorting, faceted search |
| **Activation Trigger** | files: `app/Filters/*.php`; keywords: QueryBuilder, Scout, search, filter, allowedFilters |

---

## Role

You are a **Laravel Search & Filtering Specialist**. Your responsibility is to provide best practices for implementing search and filtering in Laravel 11+ — safe API filtering with Spatie query builder, full-text search with Scout, composable filter pipelines, dynamic sorting, and faceted search for complex catalogs.

**Used by**: Any code agent working with searchable or filterable list endpoints in Laravel
**Not used by**: Non-Laravel stacks, single-record endpoints without filtering

---

## Patterns

### Pattern 344.1: Spatie Query Builder

**Category**: API Filtering
**Description**: Safe, declarative filtering and sorting using Spatie's Laravel Query Builder package.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

final class ProductController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $products = QueryBuilder::for(Product::class)
            ->allowedFilters([
                AllowedFilter::exact('category_id'),
                AllowedFilter::exact('brand_id'),
                AllowedFilter::partial('name'), // LIKE %value%
                AllowedFilter::scope('price_between'), // Model scope
                AllowedFilter::exact('is_active'),
                AllowedFilter::trashed(), // withTrashed / onlyTrashed
            ])
            ->allowedSorts(['name', 'price', 'created_at'])
            ->allowedIncludes(['category', 'brand', 'reviews'])
            ->defaultSort('-created_at')
            ->paginate(15);

        return ProductResource::collection($products);
    }
}
```

```php
// Model scope for custom filter logic
// app/Models/Product.php
public function scopePriceBetween(Builder $query, string $value): Builder
{
    [$min, $max] = explode(',', $value);
    return $query->whereBetween('price', [(float) $min, (float) $max]);
}

// API usage:
// GET /api/products?filter[category_id]=5&filter[name]=laptop&sort=-price&include=category
```

**Key Points**:
- Spatie QB whitelists filters — prevents SQL injection and arbitrary column access
- `AllowedFilter::exact()` for equality, `partial()` for LIKE, `scope()` for custom logic
- `allowedSorts()` prevents sorting on unindexed or sensitive columns
- `allowedIncludes()` controls eager loading — prevents N+1 and data exposure

---

### Pattern 344.2: Search with Scout

**Category**: Full-Text Search
**Description**: Laravel Scout for driver-agnostic full-text search with Algolia, Meilisearch, or database driver.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

final class Product extends Model
{
    use Searchable;

    /**
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'category_name' => $this->category?->name,
            'brand_name' => $this->brand?->name,
            'price' => $this->price,
            'is_active' => $this->is_active,
        ];
    }

    public function searchableAs(): string
    {
        return 'products_index';
    }

    public function shouldBeSearchable(): bool
    {
        return $this->is_active;
    }
}
```

```php
// Controller usage
final class SearchController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $products = Product::search(
            query: $request->validated('q'),
        )
            ->where('is_active', true)
            ->paginate(perPage: 20);

        return ProductResource::collection($products);
    }
}
```

**Key Points**:
- `toSearchableArray()` defines indexed fields — exclude sensitive data
- `shouldBeSearchable()` gates which records enter the search index
- Scout supports queue-based indexing via `php artisan scout:import`
- Use database driver for development, Meilisearch/Algolia for production

---

### Pattern 344.3: Filter Pipeline

**Category**: Composable Filters
**Description**: Pipeline-based filter composition for complex, reusable query building.

```php
<?php

declare(strict_types=1);

namespace App\Filters;

use Illuminate\Database\Eloquent\Builder;

abstract class Filter
{
    abstract public function apply(Builder $query): Builder;
}

final class CategoryFilter extends Filter
{
    public function __construct(
        private readonly ?int $categoryId,
    ) {}

    public function apply(Builder $query): Builder
    {
        if ($this->categoryId === null) {
            return $query;
        }

        return $query->where('category_id', $this->categoryId);
    }
}

final class PriceRangeFilter extends Filter
{
    public function __construct(
        private readonly ?float $min,
        private readonly ?float $max,
    ) {}

    public function apply(Builder $query): Builder
    {
        if ($this->min !== null) {
            $query->where('price', '>=', $this->min);
        }

        if ($this->max !== null) {
            $query->where('price', '<=', $this->max);
        }

        return $query;
    }
}

final class SearchTermFilter extends Filter
{
    public function __construct(
        private readonly ?string $term,
    ) {}

    public function apply(Builder $query): Builder
    {
        if ($this->term === null || $this->term === '') {
            return $query;
        }

        return $query->where(function (Builder $q): void {
            $q->where('name', 'LIKE', "%{$this->term}%")
              ->orWhere('description', 'LIKE', "%{$this->term}%");
        });
    }
}
```

```php
// Pipeline executor
final class ProductFilterPipeline
{
    /**
     * @param array<int, Filter> $filters
     */
    public static function apply(Builder $query, array $filters): Builder
    {
        foreach ($filters as $filter) {
            $query = $filter->apply($query);
        }

        return $query;
    }
}

// Controller usage
$query = Product::query();
$filtered = ProductFilterPipeline::apply($query, [
    new CategoryFilter($request->integer('category_id')),
    new PriceRangeFilter($request->float('min_price'), $request->float('max_price')),
    new SearchTermFilter($request->string('q')->toString()),
]);
$products = $filtered->paginate(15);
```

**Key Points**:
- Each filter is a single class — testable, reusable, composable
- Null-safe — filters skip themselves when parameter is absent
- Build filter array from request — only active filters participate
- Prefer this over Spatie QB when filter logic is complex or reused across contexts

---

### Pattern 344.4: Dynamic Sorting

**Category**: Sorting
**Description**: Safe dynamic sorting with whitelist validation and multi-column support.

```php
<?php

declare(strict_types=1);

namespace App\Sorting;

use Illuminate\Database\Eloquent\Builder;

final class DynamicSorter
{
    /** @var array<string, string> column => direction mapping */
    private const ALLOWED_SORTS = [
        'name' => 'name',
        'price' => 'price',
        'newest' => 'created_at',
        'popularity' => 'view_count',
    ];

    public static function apply(Builder $query, ?string $sort): Builder
    {
        if ($sort === null) {
            return $query->orderByDesc('created_at');
        }

        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-');

        if (!isset(self::ALLOWED_SORTS[$field])) {
            return $query->orderByDesc('created_at');
        }

        return $query->orderBy(self::ALLOWED_SORTS[$field], $direction);
    }
}

// Usage: GET /api/products?sort=-price (descending price)
$query = DynamicSorter::apply(Product::query(), $request->query('sort'));
```

**Key Points**:
- Whitelist allowed sort columns — never pass raw user input to `orderBy()`
- Convention: `-column` for descending, `column` for ascending (JSON:API standard)
- Map user-facing names to actual columns — decouple API contract from schema
- Provide sensible default sort when parameter is missing

---

### Pattern 344.5: Faceted Search

**Category**: Advanced Search
**Description**: Faceted search for catalog-style filtering with count aggregation.

```php
<?php

declare(strict_types=1);

namespace App\Search;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class ProductFacetBuilder
{
    /**
     * @return array<string, Collection<int, object>>
     */
    public static function buildFacets(?int $categoryId = null): array
    {
        $baseQuery = DB::table('products')->where('is_active', true);

        if ($categoryId !== null) {
            $baseQuery->where('category_id', $categoryId);
        }

        return [
            'categories' => DB::table('products')
                ->join('categories', 'products.category_id', '=', 'categories.id')
                ->where('products.is_active', true)
                ->select('categories.id', 'categories.name', DB::raw('COUNT(*) as count'))
                ->groupBy('categories.id', 'categories.name')
                ->orderByDesc('count')
                ->get(),

            'price_ranges' => (clone $baseQuery)
                ->select(DB::raw("
                    CASE
                        WHEN price < 25 THEN 'under_25'
                        WHEN price BETWEEN 25 AND 50 THEN '25_to_50'
                        WHEN price BETWEEN 50 AND 100 THEN '50_to_100'
                        ELSE 'over_100'
                    END as price_range,
                    COUNT(*) as count
                "))
                ->groupBy('price_range')
                ->get(),

            'brands' => (clone $baseQuery)
                ->join('brands', 'products.brand_id', '=', 'brands.id')
                ->select('brands.id', 'brands.name', DB::raw('COUNT(*) as count'))
                ->groupBy('brands.id', 'brands.name')
                ->orderByDesc('count')
                ->limit(20)
                ->get(),
        ];
    }
}
```

**Key Points**:
- Facets show available filter options with counts — guide user filtering
- Use `clone` on base query to run independent aggregations
- Limit facet results (top 20 brands) to avoid response bloat
- Cache facets aggressively — they change less frequently than search results

---

### Pattern 344.6: Full-Text Search with MySQL

**Category**: Database Search
**Description**: MySQL FULLTEXT index search without external search engine dependency.

```php
// Migration
Schema::table('products', function (Blueprint $table): void {
    $table->fullText(['name', 'description'], 'products_fulltext');
});
```

```php
<?php

declare(strict_types=1);

namespace App\Search;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class FullTextProductSearch
{
    /**
     * @return Collection<int, Product>
     */
    public static function search(string $term, int $limit = 50): Collection
    {
        return Product::query()
            ->whereFullText(
                columns: ['name', 'description'],
                value: $term,
            )
            ->selectRaw(
                "*, MATCH(name, description) AGAINST(? IN BOOLEAN MODE) AS relevance",
                [$term],
            )
            ->orderByDesc('relevance')
            ->limit($limit)
            ->get();
    }

    public static function applyToQuery(Builder $query, string $term): Builder
    {
        return $query->whereFullText(['name', 'description'], $term);
    }
}
```

**Key Points**:
- MySQL FULLTEXT requires InnoDB and minimum 3-character tokens by default
- `whereFullText()` is Laravel's built-in wrapper — clean and SQL-injection safe
- Use BOOLEAN MODE for advanced operators (+required, -excluded, *wildcard)
- For production at scale, migrate to Meilisearch/Algolia via Scout

---

## Best Practices

- **Whitelist all filters** — never pass raw request params to WHERE clauses
- **Use Spatie QB for standard APIs** — declarative, tested, well-documented
- **Index filtered columns** — every column in `allowedFilters` should have a database index
- **Combine search + filters** — Scout for text search, Spatie QB for structured filters
- **Cache facets** — facet aggregations are expensive; cache with short TTL
- **Validate sort direction** — only allow `asc` / `desc`, default to descending by date
- **Paginate all search results** — never return unbounded result sets

---

## Abnormal Case Patterns

1. **SQL injection via raw filter** — passing `$request->input('column')` to `orderBy()`. Fix: whitelist via `ALLOWED_SORTS` constant or Spatie QB.

2. **LIKE on unindexed column** — `WHERE description LIKE '%term%'` full-table scan. Fix: use FULLTEXT index or Scout for text search.

3. **N+1 in filtered results** — applying filters without `with()` for relationships. Fix: eager load in Spatie QB's `allowedIncludes()` or explicit `with()`.

4. **Facet count mismatch** — facets calculated on unfiltered data while results are filtered. Fix: apply same base filters to facet queries.

5. **Scout index out of sync** — model updated but search index not refreshed. Fix: ensure Scout observer is active; use `searchable()` after batch updates.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (344.1–344.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Search & Filtering Specialist — Patterns | EPS v3.2*
