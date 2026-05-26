# Pydantic Models Specialist
# Pydanticモデルスペシャリスト
# Chuyên Gia Pydantic Models

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `src/{domain}/schemas.py`, `app/models/schemas/` |
| **Variant** | ALL |
| **Naming Convention** | `schemas.py` per domain, `{Entity}Create`, `{Entity}Response`, `{Entity}Update` |
| **Imports From** | None (leaf layer — pure data models) |
| **Cannot Import** | Application, Presentation, Data Access |
| **Dependencies** | `pydantic>=2.0` |
| **When To Use** | Request/response schemas, domain validation, serialization |
| **Source Skeleton** | `src/{domain}/schemas.py` |
| **Pattern Numbers** | 3.1–3.7 |
| **Source Paths** | `**/schemas.py`, `**/dto.py`, `**/types.py` |
| **File Count** | 1 per domain module |
| **Imported By** | Presentation (routers), Application (services) |
| **Specialist Type** | code |
| **Purpose** | Pydantic V2 model patterns: ConfigDict, validators, serialization, computed fields, schema separation |
| **Activation Trigger** | `schemas.py`, `BaseModel`, `field_validator`, `model_validator`, Pydantic models |

---

## Purpose

Define Pydantic V2 model patterns for FastAPI: ConfigDict, field constraints with Annotated types, validators, computed fields, serialization control, and Create/Read/Update schema separation.

---

## Pattern 3.1: ConfigDict (Replaces class Config)

```python
from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,     # Was orm_mode=True in V1
        str_strip_whitespace=True,
        str_min_length=1,
    )

    id: int
    email: str
    full_name: str
    is_active: bool


# Common ConfigDict options:
# from_attributes=True      — Enable ORM model → Pydantic conversion
# extra="forbid"            — Reject unexpected fields (security)
# str_strip_whitespace=True — Auto-strip whitespace
# populate_by_name=True     — Allow alias and field name
# use_enum_values=True      — Serialize enums as values
```

> Source: Pydantic V2 docs, jiatastic/open-python-skills (pydantic skill)

---

## Pattern 3.2: Field Constraints with Annotated Types

```python
from typing import Annotated
from pydantic import BaseModel, Field, EmailStr


# Reusable type aliases — preferred over Field() on each model
NameStr = Annotated[str, Field(min_length=1, max_length=100)]
PositiveAmount = Annotated[float, Field(gt=0)]
PageSize = Annotated[int, Field(ge=1, le=100, default=20)]

Email = Annotated[EmailStr, Field(max_length=255)]


class ProductCreate(BaseModel):
    name: NameStr
    price: PositiveAmount
    description: Annotated[str, Field(max_length=2000)] = ""


class PaginationParams(BaseModel):
    page: Annotated[int, Field(ge=1)] = 1
    size: PageSize = 20
```

**Key rule**: Prefer `Annotated` types over `Field()` directly — they are reusable across models and work with FastAPI dependency injection.

> Source: PierreVannier gist (typing best practices), Pydantic V2 docs

---

## Pattern 3.3: field_validator (Single) + model_validator (Cross-Field)

```python
from pydantic import BaseModel, field_validator, model_validator


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    password_confirm: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v.lower()

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower()

    @model_validator(mode="after")
    def passwords_match(self) -> "UserCreate":
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")
        return self


# Validator modes:
# mode="before"  — runs before Pydantic parsing (raw input)
# mode="after"   — runs after parsing (typed values)
# mode="wrap"    — wraps default validation (advanced)
```

> Source: Jeffallan/claude-skills (fastapi-expert), Pydantic V2 docs

---

## Pattern 3.4: computed_field (Included in Serialization)

```python
from pydantic import BaseModel, computed_field


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quantity: int
    unit_price: float
    tax_rate: float = 0.1

    @computed_field
    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price

    @computed_field
    @property
    def total(self) -> float:
        return self.subtotal * (1 + self.tax_rate)
```

**Key rule**: Use `@computed_field` (not `@property`) — only `computed_field` is included in JSON serialization and OpenAPI schema.

---

## Pattern 3.5: Serialization Control

```python
from pydantic import BaseModel, field_serializer
from datetime import datetime


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_time: datetime
    metadata: dict

    @field_serializer("start_time")
    def serialize_dt(self, dt: datetime) -> str:
        return dt.strftime("%Y-%m-%d %H:%M")

    @field_serializer("metadata")
    def serialize_metadata(self, meta: dict) -> dict:
        # Remove internal keys from API response
        return {k: v for k, v in meta.items() if not k.startswith("_")}


# model_dump options:
# model_dump(exclude_unset=True)    — PATCH: only changed fields
# model_dump(exclude_none=True)     — Skip None values
# model_dump(exclude={"password"})  — Remove sensitive fields
# model_dump(by_alias=True)         — Use alias names
```

---

## Pattern 3.6: Partial Update Pattern (exclude_unset)

```python
class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    bio: str | None = None


# In service layer
async def update_user(user_id: int, data: UserUpdate) -> User:
    # Only update fields that were explicitly sent
    update_data = data.model_dump(exclude_unset=True)
    # {"full_name": "New Name"} — email and bio excluded if not sent

    user = await repository.get(user_id)
    for field, value in update_data.items():
        setattr(user, field, value)
    await repository.save(user)
    return user
```

**Critical distinction**:
- `exclude_unset=True` — Omits fields not in the request (PATCH semantics)
- `exclude_none=True` — Omits fields with `None` value (cannot set field to null)

> Source: zhanymkanov/fastapi-best-practices (custom base model)

---

## Pattern 3.7: Create/Read/Update Schema Separation

```python
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from datetime import datetime


# Base — shared fields
class ArticleBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    is_published: bool = False


# Create — fields needed for creation
class ArticleCreate(ArticleBase):
    model_config = ConfigDict(extra="forbid")  # Reject unknown fields

    tags: list[str] = []


# Update — all fields optional
class ArticleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    content: str | None = None
    is_published: bool | None = None
    tags: list[str] | None = None


# Response — includes DB-generated fields
class ArticleResponse(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
    tags: list[str]
    created_at: datetime
    updated_at: datetime
```

**NEVER use a single model** for create/read/update — different operations have different field requirements.

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-foundations.md)

---

## MUST DO

- Use Pydantic V2 syntax (`model_config = ConfigDict(...)`, `field_validator`, `model_validator`)
- Use `Annotated` types for reusable field constraints
- Separate Create/Read/Update schemas (never one model for all operations)
- Use `computed_field` for derived data included in responses
- Use `extra="forbid"` on input models (prevents mass assignment)
- Use `from_attributes=True` for ORM model conversion
- Use `exclude_unset=True` for PATCH/partial update semantics

## MUST NOT DO

- Use Pydantic V1 syntax (`@validator`, `class Config`, `orm_mode`)
- Use `@property` for fields that must appear in JSON (use `computed_field`)
- Use a single model for create, read, and update operations
- Expose database models directly in API responses
- Use `Optional[X]` instead of `X | None` (Python 3.10+ syntax)
- Store validation logic in routers (belongs in schemas or services)

---

## References

- [Pydantic V2: Model Config](https://docs.pydantic.dev/latest/concepts/config/)
- [Pydantic V2: Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- [Pydantic V2: Computed Fields](https://docs.pydantic.dev/latest/concepts/fields/#computed-fields)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Jeffallan/claude-skills: fastapi-expert](https://github.com/Jeffallan/claude-skills)
- [jiatastic/open-python-skills: pydantic](https://github.com/jiatastic/open-python-skills)
