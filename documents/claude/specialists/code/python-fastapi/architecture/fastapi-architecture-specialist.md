# FastAPI Architecture Specialist
# FastAPIアーキテクチャスペシャリスト
# Chuyên Gia Kiến Trúc FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — defines structure for every layer) |
| **Directory Pattern** | `app/`, `src/`, `src/{domain}/` |
| **Variant** | ALL |
| **Naming Convention** | `snake_case` directories and files, domain-based modules |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (architecture pattern) |
| **When To Use** | Project structure setup, module organization |
| **Source Skeleton** | `src/main.py`, `src/core/`, `src/{domain}/router.py`, `src/{domain}/service.py`, `src/{domain}/repository.py`, `src/{domain}/schemas.py` |
| **Pattern Numbers** | 0.1–0.7 |
| **Source Paths** | `app/`, `src/`, `main.py` |
| **File Count** | N/A (structural) |
| **Imported By** | ALL specialists |
| **Specialist Type** | architecture |
| **Purpose** | Define project structure, app factory, lifespan management, layer rules, module organization |
| **Activation Trigger** | New project setup, project structure, `main.py`, `create_app`, architecture decisions |

---

## Purpose

Define the canonical project structure for Python FastAPI projects using **domain-grouped modular architecture** — the idiomatic approach used by Netflix Dispatch, zhanymkanov/fastapi-best-practices, and most production FastAPI systems. Each domain module is self-contained with its own router, service, models, and schemas. This is the **START HERE** specialist.

---

## Architecture: Folder Tree

Organize code by **domain/feature**, not by file type.

```
src/
├── auth/                    # Domain module
│   ├── router.py            # API endpoints
│   ├── schemas.py           # Pydantic models
│   ├── models.py            # Database models
│   ├── service.py           # Business logic
│   ├── dependencies.py      # Route dependencies
│   ├── config.py            # Module-specific settings
│   ├── constants.py         # Constants and error codes
│   ├── exceptions.py        # Domain-specific exceptions
│   └── utils.py             # Helper functions
├── posts/
│   ├── router.py
│   ├── schemas.py
│   ├── models.py
│   ├── service.py
│   └── dependencies.py
├── core/
│   ├── config.py            # Global settings (BaseSettings)
│   ├── security.py          # Auth utilities
│   ├── exceptions.py        # Base exception classes
│   └── database.py          # Engine, session factory
└── main.py                  # App factory
```

**Import Convention** — use explicit module names across domains:
```python
from src.auth import constants as auth_constants
from src.notifications import service as notification_service
```

> Source: zhanymkanov/fastapi-best-practices (16.9K stars), Netflix Dispatch pattern

---

## Pattern 0.2: Application Factory

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.core.config import settings
from src.auth.router import router as auth_router
from src.posts.router import router as posts_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # === STARTUP ===
    await init_db()
    await init_redis()
    yield
    # === SHUTDOWN ===
    await dispose_db()
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        lifespan=lifespan,
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.SHOW_DOCS else None,
    )

    # Middleware (order: first added = outermost = executes first)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=500)

    # Routers
    app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
    app.include_router(posts_router, prefix=f"{settings.API_V1_STR}/posts", tags=["posts"])

    # Exception handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_handler)

    return app


app = create_app()
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-foundations.md)

---

## Pattern 0.3: Lifespan Management

**Replaces deprecated** `@app.on_event("startup")` / `@app.on_event("shutdown")`.

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from typing import TypedDict

from httpx import AsyncClient


class State(TypedDict):
    http_client: AsyncClient


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[State]:
    async with AsyncClient() as client:
        yield {"http_client": client}
    # After yield = shutdown (auto-closed by context manager)


# Access in routes via request.state
@router.get("/proxy")
async def proxy(request: Request):
    client = request.state.http_client
    response = await client.get("https://api.example.com/data")
    return response.json()
```

**Key rule**: Use lifespan state (not `app.state`) — standard way per ASGI spec.

> Source: Kludex/fastapi-tips (tip #6)

---

## Pattern 0.4: Three Architecture Styles

### Modular / Domain-Grouped (Default — Recommended)
```
src/
├── auth/         # Self-contained module (router + service + models + schemas)
├── billing/      # Each module owns its full stack
├── catalog/
├── core/         # Shared (config, security, database, exceptions)
└── main.py
```
> **Idiomatic FastAPI**. Used by Netflix Dispatch, zhanymkanov/fastapi-best-practices.
> Best for: most projects, microservices, teams of any size.

### Layered (Small CRUD projects)
```
app/
├── api/           # Presentation (routers)
├── services/      # Business logic
├── models/        # Domain (Pydantic + ORM)
├── repositories/  # Data access
└── core/          # Cross-cutting (config, security)
```
> Organized by file type. Simple but scales poorly — changes to one feature touch every folder.

### Clean Architecture (Complex Domain — rare in FastAPI)
```
app/
├── api/              # Interface adapters (routers, schemas)
├── application/      # Use cases (services, DTOs)
├── domain/           # Entities, value objects, interfaces
├── infrastructure/   # Frameworks, DB, external services
└── core/             # Shared kernel
```
> Full layer separation. Consider only for very complex business domains with large teams.
> Most FastAPI projects do NOT need this level of abstraction.

**Decision guide**: Modular (default), Layered for simple CRUD, Clean Architecture only for complex domains.

---

## Pattern 0.5: Router Composition

```python
# src/api/v1/api.py
from fastapi import APIRouter
from src.auth.router import router as auth_router
from src.posts.router import router as posts_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(posts_router, prefix="/posts", tags=["posts"])

# main.py
app.include_router(api_router, prefix="/api/v1")
```

---

## Pattern 0.6: API Versioning

```python
app.include_router(v1_router, prefix="/api/v1")
app.include_router(v2_router, prefix="/api/v2")

# Deprecate old versions
app.include_router(v1_router, prefix="/api/v1", deprecated=True)
```

---

## Pattern 0.7: Hide Docs in Production

```python
SHOW_DOCS_ENVIRONMENT = ("local", "staging")

app_configs = {"title": settings.APP_NAME}
if settings.ENVIRONMENT not in SHOW_DOCS_ENVIRONMENT:
    app_configs["openapi_url"] = None

app = FastAPI(**app_configs)
```

> Source: zhanymkanov/fastapi-best-practices

---

## MUST DO

- Organize by domain, not by file type
- Use `lifespan` context manager for startup/shutdown
- Use `create_app()` factory pattern for testability
- Use explicit module imports across domains
- Set `expire_on_commit=False` on async sessions
- Use `Annotated` pattern for dependency injection

## MUST NOT DO

- Mix business logic in routers (routers = thin HTTP handlers)
- Use `@app.on_event("startup")` / `@app.on_event("shutdown")` (deprecated)
- Create app at module level without factory (breaks testing)
- Put ORM models and Pydantic schemas in same file
- Use `app.state` for lifespan resources (use lifespan state)
- Use wildcard imports between domain modules

---

## Architecture: File Type Mapping

| # | File Type | Component | Path | Required? |
|---|-----------|-----------|------|-----------|
| 1 | Router | API | `src/{domain}/router.py` | REQUIRED |
| 2 | Schema | Validation | `src/{domain}/schemas.py` | REQUIRED |
| 3 | Model | Database | `src/{domain}/models.py` | REQUIRED |
| 4 | Service | Business | `src/{domain}/service.py` | REQUIRED |
| 5 | Repository | Data Access | `src/{domain}/repository.py` | OPTIONAL |
| 6 | Dependencies | DI | `src/{domain}/dependencies.py` | OPTIONAL |
| 7 | Exceptions | Error | `src/{domain}/exceptions.py` | OPTIONAL |
| 8 | Constants | Config | `src/{domain}/constants.py` | OPTIONAL |
| 9 | Config | Global | `src/core/config.py` | REQUIRED |
| 10 | Database | Global | `src/core/database.py` | REQUIRED |
| 11 | Security | Global | `src/core/security.py` | OPTIONAL |

---

## Architecture: Dependency Rules

### Component Dependency Rules

Within a domain module:
  router → service → repository → models
  router → schemas (request/response validation)
  router → dependencies (DI injection)
  service → exceptions

FORBIDDEN:
  repository → router (data layer không biết API)
  models → service (ORM model không biết business logic)
  service → router (business không biết presentation)

Cross-domain:
  {domain_a}/service.py → {domain_b}/service.py    (OK — service-to-service)
  {domain_a}/router.py → {domain_b}/router.py      (FORBIDDEN — router không gọi router)
  {domain_a}/* → src/core/*                         (OK — core là shared)
  src/core/* → {domain_a}/*                          (FORBIDDEN — core không biết domain)

---

## Architecture: Feature Completeness

> Khi tạo domain module hoặc thêm feature, PHẢI đảm bảo đủ các file REQUIRED. File OPTIONAL chỉ tạo khi cần.

### Rule 1: New Domain Module → PHẢI có

| File | Component | Required? | Hậu quả nếu thiếu |
|------|-----------|-----------|-------------------|
| `src/{domain}/__init__.py` | Package | REQUIRED | Module không importable |
| `src/{domain}/router.py` | API | REQUIRED | Không có API endpoints |
| `src/{domain}/schemas.py` | Validation | REQUIRED | Không validate request/response |
| `src/{domain}/models.py` | Database | REQUIRED | Không có database models |
| `src/{domain}/service.py` | Business | REQUIRED | Business logic không có nơi đặt |
| Register router trong `src/main.py` | Wiring | REQUIRED | Endpoints không accessible |

### Rule 2: Add Feature to Existing Module → PHẢI có

| File | Action | Required? | Hậu quả nếu thiếu |
|------|--------|-----------|-------------------|
| `src/{domain}/schemas.py` | Thêm Request + Response schema | REQUIRED | API không validate input/output |
| `src/{domain}/models.py` | Thêm ORM model (nếu entity mới) | CONDITIONAL | Chỉ khi feature cần table mới |
| `src/{domain}/service.py` | Thêm method trong service | REQUIRED | Business logic không có nơi đặt |
| `src/{domain}/router.py` | Thêm endpoint gọi service | REQUIRED | Feature không exposed qua API |
| `alembic revision --autogenerate` | Migration (nếu model mới/sửa) | CONDITIONAL | Database schema không sync |

### Rule 3: Validation

- Mỗi router endpoint PHẢI gọi service method (thin router, thick service)
- Mỗi service method PHẢI có Request + Response schema riêng (không reuse schema cho cả create/read/update)
- Mỗi ORM model PHẢI có Pydantic schema tương ứng (không dùng ORM model làm API response)
- Mỗi domain module mới PHẢI được register trong `src/main.py` (include_router)

### Example: Feature "Orders" (new domain module)

```
REQUIRED:
  src/orders/__init__.py
  src/orders/router.py            # POST /orders, GET /orders/{id}, PATCH /orders/{id}
  src/orders/schemas.py           # OrderCreate, OrderRead, OrderUpdate
  src/orders/models.py            # Order(Base) — SQLAlchemy model
  src/orders/service.py           # create_order(), get_order(), update_order()
  src/main.py                     # app.include_router(orders_router, prefix="/api/v1/orders")

OPTIONAL (tạo khi cần):
  src/orders/repository.py        # Nếu query phức tạp, tách khỏi service
  src/orders/dependencies.py      # Nếu cần shared DI (get_current_user, get_db)
  src/orders/exceptions.py        # Nếu domain có lỗi riêng (OrderNotFoundError)
  src/orders/constants.py         # Nếu có enum/error codes
  tests/test_orders.py            # Test cho module
  alembic/versions/xxx_add_orders.py  # Migration cho Order model
```

### Example: Add "cancel" feature to existing Orders module

```
REQUIRED:
  src/orders/schemas.py           # + OrderCancel (request schema)
  src/orders/service.py           # + cancel_order(order_id, reason)
  src/orders/router.py            # + POST /orders/{id}/cancel

CONDITIONAL:
  src/orders/models.py            # + cancelled_at, cancel_reason fields (nếu cần)
  alembic/versions/xxx_add_cancel_fields.py  # Migration (nếu sửa model)

KHÔNG CẦN:
  Tạo module mới                  # Cancel là feature CỦA orders, không phải module riêng
  Sửa src/main.py                 # Router đã register, endpoint mới tự có
```

---

## References

- [FastAPI: Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [FastAPI: Lifespan Events](https://fastapi.tiangolo.com/advanced/events/)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Kludex/fastapi-tips](https://github.com/Kludex/fastapi-tips)
- [derekmizak/Copilot-RuleSet-FastApi](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
