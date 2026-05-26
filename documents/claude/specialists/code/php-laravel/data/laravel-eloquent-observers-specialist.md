# Laravel Eloquent Observers Specialist — Data
# Laravel Eloquentオブザーバスペシャリスト — データ
# Chuyen Gia Eloquent Observers Laravel — Du Lieu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Eloquent Observers
**Aspect**: Model Observers & Events
**Category**: data
**Purpose**: Knowledge provider for Laravel observer architecture — observer class, model events, ObservedBy attribute registration, event silencing, queued observers, and observer testing

---

## Metadata

```json
{
  "id": "laravel-eloquent-observers-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Eloquent Observers",
  "aspect": "Model Observers & Events",
  "category": "data",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 ObservedBy attribute — declarative observer registration on model class",
    "E2: Model event lifecycle — creating/created/updating/updated/deleting/deleted/restoring/restored",
    "E3: withoutEvents/saveQuietly — suppress observer execution for bulk operations"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 323.1–323.6 |
| **Directory Pattern** | `app/Observers/` |
| **Naming Convention** | `{Entity}Observer.php` |
| **Imports From** | Domain (models, events), Application (services, notifications) |
| **Imported By** | Framework (auto-registered via ObservedBy or ServiceProvider) |
| **Cannot Import** | Controllers, Requests |
| **Dependencies** | `illuminate/database` |
| **When To Use** | Reacting to model lifecycle events — audit logging, cache invalidation, notifications, computed fields |
| **Source Skeleton** | `app/Observers/{Entity}Observer.php` |
| **Specialist Type** | code |
| **Purpose** | Observer patterns — observer class, model events, ObservedBy attribute, event silencing, queued observers, testing |
| **Activation Trigger** | files: `app/Observers/*.php`; keywords: Observer, ObservedBy, creating, created, updating, deleted, withoutEvents, saveQuietly |

---

## Role

You are a **Laravel Eloquent Observers Specialist**. Your responsibility is to provide best practices for PHP 8.3 + Laravel 11 model observers — observer class structure, model event lifecycle, observer registration via ObservedBy attribute, event silencing for bulk operations, queued observers for async processing, and observer testing strategies.

**Used by**: Any code agent implementing model lifecycle hooks in Laravel
**Not used by**: Non-Laravel stacks, projects not using Eloquent model events

---

## Patterns

### Pattern 323.1: Observer Class

**Category**: Observer Structure
**Description**: Full observer class handling multiple model lifecycle events with single-responsibility methods.

```php
<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Order;
use App\Services\AuditLogService;
use App\Services\InventoryService;
use App\Notifications\OrderStatusNotification;
use Illuminate\Support\Str;

final readonly class OrderObserver
{
    public function __construct(
        private AuditLogService $auditLog,
        private InventoryService $inventory,
    ) {}

    /**
     * Before INSERT — set defaults, generate identifiers.
     */
    public function creating(Order $order): void
    {
        $order->reference_number ??= 'ORD-' . strtoupper(Str::random(10));
        $order->status ??= 'pending';
    }

    /**
     * After INSERT — side effects that need the model's ID.
     */
    public function created(Order $order): void
    {
        $this->auditLog->log(
            model: $order,
            action: 'created',
            changes: $order->getAttributes(),
        );
    }

    /**
     * After UPDATE — react to specific field changes.
     */
    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            $this->auditLog->log(
                model: $order,
                action: 'status_changed',
                changes: [
                    'from' => $order->getOriginal('status'),
                    'to' => $order->status,
                ],
            );

            $order->user->notify(new OrderStatusNotification($order));
        }
    }

    /**
     * Before DELETE — validate business rules, cleanup.
     */
    public function deleting(Order $order): bool
    {
        if ($order->status === 'shipped') {
            return false; // Prevent deletion of shipped orders
        }

        // Release reserved inventory
        $this->inventory->releaseReservation($order);

        return true;
    }

    /**
     * After DELETE — cleanup related data.
     */
    public function deleted(Order $order): void
    {
        $this->auditLog->log(
            model: $order,
            action: 'deleted',
            changes: $order->getAttributes(),
        );
    }
}
```

**Key Points**:
- Observers are resolved from the container — inject dependencies via constructor
- `creating`/`updating`/`deleting` fire BEFORE the operation — can modify or prevent it
- `created`/`updated`/`deleted` fire AFTER — model has been persisted
- Return `false` from `creating`/`updating`/`deleting` to cancel the operation
- `wasChanged('field')` checks if a field was actually modified in this save

---

### Pattern 323.2: Model Events — Full Lifecycle

**Category**: Event Lifecycle
**Description**: Complete model event lifecycle with all available hooks and their firing order.

```php
<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\User;

final class UserObserver
{
    // === PERSISTENCE LIFECYCLE ===

    public function retrieved(User $user): void
    {
        // Fires when model is retrieved from DB (SELECT)
        // Use sparingly — fires on EVERY query
    }

    public function creating(User $user): void
    {
        // Before INSERT — set defaults
        $user->uuid ??= (string) \Illuminate\Support\Str::uuid();
    }

    public function created(User $user): void
    {
        // After INSERT — send welcome email, create profile
    }

    public function updating(User $user): void
    {
        // Before UPDATE — validate changes
    }

    public function updated(User $user): void
    {
        // After UPDATE — sync external systems
        if ($user->wasChanged('email')) {
            // Trigger email verification
        }
    }

    public function saving(User $user): void
    {
        // Before INSERT or UPDATE — normalize data
        $user->email = mb_strtolower($user->email);
    }

    public function saved(User $user): void
    {
        // After INSERT or UPDATE — cache invalidation
        \Illuminate\Support\Facades\Cache::forget("user:{$user->id}");
    }

    // === DELETION LIFECYCLE ===

    public function deleting(User $user): void
    {
        // Before DELETE — cascade soft deletes to children
        $user->orders()->delete();
    }

    public function deleted(User $user): void
    {
        // After DELETE — cleanup external resources
    }

    // === SOFT DELETE LIFECYCLE ===

    public function restoring(User $user): void
    {
        // Before restoring soft-deleted model
    }

    public function restored(User $user): void
    {
        // After restoring — re-activate related records
        $user->orders()->withTrashed()->restore();
    }

    public function forceDeleting(User $user): void
    {
        // Before permanent deletion — final cleanup
    }

    public function forceDeleted(User $user): void
    {
        // After permanent deletion
    }

    // === RELATIONSHIP LIFECYCLE ===

    public function replicating(User $user): void
    {
        // When model is cloned via replicate() — clear unique fields
        $user->uuid = null;
        $user->email_verified_at = null;
    }
}
```

**Key Points**:
- `saving`/`saved` fire on both create and update — use for common logic
- `retrieved` fires on every SELECT — expensive; use only for audit or caching
- `forceDeleting`/`forceDeleted` fire only on `forceDelete()`, not `delete()`
- `replicating` fires when `$model->replicate()` is called — clear unique fields
- Event order: saving → creating → created → saved (for new models)

---

### Pattern 323.3: Observer Registration — ObservedBy Attribute (Laravel 11)

**Category**: Registration
**Description**: Declarative observer registration using PHP 8.3 attributes on the model class.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Observers\OrderObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;

#[ObservedBy(OrderObserver::class)]
final class Order extends Model
{
    protected $fillable = ['user_id', 'reference_number', 'total_amount', 'status'];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

// Alternative: Multiple observers on one model
namespace App\Models;

use App\Observers\AuditObserver;
use App\Observers\CacheObserver;
use App\Observers\OrderObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;

#[ObservedBy([OrderObserver::class, AuditObserver::class, CacheObserver::class])]
final class Order extends Model
{
    protected $fillable = ['user_id', 'reference_number', 'total_amount', 'status'];
}
```

```php
<?php

declare(strict_types=1);

// Legacy approach: Register in ServiceProvider (still valid)
namespace App\Providers;

use App\Models\Order;
use App\Observers\OrderObserver;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Order::observe(OrderObserver::class);
    }
}
```

**Key Points**:
- `#[ObservedBy]` attribute is the Laravel 11 preferred approach — co-located with model
- Pass array for multiple observers: `#[ObservedBy([Observer1::class, Observer2::class])]`
- Observers fire in registration order — first registered, first executed
- Legacy `Model::observe()` in ServiceProvider still works in Laravel 11
- `php artisan make:observer OrderObserver --model=Order` generates observer with stubs

---

### Pattern 323.4: Event Silencing

**Category**: Bulk Operations
**Description**: Suppress observer events for bulk operations, imports, and migration scripts.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\User;

final readonly class BulkOperationService
{
    /**
     * Method 1: withoutEvents — suppress all model events in closure.
     */
    public function bulkImport(array $products): int
    {
        return Product::withoutEvents(function () use ($products): int {
            $count = 0;
            foreach ($products as $data) {
                Product::create($data);
                $count++;
            }
            return $count;
        });
    }

    /**
     * Method 2: saveQuietly — suppress events for single model save.
     */
    public function adminOverride(User $user, array $data): void
    {
        $user->fill($data);
        $user->saveQuietly(); // No creating/created/updating/updated events
    }

    /**
     * Method 3: deleteQuietly — suppress events for single delete.
     */
    public function purgeUser(User $user): void
    {
        $user->deleteQuietly(); // No deleting/deleted events
    }

    /**
     * Method 4: Mass operations bypass events by default.
     * These NEVER fire model events (use intentionally):
     */
    public function massUpdate(): void
    {
        // No events fired — direct query builder
        Product::query()
            ->where('category', 'seasonal')
            ->update(['is_active' => false]);

        // No events fired — bulk insert
        Product::insert([
            ['name' => 'A', 'price' => 10],
            ['name' => 'B', 'price' => 20],
        ]);

        // No events fired — bulk delete
        Product::query()
            ->where('stock_quantity', 0)
            ->delete();
    }
}
```

**Key Points**:
- `withoutEvents()` suppresses all events for all models within the closure
- `saveQuietly()` / `deleteQuietly()` suppress events for a single operation
- Mass operations (`::update()`, `::insert()`, `::delete()`) NEVER fire events
- Use event silencing for data imports, migrations, and admin overrides
- Document when events are silenced — observers may contain critical business logic

---

### Pattern 323.5: Observer with Queue

**Category**: Async Processing
**Description**: Defer observer work to queue for non-blocking model operations.

```php
<?php

declare(strict_types=1);

namespace App\Observers;

use App\Jobs\GenerateOrderInvoice;
use App\Jobs\NotifyWarehouse;
use App\Jobs\SyncOrderToErp;
use App\Models\Order;

final class OrderObserver
{
    /**
     * Dispatch jobs AFTER database transaction commits.
     * afterCommit ensures jobs only dispatch if transaction succeeds.
     */
    public function created(Order $order): void
    {
        GenerateOrderInvoice::dispatch($order)->afterCommit();
        SyncOrderToErp::dispatch($order)->afterCommit();
    }

    public function updated(Order $order): void
    {
        if ($order->wasChanged('status') && $order->status === 'paid') {
            NotifyWarehouse::dispatch($order)
                ->afterCommit()
                ->onQueue('warehouse');
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

final class GenerateOrderInvoice implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        private readonly Order $order,
    ) {}

    public function handle(\App\Services\InvoiceService $invoiceService): void
    {
        $invoiceService->generate($this->order);
    }

    public function failed(\Throwable $exception): void
    {
        logger()->error('Invoice generation failed', [
            'order_id' => $this->order->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

**Key Points**:
- `afterCommit()` ensures job dispatches only after database transaction commits
- Without `afterCommit()`, job may process before transaction commits — model not found
- Use dedicated queues for different job priorities: `default`, `warehouse`, `notifications`
- Observer stays synchronous — heavy work moves to queued jobs
- Configure `after_commit` globally in `config/queue.php` instead of per-dispatch

---

### Pattern 323.6: Observer Testing

**Category**: Testing
**Description**: Test observer behavior in isolation and integration — event assertions, mock observers, quiet saves.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Observers;

use App\Models\Order;
use App\Models\User;
use App\Observers\OrderObserver;
use App\Services\AuditLogService;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

final class OrderObserverTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_sets_reference_number(): void
    {
        $order = Order::factory()->create(['reference_number' => null]);

        $this->assertNotNull($order->reference_number);
        $this->assertStringStartsWith('ORD-', $order->reference_number);
    }

    public function test_updated_logs_status_change(): void
    {
        Notification::fake();

        $order = Order::factory()->create(['status' => 'pending']);

        $order->update(['status' => 'shipped']);

        Notification::assertSentTo(
            $order->user,
            \App\Notifications\OrderStatusNotification::class,
        );
    }

    public function test_deleting_prevents_shipped_order_deletion(): void
    {
        $order = Order::factory()->create(['status' => 'shipped']);

        $result = $order->delete();

        $this->assertFalse($result);
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_can_create_without_observer(): void
    {
        $order = Order::withoutEvents(function (): Order {
            return Order::factory()->create([
                'reference_number' => null,
                'status' => null,
            ]);
        });

        // Observer did NOT fire — reference_number remains null
        $this->assertNull($order->reference_number);
    }

    public function test_observer_with_fake_events(): void
    {
        Event::fake();

        $order = Order::factory()->create();

        Event::assertDispatched('eloquent.creating: ' . Order::class);
        Event::assertDispatched('eloquent.created: ' . Order::class);
    }

    public function test_observer_unit_test_in_isolation(): void
    {
        $auditLog = $this->mock(AuditLogService::class);
        $inventory = $this->mock(InventoryService::class);

        $auditLog->shouldReceive('log')->once()->with(
            \Mockery::type(Order::class),
            'created',
            \Mockery::type('array'),
        );

        $observer = new OrderObserver($auditLog, $inventory);
        $order = Order::factory()->make(['id' => 1]);

        $observer->created($order);
    }
}
```

**Key Points**:
- `Notification::fake()` captures notifications for assertion without sending
- `Event::fake()` intercepts all events — verify observer triggers expected events
- `withoutEvents()` creates models without observer interference — test base model
- Unit test observers by instantiating directly with mocked dependencies
- `assertDatabaseHas()` verifies observer side effects persisted to database

---

## Best Practices

- **Use #[ObservedBy] attribute** — Laravel 11 preferred registration, co-located with model
- **Keep observers thin** — dispatch jobs for heavy work, keep observer methods fast
- **afterCommit for jobs** — prevent queue jobs processing before transaction commits
- **Document event silencing** — when using saveQuietly/withoutEvents, comment the reason
- **Test both paths** — test with observer active AND with events faked for isolation
- **One concern per observer** — split AuditObserver, CacheObserver, NotificationObserver
- **Avoid retrieved event** — fires on every query, causes performance issues at scale
- **Return false to prevent** — use return false in creating/updating/deleting for business rules

---

## Abnormal Case Patterns

1. **Observer not firing on mass operations** — `Model::where()->update()` bypasses observers. Fix: iterate models individually, or use `each()` with model save.

2. **Infinite loop** — observer's `updated()` calls `$model->save()`, which fires `updated()` again. Fix: use `saveQuietly()` for internal saves within observers, or use `$model->updateQuietly()`.

3. **Job dispatched before commit** — observer dispatches job in `created()`, but transaction hasn't committed. Fix: use `->afterCommit()` on all job dispatches in observers.

4. **Observer order dependency** — AuditObserver depends on CacheObserver running first. Fix: control order via `#[ObservedBy([CacheObserver::class, AuditObserver::class])]` array order.

5. **Observer breaking seeder** — observer sends real notifications during database seeding. Fix: use `Notification::fake()` in seeder, or wrap seeder in `Model::withoutEvents()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (323.1–323.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Eloquent Observers Specialist — Data | EPS v3.2*
