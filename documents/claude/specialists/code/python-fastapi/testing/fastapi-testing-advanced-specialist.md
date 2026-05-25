# FastAPI Advanced Testing Specialist
# FastAPI高度テストスペシャリスト
# Chuyen Gia Testing Nang Cao FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Directory Pattern** | `tests/integration/`, `tests/e2e/`, `tests/load/` |
| **Variant** | ALL |
| **Naming Convention** | `test_*.py`, `locustfile.py` |
| **Imports From** | Application, Domain (under test) |
| **Cannot Import** | N/A |
| **Dependencies** | `pytest-cov`, `locust` (load testing), `schemathesis` (contract testing) |
| **When To Use** | Test isolation, mock external services, load testing, contract testing |
| **Source Skeleton** | `tests/conftest.py`, `tests/load/locustfile.py`, `.github/workflows/ci.yml` (coverage) |
| **Pattern Numbers** | 81.1–81.6 |
| **Source Paths** | `tests/**/*.py`, `locustfile.py` |
| **File Count** | Varies |
| **Imported By** | N/A (test runner) |
| **Specialist Type** | code |
| **Purpose** | Test isolation strategy, mocking external services, Locust load testing, asgi-lifespan test lifecycle, contract testing, coverage configuration |
| **Activation Trigger** | integration test, e2e, mock external, locust, load test, contract, coverage |

---

## Purpose

Define advanced testing patterns for FastAPI: test isolation strategies (unit/integration/e2e), mocking external services with AsyncMock, load testing with Locust, asgi-lifespan for test lifecycle, contract testing between services, and coverage enforcement.

---

## Pattern 81.1: Test Isolation Strategy

```
tests/
├── unit/                  # Fast, isolated, mocked deps
│   ├── test_services.py
│   └── test_schemas.py
├── integration/           # Real DB, mocked externals
│   ├── test_repositories.py
│   └── test_api.py
├── e2e/                   # Full stack, real services
│   └── test_workflows.py
├── load/                  # Performance
│   └── locustfile.py
└── conftest.py           # Shared fixtures
```

| Type | DB | External APIs | Speed | When to Run |
|------|-----|-------------|-------|-------------|
| Unit | Mock | Mock | < 1s | Every commit |
| Integration | Real (test DB) | Mock | 1-10s | Every PR |
| E2E | Real | Real (staging) | 10-60s | Pre-deploy |
| Load | Real | Real/Mock | Minutes | Weekly/Release |

```bash
# Run by category
pytest tests/unit -x                     # Fast, stop on first fail
pytest tests/integration -m integration  # Requires test DB
pytest tests/e2e -m e2e --slow           # Full stack
```

---

## Pattern 81.2: Mocking External Services

```python
from unittest.mock import AsyncMock, patch
import pytest


# AsyncMock for async functions
@pytest.fixture
def mock_email_service():
    service = AsyncMock()
    service.send.return_value = {"status": "sent", "message_id": "abc-123"}
    return service


async def test_user_creation_sends_email(client, mock_email_service):
    with patch("src.users.service.email_service", mock_email_service):
        response = await client.post("/users", json={
            "email": "test@example.com",
            "full_name": "Test User",
        })

    assert response.status_code == 201
    mock_email_service.send.assert_called_once_with(
        to="test@example.com",
        subject="Welcome!",
    )


# Mock AWS services with moto
# pip install moto[s3]
import boto3
from moto import mock_aws


@pytest.fixture
def s3_bucket():
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="test-bucket")
        yield s3


async def test_file_upload(client, s3_bucket):
    response = await client.post(
        "/files/upload",
        files={"file": ("test.txt", b"content", "text/plain")},
    )
    assert response.status_code == 200


# pytest-mock for cleaner mocking
async def test_with_mocker(client, mocker):
    mock_charge = mocker.patch(
        "src.payments.service.payment_gateway.charge",
        new_callable=AsyncMock,
        return_value={"status": "success"},
    )

    response = await client.post("/orders/1/pay")
    assert response.status_code == 200
    mock_charge.assert_called_once()
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-testing)

---

## Pattern 81.3: Load Testing with Locust

```python
# locustfile.py
# pip install locust
from locust import HttpUser, task, between


class APIUser(HttpUser):
    """Simulated API user for load testing."""

    wait_time = between(0.5, 2)  # Random wait between requests
    host = "http://localhost:8000"

    def on_start(self):
        """Authenticate on session start."""
        response = self.client.post("/auth/login", json={
            "email": "loadtest@example.com",
            "password": "testpassword",
        })
        self.token = response.json()["access_token"]
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(5)  # Weight: 5x more likely than weight-1 tasks
    def list_users(self):
        self.client.get("/api/v1/users?page=1&size=20")

    @task(3)
    def get_user(self):
        self.client.get("/api/v1/users/1")

    @task(1)
    def create_user(self):
        self.client.post("/api/v1/users", json={
            "email": f"user_{self.environment.runner.user_count}@test.com",
            "full_name": "Load Test User",
        })
```

```bash
# Run Locust
locust -f locustfile.py --host http://localhost:8000

# Headless mode (CI)
locust -f locustfile.py --host http://localhost:8000 \
    --headless -u 100 -r 10 --run-time 60s \
    --csv results/load_test
```

---

## Pattern 81.4: asgi-lifespan for Test Lifecycle

```python
# pip install asgi-lifespan
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def client():
    """Client with proper lifespan management.

    LifespanManager triggers startup/shutdown events,
    ensuring DB pools, caches, etc. are initialized.
    """
    app = create_app()

    async with LifespanManager(app) as manager:
        async with AsyncClient(
            transport=ASGITransport(app=manager.app),
            base_url="http://test",
        ) as ac:
            yield ac
```

> Source: Kludex tip #5

---

## Pattern 81.5: Contract Testing

```python
from pydantic import BaseModel


# Shared contract (schema validation between services)
class UserContract(BaseModel):
    """Contract: what User Service MUST return."""
    id: int
    email: str
    full_name: str
    is_active: bool


async def test_user_api_contract(client):
    """Verify API response matches contract."""
    response = await client.get("/api/v1/users/1")
    assert response.status_code == 200

    # Validate response matches contract
    user = UserContract.model_validate(response.json())
    assert user.id == 1
    assert "@" in user.email


# Consumer-driven contract test
async def test_order_service_gets_valid_user(client):
    """Order service depends on User service contract."""
    response = await client.get("/api/v1/users/1")
    user = response.json()

    # Fields that Order service needs
    assert "id" in user
    assert "email" in user
    assert isinstance(user["id"], int)
```

---

## Pattern 81.6: Coverage Configuration

```toml
# pyproject.toml
[tool.coverage.run]
source = ["src"]
omit = [
    "src/core/config.py",        # Configuration
    "src/**/migrations/**",       # Alembic migrations
    "src/main.py",                # App entry point
]

[tool.coverage.report]
fail_under = 85                   # Enforce minimum coverage
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
    "@abstractmethod",
]
```

```bash
# Run with coverage
pytest --cov=src --cov-report=term-missing --cov-report=html

# CI enforcement
pytest --cov=src --cov-fail-under=85
```

---

## MUST DO

- Use mocks for external services in CI (email, payment, AWS)
- Use `AsyncMock` for async function mocking
- Run load tests before major releases
- Use `LifespanManager` for tests that need startup/shutdown
- Enforce coverage minimum (>=85%) in CI
- Organize tests by type (unit/integration/e2e)

## MUST NOT DO

- Call real external APIs in unit/integration tests
- Ignore flaky tests (fix root cause)
- Skip load testing for production services
- Set coverage target below 85% (diminishing returns above 95%)
- Mix test types in same directory
- Test implementation details (test behavior, not internals)

---

## References

- [Locust](https://locust.io/)
- [asgi-lifespan](https://github.com/florimondmanca/asgi-lifespan)
- [moto (AWS mocking)](https://github.com/getmoto/moto)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
