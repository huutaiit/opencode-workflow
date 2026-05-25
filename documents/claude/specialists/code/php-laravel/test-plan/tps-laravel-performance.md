# Test Plan Specialist — Laravel Performance Testing (Strategy + Routing)
# テストプランスペシャリスト — Laravelパフォーマンステスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Performance Test Laravel (Chien Luoc + Routing)

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Performance Testing Strategy
**Category**: test-plan
**Purpose**: Test plan for performance testing strategy — benchmarks, profiling, N+1 detection, query optimization, load testing routing

---

## Metadata

```json
{
  "id": "tps-laravel-performance",
  "technology": "Laravel 11+ Testing",
  "aspect": "Performance Testing Strategy",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 280,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Debugbar — query profiling and N+1 detection",
    "E2: Laravel Telescope — request/query monitoring",
    "E3: Pest architecture tests — prevent lazy loading in production"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-PERFORMANCE |
| **Directory Pattern** | `tests/Performance/` |
| **Naming Convention** | `{Concern}PerformanceTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Performance test strategy hub — routes to load, concurrency test plans |
| **Activation Trigger** | keywords: performance test, benchmark, profiling, n+1, query optimization, load test |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Load Testing | TPS-LARAVEL-PERF-LOAD | `tps-laravel-performance-load.md` | Concurrent users, throughput, response times |
| Concurrency | TPS-LARAVEL-CONCURRENCY | `tps-laravel-concurrency.md` | Race conditions, deadlocks, queue concurrency |

---

## Test Strategy

Performance tests verify the application meets response time, throughput, and resource usage requirements. Focus on N+1 query detection, query count limits, memory usage, and response time benchmarks. Use `preventLazyLoading()` in testing to catch N+1 issues early.

---

## Test Cases

### TC-1: N+1 Query Detection
**Priority**: HIGH
**Type**: Performance
**Description**: Verify endpoints do not trigger N+1 queries.

```php
it('loads orders without N+1 queries', function () {
    // Seed 50 orders with 3 items each
    OrderModel::factory()
        ->has(OrderItemModel::factory()->count(3), 'items')
        ->count(50)
        ->create(['customer_id' => $user->id]);

    // Enable strict mode — throws on lazy loading
    Model::preventLazyLoading();

    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders');

    $response->assertStatus(200);
    // If N+1 exists, preventLazyLoading() throws LazyLoadingViolationException
});

it('uses at most 5 queries for order list endpoint', function () {
    OrderModel::factory()->count(20)->create(['customer_id' => $user->id]);

    $queryCount = 0;
    DB::listen(function () use (&$queryCount) { $queryCount++; });

    $this->actingAs($user)->getJson('/api/v1/orders');

    expect($queryCount)->toBeLessThanOrEqual(5);
});
```

### TC-2: Response Time Benchmarks
**Priority**: HIGH
**Type**: Performance
**Description**: Verify critical endpoints respond within acceptable time.

```php
it('returns order list within 200ms', function () {
    OrderModel::factory()->count(100)->create(['customer_id' => $user->id]);

    $start = microtime(true);
    $this->actingAs($user)->getJson('/api/v1/orders?per_page=20');
    $elapsed = (microtime(true) - $start) * 1000;

    expect($elapsed)->toBeLessThan(200); // 200ms max
});

it('creates order within 500ms', function () {
    $start = microtime(true);
    $this->actingAs($user)->postJson('/api/v1/orders', $validPayload);
    $elapsed = (microtime(true) - $start) * 1000;

    expect($elapsed)->toBeLessThan(500); // 500ms max for write
});
```

### TC-3: Memory Usage Limits
**Priority**: MEDIUM
**Type**: Performance
**Description**: Verify endpoints do not consume excessive memory.

```php
it('exports 10,000 orders without exceeding 128MB', function () {
    OrderModel::factory()->count(10000)->create();

    $memBefore = memory_get_usage(true);

    $this->actingAs($admin)
        ->getJson('/api/v1/orders/export?format=csv');

    $memAfter = memory_get_peak_usage(true);
    $memUsedMb = ($memAfter - $memBefore) / 1024 / 1024;

    expect($memUsedMb)->toBeLessThan(128);
});

it('uses chunked processing for large datasets', function () {
    OrderModel::factory()->count(5000)->create();

    $queryCount = 0;
    DB::listen(function () use (&$queryCount) { $queryCount++; });

    $this->actingAs($admin)
        ->getJson('/api/v1/reports/orders-summary');

    // Should use chunk() or cursor() — multiple small queries instead of one huge
    expect($queryCount)->toBeGreaterThan(1);
});
```

### TC-4: Caching Effectiveness
**Priority**: MEDIUM
**Type**: Performance
**Description**: Verify cache reduces database load on repeated requests.

```php
it('serves cached response on second request', function () {
    OrderModel::factory()->count(50)->create();

    // First request: populates cache
    $queryCount1 = 0;
    DB::listen(function () use (&$queryCount1) { $queryCount1++; });
    $this->actingAs($user)->getJson('/api/v1/dashboard/stats');

    // Second request: should use cache
    $queryCount2 = 0;
    DB::listen(function () use (&$queryCount2) { $queryCount2++; });
    $this->actingAs($user)->getJson('/api/v1/dashboard/stats');

    expect($queryCount2)->toBeLessThan($queryCount1);
});
```

### TC-5: Eager Loading Verification
**Priority**: HIGH
**Type**: Performance
**Description**: Verify relationships are eager-loaded where needed.

```php
it('eager-loads order items in order detail', function () {
    $order = OrderModel::factory()
        ->has(OrderItemModel::factory()->count(5), 'items')
        ->create();

    $queryCount = 0;
    DB::listen(function () use (&$queryCount) { $queryCount++; });

    $this->actingAs($user)
        ->getJson("/api/v1/orders/{$order->id}");

    // 1 for order + 1 for items = 2 queries (not 1 + N)
    expect($queryCount)->toBeLessThanOrEqual(3);
});
```

### TC-6: Index Verification
**Priority**: MEDIUM
**Type**: Performance
**Description**: Verify queries use database indexes effectively.

```php
it('uses index for customer order lookup', function () {
    OrderModel::factory()->count(1000)->create();

    $explain = DB::select(
        'EXPLAIN SELECT * FROM orders WHERE customer_id = ? AND status = ?',
        [$user->id, 'pending']
    );

    $plan = json_encode($explain);
    expect($plan)->toContain('idx_orders_customer_status')
        ->or()->toContain('Using index');
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| N+1 queries | 100% of list/detail endpoints | Performance degradation prevention |
| Response time | All API endpoints within SLA | User experience |
| Memory usage | All export/bulk endpoints | Server stability |
| Caching | All cached endpoints | Cache effectiveness |
| Query count | All endpoints <=10 queries | Database load control |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test performance with empty DB | No data = fast, misleading | Seed realistic data volume |
| 2 | Skip N+1 detection | 50 queries per page in production | preventLazyLoading() + DB::listen |
| 3 | Hardcode response time thresholds | Different envs have different baselines | Use relative benchmarks in CI |
| 4 | Test export without chunking | Memory overflow in production | Verify chunk/cursor usage |
| 5 | Cache tests without invalidation | Stale data returned | Test cache + invalidation |

---

## Quality Checklist

- [ ] **Q1**: N+1 query detection enabled for all endpoints?
- [ ] **Q2**: Response time benchmarks defined for critical paths?
- [ ] **Q3**: Memory usage tested for bulk/export operations?
- [ ] **Q4**: Caching effectiveness verified with DB::listen?

---

*Test Plan Specialist — Laravel Performance Testing (Strategy + Routing) v1.0 | EPS v3.2*
