# Laravel Architecture Patterns Specialist — Architecture
# Laravelアーキテクチャパターンスペシャリスト — アーキテクチャ
# Chuyen Gia Mau Kien Truc Laravel — Kien Truc

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: High-Level Architecture Patterns
**Category**: architecture
**Purpose**: Knowledge provider for high-level architecture patterns in Laravel — modular monolith, micro-service communication, API gateway, event-driven architecture, CQRS + Event Sourcing, and DDD tactical patterns

---

## Metadata

```json
{
  "id": "laravel-architecture-patterns-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "High-Level Architecture Patterns",
  "category": "architecture",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Modular monolith pattern — nwidart/laravel-modules, spatie/laravel-package-tools",
    "E2: Event-driven architecture — Laravel Events, Queues, Broadcasting",
    "E3: CQRS pattern — spatie/laravel-event-sourcing, separate read/write models",
    "E4: DDD tactical patterns — Vaughn Vernon, Eric Evans applied to Laravel",
    "E5: API gateway patterns — Laravel as gateway + inter-service HTTP/gRPC",
    "E6: Micro-service communication — Laravel Horizon, RabbitMQ, Redis Streams"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 377.1–377.6 |
| **Directory Pattern** | Project root (architecture-level decisions) |
| **Naming Convention** | N/A (architecture patterns, not file patterns) |
| **Imports From** | N/A (defines high-level structure) |
| **Imported By** | All specialists — architecture patterns inform all design decisions |
| **Cannot Import** | N/A |
| **Dependencies** | `php:^8.3`, `laravel/framework:^11.0`, pattern-specific packages |
| **When To Use** | Architecture decision phase, system design, scaling strategy |
| **Source Skeleton** | Varies per pattern |
| **Specialist Type** | code |
| **Purpose** | High-level architecture patterns — modular monolith, microservices, CQRS, DDD, event-driven |
| **Activation Trigger** | keywords: modular monolith, microservice, CQRS, event sourcing, DDD, API gateway, event-driven; context: architecture decisions, scaling discussions |

---

## Role

You are a **Laravel Architecture Patterns Specialist**. Your responsibility is to provide patterns for high-level architecture decisions in PHP 8.3 + Laravel 11.x — modular monolith design, micro-service communication, API gateway patterns, event-driven architecture, CQRS with Event Sourcing, and DDD tactical patterns adapted for Laravel.

**Used by**: Architects, tech leads, code agents making system-level design decisions
**Not used by**: Simple CRUD applications, projects with < 10 models, non-Laravel stacks

---

## Patterns

### Pattern 377.1: Modular Monolith

**Category**: System Architecture
**Description**: Organize a Laravel application into self-contained modules with strict boundaries — deployable as one unit but architecturally ready for extraction to microservices.

```
project-root/
├── app/
│   └── Modules/
│       ├── Order/
│       │   ├── Domain/
│       │   ├── Application/
│       │   ├── Infrastructure/
│       │   ├── Presentation/
│       │   ├── Database/
│       │   │   ├── Migrations/
│       │   │   ├── Factories/
│       │   │   └── Seeders/
│       │   ├── Routes/
│       │   │   ├── api.php
│       │   │   └── web.php
│       │   ├── Config/
│       │   │   └── order.php
│       │   ├── Tests/
│       │   └── OrderServiceProvider.php
│       ├── Payment/
│       │   ├── Domain/
│       │   ├── Application/
│       │   ├── Infrastructure/
│       │   ├── Presentation/
│       │   └── PaymentServiceProvider.php
│       ├── Inventory/
│       └── Shipping/
├── app/Shared/                     # Cross-module shared kernel
│   ├── Contracts/
│   │   └── ModuleInterface.php
│   ├── Events/
│   │   └── IntegrationEvent.php
│   └── ValueObjects/
└── bootstrap/providers.php
```

```php
<?php
// Module contract — every module must implement this
declare(strict_types=1);

namespace App\Shared\Contracts;

interface ModuleInterface
{
    /** @return array<string, class-string> */
    public function bindings(): array;

    /** @return array<int, string> */
    public function routes(): array;

    /** @return array<int, string> */
    public function migrations(): array;
}
```

```php
<?php
// Module Service Provider — self-contained registration
declare(strict_types=1);

namespace App\Modules\Order;

use App\Modules\Order\Domain\Ports\OrderRepositoryInterface;
use App\Modules\Order\Infrastructure\Repositories\EloquentOrderRepository;
use App\Shared\Contracts\ModuleInterface;
use Illuminate\Support\ServiceProvider;

final class OrderServiceProvider extends ServiceProvider implements ModuleInterface
{
    public function bindings(): array
    {
        return [
            OrderRepositoryInterface::class => EloquentOrderRepository::class,
        ];
    }

    public function routes(): array
    {
        return [__DIR__ . '/Routes/api.php'];
    }

    public function migrations(): array
    {
        return [__DIR__ . '/Database/Migrations'];
    }

    public function register(): void
    {
        foreach ($this->bindings() as $abstract => $concrete) {
            $this->app->bind($abstract, $concrete);
        }

        $this->mergeConfigFrom(__DIR__ . '/Config/order.php', 'modules.order');
    }

    public function boot(): void
    {
        foreach ($this->routes() as $routeFile) {
            $this->loadRoutesFrom($routeFile);
        }

        foreach ($this->migrations() as $migrationPath) {
            $this->loadMigrationsFrom($migrationPath);
        }
    }
}
```

```php
<?php
// Cross-module communication — ONLY through integration events
declare(strict_types=1);

namespace App\Shared\Events;

abstract readonly class IntegrationEvent
{
    public function __construct(
        public string $eventId,
        public string $sourceModule,
        public \DateTimeImmutable $occurredAt,
    ) {}
}

// Order module publishes
namespace App\Modules\Order\Domain\Events;

use App\Shared\Events\IntegrationEvent;

final readonly class OrderConfirmedEvent extends IntegrationEvent
{
    public function __construct(
        public string $orderId,
        public string $userId,
        public int $totalCents,
        /** @var array<int, array{product_id: string, quantity: int}> */
        public array $items,
    ) {
        parent::__construct(
            eventId: uniqid('evt_', true),
            sourceModule: 'order',
            occurredAt: new \DateTimeImmutable(),
        );
    }
}

// Inventory module listens — no direct Order module import
namespace App\Modules\Inventory\Application\Listeners;

use App\Shared\Events\IntegrationEvent;

final class ReserveStockOnOrderConfirmed
{
    public function handle(IntegrationEvent $event): void
    {
        // Only process events we care about
        if (!property_exists($event, 'items')) {
            return;
        }

        foreach ($event->items as $item) {
            // Reserve stock using Inventory module's own domain logic
        }
    }
}
```

**Key Points**:
- Each module is a self-contained unit with its own Domain/Application/Infrastructure/Presentation
- Modules communicate ONLY through integration events in `App\Shared\Events/`
- No direct class imports between modules — never `use App\Modules\Order\*` from Payment module
- Shared kernel (`App\Shared/`) contains only cross-cutting contracts and value objects
- Each module can be extracted to a separate service by replacing events with message queues
- Database: each module owns its tables; no cross-module foreign keys

---

### Pattern 377.2: Micro-Service Communication

**Category**: Distributed Architecture
**Description**: Patterns for Laravel services communicating with other services — synchronous (HTTP/gRPC) and asynchronous (queues/events).

```php
<?php
// Synchronous communication — HTTP client wrapper
declare(strict_types=1);

namespace App\Infrastructure\External\Services;

use App\Domain\Payment\Ports\PaymentServiceInterface;
use App\Domain\Payment\ValueObjects\PaymentResult;
use App\Domain\Payment\ValueObjects\Money;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

final readonly class PaymentServiceClient implements PaymentServiceInterface
{
    public function __construct(
        private string $baseUrl,
        private string $apiKey,
        private int $timeoutSeconds = 10,
        private int $retryTimes = 3,
    ) {}

    public function charge(string $customerId, Money $amount): PaymentResult
    {
        $response = $this->client()
            ->post('/api/v1/charges', [
                'customer_id' => $customerId,
                'amount' => $amount->cents(),
                'currency' => $amount->currency(),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException(
                "Payment service error: {$response->status()} — {$response->body()}",
            );
        }

        $data = $response->json();

        return new PaymentResult(
            transactionId: $data['transaction_id'],
            success: $data['status'] === 'succeeded',
            amount: $amount,
        );
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withToken($this->apiKey)
            ->timeout($this->timeoutSeconds)
            ->retry(
                times: $this->retryTimes,
                sleepMilliseconds: 200,
                when: fn ($exception, $request) => $exception instanceof \Illuminate\Http\Client\ConnectionException,
            )
            ->acceptJson();
    }
}
```

```php
<?php
// Asynchronous communication — queue-based messaging
declare(strict_types=1);

namespace App\Infrastructure\Messaging;

use App\Shared\Events\IntegrationEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

final class PublishIntegrationEvent implements ShouldQueue
{
    use InteractsWithQueue;
    use SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;
    public string $queue = 'integration-events';

    public function __construct(
        public readonly IntegrationEvent $event,
        public readonly string $targetService,
    ) {}

    public function handle(): void
    {
        // Publish to RabbitMQ / Redis Streams / SQS
        // Each target service has its own queue
        $payload = [
            'event_id' => $this->event->eventId,
            'event_type' => get_class($this->event),
            'source' => $this->event->sourceModule,
            'occurred_at' => $this->event->occurredAt->format('c'),
            'data' => $this->serializeEvent($this->event),
        ];

        // Using Laravel's queue system as the transport
        dispatch(fn () => $this->publishToExternalBroker($payload))
            ->onQueue("{$this->targetService}.events");
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeEvent(IntegrationEvent $event): array
    {
        return get_object_vars($event);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function publishToExternalBroker(array $payload): void
    {
        // Implementation depends on broker (RabbitMQ, Kafka, etc.)
    }
}
```

```php
<?php
// Circuit breaker — protect against cascading failures
declare(strict_types=1);

namespace App\Infrastructure\External\CircuitBreaker;

use Illuminate\Support\Facades\Cache;

final class CircuitBreaker
{
    private const STATE_CLOSED = 'closed';
    private const STATE_OPEN = 'open';
    private const STATE_HALF_OPEN = 'half_open';

    public function __construct(
        private readonly string $serviceName,
        private readonly int $failureThreshold = 5,
        private readonly int $recoveryTimeSeconds = 30,
    ) {}

    public function call(callable $operation): mixed
    {
        $state = $this->getState();

        if ($state === self::STATE_OPEN) {
            if ($this->shouldAttemptRecovery()) {
                $this->setState(self::STATE_HALF_OPEN);
            } else {
                throw new CircuitOpenException(
                    "Circuit breaker open for {$this->serviceName}",
                );
            }
        }

        try {
            $result = $operation();
            $this->onSuccess();
            return $result;
        } catch (\Throwable $e) {
            $this->onFailure();
            throw $e;
        }
    }

    private function onSuccess(): void
    {
        Cache::put("cb:{$this->serviceName}:failures", 0);
        $this->setState(self::STATE_CLOSED);
    }

    private function onFailure(): void
    {
        $failures = (int) Cache::get("cb:{$this->serviceName}:failures", 0) + 1;
        Cache::put("cb:{$this->serviceName}:failures", $failures);

        if ($failures >= $this->failureThreshold) {
            $this->setState(self::STATE_OPEN);
            Cache::put("cb:{$this->serviceName}:opened_at", now()->timestamp);
        }
    }

    private function getState(): string
    {
        return Cache::get("cb:{$this->serviceName}:state", self::STATE_CLOSED);
    }

    private function setState(string $state): void
    {
        Cache::put("cb:{$this->serviceName}:state", $state);
    }

    private function shouldAttemptRecovery(): bool
    {
        $openedAt = Cache::get("cb:{$this->serviceName}:opened_at", 0);
        return (now()->timestamp - $openedAt) >= $this->recoveryTimeSeconds;
    }
}
```

**Key Points**:
- Synchronous: use Laravel HTTP client with timeout, retry, and circuit breaker
- Asynchronous: use Laravel queues as the transport layer for integration events
- Circuit breaker prevents cascading failures when downstream services are down
- Always define service clients behind Domain port interfaces — swappable in tests
- Use service discovery via config (not hardcoded URLs) for inter-service communication
- Retry with exponential backoff for transient failures; fail fast for permanent errors

---

### Pattern 377.3: API Gateway Pattern

**Category**: System Architecture
**Description**: Laravel acting as an API gateway — routing, authentication, rate limiting, and request aggregation for downstream services.

```php
<?php
// API Gateway Controller — aggregates multiple service calls
declare(strict_types=1);

namespace App\Http\Controllers\Api\Gateway;

use App\Services\Gateway\OrderServiceClient;
use App\Services\Gateway\UserServiceClient;
use App\Services\Gateway\InventoryServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

final class OrderGatewayController
{
    public function __construct(
        private readonly OrderServiceClient $orderService,
        private readonly UserServiceClient $userService,
        private readonly InventoryServiceClient $inventoryService,
    ) {}

    /**
     * Aggregate order details with user and inventory data
     */
    public function show(Request $request, string $orderId): JsonResponse
    {
        // Parallel requests to downstream services
        $responses = Http::pool(fn ($pool) => [
            $pool->as('order')->get("{$this->orderService->baseUrl}/orders/{$orderId}"),
            $pool->as('user')->get("{$this->userService->baseUrl}/users/{$request->user()->id}"),
        ]);

        if ($responses['order']->failed()) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        $order = $responses['order']->json('data');
        $user = $responses['user']->json('data');

        // Enrich order with user data
        $order['customer'] = [
            'name' => $user['name'],
            'email' => $user['email'],
        ];

        return response()->json(['data' => $order]);
    }
}
```

```php
<?php
// Gateway middleware — rate limiting per client
declare(strict_types=1);

// bootstrap/app.php configuration
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// In AppServiceProvider boot()
RateLimiter::for('gateway', function (Request $request) {
    return $request->user()
        ? Limit::perMinute(rate: 120)->by($request->user()->id)
        : Limit::perMinute(rate: 30)->by($request->ip());
});

// Route definition
Route::middleware(['auth:sanctum', 'throttle:gateway'])
    ->prefix('gateway/v1')
    ->group(function () {
        Route::get('/orders/{id}', [OrderGatewayController::class, 'show']);
    });
```

**Key Points**:
- API gateway aggregates responses from multiple downstream services
- Use `Http::pool()` for parallel requests to minimize latency
- Rate limiting per authenticated user or IP address
- Gateway handles auth/authz centrally — downstream services trust the gateway
- Response transformation: strip internal fields, merge data from multiple services
- Cache frequently-accessed aggregated responses with short TTL

---

### Pattern 377.4: Event-Driven Architecture

**Category**: System Architecture
**Description**: Building Laravel applications around domain events — event publishing, event-driven workflows, saga orchestration, and eventual consistency.

```php
<?php
// Domain Event — raised within aggregate
declare(strict_types=1);

namespace App\Domain\Order\Events;

final readonly class OrderPlacedEvent
{
    public function __construct(
        public string $orderId,
        public string $userId,
        public int $totalCents,
        public string $currency,
        /** @var array<int, array{product_id: string, quantity: int}> */
        public array $items,
        public \DateTimeImmutable $occurredAt,
    ) {}
}
```

```php
<?php
// Event dispatcher — publishes domain events after persistence
declare(strict_types=1);

namespace App\Infrastructure\Events;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use Illuminate\Contracts\Events\Dispatcher;

final readonly class EventDispatchingOrderRepository implements OrderRepositoryInterface
{
    public function __construct(
        private OrderRepositoryInterface $inner,
        private Dispatcher $dispatcher,
    ) {}

    public function save(Order $order): void
    {
        // 1. Persist first
        $this->inner->save($order);

        // 2. Dispatch domain events after successful persistence
        foreach ($order->releaseEvents() as $event) {
            $this->dispatcher->dispatch($event);
        }
    }

    // ... delegate other methods to $this->inner
}
```

```php
<?php
// Saga — orchestrate multi-step workflow with compensation
declare(strict_types=1);

namespace App\Application\Order\Sagas;

use App\Domain\Order\Events\OrderPlacedEvent;
use App\Domain\Inventory\Ports\InventoryServiceInterface;
use App\Domain\Payment\Ports\PaymentServiceInterface;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Order\ValueObjects\Money;
use Illuminate\Contracts\Queue\ShouldQueue;

final class OrderPlacementSaga implements ShouldQueue
{
    public int $tries = 1; // Saga handles its own compensation

    public function __construct(
        private readonly InventoryServiceInterface $inventory,
        private readonly PaymentServiceInterface $payment,
        private readonly OrderRepositoryInterface $orders,
    ) {}

    public function handle(OrderPlacedEvent $event): void
    {
        $compensations = [];

        try {
            // Step 1: Reserve inventory
            $this->inventory->reserve($event->items);
            $compensations[] = fn () => $this->inventory->release($event->items);

            // Step 2: Charge payment
            $result = $this->payment->charge(
                customerId: $event->userId,
                amount: new Money($event->totalCents, $event->currency),
            );
            $compensations[] = fn () => $this->payment->refund(
                transactionId: $result->transactionId,
                amount: new Money($event->totalCents, $event->currency),
            );

            // Step 3: Confirm order
            $order = $this->orders->findById(new OrderId($event->orderId));
            $order->confirm();
            $this->orders->save($order);

        } catch (\Throwable $e) {
            // Compensate in reverse order
            foreach (array_reverse($compensations) as $compensate) {
                try {
                    $compensate();
                } catch (\Throwable $compensationError) {
                    // Log compensation failure — requires manual intervention
                    report($compensationError);
                }
            }

            // Mark order as failed
            $order = $this->orders->findById(new OrderId($event->orderId));
            $order?->fail($e->getMessage());
            $this->orders->save($order);

            throw $e;
        }
    }
}
```

**Key Points**:
- Domain events are raised within aggregates, dispatched after successful persistence
- Use the decorator pattern to add event dispatching to repositories
- Sagas orchestrate multi-step workflows with explicit compensation logic
- Events enable loose coupling — producer does not know about consumers
- Eventual consistency: events may be processed asynchronously via queues
- Always persist before dispatching — never dispatch events on uncommitted state

---

### Pattern 377.5: CQRS + Event Sourcing Architecture

**Category**: System Architecture
**Description**: Command Query Responsibility Segregation with Event Sourcing — separate write and read models, event store as source of truth.

```php
<?php
// Aggregate Root with Event Sourcing
declare(strict_types=1);

namespace App\Domain\Order\Aggregates;

use App\Domain\Order\Events\OrderCreated;
use App\Domain\Order\Events\OrderItemAdded;
use App\Domain\Order\Events\OrderConfirmed;
use App\Domain\Order\Events\OrderCancelled;
use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Order\ValueObjects\Money;

final class OrderAggregate
{
    private OrderId $id;
    private string $status = 'draft';
    private int $totalCents = 0;
    /** @var array<string, object> */
    private array $uncommittedEvents = [];
    private int $version = 0;

    public static function create(OrderId $id, string $userId): self
    {
        $aggregate = new self();
        $aggregate->apply(new OrderCreated(
            orderId: $id->toString(),
            userId: $userId,
            occurredAt: new \DateTimeImmutable(),
        ));
        return $aggregate;
    }

    public function addItem(string $productId, int $quantity, Money $price): void
    {
        $this->apply(new OrderItemAdded(
            orderId: $this->id->toString(),
            productId: $productId,
            quantity: $quantity,
            priceCents: $price->cents(),
        ));
    }

    public function confirm(): void
    {
        if ($this->status !== 'draft') {
            throw new \DomainException('Only draft orders can be confirmed');
        }

        $this->apply(new OrderConfirmed(
            orderId: $this->id->toString(),
            totalCents: $this->totalCents,
        ));
    }

    // Event application — mutate state from events
    private function applyOrderCreated(OrderCreated $event): void
    {
        $this->id = new OrderId($event->orderId);
        $this->status = 'draft';
    }

    private function applyOrderItemAdded(OrderItemAdded $event): void
    {
        $this->totalCents += $event->priceCents * $event->quantity;
    }

    private function applyOrderConfirmed(OrderConfirmed $event): void
    {
        $this->status = 'confirmed';
    }

    private function apply(object $event): void
    {
        $method = 'apply' . (new \ReflectionClass($event))->getShortName();
        if (method_exists($this, $method)) {
            $this->$method($event);
        }
        $this->uncommittedEvents[] = $event;
        $this->version++;
    }

    /**
     * Reconstitute aggregate from stored events
     * @param array<int, object> $events
     */
    public static function fromEvents(array $events): self
    {
        $aggregate = new self();
        foreach ($events as $event) {
            $method = 'apply' . (new \ReflectionClass($event))->getShortName();
            if (method_exists($aggregate, $method)) {
                $aggregate->$method($event);
            }
            $aggregate->version++;
        }
        return $aggregate;
    }

    /** @return array<string, object> */
    public function releaseUncommittedEvents(): array
    {
        $events = $this->uncommittedEvents;
        $this->uncommittedEvents = [];
        return $events;
    }

    public function version(): int { return $this->version; }
}
```

```php
<?php
// Read Model (Projection) — denormalized for queries
declare(strict_types=1);

namespace App\Infrastructure\ReadModels\Projectors;

use App\Domain\Order\Events\OrderCreated;
use App\Domain\Order\Events\OrderItemAdded;
use App\Domain\Order\Events\OrderConfirmed;
use Illuminate\Support\Facades\DB;

final class OrderProjector
{
    public function onOrderCreated(OrderCreated $event): void
    {
        DB::table('order_read_models')->insert([
            'id' => $event->orderId,
            'user_id' => $event->userId,
            'status' => 'draft',
            'total_cents' => 0,
            'item_count' => 0,
            'created_at' => $event->occurredAt,
        ]);
    }

    public function onOrderItemAdded(OrderItemAdded $event): void
    {
        DB::table('order_read_models')
            ->where('id', $event->orderId)
            ->increment('total_cents', $event->priceCents * $event->quantity);

        DB::table('order_read_models')
            ->where('id', $event->orderId)
            ->increment('item_count');
    }

    public function onOrderConfirmed(OrderConfirmed $event): void
    {
        DB::table('order_read_models')
            ->where('id', $event->orderId)
            ->update(['status' => 'confirmed']);
    }
}
```

```php
<?php
// CQRS — separate command and query sides
declare(strict_types=1);

// COMMAND SIDE — goes through aggregate
namespace App\Application\Order\Commands;

final readonly class ConfirmOrderCommand
{
    public function __construct(
        public string $orderId,
    ) {}
}

namespace App\Application\Order\Handlers;

use App\Application\Order\Commands\ConfirmOrderCommand;
use App\Infrastructure\EventStore\EventStoreInterface;
use App\Domain\Order\Aggregates\OrderAggregate;

final readonly class ConfirmOrderHandler
{
    public function __construct(
        private EventStoreInterface $eventStore,
    ) {}

    public function handle(ConfirmOrderCommand $command): void
    {
        // Load aggregate from event store
        $events = $this->eventStore->load($command->orderId);
        $aggregate = OrderAggregate::fromEvents($events);

        // Execute command
        $aggregate->confirm();

        // Persist new events
        $this->eventStore->append(
            aggregateId: $command->orderId,
            events: $aggregate->releaseUncommittedEvents(),
            expectedVersion: $aggregate->version(),
        );
    }
}

// QUERY SIDE — reads from projection (read model)
namespace App\Application\Order\Queries;

final readonly class GetOrderQuery
{
    public function __construct(
        public string $orderId,
    ) {}
}

namespace App\Application\Order\Handlers;

use App\Application\Order\Queries\GetOrderQuery;
use Illuminate\Support\Facades\DB;

final readonly class GetOrderQueryHandler
{
    public function handle(GetOrderQuery $query): ?object
    {
        return DB::table('order_read_models')
            ->where('id', $query->orderId)
            ->first();
    }
}
```

**Key Points**:
- Event Store is the source of truth — no UPDATE/DELETE, only INSERT events
- Aggregate state is rebuilt by replaying events (`fromEvents()`)
- Read models (projections) are denormalized views optimized for queries
- Projectors listen for events and update read models asynchronously
- CQRS: commands go through aggregates (write side), queries go through projections (read side)
- Use `spatie/laravel-event-sourcing` for production-ready event store in Laravel
- Snapshotting: periodically save aggregate state to avoid replaying thousands of events

---

### Pattern 377.6: DDD Tactical Patterns in Laravel

**Category**: Domain Design
**Description**: Domain-Driven Design tactical patterns — aggregates, repositories, domain services, specifications, and domain events adapted for Laravel.

```php
<?php
// Aggregate Root — consistency boundary
declare(strict_types=1);

namespace App\Domain\Order\Entities;

use App\Domain\Shared\Contracts\AggregateRootInterface;
use App\Domain\Order\ValueObjects\OrderId;

final class Order implements AggregateRootInterface
{
    /** @var array<int, object> */
    private array $domainEvents = [];

    // All state changes go through the aggregate root
    // Child entities (OrderItem) are only modified through Order methods

    public function addItem(string $productId, int $quantity, Money $price): void
    {
        // Invariant: max 50 items per order
        if (count($this->items) >= 50) {
            throw new OrderLimitExceededException('Maximum 50 items per order');
        }

        // Invariant: no duplicate products
        foreach ($this->items as $item) {
            if ($item->productId() === $productId) {
                throw new DuplicateItemException("Product {$productId} already in order");
            }
        }

        $this->items[] = new OrderItem($productId, $quantity, $price);
        $this->recalculateTotal();
    }

    public function aggregateId(): string
    {
        return $this->id->toString();
    }
}
```

```php
<?php
// Repository — persistence abstraction for aggregates
declare(strict_types=1);

namespace App\Domain\Order\Ports;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\ValueObjects\OrderId;

interface OrderRepositoryInterface
{
    /**
     * Load complete aggregate (root + children)
     */
    public function findById(OrderId $id): ?Order;

    /**
     * Persist entire aggregate atomically
     */
    public function save(Order $order): void;

    /**
     * Generate next identity
     */
    public function nextIdentity(): OrderId;
}
```

```php
<?php
// Domain Service — cross-aggregate business logic
declare(strict_types=1);

namespace App\Domain\Order\Services;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Pricing\Ports\PricingServiceInterface;
use App\Domain\Order\ValueObjects\Money;

final readonly class OrderPricingService
{
    public function __construct(
        private PricingServiceInterface $pricingService,
    ) {}

    /**
     * Cross-aggregate operation: apply pricing rules from Pricing domain
     * to Order domain. Cannot live in either aggregate alone.
     */
    public function applyDiscount(Order $order, string $couponCode): Money
    {
        $discount = $this->pricingService->calculateDiscount(
            couponCode: $couponCode,
            orderTotal: $order->total(),
            itemCount: count($order->items()),
        );

        $order->applyDiscount($discount);

        return $discount;
    }
}
```

```php
<?php
// Specification Pattern — encapsulate business rules
declare(strict_types=1);

namespace App\Domain\Order\Specifications;

use App\Domain\Order\Entities\Order;

interface SpecificationInterface
{
    public function isSatisfiedBy(Order $order): bool;
    public function reason(): string;
}

final readonly class OrderCanBeShippedSpecification implements SpecificationInterface
{
    public function isSatisfiedBy(Order $order): bool
    {
        return $order->status()->value === 'confirmed'
            && $order->hasShippingAddress()
            && $order->isPaid();
    }

    public function reason(): string
    {
        return 'Order must be confirmed, have a shipping address, and be paid';
    }
}

final readonly class CompositeSpecification implements SpecificationInterface
{
    /** @param array<int, SpecificationInterface> $specifications */
    public function __construct(
        private array $specifications,
    ) {}

    public function isSatisfiedBy(Order $order): bool
    {
        foreach ($this->specifications as $spec) {
            if (!$spec->isSatisfiedBy($order)) {
                return false;
            }
        }
        return true;
    }

    public function reason(): string
    {
        $reasons = [];
        foreach ($this->specifications as $spec) {
            $reasons[] = $spec->reason();
        }
        return implode('; ', $reasons);
    }
}
```

```php
<?php
// Domain Event with rich context
declare(strict_types=1);

namespace App\Domain\Order\Events;

final readonly class OrderShippedEvent
{
    public function __construct(
        public string $orderId,
        public string $userId,
        public string $trackingNumber,
        public string $carrier,
        public \DateTimeImmutable $shippedAt,
        public \DateTimeImmutable $estimatedDelivery,
    ) {}
}

// Anti-corruption Layer — translate external concepts to domain language
namespace App\Infrastructure\AntiCorruption;

use App\Domain\Shipping\ValueObjects\TrackingInfo;

final readonly class ShippingProviderTranslator
{
    /**
     * Translate external shipping API response to domain value object
     * @param array<string, mixed> $externalResponse
     */
    public function toTrackingInfo(array $externalResponse): TrackingInfo
    {
        // External API uses different field names and formats
        return new TrackingInfo(
            trackingNumber: $externalResponse['shipment_ref'] ?? '',
            carrier: match ($externalResponse['provider_code']) {
                'FDX' => 'FedEx',
                'UPS' => 'UPS',
                'USPS' => 'USPS',
                default => $externalResponse['provider_code'],
            },
            estimatedDelivery: new \DateTimeImmutable(
                $externalResponse['eta_iso8601'],
            ),
        );
    }
}
```

**Key Points**:
- **Aggregate Root**: enforces invariants for a cluster of entities; only modify children through the root
- **Repository**: one per aggregate root, persists the entire aggregate atomically
- **Domain Service**: cross-aggregate logic that doesn't belong in any single aggregate
- **Specification**: encapsulates business rules as reusable, composable objects
- **Domain Event**: records what happened; includes all data needed by consumers
- **Anti-Corruption Layer**: translates external service responses to domain value objects
- Keep aggregates small — prefer more aggregates over larger ones to reduce contention

---

## Best Practices

- **Start monolith, extract later** — modular monolith first; extract to microservices only when scaling demands it
- **Module boundaries are non-negotiable** — no cross-module direct imports; communicate via events or shared contracts
- **Aggregate boundaries define transactions** — one transaction per aggregate; cross-aggregate consistency via sagas
- **Event sourcing is opt-in per aggregate** — not every aggregate needs event sourcing; use it where audit trail matters
- **CQRS without event sourcing** — you can separate read/write models without event sourcing using different Eloquent models
- **Circuit breakers for all external calls** — never call external services without timeout, retry, and circuit breaker
- **Saga compensation must be idempotent** — compensating actions may be called multiple times; ensure they are safe to repeat
- **Anti-corruption layer at system boundaries** — never let external data structures leak into your domain

---

## Abnormal Case Patterns

1. **Cross-module direct imports** — `use App\Modules\Payment\Models\Payment` from Order module. Fix: define integration event in `App\Shared\Events/`, publish from Payment, listen from Order.

2. **Saga without compensation** — saga calls 3 services but only handles success path. Fix: define explicit compensation for each step, execute in reverse order on failure.

3. **Event sourcing for simple CRUD** — event sourcing applied to a settings page with no audit requirements. Fix: use standard Eloquent for simple domains; reserve event sourcing for complex, auditable aggregates.

4. **Oversized aggregates** — aggregate root with 20+ child entities causing lock contention. Fix: split into smaller aggregates; use eventual consistency between them.

5. **Synchronous micro-service calls in loops** — calling payment service per item in a loop. Fix: batch API calls or use async queue processing.

6. **Missing circuit breaker** — external service timeout cascading to HTTP 504 for all users. Fix: wrap all external service calls in circuit breaker with fallback behavior.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E6 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (377.1–377.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Architecture Patterns Specialist — Architecture | EPS v3.2*
