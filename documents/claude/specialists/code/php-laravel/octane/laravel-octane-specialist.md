# Laravel Octane Specialist — Octane
# Laravel Octaneスペシャリスト — Octane
# Chuyen Gia Octane Laravel — Octane

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Octane
**Aspect**: High-Performance Application Server
**Category**: octane
**Purpose**: Knowledge provider for Laravel Octane — Swoole/RoadRunner/FrankenPHP setup, worker lifecycle, memory leak prevention, concurrent tasks, in-memory cache, and warm/flush strategies

---

## Metadata

```json
{
  "id": "laravel-octane-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Octane",
  "aspect": "High-Performance Application Server",
  "category": "octane",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Octane — persistent worker process for request handling",
    "E2: Swoole/RoadRunner/FrankenPHP — high-performance PHP application servers",
    "E3: Worker lifecycle — boot once, handle many requests",
    "E4: Concurrent tasks — parallel execution via Swoole coroutines or worker pools"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 373.1–373.6 |
| **Directory Pattern** | `config/octane.php`, `app/Providers/` |
| **Naming Convention** | N/A (infrastructure configuration) |
| **Imports From** | ALL layers (Octane wraps the entire application) |
| **Imported By** | N/A (deployment concern) |
| **Cannot Import** | N/A |
| **Dependencies** | `laravel/octane`, `openswoole/swoole` or `spiral/roadrunner` |
| **When To Use** | High-throughput APIs, long-running connections (SSE/WebSocket), latency-sensitive apps |
| **Source Skeleton** | `config/octane.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel Octane — persistent workers, concurrent tasks, memory management |
| **Activation Trigger** | files: `config/octane.php`; keywords: Octane, Swoole, RoadRunner, FrankenPHP, worker, concurrent |

---

## Role

You are a **Laravel Octane Specialist**. Your responsibility is to provide best practices for Laravel 11+ Octane — setting up high-performance application servers (Swoole, RoadRunner, FrankenPHP), understanding the worker lifecycle, preventing memory leaks, leveraging concurrent tasks, using Octane's in-memory cache, and implementing warm/flush strategies.

**Used by**: Any code agent deploying Laravel with Octane for high performance
**Not used by**: Standard PHP-FPM deployments, non-Laravel stacks

---

## Patterns

### Pattern 373.1: Octane Setup (Swoole/RoadRunner/FrankenPHP)

**Category**: Installation & Configuration
**Description**: Install and configure Laravel Octane with different application server drivers.

```bash
# Installation
composer require laravel/octane

# Choose server
php artisan octane:install --server=swoole
# OR
php artisan octane:install --server=roadrunner
# OR
php artisan octane:install --server=frankenphp
```

```php
<?php

// config/octane.php
declare(strict_types=1);

return [
    'server' => env('OCTANE_SERVER', 'swoole'),

    'https' => env('OCTANE_HTTPS', false),

    'host' => env('OCTANE_HOST', '0.0.0.0'),
    'port' => env('OCTANE_PORT', 8000),

    'workers' => env('OCTANE_WORKERS', 'auto'), // auto = CPU cores

    'task_workers' => env('OCTANE_TASK_WORKERS', 'auto'),

    'max_requests' => env('OCTANE_MAX_REQUESTS', 500), // Restart worker after N requests

    'tick' => true,
    'tick_interval' => 10000, // milliseconds

    'tables' => [
        // Swoole shared memory tables
        'cache' => [
            'rows' => 1000,
            'columns' => [
                ['name' => 'value', 'type' => 'string', 'size' => 10000],
                ['name' => 'expiration', 'type' => 'int'],
            ],
        ],
    ],

    'flush' => [
        // Services to flush between requests
    ],

    'warm' => [
        // Services to warm on worker boot
        \App\Services\ProductCacheService::class,
        \App\Services\ConfigService::class,
    ],

    'garbage' => 50, // Force GC every N requests

    'listeners' => [
        // Octane lifecycle events
    ],
];
```

**Key Points**:
- Swoole: best performance, requires ext-openswoole; supports coroutines and tables
- RoadRunner: Go-based, no PHP extension needed; works with existing PHP setups
- FrankenPHP: Caddy-based, HTTP/3 support; newest option with modern TLS
- `max_requests` restarts workers after N requests — prevents long-term memory leaks
- `workers => 'auto'` sets worker count to CPU core count — optimal for CPU-bound work

---

### Pattern 373.2: Worker Lifecycle

**Category**: Lifecycle Management
**Description**: Understand the worker boot-once, handle-many lifecycle and its implications.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Octane\Events\RequestReceived;
use Laravel\Octane\Events\RequestTerminated;
use Laravel\Octane\Events\WorkerStarting;
use Laravel\Octane\Events\WorkerStopping;

final class OctaneServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Runs once when worker process starts
        $this->app['events']->listen(WorkerStarting::class, function (): void {
            \Illuminate\Support\Facades\Log::info('Octane worker started', [
                'pid' => getmypid(),
                'memory' => memory_get_usage(true),
            ]);
        });

        // Runs on every request — use for per-request setup
        $this->app['events']->listen(RequestReceived::class, function (RequestReceived $event): void {
            // Reset per-request state
            // Note: Octane already resets most Laravel services
        });

        // Runs after every request — use for cleanup
        $this->app['events']->listen(RequestTerminated::class, function (): void {
            // Clean up any request-specific resources
        });

        // Runs when worker is shutting down
        $this->app['events']->listen(WorkerStopping::class, function (): void {
            \Illuminate\Support\Facades\Log::info('Octane worker stopping', [
                'pid' => getmypid(),
                'peak_memory' => memory_get_peak_usage(true),
            ]);
        });
    }
}
```

**Key Points**:
- Workers boot the application once — subsequent requests reuse the booted application
- Boot time is amortized across hundreds of requests — dramatic latency reduction
- `WorkerStarting` fires once — use for expensive one-time setup (preloading, caching)
- `RequestTerminated` fires after each response — clean up per-request state
- Static variables persist across requests — this is the #1 source of bugs with Octane

---

### Pattern 373.3: Memory Leak Prevention

**Category**: Memory Safety
**Description**: Prevent memory leaks caused by state persisting across requests in long-lived workers.

```php
<?php

declare(strict_types=1);

namespace App\Services;

// BAD: Static state leaks across requests
final class BadStatisticService
{
    /** @var array<string, int> */
    private static array $counters = []; // LEAKS! Grows with every request

    public function increment(string $key): void
    {
        self::$counters[$key] = (self::$counters[$key] ?? 0) + 1;
    }
}

// GOOD: Request-scoped via container binding
final class StatisticService
{
    /** @var array<string, int> */
    private array $counters = [];

    public function increment(string $key): void
    {
        $this->counters[$key] = ($this->counters[$key] ?? 0) + 1;
    }

    public function getCounters(): array
    {
        return $this->counters;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // GOOD: Scoped binding — new instance per request
        $this->app->scoped(
            \App\Services\StatisticService::class,
        );

        // GOOD: Singleton services that are stateless are safe
        $this->app->singleton(
            \App\Services\ReadOnlyConfigService::class,
        );
    }
}
```

```php
<?php

// config/octane.php — flush stateful services between requests
return [
    'flush' => [
        \App\Services\CartService::class,
        \App\Services\SessionContextService::class,
    ],

    'listeners' => [
        \Laravel\Octane\Events\RequestTerminated::class => [
            \App\Listeners\CleanupRequestState::class,
        ],
    ],
];
```

**Key Points**:
- **Never use static properties** for request-specific state — they persist across requests
- Use `scoped()` binding — Octane creates a new instance per request automatically
- `flush` config lists services to destroy and recreate between requests
- Stateless singletons (config readers, pure functions) are safe
- Monitor memory with `memory_get_usage()` — growing memory indicates a leak

---

### Pattern 373.4: Concurrent Tasks

**Category**: Parallelism
**Description**: Execute multiple operations concurrently using Octane's concurrency API.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Laravel\Octane\Facades\Octane;

final class DashboardController extends Controller
{
    /**
     * Load dashboard data concurrently — 3x faster than sequential.
     */
    public function index(): JsonResponse
    {
        [$orderStats, $revenueStats, $userStats, $notifications] = Octane::concurrently([
            fn () => \App\Models\Order::query()
                ->where('created_at', '>=', now()->startOfDay())
                ->selectRaw('COUNT(*) as count, SUM(total) as total')
                ->first(),

            fn () => \App\Models\Order::query()
                ->where('status', 'completed')
                ->where('created_at', '>=', now()->startOfMonth())
                ->sum('total'),

            fn () => [
                'total' => User::count(),
                'new_today' => User::whereDate('created_at', today())->count(),
                'active' => User::where('last_active_at', '>=', now()->subMinutes(15))->count(),
            ],

            fn () => auth()->user()->unreadNotifications()->limit(5)->get(),
        ], 5000); // 5 second timeout

        return response()->json([
            'orders' => $orderStats,
            'revenue' => $revenueStats,
            'users' => $userStats,
            'notifications' => $notifications,
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Laravel\Octane\Facades\Octane;

final class ExternalApiAggregator
{
    /**
     * Fetch data from multiple APIs concurrently.
     *
     * @return array<string, mixed>
     */
    public function fetchAll(int $productId): array
    {
        [$pricing, $inventory, $reviews] = Octane::concurrently([
            fn () => \Illuminate\Support\Facades\Http::get(
                config('services.pricing.url') . "/products/{$productId}/price"
            )->json(),

            fn () => \Illuminate\Support\Facades\Http::get(
                config('services.inventory.url') . "/products/{$productId}/stock"
            )->json(),

            fn () => \Illuminate\Support\Facades\Http::get(
                config('services.reviews.url') . "/products/{$productId}/summary"
            )->json(),
        ], 3000); // 3 second timeout per task

        return [
            'pricing' => $pricing,
            'inventory' => $inventory,
            'reviews' => $reviews,
        ];
    }
}
```

**Key Points**:
- `Octane::concurrently()` runs closures in parallel — reduces total time to slowest task
- Timeout parameter (milliseconds) prevents one slow task from blocking all
- Works with Swoole coroutines — true parallelism, not async simulation
- Each closure runs in its own context — no shared state between concurrent tasks
- Best for aggregating data from multiple independent sources (APIs, DB queries)

---

### Pattern 373.5: Octane Cache (In-Memory)

**Category**: Performance
**Description**: Use Octane's in-memory cache for ultra-low-latency data access.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Laravel\Octane\Facades\Octane;

final class OctaneCacheService
{
    /**
     * Store value in Octane's in-memory cache (Swoole Table).
     * Shared across all workers on the same server.
     */
    public function cacheInMemory(string $key, mixed $value, int $seconds = 60): void
    {
        Octane::table('cache')->set($key, [
            'value' => serialize($value),
            'expiration' => time() + $seconds,
        ]);
    }

    /**
     * Retrieve from in-memory cache.
     */
    public function getFromMemory(string $key): mixed
    {
        $row = Octane::table('cache')->get($key);

        if (! $row || $row['expiration'] < time()) {
            return null;
        }

        return unserialize($row['value']);
    }

    /**
     * Use Octane cache for hot config data.
     */
    public function getFeatureFlags(): array
    {
        $cached = $this->getFromMemory('feature_flags');

        if ($cached !== null) {
            return $cached;
        }

        $flags = \App\Models\FeatureFlag::where('is_active', true)
            ->pluck('value', 'name')
            ->toArray();

        $this->cacheInMemory('feature_flags', $flags, seconds: 300);

        return $flags;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Laravel\Octane\Facades\Octane;

final class CacheController extends Controller
{
    /**
     * Octane cache store — simpler API for key-value caching.
     */
    public function getCachedRate(): JsonResponse
    {
        // Octane cache store — microsecond access, no network round-trip
        $rate = cache()->store('octane')->remember(
            key: 'exchange_rate:USD_JPY',
            ttl: 60,
            callback: fn () => \App\Services\ExchangeRateService::getRate('USD', 'JPY'),
        );

        return response()->json(['rate' => $rate]);
    }
}
```

**Key Points**:
- Octane cache lives in shared memory (Swoole Table) — microsecond access latency
- No network round-trip — orders of magnitude faster than Redis for hot data
- Shared across all workers on the same server — not distributed across servers
- Limited by pre-allocated table size (`rows` in config) — use for small, hot datasets
- Data is lost on worker restart — not durable; use Redis for persistent cache

---

### Pattern 373.6: Warm/Flush Strategies

**Category**: Worker Management
**Description**: Pre-warm services on worker boot and flush request-specific state between requests.

```php
<?php

// config/octane.php
declare(strict_types=1);

return [
    // Services resolved on worker boot — amortize expensive construction
    'warm' => [
        \Illuminate\Contracts\Routing\UrlGenerator::class,
        \Illuminate\Contracts\View\Factory::class,
        \App\Services\ProductCatalogService::class,
        \App\Services\PermissionService::class,
    ],

    // Services flushed (destroyed and recreated) between requests
    'flush' => [
        \App\Services\ShoppingCartService::class,
        \App\Services\RequestContextService::class,
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use Laravel\Octane\Events\WorkerStarting;

final class WarmApplicationCache
{
    public function handle(WorkerStarting $event): void
    {
        // Pre-load frequently accessed data into Octane cache
        $categories = \App\Models\Category::orderBy('name')->get();

        \Laravel\Octane\Facades\Octane::table('cache')->set('categories', [
            'value' => serialize($categories),
            'expiration' => time() + 3600,
        ]);

        // Pre-resolve expensive services
        app(\App\Services\PermissionService::class)->loadPermissions();

        \Illuminate\Support\Facades\Log::info('Worker warmed', [
            'pid' => getmypid(),
            'cached_categories' => $categories->count(),
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use Laravel\Octane\Events\RequestTerminated;

final class CleanupRequestState
{
    public function handle(RequestTerminated $event): void
    {
        // Clear any request-specific state that might leak
        \Illuminate\Support\Facades\DB::disconnect();

        // Force garbage collection periodically
        if (random_int(1, 100) <= 5) { // 5% of requests
            gc_collect_cycles();
        }
    }
}
```

**Key Points**:
- `warm` services are resolved once during worker boot — shared across all requests
- `flush` services are destroyed after each request — guarantees clean state
- Warm expensive services (permission trees, config caches) to avoid per-request cost
- Flush stateful services (carts, session context) to prevent data leaking
- `DB::disconnect()` prevents stale database connections in long-lived workers

---

## Best Practices

- **Avoid static state** — no static properties for request data; use scoped bindings instead
- **Set `max_requests`** — restart workers after 500-1000 requests to prevent memory leaks
- **Warm read-only services** — permission trees, config, and route caches benefit from warming
- **Flush stateful services** — any service holding request-specific data must be flushed
- **Use `scoped()` bindings** — Octane automatically creates new instances per request
- **Monitor worker memory** — alert if worker memory grows steadily across requests
- **Test with `php artisan octane:start`** — behavior differs from `php artisan serve` (PHP-FPM)
- **Use `Octane::concurrently()` wisely** — only for independent operations; overhead for simple queries

---

## Abnormal Case Patterns

1. **State leaking between requests** — user A sees user B's data due to singleton service holding request state. Fix: use `scoped()` binding or add service to `flush` config.

2. **Database connection timeout** — worker holds stale DB connection after idle period. Fix: set `DB::disconnect()` in `RequestTerminated` listener; configure `wait_timeout` in MySQL.

3. **Memory growth across requests** — worker memory increases steadily, eventually OOM-killed. Fix: enable `max_requests` for periodic worker restart; audit static arrays and caches.

4. **Concurrent task failure** — `Octane::concurrently()` throws timeout exception, breaking entire response. Fix: wrap concurrent calls in try/catch; provide fallback values for failed tasks.

5. **Extension incompatibility** — some PHP extensions assume single-request lifecycle. Fix: check extension compatibility with Swoole/RoadRunner; use RoadRunner for broader compatibility.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (373.1–373.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Octane Specialist — Octane | EPS v3.2*
