# Laravel Design Patterns Specialist — Language
# Laravelデザインパターンスペシャリスト — 言語
# Chuyen Gia Mau Thiet Ke Laravel — Ngon Ngu

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: Design Patterns
**Category**: language
**Purpose**: Knowledge provider for GOF design patterns applied in PHP/Laravel context — strategy, decorator, observer, builder, factory method, adapter, specification, and chain of responsibility

---

## Metadata

```json
{
  "id": "laravel-design-patterns-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Design Patterns",
  "category": "language",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: GOF Design Patterns — Gang of Four classic patterns adapted for modern PHP",
    "E2: Laravel framework internals — strategy (guards), observer (Eloquent events), decorator (middleware)",
    "E3: PHP 8.3 features — enums, readonly, match, first-class callables enhance pattern implementations"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 355.1–355.8 |
| **Directory Pattern** | `app/` (domain and application layers) |
| **Naming Convention** | `{Pattern}{Name}.php` (e.g., `DiscountStrategy.php`) |
| **Imports From** | Domain (interfaces), Application (use cases) |
| **Imported By** | ALL (patterns are cross-cutting design techniques) |
| **Cannot Import** | N/A |
| **Dependencies** | PHP 8.3+ |
| **When To Use** | When domain complexity requires structured object-oriented solutions |
| **Source Skeleton** | N/A |
| **Specialist Type** | code |
| **Purpose** | GOF patterns applied idiomatically in PHP 8.3 / Laravel 11 |
| **Activation Trigger** | keywords: strategy pattern, decorator, observer, builder, factory, adapter, specification, chain of responsibility |
| **Anti-Patterns** | Pattern overuse, premature abstraction, God classes |
| **Related Specialists** | laravel-php-fundamentals-specialist, laravel-service-provider-specialist |

---

## Role

You are a **Laravel Design Patterns Specialist**. Your responsibility is to provide best practices for applying GOF design patterns within PHP 8.3 / Laravel 11+ applications — using modern PHP features (enums, readonly classes, match expressions) to implement patterns idiomatically.

**Used by**: Any code agent designing domain logic, services, or application architecture
**Not used by**: Simple CRUD-only projects with no domain complexity

---

## Patterns

### Pattern 355.1: Strategy Pattern

**Category**: Behavioral
**Description**: Encapsulate interchangeable algorithms behind a common interface — select implementation at runtime.

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

interface ShippingCalculatorInterface
{
    public function calculate(int $weightGrams, string $destinationCountry): int;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Shipping;

use App\Contracts\ShippingCalculatorInterface;

final readonly class StandardShipping implements ShippingCalculatorInterface
{
    public function calculate(int $weightGrams, string $destinationCountry): int
    {
        $baseCents = match (true) {
            $destinationCountry === 'JP' => 800,
            in_array($destinationCountry, ['US', 'CA', 'GB'], true) => 1200,
            default => 2000,
        };

        return $baseCents + (int) ceil($weightGrams / 100) * 50;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ShippingCalculatorInterface;
use App\Enums\ShippingMethod;
use App\Shipping\ExpressShipping;
use App\Shipping\StandardShipping;

final class ShippingService
{
    public function getCalculator(ShippingMethod $method): ShippingCalculatorInterface
    {
        return match ($method) {
            ShippingMethod::Standard => new StandardShipping(),
            ShippingMethod::Express => new ExpressShipping(),
        };
    }
}
```

**Key Points**:
- Define strategy interface with a single method (single responsibility)
- Use enums + match expression for strategy selection — type-safe and exhaustive
- Register strategies in service provider for DI-based resolution
- Laravel guards, mail transports, and cache stores all use the strategy pattern

---

### Pattern 355.2: Decorator Pattern

**Category**: Structural
**Description**: Wrap objects to add behavior without modifying the original class — composable enhancements.

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

interface ProductRepositoryInterface
{
    /** @return array<int, \App\Models\Product> */
    public function findByCategory(string $category): array;
    public function findById(int $id): ?\App\Models\Product;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Repositories\Decorators;

use App\Contracts\ProductRepositoryInterface;
use App\Models\Product;
use Illuminate\Support\Facades\Cache;

final readonly class CachingProductRepository implements ProductRepositoryInterface
{
    public function __construct(
        private ProductRepositoryInterface $inner,
        private int $ttlSeconds = 3600,
    ) {}

    public function findByCategory(string $category): array
    {
        return Cache::remember(
            key: "products:category:{$category}",
            ttl: $this->ttlSeconds,
            callback: fn () => $this->inner->findByCategory($category),
        );
    }

    public function findById(int $id): ?Product
    {
        return Cache::remember(
            key: "products:id:{$id}",
            ttl: $this->ttlSeconds,
            callback: fn () => $this->inner->findById($id),
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Repositories\Decorators;

use App\Contracts\ProductRepositoryInterface;
use App\Models\Product;
use Illuminate\Support\Facades\Log;

final readonly class LoggingProductRepository implements ProductRepositoryInterface
{
    public function __construct(
        private ProductRepositoryInterface $inner,
    ) {}

    public function findByCategory(string $category): array
    {
        Log::debug('ProductRepository::findByCategory', ['category' => $category]);
        return $this->inner->findByCategory($category);
    }

    public function findById(int $id): ?Product
    {
        Log::debug('ProductRepository::findById', ['id' => $id]);
        return $this->inner->findById($id);
    }
}

// Service provider wiring — decorators compose
// $this->app->singleton(ProductRepositoryInterface::class, function ($app) {
//     $base = new EloquentProductRepository();
//     $cached = new CachingProductRepository($base);
//     return new LoggingProductRepository($cached);
// });
```

**Key Points**:
- Decorator implements the same interface as the wrapped object
- Use `readonly` constructors with `private` inner dependency
- Stack decorators in service providers — order matters (logging wraps caching wraps base)
- Laravel middleware is fundamentally the decorator pattern applied to HTTP

---

### Pattern 355.3: Observer Pattern

**Category**: Behavioral
**Description**: Decouple event producers from consumers — Laravel's Eloquent observers and event system.

```php
<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Order;
use App\Services\InventoryService;
use App\Services\NotificationService;
use App\Services\AuditLogService;

final readonly class OrderObserver
{
    public function __construct(
        private InventoryService $inventory,
        private NotificationService $notifications,
        private AuditLogService $audit,
    ) {}

    public function created(Order $order): void
    {
        $this->inventory->reserveStock(orderItems: $order->items);
        $this->notifications->sendOrderConfirmation(order: $order);
        $this->audit->log(
            entity: 'order',
            action: 'created',
            entityId: $order->id,
        );
    }

    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            $this->notifications->sendStatusUpdate(order: $order);
            $this->audit->log(
                entity: 'order',
                action: 'status_changed',
                entityId: $order->id,
                metadata: [
                    'from' => $order->getOriginal('status'),
                    'to' => $order->status,
                ],
            );
        }
    }

    public function deleted(Order $order): void
    {
        $this->inventory->releaseStock(orderItems: $order->items);
    }
}
```

**Key Points**:
- Observers react to Eloquent lifecycle events (creating, created, updated, deleted)
- Use `wasChanged()` to detect specific attribute changes — avoid unnecessary processing
- Register observers in `boot()` of a service provider: `Order::observe(OrderObserver::class)`
- For cross-model events, prefer Laravel Events/Listeners over Eloquent observers
- Observers receive DI via constructor — inject services, not facades

---

### Pattern 355.4: Builder Pattern

**Category**: Creational
**Description**: Construct complex objects step by step with a fluent interface — common for query construction, report generation, and configuration.

```php
<?php

declare(strict_types=1);

namespace App\Builders;

use App\DTOs\SearchCriteria;
use App\Enums\SortDirection;

final class SearchCriteriaBuilder
{
    private string $query = '';
    /** @var array<string, mixed> */
    private array $filters = [];
    private string $sortBy = 'relevance';
    private SortDirection $sortDirection = SortDirection::Desc;
    private int $perPage = 20;
    private int $page = 1;
    /** @var array<int, string> */
    private array $includeRelations = [];

    public static function create(): self
    {
        return new self();
    }

    public function query(string $query): self
    {
        $this->query = $query;
        return $this;
    }

    public function filterBy(string $field, mixed $value): self
    {
        $this->filters[$field] = $value;
        return $this;
    }

    public function sortBy(string $field, SortDirection $direction = SortDirection::Asc): self
    {
        $this->sortBy = $field;
        $this->sortDirection = $direction;
        return $this;
    }

    public function paginate(int $perPage, int $page = 1): self
    {
        $this->perPage = $perPage;
        $this->page = $page;
        return $this;
    }

    /** @param array<int, string> $relations */
    public function include(array $relations): self
    {
        $this->includeRelations = $relations;
        return $this;
    }

    public function build(): SearchCriteria
    {
        return new SearchCriteria(
            query: $this->query,
            filters: $this->filters,
            sortBy: $this->sortBy,
            sortDirection: $this->sortDirection,
            perPage: $this->perPage,
            page: $this->page,
            includeRelations: $this->includeRelations,
        );
    }
}
```

**Key Points**:
- Fluent interface with method chaining — each setter returns `$this`
- `build()` produces an immutable result (readonly DTO)
- Static `create()` factory for cleaner instantiation
- Laravel's query builder, notification builder, and mail builder all follow this pattern
- Validate constraints in `build()` — fail fast on invalid combinations

---

### Pattern 355.5: Factory Method

**Category**: Creational
**Description**: Defer object creation to subclasses or factory methods — dynamic instantiation based on type.

```php
<?php

declare(strict_types=1);

namespace App\Factories;

use App\Contracts\ExportDriverInterface;
use App\Enums\ExportFormat;
use App\Exports\CsvExportDriver;
use App\Exports\PdfExportDriver;
use App\Exports\XlsxExportDriver;

final class ExportDriverFactory
{
    /**
     * @param array<string, mixed> $config
     */
    public function create(ExportFormat $format, array $config = []): ExportDriverInterface
    {
        return match ($format) {
            ExportFormat::Csv => new CsvExportDriver(
                delimiter: $config['delimiter'] ?? ',',
                enclosure: $config['enclosure'] ?? '"',
            ),
            ExportFormat::Pdf => new PdfExportDriver(
                pageSize: $config['page_size'] ?? 'A4',
                orientation: $config['orientation'] ?? 'portrait',
            ),
            ExportFormat::Xlsx => new XlsxExportDriver(
                sheetName: $config['sheet_name'] ?? 'Sheet1',
            ),
        };
    }
}
```

**Key Points**:
- Factory method encapsulates construction logic — clients don't know concrete classes
- Use enums + match for type-safe factory selection (exhaustive at compile time)
- Register factory in service container — inject where needed, test with mocks
- Laravel uses factories extensively: `Model::factory()`, `Notification::route()`
- Pass configuration arrays for flexible construction without parameter explosion

---

### Pattern 355.6: Adapter Pattern

**Category**: Structural
**Description**: Convert the interface of a class into another interface clients expect — integrate third-party libraries.

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

interface GeocodingServiceInterface
{
    /**
     * @return array{lat: float, lng: float}|null
     */
    public function geocode(string $address): ?array;

    /**
     * @return array{address: string, city: string, country: string}|null
     */
    public function reverseGeocode(float $lat, float $lng): ?array;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Adapters;

use App\Contracts\GeocodingServiceInterface;
use Illuminate\Support\Facades\Http;

final readonly class GoogleMapsAdapter implements GeocodingServiceInterface
{
    public function __construct(
        private string $apiKey,
        private string $baseUrl = 'https://maps.googleapis.com/maps/api/geocode',
    ) {}

    public function geocode(string $address): ?array
    {
        $response = Http::get("{$this->baseUrl}/json", [
            'address' => $address,
            'key' => $this->apiKey,
        ]);

        if ($response->failed()) {
            return null;
        }

        $result = $response->json('results.0.geometry.location');

        return $result ? ['lat' => $result['lat'], 'lng' => $result['lng']] : null;
    }

    public function reverseGeocode(float $lat, float $lng): ?array
    {
        $response = Http::get("{$this->baseUrl}/json", [
            'latlng' => "{$lat},{$lng}",
            'key' => $this->apiKey,
        ]);

        if ($response->failed()) {
            return null;
        }

        $components = $response->json('results.0.address_components', []);

        return [
            'address' => $response->json('results.0.formatted_address', ''),
            'city' => $this->extractComponent($components, 'locality'),
            'country' => $this->extractComponent($components, 'country'),
        ];
    }

    private function extractComponent(array $components, string $type): string
    {
        foreach ($components as $component) {
            if (in_array($type, $component['types'], true)) {
                return $component['long_name'];
            }
        }
        return '';
    }
}
```

**Key Points**:
- Adapter wraps third-party SDK behind your own interface — isolates vendor dependency
- Swap adapters (Google Maps, Mapbox, OpenStreetMap) via service provider configuration
- Laravel's filesystem adapters (S3, local, FTP) are adapter pattern implementations
- Keep the adapter's interface domain-specific, not mirroring the vendor API
- Test adapters with HTTP fakes: `Http::fake()`

---

### Pattern 355.7: Specification Pattern

**Category**: Behavioral
**Description**: Encapsulate business rules as composable, reusable specification objects.

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

interface SpecificationInterface
{
    public function isSatisfiedBy(mixed $candidate): bool;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Specifications;

use App\Contracts\SpecificationInterface;
use App\Models\User;

final readonly class EligibleForPremiumSpecification implements SpecificationInterface
{
    public function __construct(
        private int $minimumOrderCount = 10,
        private int $minimumSpendCents = 50_000,
        private int $accountAgeDays = 90,
    ) {}

    public function isSatisfiedBy(mixed $candidate): bool
    {
        assert($candidate instanceof User);

        return $candidate->orders_count >= $this->minimumOrderCount
            && $candidate->total_spent_cents >= $this->minimumSpendCents
            && $candidate->created_at->diffInDays(now()) >= $this->accountAgeDays;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Specifications;

use App\Contracts\SpecificationInterface;

final readonly class AndSpecification implements SpecificationInterface
{
    /** @param array<int, SpecificationInterface> $specs */
    public function __construct(
        private array $specs,
    ) {}

    public function isSatisfiedBy(mixed $candidate): bool
    {
        foreach ($this->specs as $spec) {
            if (!$spec->isSatisfiedBy($candidate)) {
                return false;
            }
        }
        return true;
    }
}
```

**Key Points**:
- Specifications encapsulate a single business rule — composable via AND/OR/NOT
- Ideal for eligibility checks, filtering criteria, and validation rules
- Compose complex rules from atomic specifications without modifying existing code
- Works well with Eloquent scopes for database-level filtering
- Test each specification in isolation — clear, focused unit tests

---

### Pattern 355.8: Chain of Responsibility

**Category**: Behavioral
**Description**: Pass requests along a chain of handlers — each handler decides to process or forward.

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

interface ApprovalHandlerInterface
{
    public function setNext(self $handler): self;
    public function handle(ApprovalRequest $request): ApprovalResult;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Approval;

use App\Contracts\ApprovalHandlerInterface;
use App\DTOs\ApprovalRequest;
use App\DTOs\ApprovalResult;
use App\Enums\ApprovalStatus;

abstract class AbstractApprovalHandler implements ApprovalHandlerInterface
{
    private ?ApprovalHandlerInterface $next = null;

    public function setNext(ApprovalHandlerInterface $handler): ApprovalHandlerInterface
    {
        $this->next = $handler;
        return $handler;
    }

    protected function passToNext(ApprovalRequest $request): ApprovalResult
    {
        if ($this->next !== null) {
            return $this->next->handle($request);
        }

        return new ApprovalResult(
            status: ApprovalStatus::Rejected,
            reason: 'No handler approved the request',
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Approval\Handlers;

use App\Approval\AbstractApprovalHandler;
use App\DTOs\ApprovalRequest;
use App\DTOs\ApprovalResult;
use App\Enums\ApprovalStatus;

final class ManagerApprovalHandler extends AbstractApprovalHandler
{
    private const int MANAGER_LIMIT_CENTS = 500_000;

    public function handle(ApprovalRequest $request): ApprovalResult
    {
        if ($request->amountCents <= self::MANAGER_LIMIT_CENTS) {
            return new ApprovalResult(
                status: ApprovalStatus::Approved,
                approvedBy: 'manager',
                reason: "Within manager limit",
            );
        }

        return $this->passToNext($request);
    }
}

// Usage: build chain in service provider or factory
// $manager = new ManagerApprovalHandler();
// $director = new DirectorApprovalHandler();
// $cfo = new CfoApprovalHandler();
// $manager->setNext($director)->setNext($cfo);
// $result = $manager->handle($request);
```

**Key Points**:
- Each handler has a single approval threshold — clean single responsibility
- Chain order defines escalation path — build in service provider
- Laravel middleware pipeline is a chain of responsibility implementation
- Terminal handler (end of chain) should return a default result, not throw
- Use readonly DTOs for request/result objects passed along the chain

---

## Best Practices

- **Don't force patterns** — apply only when complexity warrants structured solutions
- **Use modern PHP features** — enums, match, readonly classes make patterns more concise
- **Interface-first design** — define contracts before implementations
- **Wire patterns in service providers** — keep construction logic out of business code
- **Compose over inherit** — prefer decorator stacking over deep inheritance hierarchies
- **Test patterns in isolation** — each strategy, specification, or handler gets its own test
- **Name classes by role** — `CachingProductRepository`, not `ProductRepositoryV2`
- **Document pattern intent** — explain why the pattern was chosen, not just how it works

---

## Abnormal Case Patterns

1. **Strategy explosion** — too many strategies for a single interface. Fix: consider if strategies share logic, extract common behavior to a base class or separate interface.

2. **Decorator ordering bugs** — caching decorator inside logging decorator means cache hits are not logged. Fix: document decorator composition order, test the full stack.

3. **Observer side-effect loops** — observer updates a model, triggering the same observer again. Fix: use `Model::withoutEvents()` or guard with `$model->isDirty()` checks.

4. **Builder incomplete state** — `build()` called without required fields set. Fix: validate in `build()`, throw `InvalidArgumentException` with specific missing fields.

5. **Chain of responsibility infinite loop** — handler accidentally passes to itself. Fix: use abstract base class that enforces `$next` is a different instance.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (355.1–355.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Design Patterns Specialist — Language | EPS v3.2*
