# Laravel Facade Specialist — Core
# Laravelファサードスペシャリスト — コア
# Chuyen Gia Facade Laravel — Loi

**Version**: 1.0.0
**Technology**: Laravel 11+ Facades
**Aspect**: Facades
**Category**: core
**Purpose**: Knowledge provider for Laravel facades — facade basics, real-time facades, custom facades, facade vs DI trade-offs, testing/mocking, and contracts vs facades

---

## Metadata

```json
{
  "id": "laravel-facade-specialist",
  "technology": "Laravel 11+ Facades",
  "aspect": "Facades",
  "category": "core",
  "subcategory": "php-laravel",
  "lines": 380,
  "token_cost": 2500,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel facade pattern — static proxy to service container bindings",
    "E2: Real-time facades — on-demand facade generation via namespace prefix",
    "E3: Contracts vs facades — interface-based alternative for explicit dependencies"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (facades provide cross-cutting access to container bindings) |
| **Variant** | ALL |
| **Pattern Numbers** | 305.1–305.6 |
| **Directory Pattern** | `app/Facades/` (custom facades), `app/Contracts/` (contracts) |
| **Naming Convention** | `{Name}.php` (facade), `{Name}Interface.php` (contract) |
| **Imports From** | Service Container (resolves underlying binding) |
| **Imported By** | Controllers, Commands, Views, Tests |
| **Cannot Import** | N/A (facades are access proxies) |
| **Dependencies** | `illuminate/support` |
| **When To Use** | When static-like syntax is preferred for framework services |
| **Source Skeleton** | `app/Facades/{Name}.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel facades — static proxies, real-time facades, testing, contracts comparison |
| **Activation Trigger** | files: `app/Facades/*.php`; keywords: Facade, getFacadeAccessor, Facades\\, Contract |

---

## Role

You are a **Laravel Facade Specialist**. Your responsibility is to provide best practices for Laravel 11+ facades — understanding the facade pattern, creating custom facades, using real-time facades, testing facade calls, and deciding between facades and dependency injection.

**Used by**: Any code agent working with Laravel facades and static service access
**Not used by**: Non-Laravel stacks, projects strictly avoiding static access

---

## Patterns

### Pattern 305.1: Facade Basics

**Category**: Facade Fundamentals
**Description**: How facades work — static proxy to a service container binding via `__callStatic`.

```php
<?php

declare(strict_types=1);

// How a facade call resolves:
// Cache::get('key')
//   1. Cache facade extends Illuminate\Support\Facades\Facade
//   2. getFacadeAccessor() returns 'cache'
//   3. __callStatic resolves app('cache') from container
//   4. Calls ->get('key') on the resolved CacheManager instance

// Common built-in facades and their underlying classes:
use Illuminate\Support\Facades\Cache;   // CacheManager
use Illuminate\Support\Facades\DB;      // DatabaseManager
use Illuminate\Support\Facades\Log;     // LogManager
use Illuminate\Support\Facades\Queue;   // QueueManager
use Illuminate\Support\Facades\Event;   // Dispatcher
use Illuminate\Support\Facades\Storage; // FilesystemManager
use Illuminate\Support\Facades\Http;    // PendingRequest (factory)
use Illuminate\Support\Facades\Mail;    // Mailer

// Usage in application code
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class ProductCatalogService
{
    public function getFeaturedProducts(): array
    {
        return Cache::remember(
            key: 'products.featured',
            ttl: now()->addHour(),
            callback: function (): array {
                Log::info('Cache miss: loading featured products from DB');
                return Product::featured()->limit(12)->get()->toArray();
            },
        );
    }
}
```

**Key Points**:
- Facades are static proxies — `Cache::get()` resolves to `app('cache')->get()`
- `__callStatic` magic method forwards calls to the container-resolved instance
- Facades provide convenient syntax but hide dependencies (not in constructor)
- IDE support: use `@mixin` annotations or Laravel IDE Helper for autocompletion
- Facades are NOT the Facade design pattern — they are service locators with static syntax

---

### Pattern 305.2: Real-Time Facades

**Category**: Facade Fundamentals
**Description**: Generate a facade on-the-fly by prefixing any class namespace with `Facades\`.

```php
<?php

declare(strict_types=1);

namespace App\Services;

final class PricingCalculator
{
    public function __construct(
        private readonly TaxService $taxService,
    ) {}

    public function calculateTotal(Cart $cart): Money
    {
        $subtotal = $cart->items->sum(fn (CartItem $item) => $item->price * $item->quantity);
        $tax = $this->taxService->calculate($subtotal, $cart->shippingAddress);
        return new Money(amount: $subtotal + $tax);
    }
}

// Using as real-time facade — no custom facade class needed
namespace App\Http\Controllers;

use Facades\App\Services\PricingCalculator;

final class CheckoutController
{
    public function summary(Cart $cart)
    {
        // Resolves App\Services\PricingCalculator from container
        // and calls calculateTotal() on the instance
        $total = PricingCalculator::calculateTotal($cart);

        return response()->json(['total' => $total->format()]);
    }
}

// Testing with real-time facade mock
namespace Tests\Feature;

use Facades\App\Services\PricingCalculator;

final class CheckoutTest extends TestCase
{
    public function test_checkout_summary(): void
    {
        PricingCalculator::shouldReceive('calculateTotal')
            ->once()
            ->andReturn(new Money(amount: 5000));

        $this->getJson('/checkout/summary')
            ->assertOk()
            ->assertJsonPath('total', '$50.00');
    }
}
```

**Key Points**:
- Prefix any fully-qualified class with `Facades\` to create a real-time facade
- No need to create a facade class or register it — works automatically
- Container resolves the underlying class with all its dependencies
- Testable via `shouldReceive()` — Mockery integration built in
- Use sparingly — constructor injection is preferred for explicit dependencies

---

### Pattern 305.3: Custom Facades

**Category**: Custom Implementation
**Description**: Create a custom facade class for a domain service — explicit accessor registration.

```php
<?php

declare(strict_types=1);

// Step 1: Create the service
namespace App\Services;

final class NotificationDispatcher
{
    public function __construct(
        private readonly array $channels,
    ) {}

    public function send(Notifiable $user, Notification $notification): void
    {
        foreach ($this->channels as $channel) {
            $channel->dispatch($user, $notification);
        }
    }

    public function sendBulk(Collection $users, Notification $notification): int
    {
        $sent = 0;
        foreach ($users as $user) {
            $this->send($user, $notification);
            $sent++;
        }
        return $sent;
    }
}

// Step 2: Bind in service provider
namespace App\Providers;

use App\Services\NotificationDispatcher;
use Illuminate\Support\ServiceProvider;

final class NotificationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            abstract: 'notification.dispatcher',
            concrete: fn ($app) => new NotificationDispatcher(
                channels: [
                    $app->make(EmailChannel::class),
                    $app->make(SmsChannel::class),
                ],
            ),
        );
    }
}

// Step 3: Create the facade
namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static void send(Notifiable $user, Notification $notification)
 * @method static int sendBulk(Collection $users, Notification $notification)
 *
 * @see \App\Services\NotificationDispatcher
 */
final class Notify extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'notification.dispatcher';
    }
}

// Usage: Notify::send($user, new OrderConfirmation($order));
```

**Key Points**:
- `getFacadeAccessor()` returns the container binding key (string or class name)
- Add `@method` PHPDoc annotations for IDE autocompletion
- Add `@see` annotation pointing to the underlying class
- Mark custom facades `final` — no inheritance needed
- Register binding before facade is used — service provider order matters

---

### Pattern 305.4: Facade vs Dependency Injection

**Category**: Architecture Decisions
**Description**: When to use facades vs constructor injection — trade-offs and guidelines.

```php
<?php

declare(strict_types=1);

// FACADE approach — concise, implicit dependency
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

final class ReportGenerator
{
    public function generate(ReportRequest $request): Report
    {
        Log::info('Generating report', ['type' => $request->type]);

        return Cache::remember(
            key: "report.{$request->hash()}",
            ttl: 3600,
            callback: fn () => $this->buildReport($request),
        );
    }
}

// DI approach — explicit, testable, discoverable
namespace App\Services;

use Illuminate\Cache\Repository as CacheRepository;
use Psr\Log\LoggerInterface;

final readonly class ReportGenerator
{
    public function __construct(
        private CacheRepository $cache,
        private LoggerInterface $logger,
    ) {}

    public function generate(ReportRequest $request): Report
    {
        $this->logger->info('Generating report', ['type' => $request->type]);

        return $this->cache->remember(
            key: "report.{$request->hash()}",
            ttl: 3600,
            callback: fn () => $this->buildReport($request),
        );
    }
}
```

```php
<?php

// Decision matrix:
// | Criteria              | Facade        | DI                |
// |-----------------------|---------------|-------------------|
// | Readability           | Concise       | Explicit          |
// | Testability           | shouldReceive | Mock in construct |
// | Dependency visibility | Hidden        | Constructor shows |
// | IDE support           | Needs helper  | Native            |
// | Refactoring safety    | Lower         | Higher            |
// | Use in domain layer   | NEVER         | Always            |

// RECOMMENDATION:
// - Domain/Application layers: always DI (clean architecture boundary)
// - Controllers/Commands: DI preferred, facades acceptable for framework services
// - Tests: facades fine for assertion helpers (e.g., Queue::assertPushed)
// - Views/Blade: facades are the standard approach
```

**Key Points**:
- **Domain layer: always DI** — facades violate clean architecture boundaries
- **Controllers: DI preferred** — makes dependencies explicit and testable
- **Views/Blade: facades expected** — `@auth`, `{{ config() }}` are facade-based
- **Tests: facades for assertions** — `Queue::assertPushed()`, `Mail::assertSent()`
- Facades hide dependencies — a class with 10 facade calls has 10 hidden dependencies
- DI makes dependency count visible in constructor — signals when to split

---

### Pattern 305.5: Facade Testing and Mocking

**Category**: Testing
**Description**: Test facade calls using built-in Mockery integration and assertion methods.

```php
<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\OrderService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class OrderWorkflowTest extends TestCase
{
    public function test_order_creation_dispatches_events(): void
    {
        Event::fake([OrderCreated::class, InventoryReserved::class]);

        $order = app(OrderService::class)->create($this->validOrderData());

        Event::assertDispatched(OrderCreated::class, fn ($event) =>
            $event->order->id === $order->id
        );
        Event::assertDispatched(InventoryReserved::class);
    }

    public function test_order_sends_confirmation_email(): void
    {
        Mail::fake();

        app(OrderService::class)->create($this->validOrderData());

        Mail::assertSent(OrderConfirmationMail::class, function ($mail) {
            return $mail->hasTo('customer@example.com')
                && $mail->assertSeeInHtml('Order Confirmation');
        });
    }

    public function test_external_api_call_with_fake(): void
    {
        Http::fake([
            'api.shipping.com/rates' => Http::response([
                'rate' => 1500,
                'currency' => 'usd',
                'estimated_days' => 3,
            ]),
            '*' => Http::response(status: 500), // catch unexpected calls
        ]);

        $rate = app(ShippingService::class)->getRate($this->package());

        Http::assertSent(fn ($request) =>
            $request->url() === 'https://api.shipping.com/rates'
            && $request['weight'] === 2.5
        );

        $this->assertEquals(1500, $rate->amount);
    }

    public function test_queue_job_dispatched(): void
    {
        Queue::fake();

        app(OrderService::class)->create($this->validOrderData());

        Queue::assertPushed(ProcessPayment::class);
        Queue::assertPushedOn('payments', ProcessPayment::class);
    }

    public function test_cache_interaction(): void
    {
        Cache::shouldReceive('remember')
            ->once()
            ->with('products.featured', \Mockery::type('object'), \Mockery::type('Closure'))
            ->andReturn($this->featuredProducts());

        $result = app(ProductService::class)->getFeatured();

        $this->assertCount(5, $result);
    }
}
```

**Key Points**:
- `::fake()` — intercept all calls and provide assertions (Event, Mail, Queue, Http, Bus, Notification)
- `::shouldReceive()` — Mockery-based expectations for any facade (Cache, Log, etc.)
- Fake methods prevent real side effects — no emails sent, no jobs dispatched
- Use closure assertions for detailed verification of dispatched data
- `Http::fake()` with URL patterns prevents unexpected external calls in tests

---

### Pattern 305.6: Contracts vs Facades

**Category**: Architecture Decisions
**Description**: Laravel contracts — interface-based alternative to facades for explicit dependency declaration.

```php
<?php

declare(strict_types=1);

// Contracts = interfaces from illuminate/contracts package
// Every facade has a corresponding contract:
// Facade:    Illuminate\Support\Facades\Cache
// Contract:  Illuminate\Contracts\Cache\Repository

namespace App\Services;

// Using contract (interface-based DI)
use Illuminate\Contracts\Cache\Repository as CacheContract;
use Illuminate\Contracts\Events\Dispatcher as EventContract;
use Illuminate\Contracts\Queue\Queue as QueueContract;

final readonly class OrderProcessor
{
    public function __construct(
        private CacheContract $cache,
        private EventContract $events,
        private QueueContract $queue,
    ) {}

    public function process(Order $order): void
    {
        $this->cache->forget("order.{$order->id}");
        $this->events->dispatch(new OrderProcessed($order));
        $this->queue->push(new GenerateInvoice($order));
    }
}

// Common facade-to-contract mapping:
// | Facade   | Contract Interface                           |
// |----------|----------------------------------------------|
// | Cache    | Illuminate\Contracts\Cache\Repository        |
// | Event    | Illuminate\Contracts\Events\Dispatcher       |
// | Log      | Psr\Log\LoggerInterface                      |
// | Mail     | Illuminate\Contracts\Mail\Mailer             |
// | Queue    | Illuminate\Contracts\Queue\Queue             |
// | Session  | Illuminate\Contracts\Session\Session         |
// | Storage  | Illuminate\Contracts\Filesystem\Filesystem   |
// | Auth     | Illuminate\Contracts\Auth\Guard              |
```

```php
<?php

declare(strict_types=1);

// Testing with contracts — standard mock injection
namespace Tests\Unit;

use App\Services\OrderProcessor;
use Illuminate\Contracts\Cache\Repository as CacheContract;
use Illuminate\Contracts\Events\Dispatcher as EventContract;
use Illuminate\Contracts\Queue\Queue as QueueContract;
use PHPUnit\Framework\TestCase;

final class OrderProcessorTest extends TestCase
{
    public function test_process_clears_cache_and_dispatches(): void
    {
        $cache = $this->createMock(CacheContract::class);
        $events = $this->createMock(EventContract::class);
        $queue = $this->createMock(QueueContract::class);

        $cache->expects($this->once())
            ->method('forget')
            ->with('order.42');

        $events->expects($this->once())
            ->method('dispatch')
            ->with($this->isInstanceOf(OrderProcessed::class));

        $processor = new OrderProcessor(
            cache: $cache,
            events: $events,
            queue: $queue,
        );

        $processor->process($this->createOrder(id: 42));
    }
}
```

**Key Points**:
- Contracts are interfaces — same functionality as facades but via DI
- Contracts make dependencies explicit in constructor signatures
- Testable with standard PHPUnit mocks — no Mockery required
- Use contracts for domain/application layers; facades acceptable in presentation
- `Psr\Log\LoggerInterface` is the PSR contract for logging — framework-agnostic

---

## Best Practices

- **Domain layer: contracts only** — never use facades in domain or application services
- **Presentation layer: facades acceptable** — controllers, commands, views can use facades
- **Add PHPDoc to custom facades** — `@method` and `@see` for IDE support
- **Use `::fake()` in tests** — prevents real side effects and provides assertions
- **Limit facade usage per class** — more than 3-4 facades signals hidden complexity
- **Prefer DI for new services** — facades are convenient but obscure dependencies
- **Real-time facades for prototyping** — quick facade access without creating a class
- **Never create facade for domain service** — inject via interface instead

---

## Abnormal Case Patterns

1. **Facade root not set** — `getFacadeAccessor()` returns unbound key. Fix: ensure service provider registers the binding before facade access.

2. **Facade mock leaking between tests** — `shouldReceive()` from one test affects another. Fix: Laravel auto-clears facade mocks in `tearDown()`, but verify `::clearResolvedInstances()` if using custom test setup.

3. **Facade in domain service** — business logic depends on `Cache::` or `Log::` facade. Fix: inject the contract interface via constructor instead.

4. **Real-time facade namespace collision** — `Facades\App\Models\User` conflicts with actual model. Fix: avoid real-time facades for models; only use for services.

5. **Hidden dependency explosion** — service uses 8+ facades, making it untestable. Fix: refactor to DI, extract dependencies into constructor, split service if too many.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (305.1–305.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Facade Specialist — Core | EPS v3.2*
