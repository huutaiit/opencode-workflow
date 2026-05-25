# Laravel Artisan Command Specialist — Core
# Laravelアーティザンコマンドスペシャリスト — コア
# Chuyen Gia Artisan Command Laravel — Loi

**Version**: 1.0.0
**Technology**: Laravel 11+ Artisan Commands
**Aspect**: Artisan Commands
**Category**: core
**Purpose**: Knowledge provider for Laravel Artisan commands — custom commands, arguments/options, command I/O, scheduling, testing, and closure commands

---

## Metadata

```json
{
  "id": "laravel-artisan-specialist",
  "technology": "Laravel 11+ Artisan Commands",
  "aspect": "Artisan Commands",
  "category": "core",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 Artisan — console command architecture and lifecycle",
    "E2: Task scheduling — cron-based command scheduling via Schedule facade",
    "E3: Command testing — Artisan::call() and expectsOutput assertions"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (Console) |
| **Variant** | ALL |
| **Pattern Numbers** | 306.1–306.6 |
| **Directory Pattern** | `app/Console/Commands/` |
| **Naming Convention** | `{Action}{Entity}Command.php` |
| **Imports From** | Application (use cases/services), Domain (entities, value objects) |
| **Imported By** | Scheduler, Queue workers, CI/CD pipelines |
| **Cannot Import** | Infrastructure directly (go through application layer) |
| **Dependencies** | `illuminate/console`, `illuminate/support` |
| **When To Use** | CLI operations — data imports, maintenance, scheduled tasks, admin tools |
| **Source Skeleton** | `app/Console/Commands/{Action}{Entity}Command.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel Artisan commands — custom commands, scheduling, testing, CLI I/O |
| **Activation Trigger** | files: `app/Console/Commands/*.php`, `routes/console.php`; keywords: artisan, command, schedule, console |

---

## Role

You are a **Laravel Artisan Command Specialist**. Your responsibility is to provide best practices for Laravel 11+ Artisan commands — creating custom commands, handling arguments and options, formatting command I/O, scheduling commands, testing command behavior, and using closure commands.

**Used by**: Any code agent working with Laravel CLI commands and task scheduling
**Not used by**: Non-Laravel stacks, projects not using Artisan

---

## Patterns

### Pattern 306.1: Custom Commands

**Category**: Command Fundamentals
**Description**: Create well-structured Artisan commands with proper signature, description, and handle method.

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\OrderCleanupService;
use Illuminate\Console\Command;

final class PurgeExpiredOrdersCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'orders:purge-expired
        {--days=30 : Number of days after which expired orders are purged}
        {--dry-run : Preview what would be deleted without actually deleting}
        {--chunk=500 : Number of records to process per batch}';

    /**
     * The console command description.
     */
    protected $description = 'Purge expired orders older than the specified number of days';

    public function handle(OrderCleanupService $cleanupService): int
    {
        $days = (int) $this->option('days');
        $isDryRun = (bool) $this->option('dry-run');
        $chunkSize = (int) $this->option('chunk');

        $this->components->info("Purging orders expired more than {$days} days ago.");

        if ($isDryRun) {
            $this->components->warn('DRY RUN — no records will be deleted.');
        }

        $result = $cleanupService->purgeExpired(
            olderThanDays: $days,
            chunkSize: $chunkSize,
            dryRun: $isDryRun,
        );

        $this->components->info("Processed: {$result->processed}, Deleted: {$result->deleted}");

        if ($result->errors > 0) {
            $this->components->error("Errors: {$result->errors}");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
```

**Key Points**:
- Return `self::SUCCESS` (0) or `self::FAILURE` (1) from `handle()` — enables exit code checking
- Dependencies are injected via `handle()` method parameters — auto-resolved by container
- Use `$this->components` for styled output (Laravel 11 component rendering)
- Mark commands `final` unless designed for extension
- Naming: `{domain}:{action}` for signature, `{Action}{Entity}Command.php` for class

---

### Pattern 306.2: Command Arguments and Options

**Category**: Command Fundamentals
**Description**: Define and validate command arguments and options with type safety.

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ExportFormat;
use Illuminate\Console\Command;

final class ExportUsersCommand extends Command
{
    protected $signature = 'users:export
        {format : Export format (csv, json, xlsx)}
        {--status=active : Filter by user status}
        {--from= : Start date (Y-m-d format)}
        {--to= : End date (Y-m-d format)}
        {--include-deleted : Include soft-deleted users}
        {--output= : Output file path (default: storage/exports/)}
        {--notify=* : Email addresses to notify on completion}';

    protected $description = 'Export users to the specified format with optional filters';

    public function handle(): int
    {
        // Argument — required, positional
        $format = ExportFormat::tryFrom($this->argument('format'));
        if ($format === null) {
            $this->components->error(
                'Invalid format. Allowed: ' . implode(', ', array_column(ExportFormat::cases(), 'value'))
            );
            return self::FAILURE;
        }

        // Options — named, optional
        $status = $this->option('status');
        $from = $this->option('from') ? \Carbon\Carbon::parse($this->option('from')) : null;
        $to = $this->option('to') ? \Carbon\Carbon::parse($this->option('to')) : null;
        $includeDeleted = (bool) $this->option('include-deleted');
        $outputPath = $this->option('output') ?? storage_path('exports/users.' . $format->value);

        // Array option — collects multiple values
        $notifyEmails = $this->option('notify'); // ['admin@ex.com', 'ops@ex.com']

        // Validate date range
        if ($from && $to && $from->isAfter($to)) {
            $this->components->error('--from date must be before --to date.');
            return self::FAILURE;
        }

        $this->components->info("Exporting users as {$format->value}...");

        // ... export logic

        foreach ($notifyEmails as $email) {
            $this->components->info("Notification sent to: {$email}");
        }

        return self::SUCCESS;
    }
}

// Enum for type-safe format validation
enum ExportFormat: string
{
    case CSV = 'csv';
    case JSON = 'json';
    case XLSX = 'xlsx';
}
```

**Key Points**:
- `{argument}` = required, `{argument?}` = optional, `{argument=default}` = with default
- `{--option}` = boolean flag, `{--option=}` = value option, `{--option=default}` = default value
- `{--option=*}` = array option — pass multiple times: `--notify=a@b.com --notify=c@d.com`
- Use PHP enums with `tryFrom()` for type-safe argument validation
- Validate early, fail fast with clear error messages

---

### Pattern 306.3: Command I/O and Progress

**Category**: User Interaction
**Description**: Rich CLI output — tables, progress bars, confirmations, and styled components.

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

final class AuditUsersCommand extends Command
{
    protected $signature = 'users:audit {--fix : Auto-fix found issues}';
    protected $description = 'Audit user data integrity and optionally fix issues';

    public function handle(): int
    {
        $users = User::query()->cursor();
        $totalUsers = User::count();
        $issues = [];

        // Progress bar for long operations
        $progressBar = $this->output->createProgressBar($totalUsers);
        $progressBar->setFormat(' %current%/%max% [%bar%] %percent:3s%% — %message%');
        $progressBar->setMessage('Auditing users...');
        $progressBar->start();

        foreach ($users as $user) {
            $userIssues = $this->auditUser($user);
            if ($userIssues !== []) {
                $issues[$user->id] = $userIssues;
            }
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        if ($issues === []) {
            $this->components->info('All users passed audit. No issues found.');
            return self::SUCCESS;
        }

        // Table output for results
        $rows = [];
        foreach ($issues as $userId => $userIssues) {
            foreach ($userIssues as $issue) {
                $rows[] = [$userId, $issue['field'], $issue['problem'], $issue['suggestion']];
            }
        }

        $this->table(
            headers: ['User ID', 'Field', 'Problem', 'Suggestion'],
            rows: $rows,
        );

        $this->components->warn(count($issues) . ' users have issues.');

        // Confirmation before destructive action
        if ($this->option('fix')) {
            if ($this->confirm('Apply fixes to all issues?', default: false)) {
                $fixed = $this->applyFixes($issues);
                $this->components->info("{$fixed} issues fixed.");
            } else {
                $this->components->info('Fix cancelled.');
            }
        }

        return self::SUCCESS;
    }

    private function auditUser(User $user): array
    {
        $issues = [];

        if (blank($user->email)) {
            $issues[] = [
                'field' => 'email',
                'problem' => 'Missing email',
                'suggestion' => 'Require email on next login',
            ];
        }

        if ($user->created_at === null) {
            $issues[] = [
                'field' => 'created_at',
                'problem' => 'NULL created_at',
                'suggestion' => 'Set to earliest activity date',
            ];
        }

        return $issues;
    }
}
```

**Key Points**:
- `$this->components->info/warn/error()` — styled output components (Laravel 11)
- `$this->table()` — formatted table output for structured data
- `$this->confirm()` — yes/no prompt for destructive operations
- Progress bars: use `cursor()` for memory-efficient iteration over large datasets
- `$this->newLine(2)` — add spacing after progress bar completion

---

### Pattern 306.4: Scheduling Commands

**Category**: Task Scheduling
**Description**: Schedule Artisan commands using Laravel 11 scheduling via bootstrap/app.php or routes/console.php.

```php
<?php

declare(strict_types=1);

// routes/console.php — Laravel 11 schedule definition
use Illuminate\Support\Facades\Schedule;

// Simple scheduling
Schedule::command('orders:purge-expired --days=30')
    ->daily()
    ->at('02:00')
    ->withoutOverlapping()
    ->onOneServer()
    ->emailOutputOnFailure('ops@company.com');

// Complex schedule with health checks
Schedule::command('reports:generate --type=daily')
    ->dailyAt('06:00')
    ->timezone('Asia/Tokyo')
    ->withoutOverlapping(expiresAt: 60) // lock expires after 60 min
    ->before(fn () => Log::info('Starting daily report generation'))
    ->after(fn () => Log::info('Daily report generation completed'))
    ->onFailure(fn () => app(AlertService::class)->critical('Daily report failed'))
    ->appendOutputTo(storage_path('logs/reports.log'));

// Conditional scheduling
Schedule::command('telescope:prune --hours=48')
    ->daily()
    ->when(fn () => config('telescope.enabled'))
    ->environments(['production', 'staging']);

// High-frequency jobs
Schedule::command('queue:monitor redis:default --max=100')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Custom schedule expressions
Schedule::command('cache:prune-stale-tags')
    ->cron('0 */4 * * *') // every 4 hours
    ->runInBackground();
```

```php
<?php

declare(strict_types=1);

// Invokable scheduled task (non-command)
use Illuminate\Support\Facades\Schedule;

Schedule::call(function (): void {
    $expiredSessions = DB::table('sessions')
        ->where('last_activity', '<', now()->subHours(24))
        ->delete();

    Log::info("Cleaned {$expiredSessions} expired sessions");
})->hourly()->name('cleanup:expired-sessions');
```

**Key Points**:
- `withoutOverlapping()` — prevents concurrent execution (uses cache lock)
- `onOneServer()` — only runs on one server in multi-server deployments (requires cache)
- `environments()` — restrict schedule to specific environments
- `before()/after()/onFailure()` — lifecycle hooks for monitoring
- Use `runInBackground()` for long-running tasks to avoid blocking scheduler
- Schedule requires cron entry: `* * * * * php artisan schedule:run >> /dev/null 2>&1`

---

### Pattern 306.5: Command Testing

**Category**: Testing
**Description**: Test Artisan commands — output assertions, exit codes, and interactive prompts.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Commands;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderCleanupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PurgeExpiredOrdersCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_purges_expired_orders(): void
    {
        // Arrange
        Order::factory()->expired(days: 31)->count(5)->create();
        Order::factory()->active()->count(3)->create();

        // Act & Assert
        $this->artisan('orders:purge-expired', ['--days' => 30])
            ->expectsOutputToContain('Processed: 5, Deleted: 5')
            ->assertExitCode(0);

        $this->assertDatabaseCount('orders', 3);
    }

    public function test_dry_run_does_not_delete(): void
    {
        Order::factory()->expired(days: 31)->count(5)->create();

        $this->artisan('orders:purge-expired', ['--dry-run' => true])
            ->expectsOutputToContain('DRY RUN')
            ->assertExitCode(0);

        $this->assertDatabaseCount('orders', 5); // nothing deleted
    }

    public function test_returns_failure_on_errors(): void
    {
        // Mock service to simulate error
        $this->mock(OrderCleanupService::class, function ($mock) {
            $mock->shouldReceive('purgeExpired')
                ->andReturn(new CleanupResult(processed: 10, deleted: 5, errors: 3));
        });

        $this->artisan('orders:purge-expired')
            ->expectsOutputToContain('Errors: 3')
            ->assertExitCode(1); // FAILURE
    }

    public function test_confirmation_prompt(): void
    {
        Order::factory()->expired(days: 31)->count(3)->create();

        $this->artisan('users:audit', ['--fix' => true])
            ->expectsConfirmation('Apply fixes to all issues?', 'yes')
            ->expectsOutputToContain('issues fixed')
            ->assertExitCode(0);
    }

    public function test_table_output(): void
    {
        User::factory()->create(['email' => null]);

        $this->artisan('users:audit')
            ->expectsTable(
                headers: ['User ID', 'Field', 'Problem', 'Suggestion'],
                rows: [
                    [1, 'email', 'Missing email', 'Require email on next login'],
                ],
            )
            ->assertExitCode(0);
    }

    public function test_export_with_invalid_format(): void
    {
        $this->artisan('users:export', ['format' => 'invalid'])
            ->expectsOutputToContain('Invalid format')
            ->assertExitCode(1);
    }
}
```

**Key Points**:
- `$this->artisan()` — fluent API for command testing
- `expectsOutputToContain()` — assert partial output match
- `expectsConfirmation()` — simulate interactive prompt response
- `expectsTable()` — assert table output with headers and rows
- `assertExitCode()` — verify SUCCESS (0) or FAILURE (1)
- Use `RefreshDatabase` for commands that modify data

---

### Pattern 306.6: Closure Commands

**Category**: Lightweight Commands
**Description**: Define simple commands as closures in routes/console.php — no class needed.

```php
<?php

declare(strict_types=1);

// routes/console.php
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

// Simple closure command — no class file needed
Artisan::command(
    signature: 'app:health-check',
    callback: function (): void {
        /** @var \Illuminate\Console\Command $this */
        $checks = [
            'Database' => fn () => DB::connection()->getPdo() !== null,
            'Cache' => fn () => cache()->set('health', true, 10) && cache()->get('health'),
            'Storage' => fn () => is_writable(storage_path()),
        ];

        $allPassed = true;
        foreach ($checks as $name => $check) {
            try {
                $passed = $check();
                $this->components->twoColumnDetail($name, $passed ? '<fg=green>OK</>' : '<fg=red>FAIL</>');
                if (!$passed) $allPassed = false;
            } catch (\Throwable $e) {
                $this->components->twoColumnDetail($name, "<fg=red>ERROR: {$e->getMessage()}</>");
                $allPassed = false;
            }
        }

        $this->newLine();
        $allPassed
            ? $this->components->info('All health checks passed.')
            : $this->components->error('Some health checks failed.');
    },
)->purpose('Run application health checks');

// Closure command with arguments
Artisan::command(
    signature: 'cache:warm {key?} {--ttl=3600 : Cache TTL in seconds}',
    callback: function (): void {
        /** @var \Illuminate\Console\Command $this */
        $key = $this->argument('key');
        $ttl = (int) $this->option('ttl');

        if ($key) {
            $this->components->info("Warming cache for key: {$key}");
            app(CacheWarmer::class)->warmKey($key, $ttl);
        } else {
            $this->components->info('Warming all cacheable keys...');
            $count = app(CacheWarmer::class)->warmAll($ttl);
            $this->components->info("{$count} cache keys warmed.");
        }
    },
)->purpose('Warm application cache');

// Scheduled closure
Artisan::command('maintenance:cleanup-temp', function (): void {
    /** @var \Illuminate\Console\Command $this */
    $deleted = File::cleanDirectory(storage_path('app/temp'));
    $this->components->info('Temporary files cleaned up.');
})->purpose('Clean temporary files');
```

**Key Points**:
- Closure commands live in `routes/console.php` — no class file needed
- `$this` is bound to `Illuminate\Console\Command` instance inside the closure
- Use `->purpose()` to set the description shown in `artisan list`
- Best for simple utilities, health checks, cache warming — under 20 lines of logic
- For complex commands (>20 lines, needs DI, needs testing): use a Command class instead
- Closure commands support the same signature syntax as class-based commands

---

## Best Practices

- **Return exit codes** — `self::SUCCESS` (0) and `self::FAILURE` (1) for script integration
- **Inject via handle()** — method injection in handle() for clean dependency access
- **Use components API** — `$this->components->info/warn/error()` for consistent styling
- **Progress bars for bulk ops** — show progress for operations processing >100 records
- **Dry-run option** — every destructive command should support `--dry-run`
- **withoutOverlapping()** — prevent concurrent execution of scheduled commands
- **onOneServer()** — critical for multi-server deployments to avoid duplicate runs
- **Test commands thoroughly** — verify output, exit codes, and data changes
- **Closure for simple, class for complex** — keep routes/console.php lean
- **Log scheduled task results** — `appendOutputTo()` or lifecycle hooks for observability

---

## Abnormal Case Patterns

1. **Command timeout on large dataset** — command runs out of memory or hits PHP max_execution_time. Fix: use `cursor()` for memory-efficient iteration, increase `--chunk` size option, set timeout in command.

2. **Schedule overlap** — long-running command overlaps with next scheduled run, causing duplicate processing. Fix: add `withoutOverlapping()` with appropriate expiration.

3. **Missing schedule cron entry** — scheduler never runs because system cron is not configured. Fix: add `* * * * * php artisan schedule:run >> /dev/null 2>&1` to crontab.

4. **Closure command testing** — cannot mock dependencies in closure commands. Fix: use class-based commands for anything that needs DI mocking in tests.

5. **Interactive command in CI** — command expects confirmation prompt but runs non-interactively. Fix: use `--no-interaction` flag or `$this->option('no-interaction')` guard.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (306.1–306.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Artisan Command Specialist — Core | EPS v3.2*
