# SQLAlchemy Async Specialist
# SQLAlchemy非同期スペシャリスト
# Chuyên Gia SQLAlchemy Async

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access |
| **Directory Pattern** | `src/core/database.py`, `src/{domain}/repository.py` |
| **Variant** | ALL |
| **Naming Convention** | `database.py` (engine/session), `repository.py` per domain |
| **Imports From** | Domain (models) |
| **Cannot Import** | Presentation, Application |
| **Dependencies** | sqlalchemy[asyncio]>=2.0, asyncpg or asyncmy |
| **When To Use** | Async ORM, repository pattern, unit of work |
| **Source Skeleton** | `src/core/database.py`, `src/{domain}/repository.py` |
| **Pattern Numbers** | 10.1–10.6 |
| **Source Paths** | `**/database.py`, `**/repository.py`, `**/db.py` |
| **File Count** | 1 core + 1 per domain |
| **Imported By** | Application (services via DI) |
| **Specialist Type** | code |
| **Purpose** | Async engine/session setup, generic repository, Unit of Work, connection pooling, session dependency |
| **Activation Trigger** | `database.py`, `AsyncSession`, `create_async_engine`, repository pattern |

---

## Purpose

Define SQLAlchemy async patterns for FastAPI: engine and session factory setup, generic repository pattern, Unit of Work for transactional grouping, connection pool configuration, and database session as FastAPI dependency.

---

## Pattern 10.1: Async Engine + Session Factory

```python
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from src.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,        # Detect stale connections
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,    # CRITICAL for async — prevents lazy loads after commit
)
```

**Why `expire_on_commit=False`**: After commit, accessing attributes would trigger a lazy load — which fails in async context. Setting this prevents greenlet errors.

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-performance), zhanymkanov/fastapi-best-practices

---

## Pattern 10.2: Generic Repository Pattern

```python
from typing import Generic, TypeVar, Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    def __init__(self, session: AsyncSession, model: type[T]) -> None:
        self._session = session
        self._model = model

    async def get_by_id(self, id: int) -> T | None:
        return await self._session.get(self._model, id)

    async def list(
        self, offset: int = 0, limit: int = 20
    ) -> Sequence[T]:
        stmt = select(self._model).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def count(self) -> int:
        stmt = select(func.count()).select_from(self._model)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def create(self, entity: T) -> T:
        self._session.add(entity)
        await self._session.flush()  # Get ID without committing
        return entity

    async def update(self, entity: T) -> T:
        merged = await self._session.merge(entity)
        await self._session.flush()
        return merged

    async def delete(self, entity: T) -> None:
        await self._session.delete(entity)
        await self._session.flush()


# Domain-specific repository
from src.posts.models import Post

class PostRepository(BaseRepository[Post]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Post)

    async def get_by_slug(self, slug: str) -> Post | None:
        stmt = select(Post).where(Post.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_published(self, offset: int = 0, limit: int = 20) -> Sequence[Post]:
        stmt = (
            select(Post)
            .where(Post.is_published == True)
            .order_by(Post.published_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()
```

---

## Pattern 10.3: Unit of Work

Group multiple repository operations in a single transaction.

```python
from sqlalchemy.ext.asyncio import AsyncSession


class UnitOfWork:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self.posts = PostRepository(session)
        self.users = UserRepository(session)
        self.comments = CommentRepository(session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()

    async def __aenter__(self) -> "UnitOfWork":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type:
            await self.rollback()


# Usage in service
class PostService:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def create_post_with_tags(self, data: PostCreate) -> PostResponse:
        post = await self._uow.posts.create(Post(**data.model_dump()))
        for tag_name in data.tags:
            tag = await self._uow.tags.get_or_create(tag_name)
            post.tags.append(tag)
        # Single commit for all operations
        return PostResponse.model_validate(post)
```

---

## Pattern 10.4: Connection Pooling Configuration

```python
engine = create_async_engine(
    DATABASE_URL,
    # Pool sizing
    pool_size=5,            # Persistent connections (default: 5)
    max_overflow=10,        # Temporary connections above pool_size
    # Maintenance
    pool_recycle=1800,      # Recycle connections every 30 min (prevents stale)
    pool_pre_ping=True,     # Ping before use (detect disconnected)
    pool_timeout=30,        # Wait N seconds for available connection
    # Debug
    echo=False,             # True → log all SQL (development only)
    echo_pool="debug",      # Log pool checkout/checkin events
)
```

**Sizing guide**:
| App Type | pool_size | max_overflow | Total |
|----------|-----------|-------------|-------|
| Small API | 5 | 5 | 10 |
| Medium API | 10 | 10 | 20 |
| High traffic | 20 | 20 | 40 |

**Rule**: `pool_size + max_overflow` must not exceed database `max_connections / num_workers`.

---

## Pattern 10.5: Eager Loading Strategies

```python
from sqlalchemy.orm import selectinload, joinedload, subqueryload
from sqlalchemy import select


# One-to-many: selectinload (2 queries, no cartesian)
stmt = select(Author).options(selectinload(Author.books))

# Many-to-one: joinedload (single JOIN)
stmt = select(Book).options(joinedload(Book.author))

# Nested loading
stmt = (
    select(Author)
    .options(
        selectinload(Author.books)
        .joinedload(Book.publisher)
        .selectinload(Publisher.addresses)
    )
)

# Multiple relationships
stmt = (
    select(User)
    .options(
        selectinload(User.posts),
        selectinload(User.comments),
        joinedload(User.profile),
    )
)
```

---

## Pattern 10.6: DB Session as Dependency

```python
from collections.abc import AsyncIterator
from typing import Annotated
from fastapi import Depends
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


# Wire up repository → service
async def get_post_repository(session: SessionDep) -> PostRepository:
    return PostRepository(session)

async def get_post_service(
    repo: PostRepository = Depends(get_post_repository),
) -> PostService:
    return PostService(repo)
```

> Source: zhanymkanov/fastapi-best-practices, derekmizak/Copilot-RuleSet-FastApi

---

## MUST DO

- Use `expire_on_commit=False` on async session factory
- Use `pool_pre_ping=True` for connection health checks
- Use `flush()` in repositories (not `commit()` — transaction boundary = dependency)
- Use explicit loading strategies (`selectinload`, `joinedload`)
- Use generic `BaseRepository[T]` for DRY CRUD operations
- Size connection pool relative to database max connections and worker count

## MUST NOT DO

- Call `session.commit()` in repositories (belongs in dependency or UoW)
- Use lazy loading in async context (causes greenlet errors)
- Create engine per-request (must be module-level singleton)
- Use `expire_on_commit=True` with async (default — must override)
- Skip `pool_recycle` (connections go stale after DB timeout)
- Use synchronous `Session` in async routes

---

## References

- [SQLAlchemy: Async Session](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [SQLAlchemy: Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [derekmizak/Copilot-RuleSet-FastApi](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
