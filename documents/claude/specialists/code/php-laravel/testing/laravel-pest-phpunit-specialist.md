# Laravel Pest & PHPUnit Specialist — Testing
# Laravel Pest・PHPUnitスペシャリスト — テスト
# Chuyen Gia Pest va PHPUnit Laravel — Kiem Thu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Pest 3.x / PHPUnit 11.x
**Aspect**: Unit & Feature Testing
**Category**: testing
**Purpose**: Knowledge provider for Laravel test authoring — Pest syntax, PHPUnit test cases, HTTP tests, database testing, mocking, test factories, and test organization

---

## Metadata

```json
{
  "id": "laravel-pest-phpunit-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Pest 3.x / PHPUnit 11.x",
  "aspect": "Unit & Feature Testing",
  "category": "testing",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Pest 3.x test/it/expect syntax — closure-based expressive testing",
    "E2: Laravel HTTP testing — get/post/put/delete with assertions",
    "E3: RefreshDatabase trait — transactional test isolation",
    "E4: Mockery integration — service mocking via app container"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | 358.1–358.8 |
| **Directory Pattern** | `tests/Feature/`, `tests/Unit/` |
| **Naming Convention** | `{Entity}Test.php` |
| **Imports From** | Application (controllers, services), Domain (models, DTOs) |
| **Imported By** | CI/CD pipelines, quality gates |
| **Cannot Import** | N/A (tests can import any application code) |
| **Dependencies** | `pestphp/pest`, `phpunit/phpunit` |
| **When To Use** | Every Laravel project — automated test coverage |
| **Source Skeleton** | `tests/Feature/{Entity}Test.php`, `tests/Unit/{Entity}Test.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel test authoring — Pest/PHPUnit syntax, HTTP tests, database testing, mocking, factories, organization |
| **Activation Trigger** | files: `tests/**/*Test.php`, `tests/Pest.php`; keywords: test, it, expect, RefreshDatabase, Mockery, factory |

---

## Role

You are a **Laravel Pest & PHPUnit Specialist**. Your responsibility is to provide best practices for Laravel 11+ test authoring — Pest 3.x closure-based syntax, PHPUnit test cases, HTTP testing, database isolation with RefreshDatabase, mocking with Mockery, factory-driven data setup, and test organization conventions.

**Used by**: Any code agent writing or maintaining Laravel test suites
**Not used by**: Non-Laravel stacks, browser/E2E testing (see laravel-testing-advanced-specialist)

---

## Patterns

### Pattern 358.1: Pest Basics — test/it/expect

**Category**: Test Syntax
**Description**: Pest 3.x closure-based syntax with `test()`, `it()`, and `expect()` fluent assertions.

```php
<?php

declare(strict_types=1);

// tests/Unit/Models/OrderTest.php

use App\Models\Order;
use App\Enums\OrderStatus;

test('order has default pending status', function (): void {
    $order = new Order();

    expect($order->status)->toBe(OrderStatus::Pending);
});

it('calculates total with tax', function (): void {
    $order = Order::factory()->make([
        'subtotal' => 10000,
        'tax_rate' => 0.10,
    ]);

    expect($order->total)
        ->toBe(11000)
        ->and($order->tax_amount)
        ->toBe(1000);
});

it('rejects negative quantities', function (): void {
    expect(fn () => Order::factory()->make(['quantity' => -1]))
        ->toThrow(InvalidArgumentException::class);
});
```

**Key Points**:
- `test()` and `it()` are interchangeable — `it()` prepends "it" to description
- `expect()` provides fluent chainable assertions with `->and()` for multiple checks
- `->toThrow()` wraps closure execution and asserts exception type
- Pest auto-discovers tests in `tests/` — no class boilerplate needed

---

### Pattern 358.2: PHPUnit Test Case

**Category**: Test Syntax
**Description**: Traditional PHPUnit class-based test cases extending Laravel's TestCase.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\PricingService;
use App\Models\Product;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class PricingServiceTest extends TestCase
{
    private PricingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PricingService::class);
    }

    #[Test]
    public function it_applies_percentage_discount(): void
    {
        $product = Product::factory()->make(['price' => 10000]);

        $result = $this->service->applyDiscount($product, percent: 20);

        $this->assertSame(8000, $result->price);
    }

    #[Test]
    #[DataProvider('currencyProvider')]
    public function it_formats_price_for_currency(
        int $amount,
        string $currency,
        string $expected,
    ): void {
        $formatted = $this->service->format($amount, $currency);

        $this->assertSame($expected, $formatted);
    }

    /** @return array<string, array{int, string, string}> */
    public static function currencyProvider(): array
    {
        return [
            'USD' => [1000, 'USD', '$10.00'],
            'JPY' => [1000, 'JPY', '¥1,000'],
            'VND' => [50000, 'VND', '50,000₫'],
        ];
    }
}
```

**Key Points**:
- Use PHP 8.3 attributes `#[Test]`, `#[DataProvider]` instead of `@test` docblocks
- `setUp()` calls `parent::setUp()` first — required for Laravel container
- Mark test classes `final` — tests should not be inherited
- Data providers are `static` methods returning named arrays

---

### Pattern 358.3: Feature vs Unit Tests

**Category**: Test Organization
**Description**: Separation of unit tests (isolated logic) from feature tests (HTTP + full stack).

```php
<?php

declare(strict_types=1);

// tests/Unit/Services/InvoiceCalculatorTest.php — Unit: no DB, no HTTP
use App\Services\InvoiceCalculator;

test('calculates line item total', function (): void {
    $calculator = new InvoiceCalculator();

    $total = $calculator->lineTotal(quantity: 3, unitPrice: 2500);

    expect($total)->toBe(7500);
});

// tests/Feature/Http/Controllers/InvoiceControllerTest.php — Feature: full stack
use App\Models\User;
use App\Models\Invoice;

test('authenticated user can view their invoice', function (): void {
    $user = User::factory()->create();
    $invoice = Invoice::factory()->for($user)->create();

    $response = $this->actingAs($user)
        ->getJson("/api/invoices/{$invoice->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $invoice->id)
        ->assertJsonPath('data.user_id', $user->id);
});
```

**Key Points**:
- **Unit tests** (`tests/Unit/`): no container, no DB — pure logic, fast execution
- **Feature tests** (`tests/Feature/`): full Laravel app, HTTP simulation, DB transactions
- Unit tests never use `RefreshDatabase` or `$this->get()`
- Feature tests mirror `app/` directory structure: `tests/Feature/Http/Controllers/`

---

### Pattern 358.4: HTTP Tests

**Category**: HTTP Testing
**Description**: Laravel HTTP test methods for API and web endpoint verification.

```php
<?php

declare(strict_types=1);

// tests/Feature/Http/Controllers/ProductControllerTest.php

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('index returns paginated products', function (): void {
    Product::factory()->count(25)->create();

    $response = $this->getJson('/api/products?page=1&per_page=10');

    $response->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'name', 'price', 'created_at']],
            'meta' => ['current_page', 'last_page', 'total'],
        ]);
});

test('store validates required fields', function (): void {
    $user = User::factory()->admin()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/products', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'price']);
});

test('store creates product with valid data', function (): void {
    $user = User::factory()->admin()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/products', [
            'name' => 'Widget Pro',
            'price' => 4999,
            'sku' => 'WGT-PRO-001',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Widget Pro');

    $this->assertDatabaseHas('products', ['sku' => 'WGT-PRO-001']);
});

test('unauthorized user cannot delete product', function (): void {
    $product = Product::factory()->create();

    $response = $this->deleteJson("/api/products/{$product->id}");

    $response->assertUnauthorized();
});
```

**Key Points**:
- Use `getJson()`, `postJson()`, `putJson()`, `deleteJson()` for API tests
- `actingAs()` authenticates without real HTTP session
- `assertJsonStructure()` validates response shape without exact values
- `assertDatabaseHas()` verifies side effects after mutation endpoints

---

### Pattern 358.5: Database Testing — RefreshDatabase

**Category**: Database Isolation
**Description**: Transactional database isolation for feature tests using RefreshDatabase trait.

```php
<?php

declare(strict_types=1);

// tests/Feature/Services/OrderServiceTest.php

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('placing order decrements product stock', function (): void {
    $product = Product::factory()->create(['stock' => 50]);
    $user = User::factory()->create();

    /** @var OrderService $service */
    $service = app(OrderService::class);

    $order = $service->placeOrder(
        user: $user,
        items: [['product_id' => $product->id, 'quantity' => 3]],
    );

    expect($order)->toBeInstanceOf(Order::class)
        ->and($product->fresh()->stock)->toBe(47);
});

test('order rollbacks on payment failure', function (): void {
    $product = Product::factory()->create(['stock' => 10]);
    $user = User::factory()->create(['balance' => 0]);

    /** @var OrderService $service */
    $service = app(OrderService::class);

    expect(fn () => $service->placeOrder(
        user: $user,
        items: [['product_id' => $product->id, 'quantity' => 5]],
    ))->toThrow(\App\Exceptions\InsufficientBalanceException::class);

    expect($product->fresh()->stock)->toBe(10);
});
```

**Key Points**:
- `RefreshDatabase` wraps each test in a transaction and rolls back — fast isolation
- Use `LazyRefreshDatabase` in Pest 3.x for even faster execution (only migrates once)
- `->fresh()` re-fetches model from DB to verify mutations
- Test both success path and rollback/failure scenarios

---

### Pattern 358.6: Mocking with Mockery

**Category**: Test Doubles
**Description**: Service mocking via Laravel container binding and Mockery.

```php
<?php

declare(strict_types=1);

// tests/Feature/Services/NotificationServiceTest.php

use App\Contracts\SmsGatewayInterface;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

test('sends sms notification via gateway', function (): void {
    $mockGateway = $this->mock(SmsGatewayInterface::class, function (MockInterface $mock): void {
        $mock->shouldReceive('send')
            ->once()
            ->with('+81901234567', 'Order confirmed')
            ->andReturn(true);
    });

    $user = User::factory()->create(['phone' => '+81901234567']);

    /** @var NotificationService $service */
    $service = app(NotificationService::class);
    $result = $service->notifyOrderConfirmed($user);

    expect($result)->toBeTrue();
});

test('handles gateway failure gracefully', function (): void {
    $this->mock(SmsGatewayInterface::class, function (MockInterface $mock): void {
        $mock->shouldReceive('send')
            ->once()
            ->andThrow(new \RuntimeException('Gateway timeout'));
    });

    $user = User::factory()->create();

    /** @var NotificationService $service */
    $service = app(NotificationService::class);
    $result = $service->notifyOrderConfirmed($user);

    expect($result)->toBeFalse();
});
```

**Key Points**:
- `$this->mock()` binds mock into Laravel container — auto-injected into services
- `shouldReceive()->once()` sets expectation with call count verification
- `andReturn()` / `andThrow()` define mock behavior
- Mockery expectations auto-verified at test teardown — no manual `verify()` needed

---

### Pattern 358.7: Test Factories

**Category**: Data Setup
**Description**: Eloquent model factories for consistent, expressive test data creation.

```php
<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Order> */
final class OrderFactory extends Factory
{
    protected $model = Order::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'order_number' => $this->faker->unique()->numerify('ORD-######'),
            'status' => OrderStatus::Pending,
            'subtotal' => $this->faker->numberBetween(1000, 100000),
            'tax_rate' => 0.10,
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => OrderStatus::Completed,
            'completed_at' => now(),
        ]);
    }

    public function highValue(): static
    {
        return $this->state(fn (array $attributes): array => [
            'subtotal' => $this->faker->numberBetween(500000, 1000000),
        ]);
    }

    public function withItems(int $count = 3): static
    {
        return $this->has(
            \App\Models\OrderItem::factory()->count($count),
            'items',
        );
    }
}
```

```php
<?php

// Usage in tests
test('completed orders appear in report', function (): void {
    Order::factory()->completed()->count(5)->create();
    Order::factory()->count(3)->create(); // pending — excluded

    $response = $this->getJson('/api/reports/completed-orders');

    $response->assertOk()
        ->assertJsonCount(5, 'data');
});
```

**Key Points**:
- `definition()` returns default attributes — override per-test with `create([...])` or `make([...])`
- State methods (`completed()`, `highValue()`) compose via chaining
- `User::factory()` in `user_id` creates related model automatically
- `withItems()` uses `has()` for relationship factories
- Use `make()` for in-memory (no DB), `create()` for persisted records

---

### Pattern 358.8: Test Organization

**Category**: Structure
**Description**: Directory structure, Pest.php configuration, and test grouping conventions.

```php
<?php

declare(strict_types=1);

// tests/Pest.php — global test configuration

uses(
    Tests\TestCase::class,
    Illuminate\Foundation\Testing\RefreshDatabase::class,
)->in('Feature');

uses(Tests\TestCase::class)->in('Unit');

// Custom expectations
expect()->extend('toBeValidUuid', function (): void {
    $this->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/');
});

// Shared helpers
function createAuthenticatedUser(array $attributes = []): \App\Models\User
{
    return \App\Models\User::factory()->create($attributes);
}
```

```
tests/
├── Pest.php                          # Global config, uses(), helpers
├── TestCase.php                      # Base Laravel test case
├── Feature/
│   ├── Http/
│   │   └── Controllers/
│   │       ├── ProductControllerTest.php
│   │       └── OrderControllerTest.php
│   ├── Services/
│   │   └── OrderServiceTest.php
│   └── Jobs/
│       └── ProcessPaymentTest.php
├── Unit/
│   ├── Models/
│   │   └── OrderTest.php
│   ├── Services/
│   │   └── PricingServiceTest.php
│   └── ValueObjects/
│       └── MoneyTest.php
└── Datasets/
    └── CurrencyDataset.php           # Shared data providers
```

**Key Points**:
- `tests/Pest.php` applies traits globally — no per-file `uses()` for common traits
- Feature tests mirror `app/` structure under `tests/Feature/`
- Custom `expect()->extend()` for domain-specific assertions
- Shared helpers defined in `Pest.php` are available in all test files
- Datasets in `tests/Datasets/` for reusable data providers across tests

---

## Best Practices

- **Prefer Pest syntax** — less boilerplate, fluent `expect()` assertions, closure-based
- **One assertion concept per test** — name describes the single behavior verified
- **Use RefreshDatabase globally** — apply in `Pest.php` for Feature tests, not per-file
- **Factories over raw inserts** — state methods make intent explicit (`->completed()`)
- **Mock external services only** — avoid mocking Eloquent, Request, or framework internals
- **Name tests as behaviors** — `test('user can checkout with valid cart')` not `testCheckout`
- **Group related tests** — use `describe()` blocks in Pest for logical grouping
- **Run tests in parallel** — `php artisan test --parallel` for faster CI feedback
- **Avoid test interdependency** — each test must pass independently in any order

---

## Abnormal Case Patterns

1. **RefreshDatabase without migrations** — test fails with "table not found". Fix: run `php artisan migrate:fresh --env=testing` first or check `phpunit.xml` DB config.

2. **Mockery expectation never called** — mock set up but service resolves different instance. Fix: use `$this->mock()` which auto-binds into container, not `Mockery::mock()` directly.

3. **Factory state not applied** — `Order::factory()->create()` ignores `completed()` state. Fix: chain state before `create()`: `Order::factory()->completed()->create()`.

4. **Parallel test database collision** — tests share single DB and fail intermittently. Fix: configure `<env name="DB_DATABASE" value="testing"/>` in `phpunit.xml` and use `--parallel` with per-process databases.

5. **JSON assertion on paginated response** — `assertJsonCount()` fails because data is nested. Fix: use `assertJsonCount(10, 'data')` with the JSON path to the collection key.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (358.1–358.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Pest & PHPUnit Specialist — Testing | EPS v3.2*
