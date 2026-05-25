# Laravel Domain Modeling Specialist — Domain
# Laravelドメインモデリングスペシャリスト — ドメイン
# Chuyen Gia Mo Hinh Domain Laravel — Domain

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Domain Modeling
**Aspect**: Domain Modeling
**Category**: domain
**Purpose**: Knowledge provider for pure PHP domain modeling — rich entities, aggregate roots, identity patterns, invariant enforcement, factory methods, domain services, bounded contexts, and domain model testing

---

## Metadata

```json
{
  "id": "laravel-domain-modeling-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Domain Modeling",
  "aspect": "Domain Modeling",
  "category": "domain",
  "subcategory": "php-laravel",
  "lines": 480,
  "token_cost": 3200,
  "version": "1.0.0",
  "evidence": [
    "E1: DDD tactical patterns — entities, aggregates, invariants (Evans 2003)",
    "E2: PHP 8.3 readonly classes + typed properties for immutable domain objects",
    "E3: Framework-independent domain layer — hexagonal architecture inner ring"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 324.1–324.8 |
| **Directory Pattern** | `app/Domain/{Feature}/Entities/` |
| **Naming Convention** | `{Entity}.php` |
| **Imports From** | none (pure domain — no framework dependencies) |
| **Imported By** | Application (use cases), Infrastructure (persistence adapters) |
| **Cannot Import** | Eloquent, Illuminate, any framework package |
| **Dependencies** | none (pure PHP) |
| **When To Use** | Projects requiring domain logic isolation from framework |
| **Source Skeleton** | `app/Domain/{Feature}/Entities/{Entity}.php` |
| **Specialist Type** | code |
| **Purpose** | Pure PHP domain entities — rich behavior, aggregate boundaries, invariants, no framework coupling |
| **Activation Trigger** | files: `app/Domain/*/Entities/*.php`; keywords: Entity, AggregateRoot, DomainModel, Invariant |

---

## Role

You are a **Laravel Domain Modeling Specialist**. Your responsibility is to provide best practices for pure PHP domain modeling within Laravel projects — rich entities free from Eloquent dependencies, aggregate root patterns, identity management, invariant enforcement, factory methods, domain services, bounded context boundaries, and testing strategies for domain models.

**Used by**: Any code agent building domain-driven design layers in Laravel applications
**Not used by**: CRUD-only applications, projects without explicit domain layer separation

---

## Patterns

### Pattern 324.1: Rich Domain Entity

**Category**: Entity Fundamentals
**Description**: Pure PHP domain entity with typed properties, behavior methods, and no framework imports.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Order\Entities;

use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\ValueObjects\OrderId;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\Exceptions\OrderAlreadyShippedException;

final class Order
{
    private OrderStatus $status;

    /** @var array<int, OrderLineItem> */
    private array $lineItems;

    public function __construct(
        private readonly OrderId $id,
        private readonly \DateTimeImmutable $createdAt,
        OrderStatus $status = OrderStatus::Draft,
    ) {
        $this->status = $status;
        $this->lineItems = [];
    }

    public function id(): OrderId
    {
        return $this->id;
    }

    public function status(): OrderStatus
    {
        return $this->status;
    }

    public function addLineItem(OrderLineItem $item): void
    {
        if ($this->status === OrderStatus::Shipped) {
            throw new OrderAlreadyShippedException(
                "Cannot modify order {$this->id} after shipping.",
            );
        }

        $this->lineItems[] = $item;
    }

    public function totalAmount(): Money
    {
        return array_reduce(
            $this->lineItems,
            fn (Money $carry, OrderLineItem $item): Money => $carry->add(
                $item->subtotal(),
            ),
            Money::zero('USD'),
        );
    }

    public function confirm(): void
    {
        if ($this->status !== OrderStatus::Draft) {
            throw new \DomainException(
                "Order {$this->id} must be in Draft status to confirm.",
            );
        }

        if (count($this->lineItems) === 0) {
            throw new \DomainException(
                "Order {$this->id} must have at least one line item.",
            );
        }

        $this->status = OrderStatus::Confirmed;
    }
}
```

**Key Points**:
- No `extends Model`, no Eloquent traits — pure PHP class
- All properties are typed; identity is a value object, not a raw int/string
- Behavior methods (`confirm()`, `addLineItem()`) enforce business rules inline
- Entity is `final` to prevent accidental framework coupling via inheritance

---

### Pattern 324.2: Aggregate Root

**Category**: Aggregate Patterns
**Description**: Aggregate root that controls access to child entities and enforces transactional consistency boundaries.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Entities;

use App\Domain\Inventory\ValueObjects\WarehouseId;
use App\Domain\Inventory\ValueObjects\Sku;
use App\Domain\Inventory\Exceptions\InsufficientStockException;

final class Warehouse
{
    /** @var array<string, StockEntry> */
    private array $stockEntries = [];

    public function __construct(
        private readonly WarehouseId $id,
        private readonly string $name,
        private readonly int $capacityLimit,
    ) {}

    public function id(): WarehouseId
    {
        return $this->id;
    }

    public function receiveStock(Sku $sku, int $quantity): void
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Quantity must be positive.');
        }

        $totalAfter = $this->totalStockCount() + $quantity;
        if ($totalAfter > $this->capacityLimit) {
            throw new \DomainException(
                "Warehouse {$this->name} capacity exceeded: {$totalAfter}/{$this->capacityLimit}.",
            );
        }

        $key = $sku->toString();
        if (isset($this->stockEntries[$key])) {
            $this->stockEntries[$key] = $this->stockEntries[$key]->addQuantity($quantity);
        } else {
            $this->stockEntries[$key] = new StockEntry($sku, $quantity);
        }
    }

    public function releaseStock(Sku $sku, int $quantity): void
    {
        $key = $sku->toString();

        if (!isset($this->stockEntries[$key])) {
            throw InsufficientStockException::forSku($sku, requested: $quantity, available: 0);
        }

        $this->stockEntries[$key] = $this->stockEntries[$key]->subtractQuantity($quantity);
    }

    private function totalStockCount(): int
    {
        return array_sum(
            array_map(
                fn (StockEntry $e): int => $e->quantity(),
                $this->stockEntries,
            ),
        );
    }
}
```

**Key Points**:
- External code never directly manipulates `StockEntry` — only through `Warehouse` methods
- Aggregate root enforces all invariants spanning child entities (capacity limit)
- All mutations go through the root — guarantees transactional consistency
- Child entities (`StockEntry`) are not accessible outside the aggregate boundary

---

### Pattern 324.3: Entity Identity

**Category**: Identity Patterns
**Description**: Strongly-typed entity identity using readonly classes to prevent primitive obsession.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Order\ValueObjects;

final readonly class OrderId
{
    public function __construct(
        private string $value,
    ) {
        if (trim($value) === '') {
            throw new \InvalidArgumentException('OrderId cannot be empty.');
        }
    }

    public static function generate(): self
    {
        return new self(bin2hex(random_bytes(16)));
    }

    public static function fromString(string $value): self
    {
        return new self($value);
    }

    public function toString(): string
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

**Key Points**:
- `readonly class` (PHP 8.2+) prevents mutation after construction
- `generate()` factory for new entities; `fromString()` for reconstitution from persistence
- `equals()` for identity comparison — entities are equal when IDs match
- Validation in constructor prevents invalid identity states

---

### Pattern 324.4: Invariant Enforcement

**Category**: Domain Integrity
**Description**: Guard clauses and self-validating entities that reject invalid state transitions.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Subscription\Entities;

use App\Domain\Subscription\Enums\PlanTier;
use App\Domain\Subscription\ValueObjects\SubscriptionId;
use App\Domain\Subscription\ValueObjects\DateRange;

final class Subscription
{
    private bool $cancelled = false;

    public function __construct(
        private readonly SubscriptionId $id,
        private PlanTier $tier,
        private DateRange $billingPeriod,
        private readonly int $maxSeats,
        private int $usedSeats = 0,
    ) {
        $this->guardMaxSeats($maxSeats);
    }

    public function assignSeat(): void
    {
        $this->guardNotCancelled();

        if ($this->usedSeats >= $this->maxSeats) {
            throw new \DomainException(
                "Subscription {$this->id} seat limit reached: {$this->maxSeats}.",
            );
        }

        $this->usedSeats++;
    }

    public function upgradeTier(PlanTier $newTier): void
    {
        $this->guardNotCancelled();

        if ($newTier->value <= $this->tier->value) {
            throw new \DomainException(
                "Cannot downgrade via upgradeTier(). Current: {$this->tier->name}, requested: {$newTier->name}.",
            );
        }

        $this->tier = $newTier;
    }

    public function cancel(): void
    {
        $this->guardNotCancelled();
        $this->cancelled = true;
    }

    private function guardNotCancelled(): void
    {
        if ($this->cancelled) {
            throw new \DomainException(
                "Subscription {$this->id} is cancelled — no modifications allowed.",
            );
        }
    }

    private function guardMaxSeats(int $maxSeats): void
    {
        if ($maxSeats <= 0) {
            throw new \InvalidArgumentException('maxSeats must be at least 1.');
        }
    }
}
```

**Key Points**:
- Guard clauses (`guardNotCancelled()`) centralize repeated invariant checks
- Constructor validates initial state — entity is never in an invalid state
- State transitions validate preconditions before mutation
- Enum-backed tiers enable compile-time safety for plan hierarchy

---

### Pattern 324.5: Factory Method

**Category**: Creation Patterns
**Description**: Named constructors and factory methods for domain entity creation with clear intent.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Customer\Entities;

use App\Domain\Customer\ValueObjects\CustomerId;
use App\Domain\Customer\ValueObjects\EmailAddress;
use App\Domain\Customer\Enums\CustomerType;

final class Customer
{
    private function __construct(
        private readonly CustomerId $id,
        private readonly string $name,
        private readonly EmailAddress $email,
        private readonly CustomerType $type,
        private readonly \DateTimeImmutable $registeredAt,
    ) {}

    public static function register(
        string $name,
        EmailAddress $email,
    ): self {
        return new self(
            id: CustomerId::generate(),
            name: $name,
            email: $email,
            type: CustomerType::Individual,
            registeredAt: new \DateTimeImmutable(),
        );
    }

    public static function registerCorporate(
        string $companyName,
        EmailAddress $contactEmail,
    ): self {
        return new self(
            id: CustomerId::generate(),
            name: $companyName,
            email: $contactEmail,
            type: CustomerType::Corporate,
            registeredAt: new \DateTimeImmutable(),
        );
    }

    public static function reconstitute(
        CustomerId $id,
        string $name,
        EmailAddress $email,
        CustomerType $type,
        \DateTimeImmutable $registeredAt,
    ): self {
        return new self(
            id: $id,
            name: $name,
            email: $email,
            type: $type,
            registeredAt: $registeredAt,
        );
    }

    public function id(): CustomerId
    {
        return $this->id;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function type(): CustomerType
    {
        return $this->type;
    }
}
```

**Key Points**:
- Private constructor forces callers to use named factory methods with clear intent
- `register()` vs `registerCorporate()` — different creation contexts, same entity class
- `reconstitute()` for hydration from persistence — bypasses business logic validation
- Factory methods generate identity internally — callers don't manage IDs

---

### Pattern 324.6: Domain Service (Pure PHP)

**Category**: Domain Services
**Description**: Stateless domain service for logic that doesn't belong to a single entity.

```php
<?php

declare(strict_types=1);

namespace App\Domain\Pricing\Services;

use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Pricing\ValueObjects\Discount;
use App\Domain\Order\Entities\Order;
use App\Domain\Customer\Entities\Customer;
use App\Domain\Customer\Enums\CustomerType;

final readonly class PricingService
{
    /**
     * @param array<int, Discount> $activeDiscounts
     */
    public function calculateFinalPrice(
        Order $order,
        Customer $customer,
        array $activeDiscounts,
    ): Money {
        $baseTotal = $order->totalAmount();

        $discount = $this->selectBestDiscount(
            $baseTotal,
            $customer->type(),
            $activeDiscounts,
        );

        return $discount !== null
            ? $baseTotal->subtract($discount->amountFor($baseTotal))
            : $baseTotal;
    }

    /**
     * @param array<int, Discount> $discounts
     */
    private function selectBestDiscount(
        Money $baseTotal,
        CustomerType $customerType,
        array $discounts,
    ): ?Discount {
        $applicable = array_filter(
            $discounts,
            fn (Discount $d): bool => $d->isApplicableTo($customerType)
                && $d->meetsMinimum($baseTotal),
        );

        if (count($applicable) === 0) {
            return null;
        }

        return array_reduce(
            $applicable,
            fn (?Discount $best, Discount $current): Discount =>
                $best === null || $current->amountFor($baseTotal)->greaterThan($best->amountFor($baseTotal))
                    ? $current
                    : $best,
        );
    }
}
```

**Key Points**:
- `readonly class` — stateless, no mutable fields
- Operates on multiple entities/VOs — logic doesn't naturally belong to Order or Customer
- No framework imports — pure domain logic testable without Laravel
- Returns domain value objects, not primitives

---

### Pattern 324.7: Bounded Context Boundaries

**Category**: Strategic DDD
**Description**: Enforcing boundaries between bounded contexts using separate namespaces and anti-corruption layers.

```php
<?php

declare(strict_types=1);

// === Shipping context references Order context via its own representation ===

namespace App\Domain\Shipping\ValueObjects;

final readonly class ShippableOrderId
{
    public function __construct(
        private string $value,
    ) {}

    public static function fromString(string $value): self
    {
        return new self($value);
    }

    public function toString(): string
    {
        return $this->value;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Domain\Shipping\Entities;

use App\Domain\Shipping\ValueObjects\ShippableOrderId;
use App\Domain\Shipping\ValueObjects\Address;
use App\Domain\Shipping\Enums\ShipmentStatus;

final class Shipment
{
    private ShipmentStatus $status = ShipmentStatus::Pending;

    public function __construct(
        private readonly ShippableOrderId $orderId,
        private readonly Address $destination,
        private readonly float $weightKg,
    ) {
        if ($weightKg <= 0.0) {
            throw new \InvalidArgumentException('Weight must be positive.');
        }
    }

    public function dispatch(): void
    {
        if ($this->status !== ShipmentStatus::Pending) {
            throw new \DomainException('Only pending shipments can be dispatched.');
        }

        $this->status = ShipmentStatus::Dispatched;
    }

    public function orderId(): ShippableOrderId
    {
        return $this->orderId;
    }
}
```

**Key Points**:
- Shipping context uses `ShippableOrderId`, not `App\Domain\Order\ValueObjects\OrderId`
- Each bounded context owns its own identity types — no cross-context imports
- Anti-corruption layer translates between contexts at the application/infrastructure layer
- Namespace structure mirrors bounded context boundaries: `App\Domain\{Context}\`

---

### Pattern 324.8: Domain Model Testing

**Category**: Testing
**Description**: Unit testing pure domain entities without framework test harness.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Order;

use App\Domain\Order\Entities\Order;
use App\Domain\Order\Entities\OrderLineItem;
use App\Domain\Order\Enums\OrderStatus;
use App\Domain\Order\Exceptions\OrderAlreadyShippedException;
use App\Domain\Order\ValueObjects\Money;
use App\Domain\Order\ValueObjects\OrderId;
use PHPUnit\Framework\TestCase;

final class OrderTest extends TestCase
{
    public function test_new_order_has_draft_status(): void
    {
        $order = new Order(
            id: OrderId::generate(),
            createdAt: new \DateTimeImmutable(),
        );

        $this->assertSame(OrderStatus::Draft, $order->status());
    }

    public function test_confirm_requires_at_least_one_line_item(): void
    {
        $order = new Order(
            id: OrderId::generate(),
            createdAt: new \DateTimeImmutable(),
        );

        $this->expectException(\DomainException::class);
        $order->confirm();
    }

    public function test_confirm_transitions_to_confirmed(): void
    {
        $order = new Order(
            id: OrderId::generate(),
            createdAt: new \DateTimeImmutable(),
        );
        $order->addLineItem(
            new OrderLineItem(sku: 'WIDGET-01', quantity: 2, unitPrice: Money::of(1500, 'USD')),
        );

        $order->confirm();

        $this->assertSame(OrderStatus::Confirmed, $order->status());
    }

    public function test_cannot_add_items_after_shipping(): void
    {
        $order = new Order(
            id: OrderId::generate(),
            createdAt: new \DateTimeImmutable(),
            status: OrderStatus::Shipped,
        );

        $this->expectException(OrderAlreadyShippedException::class);
        $order->addLineItem(
            new OrderLineItem(sku: 'WIDGET-01', quantity: 1, unitPrice: Money::of(1000, 'USD')),
        );
    }

    public function test_total_amount_sums_line_items(): void
    {
        $order = new Order(
            id: OrderId::generate(),
            createdAt: new \DateTimeImmutable(),
        );
        $order->addLineItem(
            new OrderLineItem(sku: 'A', quantity: 2, unitPrice: Money::of(1000, 'USD')),
        );
        $order->addLineItem(
            new OrderLineItem(sku: 'B', quantity: 1, unitPrice: Money::of(500, 'USD')),
        );

        $total = $order->totalAmount();

        $this->assertTrue($total->equals(Money::of(2500, 'USD')));
    }
}
```

**Key Points**:
- Extends `PHPUnit\Framework\TestCase`, not `Tests\TestCase` — no Laravel boot needed
- Tests run without database, HTTP kernel, or service container
- Test entity behavior (state transitions, invariant violations), not getters/setters
- Pure domain tests execute in milliseconds — no framework overhead

---

## Best Practices

- **Zero framework imports** — domain entities must never reference `Illuminate\*` or `Eloquent\*`
- **Always-valid entities** — constructor and mutators enforce invariants; no `setStatus()` without guards
- **Aggregate root as consistency boundary** — external code only touches the root, never child entities
- **Typed identity objects** — prevent primitive obsession with `OrderId`, `CustomerId` classes
- **Named constructors over public new** — `Customer::register()` reveals intent better than `new Customer()`
- **Stateless domain services** — use `readonly class` for cross-entity logic
- **Separate namespaces per bounded context** — `App\Domain\Order\`, `App\Domain\Shipping\`
- **Reconstitute vs create** — separate factory for persistence hydration (no business validation)
- **PHPUnit\TestCase for domain tests** — never boot Laravel for pure domain unit tests

---

## Abnormal Case Patterns

1. **Eloquent Model in domain layer** — entity extends `Model` or uses `HasFactory`. Fix: extract pure PHP entity; use repository pattern to map between Eloquent and domain.

2. **Anemic entities with public setters** — `$order->setStatus('confirmed')` bypasses invariants. Fix: replace with behavior methods `$order->confirm()` that enforce preconditions.

3. **Cross-context entity imports** — `Shipment` directly uses `App\Domain\Order\ValueObjects\OrderId`. Fix: create context-local identity type `ShippableOrderId` and translate at the boundary.

4. **Domain logic in controllers** — business rules scattered in HTTP layer. Fix: move logic into entity methods or domain services; controller only orchestrates.

5. **Mutable identity** — entity ID can be changed after construction. Fix: use `readonly` property or value object with no setter.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (324.1–324.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Domain Modeling Specialist — Domain | EPS v3.2*
