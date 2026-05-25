# Test Plan Specialist — FastAPI Concurrency Testing
# テストプランスペシャリスト — FastAPI Concurrency Testing
# Chuyen Gia Test — FastAPI Concurrency Testing

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Concurrency testing - asyncio.gather for concurrent requests, SELECT FOR UPDATE, distributed lock (Redis), double-funding prevention

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | CONC |
| **Specialist Type** | code |
| **Purpose** | Concurrency testing - asyncio.gather for concurrent requests, SELECT FOR UPDATE, distributed lock (Redis), double-funding prevention |

---

## Patterns

### Pattern CONC.1: Concurrent Async Requests

results = await asyncio.gather(*[service.process(id) for _ in range(10)], return_exceptions=True). Count successes vs failures. Verify final state is consistent.

---

### Pattern CONC.2: Optimistic Lock (SQLAlchemy version_id)

from sqlalchemy import Column, Integer. __mapper_args__ = {"version_id_col": version}. Two sessions read same row -> first updates -> second gets StaleDataError.

---

### Pattern CONC.3: Pessimistic Lock (SELECT FOR UPDATE)

session.execute(select(Account).where(Account.id == id).with_for_update()). Two concurrent transactions: one waits until other commits. Verify no double-debit.

---

### Pattern CONC.4: Double-Funding Prevention

10 concurrent funding requests via asyncio.gather. Total funded must not exceed loan amount. Use FOR UPDATE or application-level distributed lock.

---

### Pattern CONC.5: Distributed Lock (Redis)

redis-lock or aioredlock. 5 concurrent async tasks for same key -> only 1 executes at a time. Lock TTL auto-release on crash.

---

## ❌ Negative Example

BAD: Sequential test (await one(); await two();) never triggers race. GOOD: asyncio.gather(*[...]) with real DB.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Concurrency Testing | EPS v10.0*
