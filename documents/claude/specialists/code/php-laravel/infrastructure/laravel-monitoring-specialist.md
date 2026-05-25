# Laravel Monitoring Specialist — Infrastructure
# Laravelモニタリングスペシャリスト — インフラストラクチャ
# Chuyen Gia Giam Sat Laravel — Ha Tang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Monitoring Stack
**Aspect**: Monitoring
**Category**: infrastructure
**Purpose**: Knowledge provider for Laravel application monitoring — health check endpoints, Prometheus metrics, application performance monitoring, uptime checks, and alert configuration

---

## Metadata

```json
{
  "id": "laravel-monitoring-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Monitoring Stack",
  "aspect": "Monitoring",
  "category": "infrastructure",
  "subcategory": "php-laravel",
  "lines": 440,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: spatie/laravel-health — health check framework with built-in checks",
    "E2: Prometheus exposition format — /metrics endpoint for scraping",
    "E3: Laravel 11 performance profiling — query, event, and request monitoring"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 351.1–351.6 |
| **Directory Pattern** | `config/health.php`, `app/Monitoring/` |
| **Naming Convention** | `{Name}Check.php`, `{Name}Metric.php` |
| **Imports From** | Application (services, repositories for health status) |
| **Imported By** | External monitoring systems (Prometheus, Grafana, PagerDuty) |
| **Cannot Import** | Domain logic, business rules |
| **Dependencies** | `spatie/laravel-health` |
| **When To Use** | Production Laravel applications requiring observability |
| **Source Skeleton** | `config/health.php`, `app/Monitoring/` |
| **Specialist Type** | code |
| **Purpose** | Laravel monitoring infrastructure — health checks, metrics, uptime, alerting |
| **Activation Trigger** | files: `config/health.php`, `app/Monitoring/*.php`; keywords: monitoring, health check, prometheus, metrics, uptime |

---

## Role

You are a **Laravel Monitoring Specialist**. Your responsibility is to provide best practices for Laravel 11 application monitoring — health check endpoints using spatie/laravel-health, Prometheus metrics exposition, application performance monitoring, uptime monitoring, and alert configuration for production systems.

**Used by**: Any code agent implementing monitoring and observability in Laravel applications
**Not used by**: Non-Laravel stacks, projects without production monitoring requirements

---

## Patterns

### Pattern 351.1: Health Check Endpoint

**Category**: Health Checks
**Description**: Comprehensive health check setup using spatie/laravel-health with multiple check types.

```php
<?php
// app/Providers/HealthServiceProvider.php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Spatie\Health\Checks\Checks\CacheCheck;
use Spatie\Health\Checks\Checks\DatabaseCheck;
use Spatie\Health\Checks\Checks\DebugModeCheck;
use Spatie\Health\Checks\Checks\EnvironmentCheck;
use Spatie\Health\Checks\Checks\OptimizedAppCheck;
use Spatie\Health\Checks\Checks\RedisCheck;
use Spatie\Health\Checks\Checks\UsedDiskSpaceCheck;
use Spatie\Health\Facades\Health;

final class HealthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Health::checks([
            DatabaseCheck::new()
                ->name('database')
                ->connectionName('mysql'),

            RedisCheck::new()
                ->name('redis'),

            CacheCheck::new()
                ->name('cache'),

            UsedDiskSpaceCheck::new()
                ->warnWhenUsedSpaceIsAbovePercentage(70)
                ->failWhenUsedSpaceIsAbovePercentage(90),

            EnvironmentCheck::new()
                ->expectEnvironment('production'),

            DebugModeCheck::new(),

            OptimizedAppCheck::new(),
        ]);
    }
}
```

```php
<?php
// routes/api.php — health check routes

use Spatie\Health\Http\Controllers\HealthCheckJsonResultsController;
use Spatie\Health\Http\Controllers\SimpleHealthCheckController;

// Simple liveness check (200/500)
Route::get('/health/live', SimpleHealthCheckController::class);

// Detailed readiness check (JSON response)
Route::get('/health/ready', HealthCheckJsonResultsController::class);
```

**Key Points**:
- Separate liveness (is the process running?) from readiness (can it serve traffic?)
- `SimpleHealthCheckController` returns 200/500 — suitable for load balancer checks
- `HealthCheckJsonResultsController` returns detailed JSON — suitable for monitoring dashboards
- Register health checks in a dedicated service provider for separation of concerns
- `OptimizedAppCheck` verifies config/route/view caches exist in production

---

### Pattern 351.2: Prometheus Metrics

**Category**: Metrics Exposition
**Description**: Expose application metrics in Prometheus format for scraping and Grafana visualization.

```php
<?php

declare(strict_types=1);

namespace App\Monitoring;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Cache;

final class PrometheusMetricsCollector
{
    /**
     * @return array<string, array{type: string, help: string, value: float|int}>
     */
    public function collect(): array
    {
        return [
            'app_http_requests_total' => [
                'type' => 'counter',
                'help' => 'Total HTTP requests processed',
                'value' => (int) Cache::get('metrics:http_requests_total', 0),
            ],
            'app_http_request_duration_seconds' => [
                'type' => 'histogram',
                'help' => 'HTTP request duration in seconds',
                'value' => (float) Cache::get('metrics:http_request_duration_avg', 0),
            ],
            'app_database_connections_active' => [
                'type' => 'gauge',
                'help' => 'Active database connections',
                'value' => $this->getActiveDbConnections(),
            ],
            'app_queue_jobs_pending' => [
                'type' => 'gauge',
                'help' => 'Pending jobs in queue',
                'value' => $this->getPendingJobCount(),
            ],
            'app_cache_hit_ratio' => [
                'type' => 'gauge',
                'help' => 'Cache hit ratio (0-1)',
                'value' => $this->getCacheHitRatio(),
            ],
        ];
    }

    private function getActiveDbConnections(): int
    {
        $result = DB::select("SHOW STATUS LIKE 'Threads_connected'");

        return (int) ($result[0]->Value ?? 0);
    }

    private function getPendingJobCount(): int
    {
        return DB::table('jobs')->count();
    }

    private function getCacheHitRatio(): float
    {
        $hits = (int) Cache::get('metrics:cache_hits', 0);
        $misses = (int) Cache::get('metrics:cache_misses', 0);
        $total = $hits + $misses;

        return $total > 0 ? round($hits / $total, 4) : 0.0;
    }
}
```

```php
<?php
// routes/api.php — Prometheus metrics endpoint

use App\Monitoring\PrometheusMetricsCollector;

Route::get('/metrics', function (PrometheusMetricsCollector $collector) {
    $metrics = $collector->collect();
    $output = '';

    foreach ($metrics as $name => $metric) {
        $output .= "# HELP {$name} {$metric['help']}\n";
        $output .= "# TYPE {$name} {$metric['type']}\n";
        $output .= "{$name} {$metric['value']}\n";
    }

    return response($output, 200, [
        'Content-Type' => 'text/plain; version=0.0.4; charset=utf-8',
    ]);
});
```

**Key Points**:
- Prometheus scrapes `/metrics` endpoint at configured intervals
- Use correct metric types: counter (monotonic), gauge (up/down), histogram (distribution)
- Content-Type must be `text/plain; version=0.0.4` for Prometheus compatibility
- Store counters in Redis/cache — not database (too slow for high-frequency increments)
- Protect `/metrics` endpoint with IP whitelist or authentication middleware

---

### Pattern 351.3: Application Metrics Middleware

**Category**: Request Tracking
**Description**: Middleware that captures request duration, status codes, and endpoint metrics.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

final class MetricsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        $response = $next($request);

        $duration = microtime(true) - $startTime;
        $statusCode = $response->getStatusCode();
        $route = $request->route()?->getName() ?? $request->path();

        $this->recordMetrics($route, $statusCode, $duration);

        return $response;
    }

    private function recordMetrics(
        string $route,
        int $statusCode,
        float $duration,
    ): void {
        $pipe = Cache::store('redis')->getStore()->connection();

        $pipe->pipeline(function ($pipe) use ($route, $statusCode, $duration): void {
            // Total request counter
            $pipe->incr('metrics:http_requests_total');

            // Per-route counter
            $pipe->incr("metrics:route:{$route}:total");

            // Status code counter
            $statusGroup = intdiv($statusCode, 100) . 'xx';
            $pipe->incr("metrics:status:{$statusGroup}:total");

            // Duration tracking (running average)
            $pipe->lpush("metrics:durations:{$route}", [(string) $duration]);
            $pipe->ltrim("metrics:durations:{$route}", 0, 999);

            // Slow request tracking (> 1 second)
            if ($duration > 1.0) {
                $pipe->incr('metrics:slow_requests_total');
            }
        });
    }
}
```

**Key Points**:
- Use Redis pipeline for batching metric writes — single round-trip for all increments
- Track per-route metrics for identifying slow endpoints
- Group status codes by class (2xx, 4xx, 5xx) for dashboard summaries
- Keep duration history bounded (ltrim to last 1000 entries) to prevent memory growth
- Register as global middleware — captures all HTTP requests

---

### Pattern 351.4: Uptime Monitoring

**Category**: Availability
**Description**: Uptime monitoring setup — external checks, internal heartbeats, and status pages.

```php
<?php

declare(strict_types=1);

namespace App\Monitoring;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class UptimeMonitor
{
    /** @var array<string, string> */
    private const ENDPOINTS = [
        'api' => '/api/health/live',
        'web' => '/',
        'queue' => '/api/health/queue',
    ];

    public function checkAll(): array
    {
        $results = [];

        foreach (self::ENDPOINTS as $name => $path) {
            $results[$name] = $this->check(
                url: config('app.url') . $path,
                name: $name,
            );
        }

        Cache::put('monitoring:uptime:last_check', $results, now()->addMinutes(5));

        return $results;
    }

    private function check(string $url, string $name): array
    {
        $startTime = microtime(true);

        try {
            $response = Http::timeout(5)
                ->connectTimeout(3)
                ->get($url);

            $duration = microtime(true) - $startTime;

            $result = [
                'name' => $name,
                'status' => $response->successful() ? 'up' : 'down',
                'response_time_ms' => round($duration * 1000, 2),
                'status_code' => $response->status(),
                'checked_at' => now()->toIso8601String(),
            ];
        } catch (\Throwable $e) {
            $result = [
                'name' => $name,
                'status' => 'down',
                'response_time_ms' => null,
                'error' => $e->getMessage(),
                'checked_at' => now()->toIso8601String(),
            ];

            Log::error("Uptime check failed: {$name}", [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
        }

        return $result;
    }
}
```

```php
<?php
// app/Console/Kernel.php or routes/console.php (Laravel 11)

use App\Monitoring\UptimeMonitor;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    $monitor = app(UptimeMonitor::class);
    $results = $monitor->checkAll();

    $downServices = array_filter($results, fn ($r) => $r['status'] === 'down');

    if (count($downServices) > 0) {
        // Trigger alert notification
        \Illuminate\Support\Facades\Notification::route('slack', config('monitoring.slack_webhook'))
            ->notify(new \App\Notifications\ServiceDownNotification($downServices));
    }
})->everyMinute()->name('uptime-check')->withoutOverlapping();
```

**Key Points**:
- Internal uptime checks complement external services (UptimeRobot, Pingdom)
- Set strict timeouts — 5s response, 3s connect — prevent check from hanging
- Cache results for status page display without re-running checks
- Schedule with `withoutOverlapping()` to prevent check pile-up if a check hangs
- Alert immediately on failure; use hysteresis (2+ consecutive failures) to avoid flapping

---

### Pattern 351.5: Performance Monitoring

**Category**: APM
**Description**: Application performance monitoring — query tracking, slow request detection, memory profiling.

```php
<?php

declare(strict_types=1);

namespace App\Monitoring;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class PerformanceMonitor
{
    private const SLOW_QUERY_THRESHOLD_MS = 100;
    private const MEMORY_WARNING_MB = 128;

    public function registerQueryListener(): void
    {
        DB::listen(function (QueryExecuted $query): void {
            // Track all query durations
            Cache::increment('metrics:queries_total');

            if ($query->time > self::SLOW_QUERY_THRESHOLD_MS) {
                Cache::increment('metrics:slow_queries_total');

                Log::channel('performance')->warning('Slow query detected', [
                    'sql' => $query->sql,
                    'bindings' => $query->bindings,
                    'time_ms' => $query->time,
                    'connection' => $query->connectionName,
                ]);
            }
        });
    }

    public function captureRequestMetrics(
        string $route,
        float $duration,
        int $statusCode,
    ): void {
        $memoryUsage = memory_get_peak_usage(true) / 1024 / 1024;

        $metrics = [
            'route' => $route,
            'duration_ms' => round($duration * 1000, 2),
            'memory_peak_mb' => round($memoryUsage, 2),
            'status_code' => $statusCode,
            'query_count' => (int) Cache::pull('metrics:request_query_count'),
            'timestamp' => now()->toIso8601String(),
        ];

        if ($memoryUsage > self::MEMORY_WARNING_MB) {
            Log::channel('performance')->warning('High memory usage', $metrics);
        }

        if ($duration > 2.0) {
            Log::channel('performance')->warning('Slow request', $metrics);
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Monitoring\PerformanceMonitor;
use Illuminate\Support\ServiceProvider;

final class MonitoringServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (config('monitoring.performance_enabled', false)) {
            $monitor = $this->app->make(PerformanceMonitor::class);
            $monitor->registerQueryListener();
        }
    }
}
```

**Key Points**:
- `DB::listen()` captures every query — log slow ones, count all
- Define thresholds via config — 100ms for slow queries, 128MB for memory warnings
- Track per-request query count to detect N+1 problems
- Use dedicated `performance` log channel — separate from application logs
- Enable via config flag — disable in testing, enable in staging and production

---

### Pattern 351.6: Alert Configuration

**Category**: Alerting
**Description**: Alert rules, notification channels, and escalation policies for monitoring events.

```php
<?php

declare(strict_types=1);

namespace App\Monitoring;

final readonly class AlertRule
{
    public function __construct(
        public string $name,
        public string $metric,
        public string $condition,
        public float $threshold,
        public int $consecutiveFailures,
        public string $severity,
        public array $channels,
    ) {}
}
```

```php
<?php
// config/monitoring.php

declare(strict_types=1);

return [
    'performance_enabled' => env('MONITORING_PERFORMANCE_ENABLED', false),
    'metrics_enabled' => env('MONITORING_METRICS_ENABLED', false),

    'slack_webhook' => env('MONITORING_SLACK_WEBHOOK'),

    'alerts' => [
        [
            'name' => 'high_error_rate',
            'metric' => 'status:5xx:total',
            'condition' => 'rate_per_minute',
            'threshold' => 10,
            'consecutive_failures' => 3,
            'severity' => 'critical',
            'channels' => ['slack', 'email'],
        ],
        [
            'name' => 'slow_response',
            'metric' => 'http_request_duration_avg',
            'condition' => 'above',
            'threshold' => 2.0,
            'consecutive_failures' => 5,
            'severity' => 'warning',
            'channels' => ['slack'],
        ],
        [
            'name' => 'queue_backlog',
            'metric' => 'queue_jobs_pending',
            'condition' => 'above',
            'threshold' => 1000,
            'consecutive_failures' => 2,
            'severity' => 'critical',
            'channels' => ['slack', 'email', 'pagerduty'],
        ],
        [
            'name' => 'disk_space',
            'metric' => 'disk_usage_percent',
            'condition' => 'above',
            'threshold' => 85,
            'consecutive_failures' => 1,
            'severity' => 'warning',
            'channels' => ['slack'],
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Monitoring;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use App\Notifications\AlertNotification;

final class AlertEvaluator
{
    public function evaluate(AlertRule $rule, float $currentValue): void
    {
        $cacheKey = "alert:failures:{$rule->name}";

        if ($this->isThresholdBreached($rule, $currentValue)) {
            $failures = (int) Cache::increment($cacheKey);

            if ($failures >= $rule->consecutiveFailures) {
                $this->fireAlert($rule, $currentValue, $failures);
                Cache::put($cacheKey, 0, now()->addHour());
            }
        } else {
            Cache::forget($cacheKey);
        }
    }

    private function isThresholdBreached(AlertRule $rule, float $currentValue): bool
    {
        return match ($rule->condition) {
            'above' => $currentValue > $rule->threshold,
            'below' => $currentValue < $rule->threshold,
            'rate_per_minute' => $currentValue > $rule->threshold,
            default => false,
        };
    }

    private function fireAlert(AlertRule $rule, float $value, int $failures): void
    {
        foreach ($rule->channels as $channel) {
            Notification::route($channel, config("monitoring.{$channel}_target"))
                ->notify(new AlertNotification(
                    ruleName: $rule->name,
                    severity: $rule->severity,
                    currentValue: $value,
                    threshold: $rule->threshold,
                    consecutiveFailures: $failures,
                ));
        }
    }
}
```

**Key Points**:
- Consecutive failure count prevents alert flapping from transient spikes
- Severity levels (warning, critical) route to different notification channels
- Reset failure counter after alert fires — prevent duplicate alerts within cooldown
- PagerDuty for critical alerts, Slack for warnings — escalation by severity
- Alert rules in config — adjustable per environment without code changes

---

## Best Practices

- **Separate liveness from readiness** — liveness checks process health, readiness checks dependency health
- **Protect metrics endpoints** — IP whitelist or auth middleware, never expose publicly
- **Use Redis for metric counters** — database writes are too slow for per-request metrics
- **Set meaningful thresholds** — baseline normal values before setting alert thresholds
- **Consecutive failure policy** — require 2-3 consecutive failures before alerting to avoid flapping
- **Log performance data separately** — dedicated performance channel with its own retention
- **Monitor the monitor** — ensure monitoring infrastructure itself has health checks
- **Dashboard per concern** — separate Grafana dashboards for HTTP, database, queue, system
- **Alert fatigue management** — fewer critical alerts, actionable notifications only

---

## Abnormal Case Patterns

1. **Health check itself causes load** — health endpoint queries database on every call. Fix: cache health results for 30-60 seconds; separate liveness (no deps) from readiness (with deps).

2. **Metric counter overflow** — Redis INCR on counters growing unbounded. Fix: reset counters periodically or use TTL-based keys (e.g., `metrics:2024-01-15:requests`).

3. **Alert storm on deploy** — deployment causes brief downtime triggering multiple alerts. Fix: implement maintenance window flag that suppresses alerts; use `consecutiveFailures` threshold.

4. **Prometheus scrape timeout** — `/metrics` endpoint takes too long to collect all metrics. Fix: pre-compute expensive metrics on schedule; cache metric values; simplify collection.

5. **False positive disk alerts** — temporary files cause disk spike then cleanup. Fix: exclude `/tmp` from disk checks; use higher consecutive failure count for disk alerts.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (351.1–351.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Monitoring Specialist — Infrastructure | EPS v3.2*
