# Test Plan Specialist — FastAPI E2E Testing
# テストプランスペシャリスト — FastAPI E2E Testing
# Chuyen Gia Test — FastAPI E2E Testing

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: End-to-end testing - full app with Testcontainers, auth flow, multi-step scenarios, data seeding

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | E2E |
| **Specialist Type** | code |
| **Purpose** | End-to-end testing - full app with Testcontainers, auth flow, multi-step scenarios, data seeding |

---

## Patterns

### Pattern E2E.1: Full App with Testcontainers

@pytest.fixture(scope="session") async def app(): pg = PostgresContainer(...).start(). override settings.DATABASE_URL. app = create_app(). yield app. Full lifecycle testing.

---

### Pattern E2E.2: Auth Flow E2E

POST /auth/login -> get token -> GET /users (with token) -> 200. GET /users (without token) -> 401. GET /admin (user role) -> 403.

---

### Pattern E2E.3: Multi-Step Scenario

Create user -> create order -> process payment -> verify all tables. Test cross-module flows with real DB.

---

### Pattern E2E.4: Data Seeding

@pytest.fixture async def seed_data(session): users = [User(...), ...]. session.add_all(users). await session.commit(). yield users. Cleanup automatic via transaction rollback.

---

## ❌ Negative Example

BAD: E2E with mocked DB tests framework, not real behavior. GOOD: Testcontainers for production-like E2E.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI E2E Testing | EPS v10.0*
