# Laravel Pagination Specialist — Patterns
# Laravelページネーションスペシャリスト — パターン
# Chuyen Gia Phan Trang Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Pagination
**Aspect**: Pagination
**Category**: patterns
**Purpose**: Knowledge provider for Laravel pagination — Eloquent pagination, cursor pagination, API pagination strategies, custom paginators, and pagination with API resources

---

## Metadata

```json
{
  "id": "laravel-pagination-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Pagination",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 400,
  "token_cost": 2700,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel paginator — offset-based pagination with LengthAwarePaginator",
    "E2: Cursor pagination — keyset-based for large datasets and infinite scroll",
    "E3: API Resource pagination — structured JSON responses with pagination metadata"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 343.1–343.5 |
| **Directory Pattern** | `app/Http/Resources/`, `app/Pagination/` |
| **Naming Convention** | `{Entity}Resource.php`, `{Entity}Collection.php` |
| **Imports From** | Domain (models), Infrastructure (query builders) |
| **Imported By** | Presentation (controllers, API responses) |
| **Cannot Import** | Domain (models should not know about pagination) |
| **Dependencies** | `illuminate/pagination`, `illuminate/http` |
| **When To Use** | Any list endpoint returning multiple records |
| **Source Skeleton** | `app/Http/Resources/{Entity}Collection.php` |
| **Specialist Type** | code |
| **Purpose** | Pagination strategies for Laravel — offset, cursor, API resources, custom paginators |
| **Activation Trigger** | files: `app/Http/Resources/*.php`; keywords: paginate, cursor, simplePaginate, LengthAwarePaginator |

---

## Role

You are a **Laravel Pagination Specialist**. Your responsibility is to provide best practices for pagination in Laravel 11+ — choosing between offset and cursor pagination, optimizing paginated queries, integrating with API resources, and building custom paginators for non-standard data sources.

**Used by**: Any code agent working with list endpoints or paginated data in Laravel
**Not used by**: Non-Laravel stacks, single-record endpoints

---

## Patterns

### Pattern 343.1: Eloquent Pagination

**Category**: Offset Pagination
**Description**: Standard offset-based pagination using Eloquent's built-in paginator.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $products = Product::query()
            ->where('is_active', true)
            ->with(['category', 'brand']) // Eager load to prevent N+1
            ->orderByDesc('created_at')
            ->paginate(
                perPage: min((int) $request->query('per_page', '15'), 100),
            );

        return ProductResource::collection($products);
    }
}
```

```php
// Response structure (automatic via LengthAwarePaginator)
{
    "data": [...],
    "links": {
        "first": "http://app.test/api/products?page=1",
        "last": "http://app.test/api/products?page=10",
        "prev": null,
        "next": "http://app.test/api/products?page=2"
    },
    "meta": {
        "current_page": 1,
        "from": 1,
        "last_page": 10,
        "per_page": 15,
        "to": 15,
        "total": 150
    }
}
```

**Key Points**:
- `paginate()` runs COUNT query — expensive on large tables; use `simplePaginate()` when total not needed
- Cap `per_page` with `min()` to prevent clients requesting 10,000 records
- Always eager load relationships to avoid N+1 in paginated results
- Offset pagination has O(n) performance for deep pages — consider cursor for large datasets

---

### Pattern 343.2: Cursor Pagination

**Category**: Keyset Pagination
**Description**: Cursor-based pagination for large datasets and real-time feeds — no COUNT, no offset skip.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Resources\ActivityResource;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ActivityController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $activities = Activity::query()
            ->with('user')
            ->orderByDesc('id') // Cursor requires deterministic ordering
            ->cursorPaginate(
                perPage: min((int) $request->query('per_page', '20'), 50),
            );

        return ActivityResource::collection($activities);
    }
}
```

```php
// Cursor response structure
{
    "data": [...],
    "meta": {
        "path": "http://app.test/api/activities",
        "per_page": 20,
        "next_cursor": "eyJpZCI6MTAwfQ",
        "prev_cursor": "eyJpZCI6MTIwfQ"
    },
    "links": {
        "next": "http://app.test/api/activities?cursor=eyJpZCI6MTAwfQ",
        "prev": "http://app.test/api/activities?cursor=eyJpZCI6MTIwfQ"
    }
}
```

**Key Points**:
- Cursor pagination uses WHERE clause instead of OFFSET — O(1) performance regardless of page depth
- Requires deterministic ordering — `orderBy('id')` or composite unique column
- No total count, no page numbers — suitable for infinite scroll, feeds, real-time data
- Cursor is base64-encoded — opaque to clients, contains last row's sort values

---

### Pattern 343.3: API Pagination — paginate vs simplePaginate

**Category**: Decision Guide
**Description**: Choosing the right pagination strategy based on dataset size and UX requirements.

```php
// paginate() — LengthAwarePaginator
// Runs: SELECT * FROM products LIMIT 15 OFFSET 0
//       SELECT COUNT(*) FROM products
// Use when: UI needs page numbers, total count, "showing X of Y"
$products = Product::query()->paginate(15);

// simplePaginate() — Paginator (no count)
// Runs: SELECT * FROM products LIMIT 16 OFFSET 0 (fetches n+1 to detect next page)
// Use when: "Load more" button, no total needed, large tables
$products = Product::query()->simplePaginate(15);

// cursorPaginate() — CursorPaginator
// Runs: SELECT * FROM products WHERE id < :cursor ORDER BY id DESC LIMIT 15
// Use when: Very large tables, real-time feeds, infinite scroll
$products = Product::query()->cursorPaginate(15);
```

```php
// Decision matrix in controller
final class ListController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = Product::query()->where('is_active', true);

        $result = match ($request->query('pagination', 'offset')) {
            'cursor' => $query->orderByDesc('id')->cursorPaginate(15),
            'simple' => $query->orderByDesc('created_at')->simplePaginate(15),
            default  => $query->orderByDesc('created_at')->paginate(15),
        };

        return response()->json($result);
    }
}
```

**Key Points**:
- `paginate()`: 2 queries (data + count) — for admin panels, dashboards with page numbers
- `simplePaginate()`: 1 query (n+1 trick) — for public APIs, mobile apps with "load more"
- `cursorPaginate()`: 1 query (WHERE-based) — for feeds, large tables, real-time data
- Default to `simplePaginate()` for APIs unless clients need total count

---

### Pattern 343.4: Custom Paginator

**Category**: Advanced
**Description**: Custom paginator for non-Eloquent data sources (API responses, search results, arrays).

```php
<?php

declare(strict_types=1);

namespace App\Pagination;

use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

final class ArrayPaginator
{
    /**
     * @param array<int, mixed> $items
     */
    public static function paginate(
        array $items,
        int $perPage = 15,
        ?int $page = null,
        ?string $path = null,
    ): LengthAwarePaginator {
        $page ??= LengthAwarePaginator::resolveCurrentPage();
        $collection = Collection::make($items);

        return new LengthAwarePaginator(
            items: $collection->forPage($page, $perPage)->values(),
            total: $collection->count(),
            perPage: $perPage,
            currentPage: $page,
            options: [
                'path' => $path ?? LengthAwarePaginator::resolveCurrentPath(),
            ],
        );
    }
}
```

```php
// Usage: paginate external API results
$externalData = $this->externalApiClient->fetchProducts();
$paginated = ArrayPaginator::paginate(
    items: $externalData,
    perPage: 20,
    path: route('api.external-products'),
);
```

**Key Points**:
- Use `LengthAwarePaginator` constructor directly for non-Eloquent data
- `resolveCurrentPage()` reads the `page` query parameter automatically
- Always pass `path` option for correct pagination link generation
- For large arrays, prefer server-side pagination — array pagination loads all items into memory

---

### Pattern 343.5: Pagination with API Resources

**Category**: Presentation
**Description**: API Resources with pagination metadata for structured JSON responses.

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => [
                'amount' => $this->price,
                'currency' => 'USD',
                'formatted' => '$' . number_format($this->price, 2),
            ],
            'category' => new CategoryResource($this->whenLoaded('category')),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

final class ProductCollection extends ResourceCollection
{
    public $collects = ProductResource::class;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'summary' => [
                'total_items' => $this->total(),
                'price_range' => [
                    'min' => $this->collection->min('price'),
                    'max' => $this->collection->max('price'),
                ],
            ],
        ];
    }
}
```

```php
// Controller usage
public function index(Request $request): ProductCollection
{
    $products = Product::query()
        ->with('category')
        ->paginate(15);

    return new ProductCollection($products);
}
```

**Key Points**:
- `ResourceCollection` automatically includes pagination links and meta when wrapping a paginator
- Use `$collects` property to specify the individual resource class
- `whenLoaded()` prevents N+1 — only includes relation data when eager loaded
- Custom `toArray()` on collection adds summary data alongside pagination meta

---

## Best Practices

- **Default to simplePaginate for APIs** — skip COUNT query unless total is required
- **Cap per_page** — never let clients request unlimited records; max 100 is reasonable
- **Eager load relationships** — always `with()` related models in paginated queries
- **Use cursor for feeds** — activity logs, notifications, timelines — anything append-only
- **Index sort columns** — pagination queries use ORDER BY; ensure columns are indexed
- **Consistent pagination format** — use API Resources for uniform response structure
- **Test pagination boundaries** — empty results, single page, last page, per_page limits

---

## Abnormal Case Patterns

1. **COUNT on large table** — `paginate()` on a 10M-row table takes seconds. Fix: use `simplePaginate()` or `cursorPaginate()`.

2. **N+1 in paginated results** — forgetting `with()` on paginated queries. Fix: always eager load relations; use `preventLazyLoading()` in development.

3. **Deep page offset** — requesting page 10,000 with offset pagination. Fix: switch to cursor pagination for deep navigation.

4. **Cursor with non-unique order** — `cursorPaginate()` ordered by `created_at` (non-unique). Fix: add secondary sort on `id` for deterministic ordering.

5. **Missing per_page cap** — client sends `per_page=999999`. Fix: `min((int) $request->query('per_page', '15'), 100)`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (343.1–343.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Pagination Specialist — Patterns | EPS v3.2*
