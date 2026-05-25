---
paths:
  - "src/**/*.py"
  - "app/**/*.py"
  - "requirements*.txt"
  - "pyproject.toml"
---
# Python FastAPI Backend Rules
## Architecture
- Python 3.12+, FastAPI 0.115+, Pydantic v2   # CONFIGURE: versions
- **Domain-Grouped Modular** architecture (default — idiomatic FastAPI)
- Each domain module is self-contained: router, service, schemas, models, dependencies
- Async-first: SQLAlchemy async, httpx, asyncio
## Architecture Styles
- **Modular** (default): `src/{domain}/` — self-contained modules. Best for most projects
- **Layered** (simple CRUD): `app/api/`, `app/services/`, `app/models/` — file-type grouping
- **Clean Architecture** (complex domain): `app/api/`, `app/application/`, `app/domain/`, `app/infrastructure/`
## Module Structure (Modular — Default)
```
src/
├── {domain}/            # Per-domain module
│   ├── router.py        # API endpoints (@router)
│   ├── schemas.py       # Pydantic request/response models
│   ├── models.py        # SQLAlchemy/ORM models
│   ├── service.py       # Business logic
│   ├── dependencies.py  # Route dependencies (Depends())
│   ├── exceptions.py    # Domain-specific exceptions
│   └── constants.py     # Error codes, enums
├── core/                # Shared cross-cutting
│   ├── config.py        # BaseSettings (env-based)
│   ├── security.py      # Auth utilities (JWT, hashing)
│   ├── database.py      # Engine, async session factory
│   └── exceptions.py    # Base exception classes
└── main.py              # App factory (create_app + lifespan)
```
## Naming
- Files/dirs: `snake_case` always
- Router: `router.py` per domain, mounted via `app.include_router()`
- Schema: Pydantic models in `schemas.py` — `{Entity}Create`, `{Entity}Read`, `{Entity}Update`
- Model: SQLAlchemy models in `models.py` — `class {Entity}(Base)`
- Service: `service.py` per domain — business logic, NO direct HTTP concerns
- Dependency: `dependencies.py` — `Depends()` callables for auth, pagination, DB session
## Import Rules
- Cross-domain: `from src.{domain} import service as {domain}_service`
- NEVER relative imports across domains
- core/ is shared — any module can import core
- Domain modules should NOT import each other's models directly (use service layer)
## App Factory
- Use `create_app()` factory pattern with `lifespan` async context manager
- NEVER use deprecated `@app.on_event("startup"/"shutdown")`
- Middleware order: first added = outermost = executes first
## API Versioning
- Prefix: `/api/v1/` for all routers
- Hide OpenAPI docs in production (`openapi_url=None`)
## Error Handling
- Global exception handler via `app.add_exception_handler()`
- Domain exceptions extend base `AppException`
- Return structured error: `{detail, error_code, status_code}`
## Data Access
# CONFIGURE: choose your database stack
- SQLAlchemy 2.0+ async with `AsyncSession`
- Alembic for migrations (`alembic upgrade head`)
- Connection: async engine + `async_sessionmaker`
## Auth
# CONFIGURE: choose auth strategy
- JWT Bearer tokens via `OAuth2PasswordBearer`
- Password hashing: passlib/bcrypt or argon2
- `Depends(get_current_user)` for protected routes
## Testing
- pytest + pytest-asyncio + httpx `AsyncClient`
- `TestClient` for sync tests, `AsyncClient` for async
- Fixtures: async DB session, test client, auth headers
## Modules
# CONFIGURE: list your project's domain modules
- {domain}: {description}
