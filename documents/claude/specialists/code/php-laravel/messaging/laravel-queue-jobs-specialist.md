# Laravel Queue Jobs Specialist — Messaging
# Laravelキュージョブスペシャリスト — メッセージング
# Chuyen Gia Queue Jobs Laravel — Messaging

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Queue System
**Aspect**: Queue Jobs
**Category**: messaging
**Purpose**: Knowledge provider for Laravel queue job architecture — dispatching, middleware, batching, chaining, failure handling, unique/rate-limited jobs

---

## Metadata

```json
{
  "id": "laravel-queue-jobs-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Queue System",
  "aspect": "Queue Jobs",
  "category": "messaging",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 queue system — ShouldQueue contract, dispatch lifecycle",
    "E2: Job middleware — rate limiting, preventing overlaps, throttling",
    "E3: Job batching and chaining — Bus::batch(), Bus::chain() orchestration",
    "E4: Failed job handling — retry, backoff, dead letter strategies"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 338.1–338.8 |
| **Directory Pattern** | `app/Jobs/` |
| **Naming Convention** | `{Action}{Entity}Job.php` |
| **Imports From** | Domain (services, models), Infrastructure (external APIs) |
| **Imported By** | Application (controllers, commands), Domain (event listeners) |
| **Cannot Import** | Presentation (views, responses) |
| **Dependencies** | `laravel/framework` (queue component) |
| **When To Use** | Async processing — emails, reports, imports, API calls, heavy computation |
| **Source Skeleton** | `app/Jobs/{Action}{Entity}Job.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel queue job lifecycle — dispatching, middleware, batching, chaining, failure strategies |
| **Activation Trigger** | files: `app/Jobs/*.php`; keywords: dispatch, ShouldQueue, job, queue, batch, chain |

---

## Role

You are a **Laravel Queue Jobs Specialist**. Your responsibility is to provide best practices for Laravel 11 queue job architecture — job class design, async dispatching via ShouldQueue, job middleware for cross-cutting concerns, batching/chaining for orchestration, and failure handling strategies.

**Used by**: Any code agent working with asynchronous job processing in Laravel
**Not used by**: Non-Laravel stacks, synchronous-only applications

---

## Patterns

### Pattern 338.1: Job Class Basics

**Category**: Job Fundamentals
**Description**: Basic job class structure with constructor injection and handle() method following Laravel 11 conventions.

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class GenerateInvoiceJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Order $order,
    ) {}

    public function handle(InvoiceService $invoiceService): void
    {
        $invoiceService->generate(order: $this->order);
    }
}
```

**Key Points**:
- Laravel 11 uses `Queueable` trait (replaces older `Dispatchable`, `InteractsWithQueue`, `SerializesModels` combo)
- Constructor accepts serializable data — Eloquent models are serialized by ID automatically
- `handle()` supports method injection from the container
- Mark job classes `final` unless extension is explicitly designed
- Dispatch via `GenerateInvoiceJob::dispatch($order)` or `dispatch(new GenerateInvoiceJob($order))`

---

### Pattern 338.2: Queued Jobs (ShouldQueue)

**Category**: Async Dispatching
**Description**: Configuring queue connection, queue name, delay, and dispatch conditions.

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\User;
use App\Services\WelcomeEmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class SendWelcomeEmailJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $maxExceptions = 2;
    public int $timeout = 60;

    public function __construct(
        public readonly User $user,
    ) {
        $this->onQueue(queue: 'emails');
        $this->onConnection(connection: 'redis');
        $this->delay(delay: now()->addMinutes(5));
    }

    public function handle(WelcomeEmailService $service): void
    {
        $service->send(user: $this->user);
    }

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [10, 30, 60]; // seconds between retries
    }
}
```

**Key Points**:
- `$tries` — max attempts before marking failed; `$maxExceptions` — max exceptions allowed
- `$timeout` — max seconds the job can run (requires `pcntl` extension)
- `onQueue()` / `onConnection()` — route to specific queues and connections
- `backoff()` returns array for exponential backoff strategy
- Use `delay()` for deferred execution (e.g., wait before sending welcome emails)

---

### Pattern 338.3: Job Middleware

**Category**: Cross-Cutting Concerns
**Description**: Job middleware for rate limiting, overlap prevention, and custom pre/post processing.

```php
<?php

declare(strict_types=1);

namespace App\Jobs\Middleware;

use Closure;
use Illuminate\Support\Facades\Redis;

final class RateLimitedMiddleware
{
    public function __construct(
        private readonly string $key,
        private readonly int $maxAttempts = 10,
        private readonly int $decaySeconds = 60,
    ) {}

    public function handle(object $job, Closure $next): void
    {
        Redis::throttle(name: $this->key)
            ->allow(maxLocks: $this->maxAttempts)
            ->every(seconds: $this->decaySeconds)
            ->then(
                callback: fn () => $next($job),
                failure: fn () => $job->release(delay: $this->decaySeconds),
            );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Jobs\Middleware\RateLimitedMiddleware;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

final class SyncExternalDataJob implements ShouldQueue
{
    use Queueable;

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [
            new WithoutOverlapping(key: 'sync-external-' . $this->tenantId),
            new RateLimitedMiddleware(key: 'external-api', maxAttempts: 5),
        ];
    }

    public function __construct(
        public readonly int $tenantId,
    ) {}

    public function handle(): void
    {
        // Sync logic here
    }
}
```

**Key Points**:
- `middleware()` method returns array of middleware instances applied to the job
- `WithoutOverlapping` — prevents concurrent execution with same key (uses atomic locks)
- Custom middleware receives `$job` and `$next` closure — same pattern as HTTP middleware
- `$job->release()` re-queues the job with optional delay when rate limited
- Built-in: `WithoutOverlapping`, `ThrottlesExceptions`, `Skip`

---

### Pattern 338.4: Job Batching

**Category**: Orchestration
**Description**: Group multiple jobs into a batch with progress tracking, completion/failure callbacks.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\ProcessCsvRowJob;
use Illuminate\Bus\Batch;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Bus;
use Throwable;

final class ImportController extends Controller
{
    public function import(): JsonResponse
    {
        $rows = $this->parseCsvRows();

        $batch = Bus::batch(
            jobs: collect($rows)->map(
                fn (array $row) => new ProcessCsvRowJob(data: $row),
            )->toArray(),
        )
            ->name('csv-import-' . now()->timestamp)
            ->allowFailures()
            ->onQueue(queue: 'imports')
            ->then(function (Batch $batch): void {
                // All jobs completed successfully
                logger()->info('Batch completed', ['id' => $batch->id]);
            })
            ->catch(function (Batch $batch, Throwable $e): void {
                // First batch job failure detected
                logger()->error('Batch failure', ['id' => $batch->id, 'error' => $e->getMessage()]);
            })
            ->finally(function (Batch $batch): void {
                // Batch finished (success or failure)
                logger()->info('Batch finished', ['id' => $batch->id, 'failed' => $batch->failedJobs]);
            })
            ->dispatch();

        return response()->json(data: ['batch_id' => $batch->id]);
    }
}
```

**Key Points**:
- `Bus::batch()` groups jobs with shared progress tracking and callbacks
- `allowFailures()` — continue processing even if some jobs fail
- `then()` / `catch()` / `finally()` — lifecycle callbacks for batch completion
- Track progress via `$batch->progress()`, `$batch->pendingJobs`, `$batch->failedJobs`
- Requires `job_batches` table — run `php artisan queue:batches-table`
- Jobs in a batch can add more jobs via `$this->batch()->add([new ExtraJob()])`

---

### Pattern 338.5: Job Chaining

**Category**: Orchestration
**Description**: Execute jobs sequentially — each job runs only after the previous completes successfully.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\DownloadReportDataJob;
use App\Jobs\GenerateReportPdfJob;
use App\Jobs\NotifyReportReadyJob;
use App\Models\Report;
use Illuminate\Support\Facades\Bus;

final class ReportOrchestrator
{
    public function generateReport(Report $report): void
    {
        Bus::chain(chain: [
            new DownloadReportDataJob(report: $report),
            new GenerateReportPdfJob(report: $report),
            new NotifyReportReadyJob(report: $report),
        ])
            ->onQueue(queue: 'reports')
            ->catch(function (\Throwable $e) use ($report): void {
                $report->update(['status' => 'failed']);
                logger()->error('Report chain failed', [
                    'report_id' => $report->id,
                    'error' => $e->getMessage(),
                ]);
            })
            ->dispatch();
    }
}
```

**Key Points**:
- `Bus::chain()` ensures sequential execution — if any job fails, remaining jobs are skipped
- `catch()` handles failure at any point in the chain
- Each job in chain must complete successfully before next is dispatched
- Combine with batching: batch of chains for parallel-then-sequential workflows
- Chain jobs should be idempotent — retries may re-execute from a mid-chain failure

---

### Pattern 338.6: Failed Job Handling

**Category**: Reliability
**Description**: Configure failure strategies — retry, dead letter, cleanup, and monitoring.

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Payment;
use App\Services\PaymentGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\MaxAttemptsExceededException;
use Throwable;

final class ProcessPaymentJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;
    public int $timeout = 30;

    public function __construct(
        public readonly Payment $payment,
    ) {
        $this->onQueue(queue: 'payments');
    }

    public function handle(PaymentGateway $gateway): void
    {
        $gateway->charge(payment: $this->payment);
        $this->payment->update(['status' => 'completed']);
    }

    public function failed(?Throwable $exception): void
    {
        $this->payment->update(['status' => 'failed']);

        if ($exception instanceof MaxAttemptsExceededException) {
            logger()->critical('Payment permanently failed after max retries', [
                'payment_id' => $this->payment->id,
                'attempts' => $this->attempts(),
            ]);
        }

        // Notify ops team
        // Notification::route('slack', config('services.slack.ops_channel'))
        //     ->notify(new PaymentFailedNotification($this->payment));
    }

    public function retryUntil(): \DateTime
    {
        return now()->addHours(6);
    }
}
```

**Key Points**:
- `failed()` method is called after all retries exhausted — last chance for cleanup
- `retryUntil()` — time-based retry window (alternative to `$tries` count)
- Failed jobs stored in `failed_jobs` table — inspect via `php artisan queue:failed`
- `php artisan queue:retry {id}` to re-dispatch a specific failed job
- Combine `$tries` with `backoff()` for progressive retry intervals

---

### Pattern 338.7: Unique Jobs

**Category**: Deduplication
**Description**: Prevent duplicate jobs from being pushed to the queue using ShouldBeUnique.

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Product;
use App\Services\SearchIndexService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class UpdateSearchIndexJob implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $uniqueFor = 300; // seconds

    public function __construct(
        public readonly Product $product,
    ) {}

    public function uniqueId(): string
    {
        return 'search-index-' . $this->product->id;
    }

    public function handle(SearchIndexService $indexService): void
    {
        $indexService->reindex(product: $this->product);
    }

    /**
     * Unique lock released only after job completes.
     * Use ShouldBeUniqueUntilProcessing to release when processing starts.
     */
}
```

**Key Points**:
- `ShouldBeUnique` — prevents duplicate jobs with same `uniqueId()` from entering the queue
- `$uniqueFor` — lock duration in seconds; prevents re-dispatch within this window
- `uniqueId()` — defines the uniqueness key (defaults to class name)
- `ShouldBeUniqueUntilProcessing` — releases lock when job starts processing (allows re-queue)
- Requires a cache driver supporting atomic locks (Redis, Memcached, DynamoDB)

---

### Pattern 338.8: Rate Limited Jobs

**Category**: Throttling
**Description**: Limit job execution throughput using Laravel rate limiter or Redis throttle.

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Tenant;
use App\Services\ExternalApiClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\RateLimiter;

final class CallExternalApiJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 10;

    public function __construct(
        public readonly Tenant $tenant,
        public readonly array $payload,
    ) {}

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [
            new RateLimited(limiterName: 'external-api'),
        ];
    }

    public function handle(ExternalApiClient $client): void
    {
        $client->sendData(
            tenantId: $this->tenant->id,
            payload: $this->payload,
        );
    }

    /**
     * Register rate limiter in AppServiceProvider::boot()
     *
     * RateLimiter::for('external-api', function (object $job) {
     *     return Limit::perMinute(maxAttempts: 30);
     * });
     */
}
```

**Key Points**:
- `RateLimited` middleware references a named rate limiter defined in a service provider
- When rate limited, job is released back to queue with delay — counts against `$tries`
- Set high `$tries` to accommodate rate-limit releases (each release = 1 attempt)
- Define limiters in `AppServiceProvider::boot()` using `RateLimiter::for()`
- For per-tenant throttling, use `Limit::perMinute(30)->by($job->tenant->id)`

---

## Best Practices

- **Keep jobs small and focused** — one job, one responsibility; compose via chains and batches
- **Make jobs idempotent** — safe to retry without side effects (check state before acting)
- **Serialize minimal data** — pass IDs or value objects, not large collections or file contents
- **Use typed properties** — PHP 8.3 readonly properties for immutable job payloads
- **Configure timeouts** — always set `$timeout` to prevent zombie workers
- **Monitor queue depth** — alert when pending jobs exceed threshold (Horizon, CloudWatch)
- **Separate queues by priority** — `payments` queue with dedicated workers vs `emails` queue
- **Test jobs synchronously** — use `Queue::fake()` for dispatch assertions, sync driver for integration tests
- **Avoid model closures** — closures cannot be serialized; use dedicated job classes

---

## Abnormal Case Patterns

1. **Unserializable constructor arguments** — passing closures, file handles, or database connections to job constructor. Fix: pass only primitive types, DTOs, or Eloquent models (serialized by ID).

2. **Missing model on deserialization** — model deleted between dispatch and processing. Fix: use `DeleteWhenMissingModels` trait or handle `ModelNotFoundException` in `handle()`.

3. **Infinite retry loop** — job keeps failing and retrying without backoff. Fix: set `$tries` + `backoff()` array, or use `retryUntil()` with a time ceiling.

4. **Queue worker memory leak** — long-running workers accumulate memory. Fix: use `--max-jobs=1000` or `--max-time=3600` flags; let supervisor restart workers.

5. **Batch job adding to cancelled batch** — calling `$this->batch()->add()` after batch is cancelled. Fix: check `$this->batch()->cancelled()` before adding jobs.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (338.1–338.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Queue Jobs Specialist — Messaging | EPS v3.2*
