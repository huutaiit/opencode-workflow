# Python Code Quality Specialist
# Pythonコード品質スペシャリスト
# Chuyen Gia Chat Luong Code Python

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | `pyproject.toml`, `.pre-commit-config.yaml` |
| **Variant** | ALL |
| **Naming Convention** | N/A (tooling) |
| **Imports From** | N/A |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | ruff-config, ruff-format, mypy-django-stubs, pyproject-toml, pre-commit, ci-quality, import-sorting |
| **Pattern Numbers** | 67.1–67.7 |
| **Source Paths** | `pyproject.toml`, `.pre-commit-config.yaml` |
| **File Count** | 2-3 config files |
| **Imported By** | — |
| **Specialist Type** | language |
| **Purpose** | Ruff linting and formatting, mypy with django-stubs, pyproject.toml unified config, pre-commit hooks with migration check, CI quality steps, import sorting |
| **Activation Trigger** | ruff, mypy, lint, format, pre-commit, django-stubs, code quality |

---

## Purpose

Define Python code quality tooling for Django: Ruff for fast linting and formatting, mypy with django-stubs and DRF stubs for type checking, unified configuration in pyproject.toml, pre-commit hooks including Django migration checks, CI integration for quality gates, and import sorting.

---

## Pattern 67.1: Ruff Configuration

```toml
# pyproject.toml
[tool.ruff]
target-version = "py312"
line-length = 120
src = ["apps", "config"]

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "C4",   # flake8-comprehensions
    "UP",   # pyupgrade
    "SIM",  # flake8-simplify
    "DJ",   # flake8-django
    "RUF",  # Ruff-specific
]
ignore = [
    "E501",   # line too long (handled by formatter)
    "B008",   # function call in default argument (Django patterns)
]

[tool.ruff.lint.per-file-ignores]
"*/migrations/*.py" = ["E501", "DJ"]
"*/tests/*.py" = ["S101"]  # allow assert in tests
"conftest.py" = ["S101"]

[tool.ruff.lint.isort]
known-first-party = ["apps", "config"]
known-django = ["django", "rest_framework"]
section-order = ["future", "standard-library", "django", "third-party", "first-party", "local-folder"]

[tool.ruff.lint.isort.sections]
"django" = ["django", "rest_framework"]
```

```bash
ruff check .          # Lint
ruff check . --fix    # Auto-fix
ruff format .         # Format
ruff format --check . # Check formatting
```

---

## Pattern 67.2: Ruff Formatter

```toml
# pyproject.toml
[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"
docstring-code-format = true
```

Ruff replaces both Black (formatting) and isort (import sorting) in a single tool.

---

## Pattern 67.3: mypy with django-stubs

```bash
pip install mypy django-stubs djangorestframework-stubs
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
check_untyped_defs = true
ignore_missing_imports = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true

[tool.django-stubs]
django_settings_module = "config.settings.development"

[[tool.mypy.overrides]]
module = "*.migrations.*"
ignore_errors = true

[[tool.mypy.overrides]]
module = "*.tests.*"
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = ["celery.*", "django_filters.*", "guardian.*"]
ignore_missing_imports = true
```

```bash
mypy apps/ --config-file pyproject.toml
```

---

## Pattern 67.4: Unified pyproject.toml

```toml
# pyproject.toml — all tool configs in one file
[project]
name = "myproject"
version = "1.0.0"
requires-python = ">=3.12"

[tool.ruff]
# ... (see 67.1)

[tool.mypy]
# ... (see 67.3)

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.testing"
python_files = ["test_*.py"]
addopts = ["--strict-markers", "-ra", "--tb=short", "--cov=apps"]
asyncio_mode = "auto"

[tool.coverage.run]
source = ["apps"]
omit = ["*/migrations/*", "*/tests/*"]

[tool.coverage.report]
fail_under = 85
show_missing = true
```

---

## Pattern 67.5: Pre-Commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
        args: [--maxkb=500]
      - id: detect-private-key

  - repo: local
    hooks:
      - id: django-check-migrations
        name: Check Django migrations
        entry: python manage.py makemigrations --check --dry-run
        language: system
        pass_filenames: false
        always_run: true
        types: [python]
```

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

---

## Pattern 67.6: CI Quality Steps

```yaml
# .github/workflows/ci.yml (quality job)
quality:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: "3.12"

    - name: Install dependencies
      run: pip install -r requirements/development.txt

    - name: Ruff lint
      run: ruff check .

    - name: Ruff format check
      run: ruff format --check .

    - name: mypy type check
      run: mypy apps/ --config-file pyproject.toml

    - name: Django checks
      run: |
        python manage.py check --deploy --fail-level WARNING
        python manage.py makemigrations --check --dry-run
      env:
        DJANGO_SETTINGS_MODULE: config.settings.testing
        SECRET_KEY: ci-secret
```

---

## Pattern 67.7: Import Sorting

```python
# Correct import order (enforced by ruff isort)

# 1. Future
from __future__ import annotations

# 2. Standard library
import os
import json
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

# 3. Django
from django.conf import settings
from django.db import models, transaction
from django.http import HttpRequest, HttpResponse
from rest_framework import serializers, viewsets

# 4. Third-party
import httpx
from celery import shared_task

# 5. First-party (project)
from apps.articles.models import Article
from apps.users.models import User

# 6. Local (relative)
from .models import Order
from .serializers import OrderSerializer
```

---

## MUST DO

- Use Ruff for both linting and formatting (replaces Black + isort + flake8)
- Use django-stubs for mypy type checking
- Configure all tools in `pyproject.toml`
- Add migration check to pre-commit hooks
- Enforce quality gates in CI

## MUST NOT DO

- Use Black + isort + flake8 separately (Ruff replaces all)
- Skip mypy for Django code (django-stubs makes it useful)
- Commit code without running pre-commit
- Ignore type errors by adding `# type: ignore` everywhere
- Mix import styles (let Ruff enforce order)

---

## References

- [Ruff](https://docs.astral.sh/ruff/)
- [mypy](https://mypy.readthedocs.io/)
- [django-stubs](https://github.com/typeddjango/django-stubs)
- [pre-commit](https://pre-commit.com/)
