# Test Plan Specialist — Laravel Unit Testing: Domain Layer
# テストプランスペシャリスト — Laravelユニットテスト：ドメイン層
# Chuyen Gia Ke Hoach Test — Unit Test Laravel: Tang Domain

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Domain Layer Unit Testing
**Category**: test-plan
**Purpose**: Test plan for domain layer — entities, value objects, domain services, invariants, state transitions

---

## Metadata

```json
{
  "id": "tps-laravel-unit-domain",
  "technology": "Laravel 11+ Testing",
  "aspect": "Domain Layer Unit Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 310,
  "token_cost": 2100,
  "version": "1.0.0",
  "evidence": [
    "E1: Domain entities — pure PHP classes with business invariants",
    "E2: Value Objects — immutable, self-validating, equality by value",
    "E3: Domain services — stateless orchestration of entity interactions"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-UNIT-DOMAIN |
| **Directory Pattern** | `tests/Unit/Domain/` |
| **Naming Convention** | `{Entity}Test.php`, `{ValueObject}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Unit tests for domain layer — entities, VOs, domain services, invariants |
| **Activation Trigger** | keywords: entity test, value object test, domain test, invariant, state transition |

---

## Test Strategy

Domain tests are **pure PHP** — no framework, no DI container, no database. Instantiate with `new`, assert with Pest expectations. Domain is the most critical layer: target **>=95% coverage**.

---

## Test Cases

### TC-1: Entity Creation with Valid Data
**Priority**: HIGH
**Type**: Unit
**Description**: Verify entity factory method creates valid instance with correct initial state.

```php
it('creates an Order entity with PENDING status', function () {
    $order = Order::create(
        customerId: CustomerId::from('cust-001'),
        items: OrderItemCollection::from([
            OrderItem::create(ProductId::from('prod-1'), quantity: 2, unitPrice: Money::USD(5000)),
        ]),
    );

    expect($order->status())->toBe(OrderStatus::PENDING)
        ->and($order->customerId()->value())->toBe('cust-001')
        ->and($order->items())->toHaveCount(1)
        ->and($order->total()->amount())->toBe(10000);
});
```

### TC-2: Entity Invariant Enforcement
**Priority**: HIGH
**Type**: Unit
**Description**: Verify entity rejects invalid state transitions and data.

```php
it('rejects order with zero items', function () {
    Order::create(
        customerId: CustomerId::from('cust-001'),
        items: OrderItemCollection::from([]),
    );
})->throws(DomainException::class, 'Order must have at least one item');

it('rejects negative quantity in order item', function () {
    OrderItem::create(
        productId: ProductId::from('prod-1'),
        quantity: -1,
        unitPrice: Money::USD(5000),
    );
})->throws(InvalidArgumentException::class, 'Quantity must be positive');
```

### TC-3: Value Object Immutability and Equality
**Priority**: HIGH
**Type**: Unit
**Description**: Verify VOs are immutable and compare by value.

```php
it('compares Money by value, not reference', function () {
    $a = Money::USD(1000);
    $b = Money::USD(1000);
    $c = Money::USD(2000);

    expect($a->equals($b))->toBeTrue()
        ->and($a->equals($c))->toBeFalse();
});

it('returns new instance on Money arithmetic', function () {
    $original = Money::USD(1000);
    $result = $original->add(Money::USD(500));

    expect($result->amount())->toBe(1500)
        ->and($original->amount())->toBe(1000); // unchanged
});
```

### TC-4: State Transition Rules
**Priority**: HIGH
**Type**: Unit
**Description**: Verify allowed and forbidden state transitions.

```php
it('allows PENDING -> CONFIRMED transition', function () {
    $order = Order::create($customerId, $items);
    $order->confirm();

    expect($order->status())->toBe(OrderStatus::CONFIRMED);
});

it('rejects CANCELLED -> CONFIRMED transition', function () {
    $order = Order::create($customerId, $items);
    $order->cancel('changed mind');
    $order->confirm();
})->throws(InvalidStateTransitionException::class);

it('records domain event on status change', function () {
    $order = Order::create($customerId, $items);
    $order->confirm();

    expect($order->pullDomainEvents())
        ->toHaveCount(1)
        ->sequence(fn ($event) => $event->toBeInstanceOf(OrderConfirmed::class));
});
```

### TC-5: Domain Service Logic
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify domain services that orchestrate entity interactions.

```php
it('calculates shipping cost based on weight and destination', function () {
    $calculator = new ShippingCostCalculator();
    $cost = $calculator->calculate(
        weight: Weight::kilograms(5),
        destination: Address::domestic('Tokyo'),
    );

    expect($cost->amount())->toBe(800)
        ->and($cost->currency())->toBe('JPY');
});

it('applies discount rules to order total', function () {
    $discount = new VolumeDiscountPolicy();
    $result = $discount->apply(
        total: Money::USD(10000),
        itemCount: 10,
    );

    expect($result->discountAmount()->amount())->toBe(500) // 5% for 10+ items
        ->and($result->finalTotal()->amount())->toBe(9500);
});
```

### TC-6: Collection Value Objects
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify typed collections enforce element constraints.

```php
it('calculates total from item collection', function () {
    $items = OrderItemCollection::from([
        OrderItem::create(ProductId::from('p1'), 2, Money::USD(1000)),
        OrderItem::create(ProductId::from('p2'), 1, Money::USD(3000)),
    ]);

    expect($items->total()->amount())->toBe(5000);
});

it('prevents duplicate products in collection', function () {
    OrderItemCollection::from([
        OrderItem::create(ProductId::from('p1'), 2, Money::USD(1000)),
        OrderItem::create(ProductId::from('p1'), 1, Money::USD(2000)),
    ]);
})->throws(DomainException::class, 'Duplicate product');
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Entity creation | 100% of factory methods | Every constructor path |
| Invariant enforcement | 100% of validation rules | Business rule protection |
| Value object equality | 100% of VOs | Correctness of comparisons |
| State transitions | 100% of allowed + forbidden | State machine integrity |
| Domain events | 100% of event-producing methods | Event contract verification |
| Domain services | >=90% | Business calculation accuracy |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Use Eloquent model as domain entity in test | Couples domain to ORM | Pure PHP entity class |
| 2 | Mock domain entity internals | Domain is pure — no deps to mock | Test with real instances |
| 3 | Test only happy path | Misses invariant violations | >=50% negative test cases |
| 4 | Assert on private properties via reflection | Fragile — tests implementation | Assert via public API |
| 5 | Share entity instances between tests | Mutation leaks between tests | Fresh instance per test |

---

## Quality Checklist

- [ ] **Q1**: All entity invariants have corresponding test cases?
- [ ] **Q2**: Value objects tested for immutability and equality?
- [ ] **Q3**: State transitions tested for both allowed and forbidden paths?
- [ ] **Q4**: Domain events verified on state changes?
- [ ] **Q5**: No framework dependencies in domain tests (pure PHP)?

---

*Test Plan Specialist — Laravel Unit Testing: Domain Layer v1.0 | EPS v3.2*
