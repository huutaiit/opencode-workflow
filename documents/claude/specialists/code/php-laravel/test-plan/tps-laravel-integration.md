# Test Plan Specialist — Laravel Integration Testing (Strategy + Routing)
# テストプランスペシャリスト — Laravel統合テスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Integration Test Laravel (Chien Luoc + Routing)

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Integration Testing Strategy
**Category**: test-plan
**Purpose**: Test plan for integration test strategy — database, queues, cache, external services, concern routing

---

## Metadata

```json
{
  "id": "tps-laravel-integration",
  "technology": "Laravel 11+ Testing",
  "aspect": "Integration Testing Strategy",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 280,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Feature tests — full HTTP cycle with RefreshDatabase",
    "E2: Laravel queue testing — Bus::fake(), Queue::fake()",
    "E3: Laravel HTTP facade — Http::fake() for external service mocking"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-INTEGRATION |
| **Directory Pattern** | `tests/Feature/` |
| **Naming Convention** | `{Feature}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Integration test strategy hub — routes to database, API contract, messaging specialists |
| **Activation Trigger** | keywords: integration test, feature test, database test, queue test, cache test |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Database | TPS-LARAVEL-INT-DB | `tps-laravel-integration-database.md` | Testing migrations, Eloquent queries, transactions |
| API Contract | TPS-LARAVEL-INT-CONTRACT | `tps-laravel-integration-api-contract.md` | Testing endpoints, request/response schemas, versioning |
| Messaging | TPS-LARAVEL-INT-MSG | `tps-laravel-integration-messaging.md` | Testing jobs, listeners, notifications, broadcasting |
| E2E | TPS-LARAVEL-E2E | `tps-laravel-e2e.md` | Testing full browser workflows via Dusk |

---

## Integration Test Strategy Overview

### What to Integration Test

| Concern | Test Focus | Environment |
|---------|-----------|-------------|
| **Database** | Repository queries against real DB, migration up/down, transaction isolation | SQLite in-memory or MySQL/PostgreSQL via RefreshDatabase |
| **Queues** | Job dispatch, listener execution, notification delivery, event chains | Queue::fake() or sync driver |
| **Cache** | Cache hit/miss with real driver, cache invalidation on writes | Array driver or Redis |
| **External** | Third-party API integration (Stripe, SendGrid) | Http::fake() with recorded responses |

### What NOT to Integration Test

- Unit-level business logic (entity invariants, VO validation) -> unit tests
- Browser UI rendering -> Dusk E2E tests
- Third-party internal behavior (Stripe webhook processing) -> mock at boundary

---

## Test Environment Setup

### Database Configuration

```php
// phpunit.xml — use SQLite in-memory for speed
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>

// For MySQL/PostgreSQL-specific features
<env name="DB_CONNECTION" value="mysql"/>
<env name="DB_DATABASE" value="testing"/>
```

### RefreshDatabase Trait

```php
// tests/Feature/OrderFeatureTest.php
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates order via API', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/v1/orders', $validPayload);

    $response->assertStatus(201);
    $this->assertDatabaseHas('orders', ['customer_id' => $user->id]);
});
```

### Queue and Event Fakes

```php
it('dispatches ProcessPaymentJob after order confirmation', function () {
    Queue::fake();

    $this->actingAs($user)
        ->putJson("/api/v1/orders/{$order->id}/confirm");

    Queue::assertPushed(ProcessPaymentJob::class, function ($job) use ($order) {
        return $job->orderId === $order->id;
    });
});

it('fires OrderConfirmed event', function () {
    Event::fake([OrderConfirmed::class]);

    $this->actingAs($user)
        ->putJson("/api/v1/orders/{$order->id}/confirm");

    Event::assertDispatched(OrderConfirmed::class);
});
```

---

## Database Cleanup Strategies

| Strategy | When | How |
|----------|------|-----|
| RefreshDatabase | Default for Feature tests | Wraps each test in transaction + rollback |
| DatabaseMigrations | When you need fresh schema | Runs migrate:fresh before each test |
| DatabaseTransactions | Legacy — less common | Transaction per test, no migration |
| LazilyRefreshDatabase | Large test suites | Only migrates once per test run |

**Default**: `RefreshDatabase` for most tests (balance of speed and isolation).

---

## CI Pipeline Integration

```yaml
# .github/workflows/tests.yml
tests:
  runs-on: ubuntu-latest
  services:
    mysql:
      image: mysql:8.0
      env: { MYSQL_DATABASE: testing, MYSQL_ROOT_PASSWORD: password }
      ports: ['3306:3306']
    redis:
      image: redis:7
      ports: ['6379:6379']

  steps:
    - uses: actions/checkout@v4
    - uses: shivammathur/setup-php@v2
      with: { php-version: '8.3', extensions: pdo_mysql, redis }
    - run: composer install --no-interaction
    - run: php artisan test --testsuite=Feature
      env:
        DB_CONNECTION: mysql
        DB_HOST: 127.0.0.1
        DB_DATABASE: testing
        REDIS_HOST: 127.0.0.1
```

---

## Coverage Targets

| Scope | Target | Measurement |
|-------|--------|-------------|
| API endpoints | 100% of routes | Feature test coverage |
| Database operations | 100% of repository methods | assertDatabaseHas/Missing |
| Queue dispatches | 100% of dispatchable jobs | Queue::assertPushed |
| Event emissions | 100% of event types | Event::assertDispatched |
| Error responses | All HTTP error codes (400-500) | assertStatus() |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Skip RefreshDatabase trait | State leaks between tests — flaky | Always use RefreshDatabase |
| 2 | Use real queue driver in Feature tests | Slow, unreliable, hard to assert | Queue::fake() or sync |
| 3 | Test with production DB credentials | Security risk, data corruption | Dedicated test database |
| 4 | Assert full JSON response body | Fragile — breaks on any field change | Assert key fields + structure |
| 5 | Feature tests without authentication | Misses auth bugs | actingAs() with appropriate user |

---

## Quality Checklist

- [ ] **Q1**: Concern routing table complete (database, messaging, contract, E2E)?
- [ ] **Q2**: Database cleanup strategy defined (RefreshDatabase default)?
- [ ] **Q3**: CI pipeline with service containers documented?
- [ ] **Q4**: Queue/Event fakes demonstrated for async assertions?

---

*Test Plan Specialist — Laravel Integration Testing (Strategy + Routing) v1.0 | EPS v3.2*
