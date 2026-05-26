# Test Plan Specialist — Java Concurrency Testing
# テストプランスペシャリスト — Java 並行性テスト
# Chuyen Gia Test — Concurrency Test Java

**Version**: 1.0.0
**Technology**: JUnit 5 + CountDownLatch + ExecutorService + Testcontainers
**Aspect**: Concurrency Testing
**Category**: backend
**Purpose**: Concurrency testing — optimistic lock, double-funding, deadlock prevention, @Version column, distributed lock, StepVerifier concurrent subscriptions

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | CONC |
| **Specialist Type** | code |
| **Purpose** | Concurrency testing — optimistic lock, double-funding, deadlock prevention, @Version column, distributed lock, StepVerifier concurrent subscriptions |

---

## Patterns

### Pattern CONC.1: Optimistic Lock (@Version)

Read entity twice → update first → update second with stale version → ObjectOptimisticLockingFailureException. Test retry strategy: re-read + retry up to 3 times.

---

### Pattern CONC.2: Double-Funding Prevention

10 threads fund same loan ($2000 each, loan=$10,000). Use CountDownLatch to synchronize start. After all complete: totalFunded = $10,000 exactly, not $20,000. SELECT ... FOR UPDATE in repository.

---

### Pattern CONC.3: Deadlock Prevention

Transfer A→B and B→A simultaneously (2 threads). With consistent lock ordering (lock smaller ID first): both complete. Without: deadlock detected by PG within lock_timeout.

---

### Pattern CONC.4: Negative Balance Prevention

2 threads withdraw $80 from $100 account simultaneously. One succeeds ($20 remaining), one fails (InsufficientFundsException). Balance NEVER goes negative.

---

### Pattern CONC.5: Reactive Concurrent Subscriptions

StepVerifier: create 10 subscriptions to same Mono → all should complete, not deadlock. Test with Schedulers.parallel() for multi-thread Reactor.

---

### Pattern CONC.6: Distributed Lock (Redis)

Redisson tryLock: 5 concurrent threads for same lock key → only 1 executes at a time. Lock TTL auto-release on crash. Test across 2 instances (separate @SpringBootTest ports).

---

## ❌ Negative Example

❌ Sequential test: thread1.run(); thread2.run(); — never triggers race. ✅ CountDownLatch + ExecutorService: synchronized parallel start, catches real race conditions.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Concurrency Testing | EPS v10.0*
