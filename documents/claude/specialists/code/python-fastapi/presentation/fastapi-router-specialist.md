# FastAPI Router Specialist
# FastAPIルータースペシャリスト
# Chuyên Gia Router FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `src/{domain}/router.py`, `app/api/v1/endpoints/` |
| **Variant** | ALL |
| **Naming Convention** | `router.py` per domain module, `snake_case` functions |
| **Imports From** | Application (services), Domain (schemas) |
| **Cannot Import** | Data Access (repositories) directly |
| **Dependencies** | N/A (FastAPI built-in APIRouter) |
| **When To Use** | REST API endpoint definitions, versioning, thin routers |
| **Source Skeleton** | `src/{domain}/router.py`, `src/main.py` (router mounting) |
| **Pattern Numbers** | 1.1–1.7 |
| **Source Paths** | `**/router.py`, `**/api/**/*.py`, `**/endpoints/**/*.py` |
| **File Count** | 1 per domain module |
| **Imported By** | Main app (include_router) |
| **Specialist Type** | code |
| **Purpose** | Define APIRouter patterns, path operations, response models, versioning, documentation |
| **Activation Trigger** | `router.py`, `@router.get`, `@router.post`, endpoint creation, API design |

---

## Purpose

Define patterns for FastAPI routing: APIRouter organization, path operations, response models, HTTP status codes, and API documentation.

---

## Pattern 1.1: APIRouter Organization

```python
from fastapi import APIRouter, Depends, status
from typing import Annotated

from src.auth.dependencies import get_current_user
from src.users.schemas import UserCreate, UserResponse
from src.users.service import UserService
from src.users.dependencies import get_user_service

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],  # Applied to ALL routes
)

ServiceDep = Annotated[UserService, Depends(get_user_service)]
```

**Key rules**:
- Prefix must start with `/`, must NOT end with `/`
- Tags group endpoints in OpenAPI docs
- Router-level dependencies run for every route (auth, logging)

> Source: zhanymkanov/fastapi-best-practices AGENTS.md

---

## Pattern 1.2: Path Operations with Response Models

```python
@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Create a user with email and password",
    responses={
        status.HTTP_201_CREATED: {"model": UserResponse},
        status.HTTP_409_CONFLICT: {"model": ErrorResponse, "description": "Email exists"},
    },
)
async def create_user(payload: UserCreate, service: ServiceDep) -> UserResponse:
    return await service.create(payload)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user: dict = Depends(valid_user_id)) -> UserResponse:
    return user
```

**Always specify**: `response_model`, `status_code`, `summary`, `tags`.

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-documentation.md)

---

## Pattern 1.3: Create/Read/Update Schema Separation

```python
# schemas.py — NEVER use a single model for all operations
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=100)

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None

class UserResponse(UserBase):
    id: int
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)
```

**PATCH endpoints**: Use `response_model_exclude_unset=True` or `model_dump(exclude_unset=True)`.

> Source: Jeffallan/claude-skills (fastapi-expert MUST DO rules)

---

## Pattern 1.4: Dependency Validation in Routes

Use dependencies for data validation against DB, not just DI:

```python
# dependencies.py
async def valid_user_id(user_id: UUID4) -> dict:
    user = await service.get_by_id(user_id)
    if not user:
        raise UserNotFound()
    return user

# router.py — reuse across multiple routes
@router.get("/users/{user_id}")
async def get_user(user: dict = Depends(valid_user_id)):
    return user

@router.put("/users/{user_id}")
async def update_user(data: UserUpdate, user: dict = Depends(valid_user_id)):
    return await service.update(user["id"], data)
```

> Source: zhanymkanov/fastapi-best-practices AGENTS.md

---

## Pattern 1.5: Consistent Path Variable Names

Use same variable names for dependency reuse:

```python
# Both use profile_id → shared valid_profile_id dependency
GET /profiles/{profile_id}       # valid_profile_id
GET /creators/{profile_id}       # valid_creator_id (chains valid_profile_id)
```

> Source: zhanymkanov/fastapi-best-practices

---

## Pattern 1.6: API Versioning

```python
# app/api/v1/api.py
v1_router = APIRouter()
v1_router.include_router(users.router, prefix="/users", tags=["users"])
v1_router.include_router(posts.router, prefix="/posts", tags=["posts"])

# app/api/v2/api.py
v2_router = APIRouter()
v2_router.include_router(users_v2.router, prefix="/users", tags=["users-v2"])

# main.py
app.include_router(v1_router, prefix="/api/v1")
app.include_router(v2_router, prefix="/api/v2")
```

---

## Pattern 1.7: OpenAPI Documentation

```python
app = FastAPI(
    title="User Management API",
    description="User CRUD with JWT authentication",
    version="1.0.0",
    openapi_tags=[
        {"name": "users", "description": "User management"},
        {"name": "auth", "description": "Authentication"},
    ],
    contact={"name": "API Support", "email": "support@example.com"},
)
```

**Response examples** for better docs:
```python
@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {"id": 1, "email": "john@example.com", "full_name": "John Doe"}
                }
            }
        },
        404: {"description": "User not found"},
    },
)
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-documentation.md)

---

## MUST DO

- Use type hints everywhere (FastAPI requires them)
- Use Pydantic V2 syntax (`field_validator`, `model_config`)
- Use `Annotated` pattern for dependency injection
- Return proper HTTP status codes (201 for creation, 204 for no content)
- Name functions to indicate purpose, not HTTP method (`create_user` not `post_user`)
- Document endpoints (response_model, status_code, summary, tags)
- Use `X | None` instead of `Optional[X]`

## MUST NOT DO

- Put business logic in routers (delegate to services immediately)
- Skip Pydantic validation (no raw dicts for request/response)
- Use Pydantic V1 syntax (`@validator`, `class Config`)
- Expose sensitive data in responses (use response_model to filter)
- Mix sync and async code improperly (`time.sleep()` in `async def`)
- Hardcode configuration values in routers

---

## References

- [FastAPI: Path Operation](https://fastapi.tiangolo.com/tutorial/path-operation-configuration/)
- [FastAPI: Response Model](https://fastapi.tiangolo.com/tutorial/response-model/)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [Jeffallan/claude-skills: fastapi-expert](https://github.com/Jeffallan/claude-skills)
- [derekmizak/Copilot-RuleSet-FastApi](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
