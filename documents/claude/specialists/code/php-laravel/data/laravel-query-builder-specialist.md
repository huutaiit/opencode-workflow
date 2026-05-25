# Laravel Query Builder Specialist — Data
# Laravel クエリビルダスペシャリスト — データ
# Chuyen Gia Query Builder Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Query Builder
**Aspect**: Query Builder & Scopes
**Category**: data
**Purpose**: Knowledge provider for Laravel query builder patterns — scopes, subqueries, raw expressions, chunking, lazy collections, cursor pagination, and query debugging

---

## Metadata

```json
{
  "id": "laravel-query-builder-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Query Builder",
  "aspect": "Query Builder & Scopes",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 query builder — fluent API for database queries with Eloquent integration",
    "E2: Local/dynamic scopes — reusable query constraints encapsulated in model methods",
    "E3: LazyCollection and cursor — memory-efficient iteration for large datasets"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 318.1–318.8 |
| **Directory Pattern** | `app/Models/`, `app/Repositories/` |
| **Naming Convention** | `{Entity}.php`, `{Entity}Repository.php` |
| **Imports From** | Domain (models, enums) |
| **Imported By** | Application (services), Infrastructure (controllers) |
| **Cannot Import** | Controllers, Requests, Commands |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Complex queries, reporting, data export, bulk operations |
| **Source Skeleton** | `app/Models/{Entity}.php`, `app/Repositories/{Entity}Repository.php` |
| **Specialist Type** | code |
| **Purpose** | Query builder patterns — scopes, subqueries, raw expressions, chunking, lazy collections, cursor pagination, debugging |
| **Activation Trigger** | files: `app/Models/*.php`, `app/Repositories/*.php`; keywords: scope, query, chunk, cursor, raw, subquery, DB:: |

---

## Role

You are a **Laravel Query Builder Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 query building — local/dynamic scopes, subqueries, raw expressions, memory-efficient chunking, lazy collections, cursor pagination, and query debugging strategies.

**Used by**: Any code agent working with complex database queries in Laravel
**Not used by**: Non-Laravel stacks, projects using only raw SQL without query builder

---

## Patterns

### Pattern 318.1: Query Builder Basics

**Category**: Fundamentals
**Description**: Fluent query builder API for constructing database queries with type-safe conditions.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

final readonly class ProductRepository
{
    /**
     * Fluent query builder with chained conditions.
     */
    public function findAvailable(
        ?string $category = null,
        ?float $maxPrice = null,
        string $sortBy = 'created_at',
    ): Collection {
        return Product::query()
            ->where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->when($category, fn ($query, $cat) => $query->where('category', $cat))
            ->when($maxPrice, fn ($query, $price) => $query->where('price', '<=', $price))
            ->orderByDesc($sortBy)
            ->get();
    }

    /**
     * Multiple where conditions with grouped OR.
     */
    public function search(string $term): Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->where(function ($query) use ($term): void {
                $query->where('name', 'LIKE', "%{$term}%")
                    ->orWhere('sku', 'LIKE', "%{$term}%")
                    ->orWhere('description', 'LIKE', "%{$term}%");
            })
            ->get();
    }
}
```

**Key Points**:
- Always start with `Model::query()` for explicit builder instance
- `when()` conditionally applies clauses — avoids if/else chains
- Group OR conditions inside `where(function)` to prevent logic errors
- `readonly` class for repositories — they hold no mutable state
- Use named parameters for optional filters with null defaults

---

### Pattern 318.2: Local Scopes

**Category**: Reusable Constraints
**Description**: Model-level reusable query scopes for common filtering patterns.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class Order extends Model
{
    protected $fillable = ['user_id', 'total_amount', 'status', 'shipped_at'];

    /**
     * Scope: completed orders only.
     */
    public function scopeCompleted(Builder $query): void
    {
        $query->where('status', OrderStatus::Completed);
    }

    /**
     * Scope: orders within a date range.
     */
    public function scopeBetweenDates(
        Builder $query,
        \DateTimeInterface $from,
        \DateTimeInterface $to,
    ): void {
        $query->whereBetween('created_at', [$from, $to]);
    }

    /**
     * Scope: high-value orders above a threshold.
     */
    public function scopeHighValue(Builder $query, float $threshold = 500.0): void
    {
        $query->where('total_amount', '>=', $threshold);
    }

    /**
     * Scope: orders pending shipment.
     */
    public function scopePendingShipment(Builder $query): void
    {
        $query->where('status', OrderStatus::Completed)
            ->whereNull('shipped_at');
    }
}

// Usage — scopes are chainable:
// Order::completed()->highValue(1000)->betweenDates($start, $end)->get();
// Order::pendingShipment()->count();
```

**Key Points**:
- Scope method name: `scope{Name}` — called without `scope` prefix
- First parameter is always `Builder $query` — additional params follow
- Scopes are chainable and composable — combine freely
- Use scopes for domain-meaningful filters, not generic SQL clauses
- Return type `void` — scopes modify the builder in-place

---

### Pattern 318.3: Dynamic Scopes

**Category**: Flexible Constraints
**Description**: Scopes that accept dynamic parameters for flexible, reusable filtering.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class Product extends Model
{
    protected $fillable = ['name', 'category', 'price', 'brand', 'rating'];

    /**
     * Dynamic scope: filter by multiple criteria from request input.
     *
     * @param array<string, mixed> $filters
     */
    public function scopeFilter(Builder $query, array $filters): void
    {
        $query
            ->when(
                $filters['category'] ?? null,
                fn (Builder $q, string $category) => $q->where('category', $category),
            )
            ->when(
                $filters['brand'] ?? null,
                fn (Builder $q, string $brand) => $q->where('brand', $brand),
            )
            ->when(
                $filters['min_price'] ?? null,
                fn (Builder $q, float $min) => $q->where('price', '>=', $min),
            )
            ->when(
                $filters['max_price'] ?? null,
                fn (Builder $q, float $max) => $q->where('price', '<=', $max),
            )
            ->when(
                $filters['min_rating'] ?? null,
                fn (Builder $q, float $rating) => $q->where('rating', '>=', $rating),
            )
            ->when(
                $filters['sort'] ?? null,
                fn (Builder $q, string $sort) => match ($sort) {
                    'price_asc' => $q->orderBy('price'),
                    'price_desc' => $q->orderByDesc('price'),
                    'rating' => $q->orderByDesc('rating'),
                    'newest' => $q->orderByDesc('created_at'),
                    default => $q->orderByDesc('created_at'),
                },
                fn (Builder $q) => $q->orderByDesc('created_at'),
            );
    }
}

// Usage:
// Product::filter($request->validated())->paginate(20);
```

**Key Points**:
- Single `filter()` scope handles all request-based filtering
- `when()` with null-coalescing cleanly skips absent filters
- `match` expression for sort field mapping — exhaustive and readable
- Second `when()` callback provides default ordering when sort is absent
- Validate filter input in FormRequest before passing to scope

---

### Pattern 318.4: Subqueries

**Category**: Advanced Queries
**Description**: Subqueries for computed columns, correlated filtering, and inline aggregates.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;

final readonly class UserReportRepository
{
    /**
     * Users with computed subquery columns.
     */
    public function usersWithOrderStats(): Collection
    {
        return User::query()
            ->addSelect([
                'total_spent' => Order::query()
                    ->selectRaw('COALESCE(SUM(total_amount), 0)')
                    ->whereColumn('user_id', 'users.id')
                    ->where('status', 'completed'),
                'last_order_at' => Order::query()
                    ->select('created_at')
                    ->whereColumn('user_id', 'users.id')
                    ->orderByDesc('created_at')
                    ->limit(1),
                'order_count' => Order::query()
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('user_id', 'users.id'),
            ])
            ->withCast([
                'total_spent' => 'decimal:2',
                'last_order_at' => 'datetime',
                'order_count' => 'integer',
            ])
            ->orderByDesc('total_spent')
            ->get();
    }

    /**
     * Filter by subquery result.
     */
    public function whaleCustomers(float $minSpend = 10000): Collection
    {
        return User::query()
            ->whereRaw(
                '(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE orders.user_id = users.id AND orders.status = ?) >= ?',
                ['completed', $minSpend],
            )
            ->get();
    }
}
```

**Key Points**:
- `addSelect()` appends computed columns without replacing default `SELECT *`
- `whereColumn()` creates correlated subquery referencing parent table
- `withCast()` applies casts to computed subquery columns
- `COALESCE` prevents null when no matching rows exist
- Prefer Eloquent subqueries over raw SQL for maintainability

---

### Pattern 318.5: Raw Expressions

**Category**: Raw SQL
**Description**: Raw SQL expressions for database-specific functions, computed columns, and complex conditions.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Order;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final readonly class ReportRepository
{
    /**
     * Monthly revenue summary using raw expressions.
     */
    public function monthlyRevenue(int $year): Collection
    {
        return Order::query()
            ->selectRaw('YEAR(created_at) as year')
            ->selectRaw('MONTH(created_at) as month')
            ->selectRaw('SUM(total_amount) as revenue')
            ->selectRaw('COUNT(*) as order_count')
            ->selectRaw('AVG(total_amount) as avg_order_value')
            ->where('status', 'completed')
            ->whereYear('created_at', $year)
            ->groupByRaw('YEAR(created_at), MONTH(created_at)')
            ->orderByRaw('YEAR(created_at), MONTH(created_at)')
            ->get();
    }

    /**
     * Raw DB facade for complex reporting not tied to a model.
     */
    public function categoryPerformance(): Collection
    {
        return DB::table('products')
            ->join('order_items', 'products.id', '=', 'order_items.product_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->select([
                'products.category',
                DB::raw('COUNT(DISTINCT orders.id) as order_count'),
                DB::raw('SUM(order_items.quantity * order_items.unit_price) as total_revenue'),
                DB::raw('AVG(order_items.quantity) as avg_quantity'),
            ])
            ->where('orders.status', 'completed')
            ->groupBy('products.category')
            ->havingRaw('SUM(order_items.quantity * order_items.unit_price) > ?', [1000])
            ->orderByDesc('total_revenue')
            ->get();
    }
}
```

**Key Points**:
- `selectRaw()`, `whereRaw()`, `groupByRaw()`, `orderByRaw()` accept raw SQL
- Always use parameter binding (`?` placeholders) in raw expressions — prevent SQL injection
- `DB::raw()` wraps raw SQL inside select arrays
- `havingRaw()` for filtering on aggregate results
- Use `DB::table()` for cross-table reporting not tied to a single model

---

### Pattern 318.6: Chunking and Lazy Collections

**Category**: Memory Efficiency
**Description**: Process large datasets without exhausting memory using chunk, chunkById, and lazy collections.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Notifications\InactivityReminder;

final class BulkNotificationService
{
    /**
     * Chunk by ID — safe for updates during iteration.
     */
    public function notifyInactiveUsers(): int
    {
        $notified = 0;

        User::query()
            ->where('last_login_at', '<', now()->subDays(90))
            ->where('is_active', true)
            ->chunkById(count: 200, callback: function ($users) use (&$notified): void {
                foreach ($users as $user) {
                    $user->notify(new InactivityReminder());
                    $notified++;
                }
            });

        return $notified;
    }

    /**
     * Lazy collection — generator-based, single query with cursor.
     */
    public function exportAllUsers(): \Generator
    {
        $users = User::query()
            ->with('profile:id,user_id,bio')
            ->lazy(chunkSize: 500);

        foreach ($users as $user) {
            yield [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'bio' => $user->profile?->bio,
            ];
        }
    }

    /**
     * Chunk with early termination.
     */
    public function findFirstMatch(string $pattern): ?User
    {
        $found = null;

        User::query()
            ->where('is_active', true)
            ->chunk(100, function ($users) use ($pattern, &$found): bool {
                foreach ($users as $user) {
                    if (str_contains($user->email, $pattern)) {
                        $found = $user;
                        return false; // Stop chunking
                    }
                }
                return true; // Continue chunking
            });

        return $found;
    }
}
```

**Key Points**:
- `chunkById()` is safe when modifying records during iteration — uses `WHERE id > ?`
- `chunk()` uses OFFSET which can skip/duplicate rows if records are modified
- `lazy()` returns a LazyCollection using generators — constant memory usage
- Return `false` from chunk callback to stop processing early
- Use `lazy()` for exports, `chunkById()` for updates, `chunk()` for read-only

---

### Pattern 318.7: Cursor Pagination

**Category**: API Pagination
**Description**: Cursor-based pagination for stable, high-performance API pagination.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ProductController
{
    /**
     * Cursor pagination — consistent results, no offset skipping.
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
     * Cursor pagination with multiple sort columns.
     */
    public function trending(Request $request): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->orderByDesc('view_count')
            ->orderByDesc('id')
            ->cursorPaginate(perPage: 20);

        return response()->json($products);
    }
}

// Response includes next_cursor and prev_cursor:
// {
//   "data": [...],
//   "next_cursor": "eyJpZCI6MjUsIl9wb2ludHNUb05leHRJdGVtcyI6dHJ1ZX0",
//   "next_page_url": "/products?cursor=eyJpZCI6...",
//   "prev_cursor": null,
//   "prev_page_url": null
// }
```

**Key Points**:
- Cursor pagination uses WHERE clauses instead of OFFSET — O(1) vs O(n) performance
- Results are stable even when new records are inserted during pagination
- Requires deterministic ordering — always include a unique column (id) as tiebreaker
- Cannot jump to arbitrary pages — only next/previous navigation
- Ideal for infinite scroll, mobile APIs, and large datasets

---

### Pattern 318.8: Query Debugging

**Category**: Development Tools
**Description**: Debug and profile queries during development — toSql, explain, query log.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class QueryDebugService
{
    /**
     * Get raw SQL with bindings.
     */
    public function inspectQuery(): void
    {
        $query = Order::query()
            ->where('status', 'completed')
            ->where('total_amount', '>', 100);

        // Raw SQL without bindings
        $sql = $query->toSql();
        // "select * from `orders` where `status` = ? and `total_amount` > ?"

        // Raw SQL with bindings merged
        $rawSql = $query->toRawSql();
        // "select * from `orders` where `status` = 'completed' and `total_amount` > 100"

        Log::debug('Query inspection', ['sql' => $rawSql]);
    }

    /**
     * EXPLAIN query for performance analysis.
     */
    public function explainQuery(): void
    {
        $explanation = Order::query()
            ->where('status', 'completed')
            ->where('created_at', '>=', now()->subMonth())
            ->explain()
            ->get();

        Log::debug('Query EXPLAIN', ['plan' => $explanation->toArray()]);
    }

    /**
     * Enable query log for a block of code.
     */
    public function profileBlock(): void
    {
        DB::enableQueryLog();

        // Execute queries...
        $orders = Order::query()->where('status', 'completed')->get();
        $count = Order::query()->where('status', 'pending')->count();

        $queries = DB::getQueryLog();
        // [
        //   ['query' => '...', 'bindings' => [...], 'time' => 1.23],
        //   ['query' => '...', 'bindings' => [...], 'time' => 0.45],
        // ]

        DB::disableQueryLog();

        Log::debug('Query profile', [
            'count' => count($queries),
            'total_ms' => collect($queries)->sum('time'),
        ]);
    }
}
```

**Key Points**:
- `toRawSql()` (Laravel 10.15+) returns SQL with bindings merged — safe for logging
- `toSql()` returns parameterized SQL with `?` placeholders
- `explain()` runs EXPLAIN on the query — reveals index usage and scan type
- `DB::enableQueryLog()` records all queries with execution time
- Disable query log in production — it accumulates memory for every query

---

## Best Practices

- **Start with query()** — always use `Model::query()` for explicit, type-safe builder
- **Use when() for conditionals** — avoids if/else blocks that break fluent chains
- **Scope domain logic** — put business-meaningful filters in model scopes, not repositories
- **Bind raw parameters** — never interpolate variables into raw SQL expressions
- **Cursor paginate for APIs** — better performance and stability than offset pagination
- **chunkById for mutations** — safer than chunk() when modifying records during iteration
- **Log queries in dev** — enable query log or use Laravel Debugbar for N+1 detection
- **Test scopes in isolation** — unit test each scope with `toRawSql()` assertions

---

## Abnormal Case Patterns

1. **OFFSET pagination inconsistency** — new records inserted between pages cause duplicates or skips. Fix: use `cursorPaginate()` for stable pagination.

2. **Raw SQL injection** — concatenating user input into `whereRaw()`. Fix: always use parameter binding: `whereRaw('column = ?', [$value])`.

3. **chunk() with updates** — using `chunk()` while updating records causes infinite loop or skips. Fix: use `chunkById()` which paginates by primary key.

4. **Lazy collection memory** — calling `->all()` or `->toArray()` on lazy collection defeats the purpose. Fix: iterate with `foreach` or yield from generator.

5. **Missing index on scope column** — scope filters on unindexed column causing full table scan. Fix: add database index for columns used in frequently-called scopes.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (318.1–318.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Query Builder Specialist — Data | EPS v3.2*
