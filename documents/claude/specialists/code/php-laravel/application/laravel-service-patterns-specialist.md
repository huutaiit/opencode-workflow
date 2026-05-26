# Laravel Service Patterns Specialist — Application
# Laravelサービスパターンスペシャリスト — アプリケーション
# Chuyen Gia Service Pattern Laravel — Ung Dung

**Version**: 1.0.0
**Technology**: Laravel 11+ Application Services
**Aspect**: Application Service Patterns
**Category**: application
**Purpose**: Knowledge provider for Laravel 11+ application service architecture — service class design, domain vs application service separation, transaction management, service composition, error handling strategies, testing with mocks, lifecycle scoping, and repository port integration

---

## Metadata

```json
{
  "id": "laravel-service-patterns-specialist",
  "technology": "Laravel 11+ Application Services",
  "aspect": "Application Service Patterns",
  "category": "application",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 service class conventions — constructor injection, readonly properties, final classes",
    "E2: Domain vs Application service boundary — orchestration vs business rules separation",
    "E3: Laravel DB::transaction() with deadlock retry and savepoints",
    "E4: Service composition patterns — delegation chains, event dispatching after commit"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 313.1–313.8 |
| **Directory Pattern** | `app/Services/` or `app/Application/Services/` |
| **Naming Convention** | `{Entity}Service.php` |
| **Imports From** | Domain (models, value objects, interfaces), Infrastructure (repositories) |
| **Imported By** | Presentation (controllers, commands), other Application services |
| **Cannot Import** | Presentation (controllers, requests, resources) |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Any use case requiring orchestration of domain logic, persistence, and side effects |
| **Source Skeleton** | `app/Services/{Entity}Service.php` |
| **Specialist Type** | code |
| **Purpose** | Application service design — orchestration, transaction boundaries, composition, testing |
| **Activation Trigger** | files: `app/Services/*.php`, `app/Application/Services/*.php`; keywords: Service, orchestrate, transaction, use case |

---

## Role

You are a **Laravel Service Patterns Specialist**. Your responsibility is to provide best practices for Laravel 11+ application service design — how services orchestrate use cases, manage transaction boundaries, compose with other services, handle errors, integrate with repository ports, and how to test services effectively using mocks and fakes.

**Used by**: Any code agent implementing business use cases in Laravel applications
**Not used by**: Non-Laravel stacks, projects using only controller-based logic without service layer

---

## Patterns

### Pattern 313.1: Application Service Basics

**Category**: Service Fundamentals
**Description**: Standard application service class with constructor injection, readonly dependencies, and single-responsibility use case methods.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Contracts\OrderRepositoryInterface;
use App\DTOs\CreateOrderData;
use App\Events\OrderCreated;
use Illuminate\Support\Facades\DB;

final class OrderService
{
    public function __construct(
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly InventoryService $inventoryService,
        private readonly PaymentService $paymentService,
    ) {}

    public function create(User $user, CreateOrderData $data): Order
    {
        return DB::transaction(function () use ($user, $data): Order {
            $order = $this->orderRepository->create(
                userId: $user->id,
                items: $data->items,
                shippingAddress: $data->shippingAddress,
            );

            $this->inventoryService->reserve(
                items: $data->items,
                orderId: $order->id,
            );

            $this->paymentService->authorize(
                userId: $user->id,
                amount: $order->total_amount,
                orderId: $order->id,
            );

            event(new OrderCreated(order: $order));

            return $order;
        });
    }

    public function cancel(Order $order): void
    {
        if (!$order->isCancellable()) {
            throw new \DomainException(
                message: "Order {$order->id} cannot be cancelled in status {$order->status->value}",
            );
        }

        DB::transaction(function () use ($order): void {
            $this->inventoryService->release(orderId: $order->id);
            $this->paymentService->void(orderId: $order->id);
            $this->orderRepository->updateStatus(
                order: $order,
                status: OrderStatus::Cancelled,
            );
        });
    }
}
```

**Key Points**:
- Mark services `final` — extension should be via composition, not inheritance
- Use constructor promotion with `readonly` for immutable dependencies
- Each public method represents one use case (create, cancel, fulfill)
- Services orchestrate — they call domain models, repositories, and other services
- Never inject `Request` or `Controller` — services are framework-agnostic at the boundary

---

### Pattern 313.2: Domain vs Application Service

**Category**: Service Boundaries
**Description**: Clear separation between application services (orchestration, infrastructure coordination) and domain services (pure business logic with no framework dependencies).

```php
<?php

declare(strict_types=1);

// DOMAIN SERVICE — pure business logic, no Laravel dependencies
namespace App\Domain\Pricing;

use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Pricing\ValueObjects\DiscountResult;

final class PricingCalculator
{
    /**
     * @param array<int, array{price: int, quantity: int}> $lineItems
     */
    public function calculateTotal(
        array $lineItems,
        ?string $couponCode = null,
        string $taxRegion = 'US',
    ): DiscountResult {
        $subtotal = array_reduce(
            array: $lineItems,
            callback: fn (int $carry, array $item): int => $carry + ($item['price'] * $item['quantity']),
            initial: 0,
        );

        $discount = $this->resolveDiscount(
            subtotal: $subtotal,
            couponCode: $couponCode,
        );

        $taxableAmount = $subtotal - $discount;
        $tax = $this->calculateTax(
            amount: $taxableAmount,
            region: $taxRegion,
        );

        return new DiscountResult(
            subtotal: Money::fromCents($subtotal),
            discount: Money::fromCents($discount),
            tax: Money::fromCents($tax),
            total: Money::fromCents($taxableAmount + $tax),
        );
    }

    private function resolveDiscount(int $subtotal, ?string $couponCode): int
    {
        if ($couponCode === null) {
            return 0;
        }

        return match (true) {
            str_starts_with($couponCode, 'FLAT_') => (int) substr($couponCode, 5),
            str_starts_with($couponCode, 'PCT_') => (int) ($subtotal * ((int) substr($couponCode, 4)) / 100),
            default => 0,
        };
    }

    private function calculateTax(int $amount, string $region): int
    {
        $rate = match ($region) {
            'US' => 0.08,
            'EU' => 0.21,
            'JP' => 0.10,
            default => 0.0,
        };

        return (int) round($amount * $rate);
    }
}
```

```php
<?php

declare(strict_types=1);

// APPLICATION SERVICE — orchestration with framework dependencies
namespace App\Services;

use App\Domain\Pricing\PricingCalculator;
use App\Contracts\OrderRepositoryInterface;
use App\Contracts\CouponRepositoryInterface;
use App\DTOs\CreateOrderData;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

final class CheckoutService
{
    public function __construct(
        private readonly PricingCalculator $calculator,
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly CouponRepositoryInterface $couponRepository,
        private readonly PaymentService $paymentService,
    ) {}

    public function checkout(int $userId, CreateOrderData $data): Order
    {
        $pricing = $this->calculator->calculateTotal(
            lineItems: $data->lineItems,
            couponCode: $data->couponCode,
            taxRegion: $data->taxRegion,
        );

        return DB::transaction(function () use ($userId, $data, $pricing): Order {
            if ($data->couponCode !== null) {
                $this->couponRepository->markUsed(
                    code: $data->couponCode,
                    userId: $userId,
                );
            }

            $order = $this->orderRepository->create(
                userId: $userId,
                items: $data->lineItems,
                totalAmount: $pricing->total->toCents(),
                discountAmount: $pricing->discount->toCents(),
                taxAmount: $pricing->tax->toCents(),
            );

            $this->paymentService->charge(
                userId: $userId,
                amount: $pricing->total->toCents(),
                orderId: $order->id,
            );

            return $order;
        });
    }
}
```

**Key Points**:
- **Domain service**: no `use Illuminate\*`, no DB facade, no events — pure PHP 8.3
- **Application service**: coordinates domain services with infrastructure (DB, events, repositories)
- Domain services are easily unit-testable — no mocks needed
- Application services require integration tests with mocked infrastructure
- Domain services live in `app/Domain/`, application services in `app/Services/`

---

### Pattern 313.3: Transaction Boundaries in Service

**Category**: Data Integrity
**Description**: Managing database transactions within services — nested transactions, savepoints, deadlock retry, and after-commit callbacks.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\OrderRepositoryInterface;
use App\Contracts\InventoryRepositoryInterface;
use App\Events\OrderFulfilled;
use App\Models\Order;
use App\Enums\OrderStatus;
use Illuminate\Support\Facades\DB;

final class FulfillmentService
{
    public function __construct(
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly InventoryRepositoryInterface $inventoryRepository,
        private readonly ShippingService $shippingService,
    ) {}

    /**
     * Fulfill an order — deduct inventory, create shipment, update status.
     * Uses savepoints so partial operations can roll back independently.
     */
    public function fulfill(Order $order): void
    {
        DB::transaction(function () use ($order): void {
            // Savepoint 1: Inventory deduction
            $this->inventoryRepository->deduct(
                items: $order->items,
                reason: "Order #{$order->id} fulfillment",
            );

            // Savepoint 2: Shipment creation (may call external API)
            try {
                DB::transaction(function () use ($order): void {
                    $tracking = $this->shippingService->createShipment(
                        order: $order,
                    );

                    $this->orderRepository->updateTracking(
                        order: $order,
                        trackingNumber: $tracking->number,
                        carrier: $tracking->carrier,
                    );
                });
            } catch (\App\Exceptions\ShippingApiException $e) {
                // Savepoint rolls back shipment DB records
                // but inventory deduction remains committed
                report($e);

                $this->orderRepository->updateStatus(
                    order: $order,
                    status: OrderStatus::PendingShipment,
                );

                return;
            }

            $this->orderRepository->updateStatus(
                order: $order,
                status: OrderStatus::Shipped,
            );
        }, attempts: 3); // Retry up to 3 times on deadlock

        // After-commit: dispatch events ONLY after transaction commits
        DB::afterCommit(function () use ($order): void {
            event(new OrderFulfilled(order: $order));
        });
    }

    /**
     * Bulk fulfillment with per-order isolation.
     * One order failure doesn't affect others.
     */
    public function fulfillBatch(array $orderIds): array
    {
        $results = ['fulfilled' => [], 'failed' => []];

        foreach ($orderIds as $orderId) {
            try {
                $order = $this->orderRepository->findOrFail($orderId);
                $this->fulfill($order);
                $results['fulfilled'][] = $orderId;
            } catch (\Throwable $e) {
                report($e);
                $results['failed'][] = [
                    'order_id' => $orderId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }
}
```

**Key Points**:
- Pass `attempts` parameter to `DB::transaction()` for deadlock retry (default 1)
- Nested `DB::transaction()` creates savepoints — inner rollback doesn't affect outer
- Use `DB::afterCommit()` for events/notifications — prevents dispatching on rollback
- Batch operations should isolate each item in its own try/catch
- Never dispatch jobs or events inside a transaction — use `afterCommit` or `ShouldDispatchAfterCommit`

---

### Pattern 313.4: Service Composition

**Category**: Service Orchestration
**Description**: Composing multiple services to handle complex use cases — delegation chains, saga-like coordination, and event-driven decoupling.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\OrderRepositoryInterface;
use App\DTOs\CreateSubscriptionData;
use App\Models\Subscription;
use App\Models\User;
use App\Enums\SubscriptionPlan;
use Illuminate\Support\Facades\DB;

final class SubscriptionService
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly BillingService $billingService,
        private readonly NotificationService $notificationService,
        private readonly FeatureToggleService $featureToggleService,
    ) {}

    public function subscribe(
        User $user,
        CreateSubscriptionData $data,
    ): Subscription {
        // Step 1: Validate business rules (no DB, no side effects)
        $this->validateEligibility(user: $user, plan: $data->plan);

        // Step 2: Transactional core operations
        $subscription = DB::transaction(function () use ($user, $data): Subscription {
            $paymentMethod = $this->paymentService->validatePaymentMethod(
                userId: $user->id,
                paymentMethodId: $data->paymentMethodId,
            );

            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan' => $data->plan,
                'payment_method_id' => $paymentMethod->id,
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
                'auto_renew' => $data->autoRenew,
            ]);

            $this->billingService->createInitialInvoice(
                subscription: $subscription,
                amount: $data->plan->price(),
            );

            $this->featureToggleService->activatePlanFeatures(
                userId: $user->id,
                plan: $data->plan,
            );

            return $subscription;
        });

        // Step 3: Side effects after commit (fire-and-forget)
        $this->notificationService->sendSubscriptionConfirmation(
            user: $user,
            subscription: $subscription,
        );

        return $subscription;
    }

    public function upgrade(
        User $user,
        SubscriptionPlan $newPlan,
    ): Subscription {
        $current = $user->activeSubscription()
            ?? throw new \DomainException('No active subscription to upgrade');

        if ($newPlan->tier() <= $current->plan->tier()) {
            throw new \DomainException(
                "Cannot upgrade from {$current->plan->value} to {$newPlan->value}",
            );
        }

        return DB::transaction(function () use ($user, $current, $newPlan): Subscription {
            $proratedAmount = $this->billingService->calculateProration(
                current: $current,
                newPlan: $newPlan,
            );

            $this->paymentService->charge(
                userId: $user->id,
                amount: $proratedAmount,
                description: "Upgrade to {$newPlan->value}",
            );

            $current->update([
                'plan' => $newPlan,
                'upgraded_at' => now(),
            ]);

            $this->featureToggleService->activatePlanFeatures(
                userId: $user->id,
                plan: $newPlan,
            );

            return $current->refresh();
        });
    }

    private function validateEligibility(User $user, SubscriptionPlan $plan): void
    {
        if ($user->hasActiveSubscription() && $user->activeSubscription()->plan === $plan) {
            throw new \DomainException('Already subscribed to this plan');
        }

        if ($user->isBanned()) {
            throw new \DomainException('Banned users cannot subscribe');
        }
    }
}
```

**Key Points**:
- Structure service methods as: validate → transactional core → side effects
- Side effects (notifications, analytics) execute AFTER the transaction succeeds
- Each composed service handles its own concern — the orchestrator coordinates
- Throw domain exceptions for business rule violations, let the controller handle HTTP mapping
- Avoid circular service dependencies — use events for cross-domain communication

---

### Pattern 313.5: Error Handling in Services

**Category**: Resilience
**Description**: Structured error handling within services — custom exceptions, error context, retry strategies, and graceful degradation.

```php
<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class PaymentProcessingException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $orderId,
        public readonly string $gatewayErrorCode,
        public readonly array $context = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct(message: $message, previous: $previous);
    }

    public static function declined(string $orderId, string $reason): self
    {
        return new self(
            message: "Payment declined for order {$orderId}: {$reason}",
            orderId: $orderId,
            gatewayErrorCode: 'CARD_DECLINED',
            context: ['reason' => $reason],
        );
    }

    public static function gatewayTimeout(string $orderId): self
    {
        return new self(
            message: "Payment gateway timeout for order {$orderId}",
            orderId: $orderId,
            gatewayErrorCode: 'GATEWAY_TIMEOUT',
            context: ['retryable' => true],
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\PaymentGatewayInterface;
use App\Exceptions\PaymentProcessingException;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;

final class PaymentService
{
    private const int MAX_RETRIES = 3;
    private const int RETRY_DELAY_MS = 500;

    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
    ) {}

    public function charge(int $userId, int $amount, string $orderId): Payment
    {
        $attempt = 0;

        while (true) {
            try {
                $attempt++;

                $result = $this->gateway->charge(
                    userId: $userId,
                    amountCents: $amount,
                    idempotencyKey: "order-{$orderId}-attempt-{$attempt}",
                );

                return Payment::create([
                    'user_id' => $userId,
                    'order_id' => $orderId,
                    'amount' => $amount,
                    'gateway_transaction_id' => $result->transactionId,
                    'status' => 'completed',
                ]);
            } catch (PaymentProcessingException $e) {
                if ($e->gatewayErrorCode === 'CARD_DECLINED') {
                    // Non-retryable — propagate immediately
                    throw $e;
                }

                if ($attempt >= self::MAX_RETRIES) {
                    Log::error('Payment failed after max retries', [
                        'order_id' => $orderId,
                        'user_id' => $userId,
                        'attempts' => $attempt,
                        'last_error' => $e->getMessage(),
                    ]);
                    throw $e;
                }

                Log::warning('Payment attempt failed, retrying', [
                    'order_id' => $orderId,
                    'attempt' => $attempt,
                    'error_code' => $e->gatewayErrorCode,
                ]);

                usleep(self::RETRY_DELAY_MS * 1000 * $attempt); // Exponential backoff
            }
        }
    }

    public function refund(string $orderId, ?int $amount = null): Payment
    {
        $originalPayment = Payment::query()
            ->where('order_id', $orderId)
            ->where('status', 'completed')
            ->firstOrFail();

        $refundAmount = $amount ?? $originalPayment->amount;

        if ($refundAmount > $originalPayment->amount) {
            throw new \DomainException(
                message: "Refund amount ({$refundAmount}) exceeds original payment ({$originalPayment->amount})",
            );
        }

        try {
            $result = $this->gateway->refund(
                transactionId: $originalPayment->gateway_transaction_id,
                amountCents: $refundAmount,
            );

            return Payment::create([
                'user_id' => $originalPayment->user_id,
                'order_id' => $orderId,
                'amount' => -$refundAmount,
                'gateway_transaction_id' => $result->transactionId,
                'status' => 'refunded',
                'parent_payment_id' => $originalPayment->id,
            ]);
        } catch (\Throwable $e) {
            Log::critical('Refund failed — requires manual intervention', [
                'order_id' => $orderId,
                'original_payment_id' => $originalPayment->id,
                'refund_amount' => $refundAmount,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
```

**Key Points**:
- Create domain-specific exception classes with rich context (order ID, error codes)
- Use static factory methods on exceptions for common failure scenarios
- Distinguish retryable vs non-retryable errors — only retry gateway timeouts, not card declines
- Use idempotency keys for safe retries with external APIs
- Log at appropriate levels: `warning` for retries, `error` for final failure, `critical` for manual intervention

---

### Pattern 313.6: Service Testing with Mocks

**Category**: Testing
**Description**: Unit and integration testing strategies for application services — mock dependencies, assert interactions, and verify side effects.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Contracts\OrderRepositoryInterface;
use App\DTOs\CreateOrderData;
use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\OrderService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class OrderServiceTest extends TestCase
{
    use RefreshDatabase;

    private OrderService $service;
    private MockInterface&OrderRepositoryInterface $orderRepository;
    private MockInterface&InventoryService $inventoryService;
    private MockInterface&PaymentService $paymentService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->orderRepository = Mockery::mock(OrderRepositoryInterface::class);
        $this->inventoryService = Mockery::mock(InventoryService::class);
        $this->paymentService = Mockery::mock(PaymentService::class);

        $this->service = new OrderService(
            orderRepository: $this->orderRepository,
            inventoryService: $this->inventoryService,
            paymentService: $this->paymentService,
        );
    }

    #[Test]
    public function create_order_orchestrates_all_steps(): void
    {
        $user = User::factory()->create();
        $data = new CreateOrderData(
            items: [['product_id' => 1, 'quantity' => 2, 'price' => 1000]],
            shippingAddress: '123 Main St',
        );

        $expectedOrder = Order::factory()->make(['id' => 99]);

        $this->orderRepository
            ->shouldReceive('create')
            ->once()
            ->with(
                userId: $user->id,
                items: $data->items,
                shippingAddress: $data->shippingAddress,
            )
            ->andReturn($expectedOrder);

        $this->inventoryService
            ->shouldReceive('reserve')
            ->once()
            ->with(items: $data->items, orderId: 99);

        $this->paymentService
            ->shouldReceive('authorize')
            ->once()
            ->with(
                userId: $user->id,
                amount: $expectedOrder->total_amount,
                orderId: 99,
            );

        $result = $this->service->create(user: $user, data: $data);

        $this->assertSame($expectedOrder, $result);
    }

    #[Test]
    public function cancel_throws_when_order_not_cancellable(): void
    {
        $order = Order::factory()->make([
            'status' => OrderStatus::Shipped,
        ]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('cannot be cancelled');

        $this->service->cancel(order: $order);
    }

    #[Test]
    public function create_rolls_back_on_payment_failure(): void
    {
        $user = User::factory()->create();
        $data = new CreateOrderData(
            items: [['product_id' => 1, 'quantity' => 1, 'price' => 500]],
            shippingAddress: '456 Oak Ave',
        );

        $expectedOrder = Order::factory()->make(['id' => 100]);

        $this->orderRepository
            ->shouldReceive('create')
            ->once()
            ->andReturn($expectedOrder);

        $this->inventoryService
            ->shouldReceive('reserve')
            ->once();

        $this->paymentService
            ->shouldReceive('authorize')
            ->once()
            ->andThrow(new \RuntimeException('Gateway unavailable'));

        $this->expectException(\RuntimeException::class);
        $this->service->create(user: $user, data: $data);

        // Transaction rolled back — verify no side effects persisted
    }
}
```

**Key Points**:
- Use Mockery intersection types (`MockInterface&ConcreteType`) for IDE support
- `shouldReceive()->once()` verifies the service calls dependencies in correct order
- Test the rollback scenario — ensure exceptions propagate and transactions revert
- Create the service manually with mocks, don't resolve from container in unit tests
- Use `RefreshDatabase` when tests interact with real DB (integration-level)

---

### Pattern 313.7: Service Scoping — Singleton vs Per-Request

**Category**: Lifecycle Management
**Description**: Binding services as singleton, scoped (per-request), or transient based on their statefulness and dependency requirements.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\CacheServiceInterface;
use App\Contracts\OrderRepositoryInterface;
use App\Repositories\EloquentOrderRepository;
use App\Services\AnalyticsService;
use App\Services\CartService;
use App\Services\OrderService;
use App\Services\RateLimiterService;
use Illuminate\Support\ServiceProvider;

final class ServiceBindingProvider extends ServiceProvider
{
    public function register(): void
    {
        // SINGLETON — stateless, thread-safe, expensive to create
        // Same instance for the entire application lifecycle
        $this->app->singleton(
            abstract: AnalyticsService::class,
            concrete: fn () => new AnalyticsService(
                apiKey: config('services.analytics.key'),
                endpoint: config('services.analytics.endpoint'),
            ),
        );

        // SCOPED — per-request lifecycle, reset between requests
        // Ideal for services that accumulate request-specific state
        $this->app->scoped(
            abstract: CartService::class,
            concrete: fn () => new CartService(
                sessionId: session()->getId(),
            ),
        );

        // TRANSIENT (bind) — new instance every resolution
        // For services with mutable state or unique per-consumer
        $this->app->bind(
            abstract: OrderService::class,
            concrete: fn ($app) => new OrderService(
                orderRepository: $app->make(OrderRepositoryInterface::class),
                inventoryService: $app->make(\App\Services\InventoryService::class),
                paymentService: $app->make(\App\Services\PaymentService::class),
            ),
        );

        // SINGLETON with reset for Octane compatibility
        $this->app->singleton(RateLimiterService::class);
    }

    public function boot(): void
    {
        // Reset singletons between Octane requests
        if (class_exists(\Laravel\Octane\Facades\Octane::class)) {
            $this->app->beforeResolving(RateLimiterService::class, function (): void {
                // Octane flushes scoped bindings automatically
                // Singletons persist — use scoped() or manual reset
            });
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Scoped service — accumulates state per request, auto-reset between requests.
 */
final class CartService
{
    /** @var array<int, array{product_id: int, quantity: int}> */
    private array $pendingItems = [];

    public function __construct(
        private readonly string $sessionId,
    ) {}

    public function addItem(int $productId, int $quantity): void
    {
        $this->pendingItems[] = [
            'product_id' => $productId,
            'quantity' => $quantity,
        ];
    }

    /**
     * @return array<int, array{product_id: int, quantity: int}>
     */
    public function getPendingItems(): array
    {
        return $this->pendingItems;
    }
}
```

**Key Points**:
- **Singleton**: stateless services, API clients, config-based services — persist across requests
- **Scoped**: request-specific state (cart, user context) — automatically reset between requests
- **Transient (bind)**: mutable services, services with per-consumer configuration
- Laravel Octane: use `scoped()` instead of `singleton()` for request-aware services
- Test scoping by resolving twice and asserting `assertSame` (singleton) or `assertNotSame` (transient)

---

### Pattern 313.8: Service with Repository Port

**Category**: Clean Architecture
**Description**: Service depending on a repository interface (port) — decoupling business logic from persistence implementation.

```php
<?php

declare(strict_types=1);

// PORT (interface) — lives in Domain or Contracts
namespace App\Contracts;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

interface ProductRepositoryInterface
{
    public function findById(int $id): ?Product;

    public function findBySlug(string $slug): ?Product;

    /**
     * @param array<string, mixed> $filters
     */
    public function search(array $filters, int $perPage = 15): \Illuminate\Contracts\Pagination\LengthAwarePaginator;

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Product;

    /**
     * @param array<string, mixed> $data
     */
    public function update(Product $product, array $data): Product;

    public function delete(Product $product): void;

    /**
     * @return Collection<int, Product>
     */
    public function findByCategoryId(int $categoryId): Collection;
}
```

```php
<?php

declare(strict_types=1);

// ADAPTER (implementation) — lives in Infrastructure/Repositories
namespace App\Repositories;

use App\Contracts\ProductRepositoryInterface;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

final class EloquentProductRepository implements ProductRepositoryInterface
{
    public function findById(int $id): ?Product
    {
        return Product::find($id);
    }

    public function findBySlug(string $slug): ?Product
    {
        return Product::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();
    }

    public function search(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        $query = Product::query()->with(['category', 'tags']);

        if (isset($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (isset($filters['min_price'])) {
            $query->where('price', '>=', $filters['min_price']);
        }

        if (isset($filters['max_price'])) {
            $query->where('price', '<=', $filters['max_price']);
        }

        if (isset($filters['search'])) {
            $query->where(function ($q) use ($filters): void {
                $q->where('name', 'LIKE', "%{$filters['search']}%")
                    ->orWhere('description', 'LIKE', "%{$filters['search']}%");
            });
        }

        return $query->latest()->paginate(perPage: $perPage);
    }

    public function create(array $data): Product
    {
        return Product::create($data);
    }

    public function update(Product $product, array $data): Product
    {
        $product->update($data);

        return $product->refresh();
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function findByCategoryId(int $categoryId): Collection
    {
        return Product::query()
            ->where('category_id', $categoryId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }
}
```

```php
<?php

declare(strict_types=1);

// SERVICE using the repository port
namespace App\Services;

use App\Contracts\ProductRepositoryInterface;
use App\DTOs\CreateProductData;
use App\DTOs\UpdateProductData;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

final class ProductService
{
    public function __construct(
        private readonly ProductRepositoryInterface $productRepository,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->productRepository->search(
            filters: $filters,
            perPage: $filters['per_page'] ?? 15,
        );
    }

    public function create(CreateProductData $data): Product
    {
        return $this->productRepository->create([
            'name' => $data->name,
            'slug' => Str::slug($data->name),
            'description' => $data->description,
            'price' => $data->price,
            'category_id' => $data->categoryId,
            'is_active' => true,
        ]);
    }

    public function update(Product $product, UpdateProductData $data): Product
    {
        $attributes = array_filter([
            'name' => $data->name,
            'slug' => $data->name ? Str::slug($data->name) : null,
            'description' => $data->description,
            'price' => $data->price,
            'category_id' => $data->categoryId,
        ], fn ($value) => $value !== null);

        return $this->productRepository->update(
            product: $product,
            data: $attributes,
        );
    }
}
```

**Key Points**:
- Interface (port) defines the contract — lives in `app/Contracts/` or `app/Domain/Ports/`
- Implementation (adapter) uses Eloquent — lives in `app/Repositories/` or `app/Infrastructure/Repositories/`
- Bind interface to concrete in a `ServiceProvider` — enables testing with in-memory fakes
- Service depends on the interface, never the concrete Eloquent repository
- Repository methods return domain models or collections — never query builders

---

## Best Practices

- **Single responsibility** — one service per aggregate root or bounded context, not "GodService"
- **Constructor injection only** — never use `app()->make()` inside methods; declare all dependencies upfront
- **Return values over void** — services should return created/updated entities for caller inspection
- **Throw domain exceptions** — `DomainException`, `InvalidArgumentException` for business rules; never throw HTTP exceptions from services
- **Keep services stateless** — avoid mutable properties; use method parameters for all inputs
- **Separate commands from queries** — write methods (create, update, delete) vs read methods (find, list, search) can be separate services
- **Wrap multi-step mutations in transactions** — every service method that writes to multiple tables needs `DB::transaction()`
- **Events after commit** — dispatch events via `DB::afterCommit()` or `ShouldDispatchAfterCommit` interface
- **Name methods as use cases** — `placeOrder()`, `cancelSubscription()`, not `processData()`, `handleAction()`
- **Max 5 dependencies** — more than 5 constructor params signals the service does too much; split it

---

## Abnormal Case Patterns

1. **God service with 20+ methods** — a single `OrderService` handling creation, payment, shipping, notifications, and reporting. Fix: split into `OrderService`, `PaymentService`, `ShippingService`, `OrderNotificationService`.

2. **Business logic in controllers** — price calculations, discount rules, and validation logic live in the controller. Fix: extract to domain service (pure logic) or application service (orchestration).

3. **Events inside transactions** — `event(new OrderCreated($order))` inside `DB::transaction()` — if the listener triggers a job, the job may process before the transaction commits. Fix: use `DB::afterCommit()`.

4. **Service resolving services via facade** — `app(PaymentService::class)` inside a service method instead of constructor injection. Fix: inject via constructor — enables testing and makes dependencies explicit.

5. **Missing transaction on multi-table writes** — `$order->save()` then `$payment->save()` without transaction — if payment save fails, orphan order remains. Fix: wrap both in `DB::transaction()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (313.1–313.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Service Patterns Specialist — Application | EPS v3.2*
