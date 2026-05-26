# FastAPI GraphQL Specialist
# FastAPI GraphQLスペシャリスト
# Chuyên Gia GraphQL FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `src/{domain}/graphql/`, `app/api/graphql/` |
| **Variant** | ALL |
| **Naming Convention** | `schema.py`, `types.py`, `mutations.py`, `queries.py` per domain |
| **Imports From** | Application (services), Domain (schemas/models) |
| **Cannot Import** | Data Access (repositories) directly |
| **Dependencies** | `strawberry-graphql[fastapi]>=0.230` |
| **When To Use** | GraphQL API with Strawberry integration |
| **Source Skeleton** | `src/{domain}/graphql/types.py`, `src/{domain}/graphql/resolvers.py`, `src/core/graphql.py` |
| **Pattern Numbers** | 2.1–2.4 |
| **Source Paths** | `**/graphql/**/*.py`, `**/schema.py` |
| **File Count** | 1–3 per domain module |
| **Imported By** | Main app (GraphQLRouter mount) |
| **Specialist Type** | code |
| **Purpose** | Strawberry GraphQL integration with FastAPI: schema design, authentication, pagination, mutations |
| **Activation Trigger** | `graphql`, `strawberry`, `schema.py`, resolver, GraphQL API design |

---

## Purpose

Define patterns for integrating Strawberry GraphQL with FastAPI: type definitions, query/mutation resolvers, authentication via context, and pagination/filtering patterns.

---

## Pattern 2.1: Strawberry + FastAPI Integration

```python
import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI

from src.books.graphql.types import BookType
from src.books.graphql.queries import Query
from src.books.graphql.mutations import Mutation


schema = strawberry.Schema(query=Query, mutation=Mutation)

graphql_app = GraphQLRouter(schema)


def create_app() -> FastAPI:
    app = FastAPI()
    app.include_router(graphql_app, prefix="/graphql")
    return app
```

**Type definitions** — map domain models to GraphQL types:
```python
import strawberry
from datetime import datetime


@strawberry.type
class BookType:
    id: int
    title: str
    author: str
    isbn: str
    published_date: datetime
    is_available: bool


@strawberry.input
class BookInput:
    title: str
    author: str
    isbn: str
    published_date: datetime
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-graphql.md)

---

## Pattern 2.2: Authentication in GraphQL (Context Getter)

```python
import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info
from fastapi import Depends, Request

from src.auth.dependencies import get_current_user
from src.auth.schemas import UserResponse


async def get_context(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
):
    return {"request": request, "current_user": current_user}


schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema, context_getter=get_context)


# Access in resolvers
@strawberry.type
class Query:
    @strawberry.field
    async def my_profile(self, info: Info) -> UserType:
        user = info.context["current_user"]
        return UserType(id=user.id, email=user.email, name=user.full_name)

    @strawberry.field
    async def protected_books(self, info: Info) -> list[BookType]:
        user = info.context["current_user"]
        # user is guaranteed authenticated via context_getter dependency
        return await book_service.get_books_for_user(user.id)
```

**Key rule**: All auth logic lives in `context_getter` via FastAPI dependencies — resolvers receive pre-authenticated context.

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-graphql.md)

---

## Pattern 2.3: Pagination, Filtering, Sorting

```python
import strawberry
from enum import Enum


@strawberry.enum
class SortOrder(Enum):
    ASC = "asc"
    DESC = "desc"


@strawberry.input
class BookFilter:
    title: str | None = None
    author: str | None = None
    is_available: bool | None = None


@strawberry.input
class PaginationInput:
    page: int = 1
    page_size: int = 20


@strawberry.type
class BookConnection:
    items: list[BookType]
    total_count: int
    has_next_page: bool


@strawberry.type
class Query:
    @strawberry.field
    async def books(
        self,
        info: Info,
        filter: BookFilter | None = None,
        pagination: PaginationInput | None = None,
        sort_by: str = "title",
        sort_order: SortOrder = SortOrder.ASC,
    ) -> BookConnection:
        pagination = pagination or PaginationInput()
        items, total = await book_service.list_books(
            filter=filter,
            page=pagination.page,
            page_size=pagination.page_size,
            sort_by=sort_by,
            sort_order=sort_order.value,
        )
        return BookConnection(
            items=[BookType.from_model(b) for b in items],
            total_count=total,
            has_next_page=(pagination.page * pagination.page_size) < total,
        )
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-graphql.md)

---

## Pattern 2.4: Mutations

```python
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_book(self, info: Info, input: BookInput) -> BookType:
        user = info.context["current_user"]
        book = await book_service.create(
            title=input.title,
            author=input.author,
            isbn=input.isbn,
            published_date=input.published_date,
            created_by=user.id,
        )
        return BookType.from_model(book)

    @strawberry.mutation
    async def update_book(
        self, info: Info, book_id: int, input: BookInput
    ) -> BookType:
        book = await book_service.update(book_id, input)
        return BookType.from_model(book)

    @strawberry.mutation
    async def delete_book(self, info: Info, book_id: int) -> bool:
        await book_service.delete(book_id)
        return True
```

**Error handling** — use Strawberry's union types for typed errors:
```python
@strawberry.type
class BookNotFoundError:
    message: str = "Book not found"

BookResult = strawberry.union("BookResult", types=(BookType, BookNotFoundError))

@strawberry.type
class Query:
    @strawberry.field
    async def book(self, info: Info, book_id: int) -> BookResult:
        book = await book_service.get_by_id(book_id)
        if not book:
            return BookNotFoundError()
        return BookType.from_model(book)
```

---

## MUST DO

- Use Strawberry (maintained, type-safe, first-class FastAPI support)
- Use `@strawberry.type` for output types, `@strawberry.input` for input types
- Auth via `context_getter` with FastAPI `Depends()`
- Use union types for typed error responses
- Separate types, queries, mutations into distinct files per domain

## MUST NOT DO

- Use Graphene (poorly maintained, no native FastAPI integration)
- Skip authentication in resolvers (enforce via context)
- Put business logic in resolvers (delegate to service layer)
- Expose database models directly as GraphQL types
- Use raw dicts instead of typed Strawberry types

---

## References

- [Strawberry GraphQL: FastAPI](https://strawberry.rocks/docs/integrations/fastapi)
- [derekmizak/Copilot-RuleSet-FastApi](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
- [FastAPI: GraphQL](https://fastapi.tiangolo.com/how-to/graphql/)
