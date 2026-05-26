# Laravel PHP Fundamentals Specialist — Language
# Laravel PHP基礎スペシャリスト — 言語
# Chuyen Gia PHP Co Ban Laravel — Ngon Ngu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: PHP Language Fundamentals
**Category**: language
**Purpose**: Knowledge provider for modern PHP 8.x language features essential for Laravel development — readonly classes, enums, match expressions, named arguments, first-class callables, fibers, attributes, and arrow functions

---

## Metadata

```json
{
  "id": "laravel-php-fundamentals-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "PHP Language Fundamentals",
  "category": "language",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: PHP 8.3 RFC — readonly classes, typed class constants, json_validate, Randomizer",
    "E2: PHP 8.1 enums — backed enums, interface implementation, enum methods",
    "E3: PHP 8.0 attributes — native metadata replacing docblock annotations"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 354.1–354.8 |
| **Directory Pattern** | `app/` (all PHP files) |
| **Naming Convention** | N/A (language-level features) |
| **Imports From** | N/A |
| **Imported By** | ALL (language features used everywhere) |
| **Cannot Import** | N/A |
| **Dependencies** | PHP 8.3+ |
| **When To Use** | Every Laravel project — modern PHP idioms |
| **Source Skeleton** | N/A |
| **Specialist Type** | code |
| **Purpose** | Modern PHP 8.x language features for idiomatic Laravel development |
| **Activation Trigger** | files: `*.php`; keywords: readonly, enum, match, named arguments, attributes, fibers, arrow function |
| **Anti-Patterns** | Legacy PHP 7.x patterns, untyped code, switch statements where match fits |
| **Related Specialists** | laravel-design-patterns-specialist, laravel-code-quality-specialist |

---

## Role

You are a **Laravel PHP Fundamentals Specialist**. Your responsibility is to provide best practices for using modern PHP 8.x language features within Laravel 11+ applications — readonly classes, enums, match expressions, named arguments, first-class callable syntax, fibers, attributes, and arrow functions.

**Used by**: Any code agent writing PHP code in a Laravel project
**Not used by**: Non-PHP stacks, PHP 7.x legacy projects

---

## Patterns

### Pattern 354.1: Readonly Classes and Typed Class Constants

**Category**: PHP 8.3 Features
**Description**: Readonly classes enforce immutability at the class level. Typed class constants add type safety to constants.

```php
<?php

declare(strict_types=1);

namespace App\ValueObjects;

readonly class Money
{
    public const string CURRENCY_USD = 'USD';
    public const string CURRENCY_EUR = 'EUR';
    public const string CURRENCY_JPY = 'JPY';

    public function __construct(
        public int $amount,
        public string $currency = self::CURRENCY_USD,
    ) {}

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException(
                "Cannot add different currencies: {$this->currency} + {$other->currency}",
            );
        }

        return new self(
            amount: $this->amount + $other->amount,
            currency: $this->currency,
        );
    }

    public function multiply(int $factor): self
    {
        return new self(
            amount: $this->amount * $factor,
            currency: $this->currency,
        );
    }
}
```

**Key Points**:
- `readonly class` — all properties are implicitly readonly, no mutable state
- Typed class constants (`const string`) enforce type at compile time (PHP 8.3)
- Ideal for value objects, DTOs, and configuration holders in Laravel
- Readonly classes cannot have untyped or static mutable properties

---

### Pattern 354.2: Backed Enums with Laravel Integration

**Category**: Enums
**Description**: PHP 8.1 backed enums as first-class citizens in Laravel — casting, validation, and query scoping.

```php
<?php

declare(strict_types=1);

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /**
     * @return array<int, self>
     */
    public static function activeStatuses(): array
    {
        return [self::Pending, self::Processing, self::Shipped];
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Awaiting Payment',
            self::Processing => 'Being Processed',
            self::Shipped => 'In Transit',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Pending => in_array($target, [self::Processing, self::Cancelled], true),
            self::Processing => in_array($target, [self::Shipped, self::Cancelled], true),
            self::Shipped => $target === self::Delivered,
            self::Delivered, self::Cancelled => false,
        };
    }
}
```

```php
// Eloquent model integration
namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

final class Order extends Model
{
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', OrderStatus::activeStatuses());
    }
}
```

**Key Points**:
- Backed enums (`string` or `int`) persist directly to database via Eloquent casts
- Add domain logic as methods on the enum itself (labels, transitions, validation)
- Use `from()` for strict conversion, `tryFrom()` for nullable fallback
- Laravel validation: `Rule::enum(OrderStatus::class)`

---

### Pattern 354.3: Match Expressions

**Category**: Control Flow
**Description**: Match expressions replace verbose switch statements with strict comparison and return values.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Contracts\PaymentProcessorInterface;
use App\Payments\StripeProcessor;
use App\Payments\PayPalProcessor;
use App\Payments\BankTransferProcessor;

final class PaymentProcessorFactory
{
    public function __construct(
        private readonly StripeProcessor $stripe,
        private readonly PayPalProcessor $paypal,
        private readonly BankTransferProcessor $bankTransfer,
    ) {}

    public function create(PaymentMethod $method): PaymentProcessorInterface
    {
        return match ($method) {
            PaymentMethod::CreditCard, PaymentMethod::DebitCard => $this->stripe,
            PaymentMethod::PayPal => $this->paypal,
            PaymentMethod::BankTransfer => $this->bankTransfer,
        };
    }

    public function calculateFee(PaymentMethod $method, int $amountCents): int
    {
        $rate = match (true) {
            $method === PaymentMethod::CreditCard && $amountCents > 100_000 => 0.015,
            $method === PaymentMethod::CreditCard => 0.029,
            $method === PaymentMethod::PayPal => 0.034,
            $method === PaymentMethod::BankTransfer => 0.005,
            default => 0.029,
        };

        return (int) ceil($amountCents * $rate);
    }
}
```

**Key Points**:
- `match` is an expression — it returns a value, unlike `switch`
- Strict type comparison (`===`) by default — no type coercion surprises
- `match(true)` pattern enables complex conditional matching
- Unmatched value throws `UnhandledMatchError` — forces exhaustive handling
- Combine multiple cases with comma separation

---

### Pattern 354.4: Named Arguments

**Category**: Function Calls
**Description**: Named arguments improve readability in constructors, factory methods, and Laravel helper calls.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\UserFilterDTO;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;

final class UserQueryService
{
    public function search(UserFilterDTO $filter): LengthAwarePaginator
    {
        return Cache::remember(
            key: "users:search:{$filter->cacheKey()}",
            ttl: now()->addMinutes(15),
            callback: fn () => User::query()
                ->when(
                    value: $filter->role,
                    callback: fn ($q, $role) => $q->where('role', $role),
                )
                ->when(
                    value: $filter->isActive,
                    callback: fn ($q) => $q->where('is_active', true),
                )
                ->orderBy(
                    column: $filter->sortBy,
                    direction: $filter->sortDirection,
                )
                ->paginate(
                    perPage: $filter->perPage,
                    page: $filter->page,
                ),
        );
    }
}
```

**Key Points**:
- Named arguments make long parameter lists self-documenting
- Skip optional parameters without passing null placeholders
- Combine with constructor promotion for clean DTOs
- Laravel methods (Cache::remember, paginate, when) benefit greatly from named args
- Named arguments are order-independent — reorder for readability

---

### Pattern 354.5: First-Class Callable Syntax

**Category**: Functional PHP
**Description**: The `Closure::fromCallable()` shorthand using `...` syntax for cleaner higher-order function usage.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;

final class ProductCatalogService
{
    public function getFilteredProducts(Collection $products): Collection
    {
        return $products
            ->filter($this->isInStock(...))
            ->map($this->applyDiscount(...))
            ->sort($this->compareByPrice(...));
    }

    private function isInStock(Product $product): bool
    {
        return $product->stock_quantity > 0;
    }

    private function applyDiscount(Product $product): Product
    {
        if ($product->category === 'clearance') {
            $product->price = (int) ($product->price * 0.7);
        }

        return $product;
    }

    private function compareByPrice(Product $a, Product $b): int
    {
        return $a->price <=> $b->price;
    }

    // Passing static methods as callables
    public function processWithValidation(Collection $items): Collection
    {
        return $items
            ->filter(self::isValid(...))
            ->values();
    }

    private static function isValid(Product $product): bool
    {
        return $product->name !== '' && $product->price > 0;
    }
}
```

**Key Points**:
- `$this->method(...)` replaces `Closure::fromCallable([$this, 'method'])`
- Works with instance methods, static methods, and functions: `strlen(...)`
- Produces a real `Closure` object — compatible with all callable type hints
- Clean integration with Laravel collections, pipelines, and higher-order methods
- Use for extracting complex callbacks into named, testable methods

---

### Pattern 354.6: Fibers Basics

**Category**: Concurrency Primitives
**Description**: PHP 8.1 Fibers provide cooperative multitasking — the foundation for async frameworks and Laravel Octane internals.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Fiber;

final class BatchProcessingService
{
    /**
     * Process items in chunks, yielding control between batches
     * to allow other operations (logging, heartbeat) to proceed.
     *
     * @param array<int, mixed> $items
     * @param callable(mixed): void $processor
     */
    public function processBatch(array $items, callable $processor): array
    {
        $results = [];
        $fiber = new Fiber(function () use ($items, $processor, &$results): void {
            foreach (array_chunk($items, 100) as $index => $chunk) {
                foreach ($chunk as $item) {
                    $results[] = $processor($item);
                }
                // Yield control after each chunk — caller can log progress
                Fiber::suspend(value: [
                    'processed' => count($results),
                    'total' => count($items),
                    'batch' => $index + 1,
                ]);
            }
        });

        // Start and resume the fiber, collecting progress
        $progress = $fiber->start();
        while ($fiber->isSuspended()) {
            logger()->info('Batch progress', $progress);
            $progress = $fiber->resume();
        }

        return $results;
    }
}
```

**Key Points**:
- Fibers enable cooperative concurrency — code explicitly yields via `Fiber::suspend()`
- The caller controls scheduling via `start()`, `resume()`, and `isSuspended()`
- Laravel Octane uses Fibers internally for concurrent request handling
- Application code rarely needs raw Fibers — prefer Laravel's concurrency helpers (Pattern 357.x)
- Fibers are NOT parallel execution — they run in a single thread

---

### Pattern 354.7: PHP 8 Attributes

**Category**: Metadata
**Description**: Native attributes replace docblock annotations for routing, validation, and custom metadata.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTOs\CreateProductRequest;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Attributes\Middleware;
use Illuminate\Routing\Attributes\Prefix;

#[Prefix('api/v1/products')]
#[Middleware(['auth:sanctum', 'throttle:api'])]
final class ProductController
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function store(CreateProductRequest $request): JsonResponse
    {
        $product = $this->productService->create(
            data: $request->validated(),
        );

        return response()->json(
            data: ['product' => $product],
            status: 201,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Attributes;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
final readonly class CacheResult
{
    public function __construct(
        public int $ttlSeconds = 3600,
        public string $prefix = '',
        public bool $invalidateOnWrite = true,
    ) {}
}

// Usage in a service
final class ReportService
{
    #[CacheResult(ttlSeconds: 1800, prefix: 'reports')]
    public function generateMonthlyReport(int $year, int $month): array
    {
        // Heavy computation...
        return [];
    }
}
```

**Key Points**:
- Attributes are compile-time metadata — accessed via `ReflectionAttribute`
- Laravel 11 supports route attributes: `#[Prefix]`, `#[Middleware]`, `#[Controller]`
- Create custom attributes for cross-cutting concerns (caching, logging, audit)
- `Attribute::IS_REPEATABLE` allows multiple instances on the same target
- Prefer attributes over magic strings and docblock annotations

---

### Pattern 354.8: Arrow Functions and Short Closures

**Category**: Functional PHP
**Description**: Arrow functions (`fn =>`) for concise single-expression closures — ubiquitous in Laravel collections and queries.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Collection;

final class AnalyticsService
{
    /**
     * @return array{total_revenue: int, avg_order: float, top_products: Collection}
     */
    public function calculateDashboardMetrics(Collection $orders): array
    {
        $totalRevenue = $orders->sum(fn (Order $order) => $order->total_cents);

        $avgOrder = $orders->avg(fn (Order $order) => $order->total_cents);

        $topProducts = $orders
            ->flatMap(fn (Order $order) => $order->items)
            ->groupBy(fn ($item) => $item->product_id)
            ->map(fn (Collection $items, int $productId) => [
                'product_id' => $productId,
                'quantity' => $items->sum(fn ($item) => $item->quantity),
                'revenue' => $items->sum(fn ($item) => $item->price * $item->quantity),
            ])
            ->sortByDesc(fn (array $data) => $data['revenue'])
            ->take(10)
            ->values();

        // Arrow functions capture outer scope by value automatically
        $threshold = 5000;
        $highValueOrders = $orders->filter(
            fn (Order $order) => $order->total_cents >= $threshold,
        );

        return [
            'total_revenue' => $totalRevenue,
            'avg_order' => round($avgOrder, 2),
            'top_products' => $topProducts,
        ];
    }
}
```

**Key Points**:
- Arrow functions (`fn () =>`) auto-capture outer variables by value
- Single expression only — no multi-statement bodies (use regular closures for those)
- Perfect for collection pipelines, query callbacks, and validation rules
- Type hints supported: `fn (Order $order): int => $order->total_cents`
- Prefer arrow functions for short callbacks; regular closures for multi-line logic

---

## Best Practices

- **Enforce strict_types** — `declare(strict_types=1)` in every PHP file
- **Use readonly for value objects** — readonly classes prevent accidental mutation
- **Prefer enums over class constants** — enums provide type safety and exhaustive matching
- **Use match over switch** — match is an expression with strict comparison
- **Name your arguments** — especially for methods with 3+ parameters or boolean flags
- **Type everything** — union types, intersection types, return types, property types
- **Use constructor promotion** — reduces boilerplate in DTOs and value objects
- **Leverage null-safe operator** — `$user?->address?->city` instead of nested null checks

---

## Abnormal Case Patterns

1. **Readonly property modification attempt** — `readonly` properties throw `Error` on reassignment. Fix: create a new instance with modified values via `new self(...)` or a `with()` method.

2. **Enum serialization failure** — `json_encode()` on a pure enum (non-backed) fails. Fix: always use backed enums (`string` or `int`) for any enum that needs serialization.

3. **Match expression UnhandledMatchError** — forgetting a case in `match` throws at runtime. Fix: add a `default` arm or ensure exhaustive coverage (backed enum cases).

4. **Arrow function mutation surprise** — outer variables are captured by value, not reference. Modifying a captured variable inside an arrow function has no effect outside. Fix: use a regular closure with `use (&$var)` for mutation.

5. **Fiber stack overflow** — deeply nested Fiber suspensions can exhaust stack memory. Fix: limit suspension depth; use iterative approaches within fibers.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (354.1–354.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel PHP Fundamentals Specialist — Language | EPS v3.2*
