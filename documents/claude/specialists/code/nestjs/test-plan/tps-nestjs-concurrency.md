# Test Plan Specialist — NestJS Concurrency & Race Condition Testing
# テストプランスペシャリスト — NestJS 並行性＆競合状態テスト
# Chuyen Gia Test — Kiem Thu Dong Thoi & Race Condition NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Concurrency & Race Condition Testing
**Purpose**: Concurrency test patterns — optimistic lock conflicts, double-funding prevention, distributed lock testing, connection pool under contention, Kafka partition ordering, dead letter race conditions

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application + Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-CONCURRENCY |
| **Directory Pattern** | `test/concurrency/**/*.spec.ts` |
| **Naming Convention** | `{scenario}.concurrency.spec.ts` |
| **Imports From** | Application (use cases), Infrastructure (repos, messaging) |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | jest, @testcontainers/postgresql, p-limit (concurrency control) |
| **When To Use** | Features with shared mutable state — payments, inventory, loan funding, account balance |
| **Source Skeleton** | `test/concurrency/` |
| **Specialist Type** | code |
| **Purpose** | Concurrency test patterns — race conditions, optimistic locking, distributed locks, double-funding, dead letter races |
| **Activation Trigger** | files: **/concurrency/**; keywords: raceCondition, concurrency, optimisticLock, doubleFunding, distributedLock, deadlock |

---

## Why This TPS Exists

Race conditions are the **most dangerous bugs in fintech** because:
- They pass all unit tests (single-threaded)
- They pass most integration tests (sequential execution)
- They only appear under **concurrent load** in production
- They cause: double payments, negative balances, oversold inventory, data corruption

This TPS teaches the AI agent to **deliberately create concurrent scenarios** in tests.

---

## Patterns

### Pattern CONC.1: Optimistic Lock Conflict Testing

```typescript
describe('Optimistic Locking — Concurrent Updates', () => {
  let ds: DataSource;

  beforeAll(async () => { ds = await setupTestDb(); });
  afterEach(() => cleanDb(ds));

  it('should detect concurrent update conflict via @VersionColumn', async () => {
    // Setup: create an order
    const order = await orderRepo.save(Order.create('c1', [validItem]));

    // Simulate: two concurrent readers get same version
    const reader1 = await orderRepo.findById(order.id); // version = 1
    const reader2 = await orderRepo.findById(order.id); // version = 1

    // Reader 1 updates successfully → version becomes 2
    reader1.approve();
    await orderRepo.save(reader1); // OK

    // Reader 2 tries to update with stale version 1 → CONFLICT
    reader2.cancel('changed mind');
    await expect(orderRepo.save(reader2))
      .rejects.toThrow(/OptimisticLock|version/i);
  });

  it('should succeed after retry on optimistic lock conflict', async () => {
    const order = await orderRepo.save(Order.create('c1', [validItem]));
    let attempts = 0;

    const updateWithRetry = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          attempts++;
          const fresh = await orderRepo.findById(order.id); // re-read
          fresh.approve();
          return await orderRepo.save(fresh);
        } catch (err) {
          if (i === 2) throw err; // max retries
        }
      }
    };

    // Concurrent: both try to approve
    const [r1, r2] = await Promise.allSettled([
      updateWithRetry(),
      updateWithRetry(),
    ]);

    // Both should eventually succeed (one retries with fresh version)
    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');
    expect(attempts).toBeGreaterThan(2); // at least one retry happened
  });

  // ❌ NEGATIVE EXAMPLE: No @VersionColumn
  // Both readers update → last write wins silently
  // reader1 approves, reader2 cancels → order ends up CANCELLED
  // but approval event was already sent → inconsistent state
});
```

---

### Pattern CONC.2: Double-Funding Prevention

```typescript
describe('Loan Funding — Double-Funding Prevention', () => {
  it('should NOT allow total funding to exceed loan amount', async () => {
    // Loan of $10,000 — two lenders try to fund $6,000 each simultaneously
    const loan = await createLoan({ amount: 10000 });

    const [r1, r2] = await Promise.allSettled([
      fundLoanUseCase.execute({ loanId: loan.id, amount: 6000, lenderId: 'lender-1' }),
      fundLoanUseCase.execute({ loanId: loan.id, amount: 6000, lenderId: 'lender-2' }),
    ]);

    // One should succeed, one should fail (or be reduced)
    const successes = [r1, r2].filter(r => r.status === 'fulfilled');
    const failures = [r1, r2].filter(r => r.status === 'rejected');

    // Total funded must NOT exceed loan amount
    const totalFunded = await loanRepo.getTotalFunded(loan.id);
    expect(totalFunded).toBeLessThanOrEqual(10000);

    // At least one should succeed
    expect(successes.length).toBeGreaterThanOrEqual(1);
    // If both "succeed", verify total is correct (one was reduced)
    if (successes.length === 2) {
      expect(totalFunded).toBe(10000); // exactly full, not over
    }
  });

  it('should handle 10 concurrent funding requests safely', async () => {
    const loan = await createLoan({ amount: 10000 });

    // 10 lenders each try to fund $2,000 (total $20,000 > loan $10,000)
    const promises = Array.from({ length: 10 }, (_, i) =>
      fundLoanUseCase.execute({ loanId: loan.id, amount: 2000, lenderId: `lender-${i}` }),
    );
    const results = await Promise.allSettled(promises);

    const totalFunded = await loanRepo.getTotalFunded(loan.id);
    expect(totalFunded).toBe(10000); // exactly loan amount

    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBe(5); // exactly 5 × $2,000 = $10,000
  });

  // ❌ NEGATIVE EXAMPLE: Check-then-act without locking
  // const remaining = loan.amount - loan.funded; // $4,000
  // if (fundAmount <= remaining) { // both threads pass this check
  //   loan.funded += fundAmount;   // both add $6,000 → total $12,000 → OVER-FUNDED
  // }
  // Fix: SELECT ... FOR UPDATE or application-level distributed lock
});
```

---

### Pattern CONC.3: Pessimistic Lock Deadlock Testing

```typescript
describe('Deadlock Prevention', () => {
  it('should not deadlock when locking accounts in consistent order', async () => {
    // Transfer: A→B and B→A simultaneously
    // Without consistent lock order → deadlock
    // With consistent order (always lock lower ID first) → safe

    const accountA = await createAccount('account-aaa', 5000);
    const accountB = await createAccount('account-bbb', 5000);

    const transfer1 = transferUseCase.execute({ from: accountA.id, to: accountB.id, amount: 100 });
    const transfer2 = transferUseCase.execute({ from: accountB.id, to: accountA.id, amount: 200 });

    // Both should complete without deadlock (within 5s timeout)
    const [r1, r2] = await Promise.allSettled([transfer1, transfer2]);

    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');

    // Verify final balances are consistent
    const finalA = await accountRepo.getBalance(accountA.id);
    const finalB = await accountRepo.getBalance(accountB.id);
    expect(finalA + finalB).toBe(10000); // total unchanged
    expect(finalA).toBe(5000 - 100 + 200); // 5100
    expect(finalB).toBe(5000 + 100 - 200); // 4900
  });

  it('should timeout on lock acquisition (not hang forever)', async () => {
    const qr1 = ds.createQueryRunner();
    const qr2 = ds.createQueryRunner();

    // qr1 locks row
    await qr1.startTransaction();
    await qr1.query("SELECT * FROM accounts WHERE id = $1 FOR UPDATE", ['account-1']);

    // qr2 tries to lock same row → should timeout, not hang
    await qr2.startTransaction();
    await qr2.query("SET lock_timeout = '2s'");

    await expect(
      qr2.query("SELECT * FROM accounts WHERE id = $1 FOR UPDATE", ['account-1']),
    ).rejects.toThrow(/lock.*timeout|canceling/i);

    await qr1.rollbackTransaction();
    await qr2.rollbackTransaction();
    await qr1.release();
    await qr2.release();
  });

  // ❌ NEGATIVE EXAMPLE: Lock accounts in request order
  // Transfer A→B: lock(A) then lock(B)
  // Transfer B→A: lock(B) then lock(A)
  // Thread 1 holds A, waits for B. Thread 2 holds B, waits for A → DEADLOCK
  // Fix: Always lock in sorted order: lock(min(A,B)) then lock(max(A,B))
});
```

---

### Pattern CONC.4: Inventory / Balance Race Condition

```typescript
describe('Account Balance — Concurrent Withdrawals', () => {
  it('should not allow balance to go negative', async () => {
    // Account with $100. Two concurrent $80 withdrawals.
    const account = await createAccount('acc-1', 100);

    const [r1, r2] = await Promise.allSettled([
      withdrawUseCase.execute({ accountId: 'acc-1', amount: 80 }),
      withdrawUseCase.execute({ accountId: 'acc-1', amount: 80 }),
    ]);

    // One succeeds, one fails (insufficient funds)
    const successes = [r1, r2].filter(r => r.status === 'fulfilled').length;
    const failures = [r1, r2].filter(r => r.status === 'rejected').length;
    expect(successes).toBe(1);
    expect(failures).toBe(1);

    // Balance must be >= 0
    const finalBalance = await accountRepo.getBalance('acc-1');
    expect(finalBalance).toBe(20); // 100 - 80 = 20
    expect(finalBalance).toBeGreaterThanOrEqual(0); // NEVER negative
  });

  // ❌ NEGATIVE EXAMPLE: Check balance in application, then debit in DB
  // const balance = await getBalance(id);  // both threads read $100
  // if (balance >= amount) {               // both pass (100 >= 80)
  //   await debit(id, amount);             // both debit $80 → balance = -$60
  // }
  // Fix: SELECT ... FOR UPDATE, or atomic UPDATE WHERE balance >= amount
});
```

---

### Pattern CONC.5: Message Consumer Concurrent Processing

```typescript
describe('Kafka Consumer — Concurrent Message Safety', () => {
  it('should process messages for same entity sequentially (ordering)', async () => {
    const processOrder: string[] = [];

    // Publish 3 events for same loan (same partition key)
    for (const event of ['APPROVED', 'DISBURSING', 'DISBURSED']) {
      await producer.send({
        topic: 'loan.events',
        messages: [{ key: 'loan-1', value: JSON.stringify({ loanId: 'loan-1', status: event }) }],
      });
    }

    await waitFor(() => processOrder.length >= 3, { timeout: 15000 });

    // MUST be in order (same key = same partition = ordered)
    expect(processOrder).toEqual(['APPROVED', 'DISBURSING', 'DISBURSED']);
  });

  it('should handle rebalance without losing messages', async () => {
    // Simulate: consumer processes message, rebalance happens mid-processing
    let processedCount = 0;

    // Send 10 messages
    for (let i = 0; i < 10; i++) {
      await producer.send({ topic: 'test', messages: [{ value: `msg-${i}` }] });
    }

    // Consumer starts, processes some, then "rebalance"
    await consumer.run({
      eachMessage: async ({ message }) => {
        processedCount++;
        if (processedCount === 5) {
          // Simulate rebalance by disconnecting and reconnecting
          await consumer.stop();
          await consumer.connect();
          await consumer.subscribe({ topic: 'test' });
          await consumer.run({ eachMessage: async () => { processedCount++; } });
        }
      },
    });

    await waitFor(() => processedCount >= 10, { timeout: 30000 });
    expect(processedCount).toBe(10); // all messages processed (at-least-once)
  });

  // ❌ NEGATIVE EXAMPLE: Auto-commit before processing
  // Consumer reads message → auto-commit → crash before processing
  // Message lost forever — consumer resumes from committed offset
  // Fix: Manual commit AFTER successful processing
});
```

---

### Pattern CONC.6: Distributed Lock Testing

```typescript
describe('Distributed Lock (Redis)', () => {
  it('should prevent concurrent execution of same critical section', async () => {
    let executionCount = 0;

    const criticalSection = async (lockKey: string) => {
      const lock = await redisLock.acquire(lockKey, 5000); // 5s TTL
      try {
        executionCount++;
        await new Promise(r => setTimeout(r, 100)); // simulate work
        return executionCount;
      } finally {
        await lock.release();
      }
    };

    // 5 concurrent attempts for same lock
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => criticalSection('loan-disbursement:loan-1')),
    );

    // All should succeed (sequential due to lock)
    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBe(5);
    expect(executionCount).toBe(5); // all ran, but sequentially
  });

  it('should auto-release lock on TTL expiry (prevent deadlock)', async () => {
    // Acquire lock with 1s TTL, don't release
    await redisLock.acquire('expired-lock', 1000);

    // After 1.5s, another process should be able to acquire
    await new Promise(r => setTimeout(r, 1500));
    const lock = await redisLock.acquire('expired-lock', 5000);
    expect(lock).toBeDefined(); // acquired — not stuck

    await lock.release();
  });

  // ❌ NEGATIVE EXAMPLE: Application-level mutex (in-memory)
  // const mutex = new Map<string, boolean>();
  // Works on single instance, FAILS on multiple K8s pods
  // Pod 1 and Pod 2 both see mutex as free → both enter critical section
  // Fix: Redis SETNX or Redlock for distributed lock
});
```

---

## Test Execution Strategy

```
Concurrency tests MUST run:
  1. With REAL database (test containers) — not mocks
  2. With multiple concurrent promises (Promise.allSettled)
  3. With assertion on FINAL STATE, not intermediate steps
  4. With timeout per test (30s) — deadlocks must fail, not hang

CI configuration:
  maxWorkers: 1           # sequential — concurrency is within each test
  testTimeout: 30000      # 30s per test
  bail: false             # run all even if one fails
```

---

## Anti-Patterns

| # | Anti-Pattern | Consequence | Correct |
|---|-------------|-------------|---------|
| 1 | Test concurrency with mocked DB | Mock is single-threaded — race conditions invisible | Use test containers |
| 2 | `await one(); await two();` for "concurrent" test | Sequential execution — never triggers race | `Promise.allSettled([one(), two()])` |
| 3 | Assert intermediate state | Flaky — depends on thread scheduling | Assert final state only |
| 4 | No lock timeout in tests | Deadlock hangs test suite forever | `SET lock_timeout = '2s'` |
| 5 | In-memory mutex for distributed system | Works on 1 pod, fails on N pods | Redis distributed lock |

---

## Coverage Target

| Concern | Target | Why Critical |
|---------|--------|-------------|
| Optimistic lock conflict | 100% of concurrent-writable entities | Data corruption on conflict miss |
| Double-funding | 100% of shared-amount operations | Financial loss |
| Deadlock prevention | All bi-directional lock patterns | System hang |
| Negative balance | 100% of withdrawal/debit operations | Financial integrity |
| Message ordering | All ordered topics | State machine corruption |
| Distributed lock | All critical sections across pods | Double-execution |

---

## Quality Checklist

- [ ] **Q1**: Tests use `Promise.allSettled` for concurrent scenarios (not sequential)?
- [ ] **Q2**: Tests use real database (test containers), not mocks?
- [ ] **Q3**: Assertions check FINAL state, not intermediate?
- [ ] **Q4**: All financial operations tested with concurrent duplicate requests?
- [ ] **Q5**: Negative examples explain WHY each pattern matters?

---

*Test Plan Specialist — NestJS Concurrency & Race Condition Testing | EPS v10.0*
*Created from cross-debate W2: Gemini × Claude converged on concurrency blindspot*
