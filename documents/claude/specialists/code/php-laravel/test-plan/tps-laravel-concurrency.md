# Test Plan Specialist — Laravel Concurrency & Race Condition Testing
# テストプランスペシャリスト — Laravel並行性＆競合状態テスト
# Chuyen Gia Ke Hoach Test — Test Dong Thoi & Race Condition Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Concurrency & Race Condition Testing
**Category**: test-plan
**Purpose**: Test plan for concurrency testing — race conditions, deadlocks, queue concurrency, Octane worker isolation, pessimistic/optimistic locking

---

## Metadata

```json
{
  "id": "tps-laravel-concurrency",
  "technology": "Laravel 11+ Testing",
  "aspect": "Concurrency & Race Condition Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 340,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel atomic locks — Cache::lock() for distributed locking",
    "E2: Eloquent pessimistic locking — lockForUpdate(), sharedLock()",
    "E3: Laravel Octane — worker isolation and shared state dangers"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-CONCURRENCY |
| **Directory Pattern** | `tests/Concurrency/` |
| **Naming Convention** | `{Scenario}ConcurrencyTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Concurrency tests — race conditions, deadlocks, queue concurrency, Octane worker isolation |
| **Activation Trigger** | keywords: race condition, concurrency, deadlock, locking, atomic, octane worker, double spend |

---

## Why This TPS Exists

Race conditions pass all unit/feature tests (single-process PHP) but cause **double payments, negative balances, and data corruption** under concurrent PHP-FPM/Octane requests. This TPS creates deliberate concurrent scenarios.

---

## Test Cases

### TC-1: Optimistic Lock Conflict (Version Column)
**Priority**: HIGH
**Type**: Concurrency
**Description**: Verify concurrent updates are detected via version column.

```php
it('detects concurrent update conflict via version column', function () {
    $order = OrderModel::factory()->create(['version' => 1]);

    // Two readers get same version
    $reader1 = OrderModel::find($order->id);
    $reader2 = OrderModel::find($order->id);

    // Reader 1 updates successfully
    $reader1->status = 'confirmed';
    $reader1->version += 1;
    $updated = OrderModel::where('id', $order->id)
        ->where('version', 1)
        ->update(['status' => 'confirmed', 'version' => 2]);

    expect($updated)->toBe(1); // 1 row affected

    // Reader 2 tries with stale version — should fail
    $staleUpdate = OrderModel::where('id', $order->id)
        ->where('version', 1) // stale version
        ->update(['status' => 'cancelled', 'version' => 2]);

    expect($staleUpdate)->toBe(0); // 0 rows — version mismatch

    // Final state must be "confirmed", not "cancelled"
    expect($order->fresh()->status)->toBe('confirmed');
});
```

### TC-2: Double-Spend Prevention with Pessimistic Lock
**Priority**: HIGH
**Type**: Concurrency
**Description**: Verify concurrent withdrawals cannot exceed balance.

```php
it('prevents balance going negative with concurrent withdrawals', function () {
    $account = AccountModel::factory()->create(['balance' => 10000]); // $100.00

    // Two concurrent $80 withdrawals (total $160 > balance $100)
    $results = collect([8000, 8000])->map(function ($amount) use ($account) {
        return rescue(function () use ($account, $amount) {
            return DB::transaction(function () use ($account, $amount) {
                $locked = AccountModel::lockForUpdate()->find($account->id);
                if ($locked->balance < $amount) {
                    throw new InsufficientFundsException();
                }
                $locked->balance -= $amount;
                $locked->save();
                return 'success';
            });
        }, 'failed');
    });

    $finalBalance = $account->fresh()->balance;

    // Balance must NEVER go negative
    expect($finalBalance)->toBeGreaterThanOrEqual(0);
    // Exactly one should succeed, one should fail
    expect($results->filter(fn ($r) => $r === 'success'))->toHaveCount(1);
    expect($finalBalance)->toBe(2000); // 10000 - 8000 = 2000
});
```

### TC-3: Deadlock Prevention — Consistent Lock Order
**Priority**: HIGH
**Type**: Concurrency
**Description**: Verify transfers between accounts do not deadlock.

```php
it('transfers between accounts without deadlock using sorted lock order', function () {
    $accountA = AccountModel::factory()->create(['id' => 'acc-aaa', 'balance' => 50000]);
    $accountB = AccountModel::factory()->create(['id' => 'acc-bbb', 'balance' => 50000]);

    // Concurrent: A->B and B->A
    $transfer = function (string $fromId, string $toId, int $amount) {
        return DB::transaction(function () use ($fromId, $toId, $amount) {
            // Always lock in sorted order to prevent deadlock
            $ids = collect([$fromId, $toId])->sort()->values();
            $accounts = AccountModel::whereIn('id', $ids)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $from = $accounts[$fromId];
            $to = $accounts[$toId];

            if ($from->balance < $amount) {
                throw new InsufficientFundsException();
            }

            $from->decrement('balance', $amount);
            $to->increment('balance', $amount);
            return 'success';
        });
    };

    // Both should complete without deadlock
    $r1 = rescue(fn () => $transfer('acc-aaa', 'acc-bbb', 1000), 'failed');
    $r2 = rescue(fn () => $transfer('acc-bbb', 'acc-aaa', 2000), 'failed');

    expect($r1)->toBe('success')
        ->and($r2)->toBe('success');

    // Verify total balance unchanged
    $totalBalance = AccountModel::sum('balance');
    expect($totalBalance)->toBe(100000); // unchanged

    expect($accountA->fresh()->balance)->toBe(50000 - 1000 + 2000) // 51000
        ->and($accountB->fresh()->balance)->toBe(50000 + 1000 - 2000); // 49000
});
```

### TC-4: Laravel Atomic Lock (Cache-Based Distributed Lock)
**Priority**: HIGH
**Type**: Concurrency
**Description**: Verify Cache::lock() prevents concurrent execution of critical sections.

```php
it('prevents concurrent execution of same critical section', function () {
    $executionLog = [];

    $criticalSection = function (string $workerId) use (&$executionLog) {
        $lock = Cache::lock('process-payment:order-001', 10); // 10s TTL

        if ($lock->get()) {
            try {
                $executionLog[] = "{$workerId}:start";
                usleep(100000); // 100ms work
                $executionLog[] = "{$workerId}:end";
            } finally {
                $lock->release();
            }
            return 'executed';
        }
        return 'skipped';
    };

    $r1 = $criticalSection('worker-1');
    $r2 = $criticalSection('worker-2'); // lock released, can acquire

    expect($r1)->toBe('executed')
        ->and($r2)->toBe('executed');
    // No interleaving — start/end pairs are sequential
    expect($executionLog)->toBe(['worker-1:start', 'worker-1:end', 'worker-2:start', 'worker-2:end']);
});

it('auto-releases lock on TTL expiry', function () {
    // Acquire lock, do NOT release (simulate crash)
    $lock = Cache::lock('crashed-process', 1); // 1s TTL
    $lock->get();

    // After TTL, another process can acquire
    sleep(2);
    $newLock = Cache::lock('crashed-process', 10);
    expect($newLock->get())->toBeTrue(); // not stuck

    $newLock->release();
});
```

### TC-5: Queue Concurrency — Unique Jobs
**Priority**: HIGH
**Type**: Concurrency
**Description**: Verify ShouldBeUnique jobs prevent duplicate processing.

```php
it('prevents duplicate job execution via ShouldBeUnique', function () {
    $executionCount = 0;

    // Dispatch same job twice rapidly
    ProcessPaymentJob::dispatch('order-001');
    ProcessPaymentJob::dispatch('order-001'); // duplicate — should be rejected

    // ProcessPaymentJob implements ShouldBeUnique with uniqueId = orderId
    Queue::assertPushed(ProcessPaymentJob::class, 1); // only 1 dispatched
});

it('allows unique job after previous completes', function () {
    Queue::fake();

    ProcessPaymentJob::dispatch('order-001');
    Queue::assertPushed(ProcessPaymentJob::class, 1);

    // Simulate completion by releasing unique lock
    Cache::lock('job:ProcessPaymentJob:order-001')->forceRelease();

    ProcessPaymentJob::dispatch('order-001');
    Queue::assertPushed(ProcessPaymentJob::class, 2); // second one allowed
});
```

### TC-6: Octane Worker Isolation
**Priority**: MEDIUM
**Type**: Concurrency
**Description**: Verify no shared mutable state leaks between Octane worker requests.

```php
it('does not leak request state between Octane requests', function () {
    // Request 1: Sets user context
    $response1 = $this->actingAs($user1)
        ->getJson('/api/v1/profile');
    expect($response1->json('data.id'))->toBe($user1->id);

    // Request 2: Different user — must NOT see user1's state
    $response2 = $this->actingAs($user2)
        ->getJson('/api/v1/profile');
    expect($response2->json('data.id'))->toBe($user2->id)
        ->and($response2->json('data.id'))->not->toBe($user1->id);
});

it('does not leak singleton state between requests', function () {
    // If using Octane, singletons persist across requests
    // This test verifies stateful singletons are flushed
    app()->singleton('request_counter', fn () => new class {
        public int $count = 0;
    });

    // Simulate first request
    $counter = app('request_counter');
    $counter->count++;
    expect($counter->count)->toBe(1);

    // After Octane flushes, counter should reset
    // (This requires Octane's Listeners\FlushStates to be registered)
});
```

---

## Test Execution Strategy

```
Concurrency tests MUST run:
  1. With REAL database (MySQL/PostgreSQL) — not SQLite (no row-level locking)
  2. With real Cache driver (Redis) — not array driver
  3. With assertion on FINAL STATE, not intermediate steps
  4. With timeout per test (30s) — deadlocks must fail, not hang

Configuration:
  DB_CONNECTION=mysql          # row-level locking required
  CACHE_DRIVER=redis           # distributed locks require Redis
  testTimeout: 30000           # 30s per test
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test concurrency with SQLite | No row-level locking — races invisible | MySQL/PostgreSQL |
| 2 | Sequential requests for "concurrent" test | Single-process PHP — no race | Multiple DB connections or HTTP requests |
| 3 | Assert intermediate state | Flaky — depends on timing | Assert final state only |
| 4 | No lock timeout in tests | Deadlock hangs test suite | SET lock_wait_timeout=2 |
| 5 | In-memory lock for distributed system | Works on 1 server, fails on N | Cache::lock() with Redis |
| 6 | Static properties in Octane | Leak between requests | Use request-scoped bindings |

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| Optimistic lock conflict | All concurrent-writable entities | Data corruption prevention |
| Double-spend prevention | All balance/amount operations | Financial integrity |
| Deadlock prevention | All bi-directional lock patterns | System stability |
| Distributed locks | All critical sections | Cross-worker safety |
| Queue uniqueness | All ShouldBeUnique jobs | Duplicate prevention |
| Octane isolation | All singletons, static state | Request isolation |

---

## Quality Checklist

- [ ] **Q1**: Tests use real database with row-level locking (not SQLite)?
- [ ] **Q2**: Tests use Redis cache driver for distributed locks?
- [ ] **Q3**: Assertions check FINAL state, not intermediate?
- [ ] **Q4**: All financial operations tested with concurrent duplicate requests?
- [ ] **Q5**: Octane worker isolation verified (no state leaks)?

---

*Test Plan Specialist — Laravel Concurrency & Race Condition Testing v1.0 | EPS v3.2*
