# Laravel Dependency Injection Specialist — Core
# Laravel依存性注入スペシャリスト — コア
# Chuyen Gia Tiem Phu Thuoc Laravel — Loi

**Version**: 1.0.0
**Technology**: Laravel 11+ Dependency Injection
**Aspect**: Dependency Injection
**Category**: core
**Purpose**: Knowledge provider for Laravel DI container — constructor injection, contextual binding, interface binding, tagged bindings, automatic resolution, and scoped instances

---

## Metadata

```json
{
  "id": "laravel-dependency-injection-specialist",
  "technology": "Laravel 11+ Dependency Injection",
  "aspect": "Dependency Injection",
  "category": "core",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel service container — automatic resolution, contextual binding",
    "E2: Interface-based DI — clean architecture port/adapter injection",
    "E3: Scoped/tagged bindings — advanced container features"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (DI is cross-cutting — injected in every layer) |
| **Variant** | ALL |
| **Pattern Numbers** | 302.1–302.8 |
| **Directory Pattern** | `app/` (cross-cutting DI patterns) |
| **Naming Convention** | N/A (DI is cross-cutting — applies to all classes) |
| **Imports From** | Domain (interfaces/contracts), Infrastructure (implementations) |
| **Imported By** | ALL (every layer receives injected dependencies) |
| **Cannot Import** | N/A (DI wiring is structural) |
| **Dependencies** | `illuminate/container`, `illuminate/contracts` |
| **When To Use** | Every Laravel project — core framework pattern |
| **Source Skeleton** | `app/{Layer}/{Feature}/*.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel DI container — binding strategies, resolution, scoping, testing overrides |
| **Activation Trigger** | files: `app/**/*.php`; keywords: bind, singleton, make, resolve, inject, container |

---

## Role

You are a **Laravel Dependency Injection Specialist**. Your responsibility is to provide DI best practices for Laravel 11+ projects — constructor injection, contextual binding, interface-to-concrete mapping, tagged bindings, method injection, and testing strategies.

**Used by**: Any code agent working with Laravel service container and dependency wiring
**Not used by**: Non-Laravel stacks, projects not using IoC container

---

## Patterns

### Pattern 302.1: Constructor Injection

**Category**: DI Fundamentals
**Description**: Default DI pattern — type-hint dependencies in constructor, container resolves automatically.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\OrderRepositoryInterface;
use App\Contracts\PaymentGatewayInterface;
use Illuminate\Log\LogManager;

final readonly class OrderService
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private PaymentGatewayInterface $paymentGateway,
        private LogManager $logger,
    ) {}

    public function placeOrder(PlaceOrderDto $dto): Order
    {
        $order = $this->orderRepository->create($dto);
        $this->paymentGateway->charge($order->total, $dto->paymentMethod);
        $this->logger->info('Order placed', ['order_id' => $order->id]);
        return $order;
    }
}
```

**Key Points**:
- Laravel auto-resolves concrete classes without explicit binding
- Use `readonly` class modifier (PHP 8.2+) for immutable services
- Keep constructor params ≤5 — more signals too many responsibilities
- Type-hint interfaces for swappable implementations

---

### Pattern 302.2: Contextual Binding

**Category**: DI Fundamentals
**Description**: Provide different implementations of the same interface based on consuming class.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\FileStorageInterface;
use App\Storage\LocalFileStorage;
use App\Storage\S3FileStorage;
use App\Services\AvatarService;
use App\Services\DocumentService;
use Illuminate\Support\ServiceProvider;

final class StorageServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // AvatarService gets local storage (fast, temporary)
        $this->app->when(AvatarService::class)
            ->needs(FileStorageInterface::class)
            ->give(LocalFileStorage::class);

        // DocumentService gets S3 storage (durable, distributed)
        $this->app->when(DocumentService::class)
            ->needs(FileStorageInterface::class)
            ->give(S3FileStorage::class);

        // Contextual primitive binding
        $this->app->when(AvatarService::class)
            ->needs('$maxFileSize')
            ->give(5 * 1024 * 1024); // 5MB

        $this->app->when(DocumentService::class)
            ->needs('$maxFileSize')
            ->give(50 * 1024 * 1024); // 50MB
    }
}
```

**Key Points**:
- Same interface, different concrete per consumer class
- Supports primitive values with `$variableName` syntax
- More explicit than conditional logic inside a single implementation
- Use when the same contract genuinely needs different behavior per context

---

### Pattern 302.3: Interface Binding (Port/Adapter)

**Category**: DI Fundamentals
**Description**: Bind interfaces to concrete implementations — clean architecture contract fulfillment.

```php
<?php

declare(strict_types=1);

// app/Contracts/OrderRepositoryInterface.php — Domain contract
namespace App\Contracts;

use App\Models\Order;
use Illuminate\Support\Collection;

interface OrderRepositoryInterface
{
    public function findById(int $id): ?Order;
    public function findByStatus(OrderStatus $status): Collection;
    public function save(Order $order): Order;
    public function delete(int $id): bool;
}

// app/Repositories/EloquentOrderRepository.php — Infrastructure impl
namespace App\Repositories;

use App\Contracts\OrderRepositoryInterface;
use App\Models\Order;

final class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function findById(int $id): ?Order
    {
        return Order::find($id);
    }

    public function findByStatus(OrderStatus $status): Collection
    {
        return Order::where('status', $status)->get();
    }

    public function save(Order $order): Order
    {
        $order->save();
        return $order->fresh();
    }

    public function delete(int $id): bool
    {
        return Order::destroy($id) > 0;
    }
}

// Provider registration
$this->app->bind(OrderRepositoryInterface::class, EloquentOrderRepository::class);
```

**Key Points**:
- Domain defines the interface (contract), infrastructure provides implementation
- Consumers depend on abstraction, never on concrete repository class
- `bind()` = new instance each resolution; `singleton()` = shared instance
- Place contracts in `app/Contracts/`, implementations in `app/Repositories/`

---

### Pattern 302.4: Tagged Bindings

**Category**: Advanced DI
**Description**: Group related bindings under a tag for batch resolution.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ValidationRuleInterface;
use App\Validation\Rules\AgeValidationRule;
use App\Validation\Rules\CreditScoreRule;
use App\Validation\Rules\IncomeVerificationRule;
use App\Services\LoanEligibilityService;
use Illuminate\Support\ServiceProvider;

final class ValidationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AgeValidationRule::class);
        $this->app->bind(CreditScoreRule::class);
        $this->app->bind(IncomeVerificationRule::class);

        $this->app->tag(
            abstracts: [
                AgeValidationRule::class,
                CreditScoreRule::class,
                IncomeVerificationRule::class,
            ],
            tags: ['loan.validation.rules'],
        );
    }
}

// Consumer — resolve all tagged bindings
final readonly class LoanEligibilityService
{
    /** @var array<ValidationRuleInterface> */
    private array $rules;

    public function __construct()
    {
        $this->rules = iterator_to_array(app()->tagged('loan.validation.rules'));
    }

    public function evaluate(LoanApplication $application): EligibilityResult
    {
        $violations = [];
        foreach ($this->rules as $rule) {
            if (!$rule->passes($application)) {
                $violations[] = $rule->message();
            }
        }
        return new EligibilityResult(eligible: empty($violations), violations: $violations);
    }
}
```

**Key Points**:
- `tag()` groups implementations under a string identifier
- `tagged()` returns an iterable of all tagged instances
- Useful for plugin systems, validation chains, notification channels
- Order of registration determines iteration order

---

### Pattern 302.5: Method Injection

**Category**: DI Fundamentals
**Description**: Inject dependencies into controller methods and route closures — resolved per-request.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Contracts\OrderRepositoryInterface;
use App\Http\Requests\CreateOrderRequest;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class OrderController
{
    // Constructor injection for shared dependencies
    public function __construct(
        private readonly OrderService $orderService,
    ) {}

    // Method injection — per-action dependencies
    public function store(
        CreateOrderRequest $request,
        OrderRepositoryInterface $repository,
    ): JsonResponse {
        $order = $this->orderService->placeOrder(
            dto: PlaceOrderDto::fromRequest($request),
        );

        return response()->json(
            data: OrderResource::make($order),
            status: 201,
        );
    }

    // Route model binding + method injection combined
    public function show(
        Order $order,
        OrderTransformer $transformer,
    ): JsonResponse {
        return response()->json($transformer->transform($order));
    }
}
```

**Key Points**:
- Controller methods support automatic DI via type-hints
- Route model binding integrates seamlessly with method injection
- FormRequest classes are resolved and validated before method executes
- Use method injection for action-specific dependencies not needed by other methods

---

### Pattern 302.6: Service Container Deep Dive

**Category**: Container Internals
**Description**: Advanced container operations — rebinding, extending, method calls.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\CacheInterface;
use Illuminate\Support\ServiceProvider;

final class ContainerAdvancedProvider extends ServiceProvider
{
    public function register(): void
    {
        // Extend existing binding — decorator pattern
        $this->app->extend(CacheInterface::class, function (CacheInterface $cache, $app) {
            return new LoggingCacheDecorator(
                inner: $cache,
                logger: $app->make(LoggerInterface::class),
            );
        });

        // Rebinding callback — react when a binding is re-registered
        $this->app->rebinding(CacheInterface::class, function ($app, $cache) {
            $app->make(CacheWarmer::class)->setCache($cache);
        });

        // Bind if not already bound — non-destructive registration
        $this->app->bindIf(
            abstract: CacheInterface::class,
            concrete: RedisCacheAdapter::class,
        );

        // Container method call with DI
        $this->app->call(
            callback: [SeedService::class, 'run'],
            parameters: ['environment' => 'staging'],
        );
    }
}
```

**Key Points**:
- `extend()` wraps existing binding — ideal for decorator pattern
- `rebinding()` fires when a binding is replaced — useful for cache/config refresh
- `bindIf()` / `singletonIf()` — only bind if abstract not already registered
- `call()` resolves method dependencies automatically, supports extra parameters

---

### Pattern 302.7: Automatic Resolution

**Category**: Container Internals
**Description**: Container auto-resolves concrete classes without explicit bindings via reflection.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Cache\Repository as CacheRepository;
use Illuminate\Log\LogManager;

// No binding needed — container resolves via reflection
final readonly class UserProfileService
{
    public function __construct(
        private CacheRepository $cache,
        private LogManager $logger,
    ) {}

    public function getProfile(int $userId): array
    {
        return $this->cache->remember(
            key: "user.profile.{$userId}",
            ttl: 3600,
            callback: fn () => User::with('profile', 'roles')->findOrFail($userId)->toArray(),
        );
    }
}

// Auto-resolution works because:
// 1. UserProfileService is a concrete class (not interface)
// 2. All constructor params are concrete classes or already-bound abstracts
// 3. Container uses PHP reflection to discover and resolve dependencies

// Make it anywhere without registration:
$service = app(UserProfileService::class);
```

**Key Points**:
- Concrete classes with concrete/bound dependencies resolve automatically
- No `bind()` or `singleton()` needed for simple services
- Reflection-based resolution has minimal performance cost (cached internally)
- Still prefer explicit bindings for interfaces and complex construction

---

### Pattern 302.8: Scoped Instances

**Category**: Advanced DI
**Description**: Scoped bindings — per-request singleton behavior within defined lifecycles.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\TenantContextInterface;
use App\Services\RequestTenantContext;
use Illuminate\Support\ServiceProvider;

final class TenantServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Scoped = singleton within a request/job lifecycle, flushed between
        $this->app->scoped(
            abstract: TenantContextInterface::class,
            concrete: fn ($app) => new RequestTenantContext(
                tenantId: request()?->header('X-Tenant-Id') ?? 'default',
            ),
        );
    }
}

// Usage — same instance throughout one request, fresh for next request
final readonly class TenantAwareService
{
    public function __construct(
        private TenantContextInterface $tenantContext,
    ) {}

    public function currentTenant(): string
    {
        return $this->tenantContext->getTenantId();
    }
}

// Scoped binding lifecycle:
// Request 1: resolve → new instance A → reuse A throughout request 1
// Request 2: resolve → new instance B → reuse B throughout request 2
// Queue job:  resolve → new instance C → reuse C within the job
```

```php
<?php

declare(strict_types=1);

// Scoped with Laravel Octane — critical for long-lived processes
namespace App\Providers;

use Illuminate\Support\ServiceProvider;

final class OctaneSafeProvider extends ServiceProvider
{
    public function register(): void
    {
        // Use scoped() instead of singleton() for Octane compatibility
        $this->app->scoped(RequestContext::class, fn ($app) => new RequestContext(
            ip: request()?->ip(),
            userAgent: request()?->userAgent(),
            startedAt: now(),
        ));
    }
}
```

**Key Points**:
- `scoped()` = singleton per request lifecycle, flushed between requests
- Critical for Laravel Octane — prevents state leaking between requests
- Perfect for request-scoped context (tenant, user identity, tracing)
- Queue workers: scoped bindings reset between each job
- Prefer `scoped()` over `singleton()` for any request-dependent state

---

## Best Practices

- **Type-hint interfaces, not concretes** — enables swapping implementations without changing consumers
- **Constructor injection over service locator** — prefer `__construct(Service $s)` over `app(Service::class)`
- **Keep constructors lean (≤5 params)** — more parameters signal the class does too much
- **Use `readonly` classes** — PHP 8.2+ `readonly` prevents accidental service mutation
- **Prefer `scoped()` for request state** — safer than `singleton()` in Octane/queue contexts
- **Explicit bindings for interfaces** — auto-resolution only works for concrete classes
- **One provider per domain** — group related bindings by bounded context
- **Test DI wiring** — verify interface-to-concrete resolution in provider tests
- **Use named arguments** — `bind(abstract: ..., concrete: ...)` improves readability
- **Document complex bindings** — contextual and tagged bindings need inline PHPDoc

---

## Abnormal Case Patterns

1. **Circular dependency** — ServiceA depends on ServiceB and vice versa. Fix: extract shared logic into a third service, or use lazy proxy via closure binding.

2. **Singleton state leaking in Octane** — singleton retains previous request state. Fix: use `scoped()` instead of `singleton()` for any request-dependent data.

3. **Auto-resolution of interface** — container throws "target is not instantiable" for interface type-hints. Fix: register explicit binding `bind(Interface::class, Concrete::class)`.

4. **Constructor called multiple times** — using `bind()` when `singleton()` is intended. Fix: use `singleton()` for stateful or expensive-to-create services.

5. **Missing primitive dependency** — constructor expects `string $apiKey` which container cannot resolve. Fix: use contextual binding `when(Service::class)->needs('$apiKey')->give(config('services.api.key'))`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (302.1–302.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Dependency Injection Specialist — Core | EPS v3.2*
