# Laravel Performance Specialist — Performance
# Laravelパフォーマンススペシャリスト — パフォーマンス
# Chuyen Gia Hieu Suat Laravel — Hieu Suat

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Performance Optimization
**Aspect**: Performance Tuning
**Category**: performance
**Purpose**: Knowledge provider for Laravel performance optimization — route/config/view caching, eager loading, database indexing, and OPcache configuration

---

## Metadata

```json
{
  "id": "laravel-performance-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Performance",
  "aspect": "Performance Tuning",
  "category": "performance",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 route/config/view caching — artisan optimize pipeline",
    "E2: Eloquent eager loading — N+1 query prevention via with()/load()",
    "E3: Database indexing strategies — composite indexes, covering indexes",
    "E4: OPcache — PHP 8.3 JIT and preloading configuration"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 364.1–364.6 |
| **Directory Pattern** | `config/`, `routes/`, `database/migrations/` |
| **Naming Convention** | N/A (cross-cutting concern) |
| **Imports From** | ALL layers |
| **Imported By** | ALL layers |
| **Cannot Import** | N/A |
| **Dependencies** | `illuminate/cache`, `illuminate/routing`, `ext-opcache` |
| **When To Use** | Every Laravel project requiring production-grade performance |
| **Source Skeleton** | N/A |
| **Specialist Type** | code |
| **Purpose** | Laravel performance optimization — caching layers, query optimization, OPcache tuning |
| **Activation Trigger** | keywords: performance, caching, eager loading, N+1, OPcache, slow query, optimize |

---

## Role

You are a **Laravel Performance Specialist**. Your responsibility is to provide best practices for Laravel 11+ performance optimization — route/config/view caching, Eloquent eager loading strategies, database indexing, and PHP OPcache configuration for production deployments.

**Used by**: Any code agent optimizing Laravel application performance
**Not used by**: Non-Laravel stacks, projects in early prototyping where performance is not yet a concern

---

## Patterns

### Pattern 364.1: Route Caching

**Category**: Framework Caching
**Description**: Cache all registered routes into a single compiled file for faster route resolution.

```php
<?php

// Artisan commands for route caching
// php artisan route:cache   — compile routes
// php artisan route:clear   — clear cached routes

// bootstrap/app.php — ensure routes are cacheable (no closures)
declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Middleware configuration
    })
    ->create();
```

```php
<?php

// routes/api.php — cacheable routes (controller references, no closures)
declare(strict_types=1);

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function (): void {
    Route::apiResource('orders', OrderController::class);
    Route::apiResource('products', ProductController::class);
});
```

**Key Points**:
- Route caching reduces route registration from ~100ms to ~1ms on large apps
- Routes must not use closures — only controller references are cacheable
- Run `php artisan route:cache` in deployment pipeline, never in development
- Laravel 11 supports `php artisan optimize` which combines route + config + view caching

---

### Pattern 364.2: Config Caching

**Category**: Framework Caching
**Description**: Merge all configuration files into a single cached file to eliminate filesystem reads.

```php
<?php

// Artisan commands
// php artisan config:cache  — compile config
// php artisan config:clear  — clear cached config

// config/database.php — environment-aware config (works with caching)
declare(strict_types=1);

return [
    'default' => env('DB_CONNECTION', 'mysql'),

    'connections' => [
        'mysql' => [
            'driver' => 'mysql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
            'options' => extension_loaded('pdo_mysql')
                ? array_filter([PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA')])
                : [],
        ],
    ],
];
```

**Key Points**:
- After `config:cache`, `env()` calls outside config files return `null`
- Always use `config()` helper in application code, never `env()` directly
- Config cache reduces bootstrap time by 50-80% on config-heavy applications
- Rebuild cache on every deployment — stale cache causes production bugs

---

### Pattern 364.3: View Caching

**Category**: Framework Caching
**Description**: Pre-compile all Blade templates to eliminate runtime compilation overhead.

```php
<?php

// Artisan commands
// php artisan view:cache   — compile all Blade views
// php artisan view:clear   — clear compiled views

// Deployment script example (deploy.sh or CI/CD)
// php artisan optimize — runs config:cache + route:cache + view:cache + event:cache

// app/Providers/AppServiceProvider.php — conditional view optimization
declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Custom Blade directive — compiled once, cached
        Blade::directive('money', function (string $expression): string {
            return "<?php echo number_format({$expression}, 2, '.', ','); ?>";
        });

        // Blade component aliases for performance
        Blade::component('ui.alert', 'alert');
        Blade::component('ui.modal', 'modal');
    }
}
```

**Key Points**:
- View caching pre-compiles all Blade templates in `storage/framework/views/`
- First-request latency eliminated — no runtime Blade compilation
- Custom Blade directives are compiled into the cached view
- Use `php artisan optimize` in production to cache everything in one command

---

### Pattern 364.4: Eager Loading Optimization

**Category**: Query Optimization
**Description**: Prevent N+1 queries using eager loading, lazy eager loading, and constrained eager loading.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;

final class OrderController extends Controller
{
    // BAD: N+1 — each order triggers a query for user and items
    public function indexBad(): JsonResponse
    {
        $orders = Order::all(); // 1 query
        foreach ($orders as $order) {
            $order->user;  // N queries
            $order->items; // N queries
        }
        return response()->json($orders);
    }

    // GOOD: Eager loading — 3 queries total regardless of N
    public function index(): JsonResponse
    {
        $orders = Order::with(['user', 'items.product'])
            ->latest()
            ->paginate(perPage: 20);

        return response()->json($orders);
    }

    // Constrained eager loading — load only what's needed
    public function show(Order $order): JsonResponse
    {
        $order->load([
            'items' => fn ($query) => $query->where('quantity', '>', 0)
                ->select(['id', 'order_id', 'product_id', 'quantity', 'price']),
            'items.product:id,name,sku',
            'user:id,name,email',
        ]);

        return response()->json($order);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Order extends Model
{
    // Prevent lazy loading in development — catch N+1 early
    // Called in AppServiceProvider::boot()
    // Model::preventLazyLoading(! app()->isProduction());

    /** @return HasMany<OrderItem> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return BelongsTo<User, Order> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

**Key Points**:
- `with()` for eager loading at query time; `load()` for lazy eager loading after retrieval
- Constrained eager loads reduce data transfer — select only needed columns
- `Model::preventLazyLoading()` throws exceptions in dev, helping catch N+1 early
- Nested eager loading with dot notation: `items.product.category`

---

### Pattern 364.5: Database Indexing

**Category**: Database Optimization
**Description**: Strategic index creation for common query patterns — composite, covering, and partial indexes.

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            // Composite index — matches WHERE user_id = ? AND status = ? ORDER BY created_at
            $table->index(['user_id', 'status', 'created_at'], 'idx_orders_user_status_date');

            // Unique index — business rule enforcement + query performance
            $table->unique(['user_id', 'order_number'], 'uniq_orders_user_order_number');
        });

        Schema::table('order_items', function (Blueprint $table): void {
            // Foreign key index — JOINs and cascading deletes
            $table->index('order_id', 'idx_order_items_order');
            $table->index('product_id', 'idx_order_items_product');

            // Composite for common aggregation queries
            $table->index(['order_id', 'product_id', 'quantity'], 'idx_order_items_composite');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex('idx_orders_user_status_date');
            $table->dropUnique('uniq_orders_user_order_number');
        });

        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropIndex('idx_order_items_order');
            $table->dropIndex('idx_order_items_product');
            $table->dropIndex('idx_order_items_composite');
        });
    }
};
```

**Key Points**:
- Index column order matters — leftmost prefix rule (user_id, status, created_at)
- Name indexes explicitly for clarity and easier migration rollbacks
- Foreign key columns should always be indexed for JOIN performance
- Monitor slow queries with `DB::listen()` or Laravel Telescope to identify missing indexes

---

### Pattern 364.6: OPcache Configuration

**Category**: PHP Runtime
**Description**: PHP 8.3 OPcache and JIT configuration for production Laravel deployments.

```ini
; php.ini — OPcache production settings
[opcache]
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.save_comments=1
opcache.revalidate_freq=0

; JIT (PHP 8.3) — tracing JIT for web workloads
opcache.jit=tracing
opcache.jit_buffer_size=128M

; Preloading — load framework classes once on server start
opcache.preload=/var/www/app/bootstrap/preload.php
opcache.preload_user=www-data
```

```php
<?php

// bootstrap/preload.php — preload hot classes
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

// Preload frequently used framework classes
$preloadClasses = [
    \Illuminate\Http\Request::class,
    \Illuminate\Http\JsonResponse::class,
    \Illuminate\Routing\Router::class,
    \Illuminate\Database\Eloquent\Model::class,
    \Illuminate\Support\Collection::class,
    \Illuminate\Cache\CacheManager::class,
];

foreach ($preloadClasses as $class) {
    if (! class_exists($class, false)) {
        class_exists($class);
    }
}
```

**Key Points**:
- `validate_timestamps=0` in production — never check file modifications (deploy restarts PHP-FPM)
- `max_accelerated_files` should exceed total PHP files: `find . -name "*.php" | wc -l`
- JIT tracing mode benefits CPU-intensive operations but minimal impact on I/O-bound Laravel apps
- Preloading eliminates autoloader overhead for hot classes — restart PHP-FPM after deploy
- `save_comments=1` required — Laravel uses reflection and annotations

---

## Best Practices

- **Use `php artisan optimize` in CI/CD** — combines route, config, view, and event caching in one command
- **Never use `env()` outside config files** — breaks config caching; use `config()` helper instead
- **Enable `preventLazyLoading()` in development** — catches N+1 queries before production
- **Index columns used in WHERE, ORDER BY, and JOIN** — composite indexes follow leftmost prefix rule
- **Set `validate_timestamps=0` in production** — eliminates stat() calls on every request
- **Profile before optimizing** — use Laravel Telescope, Debugbar, or `DB::listen()` to identify actual bottlenecks
- **Preload only hot classes** — excessive preloading wastes shared memory with no benefit
- **Restart PHP-FPM after deploy** — OPcache and preloaded classes require process restart

---

## Abnormal Case Patterns

1. **Config cache with `env()` in application code** — returns `null` after `config:cache` because `.env` is no longer loaded. Fix: always use `config()` helper; put all `env()` calls in config files only.

2. **Route caching with closure routes** — `route:cache` fails with LogicException. Fix: convert all closure routes to controller method references.

3. **Missing index on polymorphic morph columns** — `morphable_type` + `morphable_id` queries do full table scans. Fix: add composite index on `[morphable_type, morphable_id]`.

4. **OPcache `max_accelerated_files` too low** — silently stops caching new files. Fix: set higher than total PHP file count; check with `opcache_get_status()['opcache_statistics']['max_cached_keys']`.

5. **Preloading with unresolvable dependencies** — preload script fails on classes with unmet dependencies. Fix: only preload self-contained classes; test preload script in isolation.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (364.1–364.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Performance Specialist — Performance | EPS v3.2*
