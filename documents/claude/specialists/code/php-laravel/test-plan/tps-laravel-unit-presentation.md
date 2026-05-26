# Test Plan Specialist — Laravel Unit Testing: Presentation Layer
# テストプランスペシャリスト — Laravelユニットテスト：プレゼンテーション層
# Chuyen Gia Ke Hoach Test — Unit Test Laravel: Tang Presentation

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Presentation Layer Unit Testing
**Category**: test-plan
**Purpose**: Test plan for presentation layer — controllers, form requests, middleware, API resources, exception handlers

---

## Metadata

```json
{
  "id": "tps-laravel-unit-presentation",
  "technology": "Laravel 11+ Testing",
  "aspect": "Presentation Layer Unit Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 310,
  "token_cost": 2100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Form Requests — dedicated validation classes",
    "E2: API Resources — JSON transformation layer",
    "E3: Middleware — request/response pipeline hooks"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-UNIT-PRESENTATION |
| **Directory Pattern** | `tests/Unit/Http/` |
| **Naming Convention** | `{Controller}Test.php`, `{Request}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Unit tests for presentation layer — controllers, form requests, middleware, resources |
| **Activation Trigger** | keywords: controller test, form request test, middleware test, resource test, presentation test |

---

## Test Strategy

Presentation layer is **thin** — it delegates to application services. Tests verify correct delegation, HTTP status codes, request validation rules, middleware behavior, and resource JSON structure. Mock all application services. Target **>=80% for controllers, >=95% for form requests and middleware**.

---

## Test Cases

### TC-1: Controller — Delegates to Action and Returns Correct Status
**Priority**: HIGH
**Type**: Unit
**Description**: Verify controller calls correct action and returns proper HTTP response.

```php
it('returns 201 with order data on successful creation', function () {
    $this->mock(CreateOrderAction::class)
        ->shouldReceive('execute')
        ->once()
        ->andReturn(new OrderResponseDto(
            id: 'order-001',
            status: 'pending',
            totalAmount: 10000,
        ));

    $response = $this->postJson('/api/v1/orders', [
        'customer_id' => 'cust-001',
        'items' => [['product_id' => 'prod-1', 'quantity' => 2, 'unit_price' => 5000]],
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.id', 'order-001')
        ->assertJsonPath('data.status', 'pending');
});

it('returns 404 when order not found', function () {
    $this->mock(GetOrderAction::class)
        ->shouldReceive('execute')
        ->andThrow(new OrderNotFoundException('order-999'));

    $response = $this->getJson('/api/v1/orders/order-999');

    $response->assertStatus(404)
        ->assertJsonPath('message', 'Order not found');
});
```

### TC-2: Form Request — Validation Rules
**Priority**: HIGH
**Type**: Unit
**Description**: Verify form request validation accepts valid and rejects invalid data.

```php
it('passes validation with valid order data', function () {
    $request = new StoreOrderRequest();
    $validator = Validator::make([
        'customer_id' => 'cust-001',
        'items' => [
            ['product_id' => 'prod-1', 'quantity' => 2, 'unit_price' => 5000],
        ],
    ], $request->rules());

    expect($validator->passes())->toBeTrue();
});

it('fails when customer_id is missing', function () {
    $request = new StoreOrderRequest();
    $validator = Validator::make([
        'items' => [['product_id' => 'prod-1', 'quantity' => 1, 'unit_price' => 1000]],
    ], $request->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('customer_id'))->toBeTrue();
});

it('fails when quantity is zero or negative', function () {
    $request = new StoreOrderRequest();
    $validator = Validator::make([
        'customer_id' => 'cust-001',
        'items' => [['product_id' => 'prod-1', 'quantity' => 0, 'unit_price' => 1000]],
    ], $request->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('items.0.quantity'))->toBeTrue();
});

it('rejects items array exceeding max limit', function () {
    $items = array_fill(0, 101, ['product_id' => 'p1', 'quantity' => 1, 'unit_price' => 100]);

    $request = new StoreOrderRequest();
    $validator = Validator::make([
        'customer_id' => 'cust-001',
        'items' => $items,
    ], $request->rules());

    expect($validator->fails())->toBeTrue();
});
```

### TC-3: Middleware — Request Filtering
**Priority**: HIGH
**Type**: Unit
**Description**: Verify middleware correctly filters, modifies, or rejects requests.

```php
it('adds tenant ID header from authenticated user', function () {
    $user = User::factory()->make(['tenant_id' => 'tenant-001']);
    $request = Request::create('/api/v1/orders', 'GET');
    $request->setUserResolver(fn () => $user);

    $middleware = new TenantScopeMiddleware();
    $response = $middleware->handle($request, fn ($req) => response('OK'));

    expect($request->headers->get('X-Tenant-ID'))->toBe('tenant-001');
});

it('rejects request without authentication', function () {
    $request = Request::create('/api/v1/orders', 'GET');
    $request->setUserResolver(fn () => null);

    $middleware = new TenantScopeMiddleware();
    $middleware->handle($request, fn ($req) => response('OK'));
})->throws(AuthenticationException::class);
```

### TC-4: API Resource — JSON Structure
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify API resource transforms model data to correct JSON structure.

```php
it('transforms order to JSON with correct structure', function () {
    $order = OrderModel::factory()->make([
        'id' => 'order-001',
        'status' => 'confirmed',
        'total_amount' => 15000,
        'created_at' => '2026-01-15 10:00:00',
    ]);

    $resource = new OrderResource($order);
    $json = $resource->toArray(request());

    expect($json)->toHaveKeys(['id', 'status', 'total_amount', 'created_at'])
        ->and($json['id'])->toBe('order-001')
        ->and($json['total_amount'])->toBe(15000)
        ->and($json)->not->toHaveKey('updated_at'); // excluded
});

it('includes relationships when loaded', function () {
    $order = OrderModel::factory()->make();
    $order->setRelation('items', OrderItemModel::factory()->count(2)->make());

    $resource = new OrderResource($order);
    $json = $resource->toArray(request());

    expect($json['items'])->toHaveCount(2);
});
```

### TC-5: Exception Handler — Domain to HTTP Mapping
**Priority**: HIGH
**Type**: Unit
**Description**: Verify exception handler maps domain exceptions to correct HTTP responses.

```php
it('maps OrderNotFoundException to 404', function () {
    $response = $this->getJson('/api/v1/orders/nonexistent');

    $response->assertStatus(404)
        ->assertJsonStructure(['message', 'error_code']);
});

it('maps ValidationException to 422 with field errors', function () {
    $response = $this->postJson('/api/v1/orders', []);

    $response->assertStatus(422)
        ->assertJsonStructure(['message', 'errors']);
});

it('maps DomainException to 409 Conflict', function () {
    $this->mock(ConfirmOrderAction::class)
        ->shouldReceive('execute')
        ->andThrow(new InvalidStateTransitionException('Cannot confirm cancelled order'));

    $response = $this->putJson('/api/v1/orders/order-001/confirm');

    $response->assertStatus(409);
});
```

### TC-6: Controller — Pagination and Filtering
**Priority**: MEDIUM
**Type**: Unit
**Description**: Verify controller passes pagination and filter params correctly.

```php
it('passes pagination params to list action', function () {
    $this->mock(ListOrdersAction::class)
        ->shouldReceive('execute')
        ->withArgs(fn ($dto) => $dto->page === 2 && $dto->perPage === 15)
        ->once()
        ->andReturn($paginatedResult);

    $response = $this->getJson('/api/v1/orders?page=2&per_page=15');

    $response->assertStatus(200)
        ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Controller endpoints | 100% of routes | Every endpoint exercised |
| HTTP status codes | All used codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 500) | Response contract |
| Form request rules | 100% of validation rules | Security-critical input validation |
| Middleware | >=95% branches | Security pipeline integrity |
| API resources | 100% of resource classes | JSON contract accuracy |
| Exception mapping | 100% of domain exception types | Error response contract |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test business logic in controller test | Controller is thin — logic in application layer | Verify delegation only |
| 2 | Skip form request validation tests | Lets invalid data reach application layer | Test every rule |
| 3 | Assert full JSON body in controller test | Fragile — breaks on any field addition | Assert key fields only |
| 4 | Test middleware with real auth provider | Slow, external dependency | Mock user resolver |
| 5 | Forget to test error response structure | Client can't parse errors | Test error JSON schema |

---

## Quality Checklist

- [ ] **Q1**: All controller endpoints tested (success + error responses)?
- [ ] **Q2**: Form request validation tested (valid + each invalid field)?
- [ ] **Q3**: Middleware tested for allow and deny paths?
- [ ] **Q4**: API resources tested for JSON structure accuracy?
- [ ] **Q5**: Exception handler mappings verified (domain -> HTTP)?

---

*Test Plan Specialist — Laravel Unit Testing: Presentation Layer v1.0 | EPS v3.2*
