# Laravel Action Patterns Specialist — Application
# Laravelアクションパターンスペシャリスト — アプリケーション
# Chuyen Gia Action Pattern Laravel — Ung Dung

**Version**: 1.0.0
**Technology**: Laravel 11+ Action Classes
**Aspect**: Action Patterns
**Category**: application
**Purpose**: Knowledge provider for Laravel 11+ action class architecture — single-responsibility invocable actions, action with validation, action composition chains, invocable class conventions, action vs service decision criteria, and action testing strategies

---

## Metadata

```json
{
  "id": "laravel-action-patterns-specialist",
  "technology": "Laravel 11+ Action Classes",
  "aspect": "Action Patterns",
  "category": "application",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Single action class pattern — one public __invoke(), one use case per class",
    "E2: Action composition — chaining actions via constructor injection for complex workflows",
    "E3: Action vs Service decision matrix — granularity, reusability, testability tradeoffs"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 314.1–314.6 |
| **Directory Pattern** | `app/Actions/` |
| **Naming Convention** | `{Verb}{Entity}Action.php` (e.g., `CreateOrderAction.php`, `ProcessPaymentAction.php`) |
| **Imports From** | Domain (models, value objects), Infrastructure (repositories, external clients) |
| **Imported By** | Presentation (controllers, commands), other Actions |
| **Cannot Import** | Presentation (controllers, requests, resources) |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Single-purpose operations, discrete use cases, pipeline-friendly units of work |
| **Source Skeleton** | `app/Actions/{Verb}{Entity}Action.php` |
| **Specialist Type** | code |
| **Purpose** | Action class design — single responsibility, invocable pattern, composition, testing |
| **Activation Trigger** | files: `app/Actions/*.php`, `app/Actions/**/*.php`; keywords: Action, __invoke, single action, use case |

---

## Role

You are a **Laravel Action Patterns Specialist**. Your responsibility is to provide best practices for Laravel 11+ action class architecture — single-responsibility classes with one `__invoke()` method, action composition for multi-step workflows, validation within actions, the decision criteria for choosing actions vs services, and comprehensive testing strategies.

**Used by**: Any code agent implementing discrete use cases as standalone action classes in Laravel
**Not used by**: Non-Laravel stacks, projects using fat controllers or monolithic service classes exclusively

---

## Patterns

### Pattern 314.1: Single Action Class

**Category**: Action Fundamentals
**Description**: A single-purpose action class with one `__invoke()` method encapsulating a complete use case.

```php
<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\Contracts\OrderRepositoryInterface;
use App\DTOs\CreateOrderData;
use App\Events\OrderCreated;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class CreateOrderAction
{
    public function __construct(
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly ReserveInventoryAction $reserveInventory,
    ) {}

    public function __invoke(User $user, CreateOrderData $data): Order
    {
        return DB::transaction(function () use ($user, $data): Order {
            $order = $this->orderRepository->create(
                userId: $user->id,
                items: $data->items,
                shippingAddress: $data->shippingAddress,
                notes: $data->notes,
            );

            ($this->reserveInventory)(
                items: $data->items,
                orderId: $order->id,
            );

            DB::afterCommit(fn () => event(new OrderCreated(order: $order)));

            return $order;
        });
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Order;

use App\Contracts\InventoryRepositoryInterface;

final class ReserveInventoryAction
{
    public function __construct(
        private readonly InventoryRepositoryInterface $inventoryRepository,
    ) {}

    /**
     * @param array<int, array{product_id: int, quantity: int}> $items
     */
    public function __invoke(array $items, int $orderId): void
    {
        foreach ($items as $item) {
            $reserved = $this->inventoryRepository->reserve(
                productId: $item['product_id'],
                quantity: $item['quantity'],
                referenceId: $orderId,
            );

            if (!$reserved) {
                throw new \DomainException(
                    message: "Insufficient inventory for product {$item['product_id']}",
                );
            }
        }
    }
}
```

```php
// Controller usage — clean and minimal
final class OrderController extends Controller
{
    public function store(
        StoreOrderRequest $request,
        CreateOrderAction $createOrder,
    ): JsonResponse {
        $order = ($createOrder)(
            user: $request->user(),
            data: CreateOrderData::fromRequest($request),
        );

        return OrderResource::make($order)
            ->response()
            ->setStatusCode(201);
    }
}
```

**Key Points**:
- One class = one action = one `__invoke()` method
- Name as `{Verb}{Entity}Action` — makes the intent immediately clear
- Inject actions into controllers via method injection (auto-resolved by container)
- Call actions with parentheses: `($action)(args...)` — PHP invocable syntax
- Actions can inject other actions for composition

---

### Pattern 314.2: Action with Validation

**Category**: Input Validation
**Description**: Actions that validate their inputs internally, independent of the HTTP layer, enabling reuse from controllers, commands, and jobs.

```php
<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

final class RegisterUserAction
{
    /**
     * @param array<string, mixed> $data
     * @throws ValidationException
     */
    public function __invoke(array $data): User
    {
        $validated = $this->validate($data);

        return User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'timezone' => $validated['timezone'] ?? 'UTC',
        ]);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws ValidationException
     */
    private function validate(array $data): array
    {
        return Validator::make($data, [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'timezone' => ['sometimes', 'string', 'timezone:all'],
        ])->validate();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Product;

use App\DTOs\UpdateProductData;
use App\Models\Product;
use Illuminate\Support\Str;

final class UpdateProductAction
{
    /**
     * Accepts a typed DTO — validation already handled at DTO construction.
     */
    public function __invoke(Product $product, UpdateProductData $data): Product
    {
        $attributes = [];

        if ($data->name !== null) {
            $attributes['name'] = $data->name;
            $attributes['slug'] = Str::slug($data->name);
        }

        if ($data->description !== null) {
            $attributes['description'] = $data->description;
        }

        if ($data->price !== null) {
            if ($data->price < 0) {
                throw new \DomainException('Product price cannot be negative');
            }
            $attributes['price'] = $data->price;
        }

        if ($data->categoryId !== null) {
            $attributes['category_id'] = $data->categoryId;
        }

        if (empty($attributes)) {
            return $product;
        }

        $product->update($attributes);

        return $product->refresh();
    }
}
```

```php
// Reuse the same action from an Artisan command
final class RegisterUserCommand extends Command
{
    protected $signature = 'user:register {email} {name} {--password=}';

    public function handle(RegisterUserAction $registerUser): int
    {
        try {
            $user = ($registerUser)([
                'name' => $this->argument('name'),
                'email' => $this->argument('email'),
                'password' => $this->option('password') ?? 'Temp1234!',
                'password_confirmation' => $this->option('password') ?? 'Temp1234!',
            ]);

            $this->info("User created: {$user->email}");

            return self::SUCCESS;
        } catch (ValidationException $e) {
            $this->error('Validation failed:');
            foreach ($e->errors() as $field => $messages) {
                $this->error("  {$field}: " . implode(', ', $messages));
            }

            return self::FAILURE;
        }
    }
}
```

**Key Points**:
- Two approaches: validate internally with `Validator::make()` or accept a pre-validated DTO
- Internal validation enables reuse from controllers, commands, jobs, and tests
- DTO approach delegates validation to the DTO factory method (e.g., `CreateOrderData::fromRequest()`)
- Throw `ValidationException` for input errors, `DomainException` for business rule violations
- Actions reusable across HTTP, CLI, and queue contexts

---

### Pattern 314.3: Action Composition (Chain Actions)

**Category**: Complex Workflows
**Description**: Composing multiple actions into a workflow — sequential chains, conditional branches, and compensating actions for rollback.

```php
<?php

declare(strict_types=1);

namespace App\Actions\Checkout;

use App\DTOs\CheckoutData;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class ProcessCheckoutAction
{
    public function __construct(
        private readonly ValidateCartAction $validateCart,
        private readonly CalculatePricingAction $calculatePricing,
        private readonly CreateOrderAction $createOrder,
        private readonly ChargePaymentAction $chargePayment,
        private readonly SendConfirmationAction $sendConfirmation,
    ) {}

    public function __invoke(User $user, CheckoutData $data): Order
    {
        // Step 1: Validate cart (no side effects)
        $validatedCart = ($this->validateCart)(
            userId: $user->id,
            cartItems: $data->items,
        );

        // Step 2: Calculate pricing (no side effects)
        $pricing = ($this->calculatePricing)(
            items: $validatedCart,
            couponCode: $data->couponCode,
            taxRegion: $user->tax_region,
        );

        // Step 3 & 4: Transactional — create order + charge payment
        $order = DB::transaction(function () use ($user, $data, $validatedCart, $pricing): Order {
            $order = ($this->createOrder)(
                user: $user,
                items: $validatedCart,
                pricing: $pricing,
                shippingAddress: $data->shippingAddress,
            );

            ($this->chargePayment)(
                user: $user,
                order: $order,
                paymentMethodId: $data->paymentMethodId,
                amount: $pricing->total,
            );

            return $order;
        });

        // Step 5: Post-commit side effects
        ($this->sendConfirmation)(user: $user, order: $order);

        return $order;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Checkout;

use App\Models\Order;
use App\Models\User;
use App\Contracts\PaymentGatewayInterface;
use App\Exceptions\PaymentProcessingException;

final class ChargePaymentAction
{
    public function __construct(
        private readonly PaymentGatewayInterface $gateway,
    ) {}

    public function __invoke(
        User $user,
        Order $order,
        string $paymentMethodId,
        int $amount,
    ): void {
        try {
            $this->gateway->charge(
                customerId: $user->stripe_customer_id,
                paymentMethodId: $paymentMethodId,
                amountCents: $amount,
                idempotencyKey: "order-{$order->id}",
                metadata: [
                    'order_id' => $order->id,
                    'user_email' => $user->email,
                ],
            );
        } catch (\Throwable $e) {
            throw PaymentProcessingException::declined(
                orderId: (string) $order->id,
                reason: $e->getMessage(),
            );
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Checkout;

use App\DTOs\PricingResult;
use App\Domain\Pricing\PricingCalculator;

final class CalculatePricingAction
{
    public function __construct(
        private readonly PricingCalculator $calculator,
    ) {}

    /**
     * @param array<int, array{product_id: int, quantity: int, price: int}> $items
     */
    public function __invoke(
        array $items,
        ?string $couponCode,
        string $taxRegion,
    ): PricingResult {
        $lineItems = array_map(
            callback: fn (array $item): array => [
                'price' => $item['price'],
                'quantity' => $item['quantity'],
            ],
            array: $items,
        );

        $result = $this->calculator->calculateTotal(
            lineItems: $lineItems,
            couponCode: $couponCode,
            taxRegion: $taxRegion,
        );

        return new PricingResult(
            subtotal: $result->subtotal->toCents(),
            discount: $result->discount->toCents(),
            tax: $result->tax->toCents(),
            total: $result->total->toCents(),
        );
    }
}
```

**Key Points**:
- Orchestrating action composes child actions via constructor injection
- Structure as: validate (pure) → transactional core → side effects
- Each action remains independently testable and reusable
- Child actions throw specific exceptions — parent action propagates or handles
- Keep the orchestrating action under 40 lines — delegate all logic to child actions

---

### Pattern 314.4: Action as Invocable Class

**Category**: PHP 8.3 Invocable Pattern
**Description**: Leveraging PHP's `__invoke()` magic method for clean action dispatch — type-safe, auto-resolvable, and pipeline-compatible.

```php
<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\DTOs\UserProfileData;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

final class UpdateUserAvatarAction
{
    public function __invoke(User $user, UserProfileData $data): User
    {
        if ($data->avatar === null) {
            return $user;
        }

        // Delete old avatar if exists
        if ($user->avatar_path !== null) {
            Storage::disk('s3')->delete($user->avatar_path);
        }

        $path = $data->avatar->store(
            path: "avatars/{$user->id}",
            options: ['disk' => 's3', 'visibility' => 'public'],
        );

        $user->update(['avatar_path' => $path]);

        return $user->refresh();
    }
}
```

```php
<?php

declare(strict_types=1);

// Pipeline-compatible action — accepts and returns the same type
namespace App\Actions\Order\Pipeline;

use App\Models\Order;

final class ApplyDiscountAction
{
    public function __invoke(Order $order): Order
    {
        if ($order->coupon_id === null) {
            return $order;
        }

        $coupon = $order->coupon;
        $discount = match ($coupon->type) {
            'percentage' => (int) ($order->subtotal * $coupon->value / 100),
            'fixed' => $coupon->value,
            default => 0,
        };

        $order->discount_amount = min($discount, $order->subtotal);
        $order->total_amount = $order->subtotal - $order->discount_amount + $order->tax_amount;

        return $order;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Order\Pipeline;

use App\Models\Order;

final class CalculateTaxAction
{
    private const array TAX_RATES = [
        'US' => 0.08,
        'EU' => 0.21,
        'JP' => 0.10,
        'SG' => 0.09,
    ];

    public function __invoke(Order $order): Order
    {
        $rate = self::TAX_RATES[$order->tax_region] ?? 0.0;
        $taxableAmount = $order->subtotal - ($order->discount_amount ?? 0);

        $order->tax_amount = (int) round($taxableAmount * $rate);
        $order->total_amount = $taxableAmount + $order->tax_amount;

        return $order;
    }
}
```

```php
// Using actions in a Laravel pipeline
use Illuminate\Pipeline\Pipeline;

$order = app(Pipeline::class)
    ->send($order)
    ->through([
        ApplyDiscountAction::class,
        CalculateTaxAction::class,
        ValidateOrderTotalsAction::class,
    ])
    ->thenReturn();
```

**Key Points**:
- `__invoke()` makes the class callable — `($action)($args)` or `$action($args)`
- Pipeline-compatible actions accept and return the same type (or use `Closure $next`)
- Laravel's `Pipeline` resolves actions from the container — dependencies auto-injected
- Pipeline actions should be side-effect free (pure transforms) for predictability
- Use `match` expression for type-safe branching without fallthrough

---

### Pattern 314.5: Action vs Service Decision

**Category**: Architecture Decision
**Description**: Decision matrix for choosing between action classes and service classes based on use case complexity, reusability, and team conventions.

```php
<?php

declare(strict_types=1);

// CHOOSE ACTION when:
// - Single discrete operation (create, send, import)
// - Operation is reusable across HTTP, CLI, queue, tests
// - Operation fits naturally as "do one thing"
// - You want pipeline compatibility

namespace App\Actions\User;

/**
 * ACTION: Single purpose — generate a password reset token and send email.
 * Used by: ForgotPasswordController, ResetPasswordCommand, UserSeeder
 */
final class SendPasswordResetAction
{
    public function __construct(
        private readonly \App\Contracts\MailServiceInterface $mailer,
    ) {}

    public function __invoke(string $email): void
    {
        $user = \App\Models\User::where('email', $email)->firstOrFail();

        $token = \Illuminate\Support\Str::random(64);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
            attributes: ['email' => $email],
            values: [
                'token' => \Illuminate\Support\Facades\Hash::make($token),
                'created_at' => now(),
            ],
        );

        $this->mailer->send(
            to: $email,
            template: 'emails.password-reset',
            data: [
                'user' => $user,
                'token' => $token,
                'expires_at' => now()->addHour(),
            ],
        );
    }
}
```

```php
<?php

declare(strict_types=1);

// CHOOSE SERVICE when:
// - Multiple related operations on the same entity/aggregate
// - Operations share state or dependencies
// - CRUD-like grouping makes sense
// - You need to maintain backward compatibility with existing service-based code

namespace App\Services;

/**
 * SERVICE: Multiple related operations on User entity.
 * Grouping makes sense because they share UserRepository dependency.
 */
final class UserService
{
    public function __construct(
        private readonly \App\Contracts\UserRepositoryInterface $userRepository,
        private readonly \App\Services\AuditService $auditService,
    ) {}

    public function updateProfile(int $userId, array $data): \App\Models\User
    {
        $user = $this->userRepository->findOrFail($userId);
        $user->update($data);

        $this->auditService->log(
            entity: 'user',
            entityId: $userId,
            action: 'profile_updated',
            changes: $data,
        );

        return $user->refresh();
    }

    public function deactivate(int $userId, string $reason): void
    {
        $user = $this->userRepository->findOrFail($userId);
        $user->update([
            'is_active' => false,
            'deactivated_at' => now(),
            'deactivation_reason' => $reason,
        ]);

        $this->auditService->log(
            entity: 'user',
            entityId: $userId,
            action: 'deactivated',
            changes: ['reason' => $reason],
        );
    }

    public function reactivate(int $userId): \App\Models\User
    {
        $user = $this->userRepository->findOrFail($userId);

        if ($user->is_active) {
            throw new \DomainException('User is already active');
        }

        $user->update([
            'is_active' => true,
            'deactivated_at' => null,
            'deactivation_reason' => null,
        ]);

        $this->auditService->log(
            entity: 'user',
            entityId: $userId,
            action: 'reactivated',
        );

        return $user->refresh();
    }
}
```

**Decision Matrix**:

| Criteria | Action | Service |
|----------|--------|---------|
| **Scope** | Single use case | Multiple related use cases |
| **Naming** | `{Verb}{Entity}Action` | `{Entity}Service` |
| **Methods** | One (`__invoke`) | Many (CRUD + business) |
| **Reusability** | High (cross-context) | Medium (within app layer) |
| **Pipeline** | Compatible | Not compatible |
| **Testing** | Simple (one method) | More setup (many methods) |
| **When entity has 1-2 operations** | Prefer action | Overkill |
| **When entity has 5+ operations** | Too many classes | Prefer service |
| **Mixed approach** | Compose actions in service | Service delegates to actions |

**Key Points**:
- Actions and services are complementary — use both in the same project
- Start with actions; consolidate into services only when class count becomes unwieldy
- A service can delegate to actions internally: `$this->createOrder->__invoke(...)`
- Never create an action with multiple public methods — that's a service
- Convention: `app/Actions/{Domain}/{Verb}{Entity}Action.php`

---

### Pattern 314.6: Action Testing

**Category**: Testing
**Description**: Testing action classes — unit tests with mocks, integration tests with real DB, and edge case coverage.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Actions\Order;

use App\Actions\Order\CreateOrderAction;
use App\Actions\Order\ReserveInventoryAction;
use App\Contracts\OrderRepositoryInterface;
use App\DTOs\CreateOrderData;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Mockery\MockInterface;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class CreateOrderActionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_creates_order_and_reserves_inventory(): void
    {
        $user = User::factory()->create();
        $data = new CreateOrderData(
            items: [
                ['product_id' => 1, 'quantity' => 2, 'price' => 1500],
                ['product_id' => 3, 'quantity' => 1, 'price' => 3000],
            ],
            shippingAddress: '123 Main St, City, ST 12345',
        );

        $expectedOrder = Order::factory()->make(['id' => 42]);

        /** @var MockInterface&OrderRepositoryInterface */
        $orderRepo = Mockery::mock(OrderRepositoryInterface::class);
        $orderRepo->shouldReceive('create')
            ->once()
            ->withArgs(fn ($userId, $items, $addr) =>
                $userId === $user->id
                && count($items) === 2
                && $addr === '123 Main St, City, ST 12345'
            )
            ->andReturn($expectedOrder);

        /** @var MockInterface&ReserveInventoryAction */
        $reserveInventory = Mockery::mock(ReserveInventoryAction::class);
        $reserveInventory->shouldReceive('__invoke')
            ->once()
            ->with($data->items, 42);

        $action = new CreateOrderAction(
            orderRepository: $orderRepo,
            reserveInventory: $reserveInventory,
        );

        $result = ($action)(user: $user, data: $data);

        $this->assertSame($expectedOrder, $result);
    }

    #[Test]
    public function it_rolls_back_when_inventory_reservation_fails(): void
    {
        $user = User::factory()->create();
        $data = new CreateOrderData(
            items: [['product_id' => 999, 'quantity' => 100, 'price' => 100]],
            shippingAddress: '456 Oak Ave',
        );

        $orderRepo = Mockery::mock(OrderRepositoryInterface::class);
        $orderRepo->shouldReceive('create')
            ->once()
            ->andReturn(Order::factory()->make(['id' => 50]));

        $reserveInventory = Mockery::mock(ReserveInventoryAction::class);
        $reserveInventory->shouldReceive('__invoke')
            ->once()
            ->andThrow(new \DomainException('Insufficient inventory for product 999'));

        $action = new CreateOrderAction(
            orderRepository: $orderRepo,
            reserveInventory: $reserveInventory,
        );

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Insufficient inventory');

        ($action)(user: $user, data: $data);
    }

    #[Test]
    public function it_dispatches_event_after_commit(): void
    {
        \Illuminate\Support\Facades\Event::fake();

        $user = User::factory()->create();
        $data = new CreateOrderData(
            items: [['product_id' => 1, 'quantity' => 1, 'price' => 500]],
            shippingAddress: '789 Pine Rd',
        );

        // Integration test with real repository
        $action = app(CreateOrderAction::class);

        ($action)(user: $user, data: $data);

        \Illuminate\Support\Facades\Event::assertDispatched(
            \App\Events\OrderCreated::class,
            fn ($event) => $event->order->user_id === $user->id,
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Actions\User;

use App\Actions\User\RegisterUserAction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class RegisterUserActionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_creates_user_with_valid_data(): void
    {
        $action = new RegisterUserAction();

        $user = ($action)([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'SecureP@ss1',
            'password_confirmation' => 'SecureP@ss1',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'name' => 'Jane Doe',
        ]);

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('SecureP@ss1', $user->password),
        );
    }

    #[Test]
    #[DataProvider('invalidDataProvider')]
    public function it_rejects_invalid_data(array $data, string $expectedField): void
    {
        $action = new RegisterUserAction();

        try {
            ($action)($data);
            $this->fail('Expected ValidationException was not thrown');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey($expectedField, $e->errors());
        }
    }

    /**
     * @return array<string, array{0: array<string, mixed>, 1: string}>
     */
    public static function invalidDataProvider(): array
    {
        return [
            'missing name' => [
                ['email' => 'test@test.com', 'password' => 'Pass1234!', 'password_confirmation' => 'Pass1234!'],
                'name',
            ],
            'invalid email' => [
                ['name' => 'Test', 'email' => 'not-an-email', 'password' => 'Pass1234!', 'password_confirmation' => 'Pass1234!'],
                'email',
            ],
            'weak password' => [
                ['name' => 'Test', 'email' => 'test@test.com', 'password' => '123', 'password_confirmation' => '123'],
                'password',
            ],
            'password mismatch' => [
                ['name' => 'Test', 'email' => 'test@test.com', 'password' => 'Pass1234!', 'password_confirmation' => 'Wrong'],
                'password',
            ],
        ];
    }

    #[Test]
    public function it_rejects_duplicate_email(): void
    {
        \App\Models\User::factory()->create(['email' => 'taken@example.com']);

        $action = new RegisterUserAction();

        $this->expectException(ValidationException::class);

        ($action)([
            'name' => 'Duplicate',
            'email' => 'taken@example.com',
            'password' => 'SecureP@ss1',
            'password_confirmation' => 'SecureP@ss1',
        ]);
    }
}
```

**Key Points**:
- Test actions via `($action)(args...)` — same invocable syntax used in production
- Mock child actions with `shouldReceive('__invoke')` for unit isolation
- Use `#[DataProvider]` for validation edge cases — PHPUnit 11 attribute syntax
- Integration tests: resolve from container with `app(Action::class)` for real dependencies
- Always test the rollback scenario — ensure failed actions don't leave partial state

---

## Best Practices

- **One public method** — `__invoke()` is the only public method; helpers are `private`
- **Verb-first naming** — `CreateOrder`, `SendNotification`, `ProcessPayment` — not `OrderCreator`
- **Organize by domain** — `app/Actions/Order/`, `app/Actions/User/`, `app/Actions/Payment/`
- **Accept DTOs or typed params** — never accept `Request` objects in actions
- **Return the result** — return created/updated models so callers can respond; use `void` only for fire-and-forget
- **Keep under 50 lines** — if `__invoke()` exceeds 50 lines, extract child actions
- **Transaction in orchestrator** — only the top-level composing action wraps in `DB::transaction()`
- **No HTTP concerns** — actions never return `JsonResponse` or read from `Request`
- **Validate close to the edge** — prefer Form Request or DTO validation over action-internal validation, unless the action is called from non-HTTP contexts

---

## Abnormal Case Patterns

1. **Action with multiple public methods** — `CreateOrderAction` with `create()`, `validate()`, `notify()` public methods. Fix: keep only `__invoke()`; split into separate actions or make helpers private.

2. **Action returning HTTP response** — `return response()->json(...)` inside an action. Fix: return the domain model/DTO; let the controller format the HTTP response.

3. **Circular action dependencies** — ActionA injects ActionB, ActionB injects ActionA. Fix: extract shared logic into a domain service or use events for decoupling.

4. **Actions without tests** — single-purpose classes are the easiest to test. Fix: every action gets at least one happy-path and one failure-path test.

5. **Over-granular actions** — `SetOrderStatusAction`, `SetOrderTotalAction`, `SetOrderDateAction` for simple property updates. Fix: consolidate into `UpdateOrderAction` or use the model directly when there's no business logic.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1–E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (314.1–314.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Action Patterns Specialist — Application | EPS v3.2*
