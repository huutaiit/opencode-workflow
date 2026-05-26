# Laravel Scheduling Specialist — Scheduling
# Laravelスケジューリングスペシャリスト — スケジューリング
# Chuyen Gia Lap Lich Laravel — Lap Lich

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Task Scheduling
**Aspect**: Task Scheduling
**Category**: scheduling
**Purpose**: Knowledge provider for Laravel task scheduling — schedule definition, frequency methods, groups, overlap prevention, monitoring, and testing

---

## Metadata

```json
{
  "id": "laravel-scheduling-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Scheduling",
  "aspect": "Task Scheduling",
  "category": "scheduling",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 schedule definition via routes/console.php",
    "E2: Schedule frequency API — cron expressions and fluent methods",
    "E3: Overlap prevention and maintenance windows",
    "E4: Schedule monitoring via onSuccess/onFailure hooks"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 365.1–365.6 |
| **Directory Pattern** | `routes/console.php`, `app/Console/Commands/` |
| **Naming Convention** | `{Domain}{Action}Command.php` |
| **Imports From** | Domain (services), Infrastructure (repositories) |
| **Imported By** | N/A (scheduler is entry point) |
| **Cannot Import** | Presentation layer |
| **Dependencies** | `illuminate/console` |
| **When To Use** | Background tasks, periodic data processing, maintenance jobs |
| **Source Skeleton** | `routes/console.php`, `app/Console/Commands/{Name}Command.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel task scheduling — definition, frequency, overlap prevention, monitoring |
| **Activation Trigger** | files: `routes/console.php`, `app/Console/Commands/*.php`; keywords: schedule, cron, periodic, recurring task |

---

## Role

You are a **Laravel Scheduling Specialist**. Your responsibility is to provide best practices for Laravel 11+ task scheduling — defining schedules in routes/console.php, frequency methods, overlap prevention, schedule groups, monitoring hooks, and testing scheduled tasks.

**Used by**: Any code agent implementing background tasks and periodic processing
**Not used by**: Non-Laravel stacks, projects without background task requirements

---

## Patterns

### Pattern 365.1: Schedule Definition

**Category**: Schedule Basics
**Description**: Define scheduled tasks in routes/console.php using Laravel 11 conventions.

```php
<?php

// routes/console.php — Laravel 11 schedule definition
declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Command scheduling
Schedule::command('orders:process-pending')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('reports:generate-daily')
    ->dailyAt('02:00')
    ->timezone('Asia/Tokyo');

// Closure scheduling (simple tasks)
Schedule::call(function (): void {
    \App\Models\Session::where('expires_at', '<', now())->delete();
})->daily()->name('cleanup:expired-sessions');

// Job scheduling
Schedule::job(new \App\Jobs\SyncInventoryJob())
    ->everyFifteenMinutes()
    ->onOneServer();

// Artisan command with arguments
Schedule::command('emails:send-reminders', ['--queue' => 'high'])
    ->weekdays()
    ->at('09:00');
```

**Key Points**:
- Laravel 11 defines schedules in `routes/console.php` — no dedicated Kernel class
- `Schedule` facade replaces the old `$schedule` parameter in Kernel
- Closure-based tasks must have a `name()` for overlap prevention and monitoring
- Use `timezone()` for business-hour-sensitive tasks across regions

---

### Pattern 365.2: Frequency Methods

**Category**: Schedule Timing
**Description**: Fluent frequency API for defining execution intervals with precision.

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Standard frequencies
Schedule::command('metrics:aggregate')->everyMinute();
Schedule::command('queue:retry-failed')->everyFiveMinutes();
Schedule::command('cache:warm-products')->everyFifteenMinutes();
Schedule::command('feeds:import-rss')->hourly();
Schedule::command('reports:daily-summary')->daily();
Schedule::command('backups:database')->dailyAt('03:00');

// Weekly/Monthly
Schedule::command('analytics:weekly-report')
    ->weeklyOn(1, '08:00'); // Monday at 8 AM

Schedule::command('billing:generate-invoices')
    ->monthlyOn(1, '00:00'); // 1st of month at midnight

// Custom cron expression
Schedule::command('legacy:sync-erp')
    ->cron('0 */4 * * 1-5'); // Every 4 hours on weekdays

// Conditional frequency
Schedule::command('promotions:activate')
    ->hourly()
    ->between('08:00', '22:00') // Only during business hours
    ->weekdays();

// Environment-based scheduling
Schedule::command('telescope:prune')
    ->daily()
    ->environments(['staging', 'production']);
```

**Key Points**:
- Fluent methods chain naturally: `->hourly()->weekdays()->between('09:00', '17:00')`
- `cron()` for complex expressions not covered by fluent API
- `between()`/`unlessBetween()` constrain execution to time windows
- `environments()` limits tasks to specific app environments
- All times default to server timezone unless `timezone()` is specified

---

### Pattern 365.3: Schedule Groups

**Category**: Organization
**Description**: Group related scheduled tasks for shared configuration and conditional execution.

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Group by domain concern using shared configuration
Schedule::command('inventory:check-low-stock')
    ->everyThirtyMinutes()
    ->withoutOverlapping(expiresAt: 25)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/inventory.log'));

Schedule::command('inventory:sync-warehouse')
    ->hourly()
    ->withoutOverlapping(expiresAt: 55)
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/inventory.log'));

Schedule::command('inventory:reorder-check')
    ->dailyAt('06:00')
    ->withoutOverlapping()
    ->appendOutputTo(storage_path('logs/inventory.log'));

// Maintenance window — skip during deployments
Schedule::command('search:reindex')
    ->dailyAt('04:00')
    ->skip(fn (): bool => file_exists(storage_path('maintenance.flag')));

// Conditional execution based on feature flags
Schedule::command('ai:generate-recommendations')
    ->hourly()
    ->when(fn (): bool => config('features.ai_recommendations', false));
```

**Key Points**:
- Group related tasks by domain and share output log files
- `skip()` and `when()` provide runtime conditional execution
- Maintenance windows prevent task execution during deployments
- Feature flag integration enables gradual rollout of scheduled tasks

---

### Pattern 365.4: Overlapping Prevention

**Category**: Concurrency Control
**Description**: Prevent multiple instances of the same task from running simultaneously.

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Basic overlap prevention — uses cache lock
Schedule::command('orders:reconcile')
    ->hourly()
    ->withoutOverlapping();

// With custom expiration (minutes) — auto-release if task hangs
Schedule::command('exports:generate-large-report')
    ->dailyAt('01:00')
    ->withoutOverlapping(expiresAt: 120); // 2-hour max

// Single server execution — for multi-server deployments
Schedule::command('billing:process-subscriptions')
    ->daily()
    ->onOneServer()
    ->withoutOverlapping();

// Background execution — don't block the scheduler
Schedule::command('imports:process-csv-queue')
    ->everyFiveMinutes()
    ->runInBackground()
    ->withoutOverlapping(expiresAt: 10);
```

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Contracts\Cache\LockProvider;

final class ReconcileOrdersCommand extends Command
{
    protected $signature = 'orders:reconcile {--batch-size=500}';
    protected $description = 'Reconcile order records with payment gateway';

    public function handle(LockProvider $lockProvider): int
    {
        // Additional application-level lock for critical sections
        $lock = $lockProvider->lock('orders:reconcile', seconds: 3600);

        if (! $lock->get()) {
            $this->warn('Reconciliation already in progress.');
            return self::SUCCESS;
        }

        try {
            $batchSize = (int) $this->option('batch-size');
            // ... reconciliation logic
            $this->info("Reconciled {$batchSize} orders.");
            return self::SUCCESS;
        } finally {
            $lock->release();
        }
    }
}
```

**Key Points**:
- `withoutOverlapping()` uses the cache driver for distributed locking
- `expiresAt` parameter prevents permanent lock if a task crashes
- `onOneServer()` ensures only one server in a cluster runs the task (requires Redis/Memcached)
- `runInBackground()` frees the scheduler to continue without waiting for completion
- Application-level locks provide additional safety for critical operations

---

### Pattern 365.5: Schedule Monitoring

**Category**: Observability
**Description**: Monitor scheduled task execution with success/failure hooks, output logging, and health checks.

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Log;

// Output and logging
Schedule::command('reports:generate-daily')
    ->dailyAt('02:00')
    ->appendOutputTo(storage_path('logs/reports.log'))
    ->emailOutputOnFailure('ops@example.com');

// Success/Failure hooks
Schedule::command('payments:process-pending')
    ->hourly()
    ->onSuccess(function (): void {
        Log::channel('scheduler')->info('Payment processing completed successfully.');
    })
    ->onFailure(function (): void {
        Log::channel('scheduler')->error('Payment processing failed.');
        // Alert external monitoring
    });

// Before/After hooks for timing
Schedule::command('imports:sync-products')
    ->everyThirtyMinutes()
    ->before(function (): void {
        Log::channel('scheduler')->info('Starting product sync...');
    })
    ->after(function (): void {
        Log::channel('scheduler')->info('Product sync completed.');
    });

// Ping health check URL (e.g., Healthchecks.io, Cronitor)
Schedule::command('backups:database')
    ->dailyAt('03:00')
    ->pingBefore('https://hc-ping.com/uuid-start')
    ->thenPing('https://hc-ping.com/uuid-end')
    ->pingOnFailure('https://hc-ping.com/uuid-fail');
```

**Key Points**:
- `appendOutputTo()` logs command output without overwriting previous runs
- `onSuccess()`/`onFailure()` hooks trigger after task completion
- External health check pings verify tasks are running on schedule
- `emailOutputOnFailure()` sends output only when exit code is non-zero
- Combine with Laravel Telescope for visual schedule monitoring

---

### Pattern 365.6: Schedule Testing

**Category**: Testing
**Description**: Test scheduled task definitions and command logic in isolation.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

final class ScheduleDefinitionTest extends TestCase
{
    public function test_orders_reconcile_is_scheduled_hourly(): void
    {
        $schedule = $this->app->make(Schedule::class);
        $events = collect($schedule->events());

        $reconcileEvent = $events->first(
            fn ($event) => str_contains($event->command ?? '', 'orders:reconcile'),
        );

        $this->assertNotNull($reconcileEvent, 'orders:reconcile must be scheduled');
        $this->assertSame('0 * * * *', $reconcileEvent->expression);
    }

    public function test_daily_report_runs_at_two_am(): void
    {
        $schedule = $this->app->make(Schedule::class);
        $events = collect($schedule->events());

        $reportEvent = $events->first(
            fn ($event) => str_contains($event->command ?? '', 'reports:generate-daily'),
        );

        $this->assertNotNull($reportEvent);
        $this->assertSame('0 2 * * *', $reportEvent->expression);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ReconcileOrdersCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_reconcile_processes_pending_orders(): void
    {
        Order::factory()->count(5)->create(['status' => 'pending_reconciliation']);

        $this->artisan('orders:reconcile', ['--batch-size' => 10])
            ->assertExitCode(0);

        $this->assertDatabaseMissing('orders', ['status' => 'pending_reconciliation']);
    }

    public function test_reconcile_exits_gracefully_when_locked(): void
    {
        // Simulate an existing lock
        cache()->lock('orders:reconcile', 3600)->get();

        $this->artisan('orders:reconcile')
            ->expectsOutput('Reconciliation already in progress.')
            ->assertExitCode(0);
    }
}
```

**Key Points**:
- Test schedule definitions by inspecting `Schedule` events and cron expressions
- Test command logic independently using `$this->artisan()` with assertions
- Test lock behavior by pre-acquiring cache locks in test setup
- Use `RefreshDatabase` trait for database-dependent command tests
- `assertExitCode(0)` verifies successful execution

---

## Best Practices

- **Define all schedules in `routes/console.php`** — Laravel 11 convention; no Kernel class needed
- **Always set `withoutOverlapping()`** — prevent duplicate execution, especially for long-running tasks
- **Use `onOneServer()` in multi-server deployments** — requires centralized cache (Redis)
- **Set `expiresAt` on overlap prevention** — avoid permanent locks from crashed tasks
- **Log output with `appendOutputTo()`** — preserves history for debugging
- **Ping external monitors** — dead-man's-switch pattern catches tasks that silently stop running
- **Run `schedule:work` in development** — runs the scheduler every minute without cron
- **Test both schedule definitions and command logic** — definition tests catch deployment misconfigurations

---

## Abnormal Case Patterns

1. **Schedule not running in production** — cron entry missing `* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1`. Fix: verify cron entry exists and PHP path is correct.

2. **`onOneServer()` without Redis** — silently falls back to every-server execution with file/array cache drivers. Fix: use Redis or Memcached for distributed locking.

3. **Overlap lock never released** — task crashes without releasing `withoutOverlapping()` lock. Fix: set `expiresAt` parameter to a reasonable timeout.

4. **Timezone confusion** — tasks run at wrong time due to server timezone vs application timezone mismatch. Fix: explicitly set `timezone()` on time-sensitive tasks.

5. **Closure tasks without `name()`** — `withoutOverlapping()` cannot create a unique lock key. Fix: always chain `->name('unique-identifier')` on closure-based tasks.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (365.1–365.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Scheduling Specialist — Scheduling | EPS v3.2*
