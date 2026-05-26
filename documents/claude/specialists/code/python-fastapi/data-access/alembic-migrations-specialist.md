# Alembic Migrations Specialist
# Alembicマイグレーションスペシャリスト
# Chuyên Gia Alembic Migrations

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access |
| **Directory Pattern** | `migrations/`, `alembic/` |
| **Variant** | ALL |
| **Naming Convention** | `YYYY_MM_DD_HHMM_{slug}.py` revision files |
| **Imports From** | Domain (models for metadata) |
| **Cannot Import** | Presentation, Application |
| **Dependencies** | alembic>=1.13 |
| **When To Use** | Database schema migrations, version control for DB |
| **Source Skeleton** | `alembic.ini`, `alembic/env.py`, `alembic/versions/` |
| **Pattern Numbers** | 13.1–13.6 |
| **Source Paths** | `migrations/`, `alembic/`, `alembic.ini` |
| **File Count** | 1 config + N revisions |
| **Imported By** | CI/CD pipeline, deployment scripts |
| **Specialist Type** | code |
| **Purpose** | Alembic async migrations: setup, auto-generate, naming, multi-database, downgrade strategies |
| **Activation Trigger** | `alembic`, migrations, `revision`, `upgrade`, `downgrade`, schema changes |

---

## Purpose

Define Alembic migration patterns for FastAPI async: async template setup, auto-generation with model imports, descriptive file naming, multi-database support, and safe downgrade strategies.

---

## Pattern 13.1: Async Template Setup

```bash
# Initialize with async template
alembic init -t async migrations
```

```ini
# alembic.ini
[alembic]
script_location = migrations
sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/mydb
file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d_%%(slug)s
```

```python
# migrations/env.py
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from src.core.database import Base
# CRITICAL: Import ALL models so metadata is populated
from src.auth.models import User        # noqa: F401
from src.posts.models import Post       # noqa: F401
from src.comments.models import Comment  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


import asyncio
asyncio.run(run_async_migrations())
```

---

## Pattern 13.2: Auto-Generate Migrations

```bash
# Generate migration from model changes
alembic revision --autogenerate -m "add_user_bio_column"

# Apply migrations
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history --verbose
```

**Auto-generate detects**:
- Table/column additions and removals
- Column type changes, nullable changes
- Index and unique constraint changes
- Foreign key changes

**Auto-generate CANNOT detect**:
- Column renames (generates DROP + CREATE)
- Table renames
- Data migrations

---

## Pattern 13.3: Descriptive File Names

```ini
# alembic.ini — use slug-based naming
file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d_%%(slug)s
```

```bash
# Creates: migrations/versions/2026_03_29_1430_add_user_bio_column.py
alembic revision --autogenerate -m "add_user_bio_column"

# Good naming examples:
alembic revision --autogenerate -m "create_products_table"
alembic revision --autogenerate -m "add_index_users_email"
alembic revision --autogenerate -m "add_soft_delete_to_orders"
```

**Naming convention**: `{verb}_{description}` — `create_`, `add_`, `remove_`, `alter_`, `drop_`.

> Source: zhanymkanov/fastapi-best-practices

---

## Pattern 13.4: Multi-Database Migrations

```ini
# alembic.ini — multiple databases
[alembic]
script_location = migrations

[primary]
sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/primary_db

[analytics]
sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/analytics_db
```

```python
# migrations/env.py — multi-database support
from src.primary.models import PrimaryBase
from src.analytics.models import AnalyticsBase


def run_migrations_online():
    # Run for each database
    for name, metadata in [
        ("primary", PrimaryBase.metadata),
        ("analytics", AnalyticsBase.metadata),
    ]:
        engine = engine_from_config(
            config.get_section(name),
            prefix="sqlalchemy.",
        )
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=metadata,
            )
            with context.begin_transaction():
                context.run_migrations()
```

---

## Pattern 13.5: Safe Downgrade Strategies

```python
# Example migration with explicit downgrade
def upgrade() -> None:
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.create_index("ix_users_bio", "users", ["bio"])


def downgrade() -> None:
    op.drop_index("ix_users_bio", table_name="users")
    op.drop_column("users", "bio")


# Data migration with upgrade/downgrade
def upgrade() -> None:
    # Add new column
    op.add_column("users", sa.Column("full_name", sa.String(200), nullable=True))

    # Migrate data
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE users SET full_name = first_name || ' ' || last_name")
    )

    # Make non-nullable after data migration
    op.alter_column("users", "full_name", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "full_name")
```

**Production strategy**: Never drop columns immediately. Use a 3-step approach:
1. Deploy code that ignores the column
2. Run migration to drop the column
3. Remove any remaining references

---

## Pattern 13.6: Limitations and Workarounds

```python
# Alembic CANNOT detect renames — generates DROP + CREATE instead
# Workaround: manually edit the generated migration

def upgrade() -> None:
    # Auto-generated (WRONG):
    # op.drop_column("users", "name")
    # op.add_column("users", sa.Column("full_name", sa.String(100)))

    # Manual fix (CORRECT):
    op.alter_column("users", "name", new_column_name="full_name")


def downgrade() -> None:
    op.alter_column("users", "full_name", new_column_name="name")
```

**Always review auto-generated migrations** before applying. Common issues:
- Renames detected as drop + create (data loss!)
- Enum type changes require manual ALTER TYPE
- Default values may not match Python defaults

---

## MUST DO

- Import ALL models in `env.py` (otherwise metadata is incomplete)
- Use async template (`alembic init -t async`) for FastAPI async
- Use descriptive migration names (`add_`, `create_`, `remove_`)
- Review auto-generated migrations before applying
- Write explicit downgrade functions for every migration
- Use 3-step approach for column drops in production

## MUST NOT DO

- Skip model imports in `env.py` (auto-generate misses tables)
- Apply auto-generated migrations without review (renames → data loss)
- Use `op.execute()` with raw SQL strings (use `sa.text()` for safety)
- Run destructive migrations without backup
- Mix schema changes and data migrations in same revision

---

## References

- [Alembic: Auto Generating Migrations](https://alembic.sqlalchemy.org/en/latest/autogenerate.html)
- [Alembic: Async Migrations](https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
