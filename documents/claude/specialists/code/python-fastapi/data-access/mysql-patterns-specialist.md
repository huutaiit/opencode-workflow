# MySQL Patterns Specialist
# MySQLパターンスペシャリスト
# Chuyên Gia MySQL Patterns

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access |
| **Directory Pattern** | `src/core/database.py`, `src/{domain}/repository.py` |
| **Variant** | ALL |
| **Naming Convention** | MySQL-specific patterns in existing repository files |
| **Imports From** | Domain (models) |
| **Cannot Import** | Presentation, Application |
| **Dependencies** | sqlalchemy[asyncio], asyncmy |
| **When To Use** | MySQL-specific patterns (pool recycle, locks) |
| **Source Skeleton** | `src/core/database.py` (MySQL config) |
| **Pattern Numbers** | 12.1–12.4 |
| **Source Paths** | `**/database.py`, `**/repository.py` |
| **File Count** | N/A (extends existing files) |
| **Imported By** | Application (services via repositories) |
| **Specialist Type** | code |
| **Purpose** | MySQL-specific patterns: asyncmy/aiomysql drivers, pool recycle, advisory locks, MySQL differences |
| **Activation Trigger** | `mysql`, `asyncmy`, `aiomysql`, MySQL-specific features |

---

## Purpose

Define MySQL-specific patterns for FastAPI async: driver selection (asyncmy vs aiomysql), critical pool recycle configuration, MySQL advisory locks, and key differences from PostgreSQL.

---

## Pattern 12.1: Driver Comparison

```python
# asyncmy — RECOMMENDED (Cython-accelerated, faster)
engine = create_async_engine(
    "mysql+asyncmy://user:password@localhost:3306/mydb",
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,    # CRITICAL for MySQL
    pool_pre_ping=True,
)

# aiomysql — ALTERNATIVE (pure Python, broader community)
engine = create_async_engine(
    "mysql+aiomysql://user:password@localhost:3306/mydb",
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True,
)
```

| Driver | Speed | Dependencies | Notes |
|--------|-------|-------------|-------|
| asyncmy | Faster (Cython) | Cython build | Recommended for production |
| aiomysql | Moderate | Pure Python | Easier install, broader compat |

**Install**: `pip install asyncmy` or `pip install aiomysql`

---

## Pattern 12.2: Pool Recycle (Critical)

```python
engine = create_async_engine(
    MYSQL_URL,
    pool_recycle=3600,    # MUST SET — MySQL default wait_timeout=28800 (8h)
    pool_pre_ping=True,   # Extra safety for stale connections
    pool_size=10,
    max_overflow=10,
)
```

**Why `pool_recycle` is critical for MySQL**: MySQL server closes idle connections after `wait_timeout` (default 8 hours). Without `pool_recycle`, the pool returns dead connections → "MySQL server has gone away" errors.

**Rule**: Set `pool_recycle` to a value **less than** MySQL's `wait_timeout`.

| MySQL Setting | Default | pool_recycle |
|---------------|---------|-------------|
| wait_timeout=28800 (8h) | Default install | 3600 (1h) |
| wait_timeout=600 (10min) | Cloud MySQL | 300 (5min) |

---

## Pattern 12.3: MySQL Advisory Locks (GET_LOCK)

```python
from sqlalchemy import text


async def acquire_mysql_lock(
    session, lock_name: str, timeout: int = 10
) -> bool:
    """MySQL named lock (string-based, unlike PostgreSQL integer-based)."""
    result = await session.execute(
        text("SELECT GET_LOCK(:name, :timeout)"),
        {"name": lock_name, "timeout": timeout},
    )
    return result.scalar_one() == 1


async def release_mysql_lock(session, lock_name: str) -> bool:
    result = await session.execute(
        text("SELECT RELEASE_LOCK(:name)"),
        {"name": lock_name},
    )
    return result.scalar_one() == 1


# Usage
async def process_order(session, order_id: int):
    lock_name = f"order:{order_id}"
    acquired = await acquire_mysql_lock(session, lock_name, timeout=5)
    if not acquired:
        raise ConflictError(f"Order {order_id} is being processed")
    try:
        # Process...
        pass
    finally:
        await release_mysql_lock(session, lock_name)
```

**Key differences from PostgreSQL**:
- MySQL: String-based lock names (`GET_LOCK('name', timeout)`)
- PostgreSQL: Integer-based lock IDs (`pg_advisory_lock(id)`)
- MySQL: Must explicitly release (not auto-released on commit)

---

## Pattern 12.4: MySQL-Specific Differences

```python
# MySQL JSON (not JSONB — no binary storage)
from sqlalchemy import JSON

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)

# JSON query syntax (differs from PostgreSQL)
stmt = select(Product).where(
    func.json_extract(Product.attributes, "$.color") == "red"
)


# Full-text search (MySQL syntax)
# Requires FULLTEXT index (InnoDB supports since MySQL 5.6)
from sqlalchemy import Index

Index(
    "ix_articles_fulltext",
    Article.title,
    Article.body,
    mysql_prefix="FULLTEXT",
)

stmt = select(Article).where(
    func.match(Article.title, Article.body).against("python web", in_boolean_mode=True)
)


# Auto-increment differences
class User(Base):
    __tablename__ = "users"

    # MySQL: AUTO_INCREMENT is default for integer PK
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)


# Connection charset
engine = create_async_engine(
    "mysql+asyncmy://user:pass@localhost/db?charset=utf8mb4",
    pool_recycle=3600,
)
```

---

## MUST DO

- Use `asyncmy` driver for MySQL async (fastest option)
- Set `pool_recycle` to value less than MySQL `wait_timeout`
- Use `pool_pre_ping=True` for connection health checks
- Use `charset=utf8mb4` in connection string (full Unicode support)
- Explicitly release `GET_LOCK` locks

## MUST NOT DO

- Skip `pool_recycle` (causes "MySQL server has gone away" errors)
- Use `charset=utf8` (only 3-byte, no emoji support — use `utf8mb4`)
- Use PostgreSQL JSONB syntax with MySQL (use `json_extract`)
- Assume advisory locks auto-release on commit (MySQL requires explicit release)

---

## References

- [SQLAlchemy: MySQL Dialects](https://docs.sqlalchemy.org/en/20/dialects/mysql.html)
- [asyncmy Documentation](https://github.com/long2ice/asyncmy)
- [MySQL: Locking Functions](https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html)
