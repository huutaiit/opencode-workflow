# Test Plan Specialist — Laravel Database Integration Testing
# テストプランスペシャリスト — Laravelデータベース統合テスト
# Chuyen Gia Ke Hoach Test — Integration Test Database Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Database Integration Testing
**Category**: test-plan
**Purpose**: Test plan for database integration — migrations, seeds, Eloquent queries, transactions, model factories

---

## Metadata

```json
{
  "id": "tps-laravel-integration-database",
  "technology": "Laravel 11+ Testing",
  "aspect": "Database Integration Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 300,
  "token_cost": 2000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel migrations — up/down idempotency, rollback safety",
    "E2: Eloquent query builder — real SQL execution against test DB",
    "E3: Database transactions — isolation levels, deadlock handling"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-INTEGRATION-DATABASE |
| **Directory Pattern** | `tests/Feature/Database/` |
| **Naming Convention** | `{Model}RepositoryTest.php`, `{Migration}Test.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Database integration tests — migrations, seeds, Eloquent queries, transactions |
| **Activation Trigger** | keywords: migration test, database test, eloquent test, transaction test, seed test |

---

## Test Strategy

Database integration tests run against a real database (SQLite in-memory for speed, MySQL/PostgreSQL for production parity). Use `RefreshDatabase` trait for isolation. Test migrations, complex queries, transactions, and model relationships.

---

## Test Cases

### TC-1: Migration Up/Down Idempotency
**Priority**: HIGH
**Type**: Integration
**Description**: Verify all migrations run forward and rollback cleanly.

```php
it('runs all migrations forward successfully', function () {
    $this->artisan('migrate:fresh')
        ->assertExitCode(0);

    // Verify critical tables exist
    expect(Schema::hasTable('orders'))->toBeTrue()
        ->and(Schema::hasTable('order_items'))->toBeTrue()
        ->and(Schema::hasTable('payments'))->toBeTrue();
});

it('rolls back all migrations without errors', function () {
    $this->artisan('migrate:fresh')->assertExitCode(0);
    $this->artisan('migrate:rollback', ['--step' => 999])
        ->assertExitCode(0);

    expect(Schema::hasTable('orders'))->toBeFalse();
});

it('re-runs migrations after rollback (idempotent)', function () {
    $this->artisan('migrate:fresh')->assertExitCode(0);
    $this->artisan('migrate:rollback', ['--step' => 5])->assertExitCode(0);
    $this->artisan('migrate')->assertExitCode(0);

    expect(Schema::hasTable('orders'))->toBeTrue();
});
```

### TC-2: Eloquent Query Correctness
**Priority**: HIGH
**Type**: Integration
**Description**: Verify complex Eloquent queries return correct results against real DB.

```php
it('finds orders by customer with eager-loaded items', function () {
    $customer = User::factory()->create();
    OrderModel::factory()
        ->has(OrderItemModel::factory()->count(3), 'items')
        ->count(2)
        ->create(['customer_id' => $customer->id]);

    // Other customer's orders (should NOT appear)
    OrderModel::factory()->count(5)->create();

    $orders = OrderModel::query()
        ->where('customer_id', $customer->id)
        ->with('items')
        ->get();

    expect($orders)->toHaveCount(2)
        ->and($orders->first()->items)->toHaveCount(3);
});

it('filters orders by status and date range', function () {
    OrderModel::factory()->create(['status' => 'confirmed', 'created_at' => '2026-01-15']);
    OrderModel::factory()->create(['status' => 'confirmed', 'created_at' => '2026-03-01']);
    OrderModel::factory()->create(['status' => 'pending', 'created_at' => '2026-01-20']);

    $results = OrderModel::query()
        ->where('status', 'confirmed')
        ->whereBetween('created_at', ['2026-01-01', '2026-01-31'])
        ->get();

    expect($results)->toHaveCount(1);
});
```

### TC-3: Transaction Isolation
**Priority**: HIGH
**Type**: Integration
**Description**: Verify transactions commit and rollback correctly.

```php
it('commits transaction on success', function () {
    DB::transaction(function () {
        OrderModel::factory()->create(['id' => 'tx-order-001']);
        OrderItemModel::factory()->create(['order_id' => 'tx-order-001']);
    });

    $this->assertDatabaseHas('orders', ['id' => 'tx-order-001']);
    $this->assertDatabaseHas('order_items', ['order_id' => 'tx-order-001']);
});

it('rolls back all changes on exception within transaction', function () {
    try {
        DB::transaction(function () {
            OrderModel::factory()->create(['id' => 'tx-fail-001']);
            throw new RuntimeException('Simulated failure');
        });
    } catch (RuntimeException) {
        // expected
    }

    $this->assertDatabaseMissing('orders', ['id' => 'tx-fail-001']);
});

it('handles nested transactions with savepoints', function () {
    DB::transaction(function () {
        OrderModel::factory()->create(['id' => 'outer-001']);

        try {
            DB::transaction(function () {
                OrderModel::factory()->create(['id' => 'inner-001']);
                throw new RuntimeException('Inner fails');
            });
        } catch (RuntimeException) {
            // inner rolled back
        }
    });

    $this->assertDatabaseHas('orders', ['id' => 'outer-001']);
    $this->assertDatabaseMissing('orders', ['id' => 'inner-001']);
});
```

### TC-4: Seeder Correctness
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify seeders produce valid, complete test data.

```php
it('seeds database with required reference data', function () {
    $this->seed(ReferenceDataSeeder::class);

    $this->assertDatabaseCount('currencies', 3); // USD, EUR, JPY
    $this->assertDatabaseHas('currencies', ['code' => 'USD', 'symbol' => '$']);
    $this->assertDatabaseHas('currencies', ['code' => 'JPY', 'symbol' => '¥']);
});

it('seeds test data without violating constraints', function () {
    $this->seed(DatabaseSeeder::class);

    // No orphaned foreign keys
    $orphans = DB::table('order_items')
        ->leftJoin('orders', 'order_items.order_id', '=', 'orders.id')
        ->whereNull('orders.id')
        ->count();

    expect($orphans)->toBe(0);
});
```

### TC-5: Model Factory Accuracy
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify factories produce valid models that pass all constraints.

```php
it('creates valid order via factory', function () {
    $order = OrderModel::factory()->create();

    expect($order->exists)->toBeTrue()
        ->and($order->id)->not->toBeEmpty()
        ->and($order->status)->toBeIn(['pending', 'confirmed', 'cancelled']);
});

it('creates order with items via relationship factory', function () {
    $order = OrderModel::factory()
        ->has(OrderItemModel::factory()->count(3), 'items')
        ->create();

    expect($order->items)->toHaveCount(3)
        ->and($order->items->every(fn ($item) => $item->order_id === $order->id))->toBeTrue();
});
```

### TC-6: Soft Delete and Restore
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify soft deletes exclude records from normal queries.

```php
it('excludes soft-deleted orders from normal queries', function () {
    $order = OrderModel::factory()->create();
    $order->delete();

    expect(OrderModel::find($order->id))->toBeNull()
        ->and(OrderModel::withTrashed()->find($order->id))->not->toBeNull();
});

it('restores soft-deleted order', function () {
    $order = OrderModel::factory()->create();
    $order->delete();
    $order->restore();

    expect(OrderModel::find($order->id))->not->toBeNull()
        ->and($order->trashed())->toBeFalse();
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Migrations up/down | 100% of migrations | Schema integrity |
| Complex queries | All custom scopes + query methods | SQL correctness |
| Transactions | commit, rollback, nested savepoints | Data consistency |
| Seeders | 100% of seeder classes | Test data validity |
| Soft deletes | All soft-deletable models | Query correctness |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Skip migration rollback tests | Broken rollback blocks deployment | Test up + down |
| 2 | Test with hardcoded IDs | Fragile — clashes in parallel runs | Use factory-generated IDs |
| 3 | Assert raw SQL results | Couples test to DB engine | Assert via Eloquent/model |
| 4 | Share test data across tests | Order-dependent, flaky | RefreshDatabase per test |
| 5 | Use SQLite for MySQL-specific features | JSON columns, full-text differ | Use same DB engine as production |

---

## Quality Checklist

- [ ] **Q1**: Migration up/down tested for all migration files?
- [ ] **Q2**: Complex queries tested with real data (not mocks)?
- [ ] **Q3**: Transaction commit/rollback/savepoint tested?
- [ ] **Q4**: Model factories produce constraint-valid records?

---

*Test Plan Specialist — Laravel Database Integration Testing v1.0 | EPS v3.2*
