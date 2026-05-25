# SQLAlchemy Models Specialist
# SQLAlchemyモデルスペシャリスト
# Chuyên Gia SQLAlchemy Models

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `src/{domain}/models.py`, `app/models/` |
| **Variant** | ALL |
| **Naming Convention** | `models.py` per domain, PascalCase class names matching table |
| **Imports From** | None (leaf layer — ORM definitions) |
| **Cannot Import** | Application, Presentation, Data Access logic |
| **Dependencies** | `sqlalchemy>=2.0` |
| **When To Use** | Database model definitions, table relationships, mixins |
| **Source Skeleton** | `src/{domain}/models.py`, `src/core/base_model.py` |
| **Pattern Numbers** | 4.1–4.5 |
| **Source Paths** | `**/models.py`, `**/entities.py` |
| **File Count** | 1 per domain module |
| **Imported By** | Data Access (repositories), Application (services via schemas) |
| **Specialist Type** | code |
| **Purpose** | SQLAlchemy 2.0 ORM models: DeclarativeBase, Mapped types, relationships, mixins, naming conventions |
| **Activation Trigger** | `models.py`, `DeclarativeBase`, `Mapped`, `relationship`, ORM model creation |

---

## Purpose

Define SQLAlchemy 2.0 ORM model patterns for FastAPI async: modern DeclarativeBase with Mapped type annotations, relationship loading strategies, reusable mixins, and database naming conventions.

---

## Pattern 4.1: DeclarativeBase + Mapped Types

```python
from datetime import datetime
from sqlalchemy import String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
```

**Key rules**:
- Always use `Mapped[T]` type annotations (SQLAlchemy 2.0 style)
- Use `mapped_column()` instead of `Column()` (legacy)
- `String(N)` always with explicit length for VARCHAR columns
- `server_default` for DB-level defaults, `default` for Python-level

---

## Pattern 4.2: Relationship Loading Strategies

```python
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))

    # One-to-many: lazy="raise" forces explicit loading
    books: Mapped[list["Book"]] = relationship(
        back_populates="author",
        lazy="raise",           # CRITICAL for async — prevents implicit IO
        cascade="all, delete-orphan",
    )


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))

    # Many-to-one
    author: Mapped["Author"] = relationship(
        back_populates="books",
        lazy="raise",
    )


# Query with explicit loading
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import select

# One-to-many: selectinload (2 queries, no cartesian product)
stmt = select(Author).options(selectinload(Author.books))

# Many-to-one: joinedload (single JOIN query)
stmt = select(Book).options(joinedload(Book.author))

# Nested: chain loading strategies
stmt = select(Author).options(
    selectinload(Author.books).joinedload(Book.publisher)
)
```

**Loading strategy guide**:
| Relationship | Strategy | Why |
|-------------|----------|-----|
| One-to-many | `selectinload` | Avoids cartesian product |
| Many-to-one | `joinedload` | Single JOIN, no N+1 |
| Many-to-many | `selectinload` | Same as one-to-many |
| Default | `lazy="raise"` | Forces explicit choice in async |

---

## Pattern 4.3: Common Mixins

```python
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )


class SoftDeleteMixin:
    is_deleted: Mapped[bool] = mapped_column(default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)


class AuditMixin(TimestampMixin):
    created_by: Mapped[int | None] = mapped_column(default=None)
    updated_by: Mapped[int | None] = mapped_column(default=None)


# Usage
class Product(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    price: Mapped[float]
```

---

## Pattern 4.4: Database Naming Conventions

```python
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


# Consistent, predictable constraint names for Alembic
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convention)
```

**Why**: Without naming conventions, Alembic cannot auto-generate migrations for constraint changes (PostgreSQL requires named constraints for ALTER).

> Source: zhanymkanov/fastapi-best-practices (POSTGRES_INDEXES_NAMING_CONVENTION)

---

## Pattern 4.5: JSONB / Hybrid Properties

```python
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(50))
    last_name: Mapped[str] = mapped_column(String(50))

    # JSONB column for flexible data
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=None)

    @hybrid_property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @full_name.expression
    @classmethod
    def full_name(cls):
        return cls.first_name + " " + cls.last_name


# Query JSONB fields
from sqlalchemy import select

stmt = select(Profile).where(
    Profile.preferences["theme"].astext == "dark"
)

# Query hybrid property (uses SQL expression)
stmt = select(Profile).where(Profile.full_name == "John Doe")
```

---

## MUST DO

- Use `Mapped[T]` + `mapped_column()` (SQLAlchemy 2.0 style)
- Set `lazy="raise"` on all relationships (async-safe default)
- Use explicit loading strategies (`selectinload`, `joinedload`)
- Define naming conventions on `MetaData` for Alembic compatibility
- Use `server_default=func.now()` for timestamp columns
- Use mixins for cross-cutting concerns (timestamps, soft delete, audit)
- Use `String(N)` with explicit length for all VARCHAR columns

## MUST NOT DO

- Use legacy `Column()` style (replaced by `mapped_column()`)
- Use `lazy="select"` or any implicit loading in async context (causes greenlet errors)
- Use `backref` (deprecated — use `back_populates` for explicit bidirectional)
- Create circular imports between model files (use `TYPE_CHECKING` guard)
- Put query logic in models (belongs in repositories)
- Use `ForeignKey` without index on the foreign key column

---

## References

- [SQLAlchemy 2.0: Mapped Column](https://docs.sqlalchemy.org/en/20/orm/mapped_attributes.html)
- [SQLAlchemy: Relationship Loading](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [SQLAlchemy: Naming Conventions](https://docs.sqlalchemy.org/en/20/core/constraints.html#configuring-constraint-naming-conventions)
