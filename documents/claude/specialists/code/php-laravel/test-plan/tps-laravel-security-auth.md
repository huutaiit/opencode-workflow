# Test Plan Specialist — Laravel Authentication & Authorization Testing
# テストプランスペシャリスト — Laravel認証・認可テスト
# Chuyen Gia Ke Hoach Test — Test Xac Thuc & Phan Quyen Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Authentication & Authorization Testing
**Category**: test-plan
**Purpose**: Test plan for authentication testing — Sanctum, Passport, guards, middleware, gates, policies, RBAC matrix

---

## Metadata

```json
{
  "id": "tps-laravel-security-auth",
  "technology": "Laravel 11+ Testing",
  "aspect": "Authentication & Authorization Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 310,
  "token_cost": 2100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Sanctum — SPA/mobile API token authentication",
    "E2: Laravel Gates/Policies — fine-grained authorization",
    "E3: Laravel Guards — multiple authentication drivers"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-SECURITY-AUTH |
| **Directory Pattern** | `tests/Feature/Security/Auth/` |
| **Naming Convention** | `{Guard}AuthTest.php`, `{Policy}AuthorizationTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Authentication and authorization tests — Sanctum, Passport, gates, policies |
| **Activation Trigger** | keywords: auth test, sanctum test, passport test, gate test, policy test, guard test, rbac |

---

## Test Strategy

Auth tests verify that every protected endpoint enforces authentication and authorization correctly. Test both positive (allowed) and negative (denied) paths for every role-endpoint combination. Use `actingAs()` for authenticated requests, raw requests for unauthenticated. Target **100% of role x endpoint matrix**.

---

## Test Cases

### TC-1: Unauthenticated Access Denial
**Priority**: HIGH
**Type**: Integration
**Description**: Verify all protected endpoints reject unauthenticated requests.

```php
it('returns 401 for unauthenticated API request', function () {
    $response = $this->getJson('/api/v1/orders');

    $response->assertStatus(401)
        ->assertJson(['message' => 'Unauthenticated.']);
});

it('returns 401 for expired token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test', expiresAt: now()->subHour());

    $response = $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/orders');

    $response->assertStatus(401);
});

it('returns 401 for revoked token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test');
    $user->tokens()->delete(); // revoke all

    $response = $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/orders');

    $response->assertStatus(401);
});
```

### TC-2: Sanctum Token Authentication
**Priority**: HIGH
**Type**: Integration
**Description**: Verify Sanctum token creation, scoping, and validation.

```php
it('creates API token with abilities', function () {
    $user = User::factory()->create();
    $token = $user->createToken('api-access', ['orders:read', 'orders:create']);

    $response = $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/orders');

    $response->assertStatus(200);
});

it('denies access when token lacks required ability', function () {
    $user = User::factory()->create();
    $token = $user->createToken('read-only', ['orders:read']);

    $response = $this->withToken($token->plainTextToken)
        ->postJson('/api/v1/orders', $validPayload);

    $response->assertStatus(403);
});

it('allows SPA authentication via session cookie', function () {
    $user = User::factory()->create();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertStatus(200);

    // Subsequent requests use session (SPA mode)
    $this->getJson('/api/v1/orders')
        ->assertStatus(200);
});
```

### TC-3: Gate and Policy Authorization
**Priority**: HIGH
**Type**: Integration
**Description**: Verify gates and policies enforce role-based access control.

```php
it('allows admin to delete any order', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $order = OrderModel::factory()->create();

    $response = $this->actingAs($admin)
        ->deleteJson("/api/v1/orders/{$order->id}");

    $response->assertStatus(204);
});

it('denies regular user from deleting others orders', function () {
    $user = User::factory()->create(['role' => 'customer']);
    $otherOrder = OrderModel::factory()->create(); // belongs to another user

    $response = $this->actingAs($user)
        ->deleteJson("/api/v1/orders/{$otherOrder->id}");

    $response->assertStatus(403);
});

it('allows user to view own orders only', function () {
    $user = User::factory()->create();
    $ownOrder = OrderModel::factory()->create(['customer_id' => $user->id]);
    $otherOrder = OrderModel::factory()->create();

    $this->actingAs($user)
        ->getJson("/api/v1/orders/{$ownOrder->id}")
        ->assertStatus(200);

    $this->actingAs($user)
        ->getJson("/api/v1/orders/{$otherOrder->id}")
        ->assertStatus(403);
});
```

### TC-4: RBAC Matrix — Role x Endpoint
**Priority**: HIGH
**Type**: Integration
**Description**: Verify complete role x endpoint authorization matrix.

```php
dataset('rbac_matrix', [
    // [role, method, endpoint, expected_status]
    ['admin', 'GET', '/api/v1/orders', 200],
    ['admin', 'POST', '/api/v1/orders', 201],
    ['admin', 'DELETE', '/api/v1/orders/{id}', 204],
    ['manager', 'GET', '/api/v1/orders', 200],
    ['manager', 'POST', '/api/v1/orders', 201],
    ['manager', 'DELETE', '/api/v1/orders/{id}', 403],
    ['customer', 'GET', '/api/v1/orders', 200],
    ['customer', 'POST', '/api/v1/orders', 201],
    ['customer', 'DELETE', '/api/v1/orders/{id}', 403],
    ['guest', 'GET', '/api/v1/orders', 401],
]);

it('enforces RBAC matrix: {0} {1} {2} -> {3}', function (
    string $role, string $method, string $endpoint, int $expectedStatus
) {
    $user = $role === 'guest' ? null : User::factory()->create(['role' => $role]);
    $order = OrderModel::factory()->create();
    $endpoint = str_replace('{id}', $order->id, $endpoint);

    $request = $user ? $this->actingAs($user) : $this;
    $response = $request->json($method, $endpoint, $method === 'POST' ? $validPayload : []);

    $response->assertStatus($expectedStatus);
})->with('rbac_matrix');
```

### TC-5: IDOR (Insecure Direct Object Reference) Prevention
**Priority**: HIGH
**Type**: Integration
**Description**: Verify users cannot access resources by guessing IDs.

```php
it('prevents IDOR by checking ownership', function () {
    $victim = User::factory()->create();
    $attacker = User::factory()->create();
    $victimOrder = OrderModel::factory()->create(['customer_id' => $victim->id]);

    // Attacker tries to access victim's order by ID
    $response = $this->actingAs($attacker)
        ->getJson("/api/v1/orders/{$victimOrder->id}");

    $response->assertStatus(403); // NOT 200
});

it('prevents IDOR on update endpoint', function () {
    $victim = User::factory()->create();
    $attacker = User::factory()->create();
    $victimOrder = OrderModel::factory()->create(['customer_id' => $victim->id]);

    $response = $this->actingAs($attacker)
        ->putJson("/api/v1/orders/{$victimOrder->id}", ['status' => 'cancelled']);

    $response->assertStatus(403);
});
```

### TC-6: Password and Session Security
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify password hashing, reset flow, and session management.

```php
it('stores password as bcrypt hash, never plaintext', function () {
    $user = User::factory()->create(['password' => 'secret123']);

    expect($user->password)->not->toBe('secret123')
        ->and(Hash::check('secret123', $user->password))->toBeTrue();
});

it('invalidates all sessions on password change', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/profile/password', [
            'current_password' => 'password',
            'password' => 'newPassword123',
            'password_confirmation' => 'newPassword123',
        ])
        ->assertStatus(200);

    // Old session should be invalid
    $this->getJson('/api/v1/orders')
        ->assertStatus(401);
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| RBAC matrix | 100% of role x endpoint | Complete access control |
| Unauthenticated access | 100% of protected endpoints | No bypass |
| Token validation | expired, revoked, invalid, missing ability | Token security |
| IDOR | All resource endpoints | Data isolation |
| Password security | hash storage, reset flow, session invalidation | Credential protection |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test only happy path (authorized user) | Misses 403/401 enforcement | Test denied paths |
| 2 | Skip IDOR tests | Users access others' data | Test cross-user access |
| 3 | Hardcode user roles in test | Misses role changes | Use dataset-driven RBAC matrix |
| 4 | Test auth with real OAuth provider | Slow, flaky, external | Sanctum::actingAs() or token |
| 5 | Skip token expiry/revocation tests | Stale tokens work forever | Test all token lifecycle states |

---

## Quality Checklist

- [ ] **Q1**: RBAC matrix covers all role x endpoint combinations?
- [ ] **Q2**: IDOR tested on all resource endpoints?
- [ ] **Q3**: Token lifecycle tested (create, expire, revoke)?
- [ ] **Q4**: Unauthenticated access returns 401 on all protected routes?

---

*Test Plan Specialist — Laravel Authentication & Authorization Testing v1.0 | EPS v3.2*
