# Test Plan Specialist — FastAPI Unit Testing: Repository Layer
# テストプランスペシャリスト — FastAPI Unit Testing: Repository Layer
# Chuyen Gia Test — FastAPI Unit Testing: Repository Layer

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Repository layer testing - SQLAlchemy async with Testcontainers PostgreSQL, CRUD operations, complex queries, migrations

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-R |
| **Specialist Type** | code |
| **Purpose** | Repository layer testing - SQLAlchemy async with Testcontainers PostgreSQL, CRUD operations, complex queries, migrations |

---

## Patterns

### Pattern UT-R.1: Repository with Testcontainers

@pytest.fixture(scope="session") async def pg_container(): container = PostgresContainer("postgres:16"). async_engine = create_async_engine(container.get_connection_url()). async with async_engine.begin() as conn: await conn.run_sync(Base.metadata.create_all).

---

### Pattern UT-R.2: CRUD Operations

Test create/read/update/delete against real Postgres. async with session.begin(): repo = UserRepository(session). user = await repo.create(UserCreate(...)). found = await repo.get_by_id(user.id). assert found.name == user.name.

---

### Pattern UT-R.3: Complex Query Testing

Test filter/sort/pagination/join against real DB with seeded data. SELECT with JOIN, GROUP BY, subquery. Verify result count and field values.

---

### Pattern UT-R.4: Alembic Migration Testing

Run alembic upgrade head on test container. Verify tables exist. Run alembic downgrade -1. Verify rollback clean.

---

## ❌ Negative Example

BAD: SQLite for Postgres-specific queries (jsonb, array, ON CONFLICT). GOOD: Testcontainers PostgreSQL - same engine as production.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Unit Testing: Repository Layer | EPS v10.0*
