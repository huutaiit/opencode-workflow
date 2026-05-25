# Laravel Architecture Master Specialist — Architecture
# Laravelアーキテクチャマスタースペシャリスト — アーキテクチャ
# Chuyen Gia Kien Truc Tong The Laravel — Kien Truc

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x
**Aspect**: Project Architecture Definition
**Category**: architecture
**Purpose**: Master specialist defining the entire project structure — standard and clean architecture folder trees, file-to-directory mappings, dependency rules, module organization, and feature completeness verification

---

## Metadata

```json
{
  "id": "laravel-architecture-master-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "Project Architecture Definition",
  "category": "architecture",
  "subcategory": "php-laravel",
  "lines": 650,
  "token_cost": 4200,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 default project structure — official skeleton (laravel/laravel)",
    "E2: Clean Architecture (Robert C. Martin) adapted for Laravel — domain isolation",
    "E3: Laravel modular conventions — spatie/laravel-modules, nwidart/laravel-modules",
    "E4: PHP 8.3 language features — typed properties, enums, readonly classes",
    "E5: Dependency Inversion Principle — port/adapter boundaries in PHP",
    "E6: Feature completeness patterns — vertical slice architecture checklists"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (architecture definition — THIS IS THE MASTER SPECIALIST) |
| **Variant** | ALL |
| **Pattern Numbers** | 0.1–0.6 |
| **Directory Pattern** | Project root |
| **Naming Convention** | N/A (defines naming for all other specialists) |
| **Imports From** | N/A (top-level definition) |
| **Imported By** | ALL specialists reference this for structural decisions |
| **Cannot Import** | N/A |
| **Dependencies** | `laravel/framework:^11.0`, `php:^8.3` |
| **When To Use** | Project initialization, architecture review, onboarding, structural refactoring |
| **Source Skeleton** | Project root `/` |
| **Specialist Type** | code |
| **Purpose** | Define the canonical project structure — every file, folder, and dependency rule |
| **Activation Trigger** | keywords: architecture, folder structure, project layout, clean architecture, module organization; context: new project setup, structural review |

---

## Role

You are the **Laravel Architecture Master Specialist**. Your responsibility is to define the entire project structure for PHP 8.3 + Laravel 11.x applications — from standard folder trees to clean architecture layouts, file-to-directory mappings, inter-layer dependency rules, module organization, and feature completeness checklists.

**Used by**: All code agents, all other specialists, project leads defining architecture
**Not used by**: Non-Laravel stacks, non-PHP projects

---

## Patterns

### Pattern 0.1: Standard Laravel Folder Tree

**Category**: Project Structure — Standard
**Description**: The default Laravel 11 folder structure with all standard directories and their purposes.

```
project-root/
├── app/
│   ├── Console/                    # Artisan commands
│   │   └── Commands/               # Custom command classes
│   ├── Exceptions/                 # Custom exception classes
│   ├── Http/
│   │   ├── Controllers/            # Request handlers
│   │   │   └── Api/                # API-specific controllers
│   │   ├── Middleware/             # HTTP middleware
│   │   ├── Requests/              # Form request validation
│   │   └── Resources/             # API resource transformers
│   ├── Models/                     # Eloquent models
│   ├── Providers/                  # Service providers
│   ├── Services/                   # Business logic services
│   ├── Repositories/               # Data access layer (optional)
│   ├── Events/                     # Event classes
│   ├── Listeners/                  # Event listeners
│   ├── Jobs/                       # Queued jobs
│   ├── Mail/                       # Mailable classes
│   ├── Notifications/              # Notification classes
│   ├── Policies/                   # Authorization policies
│   ├── Rules/                      # Custom validation rules
│   ├── Observers/                  # Model observers
│   ├── Casts/                      # Custom Eloquent casts
│   ├── Enums/                      # PHP 8.1+ enums
│   └── DTOs/                       # Data Transfer Objects
├── bootstrap/
│   ├── app.php                     # Application bootstrap (Laravel 11)
│   ├── providers.php               # Provider registration (Laravel 11)
│   └── cache/                      # Framework cache
├── config/                         # Configuration files
├── database/
│   ├── factories/                  # Model factories
│   ├── migrations/                 # Database migrations
│   └── seeders/                    # Database seeders
├── public/                         # Web server document root
├── resources/
│   ├── views/                      # Blade templates
│   ├── css/                        # Stylesheets
│   └── js/                         # JavaScript
├── routes/
│   ├── web.php                     # Web routes
│   ├── api.php                     # API routes
│   └── console.php                 # Console routes
├── storage/                        # Logs, cache, compiled
├── tests/
│   ├── Unit/                       # Unit tests
│   ├── Feature/                    # Feature/integration tests
│   └── TestCase.php                # Base test class
├── .env                            # Environment variables
├── artisan                         # CLI entry point
├── composer.json                   # PHP dependencies
└── phpunit.xml                     # Test configuration
```

**Key Points**:
- Laravel 11 removes `app/Http/Kernel.php` — middleware configured in `bootstrap/app.php`
- `bootstrap/providers.php` replaces `config/app.php` providers array
- `app/Services/` and `app/Repositories/` are conventions, not framework defaults
- `app/DTOs/` and `app/Enums/` leverage PHP 8.3 readonly classes and backed enums

```php
<?php
// bootstrap/app.php — Laravel 11 entry point
declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Middleware configuration
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Exception handling
    })
    ->create();
```

```php
<?php
// bootstrap/providers.php — Laravel 11 provider registration
declare(strict_types=1);

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\AuthServiceProvider::class,
    // Domain-specific providers
    App\Providers\OrderServiceProvider::class,
    App\Providers\PaymentServiceProvider::class,
];
```

---

### Pattern 0.2: Clean Architecture Folder Tree

**Category**: Project Structure — Clean Architecture
**Description**: Clean architecture folder organization adapted for Laravel 11 — separating Domain, Application, Infrastructure, and Presentation layers.

```
project-root/
├── app/
│   ├── Domain/                         # Layer 1: Pure business logic (no framework deps)
│   │   ├── Order/
│   │   │   ├── Entities/               # Domain entities (plain PHP classes)
│   │   │   │   ├── Order.php
│   │   │   │   └── OrderItem.php
│   │   │   ├── ValueObjects/           # Immutable value objects
│   │   │   │   ├── OrderId.php
│   │   │   │   ├── Money.php
│   │   │   │   └── OrderStatus.php
│   │   │   ├── Enums/                  # Domain enums
│   │   │   │   └── PaymentMethod.php
│   │   │   ├── Exceptions/             # Domain-specific exceptions
│   │   │   │   ├── InsufficientStockException.php
│   │   │   │   └── InvalidOrderStateException.php
│   │   │   ├── Events/                 # Domain events (plain PHP)
│   │   │   │   └── OrderPlaced.php
│   │   │   ├── Ports/                  # Interfaces (contracts)
│   │   │   │   ├── OrderRepositoryInterface.php
│   │   │   │   └── PaymentGatewayInterface.php
│   │   │   └── Specifications/         # Business rule specifications
│   │   │       └── OrderCanBeCancelledSpec.php
│   │   ├── User/
│   │   │   ├── Entities/
│   │   │   ├── ValueObjects/
│   │   │   └── Ports/
│   │   └── Shared/                     # Cross-domain shared kernel
│   │       ├── ValueObjects/
│   │       │   └── Email.php
│   │       └── Contracts/
│   │           └── AggregateRootInterface.php
│   │
│   ├── Application/                    # Layer 2: Use cases (orchestration)
│   │   ├── Order/
│   │   │   ├── Commands/               # Write operations (command objects)
│   │   │   │   ├── CreateOrderCommand.php
│   │   │   │   └── CancelOrderCommand.php
│   │   │   ├── Queries/                # Read operations (query objects)
│   │   │   │   ├── GetOrderQuery.php
│   │   │   │   └── ListOrdersQuery.php
│   │   │   ├── Handlers/              # Command/Query handlers (use cases)
│   │   │   │   ├── CreateOrderHandler.php
│   │   │   │   ├── CancelOrderHandler.php
│   │   │   │   ├── GetOrderHandler.php
│   │   │   │   └── ListOrdersHandler.php
│   │   │   ├── DTOs/                   # Application-level DTOs
│   │   │   │   ├── OrderDto.php
│   │   │   │   └── CreateOrderDto.php
│   │   │   └── Validators/            # Application-level validation
│   │   │       └── CreateOrderValidator.php
│   │   └── Shared/
│   │       ├── Bus/                    # Command/Query bus interfaces
│   │       │   ├── CommandBusInterface.php
│   │       │   └── QueryBusInterface.php
│   │       └── Contracts/
│   │           └── UseCaseInterface.php
│   │
│   ├── Infrastructure/                 # Layer 3: Framework + external adapters
│   │   ├── Persistence/
│   │   │   ├── Eloquent/              # Eloquent implementations
│   │   │   │   ├── Models/            # Eloquent models (infrastructure, NOT domain)
│   │   │   │   │   ├── OrderModel.php
│   │   │   │   │   └── UserModel.php
│   │   │   │   ├── Repositories/      # Repository implementations
│   │   │   │   │   └── EloquentOrderRepository.php
│   │   │   │   └── Mappers/           # Domain ↔ Eloquent mappers
│   │   │   │       └── OrderMapper.php
│   │   │   ├── Migrations/            # Can symlink from database/migrations
│   │   │   └── Seeders/
│   │   ├── External/                   # External service adapters
│   │   │   ├── Payment/
│   │   │   │   └── StripePaymentGateway.php
│   │   │   └── Notification/
│   │   │       └── TwilioSmsGateway.php
│   │   ├── Bus/                        # Bus implementations
│   │   │   ├── LaravelCommandBus.php
│   │   │   └── LaravelQueryBus.php
│   │   └── Providers/                  # Infrastructure service providers
│   │       └── InfrastructureServiceProvider.php
│   │
│   └── Presentation/                   # Layer 4: HTTP, CLI, WebSocket
│       ├── Http/
│       │   ├── Controllers/
│       │   │   └── Api/
│       │   │       └── OrderController.php
│       │   ├── Middleware/
│       │   ├── Requests/               # Form requests
│       │   │   └── CreateOrderRequest.php
│       │   └── Resources/             # API resources
│       │       └── OrderResource.php
│       ├── Console/
│       │   └── Commands/
│       └── Providers/
│           └── PresentationServiceProvider.php
│
├── bootstrap/
├── config/
├── database/                           # Standard Laravel (migrations can live here)
├── routes/
├── resources/
├── storage/
└── tests/
    ├── Unit/
    │   ├── Domain/                     # Domain entity tests (no framework)
    │   └── Application/               # Use case tests (mocked ports)
    ├── Integration/
    │   └── Infrastructure/            # Repository, gateway integration tests
    └── Feature/
        └── Presentation/             # HTTP endpoint tests
```

**Key Points**:
- Domain layer has ZERO Laravel dependencies — pure PHP 8.3 classes
- Eloquent models live in Infrastructure, not Domain — they are persistence detail
- Domain entities and Eloquent models are separate classes connected via Mappers
- Each bounded context (Order, User) has its own subfolder in every layer
- Shared kernel in `Domain/Shared/` for cross-domain value objects

```php
<?php
// Domain Entity — ZERO framework dependencies
declare(strict_types=1);

namespace App\Domain\Order\Entities;

use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\Exceptions\InvalidOrderStateException;

final class Order
{
    /** @var array<int, OrderItem> */
    private array $items = [];

    public function __construct(
        public readonly OrderId $id,
        private OrderStatus $status,
        private Money $total,
        private readonly \DateTimeImmutable $createdAt,
    ) {}

    public function cancel(): void
    {
        if ($this->status !== OrderStatus::Pending) {
            throw new InvalidOrderStateException(
                "Cannot cancel order in {$this->status->value} state",
            );
        }
        $this->status = OrderStatus::Cancelled;
    }

    public function status(): OrderStatus
    {
        return $this->status;
    }

    public function total(): Money
    {
        return $this->total;
    }
}
```

```php
<?php
// Infrastructure — Eloquent Model (persistence detail)
declare(strict_types=1);

namespace App\Infrastructure\Persistence\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class OrderModel extends Model
{
    use HasUuids;

    protected $table = 'orders';

    protected $fillable = [
        'status',
        'total_amount',
        'total_currency',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'integer',
            'created_at' => 'immutable_datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItemModel::class, 'order_id');
    }
}
```

---

### Pattern 0.3: File Type to Directory Mappings

**Category**: Structural Convention
**Description**: Canonical mapping of every file type to its directory location in both standard and clean architecture layouts.

| File Type | Standard Layout | Clean Architecture Layout |
|-----------|----------------|--------------------------|
| Controller | `app/Http/Controllers/` | `app/Presentation/Http/Controllers/` |
| Form Request | `app/Http/Requests/` | `app/Presentation/Http/Requests/` |
| API Resource | `app/Http/Resources/` | `app/Presentation/Http/Resources/` |
| Middleware | `app/Http/Middleware/` | `app/Presentation/Http/Middleware/` |
| Eloquent Model | `app/Models/` | `app/Infrastructure/Persistence/Eloquent/Models/` |
| Domain Entity | N/A | `app/Domain/{Context}/Entities/` |
| Value Object | N/A | `app/Domain/{Context}/ValueObjects/` |
| Repository Interface | `app/Contracts/` | `app/Domain/{Context}/Ports/` |
| Repository Impl | `app/Repositories/` | `app/Infrastructure/Persistence/Eloquent/Repositories/` |
| Service | `app/Services/` | `app/Application/{Context}/Handlers/` |
| Command/Query | N/A | `app/Application/{Context}/Commands/` or `Queries/` |
| DTO | `app/DTOs/` | `app/Application/{Context}/DTOs/` |
| Event | `app/Events/` | `app/Domain/{Context}/Events/` (domain) or `app/Infrastructure/Events/` (framework) |
| Listener | `app/Listeners/` | `app/Infrastructure/Listeners/` |
| Job | `app/Jobs/` | `app/Infrastructure/Jobs/` |
| Mail | `app/Mail/` | `app/Infrastructure/Mail/` |
| Notification | `app/Notifications/` | `app/Infrastructure/Notifications/` |
| Policy | `app/Policies/` | `app/Presentation/Policies/` |
| Observer | `app/Observers/` | `app/Infrastructure/Persistence/Observers/` |
| Custom Cast | `app/Casts/` | `app/Infrastructure/Persistence/Casts/` |
| Enum | `app/Enums/` | `app/Domain/{Context}/Enums/` |
| Rule | `app/Rules/` | `app/Presentation/Rules/` |
| Exception | `app/Exceptions/` | `app/Domain/{Context}/Exceptions/` (domain) or `app/Presentation/Exceptions/` (HTTP) |
| Service Provider | `app/Providers/` | `app/Infrastructure/Providers/` + `app/Presentation/Providers/` |
| Artisan Command | `app/Console/Commands/` | `app/Presentation/Console/Commands/` |
| Migration | `database/migrations/` | `database/migrations/` (framework convention) |
| Factory | `database/factories/` | `database/factories/` (framework convention) |
| Seeder | `database/seeders/` | `database/seeders/` (framework convention) |
| Unit Test | `tests/Unit/` | `tests/Unit/Domain/`, `tests/Unit/Application/` |
| Feature Test | `tests/Feature/` | `tests/Feature/Presentation/` |
| Integration Test | `tests/Feature/` | `tests/Integration/Infrastructure/` |
| Config | `config/` | `config/` |
| Route | `routes/` | `routes/` |
| View | `resources/views/` | `resources/views/` |

**Key Points**:
- `{Context}` = bounded context name (Order, User, Product, etc.)
- Standard layout is suitable for small-to-medium projects (< 30 models)
- Clean architecture layout is required for large projects (30+ models, 5+ developers)
- Database-related files (migrations, factories, seeders) keep Laravel conventions in both layouts

```php
<?php
// Artisan command to verify file placement
declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

final class VerifyArchitectureCommand extends Command
{
    protected $signature = 'arch:verify {--layout=standard : standard|clean}';
    protected $description = 'Verify files are placed in correct directories per architecture layout';

    private const STANDARD_MAPPINGS = [
        'Controller' => 'app/Http/Controllers',
        'Request' => 'app/Http/Requests',
        'Resource' => 'app/Http/Resources',
        'Model' => 'app/Models',
        'Service' => 'app/Services',
        'Repository' => 'app/Repositories',
        'Event' => 'app/Events',
        'Listener' => 'app/Listeners',
        'Job' => 'app/Jobs',
        'Policy' => 'app/Policies',
    ];

    public function handle(): int
    {
        $layout = $this->option('layout');
        $violations = [];

        foreach (self::STANDARD_MAPPINGS as $type => $expectedDir) {
            $files = File::glob(base_path("app/**/*{$type}.php"));
            foreach ($files as $file) {
                $relativePath = str_replace(base_path() . '/', '', $file);
                if (!str_starts_with($relativePath, $expectedDir)) {
                    $violations[] = "{$relativePath} — expected in {$expectedDir}/";
                }
            }
        }

        if (empty($violations)) {
            $this->info('Architecture verification passed.');
            return self::SUCCESS;
        }

        $this->error('Architecture violations found:');
        foreach ($violations as $violation) {
            $this->line("  ✗ {$violation}");
        }

        return self::FAILURE;
    }
}
```

---

### Pattern 0.4: Dependency Rules

**Category**: Architectural Constraints
**Description**: Inter-layer dependency rules enforcing the Dependency Inversion Principle. These rules are non-negotiable for clean architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPENDENCY RULES                         │
│                                                             │
│  Domain ──────────► NOTHING (zero dependencies)             │
│  Application ────► Domain only                              │
│  Infrastructure ─► Domain + Application                     │
│  Presentation ───► Application only (never Domain directly) │
│                                                             │
│  ┌──────────────┐                                           │
│  │ Presentation │ ──► Application                           │
│  └──────────────┘         │                                 │
│                           ▼                                 │
│                    ┌─────────────┐                           │
│                    │ Application │ ──► Domain                │
│                    └─────────────┘       │                   │
│                           ▲             ▼                    │
│                    ┌──────────────────┐  (nothing)           │
│                    │ Infrastructure   │ ──► Domain           │
│                    └──────────────────┘ ──► Application      │
│                                                             │
│  FORBIDDEN:                                                 │
│  ✗ Domain → Application/Infrastructure/Presentation         │
│  ✗ Application → Infrastructure/Presentation                │
│  ✗ Presentation → Infrastructure (except via DI container)  │
│  ✗ Presentation → Domain (always go through Application)    │
└─────────────────────────────────────────────────────────────┘
```

```php
<?php
// PHPStan rule to enforce dependency boundaries
// phpstan.neon configuration
declare(strict_types=1);

/*
 * phpstan.neon — Layer dependency enforcement
 *
 * parameters:
 *   paths:
 *     - app
 *   level: 9
 *   rules:
 *     # Domain layer cannot import from Application, Infrastructure, or Presentation
 *     - rule: App\Domain\** cannot depend on App\Application\**
 *     - rule: App\Domain\** cannot depend on App\Infrastructure\**
 *     - rule: App\Domain\** cannot depend on App\Presentation\**
 *     - rule: App\Domain\** cannot depend on Illuminate\**
 *
 *     # Application layer cannot import from Infrastructure or Presentation
 *     - rule: App\Application\** cannot depend on App\Infrastructure\**
 *     - rule: App\Application\** cannot depend on App\Presentation\**
 *
 *     # Presentation cannot import from Infrastructure
 *     - rule: App\Presentation\** cannot depend on App\Infrastructure\**
 *
 * Use deptrac for more advanced dependency analysis:
 * composer require --dev qossmic/deptrac-shim
 */
```

```php
<?php
// deptrac.yaml — Precise layer dependency enforcement
/*
deptrac:
  paths:
    - ./app
  layers:
    - name: Domain
      collectors:
        - type: directory
          value: app/Domain/.*
    - name: Application
      collectors:
        - type: directory
          value: app/Application/.*
    - name: Infrastructure
      collectors:
        - type: directory
          value: app/Infrastructure/.*
    - name: Presentation
      collectors:
        - type: directory
          value: app/Presentation/.*
  ruleset:
    Domain: []
    Application:
      - Domain
    Infrastructure:
      - Domain
      - Application
    Presentation:
      - Application
*/
```

```php
<?php
// Example: Correct dependency flow
declare(strict_types=1);

// DOMAIN — defines the port (interface)
namespace App\Domain\Order\Ports;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\ValueObjects\OrderId;

interface OrderRepositoryInterface
{
    public function findById(OrderId $id): ?Order;
    public function save(Order $order): void;
}

// APPLICATION — depends on Domain port
namespace App\Application\Order\Handlers;

use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Application\Order\Commands\CreateOrderCommand;
use App\Application\Order\DTOs\OrderDto;

final readonly class CreateOrderHandler
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
    ) {}

    public function handle(CreateOrderCommand $command): OrderDto
    {
        // Orchestrate domain logic
        $order = Order::create(/* ... */);
        $this->orderRepository->save($order);
        return OrderDto::fromEntity($order);
    }
}

// INFRASTRUCTURE — implements Domain port
namespace App\Infrastructure\Persistence\Eloquent\Repositories;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Ports\OrderRepositoryInterface;
use App\Domain\Order\ValueObjects\OrderId;
use App\Infrastructure\Persistence\Eloquent\Models\OrderModel;
use App\Infrastructure\Persistence\Eloquent\Mappers\OrderMapper;

final readonly class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function __construct(
        private OrderMapper $mapper,
    ) {}

    public function findById(OrderId $id): ?Order
    {
        $model = OrderModel::find($id->toString());
        return $model ? $this->mapper->toDomain($model) : null;
    }

    public function save(Order $order): void
    {
        $data = $this->mapper->toPersistence($order);
        OrderModel::updateOrCreate(['id' => $data['id']], $data);
    }
}

// PRESENTATION — depends on Application only
namespace App\Presentation\Http\Controllers\Api;

use App\Application\Order\Commands\CreateOrderCommand;
use App\Application\Order\Handlers\CreateOrderHandler;
use App\Presentation\Http\Requests\CreateOrderRequest;
use App\Presentation\Http\Resources\OrderResource;
use Illuminate\Http\JsonResponse;

final class OrderController
{
    public function store(
        CreateOrderRequest $request,
        CreateOrderHandler $handler,
    ): JsonResponse {
        $command = new CreateOrderCommand(...$request->validated());
        $dto = $handler->handle($command);
        return new JsonResponse(
            data: new OrderResource($dto),
            status: 201,
        );
    }
}
```

**Key Points**:
- Domain imports NOTHING — no Illuminate, no vendor, no other layers
- Application imports Domain only — uses interfaces (ports) from Domain
- Infrastructure implements Domain interfaces and may use Application DTOs
- Presentation calls Application handlers — never reaches into Domain directly
- Use `deptrac` or PHPStan custom rules to enforce at CI level
- Dependency Injection Container (service providers) is the only place where Infrastructure touches Presentation

---

### Pattern 0.5: Module Code System

**Category**: Feature Organization
**Description**: How to organize features into self-contained modules within the architecture.

```
# Module Organization — Two Strategies

# Strategy A: Feature-per-folder (Vertical Slices)
app/
├── Modules/
│   ├── Order/
│   │   ├── Domain/
│   │   │   ├── Entities/
│   │   │   ├── ValueObjects/
│   │   │   └── Ports/
│   │   ├── Application/
│   │   │   ├── Commands/
│   │   │   ├── Queries/
│   │   │   └── Handlers/
│   │   ├── Infrastructure/
│   │   │   ├── Repositories/
│   │   │   └── Models/
│   │   ├── Presentation/
│   │   │   ├── Controllers/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   ├── routes.php
│   │   ├── config.php
│   │   └── OrderServiceProvider.php
│   └── Payment/
│       ├── Domain/
│       ├── Application/
│       ├── Infrastructure/
│       ├── Presentation/
│       └── PaymentServiceProvider.php

# Strategy B: Layer-first with context subfolders
app/
├── Domain/
│   ├── Order/
│   └── Payment/
├── Application/
│   ├── Order/
│   └── Payment/
├── Infrastructure/
│   ├── Order/
│   └── Payment/
└── Presentation/
    ├── Order/
    └── Payment/
```

```php
<?php
// Module Service Provider — self-registering module
declare(strict_types=1);

namespace App\Modules\Order;

use App\Modules\Order\Domain\Ports\OrderRepositoryInterface;
use App\Modules\Order\Infrastructure\Repositories\EloquentOrderRepository;
use Illuminate\Support\ServiceProvider;

final class OrderServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            abstract: OrderRepositoryInterface::class,
            concrete: EloquentOrderRepository::class,
        );

        $this->mergeConfigFrom(
            path: __DIR__ . '/config.php',
            key: 'modules.order',
        );
    }

    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__ . '/routes.php');
        $this->loadMigrationsFrom(__DIR__ . '/Database/Migrations');
    }
}
```

```php
<?php
// Module auto-discovery — register all modules dynamically
declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\File;
use Illuminate\Support\ServiceProvider;

final class ModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $modulesPath = app_path('Modules');

        if (!File::isDirectory($modulesPath)) {
            return;
        }

        /** @var array<int, \SplFileInfo> $modules */
        $modules = File::directories($modulesPath);

        foreach ($modules as $modulePath) {
            $moduleName = basename($modulePath);
            $providerClass = "App\\Modules\\{$moduleName}\\{$moduleName}ServiceProvider";

            if (class_exists($providerClass)) {
                $this->app->register($providerClass);
            }
        }
    }
}
```

**Key Points**:
- **Strategy A (feature-per-folder)**: Best for large teams — each module is self-contained and can be extracted to a package
- **Strategy B (layer-first)**: Best for small-medium teams — easier to see all domain entities or all controllers at once
- Choose ONE strategy per project — mixing leads to confusion
- Each module has its own ServiceProvider for bindings and routes
- Cross-module communication must go through interfaces, never direct class imports
- Shared kernel (`Domain/Shared/`) for truly cross-cutting value objects

```php
<?php
// Cross-module communication — via events, not direct imports
declare(strict_types=1);

namespace App\Modules\Order\Application\Handlers;

use App\Modules\Order\Domain\Events\OrderPlaced;

final readonly class CreateOrderHandler
{
    public function handle(CreateOrderCommand $command): OrderDto
    {
        $order = Order::create(/* ... */);
        $this->orderRepository->save($order);

        // Communicate to Payment module via domain event
        // Payment module listens for this event — no direct coupling
        event(new OrderPlaced(
            orderId: $order->id->toString(),
            totalAmount: $order->total()->amount(),
            currency: $order->total()->currency(),
        ));

        return OrderDto::fromEntity($order);
    }
}
```

---

### Pattern 0.6: Feature Completeness Checklist

**Category**: Quality Assurance
**Description**: Checklist to verify a feature is architecturally complete — all layers present, all concerns addressed.

```
┌─────────────────────────────────────────────────────────────┐
│             FEATURE COMPLETENESS CHECKLIST                  │
│             (per bounded context / feature)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DOMAIN LAYER                                               │
│  □ Entity classes defined (with business rules)             │
│  □ Value Objects for non-primitive types                    │
│  □ Domain Enums (PHP 8.1+ backed enums)                    │
│  □ Domain Exceptions (specific, not generic)               │
│  □ Port interfaces (repository, gateway contracts)         │
│  □ Domain Events (if cross-boundary communication needed)  │
│  □ Zero framework imports verified                         │
│                                                             │
│  APPLICATION LAYER                                          │
│  □ Command classes (write operations)                       │
│  □ Query classes (read operations)                          │
│  □ Handler classes (one per command/query)                  │
│  □ DTOs for data transfer between layers                   │
│  □ Application-level validation                            │
│  □ Only Domain imports verified                            │
│                                                             │
│  INFRASTRUCTURE LAYER                                       │
│  □ Eloquent Models (with casts, relations, scopes)         │
│  □ Repository implementations (implements Domain ports)    │
│  □ Domain ↔ Eloquent Mappers                               │
│  □ External service adapters (payment, email, etc.)        │
│  □ Database migrations                                     │
│  □ Database factories                                      │
│  □ Database seeders                                        │
│  □ Service provider bindings                               │
│                                                             │
│  PRESENTATION LAYER                                         │
│  □ Controllers (thin — delegate to handlers)               │
│  □ Form Requests (validation + authorization)              │
│  □ API Resources (response transformation)                 │
│  □ Route definitions                                       │
│  □ Middleware (if feature-specific)                         │
│  □ Error responses (consistent format)                     │
│                                                             │
│  TESTING                                                    │
│  □ Unit tests — Domain entities and value objects           │
│  □ Unit tests — Application handlers (mocked ports)        │
│  □ Integration tests — Infrastructure repositories         │
│  □ Feature tests — HTTP endpoints (end-to-end)             │
│  □ Factory definitions for test data                       │
│                                                             │
│  CROSS-CUTTING                                              │
│  □ Authorization (policies or gates)                       │
│  □ Logging (structured, contextual)                        │
│  □ Caching strategy defined                                │
│  □ API documentation (OpenAPI/Swagger annotations)         │
│  □ Error handling (domain → HTTP status mapping)           │
│  □ Performance considerations (eager loading, indexing)    │
│                                                             │
│  DEPLOYMENT                                                 │
│  □ Config values externalized (.env)                       │
│  □ Queue jobs for async operations                         │
│  □ Scheduled tasks registered (if needed)                  │
│  □ Health check endpoints (if critical service)            │
└─────────────────────────────────────────────────────────────┘
```

```php
<?php
// Automated completeness check via Artisan command
declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

final class FeatureCompletenessCommand extends Command
{
    protected $signature = 'arch:completeness {context : Bounded context name (e.g., Order)}';
    protected $description = 'Check feature completeness for a bounded context';

    public function handle(): int
    {
        $context = $this->argument('context');
        $results = [];
        $passed = 0;
        $failed = 0;

        $checks = [
            // Domain
            "app/Domain/{$context}/Entities" => 'Domain Entities',
            "app/Domain/{$context}/Ports" => 'Domain Ports (interfaces)',
            "app/Domain/{$context}/ValueObjects" => 'Domain Value Objects',
            // Application
            "app/Application/{$context}/Handlers" => 'Application Handlers',
            "app/Application/{$context}/DTOs" => 'Application DTOs',
            // Infrastructure
            "app/Infrastructure/Persistence/Eloquent/Repositories" => 'Repository Implementations',
            // Presentation
            "app/Presentation/Http/Controllers" => 'Controllers',
            "app/Presentation/Http/Requests" => 'Form Requests',
            "app/Presentation/Http/Resources" => 'API Resources',
            // Testing
            "tests/Unit/Domain/{$context}" => 'Domain Unit Tests',
            "tests/Feature/Presentation/{$context}" => 'Feature Tests',
        ];

        foreach ($checks as $path => $label) {
            $exists = File::isDirectory(base_path($path))
                && count(File::files(base_path($path))) > 0;

            if ($exists) {
                $this->line("  ✓ {$label}");
                $passed++;
            } else {
                $this->warn("  ✗ {$label} — missing or empty");
                $failed++;
            }
        }

        $total = $passed + $failed;
        $percentage = $total > 0 ? round(($passed / $total) * 100) : 0;

        $this->newLine();
        $this->info("Completeness: {$passed}/{$total} ({$percentage}%)");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
```

**Key Points**:
- Every feature must touch all 4 layers (Domain, Application, Infrastructure, Presentation)
- Testing mirrors the architecture — unit tests per layer, feature tests for endpoints
- Cross-cutting concerns (auth, logging, caching) are verified per feature
- Automate the check with an Artisan command for CI integration
- A feature scoring < 80% completeness should not be merged to main

---

## Best Practices

- **Choose architecture early** — switching from standard to clean architecture mid-project is expensive; decide in sprint 0
- **Domain purity is non-negotiable** — if your Domain layer imports `Illuminate\*`, your architecture is broken
- **Eloquent models are infrastructure** — in clean arch, never expose Eloquent models outside Infrastructure
- **One handler per use case** — avoid god-services; each Command/Query gets its own Handler
- **Map, don't share** — use Mappers between Domain entities and Eloquent models; never use the same class for both
- **Automate dependency checks** — integrate `deptrac` or PHPStan custom rules in CI pipeline
- **Module boundaries via events** — modules communicate through domain events, not direct class imports
- **Keep controllers thin** — max 5 lines per action: validate, dispatch, transform, respond
- **Readonly DTOs** — use PHP 8.3 `readonly class` for all DTOs to prevent mutation

---

## Abnormal Case Patterns

1. **Eloquent model in Domain layer** — Domain entity extends `Model`. Fix: create separate Domain entity (plain PHP) and Infrastructure Eloquent model with a Mapper between them.

2. **Business logic in Controller** — controller has 50+ lines of orchestration. Fix: extract to Application Handler, controller only calls handler and returns response.

3. **Circular dependency between modules** — Module A imports Module B and vice versa. Fix: introduce a shared event/contract in `Domain/Shared/` or use domain events for decoupling.

4. **Infrastructure leaking into Application** — Application handler directly uses `DB::` facade or Eloquent query builder. Fix: define Repository port in Domain, implement in Infrastructure, inject via interface.

5. **Missing Mapper between Entity and Model** — Domain entity IS the Eloquent model. Fix: separate them, create a Mapper class that converts between the two representations.

6. **Monolithic Service Provider** — single provider with 100+ bindings. Fix: split into per-domain providers registered in `bootstrap/providers.php`.

7. **No dependency enforcement in CI** — architecture rules exist in docs but are never checked. Fix: add `deptrac` or custom PHPStan rules to CI pipeline with zero-tolerance policy.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E6 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (0.1–0.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Architecture Master Specialist — Architecture | EPS v3.2*
