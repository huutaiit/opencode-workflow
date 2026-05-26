# Laravel Database Patterns Specialist — Data
# Laravel データベースパターンスペシャリスト — データ
# Chuyen Gia Database Patterns Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Database Patterns
**Aspect**: Database Architecture Patterns
**Category**: data
**Purpose**: Knowledge provider for Laravel database architecture — repository pattern, read/write connections, database notifications, JSON columns, full-text search, multi-tenancy, schema builder, and database testing

---

## Metadata

```json
{
  "id": "laravel-database-patterns-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Database Patterns",
  "aspect": "Database Architecture Patterns",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Repository pattern with Eloquent — domain-driven data access abstraction",
    "E2: Laravel read/write connections — automatic query routing for replicas",
    "E3: JSON column querying — native JSON path operators for structured data"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 320.1–320.8 |
| **Directory Pattern** | `app/Repositories/` |
| **Naming Convention** | `{Entity}Repository.php`, `{Entity}RepositoryInterface.php` |
| **Imports From** | Domain (models, interfaces, enums) |
| **Imported By** | Application (services) |
| **Cannot Import** | Controllers, Requests, Commands |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Projects requiring data access abstraction, multi-database, or advanced DB patterns |
| **Source Skeleton** | `app/Repositories/{Entity}Repository.php` |
| **Specialist Type** | code |
| **Purpose** | Database architecture patterns — repository, read/write split, JSON columns, full-text search, multi-tenancy, schema builder, testing |
| **Activation Trigger** | files: `app/Repositories/*.php`; keywords: Repository, read/write, JSON column, fulltext, tenant, schema |

---

## Role

You are a **Laravel Database Patterns Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 database architecture — repository pattern with Eloquent, read/write connection splitting, database notifications, JSON column querying, full-text search, multi-tenancy patterns, schema builder operations, and database testing strategies.

**Used by**: Any code agent working with Laravel database architecture beyond basic Eloquent CRUD
**Not used by**: Non-Laravel stacks, simple CRUD applications without architectural patterns

---

## Patterns

### Pattern 320.1: Repository Pattern with Eloquent

**Category**: Data Access
**Description**: Repository pattern wrapping Eloquent for testable, swappable data access.

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;

interface OrderRepositoryInterface
{
    public function findById(int $id): ?Order;

    public function findByUser(int $userId): Collection;

    public function create(array $data): Order;

    public function updateStatus(int $id, string $status): bool;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\OrderRepositoryInterface;
use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;

final readonly class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function __construct(
        private Order $model,
    ) {}

    public function findById(int $id): ?Order
    {
        return $this->model->newQuery()
            ->with(['items', 'user:id,name,email'])
            ->find($id);
    }

    public function findByUser(int $userId): Collection
    {
        return $this->model->newQuery()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function create(array $data): Order
    {
        return $this->model->newQuery()->create($data);
    }

    public function updateStatus(int $id, string $status): bool
    {
        return (bool) $this->model->newQuery()
            ->where('id', $id)
            ->update(['status' => $status]);
    }
}

// Bind in ServiceProvider:
// $this->app->bind(OrderRepositoryInterface::class, EloquentOrderRepository::class);
```

**Key Points**:
- Interface defines data access contract — swappable implementations
- `final readonly` repository — immutable, no mutable state
- Inject `Model` instance for `newQuery()` — enables testing with fresh builders
- Repository handles eager loading decisions — services stay persistence-agnostic
- Bind interface to implementation in a service provider

---

### Pattern 320.2: Read/Write Connections

**Category**: Database Scaling
**Description**: Automatic query routing to read replicas and write primary using Laravel's built-in support.

```php
<?php

// config/database.php
return [
    'connections' => [
        'mysql' => [
            'read' => [
                'host' => [
                    env('DB_READ_HOST_1', '127.0.0.1'),
                    env('DB_READ_HOST_2', '127.0.0.1'),
                ],
            ],
            'write' => [
                'host' => [env('DB_WRITE_HOST', '127.0.0.1')],
            ],
            'sticky' => true, // Read from write after writing in same request
            'driver' => 'mysql',
            'database' => env('DB_DATABASE', 'forge'),
            'username' => env('DB_USERNAME', 'forge'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

final readonly class ProductRepository
{
    /**
     * Reads automatically go to read replica.
     */
    public function findActive(): Collection
    {
        return Product::query()
            ->where('is_active', true)
            ->get(); // Routed to read connection
    }

    /**
     * Writes automatically go to write primary.
     */
    public function updatePrice(int $id, float $price): bool
    {
        return (bool) Product::query()
            ->where('id', $id)
            ->update(['price' => $price]); // Routed to write connection
    }

    /**
     * Force read from write connection for consistency.
     */
    public function findAfterWrite(int $id): ?Product
    {
        return Product::on('mysql::write')->find($id);
    }
}
```

**Key Points**:
- Laravel automatically routes SELECT to `read`, INSERT/UPDATE/DELETE to `write`
- `sticky => true` — after a write, subsequent reads in the same request use write connection
- Multiple read hosts enable round-robin load balancing across replicas
- Use `Model::on('connection::write')` to force reading from primary after critical writes
- Shared credentials apply to both read and write unless overridden per section

---

### Pattern 320.3: Database Notifications

**Category**: Persistence
**Description**: Store notifications in the database for in-app notification systems.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

final class OrderShippedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Order $order,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'reference' => $this->order->reference_number,
            'message' => "Your order {$this->order->reference_number} has been shipped.",
            'tracking_url' => $this->order->tracking_url,
        ];
    }
}

// Usage:
// $user->notify(new OrderShippedNotification($order));
// $user->unreadNotifications->count();
// $user->unreadNotifications->markAsRead();
// $user->notifications()->where('type', OrderShippedNotification::class)->get();
```

**Key Points**:
- Database channel stores notifications in `notifications` table
- Run `php artisan notifications:table && php artisan migrate` to create table
- `toDatabase()` returns data stored as JSON in the `data` column
- `$user->unreadNotifications` filters by `read_at IS NULL`
- `markAsRead()` sets `read_at` timestamp on notification records

---

### Pattern 320.4: JSON Columns

**Category**: Structured Data
**Description**: Query and manipulate JSON columns using Eloquent's JSON path syntax.

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

final readonly class ProductSearchRepository
{
    /**
     * Query JSON column with arrow syntax.
     */
    public function findBySpecification(string $key, mixed $value): Collection
    {
        return Product::query()
            ->where("specifications->{$key}", $value)
            ->get();
    }

    /**
     * Query nested JSON paths.
     */
    public function findByDimension(float $minWidth): Collection
    {
        return Product::query()
            ->where('specifications->dimensions->width', '>=', $minWidth)
            ->get();
    }

    /**
     * JSON contains — check if JSON array includes a value.
     */
    public function findByTag(string $tag): Collection
    {
        return Product::query()
            ->whereJsonContains('tags', $tag)
            ->get();
    }

    /**
     * JSON length — filter by array size.
     */
    public function findWithMultipleTags(int $minTags = 3): Collection
    {
        return Product::query()
            ->whereJsonLength('tags', '>=', $minTags)
            ->get();
    }

    /**
     * Update specific JSON key without replacing entire column.
     */
    public function updateSpecification(int $id, string $key, mixed $value): bool
    {
        return (bool) Product::query()
            ->where('id', $id)
            ->update(["specifications->{$key}" => $value]);
    }
}
```

**Key Points**:
- `->` arrow syntax for JSON path queries — maps to `JSON_EXTRACT` in MySQL
- `whereJsonContains()` checks if JSON array includes a value
- `whereJsonLength()` filters by JSON array element count
- JSON path updates modify specific keys without replacing the entire column
- Cast JSON columns as `array` or `collection` in model's `casts()` method

---

### Pattern 320.5: Full-Text Search

**Category**: Search
**Description**: Database full-text search using Laravel's built-in fulltext index support.

```php
<?php

// Migration: add fulltext index
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->fullText(['title', 'body']);
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->dropFullText(['title', 'body']);
        });
    }
};
```

```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Article;
use Illuminate\Database\Eloquent\Collection;

final readonly class ArticleSearchRepository
{
    /**
     * Full-text search with whereFullText.
     */
    public function search(string $query): Collection
    {
        return Article::query()
            ->whereFullText(['title', 'body'], $query)
            ->where('is_published', true)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();
    }

    /**
     * Full-text search with boolean mode (MySQL).
     */
    public function searchBoolean(string $query): Collection
    {
        return Article::query()
            ->whereFullText(['title', 'body'], $query, ['mode' => 'boolean'])
            ->get();
    }

    /**
     * Full-text with relevance scoring.
     */
    public function searchWithRelevance(string $query): Collection
    {
        return Article::query()
            ->whereFullText(['title', 'body'], $query)
            ->selectRaw("*, MATCH(title, body) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance", [$query])
            ->orderByDesc('relevance')
            ->get();
    }
}
```

**Key Points**:
- `$table->fullText()` creates FULLTEXT index in migration
- `whereFullText()` generates `MATCH ... AGAINST` SQL — MySQL/PostgreSQL
- Boolean mode supports `+required -excluded` query syntax
- Relevance scoring via `selectRaw` with `MATCH AGAINST` for ranked results
- For complex search needs, consider Laravel Scout with Algolia/Meilisearch

---

### Pattern 320.6: Multi-Tenancy with Database

**Category**: Architecture
**Description**: Database-level multi-tenancy using separate databases or schema-based isolation.

```php
<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query): void {
            if ($tenantId = app('tenant.id')) {
                $query->where(
                    $query->getModel()->getTable() . '.tenant_id',
                    $tenantId,
                );
            }
        });

        static::creating(function (Model $model): void {
            if (! $model->tenant_id && $tenantId = app('tenant.id')) {
                $model->tenant_id = $tenantId;
            }
        });
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class IdentifyTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = \App\Models\Tenant::where(
            'domain',
            $request->getHost(),
        )->firstOrFail();

        app()->instance('tenant.id', $tenant->id);
        app()->instance('tenant', $tenant);

        return $next($request);
    }
}

// Model usage:
// final class Project extends Model
// {
//     use BelongsToTenant;
//     // All queries automatically scoped to current tenant
// }
```

**Key Points**:
- Global scope automatically filters all queries by `tenant_id`
- `creating` event auto-sets `tenant_id` on new records
- Middleware identifies tenant from domain/subdomain/header
- Qualify column with table name to prevent ambiguity in joins
- For database-per-tenant, use dynamic connection switching instead of scopes

---

### Pattern 320.7: Schema Builder

**Category**: Schema Operations
**Description**: Programmatic schema inspection and modification beyond migrations.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

final readonly class SchemaInspectionService
{
    /**
     * Check table and column existence.
     */
    public function tableExists(string $table): bool
    {
        return Schema::hasTable($table);
    }

    public function columnExists(string $table, string $column): bool
    {
        return Schema::hasColumn($table, $column);
    }

    /**
     * Get all columns for a table.
     *
     * @return array<int, array{name: string, type: string, nullable: bool}>
     */
    public function getColumns(string $table): array
    {
        return Schema::getColumns($table);
    }

    /**
     * Get all indexes for a table.
     *
     * @return array<int, array{name: string, columns: array, type: string, unique: bool}>
     */
    public function getIndexes(string $table): array
    {
        return Schema::getIndexes($table);
    }

    /**
     * Get all tables in the database.
     *
     * @return array<int, array{name: string, size: int}>
     */
    public function getTables(): array
    {
        return Schema::getTables();
    }

    /**
     * Get foreign keys for a table.
     */
    public function getForeignKeys(string $table): array
    {
        return Schema::getForeignKeys($table);
    }
}
```

**Key Points**:
- `Schema::getColumns()` returns column metadata (Laravel 11+) — replaces `getColumnListing()`
- `Schema::getIndexes()` inspects existing indexes for optimization analysis
- `Schema::getTables()` lists all tables with size information
- `Schema::getForeignKeys()` reveals FK constraints for dependency analysis
- Use schema inspection in artisan commands, not in request lifecycle

---

### Pattern 320.8: Database Testing

**Category**: Testing
**Description**: Advanced database testing patterns — assertions, factories, and test isolation.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OrderRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_find_by_user_returns_only_user_orders(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Order::factory()->count(3)->for($user)->create();
        Order::factory()->count(2)->for($otherUser)->create();

        $repository = app(\App\Contracts\OrderRepositoryInterface::class);
        $orders = $repository->findByUser($user->id);

        $this->assertCount(3, $orders);
        $orders->each(fn ($order) => $this->assertEquals($user->id, $order->user_id));
    }

    public function test_update_status_modifies_database(): void
    {
        $order = Order::factory()->create(['status' => 'pending']);

        $repository = app(\App\Contracts\OrderRepositoryInterface::class);
        $result = $repository->updateStatus($order->id, 'completed');

        $this->assertTrue($result);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'completed',
        ]);
    }

    public function test_json_column_stored_correctly(): void
    {
        $metadata = ['source' => 'web', 'campaign' => 'summer-2024'];

        $order = Order::factory()->create(['metadata' => $metadata]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
        ]);

        $fresh = $order->fresh();
        $this->assertEquals('web', $fresh->metadata['source']);
        $this->assertEquals('summer-2024', $fresh->metadata['campaign']);
    }
}
```

**Key Points**:
- `for($user)` factory method sets the BelongsTo relationship
- Test repository methods through the interface binding — validates wiring
- `fresh()` re-fetches from database to verify persistence
- Assert JSON column values by decoding and checking individual keys
- Each test runs in isolation — `RefreshDatabase` wraps in transaction

---

## Best Practices

- **Repository interface** — define data access contracts in `app/Contracts/` for swappable implementations
- **Read/write splitting** — enable `sticky` mode to prevent stale reads after writes
- **JSON columns for flexibility** — use for metadata/settings that don't need relational normalization
- **Fulltext for search** — prefer database fulltext over LIKE queries for natural language search
- **Tenant scoping** — use global scopes with traits for consistent tenant isolation
- **Schema inspection** — use `Schema::getColumns()` for runtime schema analysis (CLI/admin tools only)
- **Factory for() method** — use `for($parent)` instead of manual FK assignment in tests
- **Test through interfaces** — resolve from container to validate service provider bindings

---

## Abnormal Case Patterns

1. **Repository returning query builder** — repository method returns Builder instead of Collection/Model. Fix: always execute query (get/first/find) inside repository; return concrete results.

2. **Read replica lag** — data written to primary not yet replicated to read replica. Fix: enable `sticky => true` or use `Model::on('mysql::write')` for critical reads.

3. **JSON column not indexed** — filtering on JSON paths causes full table scan. Fix: create generated column + index, or use virtual index (MySQL 8.0+).

4. **Tenant data leak** — query bypasses global scope using `withoutGlobalScope()`. Fix: audit all scope removal; add tenant assertion middleware for critical endpoints.

5. **Full-text minimum word length** — MySQL default `ft_min_word_len` is 4 characters, ignoring short search terms. Fix: configure MySQL `innodb_ft_min_token_size` or use Meilisearch for short-term search.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (320.1–320.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Database Patterns Specialist — Data | EPS v3.2*
