# Django CI/CD Specialist
# Django CI/CDスペシャリスト
# Chuyen Gia CI/CD Django

**Stack**: Python 3.12+ / Django 5.x / GitHub Actions | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `.github/workflows/`, `pyproject.toml` |
| **Variant** | ALL |
| **Naming Convention** | `ci.yml`, `cd.yml` |
| **Imports From** | — |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | github-actions, django-stubs-mypy, migration-check, security-check, coverage |
| **Pattern Numbers** | 46.1–46.5 |
| **Source Paths** | `.github/workflows/*.yml`, `pyproject.toml` |
| **File Count** | 1-2 workflow files |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | GitHub Actions CI workflow (lint, type-check, test), django-stubs for mypy, migration validation in CI, manage.py check --deploy, coverage enforcement |
| **Activation Trigger** | CI, CD, GitHub Actions, pipeline, deploy, lint, test, coverage |

---

## Purpose

Define Django CI/CD patterns: GitHub Actions workflow with lint, type-check, and test stages using PostgreSQL service, django-stubs for mypy type checking, migration validation to catch missing or unapplied migrations, deployment security checks, and coverage enforcement.

---

## Pattern 46.1: GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DJANGO_SETTINGS_MODULE: config.settings.testing
  SECRET_KEY: ci-test-secret-key
  DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install ruff
      - run: ruff check .
      - run: ruff format --check .

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements/development.txt
      - run: mypy apps/ --config-file pyproject.toml

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - run: pip install -r requirements/development.txt

      - name: Check migrations
        run: |
          python manage.py migrate --check
          python manage.py makemigrations --check --dry-run

      - name: Security check
        run: python manage.py check --deploy --fail-level WARNING

      - name: Run tests
        run: pytest --cov --cov-report=xml --cov-fail-under=85

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
```

---

## Pattern 46.2: Django-Stubs for mypy

```bash
pip install django-stubs djangorestframework-stubs
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
plugins = ["mypy_django_plugin.main", "mypy_drf_plugin.main"]
strict = false
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = false
ignore_missing_imports = true

[tool.django-stubs]
django_settings_module = "config.settings.development"

[[tool.mypy.overrides]]
module = "*.migrations.*"
ignore_errors = true

[[tool.mypy.overrides]]
module = "*.tests.*"
disallow_untyped_defs = false
```

---

## Pattern 46.3: Migration Check in CI

```yaml
# In CI workflow
- name: Check for unapplied migrations
  run: python manage.py migrate --check
  # Fails if there are unapplied migrations

- name: Check for missing migrations
  run: python manage.py makemigrations --check --dry-run
  # Fails if model changes need new migrations
```

```python
# Pre-commit hook (optional)
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: check-migrations
        name: Check Django migrations
        entry: python manage.py makemigrations --check --dry-run
        language: system
        pass_filenames: false
        always_run: true
```

---

## Pattern 46.4: manage.py check --deploy

```yaml
# In CI workflow
- name: Deployment security check
  run: python manage.py check --deploy --fail-level WARNING
  env:
    DEBUG: "False"
    ALLOWED_HOSTS: "ci.example.com"
    SECURE_SSL_REDIRECT: "True"
    SECRET_KEY: ${{ secrets.DJANGO_SECRET_KEY }}
```

```python
# Custom system check (optional)
# apps/core/checks.py
from django.core.checks import Error, Warning, register


@register()
def check_required_env_vars(app_configs, **kwargs):
    """Verify required environment variables are set."""
    import os
    errors = []
    required = ["DATABASE_URL", "SECRET_KEY", "ALLOWED_HOSTS"]

    for var in required:
        if not os.getenv(var):
            errors.append(
                Warning(
                    f"Environment variable {var} is not set.",
                    id="core.W001",
                )
            )
    return errors
```

---

## Pattern 46.5: Coverage Enforcement

```toml
# pyproject.toml
[tool.coverage.run]
source = ["apps"]
omit = [
    "*/migrations/*",
    "*/tests/*",
    "*/admin.py",
    "config/*",
    "manage.py",
]

[tool.coverage.report]
fail_under = 85
show_missing = true
skip_covered = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if TYPE_CHECKING:",
    "if settings.DEBUG:",
]
```

```bash
# Run with coverage
pytest --cov=apps --cov-report=term-missing --cov-fail-under=85

# Generate HTML report
pytest --cov=apps --cov-report=html
```

---

## MUST DO

- Check migrations in CI (`migrate --check` + `makemigrations --check`)
- Run `manage.py check --deploy` in CI
- Use django-stubs for mypy type checking
- Enforce coverage threshold (85%+) in CI
- Use PostgreSQL service container (match production)

## MUST NOT DO

- Skip migration checks in CI (broken migrations reach production)
- Deploy without running tests
- Skip type checking for Django code
- Use SQLite in CI when production uses PostgreSQL
- Commit secrets in workflow files (use GitHub Secrets)

---

## References

- [GitHub Actions: Service containers](https://docs.github.com/en/actions/using-containerized-services)
- [django-stubs](https://github.com/typeddjango/django-stubs)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
