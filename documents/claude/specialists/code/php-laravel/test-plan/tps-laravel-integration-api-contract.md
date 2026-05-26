# Test Plan Specialist — Laravel API Contract Testing
# テストプランスペシャリスト — Laravel APIコントラクトテスト
# Chuyen Gia Ke Hoach Test — API Contract Test Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: API Contract Testing
**Category**: test-plan
**Purpose**: Test plan for API contract testing — endpoint validation, request/response schemas, versioning, OpenAPI compliance

---

## Metadata

```json
{
  "id": "tps-laravel-integration-api-contract",
  "technology": "Laravel 11+ Testing",
  "aspect": "API Contract Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 290,
  "token_cost": 1950,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel HTTP testing — assertJson, assertJsonStructure",
    "E2: OpenAPI/Swagger validation — response schema compliance",
    "E3: API versioning — URI prefix or header-based version routing"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-INTEGRATION-API-CONTRACT |
| **Directory Pattern** | `tests/Feature/Api/` |
| **Naming Convention** | `{Resource}ApiTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | API contract tests — endpoint schemas, versioning, backward compatibility |
| **Activation Trigger** | keywords: api test, contract test, endpoint test, schema test, openapi, swagger |

---

## Test Strategy

API contract tests verify that endpoints conform to documented schemas. Every route must have a test. Tests validate JSON structure, field types, HTTP status codes, pagination format, and error response consistency. Use `assertJsonStructure()` for contract assertions.

---

## Test Cases

### TC-1: Endpoint Response Schema Validation
**Priority**: HIGH
**Type**: Integration
**Description**: Verify each endpoint returns the documented JSON structure.

```php
it('returns order with correct JSON structure', function () {
    $order = OrderModel::factory()
        ->has(OrderItemModel::factory()->count(2), 'items')
        ->create();

    $response = $this->actingAs($user)
        ->getJson("/api/v1/orders/{$order->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'id',
                'status',
                'customer_id',
                'total_amount',
                'items' => [
                    '*' => ['id', 'product_id', 'quantity', 'unit_price', 'subtotal'],
                ],
                'created_at',
                'updated_at',
            ],
        ]);
});

it('returns correct field types in response', function () {
    $order = OrderModel::factory()->create(['total_amount' => 15000]);

    $response = $this->actingAs($user)
        ->getJson("/api/v1/orders/{$order->id}");

    $data = $response->json('data');
    expect($data['id'])->toBeString()
        ->and($data['total_amount'])->toBeInt()
        ->and($data['status'])->toBeString()
        ->and($data['created_at'])->toBeString();
});
```

### TC-2: Paginated List Endpoint
**Priority**: HIGH
**Type**: Integration
**Description**: Verify list endpoints return consistent pagination format.

```php
it('returns paginated orders with meta information', function () {
    OrderModel::factory()->count(25)->create(['customer_id' => $user->id]);

    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders?page=2&per_page=10');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['*' => ['id', 'status', 'total_amount']],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            'links' => ['first', 'last', 'prev', 'next'],
        ])
        ->assertJsonPath('meta.current_page', 2)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonCount(10, 'data');
});

it('returns empty data array when no results', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders?status=nonexistent');

    $response->assertStatus(200)
        ->assertJsonPath('data', [])
        ->assertJsonPath('meta.total', 0);
});
```

### TC-3: Create Endpoint — Request Validation
**Priority**: HIGH
**Type**: Integration
**Description**: Verify create endpoint validates input and returns 422 with field-level errors.

```php
it('returns 422 with field errors on invalid input', function () {
    $response = $this->actingAs($user)
        ->postJson('/api/v1/orders', [
            'customer_id' => '',
            'items' => 'not-an-array',
        ]);

    $response->assertStatus(422)
        ->assertJsonStructure([
            'message',
            'errors' => ['customer_id', 'items'],
        ]);
});

it('returns 201 with created resource on valid input', function () {
    $response = $this->actingAs($user)
        ->postJson('/api/v1/orders', $validPayload);

    $response->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'status']])
        ->assertJsonPath('data.status', 'pending');
});

it('includes Location header on 201 response', function () {
    $response = $this->actingAs($user)
        ->postJson('/api/v1/orders', $validPayload);

    $response->assertStatus(201)
        ->assertHeader('Location');
});
```

### TC-4: Error Response Consistency
**Priority**: HIGH
**Type**: Integration
**Description**: Verify all error responses follow the same structure.

```php
it('returns consistent error format for 404', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders/nonexistent');

    $response->assertStatus(404)
        ->assertJsonStructure(['message', 'error_code']);
});

it('returns consistent error format for 403', function () {
    $otherUser = User::factory()->create();
    $order = OrderModel::factory()->create();

    $response = $this->actingAs($otherUser)
        ->getJson("/api/v1/orders/{$order->id}");

    $response->assertStatus(403)
        ->assertJsonStructure(['message', 'error_code']);
});

it('returns consistent error format for 500', function () {
    // Force internal error by mocking service
    $this->mock(GetOrderAction::class)
        ->shouldReceive('execute')
        ->andThrow(new RuntimeException('Unexpected'));

    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders/order-001');

    $response->assertStatus(500)
        ->assertJsonStructure(['message']);
    // Must NOT leak stack trace in production
    expect($response->json('trace'))->toBeNull();
});
```

### TC-5: API Versioning
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify API versioning routes correctly and maintains backward compatibility.

```php
it('serves v1 endpoints under /api/v1/ prefix', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders');

    $response->assertStatus(200);
});

it('returns 404 for unsupported API version', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v99/orders');

    $response->assertStatus(404);
});

it('v1 response schema remains stable (backward compatibility)', function () {
    $order = OrderModel::factory()->create();

    $v1Response = $this->actingAs($user)
        ->getJson("/api/v1/orders/{$order->id}");

    // V1 contract: these fields MUST exist
    $v1Response->assertJsonStructure([
        'data' => ['id', 'status', 'total_amount', 'created_at'],
    ]);
});
```

### TC-6: Content Negotiation and Headers
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify correct content type headers and format negotiation.

```php
it('returns application/json content type', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders');

    $response->assertHeader('Content-Type', 'application/json');
});

it('rejects non-JSON requests to API endpoints', function () {
    $response = $this->actingAs($user)
        ->post('/api/v1/orders', $validPayload, [
            'Content-Type' => 'text/plain',
        ]);

    $response->assertStatus(415); // Unsupported Media Type
});

it('includes rate limit headers', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders');

    $response->assertHeader('X-RateLimit-Limit')
        ->assertHeader('X-RateLimit-Remaining');
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| All API routes | 100% of registered routes | Contract completeness |
| Response structure | Every resource endpoint | Schema compliance |
| Error responses | All HTTP error codes used | Client error handling |
| Pagination | All list endpoints | Frontend integration |
| Versioning | All version prefixes | Backward compatibility |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Assert full JSON body equality | Breaks on any field addition | assertJsonStructure + key fields |
| 2 | Skip error response testing | Client can't handle errors | Test all error codes |
| 3 | Hardcode IDs in URL | Fragile, clashes | Use factory-generated resources |
| 4 | Test without authentication | Misses auth integration | actingAs() with user |
| 5 | No pagination tests | Frontend breaks on large datasets | Test page, per_page, meta |

---

## Quality Checklist

- [ ] **Q1**: All API routes covered with contract tests?
- [ ] **Q2**: Response JSON structure validated (not just status code)?
- [ ] **Q3**: Error response format consistent across all endpoints?
- [ ] **Q4**: Pagination meta/links structure tested?

---

*Test Plan Specialist — Laravel API Contract Testing v1.0 | EPS v3.2*
