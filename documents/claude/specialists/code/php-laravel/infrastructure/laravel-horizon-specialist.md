# Laravel Horizon Specialist — Infrastructure
# Laravel Horizonスペシャリスト — インフラストラクチャ
# Chuyen Gia Horizon Laravel — Ha Tang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Horizon
**Aspect**: Queue Management with Horizon
**Category**: infrastructure
**Purpose**: Knowledge provider for Laravel Horizon — queue dashboard setup, supervisor configuration, queue balancing strategies, metrics and monitoring, failure notifications, and production deployment

---

## Metadata

```json
{
  "id": "laravel-horizon-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Horizon",
  "aspect": "Queue Management with Horizon",
  "category": "infrastructure",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2850,
  "version": "1.0.0",
  "evidence": [
    "E1: laravel/horizon — Redis queue dashboard with real-time monitoring",
    "E2: Horizon supervisor and balancing — simple, auto, false strategies",
    "E3: Horizon production deployment — purge, pause, terminate lifecycle"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL (projects using Redis queues) |
| **Pattern Numbers** | 352.1–352.6 |
| **Directory Pattern** | `config/horizon.php` |
| **Naming Convention** | `config/horizon.php`, Horizon service provider |
| **Imports From** | Application (queued jobs, notifications) |
| **Imported By** | Queue workers, monitoring systems |
| **Cannot Import** | Domain logic, business rules |
| **Dependencies** | `laravel/horizon`, `predis/predis` or `phpredis` |
| **When To Use** | Laravel projects using Redis queues in production |
| **Source Skeleton** | `config/horizon.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel Horizon queue management — supervisor config, balancing, metrics, production operations |
| **Activation Trigger** | files: `config/horizon.php`; keywords: horizon, queue supervisor, queue balancing, queue dashboard |

---

## Role

You are a **Laravel Horizon Specialist**. Your responsibility is to provide best practices for Laravel Horizon — Redis queue dashboard setup, supervisor and worker process configuration, queue balancing strategies (simple, auto, false), real-time metrics and monitoring, failure notification pipelines, and production deployment patterns.

**Used by**: Any code agent configuring queue infrastructure with Laravel Horizon
**Not used by**: Non-Redis queue drivers (SQS, database), projects without Horizon

---

## Patterns

### Pattern 352.1: Horizon Setup

**Category**: Installation and Configuration
**Description**: Initial Horizon setup with environment-based supervisor configuration.

```php
<?php
// config/horizon.php

declare(strict_types=1);

return [
    'domain' => env('HORIZON_DOMAIN'),
    'path' => 'horizon',
    'use' => 'default',
    'prefix' => env('HORIZON_PREFIX', 'horizon:'),

    'middleware' => ['web', 'auth.horizon'],

    'waits' => [
        'redis:default' => 60,
        'redis:critical' => 30,
    ],

    'trim' => [
        'recent' => 60,        // minutes
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080, // 7 days
        'failed' => 10080,
        'monitored' => 10080,
    ],

    'silenced' => [
        // Jobs to exclude from completed list
    ],

    'metrics' => [
        'trim_snapshots' => [
            'job' => 24,       // hours
            'queue' => 24,
        ],
    ],

    'fast_termination' => false,

    'memory_limit' => (int) env('HORIZON_MEMORY_LIMIT', 128),

    'environments' => [
        'production' => [
            'supervisor-default' => [
                'maxProcesses' => 10,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
        ],
        'local' => [
            'supervisor-default' => [
                'maxProcesses' => 3,
            ],
        ],
    ],
];
```

```php
<?php
// app/Providers/HorizonServiceProvider.php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

final class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    public function boot(): void
    {
        parent::boot();

        Horizon::routeMailNotificationsTo(
            env('HORIZON_MAIL_TO', 'ops@example.com'),
        );

        Horizon::routeSlackNotificationsTo(
            env('HORIZON_SLACK_WEBHOOK'),
            channel: '#queue-alerts',
        );

        // Dark mode for dashboard
        Horizon::night();
    }

    protected function gate(): void
    {
        Gate::define('viewHorizon', function ($user): bool {
            return in_array($user->email, [
                'admin@example.com',
            ], strict: true);
        });
    }
}
```

**Key Points**:
- Environment-based config — production gets more workers, local gets fewer
- `trim` settings control data retention in Redis — prevent unbounded memory growth
- `waits` define how long Horizon waits before flagging a queue as "long wait"
- Gate `viewHorizon` restricts dashboard access — never expose in production without auth
- Route notifications to Slack and email for failure alerts

---

### Pattern 352.2: Supervisor Configuration

**Category**: Worker Management
**Description**: Horizon supervisor configuration — multiple supervisors for different queue priorities.

```php
<?php
// config/horizon.php — environments section

'environments' => [
    'production' => [
        'supervisor-critical' => [
            'connection' => 'redis',
            'queue' => ['critical', 'payments'],
            'balance' => 'false',      // Fixed workers for critical queues
            'processes' => 4,
            'tries' => 1,
            'timeout' => 30,
            'maxTime' => 3600,
            'maxJobs' => 500,
            'memory' => 256,
            'nice' => -10,             // Higher OS priority
        ],

        'supervisor-default' => [
            'connection' => 'redis',
            'queue' => ['default', 'notifications', 'emails'],
            'balance' => 'auto',
            'minProcesses' => 2,
            'maxProcesses' => 10,
            'balanceMaxShift' => 2,
            'balanceCooldown' => 3,
            'tries' => 3,
            'timeout' => 120,
            'maxTime' => 3600,
            'maxJobs' => 1000,
            'memory' => 128,
        ],

        'supervisor-low' => [
            'connection' => 'redis',
            'queue' => ['low', 'reports', 'exports'],
            'balance' => 'simple',
            'minProcesses' => 1,
            'maxProcesses' => 5,
            'tries' => 3,
            'timeout' => 600,         // Long-running jobs
            'maxTime' => 3600,
            'maxJobs' => 100,
            'memory' => 512,          // Reports need more memory
        ],
    ],
],
```

```ini
; /etc/supervisor/conf.d/horizon.conf — OS supervisor for Horizon master
[program:horizon]
process_name=%(program_name)s
command=php /var/www/html/artisan horizon
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/horizon.log
stopwaitsecs=3600
stopsignal=SIGTERM
```

**Key Points**:
- Multiple supervisors for queue priority tiers — critical, default, low
- `balance: false` for critical queues — fixed worker count, no auto-scaling
- `balance: auto` for default queues — Horizon adjusts workers based on load
- `nice: -10` gives critical supervisor higher OS scheduling priority
- `stopwaitsecs=3600` in OS supervisor — allow current jobs to finish before kill
- `maxTime` restarts workers hourly — prevents memory leaks in long-running PHP

---

### Pattern 352.3: Queue Balancing Strategies

**Category**: Load Management
**Description**: Horizon balancing strategies — false (fixed), simple (round-robin), auto (adaptive).

```php
<?php
// Balancing strategy comparison

// Strategy 1: false — Fixed workers per queue
// Use for: Critical queues that must always have dedicated capacity
'supervisor-fixed' => [
    'queue' => ['payments'],
    'balance' => 'false',
    'processes' => 4,   // Always exactly 4 workers on payments queue
],

// Strategy 2: simple — Round-robin distribution
// Use for: Queues with predictable, even workloads
'supervisor-simple' => [
    'queue' => ['emails', 'sms'],
    'balance' => 'simple',
    'minProcesses' => 2,
    'maxProcesses' => 6,
    // Workers distributed evenly: 3 on emails, 3 on sms (if maxProcesses=6)
],

// Strategy 3: auto — Adaptive based on queue depth
// Use for: Variable workloads where some queues spike unpredictably
'supervisor-auto' => [
    'queue' => ['default', 'notifications', 'webhooks'],
    'balance' => 'auto',
    'minProcesses' => 2,
    'maxProcesses' => 15,
    'balanceMaxShift' => 3,    // Max workers to add/remove per rebalance
    'balanceCooldown' => 3,    // Seconds between rebalance checks
    // Workers shift to busiest queue: if webhooks has 1000 pending, most workers go there
],
```

```php
<?php
// Custom balancing with queue weights (via queue ordering)

'supervisor-weighted' => [
    'connection' => 'redis',
    // Queue order = priority: payments processed before notifications
    'queue' => ['payments', 'default', 'notifications', 'low'],
    'balance' => 'auto',
    'minProcesses' => 3,
    'maxProcesses' => 12,
    'balanceMaxShift' => 2,
    'balanceCooldown' => 5,
],
```

**Key Points**:
- `false`: fixed worker count — best for latency-critical queues (payments, webhooks)
- `simple`: even distribution across queues — best for uniform workloads
- `auto`: adapts to queue depth — best for variable/bursty workloads
- `balanceMaxShift` controls how aggressively workers move — lower = more stable, higher = more responsive
- `balanceCooldown` prevents thrashing — minimum seconds between rebalance operations
- Queue order in the array determines priority when workers pick jobs

---

### Pattern 352.4: Metrics and Monitoring

**Category**: Observability
**Description**: Horizon metrics collection, dashboard customization, and integration with external monitoring.

```php
<?php

declare(strict_types=1);

namespace App\Monitoring;

use Illuminate\Support\Facades\Redis;
use Laravel\Horizon\Contracts\MetricsRepository;
use Laravel\Horizon\WaitTimeCalculator;

final class HorizonMetricsExporter
{
    public function __construct(
        private readonly MetricsRepository $metrics,
        private readonly WaitTimeCalculator $waitTime,
    ) {}

    /**
     * Export Horizon metrics for Prometheus/Grafana.
     *
     * @return array<string, mixed>
     */
    public function export(): array
    {
        return [
            'horizon_status' => $this->getHorizonStatus(),
            'jobs_processed_per_minute' => $this->getJobsPerMinute(),
            'failed_jobs_total' => $this->getFailedJobCount(),
            'pending_jobs' => $this->getPendingJobs(),
            'wait_times' => $this->waitTime->calculate(),
            'recent_job_throughput' => $this->metrics->jobsProcessedPerMinute(),
        ];
    }

    private function getHorizonStatus(): string
    {
        $status = Redis::connection('horizon')
            ->get('horizon:master:status');

        return $status ?? 'inactive';
    }

    private function getJobsPerMinute(): float
    {
        return (float) $this->metrics->jobsProcessedPerMinute();
    }

    private function getFailedJobCount(): int
    {
        return (int) Redis::connection('horizon')
            ->llen('horizon:failed_jobs');
    }

    private function getPendingJobs(): array
    {
        $queues = config('horizon.defaults.supervisor-default.queue', ['default']);
        $pending = [];

        foreach ($queues as $queue) {
            $pending[$queue] = (int) Redis::connection('horizon')
                ->llen("queues:{$queue}");
        }

        return $pending;
    }
}
```

```php
<?php
// Scheduled metric snapshots
use Illuminate\Support\Facades\Schedule;

// Horizon takes automatic snapshots — configure frequency
Schedule::command('horizon:snapshot')->everyFiveMinutes();

// Custom metrics export for external systems
Schedule::call(function () {
    $exporter = app(HorizonMetricsExporter::class);
    $metrics = $exporter->export();

    // Push to external monitoring
    if ($metrics['horizon_status'] !== 'running') {
        Log::critical('Horizon is not running', $metrics);
    }
})->everyMinute()->name('horizon-metrics-export');
```

**Key Points**:
- `horizon:snapshot` must be scheduled — Horizon dashboard graphs depend on it
- Export metrics to Prometheus/Grafana for long-term trending (Horizon retains limited history)
- Monitor `horizon_status` — alert if not `running` (paused, inactive, or crashed)
- Track wait times per queue — early indicator of capacity problems
- `jobsProcessedPerMinute` is the primary throughput metric

---

### Pattern 352.5: Notification on Failure

**Category**: Failure Handling
**Description**: Job failure notifications — Slack, email, custom handlers, and failure analysis.

```php
<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\SlackMessage;
use Illuminate\Notifications\Notification;

final class FailedJobNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $jobName,
        private readonly string $exceptionMessage,
        private readonly string $queue,
        private readonly string $connection,
        private readonly ?string $jobId = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['slack'];
    }

    public function toSlack(object $notifiable): SlackMessage
    {
        return (new SlackMessage())
            ->error()
            ->content("Queue Job Failed: {$this->jobName}")
            ->attachment(function ($attachment): void {
                $attachment->fields([
                    'Job' => $this->jobName,
                    'Queue' => $this->queue,
                    'Connection' => $this->connection,
                    'Job ID' => $this->jobId ?? 'N/A',
                    'Error' => mb_substr($this->exceptionMessage, 0, 500),
                ]);
            });
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Notifications\FailedJobNotification;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

final class HandleFailedJob
{
    public function handle(JobFailed $event): void
    {
        $jobName = $event->job->resolveName();
        $exception = $event->exception;

        Log::error('Job failed permanently', [
            'job' => $jobName,
            'queue' => $event->job->getQueue(),
            'connection' => $event->connectionName,
            'exception' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);

        // Rate-limit notifications: max 10 per hour per job type
        $cacheKey = "failed_job_notify:{$jobName}";
        $count = (int) cache($cacheKey, 0);

        if ($count < 10) {
            cache()->increment($cacheKey);
            cache()->put($cacheKey, $count + 1, now()->addHour());

            Notification::route('slack', config('monitoring.slack_webhook'))
                ->notify(new FailedJobNotification(
                    jobName: $jobName,
                    exceptionMessage: $exception->getMessage(),
                    queue: $event->job->getQueue(),
                    connection: $event->connectionName,
                    jobId: $event->job->getJobId(),
                ));
        }
    }
}
```

**Key Points**:
- Listen to `JobFailed` event — fires after all retries exhausted
- Rate-limit notifications to prevent alert storms (10 per hour per job type)
- Include job name, queue, connection, and truncated error in Slack message
- Log full stack trace to performance/error channel for debugging
- Horizon also sends its own notifications — configure in HorizonServiceProvider

---

### Pattern 352.6: Horizon in Production

**Category**: Production Operations
**Description**: Production deployment patterns — graceful restart, maintenance mode, scaling.

```bash
#!/bin/bash
# deploy.sh — Horizon-aware deployment

set -e

echo "[deploy] Starting deployment..."

# 1. Enter maintenance mode
php artisan down --retry=60

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
composer install --no-dev --optimize-autoloader --classmap-authoritative

# 4. Run migrations
php artisan migrate --force

# 5. Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 6. Terminate Horizon gracefully (waits for current jobs to finish)
php artisan horizon:terminate

# 7. Clear compiled
php artisan optimize:clear

# 8. Exit maintenance mode
php artisan up

# 9. Supervisor restarts Horizon automatically after terminate
echo "[deploy] Deployment complete. Horizon will restart via supervisor."
```

```php
<?php
// app/Console/Commands/HorizonHealthCommand.php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

final class HorizonHealthCommand extends Command
{
    protected $signature = 'horizon:health-check';
    protected $description = 'Check Horizon master process status';

    public function handle(): int
    {
        $status = Redis::get('horizon:master:status');

        if ($status !== 'running') {
            $this->error("Horizon is not running. Status: {$status}");

            return self::FAILURE;
        }

        $pid = Redis::get('horizon:master:pid');
        $this->info("Horizon running. PID: {$pid}");

        // Check supervisor processes
        $supervisors = Redis::smembers('horizon:supervisors');
        $this->info('Active supervisors: ' . count($supervisors));

        foreach ($supervisors as $supervisor) {
            $info = Redis::hmgetall("horizon:supervisor:{$supervisor}");
            $this->line("  - {$supervisor}: {$info['status'] ?? 'unknown'}");
        }

        return self::SUCCESS;
    }
}
```

**Key Points**:
- `horizon:terminate` sends SIGTERM — current jobs finish, then workers exit
- OS supervisor (supervisord) auto-restarts Horizon after terminate
- Never use `horizon:pause` during deploys — paused queues still accept jobs but dont process
- `fast_termination: false` (default) waits for current job to finish; `true` kills immediately
- Schedule `horizon:health-check` to verify Horizon restarts after deploy
- `horizon:purge` removes orphaned worker processes — run if workers leak after crashes

---

## Best Practices

- **One supervisor per priority tier** — critical, default, low with different config
- **Auto-balance for variable workloads** — `balance: auto` adapts to queue depth
- **Fixed workers for critical queues** — `balance: false` guarantees capacity
- **Schedule horizon:snapshot** — required for dashboard graphs and metrics
- **Set maxTime and maxJobs** — restart workers periodically to prevent memory leaks
- **Rate-limit failure notifications** — prevent alert storms from cascading failures
- **Graceful termination on deploy** — `horizon:terminate`, never `kill -9`
- **Monitor Horizon status** — alert if master process status is not `running`
- **Trim aggressively** — recent/completed job data fills Redis quickly under load
- **Separate Redis connection** — use dedicated Redis database for Horizon to avoid key conflicts

---

## Abnormal Case Patterns

1. **Horizon not starting after deploy** — config cache contains stale Horizon config. Fix: run `php artisan config:clear && php artisan config:cache` before `horizon:terminate`.

2. **Workers stuck on long job during deploy** — `horizon:terminate` waits indefinitely for current job. Fix: set `timeout` per supervisor; use `fast_termination: true` for non-critical queues.

3. **Redis memory exhaustion** — completed/failed job data not trimmed. Fix: reduce `trim.recent` and `trim.completed` values; monitor Redis `used_memory` metric.

4. **Queue backlog after restart** — workers take time to scale back up after terminate. Fix: set `minProcesses` high enough for baseline load; auto-balance handles the rest.

5. **Orphaned worker processes** — Horizon master dies but workers survive. Fix: schedule `horizon:purge` command; OS supervisor manages master process lifecycle.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (352.1–352.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Horizon Specialist — Infrastructure | EPS v3.2*
