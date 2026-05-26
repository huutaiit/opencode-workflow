# FastAPI Testing Specialist
# FastAPIテストスペシャリスト
# Chuyen Gia Testing FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Directory Pattern** | `tests/`, `tests/{domain}/` |
| **Variant** | ALL |
| **Naming Convention** | `test_*.py`, `conftest.py` |
| **Imports From** | Application, Domain, Presentation (under test) |
| **Cannot Import** | N/A |
| **Dependencies** | `pytest>=8.0`, `pytest-asyncio`, `httpx` (AsyncClient), `factory-boy` |
| **When To Use** | Async test client, DB fixtures, dependency overrides |
| **Source Skeleton** | `tests/conftest.py`, `tests/{domain}/test_{feature}.py`, `pyproject.toml` (tool.pytest) |
| **Pattern Numbers** | 80.1–80.7 |
| **Source Paths** | `tests/**/*.py`, `conftest.py` |
| **File Count** | 1 test file per source module |
| **Imported By** | N/A (test runner) |
| **Specialist Type** | code |
| **Purpose** | pytest-asyncio, httpx AsyncClient, DB fixtures with rollback, dependency overrides, factory_boy, parameterized tests, pytest configuration |
| **Activation Trigger** | test, pytest, AsyncClient, TestClient, fixture, mock |

---

## Purpose

Define testing patterns for FastAPI: async test client with httpx, database fixtures with session-scoped engine and function-scoped rollback, dependency overrides for isolation, factory pattern for test data, anyio marker, parameterized tests, and pytest configuration.

---

## Pattern 80.1: Async Test Client

```python
# conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import create_app


@pytest.fixture
async def app():
    """Create test app instance."""
    app = create_app()
    yield app
    app.dependency_overrides.clear()


@pytest.fixture
async def client(app):
    """Async HTTP client for testing."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


# Usage in tests
async def test_create_user(client: AsyncClient):
    response = await client.post("/api/v1/users", json={
        "email": "test@example.com",
        "full_name": "Test User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
```

**Key rules**:
- Use `httpx.AsyncClient` + `ASGITransport` (not Starlette's `TestClient`)
- `TestClient` is sync — doesn't work with async dependencies
- Set `base_url="http://test"` (required by httpx)

> Source: Kludex tip #5, zhanymkanov AGENTS.md

---

## Pattern 80.2: DB Fixtures (Session + Rollback)

```python
# conftest.py
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from src.core.database import Base


# Session-scoped: create engine once for all tests
@pytest.fixture(scope="session")
def engine():
    return create_async_engine(
        "postgresql+asyncpg://test:test@localhost:5432/test_db",
        echo=False,
    )


# Session-scoped: create tables once
@pytest.fixture(scope="session", autouse=True)
async def setup_db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# Function-scoped: each test gets its own session with rollback
@pytest.fixture
async def db_session(engine):
    """Isolated DB session — rolls back after each test."""
    async with engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)

        yield session

        await session.close()
        await conn.rollback()  # Undo all changes
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-testing)

---

## Pattern 80.3: Dependency Overrides

```python
from src.core.database import get_db_session


@pytest.fixture
async def client(app, db_session):
    """Client with overridden DB dependency."""
    # Override the real DB session with test session
    app.dependency_overrides[get_db_session] = lambda: db_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    # CRITICAL: Clear overrides after test
    app.dependency_overrides.clear()


# Override auth for tests
from src.auth.dependencies import get_current_user


@pytest.fixture
def mock_user():
    return {"id": 1, "email": "test@example.com", "role": "admin"}


@pytest.fixture
async def authed_client(app, db_session, mock_user):
    """Client with authenticated user."""
    app.dependency_overrides[get_db_session] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: mock_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
```

---

## Pattern 80.4: Factory Pattern (Test Data)

```python
# pip install factory_boy faker
import factory
from faker import Faker

from src.users.models import UserModel

fake = Faker()


class UserFactory(factory.Factory):
    """Generate test users with realistic fake data."""

    class Meta:
        model = dict  # Return dicts (or Pydantic models)

    email = factory.LazyFunction(fake.email)
    full_name = factory.LazyFunction(fake.name)
    is_active = True


# Usage
def test_user_factory():
    user = UserFactory()
    # {"email": "john.doe@example.com", "full_name": "John Doe", "is_active": True}

    # Override specific fields
    admin = UserFactory(email="admin@example.com", is_active=False)

    # Batch create
    users = UserFactory.create_batch(10)
    assert len(users) == 10


# SQLAlchemy factory (inserts into DB)
class SQLAUserFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = UserModel
        sqlalchemy_session_persistence = "commit"

    email = factory.LazyFunction(fake.email)
    full_name = factory.LazyFunction(fake.name)
    hashed_password = "hashed_test_password"
```

---

## Pattern 80.5: pytest.mark.anyio

```python
import pytest


# Option 1: Use anyio marker (recommended by Kludex)
@pytest.mark.anyio
async def test_create_user(client):
    response = await client.post("/users", json={"email": "test@example.com"})
    assert response.status_code == 201


# Option 2: asyncio auto mode (no marker needed)
# pyproject.toml: asyncio_mode = "auto"
async def test_list_users(client):
    response = await client.get("/users")
    assert response.status_code == 200
```

> Source: Kludex tip #10

---

## Pattern 80.6: Parameterized Tests

```python
import pytest


@pytest.mark.parametrize(
    "email,status_code",
    [
        ("valid@example.com", 201),
        ("invalid-email", 422),
        ("", 422),
        ("a" * 256 + "@example.com", 422),
    ],
)
async def test_create_user_validation(client, email, status_code):
    response = await client.post("/users", json={
        "email": email,
        "full_name": "Test",
    })
    assert response.status_code == status_code


@pytest.mark.parametrize(
    "role,expected_access",
    [
        ("admin", True),
        ("editor", True),
        ("viewer", False),
    ],
)
async def test_role_permissions(authed_client, role, expected_access):
    response = await authed_client.delete("/users/1")
    if expected_access:
        assert response.status_code in (200, 204)
    else:
        assert response.status_code == 403
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-testing)

---

## Pattern 80.7: pytest Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"              # No need for @pytest.mark.asyncio
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "-v",                          # Verbose output
    "--strict-markers",            # Error on unknown markers
    "--tb=short",                  # Short traceback
    "-x",                          # Stop on first failure (dev)
]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks integration tests",
]
filterwarnings = [
    "ignore::DeprecationWarning",
]
```

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_users.py

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Run only fast tests (exclude slow/integration)
pytest -m "not slow and not integration"

# Run in parallel
pytest -n auto  # requires pytest-xdist
```

---

## MUST DO

- Use `httpx.AsyncClient` + `ASGITransport` (not TestClient)
- Set async test mode from day 0 (`asyncio_mode = "auto"`)
- Use function-scoped DB sessions with rollback
- Clear `dependency_overrides` after each test
- Use factories for test data (not hardcoded fixtures)
- Parameterize tests for input validation

## MUST NOT DO

- Use `TestClient` for async endpoints (sync-only)
- Forget to rollback test database transactions
- Leave `dependency_overrides` set after tests (leaks between tests)
- Hardcode test data inline (use factories)
- Skip testing error responses (422, 403, 404)
- Use `@pytest.mark.asyncio` when `asyncio_mode = "auto"` (redundant)

---

## References

- [FastAPI: Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [httpx: Async Testing](https://www.python-httpx.org/async/)
- [factory_boy](https://factoryboy.readthedocs.io/)
