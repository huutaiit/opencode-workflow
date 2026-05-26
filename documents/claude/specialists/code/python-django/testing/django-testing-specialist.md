# Django Testing Specialist
# Djangoテストスペシャリスト
# Chuyen Gia Testing Django

**Stack**: Python 3.12+ / Django 5.x / pytest-django | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Directory Pattern** | `apps/{domain}/tests/`, `conftest.py` |
| **Variant** | ALL |
| **Naming Convention** | `test_*.py`, `conftest.py`, `test_` prefix for functions |
| **Imports From** | pytest, django.test, Domain (models, views, forms) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | pytest-config, django-db-marker, test-client, request-factory, fixtures, parametrize, test-db-config |
| **Pattern Numbers** | 40.1–40.7 |
| **Source Paths** | `**/tests/*.py`, `**/conftest.py` |
| **File Count** | Multiple test files per app |
| **Imported By** | — (pytest runner) |
| **Specialist Type** | code |
| **Purpose** | pytest-django configuration, @pytest.mark.django_db, Django test Client, RequestFactory for unit tests, fixtures and conftest, parameterized tests, test database configuration |
| **Activation Trigger** | test, pytest, django_db, Client, TestCase, fixture, conftest |

---

## Purpose

Define Django testing patterns with pytest-django: project configuration, database access markers, Django test Client for integration tests, RequestFactory for view unit tests, shared fixtures in conftest.py, parameterized tests for data-driven testing, and test database configuration for speed vs accuracy.

---

## Pattern 40.1: pytest-django Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.testing"
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",
    "--strict-config",
    "-ra",
    "--tb=short",
    "--cov=apps",
    "--cov-report=term-missing",
    "--cov-fail-under=85",
]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests as integration tests",
]
asyncio_mode = "auto"
```

```bash
# Run tests
pytest                          # All tests
pytest apps/articles/           # Single app
pytest -k "test_create"         # By name pattern
pytest -m "not slow"            # Exclude slow tests
pytest --reuse-db               # Reuse test DB (faster)
```

---

## Pattern 40.2: Database Access (@pytest.mark.django_db)

```python
# tests/test_models.py
import pytest
from apps.articles.models import Article


@pytest.mark.django_db
def test_article_str():
    article = Article.objects.create(title="Hello World", body="Content")
    assert str(article) == "Hello World"


@pytest.mark.django_db
def test_article_slug_generation():
    article = Article.objects.create(title="My First Article", body="Content")
    assert article.slug == "my-first-article"


@pytest.mark.django_db(transaction=True)
def test_article_unique_slug():
    """transaction=True for testing unique constraints with rollback."""
    Article.objects.create(title="Test", body="A")
    Article.objects.create(title="Test", body="B")
    assert Article.objects.filter(slug__startswith="test").count() == 2
```

---

## Pattern 40.3: Django Test Client

```python
# tests/test_views.py
import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_article_list_view(client):
    """client is a built-in pytest-django fixture."""
    url = reverse("articles:list")
    response = client.get(url)
    assert response.status_code == 200
    assert "articles" in response.context


@pytest.mark.django_db
def test_article_create_requires_login(client):
    url = reverse("articles:create")
    response = client.get(url)
    assert response.status_code == 302  # Redirect to login


@pytest.mark.django_db
def test_article_create_authenticated(client, user):
    client.force_login(user)
    url = reverse("articles:create")

    response = client.post(url, {
        "title": "New Article",
        "body": "Some content",
        "category": 1,
    })
    assert response.status_code == 302  # Redirect after success
    assert Article.objects.filter(title="New Article").exists()
```

---

## Pattern 40.4: RequestFactory (Unit Test Views)

```python
# tests/test_views_unit.py
import pytest
from django.test import RequestFactory
from apps.articles.views import article_detail, ArticleCreateView


@pytest.fixture
def rf():
    return RequestFactory()


@pytest.mark.django_db
def test_article_detail_fbv(rf, user, article):
    """Unit test FBV — no middleware, faster."""
    request = rf.get(f"/articles/{article.pk}/")
    request.user = user

    response = article_detail(request, pk=article.pk)
    assert response.status_code == 200


@pytest.mark.django_db
def test_article_create_cbv(rf, user):
    """Unit test CBV with RequestFactory."""
    request = rf.get("/articles/create/")
    request.user = user

    view = ArticleCreateView.as_view()
    response = view(request)
    assert response.status_code == 200
```

---

## Pattern 40.5: Fixtures and conftest.py

```python
# conftest.py (project root)
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="test@example.com",
        password="testpass123",
        username="testuser",
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin@example.com",
        password="adminpass123",
        username="admin",
    )


@pytest.fixture
def auth_client(client, user):
    """Pre-authenticated test client."""
    client.force_login(user)
    return client


@pytest.fixture
def admin_client(client, admin_user):
    """Pre-authenticated admin client."""
    client.force_login(admin_user)
    return client
```

```python
# apps/articles/tests/conftest.py
import pytest
from apps.articles.models import Article, Category


@pytest.fixture
def category(db):
    return Category.objects.create(name="Tech", slug="tech")


@pytest.fixture
def article(db, user, category):
    return Article.objects.create(
        title="Test Article",
        body="Test content",
        author=user,
        category=category,
        status="published",
    )


@pytest.fixture
def draft_article(db, user, category):
    return Article.objects.create(
        title="Draft Article",
        body="Draft content",
        author=user,
        category=category,
        status="draft",
    )
```

---

## Pattern 40.6: Parameterized Tests

```python
@pytest.mark.django_db
@pytest.mark.parametrize("status,expected_count", [
    ("published", 3),
    ("draft", 2),
    ("archived", 1),
])
def test_article_filter_by_status(client, status, expected_count):
    # Setup test data...
    url = reverse("articles:list") + f"?status={status}"
    response = client.get(url)
    assert len(response.context["articles"]) == expected_count


@pytest.mark.django_db
@pytest.mark.parametrize("user_role,expected_status", [
    ("anonymous", 302),
    ("viewer", 403),
    ("editor", 200),
    ("admin", 200),
])
def test_admin_panel_access(client, user_role, expected_status):
    # Setup user with role...
    response = client.get(reverse("admin:index"))
    assert response.status_code == expected_status
```

---

## Pattern 40.7: Test Database Configuration

```python
# config/settings/testing.py
from config.settings.base import *  # noqa

DEBUG = False
SECRET_KEY = "test-secret-key-not-for-production"

# Fast password hashing for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable migrations for faster tests (optional)
# MIGRATION_MODULES = {app: None for app in INSTALLED_APPS}

# Option A: SQLite in memory (fast, but may miss Postgres-specific bugs)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}

# Option B: PostgreSQL (same as production — catches DB-specific issues)
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": "test_myproject",
#         "USER": "postgres",
#         "PASSWORD": "postgres",
#         "HOST": "localhost",
#     },
# }

# Disable Celery (run tasks synchronously)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Disable email sending
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Disable caching
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    },
}
```

---

## MUST DO

- Use pytest-django (not unittest.TestCase)
- Use `@pytest.mark.django_db` for any test accessing the database
- Create shared fixtures in `conftest.py` (project root + per-app)
- Use `RequestFactory` for view unit tests, `Client` for integration
- Set `CELERY_TASK_ALWAYS_EAGER = True` in test settings

## MUST NOT DO

- Use `unittest.TestCase` (pytest fixtures won't work)
- Hardcode test data in each test (use fixtures/factories)
- Skip `--cov-fail-under` enforcement in CI
- Test against production database
- Use MD5 password hasher outside of test settings

---

## References

- [pytest-django](https://pytest-django.readthedocs.io/)
- [Django: Testing](https://docs.djangoproject.com/en/5.0/topics/testing/)
- [Django: Test Client](https://docs.djangoproject.com/en/5.0/topics/testing/tools/#the-test-client)
