# Laravel Auditing Specialist — Cross-Cutting
# Laravel監査スペシャリスト — 横断的関心事
# Chuyen Gia Kiem Toan Laravel — Cat Ngang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Auditing
**Aspect**: Auditing
**Category**: cross-cutting
**Purpose**: Knowledge provider for Laravel auditing patterns — activity logging, model auditing, user action tracking, audit trail queries, retention policies, and audit testing

---

## Metadata

```json
{
  "id": "laravel-auditing-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Auditing",
  "aspect": "Auditing",
  "category": "cross-cutting",
  "subcategory": "php-laravel",
  "lines": 410,
  "token_cost": 2750,
  "version": "1.0.0",
  "evidence": [
    "E1: spatie/laravel-activitylog — structured activity logging with model changes",
    "E2: Eloquent model events — created/updated/deleted hooks for audit triggers",
    "E3: Audit trail retention — GDPR/compliance-driven data lifecycle management"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 330.1–330.6 |
| **Directory Pattern** | `app/Models/Traits/`, `app/Services/Audit/` |
| **Naming Convention** | `{Entity}AuditTrait.php`, `AuditService.php` |
| **Imports From** | Domain (models), Application (auth context) |
| **Imported By** | Infrastructure (reporting), Application (admin dashboards) |
| **Cannot Import** | Presentation (controllers, views) |
| **Dependencies** | `spatie/laravel-activitylog` |
| **When To Use** | Applications requiring change tracking, compliance, user action history |
| **Source Skeleton** | `config/activitylog.php`, `app/Models/Traits/LogsActivityTrait.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel auditing — activity logging, model change tracking, audit queries, retention, testing |
| **Activation Trigger** | files: `config/activitylog.php`, `app/Models/Traits/*Audit*`; keywords: activitylog, audit, LogsActivity, activity_log |

---

## Role

You are a **Laravel Auditing Specialist**. Your responsibility is to provide best practices for Laravel 11 auditing — activity logging with spatie/activitylog, model change tracking, user action audit trails, audit querying and filtering, data retention policies, and audit testing strategies.

**Used by**: Any code agent working with Laravel audit trails, compliance logging, or change tracking
**Not used by**: Non-Laravel stacks, applications without audit requirements

---

## Patterns

### Pattern 330.1: Activity Logging (spatie/activitylog)

**Category**: Logging Fundamentals
**Description**: Setting up spatie/laravel-activitylog for structured activity recording.

```php
<?php

declare(strict_types=1);

// config/activitylog.php
return [
    'enabled' => env('ACTIVITY_LOG_ENABLED', true),

    'delete_records_older_than_days' => 365,

    'default_log_name' => 'default',

    'default_auth_driver' => null,

    'subject_returns_soft_deleted_models' => false,

    'activity_model' => \Spatie\Activitylog\Models\Activity::class,

    'table_name' => 'activity_log',
];
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Spatie\Activitylog\Facades\Activity;

final class AuditService
{
    public static function logAction(
        string $description,
        string $logName = 'user-actions',
        ?object $subject = null,
        array $properties = [],
    ): void {
        $logger = activity($logName)
            ->withProperties($properties);

        if ($subject !== null) {
            $logger->performedOn($subject);
        }

        $causedBy = auth()->user();
        if ($causedBy !== null) {
            $logger->causedBy($causedBy);
        }

        $logger->log($description);
    }
}
```

**Key Points**:
- Install via `composer require spatie/laravel-activitylog`
- Publish config: `php artisan vendor:publish --provider="Spatie\Activitylog\ActivitylogServiceProvider"`
- `activity()` helper creates log entries with subject, causer, and properties
- Configure `delete_records_older_than_days` for automatic cleanup

---

### Pattern 330.2: Model Auditing

**Category**: Change Tracking
**Description**: Automatic tracking of Eloquent model changes using the LogsActivity trait.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

final class Order extends Model
{
    use LogsActivity;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'status',
        'total_amount',
        'currency',
        'notes',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'total_amount', 'currency'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('order-changes')
            ->setDescriptionForEvent(fn (string $eventName): string =>
                "Order #{$this->id} was {$eventName}"
            );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

final class User extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'role'])
            ->logOnlyDirty()
            ->dontLogIfAttributesChangedOnly(['updated_at', 'last_login_at'])
            ->useLogName('user-changes');
    }
}
```

**Key Points**:
- Add `LogsActivity` trait and implement `getActivitylogOptions()` on models
- `logOnly()` restricts which attributes are tracked — exclude sensitive fields
- `logOnlyDirty()` records only changed attributes, not the full model
- `dontLogIfAttributesChangedOnly()` skips logging for timestamp-only changes

---

### Pattern 330.3: User Action Tracking

**Category**: Behavior Tracking
**Description**: Tracking user actions beyond model changes — logins, exports, API calls.

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\Failed;
use Spatie\Activitylog\Facades\Activity;

final class AuthAuditListener
{
    public function handleLogin(Login $event): void
    {
        activity('authentication')
            ->causedBy($event->user)
            ->withProperties([
                'ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'guard' => $event->guard,
            ])
            ->log('User logged in');
    }

    public function handleLogout(Logout $event): void
    {
        if ($event->user === null) {
            return;
        }

        activity('authentication')
            ->causedBy($event->user)
            ->withProperties([
                'ip' => request()->ip(),
            ])
            ->log('User logged out');
    }

    public function handleFailed(Failed $event): void
    {
        activity('authentication')
            ->withProperties([
                'ip' => request()->ip(),
                'email' => $event->credentials['email'] ?? 'unknown',
                'guard' => $event->guard,
            ])
            ->log('Failed login attempt');
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuditApiCallMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if ($request->user() !== null) {
            activity('api-access')
                ->causedBy($request->user())
                ->withProperties([
                    'method' => $request->method(),
                    'uri' => $request->getRequestUri(),
                    'status' => $response->getStatusCode(),
                    'ip' => $request->ip(),
                ])
                ->log("API call: {$request->method()} {$request->path()}");
        }

        return $response;
    }
}
```

**Key Points**:
- Listen to Laravel auth events (Login, Logout, Failed) for authentication auditing
- Record IP address and user agent for security audit trails
- Use middleware for API call tracking — captures method, URI, and status code
- Always record the causer (user) when available for traceability

---

### Pattern 330.4: Audit Trail Queries

**Category**: Querying
**Description**: Querying and filtering audit log entries for reporting and investigation.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Spatie\Activitylog\Models\Activity;

final class AuditQueryService
{
    /**
     * Get all activities for a specific model instance.
     */
    public function getModelHistory(string $modelClass, int $modelId): Collection
    {
        return Activity::query()
            ->where('subject_type', $modelClass)
            ->where('subject_id', $modelId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Get activities by a specific user within a date range.
     */
    public function getUserActivities(
        User $user,
        string $fromDate,
        string $toDate,
        int $perPage = 25,
    ): LengthAwarePaginator {
        return Activity::query()
            ->causedBy($user)
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Get activities by log name (category).
     */
    public function getByLogName(string $logName, int $limit = 100): Collection
    {
        return Activity::query()
            ->inLog($logName)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Get diff of model changes from an activity entry.
     *
     * @return array{old: array<string, mixed>, new: array<string, mixed>}
     */
    public function getChangeDiff(Activity $activity): array
    {
        return [
            'old' => $activity->properties->get('old', []),
            'new' => $activity->properties->get('attributes', []),
        ];
    }

    /**
     * Search audit logs by description keyword.
     */
    public function search(string $keyword, int $perPage = 25): LengthAwarePaginator
    {
        return Activity::query()
            ->where('description', 'LIKE', "%{$keyword}%")
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }
}
```

**Key Points**:
- `causedBy()` scope filters by the user who performed the action
- `inLog()` scope filters by log name (category)
- Properties contain `old` and `attributes` keys for model change diffs
- Always paginate audit queries — tables grow large over time

---

### Pattern 330.5: Audit Retention

**Category**: Data Lifecycle
**Description**: Retention policies for audit data — compliance, storage, and cleanup.

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Activitylog\Models\Activity;

final class CleanupAuditLogsCommand extends Command
{
    protected $signature = 'audit:cleanup
        {--days=365 : Number of days to retain}
        {--log= : Specific log name to clean}
        {--dry-run : Show what would be deleted without deleting}';

    protected $description = 'Clean up old audit log entries based on retention policy';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $logName = $this->option('log');
        $dryRun = (bool) $this->option('dry-run');

        $query = Activity::query()
            ->where('created_at', '<', now()->subDays($days));

        if ($logName !== null) {
            $query->inLog($logName);
        }

        $count = $query->count();

        if ($dryRun) {
            $this->info("Would delete {$count} audit records older than {$days} days.");
            return self::SUCCESS;
        }

        // Delete in chunks to avoid memory issues
        $deleted = 0;
        $query->chunkById(1000, function ($activities) use (&$deleted): void {
            $ids = $activities->pluck('id');
            Activity::whereIn('id', $ids)->delete();
            $deleted += $ids->count();
        });

        $this->info("Deleted {$deleted} audit records older than {$days} days.");

        return self::SUCCESS;
    }
}
```

```php
<?php

declare(strict_types=1);

// Schedule cleanup in routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('audit:cleanup --days=365')
    ->daily()
    ->at('02:00')
    ->withoutOverlapping()
    ->runInBackground();

// Different retention per log type
Schedule::command('audit:cleanup --days=90 --log=api-access')
    ->weekly()
    ->at('03:00');

Schedule::command('audit:cleanup --days=730 --log=authentication')
    ->monthly()
    ->at('04:00');
```

**Key Points**:
- Delete in chunks using `chunkById()` — avoid loading millions of records into memory
- Different retention periods per log category (API access: 90 days, auth: 2 years)
- Schedule cleanup during low-traffic hours with `withoutOverlapping()`
- Always provide `--dry-run` option for safe verification before deletion

---

### Pattern 330.6: Audit Testing

**Category**: Testing
**Description**: Testing audit log creation, model change tracking, and query accuracy.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Audit;

use App\Models\Order;
use App\Models\User;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

final class OrderAuditTest extends TestCase
{
    public function test_order_creation_is_logged(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $order = Order::factory()->create([
            'status' => 'pending',
            'total_amount' => 99.99,
        ]);

        $activity = Activity::query()
            ->inLog('order-changes')
            ->where('subject_type', Order::class)
            ->where('subject_id', $order->id)
            ->latest()
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals('created', $activity->event);
        $this->assertEquals($user->id, $activity->causer_id);
    }

    public function test_order_status_change_records_old_and_new(): void
    {
        $order = Order::factory()->create(['status' => 'pending']);

        $order->update(['status' => 'confirmed']);

        $activity = Activity::query()
            ->inLog('order-changes')
            ->where('subject_id', $order->id)
            ->where('event', 'updated')
            ->latest()
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals('pending', $activity->properties['old']['status']);
        $this->assertEquals('confirmed', $activity->properties['attributes']['status']);
    }

    public function test_timestamp_only_change_is_not_logged(): void
    {
        $user = User::factory()->create();

        $initialCount = Activity::query()->inLog('user-changes')->count();

        $user->update(['updated_at' => now()]);

        $newCount = Activity::query()->inLog('user-changes')->count();

        $this->assertEquals($initialCount, $newCount);
    }

    public function test_failed_login_is_audited(): void
    {
        $this->post('/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrong-password',
        ]);

        $activity = Activity::query()
            ->inLog('authentication')
            ->where('description', 'Failed login attempt')
            ->latest()
            ->first();

        $this->assertNotNull($activity);
        $this->assertEquals(
            'nonexistent@example.com',
            $activity->properties['email'],
        );
    }

    public function test_audit_cleanup_removes_old_records(): void
    {
        // Create old activity
        Activity::factory()->create([
            'created_at' => now()->subDays(400),
            'log_name' => 'test-log',
        ]);

        // Create recent activity
        $recent = Activity::factory()->create([
            'created_at' => now()->subDays(10),
            'log_name' => 'test-log',
        ]);

        $this->artisan('audit:cleanup', ['--days' => 365, '--log' => 'test-log'])
            ->assertSuccessful();

        $this->assertDatabaseHas('activity_log', ['id' => $recent->id]);
        $this->assertEquals(1, Activity::query()->inLog('test-log')->count());
    }
}
```

**Key Points**:
- Assert activity records exist after model changes with correct event type
- Verify `old` and `attributes` in properties for change diff accuracy
- Test that excluded attributes (timestamps) do not trigger audit entries
- Test cleanup commands with both old and recent records to verify retention

---

## Best Practices

- **Log selectively** — only track attributes that matter for audit compliance
- **Exclude sensitive fields** — never log passwords, tokens, or encryption keys
- **Use log names** — categorize activities (authentication, order-changes, api-access) for filtering
- **Record the causer** — always associate activities with the user who performed them
- **Chunk deletions** — never `DELETE FROM activity_log WHERE created_at < ...` without chunking
- **Different retention per category** — security logs need longer retention than API access logs
- **Index the activity_log table** — add indexes on `subject_type`, `causer_id`, `created_at`
- **Test audit completeness** — verify both presence and absence of expected audit entries

---

## Abnormal Case Patterns

1. **Activity log table grows to millions of rows** — no cleanup scheduled, queries become slow. Fix: implement scheduled cleanup with `chunkById()`, add database indexes.

2. **Sensitive data in audit properties** — password changes logged with old/new values. Fix: exclude sensitive fields in `logOnly()`, never log credential fields.

3. **Circular audit logging** — updating Activity model triggers another activity log entry. Fix: `Activity` model should not use `LogsActivity` trait.

4. **Missing causer on queued actions** — queued jobs lose auth context, activities have null causer. Fix: pass user ID explicitly and use `causedBy()` in queue handlers.

5. **Audit log inconsistency in transactions** — activity created but transaction rolls back, leaving orphan audit entry. Fix: use `afterCommit()` on queued listeners or log after successful commit.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (330.1–330.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Auditing Specialist — Cross-Cutting | EPS v3.2*
