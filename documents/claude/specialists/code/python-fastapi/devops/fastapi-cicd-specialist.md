# FastAPI CI/CD Specialist
# FastAPI CI/CDスペシャリスト
# Chuyen Gia CI/CD FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `.github/workflows/`, `.pre-commit-config.yaml` |
| **Variant** | ALL |
| **Naming Convention** | `ci.yml`, `deploy.yml`, `.pre-commit-config.yaml` |
| **Imports From** | N/A (infrastructure) |
| **Cannot Import** | N/A |
| **Dependencies** | `ruff`, `mypy`, `pytest-cov`, `pre-commit` |
| **When To Use** | CI/CD pipeline setup, pre-commit hooks, coverage enforcement |
| **Source Skeleton** | `.github/workflows/ci.yml`, `.pre-commit-config.yaml`, `pyproject.toml` (tool sections) |
| **Pattern Numbers** | 91.1–91.5 |
| **Source Paths** | `.github/workflows/*.yml`, `.pre-commit-config.yaml` |
| **File Count** | 2-4 config files |
| **Imported By** | N/A (CI/CD) |
| **Specialist Type** | devops |
| **Purpose** | GitHub Actions CI pipeline, pre-commit hooks, Ruff GitHub Action, coverage enforcement, environment secrets |
| **Activation Trigger** | ci, cd, github actions, pipeline, pre-commit, deploy |

---

## Purpose

Define CI/CD patterns for FastAPI: GitHub Actions workflow with lint/test/deploy stages, pre-commit configuration, Ruff GitHub Action, coverage enforcement with codecov, and environment secrets management.

---

## Pattern 91.1: GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Ruff lint
        uses: astral-sh/ruff-action@v2

      - name: Ruff format check
        uses: astral-sh/ruff-action@v2
        with:
          args: format --check

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]"
      - run: mypy --strict src/

  test:
    runs-on: ubuntu-latest
    needs: [lint, type-check]  # Only test if lint+types pass
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    env:
      DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/test_db
      REDIS_URL: redis://localhost:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]"
      - run: alembic upgrade head
      - run: pytest --cov=src --cov-report=xml --cov-fail-under=85
      - uses: codecov/codecov-action@v4
        with:
          file: coverage.xml
          token: ${{ secrets.CODECOV_TOKEN }}
```

> Source: PierreVannier (section 8)

---

## Pattern 91.2: Pre-Commit Configuration

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
      - id: check-yaml
      - id: check-toml
      - id: check-added-large-files
        args: [--maxkb=1000]
      - id: detect-private-key
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: no-commit-to-branch
        args: [--branch, main]
```

```bash
# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files

# CI: verify hooks would pass
pre-commit run --all-files --show-diff-on-failure
```

---

## Pattern 91.3: Ruff GitHub Action

```yaml
# Standalone Ruff action (fast — no Python install needed)
- name: Ruff lint
  uses: astral-sh/ruff-action@v2
  with:
    args: check --output-format github

- name: Ruff format
  uses: astral-sh/ruff-action@v2
  with:
    args: format --check --diff
```

> Source: jiatastic ruff-linter skill

---

## Pattern 91.4: Coverage Enforcement

```yaml
# In CI workflow
- name: Run tests with coverage
  run: pytest --cov=src --cov-report=xml --cov-fail-under=85

# Upload to Codecov
- uses: codecov/codecov-action@v4
  with:
    file: coverage.xml
    fail_ci_if_error: true
    token: ${{ secrets.CODECOV_TOKEN }}
```

```toml
# pyproject.toml
[tool.coverage.run]
source = ["src"]
omit = ["src/**/migrations/**", "src/main.py"]

[tool.coverage.report]
fail_under = 85
show_missing = true
```

---

## Pattern 91.5: Environment Secrets

```yaml
# GitHub Secrets → environment variables
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  REDIS_URL: ${{ secrets.REDIS_URL }}
  SECRET_KEY: ${{ secrets.SECRET_KEY }}

# Deploy job with environment protection
deploy:
  runs-on: ubuntu-latest
  needs: [test]
  if: github.ref == 'refs/heads/main'
  environment: production  # Requires approval if configured
  steps:
    - name: Deploy to production
      env:
        DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
      run: ./scripts/deploy.sh
```

**Key rules**:
- Never hardcode secrets in workflow files
- Use GitHub Environments for deployment protection
- Separate secrets per environment (staging vs production)

---

## MUST DO

- Run lint before tests (fail fast)
- Use service containers for DB/Redis in CI
- Enforce coverage minimum (>=85%)
- Use pre-commit hooks locally
- Pin action versions (`@v4` not `@latest`)
- Use Ruff GitHub Action (faster than installing ruff)

## MUST NOT DO

- Hardcode secrets in workflow files
- Skip lint/type check in CI
- Use `@latest` for GitHub Actions
- Run tests without service containers (use real DB)
- Deploy without test passing
- Commit directly to main (use PRs with CI gates)

---

## References

- [GitHub Actions](https://docs.github.com/en/actions)
- [astral-sh/ruff-action](https://github.com/astral-sh/ruff-action)
- [Codecov](https://docs.codecov.io/)
