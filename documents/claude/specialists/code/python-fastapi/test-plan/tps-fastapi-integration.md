# Test Plan Specialist — FastAPI Integration Testing (Strategy + Routing)
# テストプランスペシャリスト — FastAPI Integration Testing (Strategy + Routing)
# Chuyen Gia Test — FastAPI Integration Testing (Strategy + Routing)

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Integration test strategy - concern routing (database, messaging, API contract), Testcontainers orchestration, CI pipeline

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | ROUTING |
| **Specialist Type** | code |
| **Purpose** | Integration test strategy - concern routing (database, messaging, API contract), Testcontainers orchestration, CI pipeline |

---

## Patterns

### Pattern ROUTING: Concern Table

Database: tps-fastapi-integration-database.md | Messaging: tps-fastapi-integration-messaging.md | API Contract: tps-fastapi-integration-api-contract.md | E2E: tps-fastapi-e2e.md

---

### Pattern SETUP: conftest.py Shared Fixtures

@pytest.fixture(scope="session") for Testcontainers. @pytest.fixture(autouse=True) async def clean_db(session): await session.execute(text("TRUNCATE users, orders CASCADE")). yield. Shared across all integration tests.

---

### Pattern CI: GitHub Actions

services: postgres (image: postgres:16), redis (image: redis:7). pytest tests/integration/ --asyncio-mode=auto -v.

---

## ❌ Negative Example

BAD: SQLite for integration. BAD: No cleanup between tests. GOOD: Testcontainers + TRUNCATE.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Integration Testing (Strategy + Routing) | EPS v10.0*
