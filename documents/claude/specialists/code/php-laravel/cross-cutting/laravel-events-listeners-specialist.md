# Laravel Events & Listeners Specialist — Cross-Cutting
# Laravelイベント＆リスナースペシャリスト — 横断的関心事
# Chuyen Gia Events va Listeners Laravel — Cat Ngang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Events & Listeners
**Aspect**: Events & Listeners
**Category**: cross-cutting
**Purpose**: Knowledge provider for Laravel event-driven architecture — event classes, listener classes, auto-discovery, queued listeners, subscribers, broadcasting, ordering, and event testing

---

## Metadata

```json
{
  "id": "laravel-events-listeners-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Events & Listeners",
  "aspect": "Events & Listeners",
  "category": "cross-cutting",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 event auto-discovery — attribute-based and convention-based",
    "E2: Queued listeners — ShouldQueue interface for async processing",
    "E3: Event subscribers — grouping related listeners in a single class",
    "E4: Event broadcasting — WebSocket integration via channels"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 327.1–327.8 |
| **Directory Pattern** | `app/Events/`, `app/Listeners/` |
| **Naming Convention** | `{Entity}{Action}Event.php`, `{Action}{Entity}Listener.php` |
| **Imports From** | Domain (models, value objects), Infrastructure (queues, broadcasting) |
| **Imported By** | Application (services, controllers), Infrastructure (queued jobs) |
| **Cannot Import** | Presentation (controllers, views) |
| **Dependencies** | `illuminate/events`, `illuminate/queue`, `illuminate/broadcasting` |
| **When To Use** | Decoupling side effects from primary actions — notifications, audit, sync |
| **Source Skeleton** | `app/Events/{Entity}{Action}Event.php`, `app/Listeners/{Action}{Entity}Listener.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel event-driven patterns — dispatch, listen, queue, broadcast, subscribe, test |
| **Activation Trigger** | files: `app/Events/*.php`, `app/Listeners/*.php`; keywords: Event, Listener, dispatch, ShouldBroadcast |

---

## Role

You are a **Laravel Events & Listeners Specialist**. Your responsibility is to provide best practices for Laravel 11 event-driven architecture — event class design, listener implementation, auto-discovery, queued listeners, event subscribers, broadcasting, listener ordering, and event testing strategies.

**Used by**: Any code agent working with Laravel event-driven patterns and side-effect decoupling
**Not used by**: Non-Laravel stacks, projects not using event-driven patterns

---

## Patterns

### Pattern 327.1: Event Class

**Category**: Event Fundamentals
**Description**: Event class design with typed properties and serialization support.

```php
<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class OrderPlacedEvent
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly float $totalAmount,
        public readonly string $currency = 'USD',
    ) {}
}
```

**Key Points**:
- Mark event classes `final` — events are data carriers, not extension points
- Use `readonly` promoted properties for immutability
- `SerializesModels` stores model ID for queue serialization, not full model
- `Dispatchable` trait adds static `dispatch()` method for clean invocation

---

### Pattern 327.2: Listener Class

**Category**: Listener Fundamentals
**Description**: Listener class with typed event dependency and single responsibility.

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\OrderPlacedEvent;
use App\Services\InventoryService;

final class UpdateInventoryListener
{
    public function __construct(
        private readonly InventoryService $inventoryService,
    ) {}

    public function handle(OrderPlacedEvent $event): void
    {
        $this->inventoryService->decrementStock(
            items: $event->order->items,
        );
    }

    public function failed(OrderPlacedEvent $event, \Throwable $exception): void
    {
        report($exception);
    }
}
```

**Key Points**:
- One listener = one side effect — never combine multiple concerns
- Type-hint the event in `handle()` for auto-discovery compatibility
- Implement `failed()` for error handling on queued listeners
- Constructor injection via service container for dependencies

---

### Pattern 327.3: Event Discovery (Auto in L11)

**Category**: Registration
**Description**: Laravel 11 automatic event discovery — no manual registration required.

```php
<?php

declare(strict_types=1);

// Laravel 11: Auto-discovery is enabled by default
// Listeners in app/Listeners/ are discovered automatically
// when their handle() method type-hints an event class

// To customize discovery in bootstrap/app.php:
use Illuminate\Foundation\Application;

return Application::configure(basePath: dirname(__DIR__))
    ->withEvents(discover: [
        __DIR__ . '/../app/Listeners',
        __DIR__ . '/../app/Modules/*/Listeners',
    ])
    ->create();
```

```php
<?php

declare(strict_types=1);

// Manual registration when auto-discovery is insufficient
namespace App\Providers;

use App\Events\OrderPlacedEvent;
use App\Listeners\SendOrderConfirmationListener;
use App\Listeners\UpdateInventoryListener;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

final class EventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Event::listen(OrderPlacedEvent::class, SendOrderConfirmationListener::class);
        Event::listen(OrderPlacedEvent::class, UpdateInventoryListener::class);
    }
}
```

**Key Points**:
- Laravel 11 auto-discovers listeners by scanning `app/Listeners/` directory
- Discovery relies on `handle()` method type-hint — must be explicit
- Use `withEvents(discover:)` in `bootstrap/app.php` for custom scan paths
- Manual registration only needed for closures or non-standard listener locations

---

### Pattern 327.4: Queued Listeners

**Category**: Async Processing
**Description**: Listeners that execute asynchronously via the queue system.

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\OrderPlacedEvent;
use App\Mail\OrderConfirmationMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

final class SendOrderConfirmationListener implements ShouldQueue
{
    use InteractsWithQueue;

    public string $queue = 'notifications';
    public string $connection = 'redis';
    public int $tries = 3;
    public int $backoff = 60;
    public int $timeout = 120;

    public function handle(OrderPlacedEvent $event): void
    {
        Mail::to($event->order->user->email)
            ->send(new OrderConfirmationMail(order: $event->order));
    }

    public function shouldQueue(OrderPlacedEvent $event): bool
    {
        return $event->totalAmount > 0;
    }

    public function failed(OrderPlacedEvent $event, \Throwable $exception): void
    {
        report($exception);
    }

    public function retryUntil(): \DateTime
    {
        return now()->addMinutes(10);
    }
}
```

**Key Points**:
- Implement `ShouldQueue` to push listener execution to queue
- Configure `$queue`, `$connection`, `$tries`, `$backoff` as public properties
- `shouldQueue()` conditionally skips queueing based on event data
- `InteractsWithQueue` trait provides `release()`, `delete()`, `attempts()`

---

### Pattern 327.5: Event Subscribers

**Category**: Listener Grouping
**Description**: Subscriber classes that register multiple listeners for related events in one class.

```php
<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\OrderPlacedEvent;
use App\Events\OrderCancelledEvent;
use App\Events\OrderRefundedEvent;
use Illuminate\Events\Dispatcher;

final class OrderEventSubscriber
{
    public function handleOrderPlaced(OrderPlacedEvent $event): void
    {
        // Log order creation, update analytics
    }

    public function handleOrderCancelled(OrderCancelledEvent $event): void
    {
        // Restore inventory, notify warehouse
    }

    public function handleOrderRefunded(OrderRefundedEvent $event): void
    {
        // Process refund, update financial records
    }

    public function subscribe(Dispatcher $events): array
    {
        return [
            OrderPlacedEvent::class => 'handleOrderPlaced',
            OrderCancelledEvent::class => 'handleOrderCancelled',
            OrderRefundedEvent::class => 'handleOrderRefunded',
        ];
    }
}
```

```php
<?php

// Register subscriber in a service provider
use App\Listeners\OrderEventSubscriber;
use Illuminate\Support\Facades\Event;

Event::subscribe(OrderEventSubscriber::class);
```

**Key Points**:
- `subscribe()` returns event-to-method mapping array
- Use subscribers to group logically related event handlers (same aggregate)
- Subscribers are not auto-discovered — must be registered manually
- Each method in subscriber follows same conventions as standalone listener

---

### Pattern 327.6: Event Broadcasting

**Category**: Real-time
**Description**: Broadcasting events to WebSocket channels for real-time frontend updates.

```php
<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class OrderStatusUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly Order $order,
        public readonly string $previousStatus,
        public readonly string $newStatus,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("orders.{$this->order->user_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'previous_status' => $this->previousStatus,
            'new_status' => $this->newStatus,
            'updated_at' => $this->order->updated_at->toIso8601String(),
        ];
    }
}
```

**Key Points**:
- Implement `ShouldBroadcast` for async broadcasting, `ShouldBroadcastNow` for sync
- `broadcastOn()` returns channels — `Channel`, `PrivateChannel`, or `PresenceChannel`
- `broadcastWith()` controls the payload sent to clients — exclude sensitive data
- `broadcastAs()` customizes the event name received by frontend

---

### Pattern 327.7: Listener Ordering

**Category**: Execution Control
**Description**: Control listener execution order when multiple listeners respond to the same event.

```php
<?php

declare(strict_types=1);

// Manual ordering via explicit registration order
namespace App\Providers;

use App\Events\OrderPlacedEvent;
use App\Listeners\ValidateOrderListener;
use App\Listeners\UpdateInventoryListener;
use App\Listeners\SendOrderConfirmationListener;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

final class EventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Listeners execute in registration order
        Event::listen(OrderPlacedEvent::class, ValidateOrderListener::class);     // 1st
        Event::listen(OrderPlacedEvent::class, UpdateInventoryListener::class);   // 2nd
        Event::listen(OrderPlacedEvent::class, SendOrderConfirmationListener::class); // 3rd
    }
}
```

```php
<?php

declare(strict_types=1);

// Stop propagation from a listener
namespace App\Listeners;

use App\Events\OrderPlacedEvent;

final class ValidateOrderListener
{
    public function handle(OrderPlacedEvent $event): bool
    {
        if (! $event->order->isValid()) {
            // Returning false stops remaining listeners
            return false;
        }

        return true;
    }
}
```

**Key Points**:
- Listeners execute in registration order — first registered, first executed
- Return `false` from `handle()` to stop propagation to subsequent listeners
- Auto-discovery order is non-deterministic — use manual registration for ordering
- For complex ordering, consider a single orchestrating listener that calls services in sequence

---

### Pattern 327.8: Event Testing

**Category**: Testing
**Description**: Testing event dispatch, listener execution, and broadcast verification.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Events\OrderPlacedEvent;
use App\Listeners\SendOrderConfirmationListener;
use App\Listeners\UpdateInventoryListener;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

final class OrderPlacedEventTest extends TestCase
{
    public function test_order_placed_event_is_dispatched(): void
    {
        Event::fake([OrderPlacedEvent::class]);

        $order = Order::factory()->create();
        OrderPlacedEvent::dispatch($order, totalAmount: 99.99);

        Event::assertDispatched(
            event: OrderPlacedEvent::class,
            callback: fn (OrderPlacedEvent $e) => $e->order->id === $order->id
                && $e->totalAmount === 99.99,
        );
    }

    public function test_listeners_are_attached_to_event(): void
    {
        Event::assertListening(
            expectedEvent: OrderPlacedEvent::class,
            expectedListener: UpdateInventoryListener::class,
        );

        Event::assertListening(
            expectedEvent: OrderPlacedEvent::class,
            expectedListener: SendOrderConfirmationListener::class,
        );
    }

    public function test_event_not_dispatched_without_order(): void
    {
        Event::fake([OrderPlacedEvent::class]);

        // Action that should NOT trigger event
        // ...

        Event::assertNotDispatched(OrderPlacedEvent::class);
    }

    public function test_listener_handles_event_correctly(): void
    {
        $order = Order::factory()->create();
        $event = new OrderPlacedEvent(order: $order, totalAmount: 150.00);

        $listener = app(UpdateInventoryListener::class);
        $listener->handle($event);

        // Assert side effects
        $this->assertDatabaseHas('inventory_logs', [
            'order_id' => $order->id,
        ]);
    }
}
```

**Key Points**:
- `Event::fake()` prevents actual listener execution — use for dispatch assertions
- `Event::assertListening()` verifies event-to-listener wiring
- Test listeners independently by instantiating and calling `handle()` directly
- For broadcast testing, use `Event::fake()` then `Event::assertDispatched()` with `ShouldBroadcast` check

---

## Best Practices

- **One event, one occurrence** — events represent something that happened, not commands
- **Immutable event data** — use `readonly` properties, never mutate event state in listeners
- **Queue heavy listeners** — email, PDF generation, external API calls must be queued
- **Name events in past tense** — `OrderPlacedEvent`, not `PlaceOrderEvent`
- **Name listeners as actions** — `SendOrderConfirmationListener`, not `OrderConfirmationListener`
- **Avoid circular dispatching** — listener A dispatches event B whose listener dispatches event A
- **Use broadcasting sparingly** — only broadcast events that the frontend actually consumes
- **Test dispatch and handling separately** — fake events for dispatch tests, instantiate for handler tests

---

## Abnormal Case Patterns

1. **Queued listener fails silently** — listener implements `ShouldQueue` but queue worker is not running. Fix: monitor queue with `php artisan queue:monitor`, implement `failed()` method.

2. **Auto-discovery misses listener** — listener `handle()` method lacks type-hint or is in non-standard directory. Fix: ensure explicit event type-hint, add custom scan paths in `withEvents()`.

3. **Broadcast event serialization error** — event contains non-serializable properties (closures, resources). Fix: use `broadcastWith()` to control payload, exclude non-serializable data.

4. **Listener ordering breaks with auto-discovery** — auto-discovered listeners have unpredictable order. Fix: use manual registration in provider boot() when order matters.

5. **Memory leak in subscriber** — subscriber holds state between event handles. Fix: subscribers should be stateless, inject fresh services via constructor.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3, E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (327.1–327.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Events & Listeners Specialist — Cross-Cutting | EPS v3.2*
