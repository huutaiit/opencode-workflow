# Laravel Query Optimization Specialist — Data
# Laravel クエリ最適化スペシャリスト — データ
# Chuyen Gia Toi Uu Hoa Query Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Query Optimization
**Aspect**: Query Performance
**Category**: data
**Purpose**: Knowledge provider for Laravel query optimization — N+1 detection, eager loading strategies, query caching, indexing strategies, EXPLAIN analysis, and pagination performance

---

## Metadata

```json
{
  "id": "laravel-query-optimization-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Query Optimization",
  "aspect": "Query Performance",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: preventLazyLoading() — Laravel strict mode for N+1 detection in development",
    "E2: Eager loading strategies — with/load/loadMissing/withCount for query reduction",
    "E3: Cursor pagination — O(1) performance vs O(n) offset-based pagination"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 322.1–322.6 |
| **Directory Pattern** | `app/Models/`, `app/Repositories/` |
| **Naming Convention** | `{Entity}.php`, `{Entity}Repository.php` |
| **Imports From** | Domain (models), Infrastructure (cache, DB facade) |
| **Imported By** | Application (services, controllers) |
| **Cannot Import** | Controllers, Requests |
| **Dependencies** | `illuminate/database`, `illuminate/cache` |
| **When To Use** | Any Laravel project requiring query performance optimization |
| **Source Skeleton** | `app/Models/{Entity}.php`, `app/Providers/AppServiceProvider.php` |
| **Specialist Type** | code |
| **Purpose** | Query optimization patterns — N+1 detection, eager loading, caching, indexing, EXPLAIN, pagination performance |
| **Activation Trigger** | files: `app/Models/*.php`, `app/Providers/*.php`; keywords: preventLazyLoading, eager, cache, index, explain, paginate, N+1 |

---

## Role

You are a **Laravel Query Optimization Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 query performance — N+1 query detection with preventLazyLoading, strategic eager loading, query result caching, database indexing strategies, EXPLAIN/ANALYZE for query plans, and pagination performance optimization.

**Used by**: Any code agent optimizing Laravel database query performance
**Not used by**: Non-Laravel stacks, applications without performance concerns

---

## Patterns

### Pattern 322.1: N+1 Detection — preventLazyLoading

**Category**: Detection
**Description**: Enable strict mode to catch N+1 queries during development before they reach production.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Strict mode: throw exception on lazy loading (dev only)
        Model::preventLazyLoading(
            ! $this->app->isProduction(),
        );

        // Strict mode: detect accessing missing attributes
        Model::preventAccessingMissingAttributes(
            ! $this->app->isProduction(),
        );

        // Strict mode: detect silently discarding mass-assignment
        Model::preventSilentlyDiscardingAttributes(
            ! $this->app->isProduction(),
        );

        // Custom violation handler — log instead of throwing in staging
        if ($this->app->environment('staging')) {
            Model::handleLazyLoadingViolationUsing(
                function (Model $model, string $relation): void {
                    logger()->warning("N+1 detected: {$model::class}::{$relation}");
                },
            );
        }
    }
}
```

**Key Points**:
- `preventLazyLoading()` throws `LazyLoadingViolationException` when relation is accessed without eager loading
- Enable in dev/staging, disable in production — production should degrade gracefully
- `handleLazyLoadingViolationUsing()` allows logging instead of throwing
- Combine all three strict modes for comprehensive development-time safety
- Fix violations by adding `with()` or `load()` at the query site

---

### Pattern 322.2: Eager Loading Strategies

**Category**: Query Reduction
**Description**: Strategic eager loading to minimize database round-trips for related data.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class OrderController
{
    /**
     * Strategy 1: Query-time eager loading with constraints.
     */
    public function index(): JsonResponse
    {
        $orders = Order::query()
            ->with([
                'user:id,name,email',                    // Select specific columns
                'items' => fn ($q) => $q->orderBy('id'), // Constrained loading
                'items.product:id,name,sku,price',       // Nested with select
            ])
            ->where('status', 'pending')
            ->paginate(25);

        return response()->json($orders);
    }

    /**
     * Strategy 2: Default eager loading on model.
     */
    // In Order model:
    // protected $with = ['user']; // Always loaded — use sparingly

    /**
     * Strategy 3: Aggregate loading without hydrating relations.
     */
    public function dashboard(): JsonResponse
    {
        $users = User::query()
            ->withCount([
                'orders',
                'orders as completed_orders_count' => fn ($q) => $q->where('status', 'completed'),
                'orders as pending_orders_count' => fn ($q) => $q->where('status', 'pending'),
            ])
            ->withSum('orders as total_revenue', 'total_amount')
            ->withMax('orders as last_order_amount', 'total_amount')
            ->withExists('orders as has_orders')
            ->having('orders_count', '>', 0)
            ->orderByDesc('total_revenue')
            ->limit(100)
            ->get();

        return response()->json($users);
    }

    /**
     * Strategy 4: Lazy eager load after retrieval.
     */
    public function show(Order $order): JsonResponse
    {
        // loadMissing only loads if not already loaded (e.g., by route model binding)
        $order->loadMissing([
            'user:id,name,email',
            'items.product',
            'payments',
        ]);

        return response()->json($order);
    }
}
```

**Key Points**:
- Select specific columns with `:` syntax — always include FK columns
- `withCount()` adds `{relation}_count` attribute via subquery — no extra query
- `withSum()`/`withAvg()`/`withMax()`/`withMin()` for aggregate columns
- `withExists()` adds boolean check as subquery — cheaper than `withCount`
- `loadMissing()` prevents redundant loading if relation is already hydrated

---

### Pattern 322.3: Query Caching

**Category**: Caching
**Description**: Cache frequently-accessed query results to reduce database load.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

final readonly class CategoryRepository
{
    /**
     * Cache full category tree — invalidate on change.
     */
    public function allWithProducts(): Collection
    {
        return Cache::remember(
            key: 'categories:with_products',
            ttl: now()->addHours(6),
            callback: fn () => Category::query()
                ->with('products:id,category_id,name,price')
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(),
        );
    }

    /**
     * Tagged cache for granular invalidation.
     */
    public function findById(int $id): ?Category
    {
        return Cache::tags(['categories'])->remember(
            key: "category:{$id}",
            ttl: now()->addHour(),
            callback: fn () => Category::with('products')->find($id),
        );
    }

    /**
     * Invalidate on category update.
     */
    public function update(int $id, array $data): bool
    {
        $result = Category::where('id', $id)->update($data);

        if ($result) {
            Cache::forget('categories:with_products');
            Cache::tags(['categories'])->flush();
        }

        return (bool) $result;
    }
}

// Model observer for automatic cache invalidation:
// final class CategoryObserver
// {
//     public function saved(Category $category): void
//     {
//         Cache::forget('categories:with_products');
//         Cache::tags(['categories'])->forget("category:{$category->id}");
//     }
// }
```

**Key Points**:
- `Cache::remember()` returns cached value or executes callback and caches result
- Use tagged cache (`Cache::tags()`) for granular invalidation — requires Redis/Memcached
- Invalidate cache on write operations — observer pattern automates this
- Set appropriate TTL — short for volatile data, long for reference data
- Never cache user-specific or request-specific data with shared keys

---

### Pattern 322.4: Indexing Strategies

**Category**: Database Design
**Description**: Strategic index creation for query performance — single, composite, partial, and covering indexes.

```php
<?php

// Migration: Strategic indexes for common query patterns
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            // Single column index — WHERE status = ?
            $table->index('status');

            // Composite index — WHERE user_id = ? AND status = ?
            // Column order matters: most selective first, or match query order
            $table->index(['user_id', 'status', 'created_at']);

            // Unique index — prevents duplicates + acts as index
            $table->unique('reference_number');

            // Partial index (PostgreSQL only) — index only active records
            // DB::statement('CREATE INDEX orders_active_idx ON orders (status) WHERE is_active = true');
        });

        Schema::table('products', function (Blueprint $table): void {
            // Full-text index for search
            $table->fullText(['name', 'description']);

            // Composite for common filter + sort pattern
            $table->index(['category', 'price']);

            // Index for JSON column queries (MySQL 8.0+ generated column)
            // $table->string('brand_virtual')->virtualAs("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.brand'))");
            // $table->index('brand_virtual');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex(['status']);
            $table->dropIndex(['user_id', 'status', 'created_at']);
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropFullText(['name', 'description']);
            $table->dropIndex(['category', 'price']);
        });
    }
};
```

**Key Points**:
- Composite index order: leftmost columns can be used independently (left prefix rule)
- Index columns used in WHERE, JOIN ON, ORDER BY, and GROUP BY clauses
- Unique indexes serve dual purpose: constraint + performance
- Avoid over-indexing: each index slows down INSERT/UPDATE operations
- Use `EXPLAIN` to verify index usage before and after adding indexes

---

### Pattern 322.5: EXPLAIN / ANALYZE

**Category**: Query Analysis
**Description**: Use EXPLAIN to analyze query execution plans and identify performance bottlenecks.

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class AnalyzeQueriesCommand extends Command
{
    protected $signature = 'queries:analyze';
    protected $description = 'Analyze common query patterns for performance';

    public function handle(): int
    {
        // Method 1: Eloquent explain()
        $explanation = Order::query()
            ->where('status', 'completed')
            ->where('created_at', '>=', now()->subMonth())
            ->orderByDesc('total_amount')
            ->explain()
            ->get();

        $this->info('EXPLAIN output:');
        $this->table(
            ['id', 'select_type', 'table', 'type', 'possible_keys', 'key', 'rows', 'Extra'],
            $explanation->map(fn ($row) => (array) $row)->toArray(),
        );

        // Method 2: Raw EXPLAIN ANALYZE (MySQL 8.0+ / PostgreSQL)
        $analyzeResult = DB::select(
            'EXPLAIN ANALYZE SELECT * FROM orders WHERE status = ? AND created_at >= ? ORDER BY total_amount DESC',
            ['completed', now()->subMonth()],
        );

        foreach ($analyzeResult as $row) {
            $this->line(json_encode($row, JSON_PRETTY_PRINT));
        }

        // Method 3: Query time profiling
        DB::enableQueryLog();

        Order::query()
            ->with('items.product')
            ->where('status', 'completed')
            ->limit(100)
            ->get();

        $queries = DB::getQueryLog();
        $this->info('Query count: ' . count($queries));
        $this->info('Total time: ' . collect($queries)->sum('time') . 'ms');

        foreach ($queries as $query) {
            $this->line(sprintf(
                '[%.2fms] %s',
                $query['time'],
                $query['query'],
            ));
        }

        DB::disableQueryLog();

        return self::SUCCESS;
    }
}
```

**Key Points**:
- `explain()` returns EXPLAIN output as collection — check `type` column for scan type
- Scan types (best to worst): `const` > `eq_ref` > `ref` > `range` > `index` > `ALL`
- `ALL` (full table scan) indicates missing index for the query pattern
- `EXPLAIN ANALYZE` shows actual execution time and row counts (MySQL 8.0+)
- Query log shows all queries with execution time — useful for N+1 detection

---

### Pattern 322.6: Pagination Performance

**Category**: API Performance
**Description**: Optimize pagination for large datasets — cursor vs offset, deferred joins, count optimization.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ProductController
{
    /**
     * Cursor pagination — O(1) performance for ordered datasets.
     */
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->cursorPaginate(perPage: 25);

        return response()->json($products);
    }

    /**
     * Deferred join — fast offset pagination for large tables.
     * First query: SELECT id with offset (fast on index).
     * Second query: SELECT * WHERE id IN (...) (fast primary key lookup).
     */
    public function indexOptimized(Request $request): JsonResponse
    {
        $page = (int) $request->input('page', 1);
        $perPage = 25;

        // Step 1: Get IDs with offset (cheap — index only)
        $ids = Product::query()
            ->select('id')
            ->where('is_active', true)
            ->orderBy('id')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->pluck('id');

        // Step 2: Fetch full records by primary key (fast)
        $products = Product::query()
            ->with('category:id,name')
            ->whereIn('id', $ids)
            ->orderBy('id')
            ->get();

        // Step 3: Get total count (cache this for repeated requests)
        $total = \Illuminate\Support\Facades\Cache::remember(
            'products:active:count',
            now()->addMinutes(5),
            fn () => Product::where('is_active', true)->count(),
        );

        return response()->json([
            'data' => $products,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
        ]);
    }

    /**
     * Simple pagination — no total count query.
     */
    public function indexSimple(Request $request): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->orderByDesc('created_at')
            ->simplePaginate(perPage: 25);

        return response()->json($products);
    }
}
```

**Key Points**:
- `cursorPaginate()` — best for infinite scroll, O(1), no page jumping
- `simplePaginate()` — skips COUNT query, shows only prev/next, faster than `paginate()`
- `paginate()` runs COUNT(*) on every request — expensive on large tables
- Deferred join pattern: fetch IDs first (index-only scan), then hydrate by PK
- Cache total count with short TTL for offset pagination on large tables

---

## Best Practices

- **Enable preventLazyLoading in dev** — catch N+1 before production deployment
- **Eager load explicitly** — use `with()` at query site, avoid model `$with` for rarely-needed relations
- **Use withCount over loading** — aggregate subquery is cheaper than hydrating collections
- **Index before optimizing** — correct indexes solve 90% of query performance issues
- **EXPLAIN every slow query** — check scan type and index usage before adding code-level fixes
- **Cursor paginate for APIs** — stable, performant pagination for mobile/SPA clients
- **Cache reference data** — categories, settings, feature flags with appropriate TTL
- **Profile regularly** — use query log and Laravel Debugbar in development

---

## Abnormal Case Patterns

1. **Eager loading unused relations** — `with('comments', 'tags', 'author')` when only author is displayed. Fix: load only what the view/response needs.

2. **Cache stampede** — many requests arrive when cache expires, all hitting DB simultaneously. Fix: use `Cache::lock()` or cache warming with staggered TTL.

3. **COUNT(*) on large table** — `paginate()` runs expensive count on every page load. Fix: use `simplePaginate()` or cache the count with 5-minute TTL.

4. **Composite index wrong order** — index `(created_at, user_id)` but query filters by `user_id` first. Fix: reorder index to match query pattern: `(user_id, created_at)`.

5. **Over-caching with stale data** — cached product price shows old value after update. Fix: invalidate cache on model save via observer or event listener.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (322.1–322.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Query Optimization Specialist — Data | EPS v3.2*
