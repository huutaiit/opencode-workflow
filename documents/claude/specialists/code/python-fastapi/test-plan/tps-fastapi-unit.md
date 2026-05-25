# Test Plan Specialist — FastAPI Unit Testing (Strategy + Routing)
# テストプランスペシャリスト — FastAPI ユニットテスト（戦略＋ルーティング）
# Chuyen Gia Test — Unit Test FastAPI (Chien Luoc + Routing)

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio + unittest.mock
**Aspect**: Unit Testing — Strategy Hub
**Category**: backend
**Purpose**: Unit test strategy for FastAPI — layer routing (domain/service/repository/router), async testing, dependency_overrides mock strategy, coverage targets

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-FASTAPI-UNIT |
| **Directory Pattern** | `tests/unit/**/*.py` |
| **Naming Convention** | `test_{module}.py` |
| **Dependencies** | pytest, pytest-asyncio, pytest-cov, unittest.mock |
| **Specialist Type** | code |
| **Purpose** | Unit test strategy hub — routes to layer-specific test plans |
| **Activation Trigger** | files: tests/unit/**; keywords: unitTest, pytest, mock, asyncTest |

---

## Layer Routing Table

| Layer | Test Plan | File | Load When |
|-------|-----------|------|-----------|
| Domain | TPS-FASTAPI-UNIT-DOMAIN | `tps-fastapi-unit-domain.md` | Testing models, schemas, enums, domain logic |
| Service | TPS-FASTAPI-UNIT-SERVICE | `tps-fastapi-unit-service.md` | Testing business logic with mocked repos |
| Repository | TPS-FASTAPI-UNIT-REPOSITORY | `tps-fastapi-unit-repository.md` | Testing DB access with test containers |
| Router | TPS-FASTAPI-UNIT-ROUTER | `tps-fastapi-unit-router.md` | Testing endpoints with TestClient/httpx |

---

## Strategy Overview

| Layer | Mock Strategy | Test Framework | Key Pattern |
|-------|-------------|----------------|-------------|
| **Domain** | No mock — pure Python | pytest | Direct instantiation, Pydantic validation |
| **Service** | Mock repositories via `unittest.mock.AsyncMock` | pytest-asyncio | `@pytest.mark.asyncio` + `AsyncMock` |
| **Repository** | Real DB via Testcontainers | pytest + testcontainers | `@pytest.fixture` async session |
| **Router** | `app.dependency_overrides[get_db]` | httpx.AsyncClient / TestClient | Override FastAPI dependencies |

## Mock Strategy: FastAPI dependency_overrides

```python
# The KEY pattern — FastAPI's DI override for testing
from app.main import app
from app.core.deps import get_db, get_current_user

# Override DB dependency
async def override_get_db():
    async with test_session() as session:
        yield session

# Override auth dependency
def override_get_current_user():
    return User(id=1, role="admin")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
```

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain models/schemas | ≥95% | Core validation rules |
| Services | ≥90% | Business logic |
| Repositories | ≥80% | Deeper via integration |
| Routers | ≥80% | Thin — verify routing + status codes |
| **Overall** | ≥85% | `pytest --cov=src --cov-fail-under=85` |

## Anti-Patterns

| # | Anti-Pattern | Correct |
|---|-------------|---------|
| 1 | `sqlite://` for DB tests | Testcontainers (real Postgres) |
| 2 | `def test_` for async code | `async def test_` + `@pytest.mark.asyncio` |
| 3 | Mock Pydantic model | Test real validation — that's the point |
| 4 | Import `from app.main import app` globally | Use fixture to avoid startup side effects |

---

*Test Plan Specialist — FastAPI Unit Testing (Strategy + Routing) | EPS v10.0*
