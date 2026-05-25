# Laravel State Machine Specialist — Patterns
# Laravelステートマシンスペシャリスト — パターン
# Chuyen Gia State Machine Laravel — Mau Thiet Ke

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x State Machine
**Aspect**: State Machine
**Category**: patterns
**Purpose**: Knowledge provider for state machine implementation in Laravel — state enums, transitions, guards, state history, Spatie model states, and state machine testing

---

## Metadata

```json
{
  "id": "laravel-state-machine-specialist",
  "technology": "PHP 8.3 + Laravel 11.x",
  "aspect": "State Machine",
  "category": "patterns",
  "subcategory": "php-laravel",
  "lines": 440,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: PHP 8.3 enums — native state representation with BackedEnum",
    "E2: Spatie laravel-model-states — declarative state transitions and guards",
    "E3: State pattern — encapsulate state-specific behavior and valid transitions"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 346.1–346.6 |
| **Directory Pattern** | `app/States/`, `app/Enums/` |
| **Naming Convention** | `{Entity}State.php`, `{Entity}Status.php`, `{From}To{To}Transition.php` |
| **Imports From** | Domain (entities, enums) |
| **Imported By** | Application (services, handlers), Presentation (controllers) |
| **Cannot Import** | Presentation (HTTP layer), Infrastructure (repositories) |
| **Dependencies** | `spatie/laravel-model-states` |
| **When To Use** | Entities with well-defined lifecycle states and transition rules |
| **Source Skeleton** | `app/States/{Entity}/{StateName}.php` |
| **Specialist Type** | code |
| **Purpose** | State machine for Laravel — enums, transitions, guards, history, Spatie states, testing |
| **Activation Trigger** | files: `app/States/*.php`, `app/Enums/*Status.php`; keywords: state machine, transition, state, HasStates |

---

## Role

You are a **Laravel State Machine Specialist**. Your responsibility is to provide best practices for implementing state machines in Laravel 11+ — using PHP 8.3 enums for state representation, defining valid transitions, implementing transition guards, tracking state history, leveraging Spatie model states, and testing state machine behavior.

**Used by**: Any code agent working with entity lifecycle management in Laravel
**Not used by**: Entities without defined state transitions, non-Laravel stacks

---

## Patterns

### Pattern 346.1: State Enum

**Category**: State Representation
**Description**: PHP 8.3 backed enums as type-safe state representation with behavior methods.

```php
<?php

declare(strict_types=1);

namespace App\Enums;

enum OrderStatus: string
{
    case Draft = 'draft';
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Pending => 'Pending Payment',
            self::Confirmed => 'Confirmed',
            self::Processing => 'Processing',
            self::Shipped => 'Shipped',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
            self::Refunded => 'Refunded',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Delivered, self::Cancelled, self::Refunded], true);
    }

    public function isCancellable(): bool
    {
        return in_array($this, [self::Draft, self::Pending, self::Confirmed], true);
    }

    /**
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [self::Pending, self::Cancelled],
            self::Pending => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Processing, self::Cancelled],
            self::Processing => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered],
            self::Delivered => [self::Refunded],
            self::Cancelled, self::Refunded => [],
        };
    }
}
```

```php
// Model casting
final class Order extends Model
{
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
        ];
    }
}
```

**Key Points**:
- Backed enums (`string` or `int`) for database storage — Eloquent casts natively
- `allowedTransitions()` defines the state graph on the enum itself
- Behavior methods (`isFinal()`, `isCancellable()`) replace scattered if-checks
- Enum is the single source of truth for state values and labels

---

### Pattern 346.2: State Transitions

**Category**: Transition Logic
**Description**: Transition service that enforces valid state changes with domain events.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Events\OrderStatusChanged;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Order;

final class OrderStateManager
{
    public function transition(Order $order, OrderStatus $to): Order
    {
        $from = $order->status;

        if (!$this->canTransition($from, $to)) {
            throw new InvalidStateTransitionException(
                "Cannot transition order #{$order->id} from {$from->value} to {$to->value}",
            );
        }

        $order->update(['status' => $to]);

        event(new OrderStatusChanged(
            orderId: $order->id,
            from: $from,
            to: $to,
        ));

        return $order->refresh();
    }

    public function canTransition(OrderStatus $from, OrderStatus $to): bool
    {
        return in_array($to, $from->allowedTransitions(), true);
    }

    /**
     * @return array<int, OrderStatus>
     */
    public function availableTransitions(Order $order): array
    {
        return $order->status->allowedTransitions();
    }
}
```

**Key Points**:
- Transition validation before mutation — fail fast with domain exception
- Event dispatched after successful transition — listeners handle side effects
- `canTransition()` is public — controllers can check before showing UI buttons
- Transition logic centralized in one service — not scattered across controllers

---

### Pattern 346.3: Transition Guards

**Category**: Authorization
**Description**: Guards that add business rule validation beyond simple state graph checks.

```php
<?php

declare(strict_types=1);

namespace App\States\Guards;

use App\Models\Order;

interface TransitionGuard
{
    public function allowed(Order $order): bool;

    public function message(): string;
}

final class PaymentReceivedGuard implements TransitionGuard
{
    public function allowed(Order $order): bool
    {
        return $order->payment !== null && $order->payment->is_confirmed;
    }

    public function message(): string
    {
        return 'Order cannot be confirmed without confirmed payment';
    }
}

final class InventoryAvailableGuard implements TransitionGuard
{
    public function allowed(Order $order): bool
    {
        return $order->items->every(
            fn ($item) => $item->product->stock >= $item->quantity,
        );
    }

    public function message(): string
    {
        return 'Insufficient inventory for one or more items';
    }
}
```

```php
// Enhanced state manager with guards
final class OrderStateManager
{
    /** @var array<string, array<int, class-string<TransitionGuard>>> */
    private const GUARDS = [
        'pending->confirmed' => [PaymentReceivedGuard::class],
        'confirmed->processing' => [InventoryAvailableGuard::class],
    ];

    public function transition(Order $order, OrderStatus $to): Order
    {
        $from = $order->status;

        if (!$this->canTransition($from, $to)) {
            throw new InvalidStateTransitionException(
                "Invalid transition: {$from->value} -> {$to->value}",
            );
        }

        $this->runGuards($order, $from, $to);

        $order->update(['status' => $to]);
        event(new OrderStatusChanged($order->id, $from, $to));

        return $order->refresh();
    }

    private function runGuards(Order $order, OrderStatus $from, OrderStatus $to): void
    {
        $key = "{$from->value}->{$to->value}";
        $guards = self::GUARDS[$key] ?? [];

        foreach ($guards as $guardClass) {
            $guard = app($guardClass);
            if (!$guard->allowed($order)) {
                throw new TransitionGuardException($guard->message());
            }
        }
    }
}
```

**Key Points**:
- Guards are business rules — not just state graph validation
- Map guards to specific transitions — not all transitions need guards
- Guards are resolved from container — can inject dependencies
- Throw descriptive exceptions — API can return guard failure reason to client

---

### Pattern 346.4: State History

**Category**: Audit Trail
**Description**: Recording state transitions for audit, debugging, and timeline display.

```php
<?php

declare(strict_types=1);

// Migration
Schema::create('state_histories', function (Blueprint $table): void {
    $table->id();
    $table->morphs('model');
    $table->string('field')->default('status');
    $table->string('from')->nullable();
    $table->string('to');
    $table->foreignId('user_id')->nullable()->constrained();
    $table->json('metadata')->nullable();
    $table->timestamp('transitioned_at');
    $table->timestamps();

    $table->index(['model_type', 'model_id', 'field']);
});
```

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

final class StateHistory extends Model
{
    protected $fillable = [
        'model_type', 'model_id', 'field',
        'from', 'to', 'user_id', 'metadata', 'transitioned_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'transitioned_at' => 'datetime',
        ];
    }
}

// Trait for models with state history
trait HasStateHistory
{
    public function stateHistories(): MorphMany
    {
        return $this->morphMany(StateHistory::class, 'model');
    }

    public function recordTransition(
        string $field,
        ?string $from,
        string $to,
        ?int $userId = null,
        ?array $metadata = null,
    ): StateHistory {
        return $this->stateHistories()->create([
            'field' => $field,
            'from' => $from,
            'to' => $to,
            'user_id' => $userId ?? auth()->id(),
            'metadata' => $metadata,
            'transitioned_at' => now(),
        ]);
    }
}
```

**Key Points**:
- Polymorphic `state_histories` table — reusable across any model with states
- Record `from`, `to`, `user_id`, and `metadata` for full audit context
- Call `recordTransition()` inside the state manager after successful transition
- Index on `model_type + model_id + field` for efficient history queries

---

### Pattern 346.5: Spatie Model States

**Category**: Package Integration
**Description**: Using spatie/laravel-model-states for declarative state configuration.

```php
<?php

declare(strict_types=1);

namespace App\States\Order;

use Spatie\ModelStates\State;
use Spatie\ModelStates\StateConfig;

abstract class OrderState extends State
{
    abstract public function label(): string;

    public static function config(): StateConfig
    {
        return parent::config()
            ->default(Draft::class)
            ->allowTransition(Draft::class, Pending::class)
            ->allowTransition(Pending::class, Confirmed::class, ConfirmOrderTransition::class)
            ->allowTransition(Confirmed::class, Processing::class)
            ->allowTransition(Processing::class, Shipped::class)
            ->allowTransition(Shipped::class, Delivered::class)
            ->allowTransition([Draft::class, Pending::class, Confirmed::class], Cancelled::class);
    }
}

final class Draft extends OrderState
{
    public function label(): string
    {
        return 'Draft';
    }
}

final class Confirmed extends OrderState
{
    public function label(): string
    {
        return 'Confirmed';
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\States\Order;

use App\Models\Order;
use Spatie\ModelStates\Transition;

final class ConfirmOrderTransition extends Transition
{
    public function __construct(
        private readonly Order $order,
    ) {}

    public function handle(): Order
    {
        $this->order->status = new Confirmed($this->order);
        $this->order->confirmed_at = now();
        $this->order->save();

        event(new \App\Events\OrderConfirmed($this->order->id));

        return $this->order;
    }
}
```

```php
// Model setup
final class Order extends Model
{
    use \Spatie\ModelStates\HasStates;

    protected function casts(): array
    {
        return [
            'status' => OrderState::class,
        ];
    }
}

// Usage
$order->status->transitionTo(Confirmed::class);
$order->status->canTransitionTo(Shipped::class); // bool
```

**Key Points**:
- Spatie model states provide declarative transition config in one place
- Custom transition classes encapsulate side effects (events, timestamps, logging)
- `canTransitionTo()` for UI — show/hide action buttons based on allowed transitions
- States are classes — can hold state-specific behavior and rendering logic

---

### Pattern 346.6: State Machine Testing

**Category**: Testing
**Description**: Testing state transitions, guards, and history recording.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\States;

use App\Enums\OrderStatus;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Order;
use App\Services\OrderStateManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

final class OrderStateManagerTest extends TestCase
{
    use RefreshDatabase;

    private OrderStateManager $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->manager = new OrderStateManager();
    }

    public function test_valid_transition_updates_status(): void
    {
        $order = Order::factory()->create(['status' => OrderStatus::Pending]);

        $result = $this->manager->transition($order, OrderStatus::Confirmed);

        $this->assertEquals(OrderStatus::Confirmed, $result->status);
    }

    public function test_invalid_transition_throws_exception(): void
    {
        $order = Order::factory()->create(['status' => OrderStatus::Delivered]);

        $this->expectException(InvalidStateTransitionException::class);

        $this->manager->transition($order, OrderStatus::Pending);
    }

    public function test_transition_dispatches_event(): void
    {
        Event::fake();
        $order = Order::factory()->create(['status' => OrderStatus::Pending]);

        $this->manager->transition($order, OrderStatus::Confirmed);

        Event::assertDispatched(\App\Events\OrderStatusChanged::class);
    }

    public function test_final_states_have_no_transitions(): void
    {
        $this->assertEmpty(OrderStatus::Delivered->allowedTransitions());
        $this->assertEmpty(OrderStatus::Cancelled->allowedTransitions());
    }

    /**
     * @dataProvider transitionProvider
     */
    public function test_allowed_transitions(
        OrderStatus $from,
        OrderStatus $to,
        bool $expected,
    ): void {
        $this->assertEquals($expected, $this->manager->canTransition($from, $to));
    }

    /**
     * @return array<string, array{OrderStatus, OrderStatus, bool}>
     */
    public static function transitionProvider(): array
    {
        return [
            'draft to pending' => [OrderStatus::Draft, OrderStatus::Pending, true],
            'pending to confirmed' => [OrderStatus::Pending, OrderStatus::Confirmed, true],
            'delivered to pending' => [OrderStatus::Delivered, OrderStatus::Pending, false],
            'cancelled to confirmed' => [OrderStatus::Cancelled, OrderStatus::Confirmed, false],
        ];
    }
}
```

**Key Points**:
- Test every valid transition path — verify state changes correctly
- Test every invalid transition — verify exceptions thrown
- Use `@dataProvider` for transition matrix testing — covers all from/to combinations
- Use `Event::fake()` to verify events without triggering listeners
- Test guards separately — mock order state to isolate guard logic

---

## Best Practices

- **Use PHP 8.3 enums** — type-safe, IDE-friendly, native Eloquent casting
- **Centralize transition logic** — one state manager per entity, not scattered in controllers
- **Guards for business rules** — state graph for flow, guards for conditions
- **Record state history** — every transition logged for audit and debugging
- **Dispatch events on transition** — decouple side effects from state management
- **Test the transition matrix** — cover all valid and invalid paths with data providers
- **Keep states immutable** — enum values never change after deployment; add new states only

---

## Abnormal Case Patterns

1. **Direct status update** — `$order->update(['status' => 'shipped'])` bypassing state manager. Fix: use `$stateManager->transition()` everywhere; add model observer to catch direct writes.

2. **Missing guard on critical transition** — order confirmed without payment. Fix: add `PaymentReceivedGuard` to the `pending->confirmed` transition.

3. **State enum out of sync** — database has status values not in enum. Fix: migration to normalize legacy data; add database constraint matching enum values.

4. **Circular transitions** — `A -> B -> A` creating infinite loops. Fix: review state graph; final states should have empty `allowedTransitions()`.

5. **Lost transition context** — no history of who changed state or why. Fix: always pass `userId` and `metadata` to `recordTransition()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (346.1–346.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel State Machine Specialist — Patterns | EPS v3.2*
