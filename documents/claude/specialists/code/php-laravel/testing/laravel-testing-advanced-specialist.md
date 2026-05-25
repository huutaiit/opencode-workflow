# Laravel Advanced Testing Specialist — Testing
# Laravel高度テストスペシャリスト — テスト
# Chuyen Gia Kiem Thu Nang Cao Laravel — Kiem Thu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Dusk + Pest Arch Plugin
**Aspect**: Advanced Testing Strategies
**Category**: testing
**Purpose**: Knowledge provider for advanced Laravel testing — browser testing with Dusk, parallel testing, test doubles, snapshot testing, API contract testing, and architecture testing with Pest arch plugin

---

## Metadata

```json
{
  "id": "laravel-testing-advanced-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Dusk + Pest Arch Plugin",
  "aspect": "Advanced Testing Strategies",
  "category": "testing",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Dusk — browser automation for JavaScript-dependent UI testing",
    "E2: Pest Architecture Plugin — structural constraints enforced via tests",
    "E3: Parallel testing — per-process DB isolation for CI speed"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | 359.1–359.6 |
| **Directory Pattern** | `tests/Feature/`, `tests/Unit/`, `tests/Browser/`, `tests/Architecture/` |
| **Naming Convention** | `{Entity}Test.php` |
| **Imports From** | Application (controllers, services), Domain (models) |
| **Imported By** | CI/CD pipelines, quality gates |
| **Cannot Import** | N/A (tests can import any application code) |
| **Dependencies** | `laravel/dusk`, `pestphp/pest-plugin-arch` |
| **When To Use** | Projects requiring browser testing, architecture enforcement, or advanced test strategies |
| **Source Skeleton** | `tests/Browser/{Entity}Test.php`, `tests/Architecture/ArchTest.php` |
| **Specialist Type** | code |
| **Purpose** | Advanced testing — Dusk browser tests, parallel execution, test doubles, snapshot testing, API contracts, architecture tests |
| **Activation Trigger** | files: `tests/Browser/*.php`, `tests/Architecture/*.php`; keywords: Dusk, arch, snapshot, contract, parallel |

---

## Role

You are a **Laravel Advanced Testing Specialist**. Your responsibility is to provide best practices for advanced Laravel testing strategies — browser testing with Dusk, parallel test execution, sophisticated test doubles, snapshot testing for complex outputs, API contract testing, and architecture testing with Pest's arch plugin.

**Used by**: Any code agent needing browser automation, architecture enforcement, or advanced test patterns
**Not used by**: Basic unit/feature testing (see laravel-pest-phpunit-specialist)

---

## Patterns

### Pattern 359.1: Browser Testing with Dusk

**Category**: E2E Testing
**Description**: Laravel Dusk browser automation for testing JavaScript-dependent features.

```php
<?php

declare(strict_types=1);

namespace Tests\Browser;

use App\Models\User;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

final class CheckoutFlowTest extends DuskTestCase
{
    public function test_user_can_complete_checkout(): void
    {
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user): void {
            $browser->loginAs($user)
                ->visit('/cart')
                ->assertSee('Shopping Cart')
                ->press('Proceed to Checkout')
                ->waitForRoute('checkout.payment')
                ->type('#card-number', '4242424242424242')
                ->type('#card-expiry', '12/30')
                ->type('#card-cvc', '123')
                ->press('Place Order')
                ->waitForText('Order Confirmed')
                ->assertPathBeginsWith('/orders/')
                ->assertSee('Thank you');
        });
    }

    public function test_checkout_shows_validation_errors(): void
    {
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user): void {
            $browser->loginAs($user)
                ->visit('/checkout/payment')
                ->press('Place Order')
                ->waitForText('The card number field is required')
                ->assertSee('The card number field is required');
        });
    }
}
```

**Key Points**:
- Dusk runs a real browser (Chrome) — tests JavaScript interactions, SPAs, WebSocket UIs
- `waitForRoute()`, `waitForText()` handle async rendering — avoid `pause()`
- `loginAs()` authenticates via cookie — no form interaction needed
- Dusk uses a separate `.env.dusk.local` environment file
- Run with `php artisan dusk` — separate from `php artisan test`

---

### Pattern 359.2: Parallel Testing

**Category**: Performance
**Description**: Parallel test execution with per-process database isolation.

```php
<?php

declare(strict_types=1);

// tests/Pest.php — parallel-safe configuration

uses(
    Tests\TestCase::class,
    Illuminate\Foundation\Testing\RefreshDatabase::class,
)->in('Feature');
```

```xml
<!-- phpunit.xml — parallel configuration -->
<phpunit>
    <php>
        <env name="DB_DATABASE" value="testing"/>
        <env name="CACHE_DRIVER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
    </php>
</phpunit>
```

```php
<?php

declare(strict_types=1);

// tests/TestCase.php — ParallelTesting hooks

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\ParallelTesting;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        ParallelTesting::setUpProcess(function (int $token): void {
            // Runs once per process — seed shared data
            \Artisan::call('db:seed', ['--class' => 'TestSeeder']);
        });

        ParallelTesting::setUpTestCase(function (int $token, TestCase $testCase): void {
            // Runs before each test in parallel context
        });
    }
}
```

```bash
# Run tests in parallel (auto-detects CPU cores)
php artisan test --parallel

# Specify process count
php artisan test --parallel --processes=4

# Parallel with coverage
php artisan test --parallel --coverage --min=80
```

**Key Points**:
- `--parallel` creates per-process databases: `testing_1`, `testing_2`, etc.
- Use `array` driver for cache/session to avoid shared-state collisions
- `ParallelTesting::setUpProcess()` runs once per worker — use for seeding
- Avoid file-based state (logs, file cache) — use database or array drivers
- `RefreshDatabase` works correctly with parallel — each process has its own DB

---

### Pattern 359.3: Test Doubles — Fakes, Spies, and Partial Mocks

**Category**: Test Isolation
**Description**: Laravel facade fakes, Mockery spies, and partial mocks for granular test control.

```php
<?php

declare(strict_types=1);

// tests/Feature/Services/OrderServiceTest.php

use App\Events\OrderPlaced;
use App\Jobs\ProcessPayment;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderConfirmation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

test('placing order dispatches event and queues payment', function (): void {
    Event::fake([OrderPlaced::class]);
    Queue::fake([ProcessPayment::class]);

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [['product_id' => 1, 'quantity' => 2]],
        ]);

    $response->assertCreated();

    Event::assertDispatched(OrderPlaced::class, function (OrderPlaced $event) use ($user): bool {
        return $event->order->user_id === $user->id;
    });

    Queue::assertPushed(ProcessPayment::class, function (ProcessPayment $job): bool {
        return $job->queue === 'payments';
    });
});

test('order confirmation notification sent to user', function (): void {
    Notification::fake();

    $user = User::factory()->create();
    $order = Order::factory()->for($user)->create();

    $order->confirm();

    Notification::assertSentTo($user, OrderConfirmation::class);
    Notification::assertCount(1);
});

test('spy verifies interaction without preventing execution', function (): void {
    $spy = $this->spy(\App\Services\AuditLogger::class);

    $user = User::factory()->create();
    $this->actingAs($user)->deleteJson("/api/account");

    $spy->shouldHaveReceived('log')
        ->once()
        ->with('account.deleted', \Mockery::on(fn ($data) => $data['user_id'] === $user->id));
});
```

**Key Points**:
- `Event::fake()`, `Queue::fake()`, `Notification::fake()` — Laravel facade fakes intercept and record
- Pass class array to `fake()` to selectively fake — other events/jobs still dispatch normally
- `$this->spy()` creates a spy that allows calls through and records them for later assertion
- `assertDispatched()` accepts closure for payload verification
- Fakes reset per test — no cross-test contamination

---

### Pattern 359.4: Snapshot Testing

**Category**: Regression Testing
**Description**: Snapshot assertions for complex JSON responses, rendered views, and data structures.

```php
<?php

declare(strict_types=1);

// tests/Feature/Api/ProductApiSnapshotTest.php

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('product API response matches snapshot', function (): void {
    $product = Product::factory()->create([
        'id' => 1,
        'name' => 'Widget Pro',
        'price' => 4999,
        'sku' => 'WGT-PRO-001',
        'created_at' => '2025-01-01 00:00:00',
        'updated_at' => '2025-01-01 00:00:00',
    ]);

    $response = $this->getJson("/api/products/{$product->id}");

    $response->assertOk();

    expect($response->json('data'))->toMatchSnapshot();
});

test('invoice PDF content matches snapshot', function (): void {
    $invoice = \App\Models\Invoice::factory()->create([
        'id' => 100,
        'issued_at' => '2025-06-01',
    ]);

    $html = view('invoices.pdf', ['invoice' => $invoice])->render();

    expect($html)->toMatchSnapshot();
});

test('complex calculation result matches snapshot', function (): void {
    $calculator = app(\App\Services\TaxCalculator::class);

    $result = $calculator->computeForRegions(
        amount: 100000,
        regions: ['US-CA', 'JP', 'VN'],
    );

    expect($result->toArray())->toMatchSnapshot();
});
```

**Key Points**:
- `toMatchSnapshot()` stores expected output in `tests/.pest/snapshots/` on first run
- Subsequent runs compare against stored snapshot — fails on any diff
- Update snapshots with `--update-snapshots` flag when intentional changes occur
- Fix timestamps and IDs in factories to avoid non-deterministic snapshot diffs
- Ideal for API response shapes, rendered HTML, and complex computed data

---

### Pattern 359.5: API Contract Testing

**Category**: Integration Testing
**Description**: Validate API responses against contracts to prevent breaking changes.

```php
<?php

declare(strict_types=1);

// tests/Feature/Contracts/ProductApiContractTest.php

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('product list endpoint contract', function (): void {
    Product::factory()->count(3)->create();

    $response = $this->getJson('/api/products');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'price',
                    'sku',
                    'category' => ['id', 'name'],
                    'created_at',
                    'updated_at',
                ],
            ],
            'links' => ['first', 'last', 'prev', 'next'],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ]);

    // Type assertions on response data
    $firstProduct = $response->json('data.0');
    expect($firstProduct)
        ->id->toBeInt()
        ->name->toBeString()
        ->price->toBeInt()
        ->sku->toBeString()->toMatch('/^[A-Z]{3}-[A-Z]+-\d{3}$/');
});

test('product show endpoint returns consistent schema', function (): void {
    $product = Product::factory()->create();

    $response = $this->getJson("/api/products/{$product->id}");

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id', 'name', 'price', 'sku', 'description',
                'category' => ['id', 'name'],
                'tags' => [['id', 'label']],
                'created_at', 'updated_at',
            ],
        ]);
});

test('error responses follow RFC 7807 problem details', function (): void {
    $response = $this->getJson('/api/products/999999');

    $response->assertNotFound()
        ->assertJsonStructure([
            'message',
            'errors',
        ]);
});

test('api versioning preserves backward compatibility', function (): void {
    $product = Product::factory()->create();

    $v1 = $this->getJson("/api/v1/products/{$product->id}");
    $v2 = $this->getJson("/api/v2/products/{$product->id}");

    // V1 fields must exist in V2 (backward compatible)
    $v1Fields = array_keys($v1->json('data'));
    $v2Fields = array_keys($v2->json('data'));

    expect(array_diff($v1Fields, $v2Fields))->toBeEmpty();
});
```

**Key Points**:
- `assertJsonStructure()` validates required fields exist without checking values
- Combine structure checks with type assertions for complete contract verification
- Test error response shapes alongside success responses
- API versioning tests verify backward compatibility — V1 fields must exist in V2
- Contract tests run in CI to catch breaking API changes before deployment

---

### Pattern 359.6: Architecture Testing — Pest Arch Plugin

**Category**: Structural Enforcement
**Description**: Enforce architectural rules via Pest's arch plugin — dependency direction, naming conventions, layer boundaries.

```php
<?php

declare(strict_types=1);

// tests/Architecture/ArchTest.php

arch('models extend Eloquent base model')
    ->expect('App\Models')
    ->toExtend('Illuminate\Database\Eloquent\Model')
    ->ignoring('App\Models\Concerns');

arch('controllers have Controller suffix')
    ->expect('App\Http\Controllers')
    ->toHaveSuffix('Controller');

arch('services do not depend on controllers')
    ->expect('App\Services')
    ->not->toBeUsedIn('App\Http\Controllers')
    ->not->toDependOn('App\Http\Controllers');

arch('domain layer does not depend on infrastructure')
    ->expect('App\Domain')
    ->not->toDependOn([
        'Illuminate\Http',
        'Illuminate\Routing',
        'App\Http',
    ]);

arch('DTOs are readonly and final')
    ->expect('App\DTOs')
    ->toBeReadonly()
    ->toBeFinal();

arch('enums are string-backed')
    ->expect('App\Enums')
    ->toBeEnums()
    ->toHaveMethod('value');

arch('no debugging functions in source code')
    ->expect(['dd', 'dump', 'ray', 'var_dump', 'print_r'])
    ->not->toBeUsed();

arch('exceptions extend base domain exception')
    ->expect('App\Exceptions')
    ->toExtend('App\Exceptions\DomainException')
    ->ignoring('App\Exceptions\DomainException')
    ->ignoring('App\Exceptions\Handler');

arch('jobs implement ShouldQueue')
    ->expect('App\Jobs')
    ->toImplement('Illuminate\Contracts\Queue\ShouldQueue');

arch('listeners are in correct namespace')
    ->expect('App\Listeners')
    ->toHaveSuffix('Listener')
    ->toImplement('Illuminate\Contracts\Queue\ShouldQueue');

arch('repositories depend on interfaces not concretes')
    ->expect('App\Repositories')
    ->toOnlyImplement('App\Contracts');
```

**Key Points**:
- `arch()` tests run without booting Laravel — pure static analysis, extremely fast
- `toExtend()`, `toImplement()`, `toDependOn()` enforce inheritance and dependency rules
- `not->toBeUsed()` prevents debugging functions from reaching production code
- `toBeReadonly()`, `toBeFinal()` enforce PHP 8.3 structural constraints
- Place arch tests in `tests/Architecture/` — separate from behavioral tests
- Arch tests replace manual code review for structural compliance

---

## Best Practices

- **Dusk for JS-dependent features only** — use HTTP tests for API endpoints, Dusk for browser interactions
- **Parallel testing in CI** — reduce feedback loop from 10 min to 2 min with `--parallel`
- **Facade fakes over Mockery** — `Event::fake()` is simpler and more idiomatic than mocking event dispatcher
- **Snapshot tests for regression** — use for complex outputs, update snapshots intentionally via flag
- **Architecture tests in CI** — arch tests catch structural violations before code review
- **Contract tests per API version** — prevent breaking changes across API versions
- **Avoid Dusk for CRUD** — HTTP tests are 100x faster than browser tests for simple forms
- **Deterministic test data** — fix timestamps, UUIDs, and sequences for reproducible snapshots

---

## Abnormal Case Patterns

1. **Dusk ChromeDriver version mismatch** — `dusk:chrome-driver` installs wrong version. Fix: run `php artisan dusk:chrome-driver --detect` to match installed Chrome.

2. **Parallel test file lock contention** — SQLite parallel tests fail with "database is locked". Fix: use MySQL/PostgreSQL with per-process databases for parallel.

3. **Snapshot test flaky due to timestamps** — snapshot includes `created_at` that changes. Fix: freeze time with `$this->travelTo()` or fix factory timestamps.

4. **Arch test false positive on traits** — `toExtend()` fails for models using traits. Fix: use `->ignoring()` for trait namespaces.

5. **Fake not reset between tests** — facade fake persists across tests in same process. Fix: Pest auto-resets fakes — if using PHPUnit, call `Facade::clearResolvedInstances()` in `tearDown()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (359.1–359.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Advanced Testing Specialist — Testing | EPS v3.2*
