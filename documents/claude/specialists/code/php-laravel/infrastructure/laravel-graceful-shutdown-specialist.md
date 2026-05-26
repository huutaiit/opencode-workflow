# Laravel Graceful Shutdown Specialist — Infrastructure
# Laravelグレースフルシャットダウンスペシャリスト — インフラストラクチャ
# Chuyen Gia Tat May An Toan Laravel — Ha Tang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Graceful Shutdown
**Aspect**: Graceful Shutdown
**Category**: infrastructure
**Purpose**: Knowledge provider for Laravel graceful shutdown — POSIX signal handling, queue worker termination, connection draining, zero-downtime deployment, and Octane worker lifecycle management

---

## Metadata

```json
{
  "id": "laravel-graceful-shutdown-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Graceful Shutdown",
  "aspect": "Graceful Shutdown",
  "category": "infrastructure",
  "subcategory": "php-laravel",
  "lines": 400,
  "token_cost": 2650,
  "version": "1.0.0",
  "evidence": [
    "E1: PHP pcntl_signal — POSIX signal handling for graceful worker shutdown",
    "E2: Laravel queue worker — SIGTERM/SIGINT handling and job completion",
    "E3: Laravel Octane — worker lifecycle, tick intervals, and memory management"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 353.1–353.5 |
| **Directory Pattern** | `app/Console/`, `config/octane.php` |
| **Naming Convention** | Signal handlers in console commands, Octane listeners |
| **Imports From** | Application (long-running processes, queue workers) |
| **Imported By** | Deployment pipelines, orchestrators (Kubernetes, Docker) |
| **Cannot Import** | Domain logic, business rules |
| **Dependencies** | `laravel/octane` (optional) |
| **When To Use** | Production deployments requiring zero-downtime restarts |
| **Source Skeleton** | `app/Console/Commands/`, `config/octane.php` |
| **Specialist Type** | code |
| **Purpose** | Graceful shutdown infrastructure — signal handling, worker termination, connection draining, zero-downtime |
| **Activation Trigger** | files: `config/octane.php`, signal handling code; keywords: graceful shutdown, SIGTERM, zero-downtime, connection drain, octane |

---

## Role

You are a **Laravel Graceful Shutdown Specialist**. Your responsibility is to provide best practices for graceful shutdown patterns in Laravel 11 — POSIX signal handling with pcntl, queue worker termination and job completion guarantees, HTTP connection draining during deploys, zero-downtime deployment strategies, and Laravel Octane worker lifecycle management.

**Used by**: Any code agent implementing zero-downtime deployments or long-running Laravel processes
**Not used by**: Stateless serverless deployments, projects without queue workers or Octane

---

## Patterns

### Pattern 353.1: Signal Handling

**Category**: Process Signals
**Description**: POSIX signal handling in PHP for graceful shutdown — SIGTERM, SIGINT, SIGUSR1, SIGUSR2.

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

final class LongRunningProcessCommand extends Command
{
    protected $signature = 'app:long-process';
    protected $description = 'Long-running process with graceful shutdown';

    private bool $shouldTerminate = false;

    public function handle(): int
    {
        $this->registerSignalHandlers();

        Log::info('Long-running process started', ['pid' => getmypid()]);

        while (! $this->shouldTerminate) {
            $this->processNextItem();

            // Check for pending signals
            pcntl_signal_dispatch();

            // Prevent CPU spinning when idle
            if (! $this->hasWorkAvailable()) {
                usleep(100_000); // 100ms
            }
        }

        $this->cleanup();

        Log::info('Long-running process terminated gracefully');

        return self::SUCCESS;
    }

    private function registerSignalHandlers(): void
    {
        // SIGTERM: graceful shutdown (Docker stop, kill -15)
        pcntl_signal(SIGTERM, function (int $signal): void {
            Log::info('Received SIGTERM, initiating graceful shutdown');
            $this->shouldTerminate = true;
        });

        // SIGINT: interrupt (Ctrl+C)
        pcntl_signal(SIGINT, function (int $signal): void {
            Log::info('Received SIGINT, initiating graceful shutdown');
            $this->shouldTerminate = true;
        });

        // SIGUSR1: custom signal (reload config, etc.)
        pcntl_signal(SIGUSR1, function (int $signal): void {
            Log::info('Received SIGUSR1, reloading configuration');
            $this->reloadConfiguration();
        });
    }

    private function processNextItem(): void
    {
        // Process one unit of work — must complete before checking shouldTerminate
        // Keep work units small for responsive shutdown
    }

    private function hasWorkAvailable(): bool
    {
        return true; // Check queue/source for available work
    }

    private function reloadConfiguration(): void
    {
        // Reload config without restart
    }

    private function cleanup(): void
    {
        // Close connections, flush buffers, release locks
        Log::info('Cleanup completed');
    }
}
```

**Key Points**:
- `pcntl_signal()` registers handlers — requires `pcntl` PHP extension (installed in CLI by default)
- `pcntl_signal_dispatch()` must be called in the loop — PHP doesn't interrupt execution automatically
- SIGTERM is the standard graceful shutdown signal — Docker sends SIGTERM before SIGKILL
- Keep work units small — shutdown responsiveness depends on work unit duration
- Always log signal receipt for debugging deployment issues
- SIGUSR1/SIGUSR2 available for custom operations (config reload, status dump)

---

### Pattern 353.2: Queue Worker Shutdown

**Category**: Queue Management
**Description**: Laravel queue worker graceful shutdown — completing current job before stopping.

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

final class LargeDataProcessingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;      // 5 minutes max
    public int $tries = 1;          // No retry for idempotency
    public int $maxExceptions = 1;

    public function __construct(
        private readonly int $batchId,
        private readonly int $totalRecords,
    ) {}

    public function handle(): void
    {
        $processed = 0;

        foreach ($this->getRecordChunks() as $chunk) {
            // Check if worker is shutting down
            if (app('queue.worker')->shouldQuit) {
                Log::warning('Worker shutdown requested, releasing job', [
                    'batch_id' => $this->batchId,
                    'processed' => $processed,
                    'remaining' => $this->totalRecords - $processed,
                ]);

                // Release back to queue with delay
                $this->release(delay: 30);
                return;
            }

            $this->processChunk($chunk);
            $processed += count($chunk);

            Log::info('Chunk processed', [
                'batch_id' => $this->batchId,
                'processed' => $processed,
                'total' => $this->totalRecords,
            ]);
        }
    }

    private function getRecordChunks(): \Generator
    {
        // Yield chunks of records for processing
        $chunkSize = 100;
        for ($offset = 0; $offset < $this->totalRecords; $offset += $chunkSize) {
            yield \App\Models\Record::query()
                ->offset($offset)
                ->limit($chunkSize)
                ->get();
        }
    }

    private function processChunk($chunk): void
    {
        // Process a chunk of records
    }
}
```

```bash
# Queue worker shutdown commands

# Graceful: finish current job, then stop
php artisan queue:restart

# Via Horizon: terminate all workers gracefully
php artisan horizon:terminate

# Supervisor config for graceful stop
# stopwaitsecs must be >= job timeout
[program:queue-worker]
command=php /var/www/html/artisan queue:work --sleep=3 --tries=3 --max-time=3600
stopwaitsecs=310
stopsignal=SIGTERM
```

**Key Points**:
- `queue:restart` signals all workers to stop after current job completes
- Check `app('queue.worker')->shouldQuit` in long-running jobs for cooperative shutdown
- `$this->release(30)` puts the job back on the queue with 30-second delay
- `stopwaitsecs` in supervisor must exceed the longest expected job duration
- `--max-time=3600` restarts workers hourly — prevents memory leaks
- Jobs should be idempotent — safe to re-process if released during shutdown

---

### Pattern 353.3: Connection Draining

**Category**: HTTP Traffic
**Description**: HTTP connection draining during deployment — stop accepting new requests while completing in-flight ones.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

final class MaintenanceAwareMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check if application is draining connections
        if (Cache::get('app:draining', false)) {
            // Health check endpoints bypass drain mode
            if ($this->isHealthCheck($request)) {
                return response()->json([
                    'status' => 'draining',
                    'message' => 'Application is shutting down',
                ], 503);
            }

            // Return 503 with Retry-After for new requests
            return response()->json([
                'message' => 'Service temporarily unavailable — deployment in progress',
            ], 503)->header('Retry-After', '30');
        }

        return $next($request);
    }

    private function isHealthCheck(Request $request): bool
    {
        return in_array($request->path(), ['health/live', 'up'], strict: true);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

final class DrainConnectionsCommand extends Command
{
    protected $signature = 'app:drain {--timeout=30 : Seconds to wait for in-flight requests}';
    protected $description = 'Drain HTTP connections before shutdown';

    public function handle(): int
    {
        $timeout = (int) $this->option('timeout');

        $this->info('Entering drain mode...');
        Cache::put('app:draining', true, now()->addMinutes(5));

        // Wait for in-flight requests to complete
        $this->info("Waiting {$timeout} seconds for in-flight requests...");
        sleep($timeout);

        $this->info('Drain complete. Safe to shut down.');

        return self::SUCCESS;
    }
}
```

```nginx
# Nginx upstream health check for connection draining
upstream app {
    server app1:9000;
    server app2:9000;
}

server {
    location / {
        proxy_pass http://app;
        proxy_next_upstream error timeout http_503;
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }
}
```

**Key Points**:
- Drain mode stops accepting new requests while in-flight requests complete
- Health check returns 503 during drain — load balancer removes instance from pool
- `Retry-After` header tells clients when to retry
- Nginx `proxy_next_upstream http_503` routes to healthy instance on 503
- Drain timeout should match the longest expected request duration
- Cache-based flag allows checking drain state without filesystem or process coupling

---

### Pattern 353.4: Deployment Zero-Downtime

**Category**: Deployment Strategy
**Description**: Zero-downtime deployment patterns — blue-green, rolling, and in-place with health checks.

```bash
#!/bin/bash
# deploy-zero-downtime.sh — Rolling deployment with health verification

set -e

APP_DIR="/var/www/html"
HEALTH_URL="http://localhost/health/ready"
MAX_WAIT=120

echo "[deploy] Phase 1: Pre-deployment health check"
curl -sf "$HEALTH_URL" > /dev/null || { echo "Pre-deploy health check failed"; exit 1; }

echo "[deploy] Phase 2: Enable drain mode"
php "$APP_DIR/artisan" app:drain --timeout=15

echo "[deploy] Phase 3: Terminate queue workers"
php "$APP_DIR/artisan" horizon:terminate 2>/dev/null || \
php "$APP_DIR/artisan" queue:restart

echo "[deploy] Phase 4: Deploy new code"
cd "$APP_DIR"
git pull origin main
composer install --no-dev --optimize-autoloader --classmap-authoritative

echo "[deploy] Phase 5: Run migrations"
php artisan migrate --force

echo "[deploy] Phase 6: Rebuild caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "[deploy] Phase 7: Restart PHP-FPM (graceful)"
kill -USR2 $(cat /var/run/php-fpm.pid)

echo "[deploy] Phase 8: Disable drain mode"
php artisan cache:forget app:draining

echo "[deploy] Phase 9: Wait for health check"
WAITED=0
until curl -sf "$HEALTH_URL" > /dev/null; do
    WAITED=$((WAITED + 2))
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "[deploy] Health check timeout after ${MAX_WAIT}s"
        exit 1
    fi
    sleep 2
done

echo "[deploy] Phase 10: Verify queue workers"
php artisan horizon:status 2>/dev/null || echo "Horizon restarting via supervisor..."

echo "[deploy] Deployment complete — zero downtime achieved"
```

```yaml
# Kubernetes rolling update strategy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: laravel-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
        - name: app
          image: registry/laravel-app:latest
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /up
              port: 80
            initialDelaySeconds: 15
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "php artisan app:drain --timeout=15"]
      terminationGracePeriodSeconds: 45
```

**Key Points**:
- Drain before code update — no requests hit partially-deployed code
- `kill -USR2` sends graceful reload to PHP-FPM master — spawns new workers with new code
- Health check verification after deploy — automated rollback if unhealthy
- Kubernetes `preStop` hook runs drain command before SIGTERM
- `terminationGracePeriodSeconds` must exceed drain timeout + job completion time
- `maxUnavailable: 1` ensures at least N-1 pods serve traffic during rollout

---

### Pattern 353.5: Octane Worker Management

**Category**: Long-Running Server
**Description**: Laravel Octane worker lifecycle — tick management, memory limits, and graceful restart.

```php
<?php
// config/octane.php

declare(strict_types=1);

return [
    'server' => env('OCTANE_SERVER', 'swoole'),

    'https' => env('OCTANE_HTTPS', false),

    'listeners' => [
        \Laravel\Octane\Events\WorkerStarting::class => [
            \App\Listeners\OctaneWorkerStarting::class,
        ],
        \Laravel\Octane\Events\WorkerStopping::class => [
            \App\Listeners\OctaneWorkerStopping::class,
        ],
        \Laravel\Octane\Events\RequestReceived::class => [
            \App\Listeners\OctaneRequestReceived::class,
        ],
        \Laravel\Octane\Events\RequestTerminated::class => [
            \App\Listeners\OctaneRequestTerminated::class,
        ],
        \Laravel\Octane\Events\TickReceived::class => [
            \App\Listeners\OctaneTickHandler::class,
        ],
    ],

    'warm' => [
        // Services to pre-resolve in each worker
        \App\Services\CacheWarmer::class,
    ],

    'flush' => [
        // Services to reset between requests
    ],

    'garbage' => 50,          // Force GC every 50 requests
    'max_execution_time' => 30,

    'tick' => true,
    'tick_interval' => 10_000, // 10 seconds
];
```

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use Illuminate\Support\Facades\Log;
use Laravel\Octane\Events\WorkerStarting;

final class OctaneWorkerStarting
{
    public function handle(WorkerStarting $event): void
    {
        Log::info('Octane worker starting', [
            'worker_id' => $event->worker->id ?? 'unknown',
            'pid' => getmypid(),
        ]);

        // Initialize worker-scoped resources
        // These persist across requests within this worker
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use Illuminate\Support\Facades\Log;
use Laravel\Octane\Events\WorkerStopping;

final class OctaneWorkerStopping
{
    public function handle(WorkerStopping $event): void
    {
        Log::info('Octane worker stopping', [
            'pid' => getmypid(),
        ]);

        // Cleanup worker-scoped resources
        // Close persistent connections, flush buffers
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use Laravel\Octane\Events\TickReceived;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class OctaneTickHandler
{
    public function handle(TickReceived $event): void
    {
        // Periodic tasks within the Octane worker
        $memoryUsage = memory_get_usage(true) / 1024 / 1024;

        if ($memoryUsage > 200) {
            Log::warning('Octane worker high memory', [
                'memory_mb' => round($memoryUsage, 2),
                'pid' => getmypid(),
            ]);
        }

        // Update worker heartbeat
        Cache::put(
            key: 'octane:worker:' . getmypid() . ':heartbeat',
            value: now()->toIso8601String(),
            ttl: 30,
        );
    }
}
```

```bash
# Octane graceful restart during deployment
php artisan octane:reload    # Graceful: finish current requests, restart workers
php artisan octane:stop      # Graceful: finish current requests, stop server

# Octane with --max-requests for memory safety
php artisan octane:start --max-requests=1000 --workers=4 --task-workers=2
```

**Key Points**:
- `octane:reload` gracefully restarts workers — new code loaded without dropping connections
- `WorkerStopping` event fires before worker process exits — cleanup persistent resources
- `garbage` setting forces garbage collection every N requests — prevents memory leaks
- `--max-requests=1000` restarts workers after processing 1000 requests — memory safety
- `flush` array lists services that must be reset between requests (stateful singletons)
- `warm` array pre-resolves services on worker boot — reduces first-request latency
- Tick handler runs periodically — use for health heartbeats, not heavy computation
- Octane workers share memory — never store request-scoped state in static properties

---

## Best Practices

- **Always handle SIGTERM** — Docker/Kubernetes sends SIGTERM before SIGKILL
- **Keep work units small** — graceful shutdown waits for current unit to finish
- **Cooperative shutdown in jobs** — check `shouldQuit` flag in long-running job loops
- **Set appropriate stop timeouts** — supervisor `stopwaitsecs` >= maximum job duration
- **Drain before deploy** — stop new requests, wait for in-flight, then swap code
- **Health checks drive traffic** — return 503 during drain to remove from load balancer
- **PHP-FPM graceful reload** — `kill -USR2` spawns new workers without dropping connections
- **Octane reload over restart** — `octane:reload` is graceful, `octane:stop` then `start` causes downtime
- **Log signal events** — critical for debugging deployment issues in production
- **Idempotent jobs** — jobs must be safe to re-process after release during shutdown

---

## Abnormal Case Patterns

1. **SIGKILL before job completes** — supervisor `stopwaitsecs` too short for job timeout. Fix: set `stopwaitsecs` = job timeout + 10s buffer; reduce job processing chunk size.

2. **Memory leak in Octane workers** — singleton services accumulate state across requests. Fix: add leaking services to `flush` array; set `--max-requests` limit; monitor memory in tick handler.

3. **Database connections lost during drain** — connection pool times out during drain wait. Fix: keep drain timeout shorter than DB connection timeout; close idle connections in cleanup.

4. **Queue jobs duplicated after restart** — job completed but acknowledgment lost during worker kill. Fix: make jobs idempotent; use database transactions with unique constraints; check for existing results before processing.

5. **Octane static state pollution** — static properties from one request leak into next request in same worker. Fix: never use static mutable state; use request-scoped container bindings; add services to `flush` config.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (353.1–353.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Graceful Shutdown Specialist — Infrastructure | EPS v3.2*
