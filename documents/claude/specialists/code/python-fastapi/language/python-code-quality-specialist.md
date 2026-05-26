# Python Code Quality Specialist
# Pythonコード品質スペシャリスト
# Chuyen Gia Chat Luong Code Python

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | `pyproject.toml`, `.pre-commit-config.yaml` |
| **Variant** | ALL |
| **Naming Convention** | Tool config in `pyproject.toml` |
| **Imports From** | N/A (tooling) |
| **Cannot Import** | N/A |
| **Dependencies** | `ruff`, `mypy` or `ty`, `pre-commit` |
| **When To Use** | Linting, type checking, formatting, CI integration |
| **Source Skeleton** | `pyproject.toml` (tool.ruff, tool.mypy sections), `.pre-commit-config.yaml` |
| **Pattern Numbers** | 67.1–67.7 |
| **Source Paths** | `pyproject.toml`, `.pre-commit-config.yaml`, `.github/workflows/` |
| **File Count** | 1-3 config files |
| **Imported By** | N/A (CI/dev tools) |
| **Specialist Type** | language |
| **Purpose** | Ruff lint+format, mypy strict typing, ty checker, pre-commit hooks, CI integration, tool consolidation |
| **Activation Trigger** | ruff, mypy, lint, format, pre-commit, code quality, type check |

---

## Purpose

Define code quality tooling for Python FastAPI projects: Ruff as unified linter+formatter, mypy strict mode with Pydantic plugin, ty as Rust-based type checker, pre-commit hooks, CI integration with GitHub Actions, and tool consolidation replacing legacy tools.

---

## Pattern 67.1: Ruff Configuration

```toml
# pyproject.toml

[tool.ruff]
target-version = "py312"
line-length = 120
src = ["src", "tests"]

[tool.ruff.lint]
# Balanced rule set (recommended starting point)
select = [
    "E",     # pycodestyle errors
    "W",     # pycodestyle warnings
    "F",     # pyflakes
    "I",     # isort
    "N",     # pep8-naming
    "UP",    # pyupgrade
    "B",     # flake8-bugbear
    "SIM",   # flake8-simplify
    "S",     # flake8-bandit (security)
    "T20",   # flake8-print (no print statements)
    "RUF",   # ruff-specific rules
    "ASYNC", # flake8-async
]
ignore = [
    "E501",    # line too long (handled by formatter)
    "S101",    # assert in tests is fine
]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101", "S106"]  # Allow assert and hardcoded passwords in tests
"**/migrations/**/*.py" = ["E501"]  # Alembic migrations can be long

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
docstring-code-format = true
```

> Source: jiatastic ruff-linter skill

---

## Pattern 67.2: Ruff CLI Commands

```bash
# Check for lint issues
ruff check .

# Auto-fix fixable issues
ruff check --fix .

# Format code (replaces black)
ruff format .

# Check without fixing (CI mode)
ruff check --no-fix .

# Watch mode (auto-fix on save)
ruff check --watch --fix .

# Show statistics of issues
ruff check --statistics .

# Check specific rules
ruff check --select E,W,F .

# Output format for CI
ruff check --output-format github .
```

> Source: jiatastic ruff-linter skill

---

## Pattern 67.3: mypy Strict Configuration

```toml
# pyproject.toml

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_any_generics = true
check_untyped_defs = true
no_implicit_optional = true

# Pydantic plugin (REQUIRED for Pydantic v2)
plugins = ["pydantic.mypy"]

[tool.pydantic-mypy]
init_forbid_extra = true
init_typed = true
warn_required_dynamic_aliases = true

# Per-module overrides
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false  # Relax in tests

[[tool.mypy.overrides]]
module = "alembic.*"
ignore_errors = true  # Auto-generated migrations
```

```bash
# Run type checking
mypy src/

# Strict mode (catches more issues)
mypy --strict src/

# Show error codes (for targeted ignores)
mypy --show-error-codes src/
```

> Source: bossjones gist, PierreVannier

---

## Pattern 67.4: ty Type Checker (Rust-Based)

```bash
# Install (Astral — same creators as ruff/uv)
pip install ty

# Run type checking (2-10x faster than mypy)
ty check src/

# Configuration in pyproject.toml
```

```toml
# pyproject.toml
[tool.ty]
python-version = "3.12"
src = ["src"]
```

**ty vs mypy**:

| Factor | mypy | ty |
|--------|------|-----|
| **Speed** | Slow (Python) | Fast (Rust) |
| **Maturity** | Battle-tested | Newer |
| **Pydantic support** | Via plugin | Native |
| **Strict mode** | Yes | Yes |
| **Recommendation** | Production default | Try in CI |

> Source: jiatastic ty-skills skill

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

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies:
          - pydantic>=2.0
          - types-redis
        args: [--strict]

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
```

```bash
# Install hooks
pre-commit install

# Run on all files (first time)
pre-commit run --all-files

# Update hooks
pre-commit autoupdate
```

---

## Pattern 67.6: CI Integration (GitHub Actions)

```yaml
# .github/workflows/lint.yml
name: Code Quality

on: [push, pull_request]

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
      - run: pip install mypy pydantic
      - run: mypy --strict src/
```

> Source: jiatastic ruff-linter skill (CI section)

---

## Pattern 67.7: Tool Consolidation

```
Ruff replaces ALL of these:
  ✅ black        → ruff format
  ✅ isort        → ruff (I rules)
  ✅ flake8       → ruff (E, W, F rules)
  ✅ autoflake    → ruff (F401, F841 auto-fix)
  ✅ pyupgrade    → ruff (UP rules)
  ✅ bandit       → ruff (S rules)
  ✅ pydocstyle   → ruff (D rules)

Modern Python toolstack:
  📦 Package manager: uv (replaces pip, pip-tools, poetry)
  🔍 Linter+Formatter: ruff (replaces 7+ tools)
  📝 Type checker: mypy or ty
  🪝 Git hooks: pre-commit
  🧪 Testing: pytest + pytest-asyncio
```

---

## MUST DO

- Use ruff for linting AND formatting (not legacy tools)
- Use mypy strict mode with Pydantic plugin
- Configure pre-commit hooks (ruff + mypy)
- Run lint+type check in CI
- Set `per-file-ignores` for tests and migrations
- Use `pyproject.toml` for all tool configuration

## MUST NOT DO

- Use black + isort separately (ruff replaces both)
- Use flake8 or pylint (ruff is faster and more comprehensive)
- Skip type checking in CI
- Ignore security rules (S/bandit) in production code
- Use `# type: ignore` without error code (`# type: ignore[assignment]`)
- Leave `print()` statements in production code

---

## References

- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [mypy Documentation](https://mypy.readthedocs.io/)
- [pre-commit](https://pre-commit.com/)
- [ty](https://github.com/astral-sh/ty)
