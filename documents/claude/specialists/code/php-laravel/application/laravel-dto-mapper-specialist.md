# Laravel DTO & Mapper Specialist — Application
# Laravel DTOとマッパースペシャリスト — アプリケーション
# Chuyen Gia DTO va Mapper Laravel — Ung Dung

**Version**: 1.0.0
**Technology**: Laravel 11+ DTOs & Mappers
**Aspect**: DTO & Mapper Patterns
**Category**: application
**Purpose**: Knowledge provider for Laravel 11+ Data Transfer Object design — readonly DTO classes, request-to-DTO mapping, DTO validation strategies, entity-to-DTO mapping, Spatie Laravel Data integration, and DTO collection patterns

---

## Metadata

```json
{
  "id": "laravel-dto-mapper-specialist",
  "technology": "Laravel 11+ DTOs & Mappers",
  "aspect": "DTO & Mapper Patterns",
  "category": "application",
  "subcategory": "php-laravel",
  "lines": 470,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: PHP 8.3 readonly classes — immutable DTOs with constructor promotion",
    "E2: Spatie Laravel Data v4 — typed data objects with validation, casting, and transformation",
    "E3: Mapper pattern — bidirectional entity/DTO conversion for layer isolation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 315.1–315.6 |
| **Directory Pattern** | `app/DTOs/` or `app/Application/DTOs/` |
| **Naming Convention** | `{Entity}Data.php` or `{Action}{Entity}Dto.php` |
| **Imports From** | Domain (enums, value objects) |
| **Imported By** | Presentation (controllers, requests), Application (services, actions) |
| **Cannot Import** | Infrastructure (repositories), Presentation (controllers) |
| **Dependencies** | `laravel/framework`, `spatie/laravel-data` (optional) |
| **When To Use** | Any boundary between layers — request→service, service→response, event payloads |
| **Source Skeleton** | `app/DTOs/{Entity}Data.php` |
| **Specialist Type** | code |
| **Purpose** | DTO design — immutable data carriers, request mapping, validation, entity conversion |
| **Activation Trigger** | files: `app/DTOs/*.php`, `app/Data/*.php`; keywords: DTO, Data, readonly class, mapper, fromRequest |

---

## Role

You are a **Laravel DTO & Mapper Specialist**. Your responsibility is to provide best practices for Laravel 11+ Data Transfer Objects — PHP 8.3 readonly class DTOs, request-to-DTO conversion, DTO validation strategies, entity-to-DTO mapper patterns, Spatie Laravel Data integration, and DTO collection handling for lists and pagination.

**Used by**: Any code agent working with data transfer between Laravel application layers
**Not used by**: Non-Laravel stacks, projects using raw arrays for all data passing

---

## Patterns

### Pattern 315.1: DTO with Readonly Class

**Category**: DTO Fundamentals
**Description**: Immutable DTO using PHP 8.3 readonly class with typed constructor promotion — the foundation for all data transfer in the application layer.

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\OrderStatus;

final readonly class CreateOrderData
{
    /**
     * @param array<int, OrderItemData> $items
     */
    public function __construct(
        public array $items,
        public string $shippingAddress,
        public ?string $couponCode = null,
        public ?string $notes = null,
        public string $taxRegion = 'US',
    ) {}

    /**
     * Named constructor for clarity and encapsulation.
     *
     * @param array<int, array{product_id: int, quantity: int, price: int}> $rawItems
     */
    public static function from(
        array $rawItems,
        string $shippingAddress,
        ?string $couponCode = null,
        ?string $notes = null,
    ): self {
        $items = array_map(
            callback: fn (array $raw): OrderItemData => new OrderItemData(
                productId: $raw['product_id'],
                quantity: $raw['quantity'],
                unitPrice: $raw['price'],
            ),
            array: $rawItems,
        );

        return new self(
            items: $items,
            shippingAddress: $shippingAddress,
            couponCode: $couponCode,
            notes: $notes,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

final readonly class OrderItemData
{
    public function __construct(
        public int $productId,
        public int $quantity,
        public int $unitPrice,
    ) {
        if ($this->quantity < 1) {
            throw new \InvalidArgumentException('Quantity must be at least 1');
        }

        if ($this->unitPrice < 0) {
            throw new \InvalidArgumentException('Unit price cannot be negative');
        }
    }

    public function totalPrice(): int
    {
        return $this->quantity * $this->unitPrice;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

/**
 * DTO for partial updates — all properties nullable.
 * Only non-null values are applied.
 */
final readonly class UpdateProductData
{
    public function __construct(
        public ?string $name = null,
        public ?string $description = null,
        public ?int $price = null,
        public ?int $categoryId = null,
        public ?bool $isActive = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_filter(
            array: [
                'name' => $this->name,
                'description' => $this->description,
                'price' => $this->price,
                'category_id' => $this->categoryId,
                'is_active' => $this->isActive,
            ],
            callback: fn (mixed $value): bool => $value !== null,
        );
    }

    public function hasChanges(): bool
    {
        return !empty($this->toArray());
    }
}
```

**Key Points**:
- Use `final readonly class` — immutable after construction, cannot be extended
- Constructor promotion eliminates boilerplate property declarations
- Named constructors (`from()`, `fromArray()`) encapsulate construction logic
- Use nullable properties for partial update DTOs — only non-null values applied
- Add lightweight validation in constructor for invariants (positive quantity, valid ranges)
- DTOs are value objects — compare by value, not identity

---

### Pattern 315.2: DTO from Request

**Category**: Request Mapping
**Description**: Converting validated Laravel Form Request data into typed DTOs — bridging the HTTP layer and application layer.

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\SubscriptionPlan;
use Illuminate\Http\Request;

final readonly class CreateSubscriptionData
{
    public function __construct(
        public SubscriptionPlan $plan,
        public string $paymentMethodId,
        public bool $autoRenew,
        public ?string $referralCode = null,
    ) {}

    /**
     * Create DTO from a validated Form Request.
     * Assumes validation already passed via StoreSubscriptionRequest.
     */
    public static function fromRequest(Request $request): self
    {
        return new self(
            plan: SubscriptionPlan::from($request->validated('plan')),
            paymentMethodId: $request->validated('payment_method_id'),
            autoRenew: (bool) $request->validated('auto_renew', false),
            referralCode: $request->validated('referral_code'),
        );
    }

    /**
     * Create DTO from an array (CLI commands, jobs, tests).
     *
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            plan: SubscriptionPlan::from($data['plan']),
            paymentMethodId: $data['payment_method_id'],
            autoRenew: $data['auto_renew'] ?? false,
            referralCode: $data['referral_code'] ?? null,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\SubscriptionPlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'plan' => ['required', 'string', Rule::enum(SubscriptionPlan::class)],
            'payment_method_id' => ['required', 'string', 'max:255'],
            'auto_renew' => ['sometimes', 'boolean'],
            'referral_code' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }
}
```

```php
// Controller wiring — Form Request validates, DTO transports
final class SubscriptionController extends Controller
{
    public function store(
        StoreSubscriptionRequest $request,
        CreateSubscriptionAction $createSubscription,
    ): JsonResponse {
        $data = CreateSubscriptionData::fromRequest($request);

        $subscription = ($createSubscription)(
            user: $request->user(),
            data: $data,
        );

        return SubscriptionResource::make($subscription)
            ->response()
            ->setStatusCode(201);
    }
}
```

**Key Points**:
- Form Request handles validation; DTO handles type-safe data transport
- `fromRequest()` uses `$request->validated()` — never `$request->input()` (bypasses validation)
- Provide `fromArray()` for non-HTTP contexts (commands, jobs, tests, seeders)
- Cast enums with `Enum::from()` — fails fast on invalid values
- DTO is framework-agnostic — only the `fromRequest()` method touches Laravel's Request

---

### Pattern 315.3: DTO Validation

**Category**: Validation Strategy
**Description**: Three validation approaches — Form Request (HTTP edge), DTO constructor invariants, and Spatie Data built-in validation.

```php
<?php

declare(strict_types=1);

// Approach 1: Constructor invariant validation (lightweight, always enforced)
namespace App\DTOs;

final readonly class MoneyData
{
    public function __construct(
        public int $amountCents,
        public string $currency,
    ) {
        if ($this->amountCents < 0) {
            throw new \InvalidArgumentException(
                message: "Amount cannot be negative: {$this->amountCents}",
            );
        }

        if (strlen($this->currency) !== 3) {
            throw new \InvalidArgumentException(
                message: "Currency must be 3-letter ISO code: {$this->currency}",
            );
        }
    }

    public static function usd(int $cents): self
    {
        return new self(amountCents: $cents, currency: 'USD');
    }

    public static function zero(string $currency = 'USD'): self
    {
        return new self(amountCents: 0, currency: $currency);
    }

    public function add(self $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \DomainException('Cannot add different currencies');
        }

        return new self(
            amountCents: $this->amountCents + $other->amountCents,
            currency: $this->currency,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

// Approach 2: Validator facade in DTO factory (medium complexity)
namespace App\DTOs;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final readonly class ImportProductData
{
    public function __construct(
        public string $sku,
        public string $name,
        public int $price,
        public int $stockQuantity,
        public ?string $description = null,
    ) {}

    /**
     * @param array<string, mixed> $raw
     * @throws ValidationException
     */
    public static function fromCsvRow(array $raw): self
    {
        $validated = Validator::make($raw, [
            'sku' => ['required', 'string', 'max:50', 'regex:/^[A-Z0-9\-]+$/'],
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:5000'],
        ])->validate();

        return new self(
            sku: $validated['sku'],
            name: $validated['name'],
            price: (int) ($validated['price'] * 100), // dollars to cents
            stockQuantity: (int) $validated['stock_quantity'],
            description: $validated['description'] ?? null,
        );
    }

    /**
     * Batch validation — collect errors for all rows.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array{valid: list<self>, errors: array<int, array<string, list<string>>>}
     */
    public static function fromCsvBatch(array $rows): array
    {
        $result = ['valid' => [], 'errors' => []];

        foreach ($rows as $index => $row) {
            try {
                $result['valid'][] = self::fromCsvRow($row);
            } catch (ValidationException $e) {
                $result['errors'][$index] = $e->errors();
            }
        }

        return $result;
    }
}
```

```php
<?php

declare(strict_types=1);

// Approach 3: Assert-based invariants (PHP 8.3 compatible)
namespace App\DTOs;

use App\Enums\PaymentMethod;

final readonly class PaymentData
{
    public function __construct(
        public int $amountCents,
        public PaymentMethod $method,
        public string $idempotencyKey,
        public ?string $description = null,
        public array $metadata = [],
    ) {
        assert($this->amountCents > 0, 'Payment amount must be positive');
        assert(strlen($this->idempotencyKey) >= 16, 'Idempotency key must be at least 16 characters');
    }

    /**
     * @return array<string, mixed>
     */
    public function toGatewayPayload(): array
    {
        return [
            'amount' => $this->amountCents,
            'currency' => 'usd',
            'payment_method_types' => [$this->method->gatewayType()],
            'idempotency_key' => $this->idempotencyKey,
            'description' => $this->description,
            'metadata' => $this->metadata,
        ];
    }
}
```

**Key Points**:
- **Constructor invariants**: for always-enforced business rules (positive amount, valid currency)
- **Validator facade**: for complex rules (regex, uniqueness) in non-HTTP factory methods
- **Assertions**: for development-time safety checks — disabled in production via `zend.assertions=-1`
- Form Request validation covers HTTP input; DTO validation covers non-HTTP inputs (CSV, CLI, events)
- Batch validation collects all errors rather than failing on the first — essential for imports

---

### Pattern 315.4: Mapper Pattern (Entity to DTO)

**Category**: Data Mapping
**Description**: Dedicated mapper classes for bidirectional conversion between Eloquent models and DTOs — isolating persistence from application layer.

```php
<?php

declare(strict_types=1);

namespace App\Mappers;

use App\DTOs\OrderData;
use App\DTOs\OrderItemData;
use App\DTOs\OrderSummaryData;
use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;

final class OrderMapper
{
    /**
     * Map Eloquent Order model to full DTO (with nested items).
     */
    public function toData(Order $order): OrderData
    {
        $order->loadMissing(['items.product', 'user', 'payment']);

        return new OrderData(
            id: $order->id,
            userId: $order->user_id,
            userName: $order->user->name,
            status: $order->status,
            items: $order->items->map(
                fn ($item): OrderItemData => new OrderItemData(
                    productId: $item->product_id,
                    quantity: $item->quantity,
                    unitPrice: $item->unit_price,
                ),
            )->all(),
            subtotal: $order->subtotal,
            discountAmount: $order->discount_amount,
            taxAmount: $order->tax_amount,
            totalAmount: $order->total_amount,
            shippingAddress: $order->shipping_address,
            createdAt: $order->created_at->toIso8601String(),
            paidAt: $order->payment?->paid_at?->toIso8601String(),
        );
    }

    /**
     * Map to lightweight summary DTO (list views, search results).
     */
    public function toSummary(Order $order): OrderSummaryData
    {
        return new OrderSummaryData(
            id: $order->id,
            status: $order->status,
            totalAmount: $order->total_amount,
            itemCount: $order->items_count ?? $order->items()->count(),
            createdAt: $order->created_at->toIso8601String(),
        );
    }

    /**
     * Map collection to summary DTOs.
     *
     * @param Collection<int, Order> $orders
     * @return list<OrderSummaryData>
     */
    public function toSummaryList(Collection $orders): array
    {
        return $orders->map(
            fn (Order $order): OrderSummaryData => $this->toSummary($order),
        )->all();
    }

    /**
     * Map DTO back to Eloquent attributes for creation.
     *
     * @return array<string, mixed>
     */
    public function toEloquentAttributes(OrderData $data): array
    {
        return [
            'user_id' => $data->userId,
            'status' => $data->status,
            'subtotal' => $data->subtotal,
            'discount_amount' => $data->discountAmount,
            'tax_amount' => $data->taxAmount,
            'total_amount' => $data->totalAmount,
            'shipping_address' => $data->shippingAddress,
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\OrderStatus;

final readonly class OrderData
{
    /**
     * @param list<OrderItemData> $items
     */
    public function __construct(
        public int $id,
        public int $userId,
        public string $userName,
        public OrderStatus $status,
        public array $items,
        public int $subtotal,
        public int $discountAmount,
        public int $taxAmount,
        public int $totalAmount,
        public string $shippingAddress,
        public string $createdAt,
        public ?string $paidAt = null,
    ) {}
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\OrderStatus;

final readonly class OrderSummaryData
{
    public function __construct(
        public int $id,
        public OrderStatus $status,
        public int $totalAmount,
        public int $itemCount,
        public string $createdAt,
    ) {}
}
```

```php
// Service using the mapper
final class OrderQueryService
{
    public function __construct(
        private readonly OrderMapper $mapper,
    ) {}

    public function getById(int $id): OrderData
    {
        $order = Order::with(['items.product', 'user', 'payment'])->findOrFail($id);

        return $this->mapper->toData($order);
    }

    /**
     * @return list<OrderSummaryData>
     */
    public function listForUser(int $userId, int $perPage = 15): array
    {
        $orders = Order::query()
            ->where('user_id', $userId)
            ->withCount('items')
            ->latest()
            ->get();

        return $this->mapper->toSummaryList($orders);
    }
}
```

**Key Points**:
- Mapper is a dedicated class — not a static method on the model or DTO
- Use `loadMissing()` to eager-load only if not already loaded
- Provide multiple DTO shapes: full (`OrderData`) vs summary (`OrderSummaryData`)
- Mapper handles the snake_case → camelCase translation between Eloquent and DTOs
- `toEloquentAttributes()` enables reverse mapping for creation/update operations
- Inject mappers into services — they are testable, replaceable dependencies

---

### Pattern 315.5: Spatie Laravel Data Integration

**Category**: Package Integration
**Description**: Using `spatie/laravel-data` v4 for DTOs with built-in validation, casting, transformation, and request binding.

```php
<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ProductStatus;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\WithCast;
use Spatie\LaravelData\Casts\EnumCast;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

final class ProductData extends Data
{
    public function __construct(
        #[Required, Max(255)]
        public string $name,

        #[Required, Min(0)]
        public int $price,

        #[Max(5000)]
        public ?string $description,

        #[WithCast(EnumCast::class)]
        public ProductStatus $status,

        #[MapInputName('category_id')]
        public int $categoryId,

        /** @var list<string> */
        public array $tags = [],
    ) {}

    /**
     * Custom creation from Eloquent model.
     */
    public static function fromModel(\App\Models\Product $product): self
    {
        return new self(
            name: $product->name,
            price: $product->price,
            description: $product->description,
            status: $product->status,
            categoryId: $product->category_id,
            tags: $product->tags->pluck('name')->all(),
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

/**
 * Partial update DTO using Spatie Optional type.
 * Only provided fields are included in validation and serialization.
 */
final class UpdateProductData extends Data
{
    public function __construct(
        #[Max(255)]
        public string|Optional $name,

        #[Min(0)]
        public int|Optional $price,

        #[Max(5000)]
        public string|null|Optional $description,

        #[MapInputName('category_id')]
        public int|Optional $categoryId,

        /** @var list<string>|Optional */
        public array|Optional $tags,
    ) {}
}
```

```php
<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\OrderStatus;
use Carbon\CarbonImmutable;
use Spatie\LaravelData\Attributes\WithCast;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Casts\DateTimeInterfaceCast;
use Spatie\LaravelData\Casts\EnumCast;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Transformers\DateTimeInterfaceTransformer;

final class OrderData extends Data
{
    public function __construct(
        public int $id,
        public int $userId,

        #[WithCast(EnumCast::class)]
        public OrderStatus $status,

        public int $totalAmount,
        public int $itemCount,

        #[WithCast(DateTimeInterfaceCast::class, format: 'Y-m-d\TH:i:sP')]
        #[WithTransformer(DateTimeInterfaceTransformer::class, format: 'Y-m-d\TH:i:sP')]
        public CarbonImmutable $createdAt,

        /** @var list<OrderItemData> */
        public array $items = [],
    ) {}
}
```

```php
// Controller with Spatie Data — auto-validation and binding
final class ProductController extends Controller
{
    public function store(ProductData $data): JsonResponse
    {
        // $data is already validated by Spatie Data
        $product = Product::create([
            'name' => $data->name,
            'price' => $data->price,
            'description' => $data->description,
            'status' => $data->status,
            'category_id' => $data->categoryId,
        ]);

        return ProductData::fromModel($product)
            ->toResponse(request());
    }

    public function update(Product $product, UpdateProductData $data): JsonResponse
    {
        // Only provided fields are present
        $product->update($data->toArray());

        return ProductData::fromModel($product->refresh())
            ->toResponse(request());
    }
}
```

**Key Points**:
- Spatie Data extends `Data` base class — provides validation, casting, and transformation
- `#[Required]`, `#[Max]`, `#[Min]` — validation via PHP 8.3 attributes, not arrays
- `Optional` type for partial updates — missing fields are excluded from `toArray()`
- `#[MapInputName]` maps snake_case request keys to camelCase properties
- `#[WithCast]` and `#[WithTransformer]` handle serialization/deserialization
- Can be type-hinted in controller methods — auto-validated from request
- `fromModel()` factory for Eloquent-to-DTO conversion

---

### Pattern 315.6: DTO Collections

**Category**: Collection Handling
**Description**: Handling lists of DTOs — typed collections, paginated results, and batch transformation patterns.

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

use App\Enums\OrderStatus;

final readonly class OrderSummaryData
{
    public function __construct(
        public int $id,
        public OrderStatus $status,
        public int $totalAmount,
        public int $itemCount,
        public string $createdAt,
    ) {}
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTOs\Collections;

use App\DTOs\OrderSummaryData;

/**
 * Typed collection wrapper for OrderSummaryData DTOs.
 * Provides type safety and collection operations.
 *
 * @implements \IteratorAggregate<int, OrderSummaryData>
 */
final readonly class OrderSummaryCollection implements \IteratorAggregate, \Countable
{
    /** @var list<OrderSummaryData> */
    private array $items;

    /**
     * @param list<OrderSummaryData> $items
     */
    public function __construct(array $items)
    {
        // Ensure type safety at construction
        foreach ($items as $item) {
            if (!$item instanceof OrderSummaryData) {
                throw new \InvalidArgumentException(
                    'All items must be OrderSummaryData instances',
                );
            }
        }

        $this->items = $items;
    }

    /**
     * @return \ArrayIterator<int, OrderSummaryData>
     */
    public function getIterator(): \ArrayIterator
    {
        return new \ArrayIterator($this->items);
    }

    public function count(): int
    {
        return count($this->items);
    }

    public function isEmpty(): bool
    {
        return $this->count() === 0;
    }

    /**
     * @return list<OrderSummaryData>
     */
    public function all(): array
    {
        return $this->items;
    }

    public function totalAmount(): int
    {
        return array_sum(
            array_map(
                callback: fn (OrderSummaryData $item): int => $item->totalAmount,
                array: $this->items,
            ),
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function toArray(): array
    {
        return array_map(
            callback: fn (OrderSummaryData $item): array => [
                'id' => $item->id,
                'status' => $item->status->value,
                'total_amount' => $item->totalAmount,
                'item_count' => $item->itemCount,
                'created_at' => $item->createdAt,
            ],
            array: $this->items,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTOs;

/**
 * Generic paginated DTO wrapper — works with any DTO type.
 *
 * @template T
 */
final readonly class PaginatedData
{
    /**
     * @param list<T> $items
     */
    public function __construct(
        public array $items,
        public int $total,
        public int $perPage,
        public int $currentPage,
        public int $lastPage,
    ) {}

    /**
     * Create from Laravel's LengthAwarePaginator with a mapper function.
     *
     * @template TModel
     * @param \Illuminate\Contracts\Pagination\LengthAwarePaginator $paginator
     * @param callable(TModel): T $mapper
     * @return self<T>
     */
    public static function fromPaginator(
        \Illuminate\Contracts\Pagination\LengthAwarePaginator $paginator,
        callable $mapper,
    ): self {
        return new self(
            items: array_map($mapper, $paginator->items()),
            total: $paginator->total(),
            perPage: $paginator->perPage(),
            currentPage: $paginator->currentPage(),
            lastPage: $paginator->lastPage(),
        );
    }

    public function isEmpty(): bool
    {
        return empty($this->items);
    }

    public function hasMorePages(): bool
    {
        return $this->currentPage < $this->lastPage;
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(): array
    {
        return [
            'total' => $this->total,
            'per_page' => $this->perPage,
            'current_page' => $this->currentPage,
            'last_page' => $this->lastPage,
            'has_more' => $this->hasMorePages(),
        ];
    }
}
```

```php
// Usage in service
final class OrderQueryService
{
    public function __construct(
        private readonly OrderMapper $mapper,
    ) {}

    /**
     * @return PaginatedData<OrderSummaryData>
     */
    public function listForUser(int $userId, int $page = 1): PaginatedData
    {
        $paginator = Order::query()
            ->where('user_id', $userId)
            ->withCount('items')
            ->latest()
            ->paginate(perPage: 15, page: $page);

        return PaginatedData::fromPaginator(
            paginator: $paginator,
            mapper: fn (Order $order): OrderSummaryData => $this->mapper->toSummary($order),
        );
    }
}
```

```php
// Spatie Data collection approach
use Spatie\LaravelData\DataCollection;

final class ProductData extends \Spatie\LaravelData\Data
{
    public function __construct(
        public string $name,
        public int $price,
        public ?string $description,
    ) {}

    public static function fromModel(\App\Models\Product $product): self
    {
        return new self(
            name: $product->name,
            price: $product->price,
            description: $product->description,
        );
    }
}

// In controller — paginated Spatie Data collection
final class ProductController extends Controller
{
    public function index(): \Illuminate\Http\JsonResponse
    {
        $products = Product::query()
            ->with('category')
            ->latest()
            ->paginate(perPage: 15);

        return ProductData::collect($products, DataCollection::class)
            ->toResponse(request());
    }
}
```

**Key Points**:
- Typed collections enforce DTO consistency — no mixed types in lists
- `PaginatedData` wraps Laravel's paginator with DTO transformation
- Generic `@template T` enables IDE support for typed pagination
- `fromPaginator()` with mapper callable handles the model→DTO conversion
- Spatie Data provides `collect()` with built-in pagination support
- Custom collection classes (e.g., `OrderSummaryCollection`) for domain-specific aggregation (totalAmount)
- Keep collections immutable — readonly class with readonly array

---

## Best Practices

- **Readonly by default** — every DTO should be `final readonly class` unless mutation is explicitly required
- **Named constructors for context** — `fromRequest()`, `fromModel()`, `fromCsvRow()`, `fromArray()` make construction intent clear
- **Separate create and update DTOs** — create DTOs have required fields; update DTOs have nullable/Optional fields
- **DTO never touches the database** — no Eloquent queries, no `DB::` calls inside DTO classes
- **Validate at boundaries** — Form Request for HTTP, DTO factory for non-HTTP; constructor invariants for always-on rules
- **Map snake_case to camelCase** — Eloquent uses snake_case; DTOs use camelCase; mapper handles translation
- **Use enums in DTOs** — `OrderStatus $status` instead of `string $status` for type safety
- **Prefer composition over deep nesting** — `OrderData` with `list<OrderItemData>`, not deeply nested arrays
- **DTOs are disposable** — create freely, pass around, let garbage collect; no lifecycle management needed
- **Test DTOs directly** — verify construction, validation, `toArray()`, and factory methods

---

## Abnormal Case Patterns

1. **DTO with Eloquent dependency** — DTO constructor calls `Product::find($id)`. Fix: DTOs are passive data carriers; resolve models before constructing the DTO.

2. **Mutable DTO with public setters** — DTO properties set via `$dto->name = 'new'` after construction. Fix: use `readonly` class; create a new DTO instance for modified data.

3. **Raw arrays instead of DTOs** — services accept and return `array<string, mixed>`. Fix: define typed DTOs for every boundary; arrays lose type safety and IDE support.

4. **Validation only in Form Request** — same data from CLI or job bypasses validation. Fix: add validation in DTO factory method (`fromArray()`) or use Spatie Data for universal validation.

5. **God DTO with 30+ properties** — single DTO carrying every field for every use case. Fix: create purpose-specific DTOs — `CreateOrderData`, `OrderSummaryData`, `OrderDetailData`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (315.1–315.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel DTO & Mapper Specialist — Application | EPS v3.2*
