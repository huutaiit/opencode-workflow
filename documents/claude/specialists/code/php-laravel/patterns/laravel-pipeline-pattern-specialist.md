# Laravel Pipeline Pattern Specialist — Patterns
# Laravelパイプラインパターンスペシャリスト — パターン
# Chuyen Gia Pipeline Pattern Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Pipeline Pattern
**Aspect**: Pipeline Pattern
**Category**: patterns
**Purpose**: Knowledge provider for Laravel Pipeline pattern — Illuminate\Pipeline basics, filter pipelines, transformation pipelines, conditional pipes, error handling, and pipeline testing

---

## Metadata

```json
{
  "id": "laravel-pipeline-pattern-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Pipeline Pattern",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Illuminate\\Pipeline\\Pipeline — Laravel's built-in pipeline for sequential processing",
    "E2: Middleware architecture — Laravel's HTTP middleware IS a pipeline",
    "E3: Chain of Responsibility — pipeline pipes as sequential, composable processors"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 345.1–345.6 |
| **Directory Pattern** | `app/Pipes/`, `app/Pipelines/` |
| **Naming Convention** | `{Action}Pipe.php`, `{Name}Pipeline.php` |
| **Imports From** | Domain (entities, DTOs), Infrastructure (services) |
| **Imported By** | Application (services, handlers), Presentation (controllers) |
| **Cannot Import** | Presentation (HTTP layer) |
| **Dependencies** | `illuminate/pipeline` |
| **When To Use** | Sequential multi-step processing — validation chains, data transformation, filter composition |
| **Source Skeleton** | `app/Pipes/{Action}Pipe.php` |
| **Specialist Type** | code |
| **Purpose** | Pipeline pattern for Laravel — sequential processing, composable pipes, error handling |
| **Activation Trigger** | files: `app/Pipes/*.php`; keywords: Pipeline, pipe, through, thenReturn |

---

## Role

You are a **Laravel Pipeline Pattern Specialist**. Your responsibility is to provide best practices for using Laravel's Pipeline class for sequential data processing — building pipe classes, composing filter and transformation pipelines, handling errors within pipes, and testing pipeline flows.

**Used by**: Any code agent implementing multi-step sequential processing in Laravel
**Not used by**: Non-Laravel stacks, single-step operations

---

## Patterns

### Pattern 345.1: Pipeline Basics

**Category**: Fundamentals
**Description**: Using Laravel's `Illuminate\Pipeline\Pipeline` for sequential data processing through composable pipe classes.

```php
<?php

declare(strict_types=1);

namespace App\Pipelines;

use App\DTOs\OrderData;
use App\Pipes\ApplyDiscount;
use App\Pipes\CalculateShipping;
use App\Pipes\CalculateTax;
use App\Pipes\ValidateInventory;
use Illuminate\Pipeline\Pipeline;

final class OrderProcessingPipeline
{
    public function __construct(
        private readonly Pipeline $pipeline,
    ) {}

    public function process(OrderData $order): OrderData
    {
        return $this->pipeline
            ->send($order)
            ->through([
                ValidateInventory::class,
                ApplyDiscount::class,
                CalculateTax::class,
                CalculateShipping::class,
            ])
            ->thenReturn();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Pipes;

use App\DTOs\OrderData;
use Closure;

final class CalculateTax
{
    public function handle(OrderData $order, Closure $next): mixed
    {
        $taxRate = $this->getTaxRate($order->shippingState);
        $order->taxAmount = $order->subtotal * $taxRate;

        return $next($order);
    }

    private function getTaxRate(string $state): float
    {
        return match ($state) {
            'CA' => 0.0725,
            'NY' => 0.08,
            'TX' => 0.0625,
            default => 0.0,
        };
    }
}
```

**Key Points**:
- `send()` — the passable object flowing through pipes
- `through()` — array of pipe classes, resolved from container
- `thenReturn()` — returns the final result; `then(fn ($result) => ...)` for custom handling
- Each pipe receives the passable and a `$next` closure — must call `$next()` to continue

---

### Pattern 345.2: Filter Pipeline

**Category**: Query Building
**Description**: Pipeline for composing database query filters from request parameters.

```php
<?php

declare(strict_types=1);

namespace App\Pipes\Filters;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

final class StatusFilter
{
    public function __construct(
        private readonly Request $request,
    ) {}

    public function handle(Builder $query, Closure $next): mixed
    {
        if ($this->request->filled('status')) {
            $query->where('status', $this->request->input('status'));
        }

        return $next($query);
    }
}

final class DateRangeFilter
{
    public function __construct(
        private readonly Request $request,
    ) {}

    public function handle(Builder $query, Closure $next): mixed
    {
        if ($this->request->filled('from')) {
            $query->where('created_at', '>=', $this->request->date('from'));
        }

        if ($this->request->filled('to')) {
            $query->where('created_at', '<=', $this->request->date('to'));
        }

        return $next($query);
    }
}

final class SortFilter
{
    private const ALLOWED = ['name', 'price', 'created_at'];

    public function __construct(
        private readonly Request $request,
    ) {}

    public function handle(Builder $query, Closure $next): mixed
    {
        $sort = $this->request->input('sort', 'created_at');
        $direction = $this->request->input('direction', 'desc');

        if (in_array($sort, self::ALLOWED, true)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        return $next($query);
    }
}
```

```php
// Usage in controller
public function index(Request $request, Pipeline $pipeline): AnonymousResourceCollection
{
    $query = $pipeline
        ->send(Order::query())
        ->through([
            StatusFilter::class,
            DateRangeFilter::class,
            SortFilter::class,
        ])
        ->thenReturn();

    return OrderResource::collection($query->paginate(15));
}
```

**Key Points**:
- Each filter pipe is a self-contained, testable unit
- Pipes receive dependencies via constructor injection (container-resolved)
- Filters are additive — each pipe adds constraints without removing others
- Pipeline composes filters declaratively — easy to add/remove/reorder

---

### Pattern 345.3: Transformation Pipeline

**Category**: Data Processing
**Description**: Pipeline for multi-step data transformation — ETL, import processing, content formatting.

```php
<?php

declare(strict_types=1);

namespace App\Pipes\Import;

use App\DTOs\ImportRow;
use Closure;

final class NormalizeEmail
{
    public function handle(ImportRow $row, Closure $next): mixed
    {
        $row->email = strtolower(trim($row->email));
        return $next($row);
    }
}

final class ValidateRequiredFields
{
    public function handle(ImportRow $row, Closure $next): mixed
    {
        if (empty($row->name) || empty($row->email)) {
            $row->markInvalid('Missing required fields: name or email');
            return $row; // Stop pipeline — do not call $next
        }

        return $next($row);
    }
}

final class DeduplicateByEmail
{
    public function __construct(
        private readonly \App\Contracts\Repositories\UserRepositoryInterface $users,
    ) {}

    public function handle(ImportRow $row, Closure $next): mixed
    {
        if ($this->users->existsByEmail($row->email)) {
            $row->markDuplicate();
            return $row; // Stop pipeline
        }

        return $next($row);
    }
}

final class CreateUserRecord
{
    public function __construct(
        private readonly \App\Contracts\Repositories\UserRepositoryInterface $users,
    ) {}

    public function handle(ImportRow $row, Closure $next): mixed
    {
        $user = $this->users->create([
            'name' => $row->name,
            'email' => $row->email,
        ]);

        $row->setCreatedUserId($user->id);
        return $next($row);
    }
}
```

**Key Points**:
- Transformation pipes modify the passable object in place
- A pipe can short-circuit the pipeline by returning without calling `$next()`
- Use DTOs as passable objects — carry data and status through the pipeline
- Order matters — validate before transform, transform before persist

---

### Pattern 345.4: Conditional Pipes

**Category**: Dynamic Pipeline
**Description**: Dynamically building pipe arrays based on context or configuration.

```php
<?php

declare(strict_types=1);

namespace App\Pipelines;

use App\DTOs\PaymentData;
use App\Pipes\Payment\ApplyLoyaltyPoints;
use App\Pipes\Payment\FraudCheck;
use App\Pipes\Payment\ProcessPayment;
use App\Pipes\Payment\SendReceipt;
use App\Pipes\Payment\ValidatePaymentMethod;
use Illuminate\Pipeline\Pipeline;

final class PaymentPipeline
{
    public function __construct(
        private readonly Pipeline $pipeline,
    ) {}

    public function process(PaymentData $payment): PaymentData
    {
        $pipes = $this->buildPipes($payment);

        return $this->pipeline
            ->send($payment)
            ->through($pipes)
            ->thenReturn();
    }

    /**
     * @return array<int, string>
     */
    private function buildPipes(PaymentData $payment): array
    {
        $pipes = [
            ValidatePaymentMethod::class,
        ];

        // Conditional: fraud check only for amounts over threshold
        if ($payment->amount > 500.00) {
            $pipes[] = FraudCheck::class;
        }

        // Conditional: loyalty points for registered users
        if ($payment->userId !== null) {
            $pipes[] = ApplyLoyaltyPoints::class;
        }

        $pipes[] = ProcessPayment::class;
        $pipes[] = SendReceipt::class;

        return $pipes;
    }
}
```

**Key Points**:
- Build pipe arrays dynamically based on business rules
- Conditional inclusion is cleaner than adding if-checks inside each pipe
- Keep the pipe list builder method separate for testability
- Feature flags can control pipe inclusion: `if (Feature::active('fraud-check'))`

---

### Pattern 345.5: Error Handling in Pipeline

**Category**: Resilience
**Description**: Structured error handling within pipeline pipes — exceptions, rollback, and error accumulation.

```php
<?php

declare(strict_types=1);

namespace App\Pipes;

use App\DTOs\ProcessingResult;
use App\Exceptions\PipelineStepException;
use Closure;
use Illuminate\Support\Facades\Log;

final class SafeExternalApiCall
{
    public function handle(ProcessingResult $result, Closure $next): mixed
    {
        try {
            $apiResponse = $this->callExternalApi($result->payload);
            $result->addStepResult('external_api', $apiResponse);
        } catch (\Throwable $e) {
            Log::error('Pipeline step failed: external API call', [
                'error' => $e->getMessage(),
                'payload_id' => $result->id,
            ]);

            // Option A: Add error and continue
            $result->addError('external_api', $e->getMessage());

            // Option B: Stop pipeline with domain exception
            // throw new PipelineStepException('External API call failed', previous: $e);
        }

        return $next($result);
    }

    private function callExternalApi(array $payload): array
    {
        // External API call implementation
        return [];
    }
}
```

```php
// Pipeline with via() for custom method names and exception handling
$result = app(Pipeline::class)
    ->send($data)
    ->through([Step1::class, Step2::class, Step3::class])
    ->via('execute') // Call execute() instead of handle()
    ->then(function ($data) {
        if ($data->hasErrors()) {
            Log::warning('Pipeline completed with errors', $data->errors());
        }
        return $data;
    });
```

**Key Points**:
- Decide per-pipe: continue on error (accumulate) or halt (throw exception)
- Use `via()` to call a different method name on pipes — useful for multi-purpose classes
- Wrap external calls in try-catch — pipeline should not crash on transient failures
- Use a result DTO that accumulates errors alongside successful results

---

### Pattern 345.6: Pipeline Testing

**Category**: Testing
**Description**: Unit testing individual pipes and integration testing complete pipeline flows.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Pipes;

use App\DTOs\OrderData;
use App\Pipes\CalculateTax;
use Tests\TestCase;

final class CalculateTaxTest extends TestCase
{
    public function test_calculates_california_tax(): void
    {
        $order = new OrderData(subtotal: 100.00, shippingState: 'CA');
        $pipe = new CalculateTax();

        $pipe->handle($order, fn ($o) => $o);

        $this->assertEquals(7.25, $order->taxAmount);
    }

    public function test_zero_tax_for_unknown_state(): void
    {
        $order = new OrderData(subtotal: 100.00, shippingState: 'ZZ');
        $pipe = new CalculateTax();

        $pipe->handle($order, fn ($o) => $o);

        $this->assertEquals(0.0, $order->taxAmount);
    }
}
```

```php
// Integration test: full pipeline
final class OrderProcessingPipelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_processes_order_through_all_steps(): void
    {
        $order = OrderData::fake(subtotal: 200.00, shippingState: 'NY');
        $pipeline = $this->app->make(OrderProcessingPipeline::class);

        $result = $pipeline->process($order);

        $this->assertEquals(16.00, $result->taxAmount); // 200 * 0.08
        $this->assertGreaterThan(0, $result->shippingCost);
        $this->assertTrue($result->inventoryValidated);
    }

    public function test_stops_on_inventory_validation_failure(): void
    {
        $order = OrderData::fake(productId: 999); // Non-existent
        $pipeline = $this->app->make(OrderProcessingPipeline::class);

        $this->expectException(\App\Exceptions\InsufficientInventoryException::class);
        $pipeline->process($order);
    }
}
```

**Key Points**:
- Unit test pipes individually — pass a no-op closure as `$next`: `fn ($o) => $o`
- Integration test the complete pipeline — verify all pipes execute in order
- Test short-circuit scenarios — verify pipeline stops when a pipe doesn't call `$next()`
- Mock external dependencies in pipes via constructor injection

---

## Best Practices

- **One responsibility per pipe** — each pipe does one thing well
- **Use DTOs as passable** — carry data, status, and errors through the pipeline
- **Order pipes logically** — validate first, transform second, persist last
- **Inject via container** — let Laravel resolve pipe dependencies automatically
- **Use `via()`** — when pipes serve multiple contexts with different method names
- **Handle errors explicitly** — decide continue-on-error vs halt per pipe
- **Keep pipes stateless** — no instance state between invocations

---

## Abnormal Case Patterns

1. **Forgetting to call $next()** — pipe stops the pipeline unintentionally. Fix: ensure every code path either calls `$next()` or intentionally short-circuits.

2. **Mutable passable leakage** — pipe modifies passable properties that later pipes don't expect. Fix: use DTOs with clear property contracts.

3. **Pipe ordering bug** — CalculateTax runs before ApplyDiscount, taxing full price. Fix: document pipe order; test integration with order-sensitive data.

4. **Circular pipeline** — pipe A triggers pipeline that includes pipe A. Fix: pipelines are linear; never nest the same pipeline.

5. **Heavy pipe blocking** — external API call in pipeline blocks entire flow. Fix: use queued jobs for async steps; keep pipeline synchronous and fast.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (345.1–345.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Pipeline Pattern Specialist — Patterns | EPS v3.2*
