# Test Plan Specialist — FastAPI Integration Testing: Database
# テストプランスペシャリスト — FastAPI Integration Testing: Database
# Chuyen Gia Test — FastAPI Integration Testing: Database

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Database integration - SQLAlchemy async with real PostgreSQL, Alembic migrations, transaction isolation, connection pool behavior

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-DB |
| **Specialist Type** | code |
| **Purpose** | Database integration - SQLAlchemy async with real PostgreSQL, Alembic migrations, transaction isolation, connection pool behavior |

---

## Patterns

### Pattern INT-DB.1: SQLAlchemy Async + Testcontainers

PostgresContainer + create_async_engine + AsyncSession. Full ORM round-trip: create entity -> query -> verify. Tests real SQL against real Postgres.

---

### Pattern INT-DB.2: Alembic Migration Integration

alembic upgrade head on test container. Verify schema matches expected. alembic downgrade -1 for rollback test. Test data migration scripts.

---

### Pattern INT-DB.3: Transaction Isolation

Two async sessions: session1 updates without commit, session2 reads -> should NOT see uncommitted (READ COMMITTED). Test SERIALIZABLE for financial.

---

### Pattern INT-DB.4: Connection Pool Behavior

asyncpg pool_size=5, fire 20 concurrent queries. Verify no ConnectionPoolExhausted. Monitor pool.get_idle_size().

---

## ❌ Negative Example

BAD: SQLite in-memory hides Postgres-specific bugs (jsonb operators, ON CONFLICT, array_agg). GOOD: Testcontainers catches real SQL issues.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Integration Testing: Database | EPS v10.0*
