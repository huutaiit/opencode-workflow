# FastAPI Dependency Injection Specialist
# FastAPI依存性注入スペシャリスト
# Chuyên Gia Dependency Injection FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/dependencies.py`, `src/core/dependencies.py` |
| **Variant** | ALL |
| **Naming Convention** | `dependencies.py` per domain, `get_*` for factory functions |
| **Imports From** | Domain (models, schemas), Data Access (repositories) |
| **Cannot Import** | Presentation (routers) |
| **Dependencies** | N/A (FastAPI built-in Depends) |
| **When To Use** | Service injection, DB session lifecycle, auth dependencies |
| **Source Skeleton** | `src/core/dependencies.py`, `src/{domain}/dependencies.py` |
| **Pattern Numbers** | 6.1–6.7 |
| **Source Paths** | `**/dependencies.py`, `**/deps.py` |
| **File Count** | 1 per domain module + 1 core |
| **Imported By** | Presentation (routers), Application (services) |
| **Specialist Type** | code |
| **Purpose** | Depends() patterns: function/class deps, yield cleanup, chaining, caching, router-level, test overrides |
| **Activation Trigger** | `Depends`, `dependencies.py`, `get_db`, `get_current_user`, dependency creation |

---

## Purpose

Define FastAPI dependency injection patterns: function and class-based dependencies, yield dependencies with cleanup, dependency chaining, per-request caching, router-level dependencies, and testing overrides.

---

## Pattern 6.1: Function Dependencies

```python
from typing import Annotated
from fastapi import Depends, Path
from uuid import UUID

from src.posts.service import PostService
from src.posts.schemas import PostResponse
from src.posts.exceptions import PostNotFound


async def valid_post_id(
    post_id: UUID = Path(...),
    service: PostService = Depends(get_post_service),
) -> PostResponse:
    post = await service.get_by_id(post_id)
    if not post:
        raise PostNotFound(post_id=post_id)
    return post


# Reusable Annotated type
ValidPost = Annotated[PostResponse, Depends(valid_post_id)]


# Use in multiple routes
@router.get("/{post_id}")
async def get_post(post: ValidPost) -> PostResponse:
    return post

@router.delete("/{post_id}", status_code=204)
async def delete_post(post: ValidPost, service: ServiceDep) -> None:
    await service.delete(post.id)
```

> Source: zhanymkanov/fastapi-best-practices (valid_post_id example)

---

## Pattern 6.2: Class-Based Dependencies

Use for dependencies with configuration or multiple parameters.

```python
from dataclasses import dataclass
from fastapi import Query


@dataclass
class Paginator:
    page: int = Query(default=1, ge=1)
    size: int = Query(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


PaginationDep = Annotated[Paginator, Depends()]


@router.get("/")
async def list_posts(
    pagination: PaginationDep,
    service: ServiceDep,
) -> list[PostResponse]:
    return await service.list(
        offset=pagination.offset,
        limit=pagination.size,
    )
```

**Key rule**: Use `@dataclass` or `__init__` — FastAPI resolves `__init__` parameters as query/path/body params.

---

## Pattern 6.3: Yield Dependencies with Cleanup

```python
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import async_session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_session)]


# HTTP client with lifecycle
from httpx import AsyncClient

async def get_http_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(timeout=30.0) as client:
        yield client
    # Client automatically closed after request completes
```

**Critical rules**:
- Code before `yield` = setup. Code after `yield` = cleanup.
- Use `try/finally` when cleanup must happen regardless of exceptions.
- **Never raise exceptions after `yield`** — they won't propagate correctly to the client.

> Source: Kludex/fastapi-tips (tip #9)

---

## Pattern 6.4: Dependency Chaining

Build complex dependencies by composing simpler ones.

```python
# Level 1: Parse JWT token
async def parse_jwt_data(
    token: str = Depends(oauth2_scheme),
) -> JWTPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return JWTPayload(**payload)
    except jwt.InvalidTokenError:
        raise InvalidCredentials()


# Level 2: Get current user from JWT
async def get_current_user(
    jwt_data: JWTPayload = Depends(parse_jwt_data),
    session: AsyncSession = Depends(get_session),
) -> User:
    user = await session.get(User, jwt_data.user_id)
    if not user or not user.is_active:
        raise InvalidCredentials()
    return user


# Level 3: Validate ownership
async def valid_owned_post(
    post: PostResponse = Depends(valid_post_id),
    user: User = Depends(get_current_user),
) -> PostResponse:
    if post.author_id != user.id:
        raise ForbiddenError("You do not own this post")
    return post


# Annotated types for clean route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
OwnedPost = Annotated[PostResponse, Depends(valid_owned_post)]
```

> Source: zhanymkanov/fastapi-best-practices (valid_owned_post chain)

---

## Pattern 6.5: Dependency Caching (Per-Request)

Dependencies are **cached per request** by default. Same dependency called multiple times → resolved once.

```python
# parse_jwt_data is called ONCE per request, even if used by both:
# - get_current_user
# - get_user_permissions
# Both receive the same JWTPayload instance.

# To disable caching (force re-evaluation):
async def get_fresh_timestamp() -> datetime:
    return datetime.now()

FreshTime = Annotated[datetime, Depends(get_fresh_timestamp, use_cache=False)]
```

**When to disable caching**: Time-sensitive values, random data, or when side effects must run every time.

> Source: zhanymkanov/fastapi-best-practices (parse_jwt_data called once)

---

## Pattern 6.6: Router-Level Dependencies

Apply dependencies to **all routes** in a router.

```python
# All routes in this router require authentication
router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_user), Depends(require_admin)],
)


# App-level dependencies (applied to ALL routes)
app = FastAPI(dependencies=[Depends(log_request)])


# Per-route dependency (overrides router-level if needed)
@router.get("/public", dependencies=[])  # No auth for this route
async def public_endpoint():
    return {"status": "public"}
```

---

## Pattern 6.7: Testing Overrides

```python
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.core.dependencies import get_session, get_current_user


# Override DB session
async def override_get_session():
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Override auth — return fake user
async def override_get_current_user():
    return User(id=1, email="test@example.com", is_active=True)


@pytest.fixture
def client():
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    app.dependency_overrides.clear()
```

**Key rule**: Override the **exact function object** — `app.dependency_overrides[get_session]`, not a string name.

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-testing.md)

---

## MUST DO

- Use `Annotated` pattern for all dependency types (`SessionDep`, `CurrentUser`, etc.)
- Use async dependencies to avoid blocking the event loop
- Use `try/finally` in yield dependencies for guaranteed cleanup
- Chain dependencies for complex validation (parse → auth → ownership)
- Use router-level `dependencies=` for shared auth/logging
- Override dependencies in tests (never mock the framework)
- Use `@dataclass` for class-based dependencies with multiple params

## MUST NOT DO

- Use sync dependencies for simple operations (`def` triggers threadpool overhead)
- Raise exceptions after `yield` in yield dependencies
- Skip `use_cache=False` when side effects must run per-call
- Put business logic in dependencies (validate + resolve only)
- Use string-based dependency lookup (always reference function objects)
- Create circular dependency chains

---

## References

- [FastAPI: Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [FastAPI: Dependencies with yield](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/)
- [FastAPI: Testing Dependencies](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Kludex/fastapi-tips](https://github.com/Kludex/fastapi-tips)
- [derekmizak/Copilot-RuleSet-FastApi](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
