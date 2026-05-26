# Laravel Async & Concurrency Specialist — Language
# Laravel非同期・並行処理スペシャリスト — 言語
# Chuyen Gia Bat Dong Bo Va Xu Ly Song Song Laravel — Ngon Ngu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: Async & Concurrency
**Category**: language
**Purpose**: Knowledge provider for async and concurrency patterns in Laravel — concurrency helpers, process forking, async HTTP requests, parallel testing, Swoole/Octane coroutines, and promise-like patterns

---

## Metadata

```json
{
  "id": "laravel-async-concurrency-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Async & Concurrency",
  "category": "language",
  "subcategory": "php-laravel",
  "lines": 440,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 Concurrency facade — run/defer closures concurrently via process forking",
    "E2: Laravel HTTP client pool — concurrent outbound requests via Http::pool()",
    "E3: Laravel Octane — Swoole/RoadRunner long-running workers with coroutine support"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 357.1–357.6 |
| **Directory Pattern** | `app/Services/`, `app/Jobs/` |
| **Naming Convention** | `{Name}Service.php`, `{Name}Job.php` |
| **Imports From** | Domain (interfaces), Application (use cases) |
| **Imported By** | Application layer (controllers, commands) |
| **Cannot Import** | Presentation layer |
| **Dependencies** | `laravel/octane` (optional) |
| **When To Use** | When sequential execution creates performance bottlenecks |
| **Source Skeleton** | N/A |
| **Specialist Type** | code |
| **Purpose** | Concurrent and async execution patterns for Laravel applications |
| **Activation Trigger** | keywords: concurrency, async, parallel, Http::pool, Octane, Swoole, forking, coroutine |
| **Anti-Patterns** | Shared mutable state across forks, unhandled concurrent exceptions, memory leaks in long-running processes |
| **Related Specialists** | laravel-php-fundamentals-specialist (fibers), laravel-service-provider-specialist |

---

## Role

You are a **Laravel Async & Concurrency Specialist**. Your responsibility is to provide best practices for concurrent and asynchronous execution in Laravel 11+ — using the Concurrency facade, HTTP client pools, process forking, parallel testing, Swoole/Octane coroutines, and promise-like patterns.

**Used by**: Any code agent implementing concurrent operations, batch processing, or async I/O
**Not used by**: Simple CRUD applications with no concurrency requirements

---

## Patterns

### Pattern 357.1: Laravel Concurrency Facade (L11)

**Category**: Concurrency Primitives
**Description**: Laravel 11's `Concurrency` facade runs closures concurrently via child process forking.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Concurrency;

final class DashboardAggregationService
{
    /**
     * Run independent data fetches concurrently — each closure
     * executes in a forked child process.
     *
     * @return array{users: int, orders: int, revenue: int, tickets: int}
     */
    public function getMetrics(): array
    {
        [$users, $orders, $revenue, $tickets] = Concurrency::run([
            fn () => \App\Models\User::query()->where('is_active', true)->count(),
            fn () => \App\Models\Order::query()->whereDate('created_at', today())->count(),
            fn () => \App\Models\Order::query()->whereDate('created_at', today())->sum('total_cents'),
            fn () => \App\Models\SupportTicket::query()->where('status', 'open')->count(),
        ]);

        return [
            'users' => $users,
            'orders' => $orders,
            'revenue' => $revenue,
            'tickets' => $tickets,
        ];
    }

    /**
     * Defer tasks that don't need to complete before the response.
     */
    public function recordActivity(int $userId, string $action): void
    {
        Concurrency::defer([
            fn () => \App\Models\ActivityLog::create([
                'user_id' => $userId,
                'action' => $action,
                'recorded_at' => now(),
            ]),
            fn () => \Illuminate\Support\Facades\Cache::increment("user:{$userId}:actions"),
        ]);
    }
}
```

**Key Points**:
- `Concurrency::run()` executes closures in parallel child processes, returns results in order
- `Concurrency::defer()` — fire-and-forget tasks that run after the response is sent
- Each closure runs in a separate process — no shared memory between closures
- Closures must be serializable — no database connections or file handles
- Results are serialized/deserialized — return only simple types (arrays, scalars, DTOs)
- Requires `pcntl` extension (default on most Linux PHP installations)

---

### Pattern 357.2: Process Forking for Batch Operations

**Category**: Process Management
**Description**: Use Laravel's Process facade for forking heavy batch operations into parallel worker processes.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Process\Pool;
use Illuminate\Support\Facades\Process;

final class BatchExportService
{
    /**
     * Export data in parallel chunks using process pooling.
     *
     * @param array<int, int> $chunkIds
     * @return array<int, array{chunk_id: int, status: string, path: string}>
     */
    public function exportInParallel(array $chunkIds): array
    {
        $results = Process::pool(function (Pool $pool) use ($chunkIds): void {
            foreach ($chunkIds as $chunkId) {
                $pool->command(
                    "php artisan export:chunk --chunk-id={$chunkId} --format=csv",
                );
            }
        })->start()->wait();

        $exportResults = [];
        foreach ($results as $index => $result) {
            $exportResults[] = [
                'chunk_id' => $chunkIds[$index],
                'status' => $result->successful() ? 'completed' : 'failed',
                'path' => $result->successful()
                    ? trim($result->output())
                    : '',
            ];

            if ($result->failed()) {
                logger()->error('Export chunk failed', [
                    'chunk_id' => $chunkIds[$index],
                    'error' => $result->errorOutput(),
                    'exit_code' => $result->exitCode(),
                ]);
            }
        }

        return $exportResults;
    }

    /**
     * Run a single background process with timeout.
     */
    public function generateReportAsync(int $reportId): void
    {
        Process::timeout(seconds: 300)
            ->start("php artisan report:generate --id={$reportId}")
            ->wait();
    }
}
```

**Key Points**:
- `Process::pool()` runs multiple CLI commands concurrently
- Each process is fully isolated — separate memory, separate DB connections
- Use Artisan commands as process entry points — clean boundaries
- Check `$result->successful()` and handle failures per-process
- Set explicit timeouts — unbounded processes risk resource exhaustion
- Process pools are ideal for CPU-bound tasks (PDF generation, data transformation)

---

### Pattern 357.3: Async HTTP Requests with Http::pool

**Category**: Async I/O
**Description**: Send multiple HTTP requests concurrently using Laravel's HTTP client pool.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;

final class ExternalDataAggregator
{
    /**
     * Fetch data from multiple APIs concurrently.
     *
     * @return array{weather: array, stocks: array, news: array}
     */
    public function fetchDashboardData(string $city, string $stockSymbol): array
    {
        $responses = Http::pool(fn (Pool $pool) => [
            $pool->as('weather')
                ->timeout(10)
                ->get("https://api.weather.example.com/v1/current", [
                    'city' => $city,
                    'units' => 'metric',
                ]),

            $pool->as('stocks')
                ->timeout(10)
                ->withToken(config('services.stocks.api_key'))
                ->get("https://api.stocks.example.com/v1/quote/{$stockSymbol}"),

            $pool->as('news')
                ->timeout(10)
                ->get('https://api.news.example.com/v1/headlines', [
                    'country' => 'jp',
                    'category' => 'business',
                ]),
        ]);

        return [
            'weather' => $responses['weather']->successful()
                ? $responses['weather']->json()
                : ['error' => 'Weather API unavailable'],

            'stocks' => $responses['stocks']->successful()
                ? $responses['stocks']->json()
                : ['error' => 'Stock API unavailable'],

            'news' => $responses['news']->successful()
                ? $responses['news']->json('articles', [])
                : ['error' => 'News API unavailable'],
        ];
    }

    /**
     * Batch webhook notifications with retry logic.
     *
     * @param array<int, array{url: string, payload: array}> $webhooks
     * @return array<int, bool>
     */
    public function sendWebhooksBatch(array $webhooks): array
    {
        $responses = Http::pool(function (Pool $pool) use ($webhooks): array {
            $requests = [];
            foreach ($webhooks as $index => $webhook) {
                $requests[] = $pool->as((string) $index)
                    ->timeout(5)
                    ->retry(times: 2, sleepMilliseconds: 500)
                    ->post($webhook['url'], $webhook['payload']);
            }
            return $requests;
        });

        $results = [];
        foreach ($webhooks as $index => $webhook) {
            $results[$index] = $responses[(string) $index]->successful();
        }

        return $results;
    }
}
```

**Key Points**:
- `Http::pool()` sends all requests concurrently using Guzzle's async handler
- Use `$pool->as('name')` to label responses for easy retrieval
- Set per-request timeouts — one slow API should not block the entire pool
- Handle partial failures gracefully — some requests may fail while others succeed
- Add `->retry()` for transient failures (network timeouts, 5xx responses)
- Pool is ideal for aggregating data from multiple microservices or third-party APIs

---

### Pattern 357.4: Parallel Testing

**Category**: Testing Performance
**Description**: Run test suites in parallel to reduce CI pipeline execution time.

```xml
<!-- phpunit.xml — parallel testing setup -->
<phpunit>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
</phpunit>
```

```bash
# Run tests in parallel with Pest (built-in)
php artisan test --parallel --processes=4

# Parallel with coverage
XDEBUG_MODE=coverage php artisan test --parallel --processes=4 --coverage --min=80

# ParaTest for PHPUnit (alternative)
vendor/bin/paratest --processes=4 --runner=WrapperRunner
```

```php
<?php

declare(strict_types=1);

// tests/Pest.php — configure parallel-safe database
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

pest()
    ->extend(Tests\TestCase::class)
    ->use(LazilyRefreshDatabase::class)
    ->in('Feature');
```

```php
<?php

declare(strict_types=1);

// tests/Feature/ParallelSafeTest.php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

final class OrderCreationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_creates_order_in_parallel_safe_manner(): void
    {
        // Each parallel process gets its own database
        // Use LazilyRefreshDatabase — only migrates when DB is first accessed
        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/orders', [
                'items' => [['product_id' => 1, 'quantity' => 2]],
            ]);

        $response->assertStatus(201);
    }
}
```

**Key Points**:
- `--parallel` in Laravel uses separate databases per process (test_1, test_2, etc.)
- `LazilyRefreshDatabase` — only runs migrations when the test actually touches DB
- Parallel tests must be isolated — no shared state, no fixed IDs, no file dependencies
- Use `--processes=N` to match available CPU cores (4-8 is typical for CI)
- Parallel testing reduces a 10-minute suite to 2-3 minutes on 4 cores
- Avoid `RefreshDatabase` trait — `LazilyRefreshDatabase` is faster for parallel execution

---

### Pattern 357.5: Swoole/Octane Coroutines

**Category**: Long-Running Processes
**Description**: Laravel Octane with Swoole enables coroutine-based concurrency for high-performance applications.

```php
<?php

declare(strict_types=1);

// config/octane.php
return [
    'server' => env('OCTANE_SERVER', 'swoole'),

    'workers' => env('OCTANE_WORKERS', 4),
    'task_workers' => env('OCTANE_TASK_WORKERS', 2),
    'max_requests' => 1000,

    'listeners' => [
        // Reset state between requests
        \Laravel\Octane\Events\RequestReceived::class => [
            \Laravel\Octane\Listeners\EnsureUploadedFilesAreValid::class,
        ],
        \Laravel\Octane\Events\RequestTerminated::class => [
            // Custom cleanup listeners
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Laravel\Octane\Facades\Octane;

final class HighPerformanceService
{
    /**
     * Octane::concurrently() uses Swoole coroutines for true
     * concurrent execution within a single worker process.
     *
     * @return array{users: int, products: int, analytics: array}
     */
    public function getDashboard(): array
    {
        [$users, $products, $analytics] = Octane::concurrently([
            fn () => \App\Models\User::count(),
            fn () => \App\Models\Product::where('active', true)->count(),
            fn () => $this->fetchAnalytics(),
        ], timeoutMs: 5000);

        return [
            'users' => $users,
            'products' => $products,
            'analytics' => $analytics,
        ];
    }

    /**
     * Octane tables — shared memory between workers (Swoole Table).
     */
    public function cacheInSharedMemory(string $key, mixed $value): void
    {
        Octane::table('cache')->set($key, [
            'value' => serialize($value),
            'expires_at' => time() + 3600,
        ]);
    }

    private function fetchAnalytics(): array
    {
        return \Illuminate\Support\Facades\Http::timeout(3)
            ->get('https://analytics.example.com/api/summary')
            ->json();
    }
}
```

**Key Points**:
- Octane keeps the application in memory — boot once, serve many requests
- `Octane::concurrently()` uses Swoole coroutines (not process forking)
- Coroutines are lightweight — thousands can run in a single worker process
- Beware of mutable static state — it persists between requests in Octane
- Use `$this->app->make()` per-request, not cached singletons with request-specific data
- Swoole Tables provide shared memory across workers — useful for rate limiting, caching
- Set `max_requests` to prevent memory leaks from accumulating over time

---

### Pattern 357.6: Promise-Like Patterns

**Category**: Async Composition
**Description**: Compose async operations with promise-like patterns using Laravel's deferred values and pipeline composition.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Response;
use GuzzleHttp\Promise\PromiseInterface;

final class AsyncOrderProcessingService
{
    /**
     * Chain async HTTP operations with promise-like composition
     * using Guzzle's underlying promise support.
     */
    public function processOrderAsync(array $orderData): array
    {
        $promise = Http::async()
            ->post('https://payment.example.com/api/charge', [
                'amount' => $orderData['total_cents'],
                'currency' => $orderData['currency'],
            ])
            ->then(
                onFulfilled: function (Response $response) use ($orderData): array {
                    if ($response->successful()) {
                        return [
                            'payment_id' => $response->json('id'),
                            'status' => 'charged',
                            'order_id' => $orderData['order_id'],
                        ];
                    }

                    return [
                        'status' => 'payment_failed',
                        'error' => $response->json('error'),
                    ];
                },
                onRejected: function (\Throwable $exception) use ($orderData): array {
                    logger()->error('Payment request failed', [
                        'order_id' => $orderData['order_id'],
                        'error' => $exception->getMessage(),
                    ]);

                    return [
                        'status' => 'payment_error',
                        'error' => $exception->getMessage(),
                    ];
                },
            );

        return $promise->wait();
    }

    /**
     * Pipeline-based async composition — sequential async steps.
     *
     * @param array<string, mixed> $orderData
     */
    public function fulfillOrder(array $orderData): array
    {
        return app(\Illuminate\Pipeline\Pipeline::class)
            ->send($orderData)
            ->through([
                fn (array $data, \Closure $next) => $next([
                    ...$data,
                    'validated_at' => now()->toIso8601String(),
                ]),
                fn (array $data, \Closure $next) => $next([
                    ...$data,
                    'inventory_reserved' => $this->reserveInventory($data),
                ]),
                fn (array $data, \Closure $next) => $next([
                    ...$data,
                    'payment_confirmed' => $this->confirmPayment($data),
                ]),
            ])
            ->thenReturn();
    }

    private function reserveInventory(array $data): bool
    {
        return Http::post('https://inventory.example.com/api/reserve', [
            'items' => $data['items'] ?? [],
        ])->successful();
    }

    private function confirmPayment(array $data): bool
    {
        return Http::post('https://payment.example.com/api/confirm', [
            'payment_id' => $data['payment_id'] ?? '',
        ])->successful();
    }
}
```

**Key Points**:
- `Http::async()` returns a Guzzle promise — chain with `then()` and `wait()`
- Use `onFulfilled` for success, `onRejected` for exceptions — handle both paths
- Pipeline pattern composes sequential async-like steps with clean separation
- `$promise->wait()` blocks until the result is available — use sparingly in request cycle
- For true non-blocking, combine with Laravel queues for background processing
- Promises are most useful when orchestrating multiple dependent async calls

---

## Best Practices

- **Prefer Concurrency::run() for simple cases** — the L11 facade handles forking and serialization
- **Use Http::pool() for I/O-bound concurrency** — network requests are the ideal concurrent workload
- **Isolate concurrent closures** — no shared state, no DB connections, no file handles across forks
- **Set explicit timeouts** — every concurrent operation needs a timeout to prevent hangs
- **Handle partial failures** — when 3 of 4 concurrent tasks succeed, the result is still useful
- **Test concurrency with fakes** — `Http::fake()`, `Process::fake()` for deterministic tests
- **Use Octane only when needed** — the complexity of long-running processes is justified only for high-throughput
- **Log per-task errors** — when a fork fails silently, debugging becomes impossible without per-task logging

---

## Abnormal Case Patterns

1. **Shared state mutation across forks** — closures in `Concurrency::run()` share nothing. Modifying an outer variable in one closure does not affect others. Fix: return results from closures, merge in the parent process.

2. **Database connection exhaustion** — each forked process opens its own DB connection. Running 50 concurrent tasks creates 50 connections. Fix: limit concurrency to a reasonable pool size (4-8).

3. **Swoole memory leaks** — static properties and singletons persist between requests in Octane. Fix: use `RequestTerminated` listeners to reset state; set `max_requests` for worker recycling.

4. **Unserialized closure failure** — `Concurrency::run()` serializes closures across processes. Anonymous classes, resources, and PDO connections cannot be serialized. Fix: pass only scalar data into closures, resolve dependencies inside.

5. **Http::pool timeout cascade** — one slow endpoint blocks the entire pool past its timeout. Fix: set per-request `->timeout()` within the pool, handle timeouts as failed responses.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (357.1–357.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Async & Concurrency Specialist — Language | EPS v3.2*
