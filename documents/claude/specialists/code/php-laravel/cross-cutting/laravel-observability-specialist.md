# Laravel Observability Specialist — Cross-Cutting
# Laravel可観測性スペシャリスト — 横断的関心事
# Chuyen Gia Quan Sat Laravel — Cat Ngang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Observability
**Aspect**: Observability
**Category**: cross-cutting
**Purpose**: Knowledge provider for Laravel observability stack — Telescope debugging, Pulse dashboard, custom metrics, health checks, and application insights

---

## Metadata

```json
{
  "id": "laravel-observability-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Observability",
  "aspect": "Observability",
  "category": "cross-cutting",
  "subcategory": "php-laravel",
  "lines": 400,
  "token_cost": 2700,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Telescope — request/query/job/event debugging in dev/staging",
    "E2: Laravel Pulse — production dashboard for performance monitoring (L11)",
    "E3: Health checks — /up endpoint and custom health check registration"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 328.1–328.6 |
| **Directory Pattern** | `app/Providers/`, `config/telescope.php`, `config/pulse.php` |
| **Naming Convention** | `{Tool}ServiceProvider.php`, `{Metric}Recorder.php` |
| **Imports From** | Infrastructure (logging, queue, database) |
| **Imported By** | ALL (observability is passive — instruments existing layers) |
| **Cannot Import** | Domain (must not depend on business logic) |
| **Dependencies** | `laravel/telescope`, `laravel/pulse` |
| **When To Use** | Every Laravel project needing debugging, monitoring, or health visibility |
| **Source Skeleton** | `config/telescope.php`, `config/pulse.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel observability — Telescope debugging, Pulse monitoring, health checks, custom metrics |
| **Activation Trigger** | files: `config/telescope.php`, `config/pulse.php`; keywords: Telescope, Pulse, health, metrics, monitoring |

---

## Role

You are a **Laravel Observability Specialist**. Your responsibility is to provide best practices for Laravel 11 observability — Telescope for debugging, Pulse for production monitoring, custom metric recorders, health checks, and application insight patterns.

**Used by**: Any code agent working with Laravel monitoring, debugging, and health check infrastructure
**Not used by**: Non-Laravel stacks, projects with external-only APM (no Laravel integration)

---

## Patterns

### Pattern 328.1: Telescope Setup

**Category**: Debugging
**Description**: Laravel Telescope installation and configuration for development/staging environments.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

final class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        Telescope::night();

        $this->hideSensitiveRequestDetails();

        // Only record in non-production or when explicitly enabled
        $isEnabled = $this->app->environment('local', 'staging')
            || config('telescope.enabled', false);

        Telescope::filter(function (IncomingEntry $entry) use ($isEnabled): bool {
            if (! $isEnabled) {
                return false;
            }

            return $entry->isReportableException()
                || $entry->isFailedRequest()
                || $entry->isFailedJob()
                || $entry->isScheduledTask()
                || $entry->hasMonitoredTag();
        });
    }

    protected function hideSensitiveRequestDetails(): void
    {
        if ($this->app->environment('production')) {
            return;
        }

        Telescope::hideRequestParameters(['_token', 'password', 'password_confirmation']);
        Telescope::hideRequestHeaders(['cookie', 'x-csrf-token', 'authorization']);
    }

    protected function gate(): void
    {
        Gate::define('viewTelescope', function ($user): bool {
            return in_array($user->email, config('telescope.authorized_emails', []), strict: true);
        });
    }
}
```

**Key Points**:
- Install via `composer require laravel/telescope --dev` for dev-only usage
- Filter entries to reduce storage — log only exceptions, failures, and monitored tags
- Hide sensitive headers and parameters — tokens, passwords, cookies
- Gate access with `viewTelescope` — restrict to authorized users

---

### Pattern 328.2: Telescope Watchers

**Category**: Debugging
**Description**: Configure Telescope watchers to control what is recorded.

```php
<?php

declare(strict_types=1);

// config/telescope.php
return [
    'enabled' => env('TELESCOPE_ENABLED', false),

    'storage' => [
        'database' => [
            'connection' => env('DB_CONNECTION', 'mysql'),
            'chunk' => 1000,
        ],
    ],

    'watchers' => [
        \Laravel\Telescope\Watchers\QueryWatcher::class => [
            'enabled' => env('TELESCOPE_QUERY_WATCHER', true),
            'slow' => 100, // ms — only log queries slower than 100ms
        ],

        \Laravel\Telescope\Watchers\RequestWatcher::class => [
            'enabled' => env('TELESCOPE_REQUEST_WATCHER', true),
            'size_limit' => 64, // KB — truncate large request/response bodies
        ],

        \Laravel\Telescope\Watchers\JobWatcher::class => [
            'enabled' => env('TELESCOPE_JOB_WATCHER', true),
        ],

        \Laravel\Telescope\Watchers\ExceptionWatcher::class => [
            'enabled' => true, // Always watch exceptions
        ],

        \Laravel\Telescope\Watchers\CacheWatcher::class => [
            'enabled' => env('TELESCOPE_CACHE_WATCHER', false),
        ],

        \Laravel\Telescope\Watchers\MailWatcher::class => [
            'enabled' => env('TELESCOPE_MAIL_WATCHER', true),
        ],

        \Laravel\Telescope\Watchers\ModelWatcher::class => [
            'enabled' => env('TELESCOPE_MODEL_WATCHER', false),
            'events' => ['eloquent.*'],
            'hydrations' => true,
        ],
    ],
];
```

**Key Points**:
- Enable watchers selectively — each watcher adds overhead
- Set `slow` threshold on QueryWatcher to capture only slow queries
- Limit request body size to prevent storage bloat
- Use env vars for watcher toggles — different config per environment

---

### Pattern 328.3: Pulse Dashboard (L11)

**Category**: Production Monitoring
**Description**: Laravel Pulse for production-grade performance monitoring and dashboards.

```php
<?php

declare(strict_types=1);

// config/pulse.php
return [
    'enabled' => env('PULSE_ENABLED', true),

    'storage' => [
        'driver' => env('PULSE_STORAGE_DRIVER', 'database'),
        'database' => [
            'connection' => env('PULSE_DB_CONNECTION', null),
            'table' => 'pulse_entries',
        ],
        'trim' => [
            'lottery' => [1, 1000],
            'keep' => '7 days',
        ],
    ],

    'ingest' => [
        'driver' => env('PULSE_INGEST_DRIVER', 'storage'),
        'redis' => [
            'connection' => env('PULSE_REDIS_CONNECTION', 'default'),
        ],
    ],

    'recorders' => [
        \Laravel\Pulse\Recorders\Requests::class => [
            'sample_rate' => 1, // Record 100% of requests
            'ignore' => [
                '#^/pulse$#',
                '#^/telescope#',
                '#^/health#',
            ],
        ],

        \Laravel\Pulse\Recorders\SlowQueries::class => [
            'enabled' => true,
            'threshold' => 500, // ms
            'sample_rate' => 1,
        ],

        \Laravel\Pulse\Recorders\SlowJobs::class => [
            'enabled' => true,
            'threshold' => 10000, // ms
            'sample_rate' => 1,
        ],

        \Laravel\Pulse\Recorders\Exceptions::class => [
            'enabled' => true,
            'sample_rate' => 1,
            'ignore' => [],
        ],

        \Laravel\Pulse\Recorders\Servers::class => [
            'enabled' => true,
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

// routes/web.php — Pulse dashboard route
use Illuminate\Support\Facades\Route;
use Laravel\Pulse\Facades\Pulse;

Route::middleware(['auth', 'can:viewPulse'])->group(function (): void {
    Route::get('/pulse', function () {
        return Pulse::css() . view('vendor.pulse.dashboard');
    });
});
```

**Key Points**:
- Pulse is production-safe unlike Telescope — designed for minimal overhead
- Configure `sample_rate` to reduce load on high-traffic applications
- Use `trim` settings to auto-purge old entries and prevent table bloat
- `ignore` patterns exclude internal routes from monitoring

---

### Pattern 328.4: Custom Metrics

**Category**: Instrumentation
**Description**: Recording custom application metrics for Pulse or external systems.

```php
<?php

declare(strict_types=1);

namespace App\Metrics;

use Laravel\Pulse\Facades\Pulse;

final class OrderMetrics
{
    public static function recordOrderPlaced(float $amount, string $currency): void
    {
        Pulse::record(
            type: 'order_placed',
            key: $currency,
            value: (int) ($amount * 100), // Store as cents
        )->count();
    }

    public static function recordCheckoutDuration(float $durationMs): void
    {
        Pulse::record(
            type: 'checkout_duration',
            key: 'checkout',
            value: (int) $durationMs,
        )->avg();
    }

    public static function recordPaymentFailure(string $gateway, string $reason): void
    {
        Pulse::record(
            type: 'payment_failure',
            key: "{$gateway}:{$reason}",
        )->count();
    }
}
```

```php
<?php

declare(strict_types=1);

// Usage in a service
namespace App\Services;

use App\Metrics\OrderMetrics;

final class CheckoutService
{
    public function processCheckout(/* ... */): void
    {
        $startTime = microtime(true);

        // ... checkout logic ...

        $duration = (microtime(true) - $startTime) * 1000;
        OrderMetrics::recordCheckoutDuration(durationMs: $duration);
        OrderMetrics::recordOrderPlaced(amount: $total, currency: $currency);
    }
}
```

**Key Points**:
- Use `Pulse::record()` with `->count()`, `->avg()`, `->sum()`, `->max()`, `->min()`
- Wrap metrics in dedicated classes — keep business services clean
- Store monetary values as integers (cents) to avoid floating-point issues
- Key format: `{category}:{subcategory}` for filtering and grouping

---

### Pattern 328.5: Health Checks

**Category**: Reliability
**Description**: Application health checks for load balancers and orchestration platforms.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — Built-in health route
use Illuminate\Foundation\Application;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        health: '/up', // Built-in health endpoint
    )
    ->create();
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

final class HealthCheckController
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'redis' => $this->checkRedis(),
            'queue' => $this->checkQueue(),
        ];

        $healthy = ! in_array(false, $checks, strict: true);

        return response()->json(
            data: [
                'status' => $healthy ? 'healthy' : 'degraded',
                'checks' => $checks,
                'timestamp' => now()->toIso8601String(),
            ],
            status: $healthy ? 200 : 503,
        );
    }

    private function checkDatabase(): bool
    {
        try {
            DB::connection()->getPdo();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function checkCache(): bool
    {
        try {
            Cache::put('health_check', true, 10);
            return Cache::get('health_check') === true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function checkRedis(): bool
    {
        try {
            Redis::ping();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function checkQueue(): bool
    {
        try {
            Queue::size('default');
            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
```

**Key Points**:
- Laravel 11 provides built-in `/up` health route via `withRouting(health:)`
- Custom health checks should verify all external dependencies (DB, cache, queue)
- Return 503 when any critical check fails — load balancers remove unhealthy instances
- Keep health checks lightweight — no business logic, no heavy queries

---

### Pattern 328.6: Application Insights

**Category**: Analytics
**Description**: Collecting and exposing application-level insights for operational decisions.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

final class ApplicationInsightsService
{
    private const CACHE_TTL = 300; // 5 minutes

    /**
     * @return array<string, mixed>
     */
    public function getInsights(): array
    {
        return Cache::remember('app_insights', self::CACHE_TTL, function (): array {
            return [
                'queue' => $this->getQueueInsights(),
                'database' => $this->getDatabaseInsights(),
                'errors' => $this->getErrorInsights(),
            ];
        });
    }

    /**
     * @return array<string, int>
     */
    private function getQueueInsights(): array
    {
        return [
            'pending_jobs' => DB::table('jobs')->count(),
            'failed_jobs' => DB::table('failed_jobs')
                ->where('failed_at', '>=', now()->subHours(24))
                ->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function getDatabaseInsights(): array
    {
        return [
            'active_connections' => DB::select(
                "SHOW STATUS LIKE 'Threads_connected'"
            )[0]->Value ?? 0,
        ];
    }

    /**
     * @return array<string, int>
     */
    private function getErrorInsights(): array
    {
        $logPath = storage_path('logs/laravel.log');
        $size = file_exists($logPath) ? filesize($logPath) : 0;

        return [
            'log_size_mb' => (int) round($size / 1024 / 1024),
        ];
    }
}
```

**Key Points**:
- Cache insights to avoid repeated heavy queries on dashboard load
- Separate queue, database, and error metrics into distinct sections
- Use read-only queries — insights must never modify application state
- Expose via authenticated API endpoint for ops dashboards

---

## Best Practices

- **Telescope in dev/staging only** — never enable Telescope in production without strict filtering
- **Pulse for production** — designed for low-overhead production monitoring
- **Gate all dashboards** — require authentication and authorization for Telescope and Pulse
- **Trim old data** — configure retention policies to prevent table bloat
- **Sample in high traffic** — reduce sample_rate below 1.0 for high-throughput endpoints
- **Custom metrics per domain** — wrap Pulse::record() in domain-specific metric classes
- **Health checks are not monitoring** — health endpoints verify liveness, not performance
- **Hide sensitive data** — never expose credentials, tokens, or PII in observability tools

---

## Abnormal Case Patterns

1. **Telescope crashes production** — Telescope enabled in production without filtering, recording millions of entries. Fix: disable in production or use strict `Telescope::filter()`.

2. **Pulse table grows unbounded** — trim lottery never triggers or retention too long. Fix: set `trim.keep` to 7 days, run `php artisan pulse:clear` periodically.

3. **Health check false positive** — check passes but application is degraded (e.g., queue backed up). Fix: add queue depth threshold checks, not just connectivity.

4. **Custom metric key explosion** — using unique IDs as metric keys creates millions of entries. Fix: use category-level keys, aggregate unique values separately.

5. **Telescope storage conflict** — Telescope and application share same database, migrations conflict. Fix: use dedicated database connection for Telescope storage.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (328.1–328.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Observability Specialist — Cross-Cutting | EPS v3.2*
