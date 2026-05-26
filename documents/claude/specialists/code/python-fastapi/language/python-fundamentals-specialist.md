# Python Fundamentals Specialist
# Python基礎スペシャリスト
# Chuyen Gia Python Co Ban

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All Python files |
| **Variant** | ALL |
| **Naming Convention** | PEP 8: `snake_case` vars/funcs, `PascalCase` classes, `UPPER_CASE` constants |
| **Imports From** | N/A (language-level) |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (Python built-in) |
| **When To Use** | All Python files — modern features, type hints, naming |
| **Source Skeleton** | `pyproject.toml` (Python version, dependencies) |
| **Pattern Numbers** | 65.1–65.8 |
| **Source Paths** | `**/*.py` |
| **File Count** | N/A (applies to all) |
| **Imported By** | ALL specialists |
| **Specialist Type** | language |
| **Purpose** | Python 3.12+ modern features, type hints, naming conventions, SOLID principles, context managers, comprehensions, docstrings |
| **Activation Trigger** | python basics, type hints, dataclass, match, walrus, modern python, naming |

---

## Purpose

Define Python language fundamentals for FastAPI projects: modern Python 3.12+ features, comprehensive type hints, naming conventions, SOLID principles, context managers, comprehensions and generators, f-strings, and docstring conventions.

---

## Pattern 65.1: Modern Python Features (3.10+)

```python
# Python 3.10+: match/case (structural pattern matching)
def handle_command(command: dict) -> str:
    match command:
        case {"action": "create", "name": str(name)}:
            return f"Creating {name}"
        case {"action": "delete", "id": int(id)}:
            return f"Deleting {id}"
        case {"action": str(action)}:
            return f"Unknown action: {action}"
        case _:
            return "Invalid command"


# Python 3.11+: ExceptionGroup + except*
async def fetch_all(urls: list[str]):
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(url)) for url in urls]
    # ExceptionGroup raised if any task fails


# Python 3.12+: Type parameter syntax
type Vector[T] = list[T]  # Type alias
type Matrix[T] = list[Vector[T]]

def first[T](items: list[T]) -> T:  # Generic function
    return items[0]

class Stack[T]:  # Generic class
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)


# Python 3.12+: f-string improvements (nested quotes allowed)
name = "world"
print(f"{'hello ' + f'{name}'}")  # Nested f-strings now valid
```

---

## Pattern 65.2: Type Hints

```python
from typing import Annotated, TypedDict, Protocol
from collections.abc import AsyncIterator, Callable


# Modern syntax (Python 3.10+) — use X | None, NOT Optional[X]
def get_user(user_id: int) -> dict | None:
    ...

# Use built-in generics (Python 3.9+) — list[str], NOT List[str]
def process(items: list[str], mapping: dict[str, int]) -> tuple[str, ...]:
    ...

# Annotated for metadata (FastAPI DI pattern)
from fastapi import Depends, Query

UserId = Annotated[int, Query(ge=1)]
CurrentUser = Annotated[dict, Depends(get_current_user)]

# TypedDict for structured dicts
class UserDict(TypedDict):
    name: str
    email: str
    age: int | None

# Protocol for structural subtyping (duck typing with types)
class Saveable(Protocol):
    async def save(self) -> None: ...

async def persist(entity: Saveable) -> None:
    await entity.save()  # Any class with save() method works

# Callable types
Handler = Callable[[str, int], bool]
AsyncHandler = Callable[[str], AsyncIterator[dict]]
```

**Key rules**:
- `X | None` instead of `Optional[X]`
- `list[str]` instead of `List[str]`
- `dict[str, int]` instead of `Dict[str, int]`
- Use `Annotated` for dependency injection metadata

> Source: derekmizak/Copilot-RuleSet-FastApi (python-core-principles)

---

## Pattern 65.3: Naming Conventions

```python
# Variables and functions: snake_case
user_name = "John"
async def get_user_by_id(user_id: int) -> dict: ...

# Classes: PascalCase
class UserService: ...
class OrderRepository: ...

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_COUNT = 3
DEFAULT_PAGE_SIZE = 20
API_V1_PREFIX = "/api/v1"

# Private: single underscore prefix
class Service:
    def _internal_method(self): ...  # Convention: "don't use outside class"
    _cache: dict = {}

# Module-level: underscore prefix for internal
_connection_pool = None  # Internal to module

# Boolean: is_/has_/can_ prefix
is_active = True
has_permission = False
can_edit = True
```

> Source: bossjones gist (code_style module)

---

## Pattern 65.4: SOLID Principles

```python
# S — Single Responsibility: one class, one reason to change
class UserRepository:
    """Only handles user data access."""
    async def get_by_id(self, id: int) -> User: ...

class EmailService:
    """Only handles email sending."""
    async def send(self, to: str, subject: str, body: str): ...


# O — Open/Closed: extend via protocol, not modification
class NotificationSender(Protocol):
    async def send(self, user_id: int, message: str) -> None: ...

class EmailNotifier:
    async def send(self, user_id: int, message: str) -> None: ...

class SlackNotifier:
    async def send(self, user_id: int, message: str) -> None: ...
    # Add new notifiers without modifying existing code


# L — Liskov: subtypes substitutable for base types
# D — Dependency Inversion: depend on abstractions
class OrderService:
    def __init__(self, repo: OrderRepository, notifier: NotificationSender):
        self.repo = repo
        self.notifier = notifier  # Depends on Protocol, not concrete class
```

> Source: derekmizak/python-core-principles

---

## Pattern 65.5: Context Managers

```python
from contextlib import asynccontextmanager, contextmanager


# Sync context manager
@contextmanager
def timer(label: str):
    import time
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{label}: {elapsed:.3f}s")


# Async context manager
@asynccontextmanager
async def db_transaction(session):
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise


# Class-based (for complex state)
class FileProcessor:
    def __init__(self, path: str):
        self.path = path

    async def __aenter__(self):
        self.file = await aiofiles.open(self.path)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.file.close()
        return False  # Don't suppress exceptions
```

---

## Pattern 65.6: Comprehensions + Generators

```python
# List comprehension (create list in memory)
active_users = [u for u in users if u.is_active]

# Dict comprehension
user_map = {u.id: u.name for u in users}

# Set comprehension
unique_emails = {u.email.lower() for u in users}

# Generator expression (lazy, memory-efficient for large data)
total_age = sum(u.age for u in users)

# Generator function (yield items one at a time)
def chunked(iterable, size: int):
    """Yield chunks of `size` from iterable."""
    chunk = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk

# Async generator
async def stream_records(query: str):
    async for record in db.execute(query):
        yield record.to_dict()
```

**Rule**: Use generators for large datasets (constant memory). Use comprehensions for small collections that need random access.

---

## Pattern 65.7: f-strings

```python
name = "Alice"
age = 30

# Basic
greeting = f"Hello, {name}!"

# Expressions
info = f"{name} is {'adult' if age >= 18 else 'minor'}"

# Formatting
pi = 3.14159
formatted = f"Pi is {pi:.2f}"          # "Pi is 3.14"
big_num = f"{1234567:,}"                # "1,234,567"
percent = f"{0.756:.1%}"               # "75.6%"
padded = f"{'hello':>20}"              # "               hello"

# Debug (Python 3.8+)
x = 42
debug = f"{x=}"                         # "x=42"
debug_fmt = f"{x=:.2f}"                # "x=42.00"

# Multiline
message = (
    f"User: {name}\n"
    f"Age: {age}\n"
    f"Status: {'active' if age > 0 else 'unknown'}"
)
```

---

## Pattern 65.8: Docstrings (Google Style)

```python
async def create_user(
    email: str,
    full_name: str,
    role: str = "user",
) -> dict:
    """Create a new user account.

    Validates email uniqueness, hashes password, and sends
    welcome notification.

    Args:
        email: User's email address (must be unique).
        full_name: User's display name.
        role: User role. Defaults to "user".

    Returns:
        Dict with user id, email, and created_at.

    Raises:
        ValueError: If email already exists.
        HTTPException: If role is invalid.

    Example:
        >>> user = await create_user("alice@example.com", "Alice")
        >>> print(user["id"])
        1
    """
    ...
```

> Source: PierreVannier (section 4, PEP 257)

---

## MUST DO

- Use type hints everywhere (FastAPI requires them)
- Use `X | None` instead of `Optional[X]`
- Use `list[str]` instead of `List[str]` (built-in generics)
- Use `Annotated` for FastAPI dependency metadata
- Follow PEP 8 naming: snake_case, PascalCase, UPPER_CASE
- Use f-strings for string formatting
- Use Google-style docstrings

## MUST NOT DO

- Use bare `except:` (catch specific exceptions)
- Use mutable default arguments (`def f(items=[])` — shared state bug)
- Use wildcard imports (`from module import *`)
- Use `Optional[X]` or `List[str]` (legacy typing)
- Use `%` or `.format()` for string formatting
- Skip type hints on public functions

---

## References

- [PEP 8 – Style Guide](https://peps.python.org/pep-0008/)
- [PEP 484 – Type Hints](https://peps.python.org/pep-0484/)
- [PEP 604 – Union Types](https://peps.python.org/pep-0604/)
- [PEP 636 – Pattern Matching](https://peps.python.org/pep-0636/)
