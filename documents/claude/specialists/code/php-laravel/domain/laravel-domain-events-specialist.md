# Laravel Domain Events Specialist — Domain
# Laravelドメインイベントスペシャリスト — ドメイン
# Chuyen Gia Su Kien Domain Laravel — Domain

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Domain Events
**Aspect**: Domain Events
**Category**: domain
**Purpose**: Knowledge provider for domain events — immutable event records, entity event raising, event dispatching, event sourcing fundamentals, event-driven aggregates, and domain event testing

---

## Metadata

```json
{
  "id": "laravel-domain-events-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Domain Events",
  "aspect": "Domain Events",
  "category": "domain",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: DDD domain events — record of something significant that happened in the domain (Evans 2003, Vernon 2013)",
    "E2: PHP 8.3 readonly classes — immutable event records with typed properties",
    "E3: Event sourcing — rebuild aggregate state from ordered event stream"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 326.1–326.6 |
| **Directory Pattern** | `app/Domain/{Feature}/Events/` |
| **Naming Convention** | `{Entity}{Action}Event.php` (e.g., OrderPlacedEvent.php) |
| **Imports From** | none (pure domain — no framework dependencies) |
| **Imported By** | Application (event handlers), Infrastructure (event bus adapters) |
| **Cannot Import** | Eloquent, Illuminate, any framework package |
| **Dependencies** | none (pure PHP) |
| **When To Use** | Cross-aggregate communication, audit trails, eventual consistency |
| **Source Skeleton** | `app/Domain/{Feature}/Events/{Entity}{Action}Event.php` |
| **Specialist Type** | code |
| **Purpose** | Immutable domain event records — raised after state change, dispatched via domain event bus |
| **Activation Trigger** | files: `app/Domain/*/Events/*.php`; keywords: DomainEvent, recordEvent, EventDispatcher, EventSourcing |

---

## Role

You are a **Laravel Domain Events Specialist**. Your responsibility is to provide best practices for domain events in PHP 8.3 — immutable event classes, raising events from entities after state changes, domain event dispatching patterns, event sourcing fundamentals, event-driven aggregates, and testing strategies for domain events.

**Used by**: Any code agent implementing event-driven domain logic in Laravel applications
**Not used by**: CRUD apps using only Laravel's built-in event system without domain layer

---

## Patterns

### Pattern 326.1: Domain Event Class

**Category**: Event Fundamentals
**Description**: Immutable domain event record capturing what happened, when, and the relevant data.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\Events;

interface DomainEventInterface
{
    public function occurredAt(): \DateTimeImmutable;

    public function aggregateId(): string;

    public function eventName(): string;

    /**
     * @return array<string, mixed>
     */
    public function payload(): array;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Domain\Order\Events;

use App\Domain\Shared\Events\DomainEventInterface;

final readonly class OrderPlacedEvent implements DomainEventInterface
{
    public function __construct(
        private string $orderId,
        private string $customerId,
        private int $totalAmountCents,
        private string $currency,
        private \DateTimeImmutable $occurredAt,
    ) {}

    public static function raise(
        string $orderId,
        string $customerId,
        int $totalAmountCents,
        string $currency,
    ): self {
        return new self(
            orderId: $orderId,
            customerId: $customerId,
            totalAmountCents: $totalAmountCents,
            currency: $currency,
            occurredAt: new \DateTimeImmutable(),
        );
    }

    public function occurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }

    public function aggregateId(): string
    {
        return $this->orderId;
    }

    public function eventName(): string
    {
        return 'order.placed';
    }

    public function orderId(): string
    {
        return $this->orderId;
    }

    public function customerId(): string
    {
        return $this->customerId;
    }

    public function totalAmountCents(): int
    {
        return $this->totalAmountCents;
    }

    public function currency(): string
    {
        return $this->currency;
    }

    public function payload(): array
    {
        return [
            'orderId' => $this->orderId,
            'customerId' => $this->customerId,
            'totalAmountCents' => $this->totalAmountCents,
            'currency' => $this->currency,
        ];
    }
}
```

**Key Points**:
- `readonly class` ensures event is immutable after creation — events are historical records
- `raise()` factory captures the timestamp automatically — callers don't manage timing
- `eventName()` returns a dot-notation string for routing and serialization
- `payload()` returns serializable array — useful for event store and message queues

---

### Pattern 326.2: Raising Events from Entity

**Category**: Entity Integration
**Description**: Entities collect domain events internally and expose them for dispatch after persistence.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\Entities;

use App\Domain\Shared\Events\DomainEventInterface;

trait RecordsDomainEvents
{
    /** @var array<int, DomainEventInterface> */
    private array $domainEvents = [];

    protected function recordEvent(DomainEventInterface $event): void
    {
        $this->domainEvents[] = $event;
    }

    /**
     * @return array<int, DomainEventInterface>
     */
    public function pullDomainEvents(): array
    {
        $events = $this->domainEvents;
        $this->domainEvents = [];

        return $events;
    }

    public function hasPendingEvents(): bool
    {
        return $this->domainEvents !== [];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Domain\Order\Entities;

use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\Events\OrderPlacedEvent;
use App\Domain\Order\Events\OrderCancelledEvent;
use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Shared\Entities\RecordsDomainEvents;

final class Order
{
    use RecordsDomainEvents;

    private OrderStatus $status = OrderStatus::Draft;

    public function __construct(
        private readonly OrderId $id,
        private readonly string $customerId,
        private Money $totalAmount,
    ) {}

    public function place(): void
    {
        if ($this->status !== OrderStatus::Draft) {
            throw new \DomainException(
                "Order {$this->id} must be Draft to place.",
            );
        }

        $this->status = OrderStatus::Placed;

        $this->recordEvent(OrderPlacedEvent::raise(
            orderId: $this->id->toString(),
            customerId: $this->customerId,
            totalAmountCents: $this->totalAmount->amountInCents(),
            currency: $this->totalAmount->currency(),
        ));
    }

    public function cancel(string $reason): void
    {
        if ($this->status === OrderStatus::Shipped) {
            throw new \DomainException('Cannot cancel a shipped order.');
        }

        $this->status = OrderStatus::Cancelled;

        $this->recordEvent(OrderCancelledEvent::raise(
            orderId: $this->id->toString(),
            reason: $reason,
        ));
    }
}
```

**Key Points**:
- Events are recorded AFTER state change succeeds — never before mutation
- `pullDomainEvents()` clears the internal list — prevents duplicate dispatch
- Event dispatch happens in the application/infrastructure layer after repository save
- Trait keeps the event-recording concern separate from entity business logic

---

### Pattern 326.3: Domain Event Dispatcher

**Category**: Dispatching
**Description**: Pure PHP event dispatcher that routes domain events to registered handlers.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\Events;

interface DomainEventDispatcherInterface
{
    public function dispatch(DomainEventInterface ...$events): void;

    /**
     * @param class-string<DomainEventInterface> $eventClass
     * @param callable(DomainEventInterface): void $handler
     */
    public function subscribe(string $eventClass, callable $handler): void;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shared\Events;

final class InMemoryEventDispatcher implements DomainEventDispatcherInterface
{
    /** @var array<class-string<DomainEventInterface>, array<int, callable>> */
    private array $handlers = [];

    public function subscribe(string $eventClass, callable $handler): void
    {
        $this->handlers[$eventClass][] = $handler;
    }

    public function dispatch(DomainEventInterface ...$events): void
    {
        foreach ($events as $event) {
            $eventClass = $event::class;

            foreach ($this->handlers[$eventClass] ?? [] as $handler) {
                $handler($event);
            }
        }
    }
}
```

```php
<?php

declare(strict_types=1);

// Application layer — dispatch after persistence
namespace App\Application\Order\UseCases;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Contracts\OrderRepositoryInterface;
use App\Domain\Shared\Events\DomainEventDispatcherInterface;

final readonly class PlaceOrderUseCase
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private DomainEventDispatcherInterface $eventDispatcher,
    ) {}

    public function execute(string $orderId): void
    {
        $order = $this->orderRepository->findById($orderId);
        $order->place();

        $this->orderRepository->save($order);

        // Dispatch AFTER successful persistence
        $this->eventDispatcher->dispatch(
            ...$order->pullDomainEvents(),
        );
    }
}
```

**Key Points**:
- Dispatcher interface is in domain layer; implementation can be in-memory or Laravel adapter
- Events are dispatched AFTER persistence — ensures consistency (no event without state change)
- `InMemoryEventDispatcher` is useful for testing and simple applications
- Infrastructure layer can adapt this to Laravel's event system or a message queue

---

### Pattern 326.4: Event Sourcing Basics

**Category**: Event Sourcing
**Description**: Rebuild aggregate state by replaying ordered domain events from an event store.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Account\Entities;

use App\Domain\Account\Events\AccountOpenedEvent;
use App\Domain\Account\Events\MoneyDepositedEvent;
use App\Domain\Account\Events\MoneyWithdrawnEvent;
use App\Domain\Shared\Entities\RecordsDomainEvents;
use App\Domain\Shared\Events\DomainEventInterface;

final class Account
{
    use RecordsDomainEvents;

    private int $balanceCents = 0;
    private bool $opened = false;
    private int $version = 0;

    private function __construct(
        private readonly string $accountId,
    ) {}

    public static function open(string $accountId, int $initialDepositCents): self
    {
        $account = new self($accountId);

        $account->apply(AccountOpenedEvent::raise($accountId));
        $account->apply(MoneyDepositedEvent::raise($accountId, $initialDepositCents));

        return $account;
    }

    public function deposit(int $amountCents): void
    {
        if ($amountCents <= 0) {
            throw new \InvalidArgumentException('Deposit amount must be positive.');
        }

        $this->apply(MoneyDepositedEvent::raise($this->accountId, $amountCents));
    }

    public function withdraw(int $amountCents): void
    {
        if ($amountCents <= 0) {
            throw new \InvalidArgumentException('Withdrawal amount must be positive.');
        }

        if ($this->balanceCents < $amountCents) {
            throw new \DomainException(
                "Insufficient balance: {$this->balanceCents} < {$amountCents}.",
            );
        }

        $this->apply(MoneyWithdrawnEvent::raise($this->accountId, $amountCents));
    }

    /**
     * @param array<int, DomainEventInterface> $events
     */
    public static function reconstitute(string $accountId, array $events): self
    {
        $account = new self($accountId);

        foreach ($events as $event) {
            $account->applyFromHistory($event);
        }

        return $account;
    }

    public function version(): int
    {
        return $this->version;
    }

    public function balanceCents(): int
    {
        return $this->balanceCents;
    }

    private function apply(DomainEventInterface $event): void
    {
        $this->mutate($event);
        $this->recordEvent($event);
    }

    private function applyFromHistory(DomainEventInterface $event): void
    {
        $this->mutate($event);
        $this->version++;
    }

    private function mutate(DomainEventInterface $event): void
    {
        match ($event::class) {
            AccountOpenedEvent::class => $this->opened = true,
            MoneyDepositedEvent::class => $this->balanceCents += $event->amountCents(),
            MoneyWithdrawnEvent::class => $this->balanceCents -= $event->amountCents(),
            default => throw new \LogicException("Unknown event: {$event::class}"),
        };
    }
}
```

**Key Points**:
- `apply()` mutates state AND records event (for new changes)
- `applyFromHistory()` mutates state only (for reconstitution from event store)
- State is never set directly — always derived from events via `mutate()`
- `reconstitute()` replays full event history to rebuild current state
- `version` tracks replay count for optimistic concurrency control

---

### Pattern 326.5: Event-Driven Aggregates

**Category**: Aggregate Patterns
**Description**: Aggregates that communicate across boundaries exclusively through domain events.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Order\Events;

use App\Domain\Shared\Events\DomainEventInterface;

final readonly class OrderCancelledEvent implements DomainEventInterface
{
    public function __construct(
        private string $orderId,
        private string $reason,
        private \DateTimeImmutable $occurredAt,
    ) {}

    public static function raise(string $orderId, string $reason): self
    {
        return new self(
            orderId: $orderId,
            reason: $reason,
            occurredAt: new \DateTimeImmutable(),
        );
    }

    public function occurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }

    public function aggregateId(): string
    {
        return $this->orderId;
    }

    public function eventName(): string
    {
        return 'order.cancelled';
    }

    public function reason(): string
    {
        return $this->reason;
    }

    public function payload(): array
    {
        return [
            'orderId' => $this->orderId,
            'reason' => $this->reason,
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

// Application layer — event handler reacts to OrderCancelledEvent
namespace App\Application\Inventory\Handlers;

use App\Domain\Order\Events\OrderCancelledEvent;
use App\Domain\Inventory\Contracts\InventoryRepositoryInterface;

final readonly class RestoreInventoryOnOrderCancellation
{
    public function __construct(
        private InventoryRepositoryInterface $inventoryRepository,
    ) {}

    public function __invoke(OrderCancelledEvent $event): void
    {
        $reservations = $this->inventoryRepository
            ->findReservationsByOrderId($event->aggregateId());

        foreach ($reservations as $reservation) {
            $reservation->release();
            $this->inventoryRepository->saveReservation($reservation);
        }
    }
}
```

```php
<?php

declare(strict_types=1);

// Wiring in application layer
namespace App\Application\Providers;

use App\Application\Inventory\Handlers\RestoreInventoryOnOrderCancellation;
use App\Domain\Order\Events\OrderCancelledEvent;
use App\Domain\Shared\Events\DomainEventDispatcherInterface;

final readonly class DomainEventWiring
{
    public static function register(DomainEventDispatcherInterface $dispatcher): void
    {
        $dispatcher->subscribe(
            OrderCancelledEvent::class,
            new RestoreInventoryOnOrderCancellation(
                // repository injected via container in real app
            ),
        );
    }
}
```

**Key Points**:
- Order aggregate raises `OrderCancelledEvent`; Inventory aggregate reacts — no direct coupling
- Event handlers live in the application layer, not in the domain
- Cross-aggregate communication is always eventual — never within the same transaction
- Handler is a single-method invokable class (`__invoke`) for clean registration

---

### Pattern 326.6: Domain Event Testing

**Category**: Testing
**Description**: Test that entities raise correct events and event handlers produce expected side effects.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Order;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Events\OrderPlacedEvent;
use App\Domain\Order\Events\OrderCancelledEvent;
use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Shared\ValueObjects\Money;
use PHPUnit\Framework\TestCase;

final class OrderDomainEventTest extends TestCase
{
    public function test_placing_order_records_order_placed_event(): void
    {
        $order = new Order(
            id: OrderId::fromString('order-001'),
            customerId: 'cust-001',
            totalAmount: Money::of(5000, 'USD'),
        );

        $order->place();

        $events = $order->pullDomainEvents();
        $this->assertCount(1, $events);
        $this->assertInstanceOf(OrderPlacedEvent::class, $events[0]);
        $this->assertSame('order-001', $events[0]->orderId());
        $this->assertSame('cust-001', $events[0]->customerId());
        $this->assertSame(5000, $events[0]->totalAmountCents());
    }

    public function test_cancelling_order_records_cancellation_event(): void
    {
        $order = new Order(
            id: OrderId::fromString('order-002'),
            customerId: 'cust-002',
            totalAmount: Money::of(3000, 'USD'),
        );

        $order->cancel('Customer requested');

        $events = $order->pullDomainEvents();
        $this->assertCount(1, $events);
        $this->assertInstanceOf(OrderCancelledEvent::class, $events[0]);
        $this->assertSame('Customer requested', $events[0]->reason());
    }

    public function test_pull_domain_events_clears_after_first_call(): void
    {
        $order = new Order(
            id: OrderId::fromString('order-003'),
            customerId: 'cust-003',
            totalAmount: Money::of(1000, 'USD'),
        );

        $order->place();

        $firstPull = $order->pullDomainEvents();
        $secondPull = $order->pullDomainEvents();

        $this->assertCount(1, $firstPull);
        $this->assertCount(0, $secondPull);
    }

    public function test_event_payload_is_serializable(): void
    {
        $event = OrderPlacedEvent::raise(
            orderId: 'order-004',
            customerId: 'cust-004',
            totalAmountCents: 9999,
            currency: 'EUR',
        );

        $payload = $event->payload();

        $this->assertIsArray($payload);
        $this->assertSame('order-004', $payload['orderId']);
        $this->assertSame(9999, $payload['totalAmountCents']);
        $this->assertSame('EUR', $payload['currency']);

        // Verify JSON-serializable
        $json = json_encode($payload, JSON_THROW_ON_ERROR);
        $this->assertIsString($json);
    }

    public function test_event_occurred_at_is_set_automatically(): void
    {
        $before = new \DateTimeImmutable();

        $event = OrderPlacedEvent::raise(
            orderId: 'order-005',
            customerId: 'cust-005',
            totalAmountCents: 100,
            currency: 'USD',
        );

        $after = new \DateTimeImmutable();

        $this->assertGreaterThanOrEqual(
            $before->getTimestamp(),
            $event->occurredAt()->getTimestamp(),
        );
        $this->assertLessThanOrEqual(
            $after->getTimestamp(),
            $event->occurredAt()->getTimestamp(),
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Account;

use App\Domain\Account\Entities\Account;
use App\Domain\Account\Events\AccountOpenedEvent;
use App\Domain\Account\Events\MoneyDepositedEvent;
use PHPUnit\Framework\TestCase;

final class AccountEventSourcingTest extends TestCase
{
    public function test_reconstitute_from_event_history(): void
    {
        $events = [
            AccountOpenedEvent::raise('acc-001'),
            MoneyDepositedEvent::raise('acc-001', 5000),
            MoneyDepositedEvent::raise('acc-001', 3000),
        ];

        $account = Account::reconstitute('acc-001', $events);

        $this->assertSame(8000, $account->balanceCents());
        $this->assertSame(3, $account->version());
    }

    public function test_new_events_after_reconstitution(): void
    {
        $history = [
            AccountOpenedEvent::raise('acc-002'),
            MoneyDepositedEvent::raise('acc-002', 10000),
        ];

        $account = Account::reconstitute('acc-002', $history);
        $account->deposit(2000);

        $newEvents = $account->pullDomainEvents();

        $this->assertCount(1, $newEvents);
        $this->assertInstanceOf(MoneyDepositedEvent::class, $newEvents[0]);
        $this->assertSame(12000, $account->balanceCents());
    }
}
```

**Key Points**:
- Extends `PHPUnit\Framework\TestCase` — no Laravel boot required for domain event tests
- Test event recording: verify correct event type, data, and count after entity operations
- Test `pullDomainEvents()` idempotency — second call returns empty array
- Test event sourcing reconstitution — replay events and verify final state
- Test payload serializability — events must survive JSON encoding for event stores

---

## Best Practices

- **Events are immutable records** — use `readonly class`, never modify after creation
- **Record after state change** — call `recordEvent()` only after mutation succeeds
- **Dispatch after persistence** — events flow: entity records -> repository saves -> dispatcher publishes
- **Past-tense naming** — `OrderPlacedEvent`, `PaymentReceivedEvent` — events describe what happened
- **Payload as primitives** — `payload()` returns scalars/arrays for serialization; no objects
- **No framework imports in events** — domain events are pure PHP; Laravel adapter is infrastructure
- **One event per significant state change** — don't combine multiple facts into one event
- **Version aggregates** — use event version numbers for optimistic concurrency in event-sourced systems
- **Handler single responsibility** — each handler does one thing in response to one event type

---

## Abnormal Case Patterns

1. **Event recorded before state change** — entity records event then throws during mutation; event is dispatched for a change that didn't happen. Fix: always mutate first, record event second.

2. **Mutable event** — event properties can be changed after creation. Fix: use `readonly class` and remove all setters.

3. **Event dispatched inside entity** — entity directly calls `EventDispatcher::dispatch()`. Fix: entity only records; dispatching happens in application/infrastructure layer.

4. **Missing event data** — event stores `orderId` but handler needs `customerId` too. Fix: include all contextual data at event creation time; events are self-contained.

5. **Event naming as command** — `PlaceOrderEvent` instead of `OrderPlacedEvent`. Fix: events are past-tense facts (placed, cancelled, shipped), not imperative commands.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (326.1–326.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Domain Events Specialist — Domain | EPS v3.2*
