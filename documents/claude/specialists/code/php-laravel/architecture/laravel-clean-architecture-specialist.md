# Laravel Clean Architecture Specialist — Architecture
# Laravelクリーンアーキテクチャスペシャリスト — アーキテクチャ
# Chuyen Gia Kien Truc Sach Laravel — Kien Truc

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: Clean Architecture Implementation
**Category**: architecture
**Purpose**: Knowledge provider for clean architecture implementation in Laravel — port/adapter pattern, use case classes, domain entities without Eloquent, infrastructure adapters, hexagonal architecture mapping, dependency inversion, and testing strategy

---

## Metadata

```json
{
  "id": "laravel-clean-architecture-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Clean Architecture Implementation",
  "category": "architecture",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Clean Architecture (Robert C. Martin, 2012) — dependency rule, entity/use-case/adapter layers",
    "E2: Hexagonal Architecture (Alistair Cockburn) — ports and adapters pattern",
    "E3: Laravel port/adapter implementations — community best practices",
    "E4: PHP 8.3 features — readonly classes, intersection types, enums for domain modeling",
    "E5: Domain-Driven Design tactical patterns — entities, value objects, aggregates"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 376.1–376.8 |
| **Directory Pattern** | `app/Domain/`, `app/Application/`, `app/Infrastructure/` |
| **Naming Convention** | `{Entity}.php`, `{UseCase}Handler.php`, `{Port}Interface.php`, `{Adapter}.php` |
| **Imports From** | Domain (ports/entities), Application (use cases/DTOs) |
| **Imported By** | Presentation layer (controllers), Infrastructure (adapter implementations) |
| **Cannot Import** | Domain cannot import anything; Application cannot import Infrastructure |
| **Dependencies** | `php:^8.3`, `laravel/framework:^11.0` |
| **When To Use** | Projects requiring strict domain isolation, long-lived applications, complex business logic |
| **Source Skeleton** | `app/Domain/{Context}/`, `app/Application/{Context}/`, `app/Infrastructure/` |
| **Specialist Type** | code |
| **Purpose** | Implement clean architecture in Laravel — domain purity, use case isolation, adapter pattern |
| **Activation Trigger** | keywords: clean architecture, hexagonal, ports and adapters, domain entity, use case; directories: `app/Domain/`, `app/Application/` |

---

## Role

You are a **Laravel Clean Architecture Specialist**. Your responsibility is to provide patterns for implementing clean architecture within Laravel 11 + PHP 8.3 — including pure domain entities, use case handlers, port/adapter boundaries, infrastructure adapters, hexagonal architecture mapping, dependency inversion enforcement, and clean architecture testing strategies.

**Used by**: Code agents implementing domain-isolated Laravel applications, architects designing bounded contexts
**Not used by**: Simple CRUD applications, prototypes, non-Laravel stacks

---

## Patterns

### Pattern 376.1: Clean Architecture Layers in Laravel

**Category**: Layer Definition
**Description**: The four concentric layers of clean architecture mapped to Laravel directory structure and their responsibilities.

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │                                         │   │
│   │   ┌─────────────────────────────────┐   │   │
│   │   │                                 │   │   │
│   │   │   ┌─────────────────────────┐   │   │   │
│   │   │   │       DOMAIN            │   │   │   │
│   │   │   │  Entities, ValueObjects │   │   │   │
│   │   │   │  Ports, Events, Enums   │   │   │   │
│   │   │   └─────────────────────────┘   │   │   │
│   │   │         APPLICATION             │   │   │
│   │   │   Commands, Queries, Handlers   │   │   │
│   │   │   DTOs, Validators              │   │   │
│   │   └─────────────────────────────────┘   │   │
│   │           INFRASTRUCTURE                │   │
│   │   Eloquent, Redis, Stripe, Mail, Queue  │   │
│   └─────────────────────────────────────────┘   │
│               PRESENTATION                      │
│   Controllers, Requests, Resources, Middleware  │
└─────────────────────────────────────────────────┘
```

```php
<?php
// Layer responsibilities — namespace mapping
declare(strict_types=1);

/*
 * DOMAIN (app/Domain/) — Business rules, entities, contracts
 * - Zero framework dependencies
 * - Pure PHP 8.3 classes
 * - Defines WHAT the system does
 *
 * APPLICATION (app/Application/) — Use case orchestration
 * - Depends only on Domain
 * - Coordinates entities via ports
 * - Defines HOW use cases flow
 *
 * INFRASTRUCTURE (app/Infrastructure/) — External adapters
 * - Implements Domain ports
 * - Contains all framework-specific code
 * - Eloquent models, API clients, queue jobs
 *
 * PRESENTATION (app/Presentation/) — User interface
 * - HTTP controllers, CLI commands
 * - Depends on Application (handlers/DTOs)
 * - Validates input, formats output
 */
```

**Key Points**:
- Inner layers define interfaces (ports); outer layers provide implementations (adapters)
- Dependency arrows point INWARD only — never from inner to outer
- Domain is the core — if you delete all other layers, Domain should still compile
- Each layer has clear namespace boundaries enforced by tooling

---

### Pattern 376.2: Port/Adapter Pattern

**Category**: Dependency Boundary
**Description**: Ports define contracts in the Domain layer; Adapters implement them in the Infrastructure layer. This is the core mechanism of clean architecture.

```php
<?php
// PORT — Domain layer interface (what we need)
declare(strict_types=1);

namespace App\Domain\Order\Ports;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\ValueObjects\OrderId;

interface OrderRepositoryInterface
{
    public function findById(OrderId $id): ?Order;
    public function save(Order $order): void;
    public function delete(OrderId $id): void;

    /**
     * @return array<int, Order>
     */
    public function findByStatus(string $status, int $limit = 50): array;
    public function nextIdentity(): OrderId;
}
```

```php
<?php
// PORT — External service contract
declare(strict_types=1);

namespace App\Domain\Payment\Ports;

use App\Domain\Payment\ValueObjects\PaymentResult;
use App\Domain\Payment\ValueObjects\Money;

interface PaymentGatewayInterface
{
    public function charge(string $customerId, Money $amount): PaymentResult;
    public function refund(string $transactionId, Money $amount): PaymentResult;
    public function createCustomer(string $email, string $name): string;
}
```

```php
<?php
// ADAPTER — Infrastructure implementation (how we provide it)
declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\OrderId;
use App\Infrastructure\Persistence\Eloquent\Mappers\OrderMapper;
use App\Infrastructure\Persistence\Eloquent\Models\OrderModel;
use Illuminate\Support\Str;

final readonly class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function __construct(
        private OrderMapper $mapper,
    ) {}

    public function findById(OrderId $id): ?Order
    {
        $model = OrderModel::with(['items', 'payments'])->find($id->toString());
        return $model ? $this->mapper->toDomain($model) : null;
    }

    public function save(Order $order): void
    {
        $data = $this->mapper->toPersistence($order);
        OrderModel::updateOrCreate(
            attributes: ['id' => $data['id']],
            values: $data,
        );
    }

    public function delete(OrderId $id): void
    {
        OrderModel::where('id', $id->toString())->delete();
    }

    public function findByStatus(string $status, int $limit = 50): array
    {
        return OrderModel::where('status', $status)
            ->limit($limit)
            ->get()
            ->map(fn (OrderModel $model) => $this->mapper->toDomain($model))
            ->all();
    }

    public function nextIdentity(): OrderId
    {
        return new OrderId(Str::uuid()->toString());
    }
}
```

```php
<?php
// ADAPTER — External service implementation
declare(strict_types=1);

namespace App\Infrastructure\External\Payment;

use App\Domain\Payment\Ports\PaymentGatewayInterface;
use App\Domain\Payment\ValueObjects\Money;
use App\Domain\Payment\ValueObjects\PaymentResult;
use Stripe\StripeClient;

final readonly class StripePaymentGateway implements PaymentGatewayInterface
{
    public function __construct(
        private StripeClient $stripe,
    ) {}

    public function charge(string $customerId, Money $amount): PaymentResult
    {
        $intent = $this->stripe->paymentIntents->create([
            'amount' => $amount->cents(),
            'currency' => $amount->currency(),
            'customer' => $customerId,
            'confirm' => true,
        ]);

        return new PaymentResult(
            transactionId: $intent->id,
            success: $intent->status === 'succeeded',
            amount: $amount,
        );
    }

    public function refund(string $transactionId, Money $amount): PaymentResult
    {
        $refund = $this->stripe->refunds->create([
            'payment_intent' => $transactionId,
            'amount' => $amount->cents(),
        ]);

        return new PaymentResult(
            transactionId: $refund->id,
            success: $refund->status === 'succeeded',
            amount: $amount,
        );
    }

    public function createCustomer(string $email, string $name): string
    {
        $customer = $this->stripe->customers->create([
            'email' => $email,
            'name' => $name,
        ]);

        return $customer->id;
    }
}
```

**Key Points**:
- Ports are interfaces in `Domain/{Context}/Ports/` — they define WHAT the domain needs
- Adapters are classes in `Infrastructure/` — they define HOW the need is fulfilled
- Multiple adapters can implement the same port (Eloquent repo, In-memory repo, API repo)
- Port method signatures use Domain types only (ValueObjects, Entities) — never Eloquent models
- Service providers wire ports to adapters — the only place coupling exists

---

### Pattern 376.3: Use Case Classes

**Category**: Application Layer
**Description**: Each use case is a single-responsibility handler class that orchestrates domain logic through ports.

```php
<?php
// Command — immutable input for write operations
declare(strict_types=1);

namespace App\Application\Order\Commands;

final readonly class CreateOrderCommand
{
    /**
     * @param array<int, array{product_id: string, quantity: int, price: int}> $items
     */
    public function __construct(
        public string $userId,
        public array $items,
        public string $shippingAddress,
        public string $paymentMethodId,
    ) {}
}
```

```php
<?php
// Handler — the use case implementation
declare(strict_types=1);

namespace App\Application\Order\Handlers;

use App\Application\Order\Commands\CreateOrderCommand;
use App\Application\Order\DTOs\OrderDto;
use App\Domain\Order\Entities\Order;
use App\Domain\Order\Entities\OrderItem;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Inventory\Ports\StockCheckerInterface;
use App\Domain\Order\Exceptions\InsufficientStockException;

final readonly class CreateOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private StockCheckerInterface $stockChecker,
    ) {}

    public function handle(CreateOrderCommand $command): OrderDto
    {
        // 1. Validate stock availability (domain rule)
        foreach ($command->items as $item) {
            if (!$this->stockChecker->isAvailable($item['product_id'], $item['quantity'])) {
                throw new InsufficientStockException(
                    "Product {$item['product_id']} has insufficient stock",
                );
            }
        }

        // 2. Create domain entity
        $orderId = $this->orderRepository->nextIdentity();
        $items = array_map(
            fn (array $item) => new OrderItem(
                productId: $item['product_id'],
                quantity: $item['quantity'],
                price: new Money(amount: $item['price'], currency: 'USD'),
            ),
            $command->items,
        );

        $order = Order::create(
            id: $orderId,
            userId: $command->userId,
            items: $items,
            shippingAddress: $command->shippingAddress,
        );

        // 3. Persist through port
        $this->orderRepository->save($order);

        // 4. Return DTO (never return domain entity to outer layers)
        return OrderDto::fromEntity($order);
    }
}
```

```php
<?php
// Query — immutable input for read operations
declare(strict_types=1);

namespace App\Application\Order\Queries;

final readonly class GetOrderQuery
{
    public function __construct(
        public string $orderId,
        public string $userId,
    ) {}
}
```

```php
<?php
// Query handler — read-only use case
declare(strict_types=1);

namespace App\Application\Order\Handlers;

use App\Application\Order\DTOs\OrderDto;
use App\Application\Order\Queries\GetOrderQuery;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\OrderId;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final readonly class GetOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
    ) {}

    public function handle(GetOrderQuery $query): OrderDto
    {
        $order = $this->orderRepository->findById(new OrderId($query->orderId));

        if ($order === null) {
            throw new ModelNotFoundException("Order {$query->orderId} not found");
        }

        // Authorization check — domain-level
        if ($order->userId() !== $query->userId) {
            throw new \DomainException('Unauthorized access to order');
        }

        return OrderDto::fromEntity($order);
    }
}
```

**Key Points**:
- One handler per use case — never combine create/update/delete in one class
- Commands are for write operations; Queries are for reads (CQRS-light)
- Handlers depend on Domain ports via constructor injection
- Always return DTOs from handlers — never return Domain entities to Presentation
- Handlers throw Domain exceptions — Presentation layer maps them to HTTP responses

---

### Pattern 376.4: Domain Entities Without Eloquent

**Category**: Domain Layer
**Description**: Pure PHP 8.3 domain entities with business rules, value objects, and invariant enforcement — zero Eloquent dependency.

```php
<?php
// Domain Entity — pure PHP, enforces business invariants
declare(strict_types=1);

namespace App\Domain\Order\Entities;

use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\Events\OrderPlaced;
use App\Domain\Order\Events\OrderCancelled;
use App\Domain\Order\Exceptions\InvalidOrderStateException;
use App\Domain\Order\Exceptions\EmptyOrderException;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\ValueObjects\OrderId;

final class Order
{
    /** @var array<string, object> */
    private array $domainEvents = [];

    /**
     * @param array<int, OrderItem> $items
     */
    private function __construct(
        private readonly OrderId $id,
        private readonly string $userId,
        private array $items,
        private readonly string $shippingAddress,
        private OrderStatus $status,
        private Money $total,
        private readonly \DateTimeImmutable $createdAt,
        private ?\DateTimeImmutable $cancelledAt = null,
    ) {}

    /**
     * @param array<int, OrderItem> $items
     */
    public static function create(
        OrderId $id,
        string $userId,
        array $items,
        string $shippingAddress,
    ): self {
        if (empty($items)) {
            throw new EmptyOrderException('Order must have at least one item');
        }

        $total = Money::zero('USD');
        foreach ($items as $item) {
            $total = $total->add($item->lineTotal());
        }

        $order = new self(
            id: $id,
            userId: $userId,
            items: $items,
            shippingAddress: $shippingAddress,
            status: OrderStatus::Pending,
            total: $total,
            createdAt: new \DateTimeImmutable(),
        );

        $order->recordEvent(new OrderPlaced(
            orderId: $id->toString(),
            userId: $userId,
            total: $total->amount(),
        ));

        return $order;
    }

    public function cancel(string $reason): void
    {
        if (!$this->status->canTransitionTo(OrderStatus::Cancelled)) {
            throw new InvalidOrderStateException(
                "Cannot cancel order in {$this->status->value} state",
            );
        }

        $this->status = OrderStatus::Cancelled;
        $this->cancelledAt = new \DateTimeImmutable();

        $this->recordEvent(new OrderCancelled(
            orderId: $this->id->toString(),
            reason: $reason,
        ));
    }

    public function id(): OrderId { return $this->id; }
    public function userId(): string { return $this->userId; }
    public function status(): OrderStatus { return $this->status; }
    public function total(): Money { return $this->total; }

    /** @return array<int, OrderItem> */
    public function items(): array { return $this->items; }

    private function recordEvent(object $event): void
    {
        $this->domainEvents[] = $event;
    }

    /** @return array<string, object> */
    public function releaseEvents(): array
    {
        $events = $this->domainEvents;
        $this->domainEvents = [];
        return $events;
    }
}
```

```php
<?php
// Value Object — immutable, self-validating
declare(strict_types=1);

namespace App\Domain\Order\ValueObjects;

use InvalidArgumentException;

final readonly class Money
{
    public function __construct(
        private int $amount,
        private string $currency,
    ) {
        if ($this->amount < 0) {
            throw new InvalidArgumentException('Money amount cannot be negative');
        }
        if (strlen($this->currency) !== 3) {
            throw new InvalidArgumentException('Currency must be 3-letter ISO code');
        }
    }

    public static function zero(string $currency): self
    {
        return new self(amount: 0, currency: $currency);
    }

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException('Cannot add different currencies');
        }
        return new self(amount: $this->amount + $other->amount, currency: $this->currency);
    }

    public function amount(): int { return $this->amount; }
    public function currency(): string { return $this->currency; }
    public function cents(): int { return $this->amount; }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount && $this->currency === $other->currency;
    }
}
```

```php
<?php
// Domain Enum with state machine logic
declare(strict_types=1);

namespace App\Domain\Order\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    /**
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Processing, self::Cancelled],
            self::Processing => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered],
            self::Delivered => [self::Refunded],
            self::Cancelled, self::Refunded => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }
}
```

**Key Points**:
- Domain entities use private constructors with named static factory methods (`create()`)
- All business rules (state transitions, validation) live inside the entity
- Value Objects are `readonly class` — immutable, self-validating, comparable via `equals()`
- Domain Events are recorded internally and released by the infrastructure layer
- No `use Illuminate\*` anywhere in Domain — this is the fundamental rule

---

### Pattern 376.5: Infrastructure Adapters

**Category**: Infrastructure Layer
**Description**: Adapters that implement Domain ports using Laravel framework features — Eloquent, Redis, external APIs, queue.

```php
<?php
// Domain-to-Eloquent Mapper — bridges the two worlds
declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Mappers;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Entities\OrderItem;
use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\ValueObjects\OrderId;
use App\Infrastructure\Persistence\Eloquent\Models\OrderModel;

final class OrderMapper
{
    public function toDomain(OrderModel $model): Order
    {
        $items = $model->items->map(
            fn ($itemModel) => new OrderItem(
                productId: $itemModel->product_id,
                quantity: $itemModel->quantity,
                price: new Money(
                    amount: $itemModel->price_cents,
                    currency: $itemModel->currency,
                ),
            ),
        )->all();

        return Order::reconstitute(
            id: new OrderId($model->id),
            userId: $model->user_id,
            items: $items,
            shippingAddress: $model->shipping_address,
            status: OrderStatus::from($model->status),
            total: new Money(
                amount: $model->total_cents,
                currency: $model->currency,
            ),
            createdAt: $model->created_at->toDateTimeImmutable(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toPersistence(Order $order): array
    {
        return [
            'id' => $order->id()->toString(),
            'user_id' => $order->userId(),
            'status' => $order->status()->value,
            'total_cents' => $order->total()->amount(),
            'currency' => $order->total()->currency(),
            'shipping_address' => $order->shippingAddress(),
        ];
    }
}
```

```php
<?php
// Cache adapter — wraps repository with caching
declare(strict_types=1);

namespace App\Infrastructure\Persistence\Cache;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\OrderId;
use Illuminate\Contracts\Cache\Repository as CacheRepository;

final readonly class CachedOrderRepository implements OrderRepositoryInterface
{
    private const CACHE_TTL = 3600; // 1 hour

    public function __construct(
        private OrderRepositoryInterface $inner,
        private CacheRepository $cache,
    ) {}

    public function findById(OrderId $id): ?Order
    {
        $key = "order:{$id->toString()}";

        return $this->cache->remember(
            key: $key,
            ttl: self::CACHE_TTL,
            callback: fn () => $this->inner->findById($id),
        );
    }

    public function save(Order $order): void
    {
        $this->inner->save($order);
        $this->cache->forget("order:{$order->id()->toString()}");
    }

    public function delete(OrderId $id): void
    {
        $this->inner->delete($id);
        $this->cache->forget("order:{$id->toString()}");
    }

    public function findByStatus(string $status, int $limit = 50): array
    {
        return $this->inner->findByStatus($status, $limit);
    }

    public function nextIdentity(): OrderId
    {
        return $this->inner->nextIdentity();
    }
}
```

**Key Points**:
- Mappers translate between Domain entities and Eloquent models bidirectionally
- Use `reconstitute()` (not `create()`) to rebuild entities from persistence — bypasses creation rules
- Decorator pattern (CachedRepository wrapping EloquentRepository) adds cross-cutting concerns
- Adapters can be swapped without touching Domain or Application code
- Service providers control which adapter is active (Eloquent in prod, InMemory in tests)

---

### Pattern 376.6: Hexagonal Architecture Mapping

**Category**: Architecture Mapping
**Description**: Mapping hexagonal architecture concepts (driving/driven ports and adapters) to Laravel components.

```
┌──────────────────────────────────────────────────────────────┐
│                    HEXAGONAL MAPPING                         │
│                                                              │
│  DRIVING SIDE (primary)          DRIVEN SIDE (secondary)     │
│  ─────────────────────           ────────────────────────     │
│  Input to the system             Output from the system      │
│                                                              │
│  Driving Adapters:               Driven Adapters:            │
│  • HTTP Controllers              • Eloquent Repositories     │
│  • Console Commands              • Stripe Payment Gateway    │
│  • Queue Workers                 • Redis Cache Adapter       │
│  • Event Listeners               • SMTP Mail Adapter         │
│  • GraphQL Resolvers             • S3 File Storage           │
│  • WebSocket Handlers            • Twilio SMS Adapter        │
│                                                              │
│  Driving Ports:                  Driven Ports:               │
│  • Use Case Interfaces           • Repository Interfaces     │
│  • Command/Query Handlers        • Gateway Interfaces        │
│  • Application Services          • Notification Interfaces   │
│                                                              │
│        ┌──────────┐     ┌──────┐     ┌──────────┐           │
│        │ Driving  │────▶│ Core │◀────│  Driven  │           │
│        │ Adapter  │     │      │     │  Adapter │           │
│        └──────────┘     └──────┘     └──────────┘           │
│                                                              │
│  Flow: HTTP Request → Controller → Handler → Port → Adapter │
└──────────────────────────────────────────────────────────────┘
```

```php
<?php
// Driving Port — the use case interface (how external triggers enter)
declare(strict_types=1);

namespace App\Application\Order\Contracts;

use App\Application\Order\Commands\CreateOrderCommand;
use App\Application\Order\DTOs\OrderDto;

interface CreateOrderUseCaseInterface
{
    public function execute(CreateOrderCommand $command): OrderDto;
}
```

```php
<?php
// Driving Adapter — HTTP Controller (primary adapter)
declare(strict_types=1);

namespace App\Presentation\Http\Controllers\Api;

use App\Application\Order\Commands\CreateOrderCommand;
use App\Application\Order\Contracts\CreateOrderUseCaseInterface;
use App\Presentation\Http\Requests\CreateOrderRequest;
use App\Presentation\Http\Resources\OrderResource;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class OrderController
{
    public function store(
        CreateOrderRequest $request,
        CreateOrderUseCaseInterface $useCase,
    ): JsonResponse {
        $dto = $useCase->execute(new CreateOrderCommand(
            userId: $request->user()->id,
            items: $request->validated('items'),
            shippingAddress: $request->validated('shipping_address'),
            paymentMethodId: $request->validated('payment_method_id'),
        ));

        return new JsonResponse(
            data: new OrderResource($dto),
            status: Response::HTTP_CREATED,
        );
    }
}
```

```php
<?php
// Driving Adapter — Console Command (primary adapter for CLI)
declare(strict_types=1);

namespace App\Presentation\Console\Commands;

use App\Application\Order\Contracts\ProcessExpiredOrdersUseCaseInterface;
use Illuminate\Console\Command;

final class ProcessExpiredOrdersCommand extends Command
{
    protected $signature = 'orders:process-expired {--dry-run}';
    protected $description = 'Cancel orders that have been pending beyond the threshold';

    public function handle(ProcessExpiredOrdersUseCaseInterface $useCase): int
    {
        $result = $useCase->execute(dryRun: (bool) $this->option('dry-run'));

        $this->info("Processed {$result->processedCount} expired orders.");

        return self::SUCCESS;
    }
}
```

**Key Points**:
- Driving adapters (left side) receive external input — HTTP, CLI, events, WebSocket
- Driven adapters (right side) provide external output — DB, APIs, cache, mail
- The core (Domain + Application) is framework-agnostic — it defines ports
- Both sides depend on the core; the core depends on nothing external
- Same use case can be triggered by multiple driving adapters (HTTP + CLI + Queue)

---

### Pattern 376.7: Dependency Inversion in Practice

**Category**: Wiring
**Description**: How service providers wire ports to adapters — the only place where concrete implementations are referenced.

```php
<?php
// Service Provider — the composition root
declare(strict_types=1);

namespace App\Infrastructure\Providers;

use App\Application\Order\Contracts\CreateOrderUseCaseInterface;
use App\Application\Order\Handlers\CreateOrderHandler;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Payment\Ports\PaymentGatewayInterface;
use App\Infrastructure\External\Payment\StripePaymentGateway;
use App\Infrastructure\Persistence\Cache\CachedOrderRepository;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentOrderRepository;
use Illuminate\Support\ServiceProvider;
use Stripe\StripeClient;

final class OrderInfrastructureProvider extends ServiceProvider
{
    public function register(): void
    {
        // Driven port → adapter (repository)
        $this->app->singleton(OrderRepositoryInterface::class, function ($app) {
            $eloquentRepo = $app->make(EloquentOrderRepository::class);

            // Decorator: wrap with cache in production
            if ($app->environment('production', 'staging')) {
                return new CachedOrderRepository(
                    inner: $eloquentRepo,
                    cache: $app->make('cache.store'),
                );
            }

            return $eloquentRepo;
        });

        // Driven port → adapter (external service)
        $this->app->singleton(PaymentGatewayInterface::class, fn () => new StripePaymentGateway(
            stripe: new StripeClient(config('services.stripe.secret')),
        ));

        // Driving port → use case handler
        $this->app->bind(
            abstract: CreateOrderUseCaseInterface::class,
            concrete: CreateOrderHandler::class,
        );
    }
}
```

```php
<?php
// Test — swap adapters for in-memory implementations
declare(strict_types=1);

namespace Tests;

use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Payment\Ports\PaymentGatewayInterface;
use Tests\Doubles\InMemoryOrderRepository;
use Tests\Doubles\FakePaymentGateway;

abstract class TestCase extends \Illuminate\Foundation\Testing\TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Swap driven adapters for test doubles
        $this->app->singleton(
            OrderRepositoryInterface::class,
            InMemoryOrderRepository::class,
        );

        $this->app->singleton(
            PaymentGatewayInterface::class,
            FakePaymentGateway::class,
        );
    }
}
```

**Key Points**:
- Service providers are the COMPOSITION ROOT — the only place that knows all concrete classes
- Environment-based adapter selection (production: Redis cache + Stripe, testing: in-memory + fake)
- Decorator pattern applied transparently at the binding level
- Test doubles replace driven adapters — no mocking frameworks needed for port-level testing
- Each bounded context gets its own infrastructure provider

---

### Pattern 376.8: Clean Architecture Testing Strategy

**Category**: Testing
**Description**: Testing strategy aligned with clean architecture layers — each layer has its own test type and isolation level.

```php
<?php
// LAYER 1: Domain Unit Tests — no framework, no mocks, pure logic
declare(strict_types=1);

namespace Tests\Unit\Domain\Order;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Entities\OrderItem;
use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\Exceptions\InvalidOrderStateException;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\ValueObjects\OrderId;
use PHPUnit\Framework\TestCase;

final class OrderTest extends TestCase
{
    public function test_create_order_calculates_total(): void
    {
        $order = Order::create(
            id: new OrderId('order-1'),
            userId: 'user-1',
            items: [
                new OrderItem('prod-1', 2, new Money(1000, 'USD')),
                new OrderItem('prod-2', 1, new Money(500, 'USD')),
            ],
            shippingAddress: '123 Main St',
        );

        $this->assertTrue($order->total()->equals(new Money(2500, 'USD')));
        $this->assertSame(OrderStatus::Pending, $order->status());
    }

    public function test_cancel_pending_order_succeeds(): void
    {
        $order = $this->createPendingOrder();

        $order->cancel('Customer requested');

        $this->assertSame(OrderStatus::Cancelled, $order->status());
    }

    public function test_cancel_shipped_order_throws(): void
    {
        $order = $this->createShippedOrder();

        $this->expectException(InvalidOrderStateException::class);
        $order->cancel('Too late');
    }

    private function createPendingOrder(): Order
    {
        return Order::create(
            id: new OrderId('order-1'),
            userId: 'user-1',
            items: [new OrderItem('prod-1', 1, new Money(1000, 'USD'))],
            shippingAddress: '123 Main St',
        );
    }

    private function createShippedOrder(): Order
    {
        // Use reconstitute to set arbitrary state for testing
        return Order::reconstitute(
            id: new OrderId('order-1'),
            userId: 'user-1',
            items: [new OrderItem('prod-1', 1, new Money(1000, 'USD'))],
            shippingAddress: '123 Main St',
            status: OrderStatus::Shipped,
            total: new Money(1000, 'USD'),
            createdAt: new \DateTimeImmutable(),
        );
    }
}
```

```php
<?php
// LAYER 2: Application Tests — mocked ports, handler logic
declare(strict_types=1);

namespace Tests\Unit\Application\Order;

use App\Application\Order\Commands\CreateOrderCommand;
use App\Application\Order\Handlers\CreateOrderHandler;
use App\Domain\Inventory\Ports\StockCheckerInterface;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\OrderId;
use PHPUnit\Framework\TestCase;

final class CreateOrderHandlerTest extends TestCase
{
    public function test_creates_order_when_stock_available(): void
    {
        $repo = $this->createMock(OrderRepositoryInterface::class);
        $repo->method('nextIdentity')->willReturn(new OrderId('order-1'));
        $repo->expects($this->once())->method('save');

        $stockChecker = $this->createMock(StockCheckerInterface::class);
        $stockChecker->method('isAvailable')->willReturn(true);

        $handler = new CreateOrderHandler($repo, $stockChecker);

        $dto = $handler->handle(new CreateOrderCommand(
            userId: 'user-1',
            items: [['product_id' => 'prod-1', 'quantity' => 1, 'price' => 1000]],
            shippingAddress: '123 Main St',
            paymentMethodId: 'pm-1',
        ));

        $this->assertSame('order-1', $dto->id);
    }
}
```

```php
<?php
// LAYER 3: Infrastructure Integration Tests — real DB, real adapters
declare(strict_types=1);

namespace Tests\Integration\Infrastructure;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Entities\OrderItem;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\ValueObjects\OrderId;
use App\Infrastructure\Persistence\Eloquent\Repositories\EloquentOrderRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class EloquentOrderRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_save_and_find_by_id(): void
    {
        $repo = $this->app->make(EloquentOrderRepository::class);

        $order = Order::create(
            id: new OrderId('order-uuid'),
            userId: 'user-1',
            items: [new OrderItem('prod-1', 2, new Money(1000, 'USD'))],
            shippingAddress: '123 Main St',
        );

        $repo->save($order);

        $found = $repo->findById(new OrderId('order-uuid'));

        $this->assertNotNull($found);
        $this->assertTrue($found->id()->equals($order->id()));
        $this->assertTrue($found->total()->equals($order->total()));
    }
}
```

```php
<?php
// LAYER 4: Feature Tests — full HTTP round-trip
declare(strict_types=1);

namespace Tests\Feature\Presentation;

use App\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OrderEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_order_returns_201(): void
    {
        $user = UserModel::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'items' => [
                ['product_id' => 'prod-1', 'quantity' => 2, 'price' => 1000],
            ],
            'shipping_address' => '123 Main St',
            'payment_method_id' => 'pm-test',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'status', 'total']]);
    }
}
```

**Key Points**:
- **Domain tests**: PHPUnit only, no `Tests\TestCase`, no framework — fastest tests
- **Application tests**: Mock ports, test handler orchestration logic
- **Infrastructure tests**: `RefreshDatabase`, test real DB operations via repositories
- **Feature tests**: Full HTTP stack, `actingAs()`, assert status codes and JSON
- Test pyramid: many domain > some application > fewer infrastructure > few feature
- Domain tests should run in < 1ms each — they are pure logic

---

## Best Practices

- **Domain purity above all** — zero `use Illuminate\*` in `app/Domain/` is non-negotiable
- **Separate create from reconstitute** — `create()` enforces invariants; `reconstitute()` bypasses for hydration from DB
- **Ports return Domain types** — repository interfaces use Value Objects and Entities, never Eloquent models or arrays
- **One use case, one handler** — handlers are single-purpose; avoid "OrderService" with 20 methods
- **DTOs cross boundaries** — never pass Domain entities to Presentation; always use DTOs
- **Mappers are explicit** — no magic auto-mapping; write explicit `toDomain()` and `toPersistence()` methods
- **Test at the right layer** — domain logic in domain tests, wiring in integration tests
- **Composition root in providers** — service providers are the ONLY place that knows all concrete classes

---

## Abnormal Case Patterns

1. **Domain entity extends Eloquent Model** — most common violation. Fix: separate into Domain entity + Infrastructure model + Mapper.

2. **Handler directly queries DB** — handler uses `DB::table()` or query builder. Fix: define repository port in Domain, implement in Infrastructure.

3. **Port returns Eloquent Collection** — port interface has `\Illuminate\Support\Collection` in signature. Fix: use `array` or domain-specific collection type.

4. **DTO with business logic** — DTO validates or transforms data. Fix: DTOs are data holders only; validation belongs in Domain entities or Application validators.

5. **Missing reconstitute method** — entity only has `create()`, no way to hydrate from DB. Fix: add `reconstitute()` static method that bypasses business rules.

6. **Controller calls Domain directly** — controller imports Domain entity and calls methods. Fix: controller must go through Application handler; Domain is never accessed from Presentation.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (376.1–376.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Clean Architecture Specialist — Architecture | EPS v3.2*
