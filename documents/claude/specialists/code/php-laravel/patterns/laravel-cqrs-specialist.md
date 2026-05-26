# Laravel CQRS Specialist — Patterns
# Laravel CQRSスペシャリスト — パターン
# Chuyen Gia CQRS Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x CQRS
**Aspect**: Command Query Responsibility Segregation
**Category**: patterns
**Purpose**: Knowledge provider for CQRS implementation in Laravel — command bus, query bus, handlers, separation discipline, and testing strategies

---

## Metadata

```json
{
  "id": "laravel-cqrs-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "CQRS",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: CQRS — segregated read/write models for scalability and clarity",
    "E2: Laravel Bus — Illuminate\\Bus as lightweight command bus",
    "E3: PHP 8.3 readonly classes — immutable command/query DTOs"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 342.1–342.6 |
| **Directory Pattern** | `app/Commands/`, `app/Queries/` |
| **Naming Convention** | `{Action}{Entity}Command.php`, `{Action}{Entity}Query.php`, `{Name}Handler.php` |
| **Imports From** | Domain (entities, value objects), Infrastructure (repositories) |
| **Imported By** | Presentation (controllers dispatch commands/queries) |
| **Cannot Import** | Presentation (HTTP layer) |
| **Dependencies** | `illuminate/bus`, `illuminate/support` |
| **When To Use** | Complex domains where read and write models diverge |
| **Source Skeleton** | `app/Commands/{Action}{Entity}Command.php` |
| **Specialist Type** | code |
| **Purpose** | CQRS for Laravel — command/query separation, bus dispatching, handlers, testing |
| **Activation Trigger** | files: `app/Commands/*.php`, `app/Queries/*.php`; keywords: CQRS, command bus, query bus, handler |

---

## Role

You are a **Laravel CQRS Specialist**. Your responsibility is to provide best practices for implementing CQRS in Laravel 11+ — designing immutable commands and queries, implementing handlers, wiring bus dispatching, maintaining strict read/write separation, and testing command/query flows.

**Used by**: Any code agent working with CQRS architecture in Laravel
**Not used by**: Simple CRUD apps, projects without domain complexity

---

## Patterns

### Pattern 342.1: Command Bus

**Category**: Write Path
**Description**: Command bus implementation using Laravel's built-in Bus dispatcher for write operations.

```php
<?php

declare(strict_types=1);

namespace App\Commands;

final readonly class CreateOrderCommand
{
    /**
     * @param array<int, array{product_id: int, quantity: int}> $items
     */
    public function __construct(
        public int $userId,
        public array $items,
        public string $shippingAddress,
        public ?string $couponCode = null,
    ) {}
}
```

```php
<?php

declare(strict_types=1);

namespace App\Commands\Handlers;

use App\Commands\CreateOrderCommand;
use App\Contracts\Repositories\OrderRepositoryInterface;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

final class CreateOrderHandler
{
    public function __construct(
        private readonly OrderRepositoryInterface $orders,
    ) {}

    public function handle(CreateOrderCommand $command): Order
    {
        return DB::transaction(function () use ($command): Order {
            $order = $this->orders->create([
                'user_id' => $command->userId,
                'shipping_address' => $command->shippingAddress,
                'status' => 'pending',
            ]);

            foreach ($command->items as $item) {
                $order->items()->create($item);
            }

            return $order;
        });
    }
}
```

```php
// Controller dispatching
use App\Commands\CreateOrderCommand;
use App\Commands\Handlers\CreateOrderHandler;

final class OrderController extends Controller
{
    public function store(
        CreateOrderRequest $request,
        CreateOrderHandler $handler,
    ): JsonResponse {
        $order = $handler->handle(new CreateOrderCommand(
            userId: $request->user()->id,
            items: $request->validated('items'),
            shippingAddress: $request->validated('shipping_address'),
            couponCode: $request->validated('coupon_code'),
        ));

        return response()->json(new OrderResource($order), 201);
    }
}
```

**Key Points**:
- Commands are `readonly` DTOs — immutable after construction
- One handler per command — single responsibility
- Handler contains business logic and transaction management
- Controller only maps HTTP input to command and dispatches

---

### Pattern 342.2: Query Bus

**Category**: Read Path
**Description**: Query bus for read-optimized data retrieval, separated from write path.

```php
<?php

declare(strict_types=1);

namespace App\Queries;

final readonly class GetOrdersByUserQuery
{
    public function __construct(
        public int $userId,
        public ?string $status = null,
        public int $perPage = 15,
    ) {}
}
```

```php
<?php

declare(strict_types=1);

namespace App\Queries\Handlers;

use App\Queries\GetOrdersByUserQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class GetOrdersByUserHandler
{
    public function handle(GetOrdersByUserQuery $query): LengthAwarePaginator
    {
        $builder = DB::table('orders')
            ->select([
                'orders.id',
                'orders.status',
                'orders.created_at',
                DB::raw('SUM(order_items.quantity * order_items.price) as total'),
            ])
            ->join('order_items', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.user_id', $query->userId)
            ->groupBy('orders.id', 'orders.status', 'orders.created_at');

        if ($query->status !== null) {
            $builder->where('orders.status', $query->status);
        }

        return $builder->paginate(perPage: $query->perPage);
    }
}
```

**Key Points**:
- Queries can bypass Eloquent — use Query Builder or raw SQL for read performance
- Query handlers return read-optimized structures (DTOs, paginated results)
- No side effects in query handlers — pure data retrieval
- Read models can join across tables without domain constraints

---

### Pattern 342.3: Command Handler with Events

**Category**: Write Path
**Description**: Command handlers that emit domain events after successful write operations.

```php
<?php

declare(strict_types=1);

namespace App\Commands\Handlers;

use App\Commands\CancelOrderCommand;
use App\Contracts\Repositories\OrderRepositoryInterface;
use App\Events\OrderCancelled;
use App\Exceptions\OrderCannotBeCancelledException;
use App\Models\Order;

final class CancelOrderHandler
{
    public function __construct(
        private readonly OrderRepositoryInterface $orders,
    ) {}

    public function handle(CancelOrderCommand $command): Order
    {
        $order = $this->orders->findById($command->orderId);

        if ($order === null) {
            throw new \DomainException("Order {$command->orderId} not found");
        }

        if (!in_array($order->status, ['pending', 'confirmed'], true)) {
            throw new OrderCannotBeCancelledException(
                "Order {$order->id} cannot be cancelled — status: {$order->status}",
            );
        }

        $updated = $this->orders->update($order, [
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $command->reason,
        ]);

        event(new OrderCancelled(
            orderId: $updated->id,
            userId: $updated->user_id,
            reason: $command->reason,
        ));

        return $updated;
    }
}
```

**Key Points**:
- Validate business rules before mutation — fail fast with domain exceptions
- Emit events after successful state change — not before
- Events decouple side effects (notifications, inventory) from command handler
- Handler is the transaction boundary — wrap in `DB::transaction()` when needed

---

### Pattern 342.4: Query Handler with Caching

**Category**: Read Path
**Description**: Query handler with built-in caching for frequently accessed read data.

```php
<?php

declare(strict_types=1);

namespace App\Queries\Handlers;

use App\Queries\GetProductCatalogQuery;
use Illuminate\Cache\CacheManager;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class GetProductCatalogHandler
{
    private const CACHE_TTL = 1800; // 30 minutes

    public function __construct(
        private readonly CacheManager $cache,
    ) {}

    /**
     * @return Collection<int, object>
     */
    public function handle(GetProductCatalogQuery $query): Collection
    {
        $cacheKey = sprintf(
            'catalog:category:%d:sort:%s:page:%d',
            $query->categoryId,
            $query->sortBy,
            $query->page,
        );

        return $this->cache->remember(
            key: $cacheKey,
            ttl: self::CACHE_TTL,
            callback: fn () => DB::table('products')
                ->where('category_id', $query->categoryId)
                ->where('is_active', true)
                ->orderBy($query->sortBy)
                ->forPage(page: $query->page, perPage: $query->perPage)
                ->get(),
        );
    }
}
```

**Key Points**:
- Cache key derived from query parameters — deterministic and unique
- Read path caching does not affect write path — cache invalidation handled separately
- Use Query Builder for read-optimized queries — lighter than Eloquent
- TTL should match data freshness requirements

---

### Pattern 342.5: Command/Query Separation Discipline

**Category**: Architecture
**Description**: Enforcing strict separation between commands (write) and queries (read).

```php
// CORRECT: Command returns minimal acknowledgement
final class ArchiveUserHandler
{
    public function handle(ArchiveUserCommand $command): void
    {
        $user = User::findOrFail($command->userId);
        $user->update(['archived_at' => now()]);
        event(new UserArchived(userId: $user->id));
    }
}

// CORRECT: Query returns data, no side effects
final class GetUserProfileHandler
{
    /**
     * @return array<string, mixed>
     */
    public function handle(GetUserProfileQuery $query): array
    {
        return DB::table('users')
            ->select(['id', 'name', 'email', 'created_at'])
            ->where('id', $query->userId)
            ->first() ?? throw new ModelNotFoundException();
    }
}

// WRONG: Mixing command and query — writes data AND returns complex result
// final class CreateAndReturnDashboardHandler { ... }
```

```php
// Service provider wiring
final class CqrsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Explicit handler bindings — no magic, full IDE support
        $this->app->bind(CreateOrderHandler::class);
        $this->app->bind(CancelOrderHandler::class);
        $this->app->bind(GetOrdersByUserHandler::class);
        $this->app->bind(GetProductCatalogHandler::class);
    }
}
```

**Key Points**:
- Commands may return the created/updated entity ID — minimal acknowledgement is acceptable
- Commands must never return complex read models or aggregated data
- Queries must never modify state — no writes, no event dispatching
- Keep handlers in separate directories: `app/Commands/Handlers/`, `app/Queries/Handlers/`

---

### Pattern 342.6: CQRS Testing

**Category**: Testing
**Description**: Testing command and query handlers in isolation and integration.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Commands;

use App\Commands\CreateOrderCommand;
use App\Commands\Handlers\CreateOrderHandler;
use App\Contracts\Repositories\OrderRepositoryInterface;
use App\Models\Order;
use Mockery;
use Tests\TestCase;

final class CreateOrderHandlerTest extends TestCase
{
    public function test_creates_order_with_items(): void
    {
        $mockRepo = Mockery::mock(OrderRepositoryInterface::class);
        $order = new Order(['id' => 1, 'user_id' => 10, 'status' => 'pending']);
        $order->setRelation('items', collect());

        $mockRepo->shouldReceive('create')
            ->once()
            ->andReturn($order);

        $handler = new CreateOrderHandler($mockRepo);
        $command = new CreateOrderCommand(
            userId: 10,
            items: [['product_id' => 1, 'quantity' => 2]],
            shippingAddress: '123 Main St',
        );

        $result = $handler->handle($command);

        $this->assertEquals(10, $result->user_id);
    }
}
```

```php
// Integration test for query handler
final class GetOrdersByUserHandlerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_paginated_orders_for_user(): void
    {
        $user = User::factory()->create();
        Order::factory()->count(5)->for($user)->create();
        Order::factory()->count(3)->create(); // Other users

        $handler = new GetOrdersByUserHandler();
        $result = $handler->handle(new GetOrdersByUserQuery(
            userId: $user->id,
            perPage: 10,
        ));

        $this->assertCount(5, $result->items());
    }

    public function test_filters_by_status(): void
    {
        $user = User::factory()->create();
        Order::factory()->count(3)->for($user)->create(['status' => 'completed']);
        Order::factory()->count(2)->for($user)->create(['status' => 'pending']);

        $handler = new GetOrdersByUserHandler();
        $result = $handler->handle(new GetOrdersByUserQuery(
            userId: $user->id,
            status: 'completed',
        ));

        $this->assertCount(3, $result->items());
    }
}
```

**Key Points**:
- Unit test command handlers with mocked repositories — verify behavior, not DB
- Integration test query handlers with `RefreshDatabase` — verify actual SQL
- Test command validation (domain exceptions) as separate test cases
- Verify events are dispatched after commands using `Event::fake()`

---

## Best Practices

- **Immutable commands/queries** — use PHP 8.3 `readonly` classes for all DTOs
- **One handler per command/query** — no multi-purpose handlers
- **No cross-handler calls** — handlers do not invoke other handlers directly
- **Commands in transactions** — wrap multi-step writes in `DB::transaction()`
- **Queries bypass Eloquent** — use Query Builder for read-optimized paths
- **Explicit handler binding** — register in service provider, no auto-discovery magic
- **Event-driven side effects** — command handlers dispatch events, listeners handle consequences
- **Name commands as imperative verbs** — `CreateOrder`, `CancelSubscription`, `ArchiveUser`

---

## Abnormal Case Patterns

1. **Command returning read model** — command handler returns complex aggregated data. Fix: return entity or void; use a separate query for read data.

2. **Query with side effects** — query handler logs analytics or updates "last viewed". Fix: use an event listener or middleware for tracking, not the query handler.

3. **Handler calling handler** — `CreateOrderHandler` calls `SendNotificationHandler` directly. Fix: emit `OrderCreated` event; notification listener handles the rest.

4. **Missing transaction boundary** — multi-step command without `DB::transaction()`. Fix: wrap all state changes in a single transaction.

5. **Over-engineering simple CRUD** — CQRS for a basic blog with 3 models. Fix: use CQRS only when read/write models genuinely diverge.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (342.1–342.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel CQRS Specialist — Patterns | EPS v3.2*
