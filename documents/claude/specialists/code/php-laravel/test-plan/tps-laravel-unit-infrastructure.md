# Test Plan Specialist — Laravel Unit Testing: Infrastructure Layer
# テストプランスペシャリスト — Laravelユニットテスト：インフラストラクチャ層
# Chuyen Gia Ke Hoach Test — Unit Test Laravel: Tang Infrastructure

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Infrastructure Layer Unit Testing
**Category**: test-plan
**Purpose**: Test plan for infrastructure layer — repositories, external adapters, service providers, cache adapters

---

## Metadata

```json
{
  "id": "tps-laravel-unit-infrastructure",
  "technology": "Laravel 11+ Testing",
  "aspect": "Infrastructure Layer Unit Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 290,
  "token_cost": 1950,
  "version": "1.0.0",
  "evidence": [
    "E1: Eloquent repository pattern — adapter over domain port interface",
    "E2: Laravel HTTP facade — mockable external API adapter",
    "E3: Service provider binding tests — verify container wiring"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-UNIT-INFRASTRUCTURE |
| **Directory Pattern** | `tests/Unit/Infrastructure/` |
| **Naming Convention** | `{Adapter}Test.php`, `{Repository}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Unit tests for infrastructure layer — repositories, adapters, providers |
| **Activation Trigger** | keywords: repository test, adapter test, provider test, infrastructure test, cache test |

---

## Test Strategy

Infrastructure unit tests verify adapter behavior in isolation. Repository tests use SQLite in-memory or mock Eloquent builders. External service adapters mock HTTP clients. Provider tests verify container bindings. Target **>=80% coverage** (deeper coverage via Feature/integration tests).

---

## Test Cases

### TC-1: Repository — Eloquent Query Logic
**Priority**: HIGH
**Type**: Unit
**Description**: Verify repository methods translate domain queries to Eloquent correctly.

```php
it('finds order by ID and maps to domain entity', function () {
    $model = OrderModel::factory()->create([
        'id' => 'order-001',
        'status' => 'pending',
        'customer_id' => 'cust-001',
    ]);

    $repo = new EloquentOrderRepository();
    $order = $repo->findById(OrderId::from('order-001'));

    expect($order)->toBeInstanceOf(Order::class)
        ->and($order->id()->value())->toBe('order-001')
        ->and($order->status())->toBe(OrderStatus::PENDING);
});

it('returns null when order not found', function () {
    $repo = new EloquentOrderRepository();
    $result = $repo->findById(OrderId::from('nonexistent'));

    expect($result)->toBeNull();
});
```

### TC-2: Repository — Save and Persist
**Priority**: HIGH
**Type**: Unit
**Description**: Verify repository correctly persists domain entities to Eloquent models.

```php
it('persists new order entity to database', function () {
    $order = Order::create(
        customerId: CustomerId::from('cust-001'),
        items: $validItems,
    );

    $repo = new EloquentOrderRepository();
    $repo->save($order);

    $this->assertDatabaseHas('orders', [
        'id' => $order->id()->value(),
        'customer_id' => 'cust-001',
        'status' => 'pending',
    ]);
});

it('updates existing order on save', function () {
    OrderModel::factory()->create(['id' => 'order-001', 'status' => 'pending']);

    $order = Order::reconstitute('order-001', OrderStatus::CONFIRMED, $data);
    $repo = new EloquentOrderRepository();
    $repo->save($order);

    $this->assertDatabaseHas('orders', [
        'id' => 'order-001',
        'status' => 'confirmed',
    ]);
});
```

### TC-3: External Service Adapter — HTTP Client
**Priority**: HIGH
**Type**: Unit
**Description**: Verify adapters handle external API responses correctly.

```php
it('fetches exchange rate from external API', function () {
    Http::fake([
        'api.exchangerate.com/*' => Http::response([
            'rates' => ['JPY' => 149.50],
        ], 200),
    ]);

    $adapter = new ExchangeRateApiAdapter();
    $rate = $adapter->getRate('USD', 'JPY');

    expect($rate)->toBe(149.50);
    Http::assertSent(fn ($request) => str_contains($request->url(), 'USD'));
});

it('throws ExternalServiceException on API failure', function () {
    Http::fake([
        'api.exchangerate.com/*' => Http::response([], 500),
    ]);

    $adapter = new ExchangeRateApiAdapter();
    $adapter->getRate('USD', 'JPY');
})->throws(ExternalServiceException::class);

it('returns cached rate when API is unavailable', function () {
    Cache::put('exchange_rate:USD:JPY', 149.00, 3600);
    Http::fake([
        'api.exchangerate.com/*' => Http::response([], 503),
    ]);

    $adapter = new ExchangeRateApiAdapter();
    $rate = $adapter->getRate('USD', 'JPY');

    expect($rate)->toBe(149.00); // fallback to cache
});
```

### TC-4: Service Provider Binding Verification
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify provider registers correct interface-to-concrete bindings.

```php
it('binds OrderRepositoryInterface to EloquentOrderRepository', function () {
    $resolved = app(OrderRepositoryInterface::class);

    expect($resolved)->toBeInstanceOf(EloquentOrderRepository::class);
});

it('registers PaymentGateway as singleton', function () {
    $instance1 = app(PaymentGatewayInterface::class);
    $instance2 = app(PaymentGatewayInterface::class);

    expect($instance1)->toBe($instance2); // same instance
});

it('registers deferred provider with correct provides()', function () {
    $provider = new ReportServiceProvider(app());

    expect($provider->provides())
        ->toContain(ReportGeneratorInterface::class);
});
```

### TC-5: Cache Adapter
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify cache adapter handles hit, miss, and invalidation.

```php
it('returns cached value on hit', function () {
    Cache::put('order:order-001', $serializedOrder, 3600);

    $adapter = new CachedOrderRepository($innerRepo);
    $result = $adapter->findById(OrderId::from('order-001'));

    expect($result)->toBeInstanceOf(Order::class);
    // Inner repo should NOT be called
});

it('falls through to inner repo on cache miss', function () {
    $innerRepo = Mockery::mock(OrderRepositoryInterface::class);
    $innerRepo->shouldReceive('findById')->once()->andReturn($order);

    $adapter = new CachedOrderRepository($innerRepo);
    $result = $adapter->findById(OrderId::from('order-001'));

    expect($result)->toBeInstanceOf(Order::class);
});

it('invalidates cache on save', function () {
    Cache::put('order:order-001', $data, 3600);

    $adapter = new CachedOrderRepository($innerRepo);
    $adapter->save($order);

    expect(Cache::has('order:order-001'))->toBeFalse();
});
```

### TC-6: Queue Job Serialization
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify jobs serialize and deserialize correctly.

```php
it('serializes ProcessPaymentJob with correct payload', function () {
    $job = new ProcessPaymentJob(orderId: 'order-001', amount: 5000);

    $serialized = serialize($job);
    $deserialized = unserialize($serialized);

    expect($deserialized->orderId)->toBe('order-001')
        ->and($deserialized->amount)->toBe(5000);
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Repository CRUD | 100% of port methods | Data integrity |
| External adapters | >=90% (happy + error) | Failure resilience |
| Provider bindings | 100% of interface bindings | DI correctness |
| Cache hit/miss/invalidation | 100% of paths | Cache consistency |
| Job serialization | 100% of job classes | Queue reliability |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test Eloquent query builder internals | Tests framework, not your code | Test repository public API |
| 2 | Use real external APIs in unit test | Slow, flaky, costs money | Http::fake() or Mockery |
| 3 | Skip error/timeout scenarios for adapters | Production fails on first API outage | Test 4xx, 5xx, timeout |
| 4 | Hardcode test data in provider test | Fragile — breaks on config change | Use app() resolution |
| 5 | Test cache without invalidation scenario | Stale data in production | Always test write-through |

---

## Quality Checklist

- [ ] **Q1**: All repository port methods tested (CRUD + query)?
- [ ] **Q2**: External adapters tested with Http::fake() (success + failure)?
- [ ] **Q3**: Provider bindings verified (interface -> concrete, singleton)?
- [ ] **Q4**: Cache adapter tested for hit, miss, and invalidation?

---

*Test Plan Specialist — Laravel Unit Testing: Infrastructure Layer v1.0 | EPS v3.2*
