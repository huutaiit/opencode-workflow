# Laravel Resilience Patterns Specialist — Patterns
# Laravelレジリエンスパターンスペシャリスト — パターン
# Chuyen Gia Mau Chiu Loi Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Resilience Patterns
**Aspect**: Resilience Patterns
**Category**: patterns
**Purpose**: Knowledge provider for resilience patterns in Laravel — circuit breaker, retry, timeout handling, bulkhead isolation, fallback, and rate limiter implementations

---

## Metadata

```json
{
  "id": "laravel-resilience-patterns-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Resilience Patterns",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Circuit breaker — prevent cascading failures by stopping calls to failing services",
    "E2: Laravel retry/backoff — built-in retry with exponential backoff in HTTP client",
    "E3: Laravel rate limiting — RateLimiter facade for throttling outbound and inbound calls"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 348.1–348.6 |
| **Directory Pattern** | `app/Resilience/`, `app/Services/` |
| **Naming Convention** | `CircuitBreaker.php`, `{Service}Client.php` |
| **Imports From** | Infrastructure (cache, HTTP client) |
| **Imported By** | Application (services, handlers) |
| **Cannot Import** | Presentation (controllers), Domain (models) |
| **Dependencies** | `illuminate/cache`, `illuminate/http`, `illuminate/support` |
| **When To Use** | External service calls, unreliable dependencies, distributed systems |
| **Source Skeleton** | `app/Resilience/CircuitBreaker.php` |
| **Specialist Type** | code |
| **Purpose** | Resilience patterns for Laravel — circuit breaker, retry, timeout, bulkhead, fallback, rate limiter |
| **Activation Trigger** | files: `app/Resilience/*.php`; keywords: circuit breaker, retry, timeout, fallback, bulkhead, resilience |

---

## Role

You are a **Laravel Resilience Patterns Specialist**. Your responsibility is to provide best practices for implementing resilience patterns in PHP/Laravel — manual circuit breaker implementation, retry with exponential backoff, timeout handling, bulkhead isolation via queues, fallback strategies, and rate limiting for outbound calls. Since PHP lacks a Resilience4j equivalent, these are manual implementations using Laravel primitives.

**Used by**: Any code agent integrating with external APIs or unreliable dependencies in Laravel
**Not used by**: Applications with no external dependencies, non-Laravel stacks

---

## Patterns

### Pattern 348.1: Circuit Breaker

**Category**: Fault Tolerance
**Description**: Circuit breaker implementation using Laravel Cache to prevent cascading failures from unreliable external services.

```php
<?php

declare(strict_types=1);

namespace App\Resilience;

use Illuminate\Cache\CacheManager;

final class CircuitBreaker
{
    private const STATE_CLOSED = 'closed';
    private const STATE_OPEN = 'open';
    private const STATE_HALF_OPEN = 'half_open';

    public function __construct(
        private readonly CacheManager $cache,
        private readonly string $service,
        private readonly int $failureThreshold = 5,
        private readonly int $recoveryTimeout = 60, // seconds
        private readonly int $successThreshold = 2, // half-open successes to close
    ) {}

    /**
     * @template T
     * @param callable(): T $action
     * @param callable(): T $fallback
     * @return T
     */
    public function call(callable $action, callable $fallback): mixed
    {
        $state = $this->getState();

        if ($state === self::STATE_OPEN) {
            if ($this->isRecoveryTimeExpired()) {
                $this->setState(self::STATE_HALF_OPEN);
                return $this->tryAction($action, $fallback);
            }
            return $fallback();
        }

        return $this->tryAction($action, $fallback);
    }

    private function tryAction(callable $action, callable $fallback): mixed
    {
        try {
            $result = $action();
            $this->recordSuccess();
            return $result;
        } catch (\Throwable $e) {
            $this->recordFailure();

            if ($this->getFailureCount() >= $this->failureThreshold) {
                $this->trip();
            }

            return $fallback();
        }
    }

    public function isAvailable(): bool
    {
        return $this->getState() !== self::STATE_OPEN;
    }

    private function trip(): void
    {
        $this->setState(self::STATE_OPEN);
        $this->cache->put($this->key('tripped_at'), time(), $this->recoveryTimeout * 2);
    }

    private function recordFailure(): void
    {
        $count = $this->getFailureCount() + 1;
        $this->cache->put($this->key('failures'), $count, $this->recoveryTimeout * 2);
    }

    private function recordSuccess(): void
    {
        $state = $this->getState();

        if ($state === self::STATE_HALF_OPEN) {
            $successes = (int) $this->cache->get($this->key('successes'), 0) + 1;
            $this->cache->put($this->key('successes'), $successes, $this->recoveryTimeout);

            if ($successes >= $this->successThreshold) {
                $this->reset();
            }
        } elseif ($state === self::STATE_CLOSED) {
            $this->cache->forget($this->key('failures'));
        }
    }

    private function reset(): void
    {
        $this->cache->forget($this->key('state'));
        $this->cache->forget($this->key('failures'));
        $this->cache->forget($this->key('successes'));
        $this->cache->forget($this->key('tripped_at'));
    }

    private function getState(): string
    {
        return $this->cache->get($this->key('state'), self::STATE_CLOSED);
    }

    private function setState(string $state): void
    {
        $this->cache->put($this->key('state'), $state, $this->recoveryTimeout * 2);
    }

    private function getFailureCount(): int
    {
        return (int) $this->cache->get($this->key('failures'), 0);
    }

    private function isRecoveryTimeExpired(): bool
    {
        $trippedAt = $this->cache->get($this->key('tripped_at'));
        return $trippedAt === null || (time() - $trippedAt) >= $this->recoveryTimeout;
    }

    private function key(string $suffix): string
    {
        return "circuit_breaker:{$this->service}:{$suffix}";
    }
}
```

**Key Points**:
- Three states: closed (normal), open (failing, use fallback), half-open (testing recovery)
- Uses Laravel Cache — works with Redis, Memcached, or any cache driver
- Configurable thresholds — failure count, recovery timeout, success count for reset
- Always provide a fallback — circuit breaker should never throw to caller

---

### Pattern 348.2: Retry Pattern

**Category**: Transient Fault Handling
**Description**: Retry with exponential backoff for transient failures using Laravel's HTTP client and manual implementation.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

final class PaymentGatewayClient
{
    public function charge(int $amount, string $token): array
    {
        $response = Http::baseUrl(config('services.payment.url'))
            ->timeout(seconds: 10)
            ->retry(
                times: 3,
                sleepMilliseconds: fn (int $attempt) => $attempt * 500, // 500ms, 1000ms, 1500ms
                when: fn (\Exception $e) => $e->getCode() >= 500, // Only retry server errors
                throw: true,
            )
            ->withToken(config('services.payment.token'))
            ->post('/charges', [
                'amount' => $amount,
                'token' => $token,
            ]);

        return $response->json();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Resilience;

final class RetryHandler
{
    /**
     * @template T
     * @param callable(): T $action
     * @param int $maxAttempts
     * @param int $baseDelayMs
     * @param callable(\Throwable): bool $retryIf
     * @return T
     * @throws \Throwable
     */
    public static function execute(
        callable $action,
        int $maxAttempts = 3,
        int $baseDelayMs = 200,
        ?callable $retryIf = null,
    ): mixed {
        $attempt = 0;
        $lastException = null;

        while ($attempt < $maxAttempts) {
            try {
                return $action();
            } catch (\Throwable $e) {
                $lastException = $e;
                $attempt++;

                if ($attempt >= $maxAttempts) {
                    break;
                }

                if ($retryIf !== null && !$retryIf($e)) {
                    break; // Non-retryable error
                }

                // Exponential backoff with jitter
                $delayMs = (int) ($baseDelayMs * (2 ** ($attempt - 1)) + random_int(0, 100));
                usleep($delayMs * 1000);
            }
        }

        throw $lastException;
    }
}

// Usage
$result = RetryHandler::execute(
    action: fn () => $this->externalApi->fetchData($id),
    maxAttempts: 3,
    baseDelayMs: 300,
    retryIf: fn (\Throwable $e) => $e instanceof \Illuminate\Http\Client\ConnectionException,
);
```

**Key Points**:
- Laravel HTTP client has built-in `retry()` — use it for HTTP calls
- `when` callback: only retry on retryable errors (5xx, connection timeout — not 4xx)
- Exponential backoff with jitter prevents thundering herd on recovery
- Manual `RetryHandler` for non-HTTP operations (database, queue, file system)

---

### Pattern 348.3: Timeout Handling

**Category**: Latency Control
**Description**: Timeout enforcement for external calls to prevent indefinite blocking.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;

final class InventoryServiceClient
{
    public function checkStock(int $productId): ?array
    {
        try {
            $response = Http::baseUrl(config('services.inventory.url'))
                ->timeout(seconds: 5)        // Total request timeout
                ->connectTimeout(seconds: 2)  // Connection timeout
                ->get("/products/{$productId}/stock");

            return $response->successful() ? $response->json() : null;
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            report($e); // Log but don't crash
            return null;
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Resilience;

final class TimeoutWrapper
{
    /**
     * @template T
     * @param callable(): T $action
     * @param int $timeoutSeconds
     * @param T $default
     * @return T
     */
    public static function execute(
        callable $action,
        int $timeoutSeconds,
        mixed $default = null,
    ): mixed {
        // pcntl-based timeout (CLI only)
        if (function_exists('pcntl_alarm') && php_sapi_name() === 'cli') {
            return self::executeWithPcntl($action, $timeoutSeconds, $default);
        }

        // For web requests, rely on HTTP client timeouts
        // PHP does not have native async timeout for arbitrary code
        try {
            return $action();
        } catch (\Throwable $e) {
            report($e);
            return $default;
        }
    }

    private static function executeWithPcntl(
        callable $action,
        int $timeoutSeconds,
        mixed $default,
    ): mixed {
        $timedOut = false;
        pcntl_signal(SIGALRM, function () use (&$timedOut): void {
            $timedOut = true;
        });
        pcntl_alarm($timeoutSeconds);

        try {
            $result = $action();
            pcntl_alarm(0); // Cancel alarm
            return $timedOut ? $default : $result;
        } catch (\Throwable $e) {
            pcntl_alarm(0);
            return $default;
        }
    }
}
```

**Key Points**:
- HTTP client: set both `timeout()` (total) and `connectTimeout()` (connection phase)
- PHP lacks native async timeout for arbitrary code — use `pcntl_alarm` for CLI only
- Always set timeouts on external calls — default is infinite, which blocks workers
- Return `null` or default value on timeout — let caller decide how to handle

---

### Pattern 348.4: Bulkhead Isolation

**Category**: Resource Isolation
**Description**: Bulkhead pattern using separate queue connections and worker pools to isolate failure domains.

```php
// config/queue.php — separate connections per failure domain
'connections' => [
    'payment' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => 'payment',
        'retry_after' => 90,
    ],
    'notification' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => 'notification',
        'retry_after' => 60,
    ],
    'reporting' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => 'reporting',
        'retry_after' => 300,
    ],
],
```

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

final class ProcessPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $maxExceptions = 2;
    public int $timeout = 30;

    public function __construct(
        private readonly int $orderId,
        private readonly int $amount,
    ) {
        $this->onConnection('payment'); // Isolated connection
        $this->onQueue('payment');
    }

    public function handle(): void
    {
        // Payment processing — isolated from other queues
    }

    public function backoff(): array
    {
        return [10, 30, 60]; // 10s, 30s, 60s between retries
    }
}
```

```php
// Supervisor config — separate worker pools per bulkhead
// /etc/supervisor/conf.d/laravel-workers.conf
//
// [program:payment-worker]
// command=php artisan queue:work payment --queue=payment --tries=3 --timeout=30
// numprocs=4
//
// [program:notification-worker]
// command=php artisan queue:work notification --queue=notification --tries=2 --timeout=15
// numprocs=2
//
// [program:reporting-worker]
// command=php artisan queue:work reporting --queue=reporting --tries=1 --timeout=300
// numprocs=1
```

**Key Points**:
- Separate queue connections isolate failure domains — payment failure doesn't block notifications
- Separate Supervisor worker pools — each domain has its own process count and timeout
- `$maxExceptions` limits total exceptions before job is discarded
- `backoff()` returns progressive delays between retries

---

### Pattern 348.5: Fallback Pattern

**Category**: Graceful Degradation
**Description**: Fallback strategies for graceful degradation when primary service fails.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class ProductPricingService
{
    public function __construct(
        private readonly ExternalPricingApi $primaryApi,
        private readonly ExternalPricingApi $secondaryApi,
    ) {}

    public function getPrice(int $productId): float
    {
        // Strategy 1: Primary with fallback to secondary
        return $this->tryPrimary($productId)
            ?? $this->trySecondary($productId)
            ?? $this->tryCachedPrice($productId)
            ?? $this->getDefaultPrice($productId);
    }

    private function tryPrimary(int $productId): ?float
    {
        try {
            $price = $this->primaryApi->fetchPrice($productId);
            Cache::put("price:{$productId}", $price, 3600);
            return $price;
        } catch (\Throwable $e) {
            Log::warning('Primary pricing API failed', [
                'product_id' => $productId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function trySecondary(int $productId): ?float
    {
        try {
            return $this->secondaryApi->fetchPrice($productId);
        } catch (\Throwable $e) {
            Log::warning('Secondary pricing API failed', [
                'product_id' => $productId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function tryCachedPrice(int $productId): ?float
    {
        $cached = Cache::get("price:{$productId}");

        if ($cached !== null) {
            Log::info('Using cached price as fallback', ['product_id' => $productId]);
        }

        return $cached;
    }

    private function getDefaultPrice(int $productId): float
    {
        Log::error('All pricing sources failed, using default', [
            'product_id' => $productId,
        ]);

        return \App\Models\Product::findOrFail($productId)->base_price;
    }
}
```

**Key Points**:
- Fallback chain: primary -> secondary -> cache -> database default
- Cache successful responses — serves as fallback data during outages
- Log each fallback level — monitoring reveals degradation patterns
- Never throw to the caller — always return a value, even if degraded

---

### Pattern 348.6: Rate Limiter

**Category**: Throttling
**Description**: Rate limiting for outbound API calls to respect external service quotas.

```php
<?php

declare(strict_types=1);

namespace App\Resilience;

use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Facades\Log;

final class OutboundRateLimiter
{
    public function __construct(
        private readonly RateLimiter $limiter,
    ) {}

    /**
     * @template T
     * @param string $service
     * @param callable(): T $action
     * @param int $maxAttempts Per minute
     * @return T
     * @throws RateLimitExceededException
     */
    public function execute(
        string $service,
        callable $action,
        int $maxAttempts = 60,
    ): mixed {
        $key = "outbound:{$service}";

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = $this->limiter->availableIn($key);

            Log::warning("Rate limit reached for {$service}", [
                'retry_after' => $retryAfter,
            ]);

            throw new RateLimitExceededException(
                "Rate limit exceeded for {$service}. Retry after {$retryAfter}s",
                retryAfter: $retryAfter,
            );
        }

        $this->limiter->hit($key, decaySeconds: 60);

        return $action();
    }
}
```

```php
// Service provider registration
final class ResilienceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CircuitBreaker::class, function ($app) {
            return new CircuitBreaker(
                cache: $app->make(CacheManager::class),
                service: 'payment-gateway',
                failureThreshold: 5,
                recoveryTimeout: 60,
            );
        });

        $this->app->singleton(OutboundRateLimiter::class);
    }
}
```

```php
// Combined usage: circuit breaker + rate limiter + retry
final class ResilientApiClient
{
    public function __construct(
        private readonly CircuitBreaker $circuitBreaker,
        private readonly OutboundRateLimiter $rateLimiter,
    ) {}

    public function fetchData(int $id): array
    {
        return $this->circuitBreaker->call(
            action: fn () => $this->rateLimiter->execute(
                service: 'external-api',
                action: fn () => Http::timeout(5)
                    ->retry(2, 500)
                    ->get("https://api.example.com/data/{$id}")
                    ->throw()
                    ->json(),
                maxAttempts: 100, // 100 requests per minute
            ),
            fallback: fn () => Cache::get("data:{$id}", []),
        );
    }
}
```

**Key Points**:
- Use Laravel's `RateLimiter` facade for outbound call throttling
- `tooManyAttempts()` checks before calling; `hit()` records the call
- Combine patterns: rate limiter inside circuit breaker inside retry
- `availableIn()` returns seconds until rate limit resets — pass to client as `Retry-After`

---

## Best Practices

- **Always set timeouts** — never make external calls without timeout configuration
- **Combine patterns** — circuit breaker wraps retry wraps timeout for defense-in-depth
- **Use cache for state** — circuit breaker state in Redis survives process restarts
- **Log every degradation** — monitoring fallback usage reveals infrastructure health
- **Isolate failure domains** — separate queues and workers per critical service
- **Exponential backoff with jitter** — prevent thundering herd on service recovery
- **Test failure scenarios** — simulate timeouts, 5xx responses, rate limits in tests
- **Provide fallbacks** — every external call should have a graceful degradation path

---

## Abnormal Case Patterns

1. **No timeout on HTTP call** — external API hangs, blocking PHP worker indefinitely. Fix: always set `timeout()` and `connectTimeout()` on HTTP client.

2. **Retry on 4xx errors** — retrying client errors (400, 422) that will never succeed. Fix: use `when` callback to retry only 5xx and connection errors.

3. **Circuit breaker state lost** — using array cache driver in production. Fix: use Redis or Memcached for circuit breaker state persistence.

4. **Thundering herd on recovery** — all retries fire simultaneously when service recovers. Fix: add random jitter to backoff delays.

5. **Missing fallback** — circuit breaker opens but no fallback provided, throwing exception. Fix: always provide a fallback callable that returns degraded but valid data.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (348.1–348.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Resilience Patterns Specialist — Patterns | EPS v3.2*
