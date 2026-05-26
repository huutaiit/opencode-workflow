# FastAPI Service Layer Specialist
# FastAPIサービスレイヤースペシャリスト
# Chuyên Gia Service Layer FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/service.py`, `app/services/` |
| **Variant** | ALL |
| **Naming Convention** | `service.py` per domain, `{Entity}Service` class |
| **Imports From** | Domain (schemas, models, exceptions), Data Access (repositories) |
| **Cannot Import** | Presentation (routers, HTTP concerns) |
| **Dependencies** | N/A (architecture pattern) |
| **When To Use** | Business logic layer between router and repository |
| **Source Skeleton** | `src/{domain}/service.py` |
| **Pattern Numbers** | 5.1–5.4 |
| **Source Paths** | `**/service.py`, `**/services/**/*.py`, `**/use_cases/**/*.py` |
| **File Count** | 1 per domain module |
| **Imported By** | Presentation (routers via DI) |
| **Specialist Type** | code |
| **Purpose** | Service layer patterns: framework-agnostic business logic, domain exceptions, transaction boundaries |
| **Activation Trigger** | `service.py`, business logic, `*Service` class, use case implementation |

---

## Purpose

Define service layer patterns for FastAPI: thin router / thick service separation, domain exception hierarchy, service-repository interaction, and transaction boundary management.

---

## Pattern 5.1: Thin Router / Thick Service

Routers handle HTTP only. **All** business logic lives in services.

```python
# router.py — THIN: only HTTP concerns
from fastapi import APIRouter, Depends, status
from typing import Annotated

from src.posts.schemas import PostCreate, PostResponse
from src.posts.service import PostService
from src.posts.dependencies import get_post_service

router = APIRouter(prefix="/posts", tags=["posts"])

ServiceDep = Annotated[PostService, Depends(get_post_service)]


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(payload: PostCreate, service: ServiceDep) -> PostResponse:
    return await service.create(payload)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, service: ServiceDep) -> PostResponse:
    return await service.get_or_raise(post_id)
```

```python
# service.py — THICK: all business logic
from src.posts.schemas import PostCreate, PostResponse
from src.posts.repository import PostRepository
from src.posts.exceptions import PostNotFound


class PostService:
    def __init__(self, repository: PostRepository) -> None:
        self._repo = repository

    async def create(self, data: PostCreate) -> PostResponse:
        post = await self._repo.create(data)
        return PostResponse.model_validate(post)

    async def get_or_raise(self, post_id: int) -> PostResponse:
        post = await self._repo.get_by_id(post_id)
        if not post:
            raise PostNotFound(post_id=post_id)
        return PostResponse.model_validate(post)
```

> Source: zhanymkanov/fastapi-best-practices, jiatastic/open-python-skills (python-backend)

---

## Pattern 5.2: Domain Exception Hierarchy

Services raise **domain exceptions**, not `HTTPException`. Exception handlers map them to HTTP responses.

```python
# src/core/exceptions.py — Base exception hierarchy
class AppException(Exception):
    """Base exception for all domain errors."""
    def __init__(self, message: str = "An error occurred"):
        self.message = message
        super().__init__(self.message)


class NotFoundError(AppException):
    def __init__(self, entity: str, identifier: object):
        super().__init__(f"{entity} with id={identifier} not found")
        self.entity = entity
        self.identifier = identifier


class ConflictError(AppException):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Action not allowed"):
        super().__init__(message)


class ValidationError(AppException):
    def __init__(self, message: str, field: str | None = None):
        super().__init__(message)
        self.field = field
```

```python
# src/posts/exceptions.py — Domain-specific exceptions
from src.core.exceptions import NotFoundError, ConflictError


class PostNotFound(NotFoundError):
    def __init__(self, post_id: int):
        super().__init__(entity="Post", identifier=post_id)


class PostSlugConflict(ConflictError):
    def __init__(self, slug: str):
        super().__init__(f"Post with slug '{slug}' already exists")
```

```python
# src/core/exception_handlers.py — Map to HTTP responses
from fastapi import Request
from fastapi.responses import JSONResponse
from src.core.exceptions import AppException, NotFoundError, ConflictError, ForbiddenError


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    status_map = {
        NotFoundError: 404,
        ConflictError: 409,
        ForbiddenError: 403,
    }
    status_code = status_map.get(type(exc), 400)
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message},
    )


# Register in create_app()
app.add_exception_handler(AppException, app_exception_handler)
```

> Source: jiatastic/open-python-skills (error-handling), hmisra/MagicCursorRules

---

## Pattern 5.3: Service + Repository Separation

```python
# repository.py — Data access only
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.posts.models import Post
from src.posts.schemas import PostCreate


class PostRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, post_id: int) -> Post | None:
        return await self._session.get(Post, post_id)

    async def get_by_slug(self, slug: str) -> Post | None:
        stmt = select(Post).where(Post.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: PostCreate) -> Post:
        post = Post(**data.model_dump())
        self._session.add(post)
        await self._session.flush()  # Get ID without committing
        return post

    async def list_all(self, offset: int = 0, limit: int = 20) -> list[Post]:
        stmt = select(Post).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
```

```python
# service.py — Orchestrates repository + business rules
class PostService:
    def __init__(self, repository: PostRepository) -> None:
        self._repo = repository

    async def create(self, data: PostCreate) -> PostResponse:
        existing = await self._repo.get_by_slug(data.slug)
        if existing:
            raise PostSlugConflict(slug=data.slug)
        post = await self._repo.create(data)
        return PostResponse.model_validate(post)
```

**Key rule**: Repository handles queries/persistence. Service handles business rules/orchestration. Never mix them.

> Source: hmisra/MagicCursorRules (services layer)

---

## Pattern 5.4: Transaction Boundaries in Dependencies

Commit in the **dependency** (not in service or repository). Services call `flush()` for intermediate state.

```python
# dependencies.py
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import async_session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()  # Commit on success
        except Exception:
            await session.rollback()
            raise


async def get_post_service(
    session: AsyncSession = Depends(get_session),
) -> PostService:
    repository = PostRepository(session)
    return PostService(repository)
```

**Why**: If the service raises an exception after `flush()`, the dependency catches it and rolls back. No partial commits.

---

## MUST DO

- Keep routers thin — delegate immediately to service methods
- Raise domain exceptions from services (not `HTTPException`)
- Use exception handler to map domain exceptions → HTTP responses
- Separate service (business rules) from repository (data access)
- Commit transactions in dependencies, not in services
- Use `flush()` in repository for intermediate state (get IDs)
- Accept Pydantic schemas as input, return Pydantic schemas as output

## MUST NOT DO

- Import FastAPI or HTTP-related modules in service layer
- Raise `HTTPException` in services (couples service to framework)
- Put raw SQL or ORM queries in services (belongs in repository)
- Call `session.commit()` in services (transaction boundary = dependency)
- Mix validation logic with persistence logic in same method
- Return ORM models directly from services (always convert to Pydantic)

---

## References

- [FastAPI: Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [jiatastic/open-python-skills: error-handling](https://github.com/jiatastic/open-python-skills)
- [hmisra/MagicCursorRules](https://github.com/hmisra/MagicCursorRules)
