# MongoDB Beanie Specialist
# MongoDB Beanieスペシャリスト
# Chuyên Gia MongoDB Beanie

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access |
| **Directory Pattern** | `src/core/mongodb.py`, `src/{domain}/documents.py` |
| **Variant** | ALL |
| **Naming Convention** | `documents.py` per domain, `{Entity}Document` class |
| **Imports From** | Domain (schemas for validation) |
| **Cannot Import** | Presentation, Application |
| **Dependencies** | motor>=3.0, beanie>=1.25 |
| **When To Use** | MongoDB document database with async ODM |
| **Source Skeleton** | `src/core/mongodb.py`, `src/{domain}/documents.py` |
| **Pattern Numbers** | 14.1–14.6 |
| **Source Paths** | `**/documents.py`, `**/mongodb.py` |
| **File Count** | 1 core + 1 per domain |
| **Imported By** | Application (services via DI) |
| **Specialist Type** | code |
| **Purpose** | Motor async driver, Beanie ODM with Pydantic documents, indexes, CRUD, aggregation |
| **Activation Trigger** | `mongodb`, `motor`, `beanie`, `Document`, MongoDB setup |

---

## Purpose

Define MongoDB patterns for FastAPI async: Motor client setup, Beanie ODM with Pydantic-based documents, initialization, CRUD operations, index management, and aggregation pipelines.

---

## Pattern 14.1: Motor Client Setup

```python
from motor.motor_asyncio import AsyncIOMotorClient
from src.core.config import get_settings


def get_motor_client() -> AsyncIOMotorClient:
    settings = get_settings()
    return AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=settings.MONGO_MAX_POOL_SIZE,      # Default: 100
        minPoolSize=settings.MONGO_MIN_POOL_SIZE,      # Default: 0
        serverSelectionTimeoutMS=5000,
    )


# In lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    client = get_motor_client()
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[UserDocument, PostDocument, CommentDocument],
    )
    yield
    client.close()
```

**Install**: `pip install motor beanie`

---

## Pattern 14.2: Beanie Document Model

```python
from beanie import Document, Indexed
from pydantic import Field, EmailStr
from datetime import datetime


class UserDocument(Document):
    email: Indexed(EmailStr, unique=True)    # Auto-creates unique index
    full_name: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"                # Collection name
        use_state_management = True   # Track changes for partial updates


class PostDocument(Document):
    title: Indexed(str)
    slug: Indexed(str, unique=True)
    content: str
    author_id: Indexed(str)           # Index for lookups
    tags: list[str] = []
    is_published: bool = False
    published_at: datetime | None = None

    class Settings:
        name = "posts"
```

**Key rule**: Beanie documents ARE Pydantic models — all Pydantic validators and features work directly.

---

## Pattern 14.3: init_beanie (Must List ALL Documents)

```python
from beanie import init_beanie

# CRITICAL: list EVERY document model — unlisted models won't work
await init_beanie(
    database=client["mydb"],
    document_models=[
        UserDocument,
        PostDocument,
        CommentDocument,
        # Add ALL document models here
    ],
)
```

**Common mistake**: Forgetting to add new document models → `CollectionWasNotInitialized` error at runtime.

---

## Pattern 14.4: CRUD Operations

```python
# Create
user = UserDocument(
    email="john@example.com",
    full_name="John Doe",
    hashed_password="...",
)
await user.insert()


# Read by ID
user = await UserDocument.get("507f1f77bcf86cd799439011")

# Find one
user = await UserDocument.find_one(UserDocument.email == "john@example.com")

# Find many with query
active_users = await UserDocument.find(
    UserDocument.is_active == True,
).to_list()

# Find with pagination
posts = await PostDocument.find(
    PostDocument.is_published == True,
).sort(-PostDocument.published_at).skip(0).limit(20).to_list()


# Update (full replace)
user.full_name = "Jane Doe"
user.updated_at = datetime.utcnow()
await user.save()

# Partial update (only changed fields — requires use_state_management=True)
await user.set({UserDocument.full_name: "Jane Doe"})

# Bulk update
await PostDocument.find(
    PostDocument.author_id == "user123",
).update({"$set": {"is_published": False}})


# Delete
await user.delete()

# Delete many
await PostDocument.find(
    PostDocument.created_at < cutoff_date,
).delete()
```

---

## Pattern 14.5: Indexes

```python
from beanie import Document, Indexed
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT


class ArticleDocument(Document):
    # Simple indexes via Indexed()
    title: Indexed(str)
    author_id: Indexed(str)
    created_at: Indexed(datetime)

    class Settings:
        name = "articles"
        indexes = [
            # Compound index
            IndexModel(
                [("author_id", ASCENDING), ("created_at", DESCENDING)],
                name="ix_author_created",
            ),
            # Text index for search
            IndexModel(
                [("title", TEXT), ("content", TEXT)],
                name="ix_articles_text",
            ),
            # TTL index (auto-delete after 30 days)
            IndexModel(
                [("expires_at", ASCENDING)],
                name="ix_expires",
                expireAfterSeconds=0,
            ),
        ]
```

---

## Pattern 14.6: Aggregation Pipelines

```python
# Count posts per author
result = await PostDocument.aggregate(
    [
        {"$match": {"is_published": True}},
        {"$group": {"_id": "$author_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ],
).to_list()

# Lookup (join) with another collection
result = await PostDocument.aggregate(
    [
        {"$lookup": {
            "from": "users",
            "localField": "author_id",
            "foreignField": "_id",
            "as": "author",
        }},
        {"$unwind": "$author"},
        {"$project": {
            "title": 1,
            "author_name": "$author.full_name",
        }},
    ],
).to_list()
```

---

## MUST DO

- List ALL document models in `init_beanie()` call
- Use `Indexed()` for frequently queried fields
- Use `use_state_management=True` for partial updates
- Use compound indexes for multi-field queries
- Close Motor client in lifespan shutdown

## MUST NOT DO

- Forget to register new document models in `init_beanie()`
- Use `to_list()` without `.limit()` on large collections
- Skip indexes on fields used in queries (full collection scan)
- Use synchronous PyMongo client in async FastAPI

---

## References

- [Beanie Documentation](https://beanie-odm.dev/)
- [Motor Documentation](https://motor.readthedocs.io/)
- [MongoDB: Aggregation](https://www.mongodb.com/docs/manual/aggregation/)
