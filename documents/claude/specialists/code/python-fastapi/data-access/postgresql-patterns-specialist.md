# PostgreSQL Patterns Specialist
# PostgreSQLパターンスペシャリスト
# Chuyên Gia PostgreSQL Patterns

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access |
| **Directory Pattern** | `src/core/database.py`, `src/{domain}/repository.py` |
| **Variant** | ALL |
| **Naming Convention** | PostgreSQL-specific patterns in existing repository files |
| **Imports From** | Domain (models) |
| **Cannot Import** | Presentation, Application |
| **Dependencies** | sqlalchemy[asyncio], asyncpg |
| **When To Use** | PostgreSQL-specific patterns (JSONB, full-text search, listen/notify) |
| **Source Skeleton** | `src/core/database.py` (PostgreSQL config) |
| **Pattern Numbers** | 11.1–11.6 |
| **Source Paths** | `**/database.py`, `**/repository.py` |
| **File Count** | N/A (extends existing files) |
| **Imported By** | Application (services via repositories) |
| **Specialist Type** | code |
| **Purpose** | PostgreSQL-specific patterns: asyncpg driver, JSONB queries, full-text search, LISTEN/NOTIFY, advisory locks |
| **Activation Trigger** | `postgresql`, `asyncpg`, JSONB, `tsvector`, `pg_advisory`, PostgreSQL-specific features |

---

## Purpose

Define PostgreSQL-specific patterns for FastAPI async: asyncpg driver configuration, JSONB column querying, full-text search with tsvector, real-time LISTEN/NOTIFY, and distributed locking with advisory locks.

---

## Pattern 11.1: asyncpg Driver Setup

```python
from sqlalchemy.ext.asyncio import create_async_engine

# asyncpg = C-optimized, 2-3x faster than psycopg2
# Dialect string format: postgresql+asyncpg://
engine = create_async_engine(
    "postgresql+asyncpg://user:password@localhost:5432/mydb",
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True,
)
```

**Driver comparison**:
| Driver | Speed | Type | Use Case |
|--------|-------|------|----------|
| asyncpg | Fastest (C) | Async | Default for FastAPI |
| psycopg3 | Fast | Sync + Async | Need sync compat |
| psycopg2 | Moderate | Sync only | Legacy projects |

**Install**: `pip install asyncpg sqlalchemy[asyncio]`

---

## Pattern 11.2: JSONB Querying

```python
from sqlalchemy import select, cast, String
from sqlalchemy.dialects.postgresql import JSONB


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)


# Query nested JSONB values
stmt = select(Product).where(
    Product.attributes["color"].astext == "red"
)

# Nested path
stmt = select(Product).where(
    Product.attributes["dimensions"]["width"].as_float() > 10.0
)

# Contains operator (@>)
stmt = select(Product).where(
    Product.attributes.contains({"category": "electronics"})
)

# Has key (?)
stmt = select(Product).where(
    Product.attributes.has_key("discount")
)

# GIN index for JSONB (critical for performance)
from sqlalchemy import Index
Index("ix_products_attributes", Product.attributes, postgresql_using="gin")
```

---

## Pattern 11.3: Full-Text Search

```python
from sqlalchemy import func, select, Index, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    # Stored tsvector column (auto-updated via trigger or computed)
    search_vector: Mapped[str] = mapped_column(
        TSVECTOR,
        nullable=True,
    )


# GIN index on tsvector column
Index(
    "ix_articles_search_vector",
    Article.search_vector,
    postgresql_using="gin",
)


# Search using to_tsvector + to_tsquery
stmt = select(Article).where(
    func.to_tsvector("english", Article.title + " " + Article.body).match(
        "fastapi & async"
    )
)

# With ranking
stmt = (
    select(
        Article,
        func.ts_rank(
            func.to_tsvector("english", Article.body),
            func.to_tsquery("english", "python & web"),
        ).label("rank"),
    )
    .order_by(func.ts_rank(
        func.to_tsvector("english", Article.body),
        func.to_tsquery("english", "python & web"),
    ).desc())
)
```

---

## Pattern 11.4: LISTEN/NOTIFY

Real-time event notifications from PostgreSQL.

```python
import asyncpg
import asyncio
import json


async def start_listener(dsn: str, channel: str, callback):
    """LISTEN/NOTIFY requires a SEPARATE connection (not from pool)."""
    conn = await asyncpg.connect(dsn)
    await conn.add_listener(channel, callback)
    try:
        while True:
            await asyncio.sleep(1)
    finally:
        await conn.remove_listener(channel, callback)
        await conn.close()


def on_notification(conn, pid, channel, payload):
    data = json.loads(payload)
    print(f"Channel: {channel}, Data: {data}")


# Trigger NOTIFY from SQL
# NOTIFY order_events, '{"order_id": 123, "status": "paid"}'

# Or from SQLAlchemy
from sqlalchemy import text

async def notify(session, channel: str, payload: dict):
    await session.execute(
        text(f"NOTIFY {channel}, :payload"),
        {"payload": json.dumps(payload)},
    )

# Start listener in lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(
        start_listener(DATABASE_DSN, "order_events", on_notification)
    )
    yield
    task.cancel()
```

**Key rule**: LISTEN connections must be **separate** from the pool — they hold a persistent connection.

---

## Pattern 11.5: Advisory Locks

Distributed locking without external tools.

```python
from sqlalchemy import text


async def with_advisory_lock(session, lock_id: int):
    """Session-level advisory lock (released on session close)."""
    result = await session.execute(
        text("SELECT pg_try_advisory_lock(:id)"),
        {"id": lock_id},
    )
    acquired = result.scalar_one()
    if not acquired:
        raise ConflictError(f"Resource locked (lock_id={lock_id})")
    return acquired


async def release_advisory_lock(session, lock_id: int):
    await session.execute(
        text("SELECT pg_advisory_unlock(:id)"),
        {"id": lock_id},
    )


# Transaction-level lock (auto-released on commit/rollback)
async def with_tx_advisory_lock(session, lock_id: int):
    await session.execute(
        text("SELECT pg_advisory_xact_lock(:id)"),
        {"id": lock_id},
    )


# Usage: prevent duplicate processing
async def process_order(session, order_id: int):
    lock_id = hash(f"order:{order_id}") % (2**31)
    await with_advisory_lock(session, lock_id)
    try:
        # Process order...
        pass
    finally:
        await release_advisory_lock(session, lock_id)
```

---

## Pattern 11.6: Connection Pool Tuning (PostgreSQL)

```python
# PostgreSQL default max_connections = 100
# With 4 Gunicorn workers: 100 / 4 = 25 per worker

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,               # Persistent connections per worker
    max_overflow=10,           # Burst capacity per worker
    pool_recycle=1800,         # PostgreSQL default idle timeout = 0 (infinite)
    pool_pre_ping=True,        # Detect connections killed by PgBouncer/firewall
    pool_timeout=30,           # Raise after 30s if no connection available
    connect_args={
        "server_settings": {
            "statement_timeout": "30000",       # 30s query timeout
            "idle_in_transaction_session_timeout": "60000",  # 60s idle tx timeout
        }
    },
)
```

**PgBouncer**: When using PgBouncer in transaction mode, set `pool_pre_ping=True` and `pool_recycle=300` (5 min).

---

## MUST DO

- Use `asyncpg` driver for PostgreSQL async (fastest option)
- Create GIN index on JSONB columns used in queries
- Use tsvector + GIN index for full-text search
- Use separate connections for LISTEN/NOTIFY (not from pool)
- Use `pg_advisory_xact_lock` (transaction-scoped) over session-scoped locks
- Set `statement_timeout` to prevent runaway queries

## MUST NOT DO

- Use `psycopg2` in async FastAPI (sync-only driver)
- Query JSONB without GIN index (full table scan)
- Use LISTEN connection from the connection pool
- Use advisory locks without a release strategy
- Skip `pool_pre_ping` with PgBouncer (stale connection errors)

---

## References

- [asyncpg Documentation](https://magicstack.github.io/asyncpg/)
- [SQLAlchemy: PostgreSQL Dialects](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)
- [PostgreSQL: Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [PostgreSQL: Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
