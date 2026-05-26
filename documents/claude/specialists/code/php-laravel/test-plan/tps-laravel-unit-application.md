# Test Plan Specialist — Laravel Unit Testing: Application Layer
# テストプランスペシャリスト — Laravelユニットテスト：アプリケーション層
# Chuyen Gia Ke Hoach Test — Unit Test Laravel: Tang Application

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Application Layer Unit Testing
**Category**: test-plan
**Purpose**: Test plan for application layer — services, actions, command/query handlers, DTOs, data mappers

---

## Metadata

```json
{
  "id": "tps-laravel-unit-application",
  "technology": "Laravel 11+ Testing",
  "aspect": "Application Layer Unit Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 300,
  "token_cost": 2000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Actions pattern — single-responsibility service classes",
    "E2: Mockery integration — mock interfaces for port isolation",
    "E3: Data Transfer Objects — immutable input/output boundaries"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-UNIT-APPLICATION |
| **Directory Pattern** | `tests/Unit/Application/` |
| **Naming Convention** | `{Action}Test.php`, `{Service}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Unit tests for application layer — services, actions, handlers, DTOs |
| **Activation Trigger** | keywords: action test, service test, handler test, dto test, application test |

---

## Test Strategy

Application layer tests mock **all port interfaces** (repository, event dispatcher, external services) using Mockery. Focus on orchestration logic: correct method calls, correct order, correct error handling. Target **>=90% coverage**.

---

## Test Cases

### TC-1: Action/Service Happy Path
**Priority**: HIGH
**Type**: Unit
**Description**: Verify action executes successfully with valid input and correct port interactions.

```php
it('creates an order and dispatches OrderCreated event', function () {
    $repo = Mockery::mock(OrderRepositoryInterface::class);
    $dispatcher = Mockery::mock(EventDispatcherInterface::class);

    $repo->shouldReceive('save')
        ->once()
        ->andReturnUsing(fn (Order $order) => $order);

    $dispatcher->shouldReceive('dispatch')
        ->once()
        ->with(Mockery::type(OrderCreated::class));

    $action = new CreateOrderAction($repo, $dispatcher);
    $result = $action->execute(new CreateOrderDto(
        customerId: 'cust-001',
        items: [['productId' => 'prod-1', 'quantity' => 2, 'unitPrice' => 5000]],
    ));

    expect($result->id)->not->toBeEmpty()
        ->and($result->status)->toBe('pending');
});
```

### TC-2: Action Error Handling — Domain Exception
**Priority**: HIGH
**Type**: Unit
**Description**: Verify action propagates domain exceptions without catching them silently.

```php
it('throws when order has no items', function () {
    $repo = Mockery::mock(OrderRepositoryInterface::class);
    $dispatcher = Mockery::mock(EventDispatcherInterface::class);

    $repo->shouldNotReceive('save');
    $dispatcher->shouldNotReceive('dispatch');

    $action = new CreateOrderAction($repo, $dispatcher);
    $action->execute(new CreateOrderDto(
        customerId: 'cust-001',
        items: [],
    ));
})->throws(DomainException::class, 'at least one item');
```

### TC-3: Action Error Handling — Infrastructure Failure
**Priority**: HIGH
**Type**: Unit
**Description**: Verify action handles repository failures gracefully.

```php
it('does not dispatch event when save fails', function () {
    $repo = Mockery::mock(OrderRepositoryInterface::class);
    $dispatcher = Mockery::mock(EventDispatcherInterface::class);

    $repo->shouldReceive('save')
        ->once()
        ->andThrow(new RuntimeException('DB connection lost'));

    $dispatcher->shouldNotReceive('dispatch');

    $action = new CreateOrderAction($repo, $dispatcher);
    $action->execute(new CreateOrderDto(
        customerId: 'cust-001',
        items: [['productId' => 'prod-1', 'quantity' => 1, 'unitPrice' => 1000]],
    ));
})->throws(RuntimeException::class, 'DB connection lost');
```

### TC-4: DTO Validation and Transformation
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify DTOs validate input and transform correctly.

```php
it('creates DTO from valid array data', function () {
    $dto = CreateOrderDto::fromArray([
        'customer_id' => 'cust-001',
        'items' => [
            ['product_id' => 'prod-1', 'quantity' => 2, 'unit_price' => 5000],
        ],
    ]);

    expect($dto->customerId)->toBe('cust-001')
        ->and($dto->items)->toHaveCount(1);
});

it('rejects DTO with missing required fields', function () {
    CreateOrderDto::fromArray([
        'items' => [],
    ]);
})->throws(ValidationException::class);
```

### TC-5: Command/Query Handler Orchestration
**Priority**: HIGH
**Type**: Unit
**Description**: Verify CQRS handlers route correctly and return expected results.

```php
it('handles GetOrderQuery and returns order DTO', function () {
    $repo = Mockery::mock(OrderRepositoryInterface::class);
    $repo->shouldReceive('findById')
        ->with('order-001')
        ->once()
        ->andReturn(Order::create($customerId, $items));

    $handler = new GetOrderHandler($repo);
    $result = $handler->handle(new GetOrderQuery(orderId: 'order-001'));

    expect($result)->toBeInstanceOf(OrderResponseDto::class)
        ->and($result->id)->toBe('order-001');
});

it('throws OrderNotFoundException for unknown order', function () {
    $repo = Mockery::mock(OrderRepositoryInterface::class);
    $repo->shouldReceive('findById')
        ->with('unknown')
        ->andReturnNull();

    $handler = new GetOrderHandler($repo);
    $handler->handle(new GetOrderQuery(orderId: 'unknown'));
})->throws(OrderNotFoundException::class);
```

### TC-6: Data Mapper Accuracy
**Priority**: HIGH
**Type**: Unit
**Description**: Verify mappers correctly convert between domain entities and DTOs.

```php
it('maps Order entity to OrderResponseDto with all fields', function () {
    $order = Order::create($customerId, $items);
    $dto = OrderMapper::toResponse($order);

    expect($dto->id)->toBe($order->id()->value())
        ->and($dto->status)->toBe($order->status()->value)
        ->and($dto->totalAmount)->toBe($order->total()->amount())
        ->and($dto->itemCount)->toBe($order->items()->count());
});

it('maps CreateOrderDto to Order entity', function () {
    $dto = new CreateOrderDto(customerId: 'cust-001', items: $itemsArray);
    $entity = OrderMapper::toDomain($dto);

    expect($entity)->toBeInstanceOf(Order::class)
        ->and($entity->customerId()->value())->toBe('cust-001');
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Action happy path | 100% of actions | Core business flow |
| Action error paths | >=90% of error branches | Production failure handling |
| DTO validation | 100% of DTO classes | Input boundary integrity |
| Mappers | 100% of mapper methods | Data accuracy — wrong field = production bug |
| Event dispatch | 100% of event-producing actions | Event contract verification |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Use real DB in action test | Tests infrastructure, not orchestration | Mock repository interface |
| 2 | Test Mockery call counts without business reason | Fragile — implementation coupling | Assert behavior outcomes |
| 3 | Skip error path testing | Production bugs from unhandled exceptions | Test all catch/throw paths |
| 4 | Create DTO without validation in test | Bypasses real input constraints | Use factory method with validation |
| 5 | Mock the action itself in action test | Tests nothing useful | Mock dependencies, test SUT |

---

## Quality Checklist

- [ ] **Q1**: All actions/services have happy path + error path tests?
- [ ] **Q2**: Port interfaces mocked via Mockery (no real infrastructure)?
- [ ] **Q3**: DTOs tested for validation rules (valid + invalid input)?
- [ ] **Q4**: Mappers tested for field accuracy (every field mapped)?

---

*Test Plan Specialist — Laravel Unit Testing: Application Layer v1.0 | EPS v3.2*
