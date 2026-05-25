# FastAPI Error Handling Specialist
# FastAPIエラーハンドリングスペシャリスト
# Chuyen Gia FastAPI Error Handling

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/core/exceptions.py`, `src/core/exception_handlers.py` |
| **Variant** | ALL |
| **Naming Convention** | `exceptions.py` (domain hierarchy), `exception_handlers.py` (global handlers) |
| **Imports From** | Core (logging) |
| **Cannot Import** | Domain, Application, Presentation |
| **Dependencies** | N/A (FastAPI built-in exception handlers) |
| **When To Use** | Global error handling, exception hierarchy, error response schema |
| **Source Skeleton** | `src/core/exceptions.py`, `src/core/error_handlers.py` |
| **Pattern Numbers** | 26.1–26.6 |
| **Source Paths** | `**/exceptions.py`, `**/exception_handlers.py` |
| **File Count** | 2 (exceptions + handlers) |
| **Imported By** | Application (services raise), Core (app factory registers handlers) |
| **Specialist Type** | code |
| **Purpose** | Domain exception hierarchy, global exception handlers, "let it crash" philosophy, structured error responses, third-party SDK wrapping, background task error handling |
| **Activation Trigger** | exception, error, `HTTPException`, `exception_handler`, `AppException`, error handling |

---

## Purpose

Define error handling patterns for FastAPI: domain exception hierarchy with error codes, global exception handlers for consistent API responses, "let it crash" philosophy (raise low, catch high), structured error response schemas, third-party SDK wrapping with tenacity retry, and safe background task error handling.

---

## Pattern 26.1: Domain Exception Hierarchy

```python
from enum import StrEnum
from typing import Any


class ErrorCode(StrEnum):
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    RATE_LIMITED = "RATE_LIMITED"
    EXTERNAL_SERVICE = "EXTERNAL_SERVICE"
    INTERNAL = "INTERNAL_ERROR"


class AppException(Exception):
    """Base exception for all domain errors."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, resource: str, resource_id: Any) -> None:
        super().__init__(
            code=ErrorCode.NOT_FOUND,
            message=f"{resource} with id '{resource_id}' not found",
            status_code=404,
            details={"resource": resource, "id": str(resource_id)},
        )


class AlreadyExistsError(AppException):
    def __init__(self, resource: str, field: str, value: Any) -> None:
        super().__init__(
            code=ErrorCode.ALREADY_EXISTS,
            message=f"{resource} with {field}='{value}' already exists",
            status_code=409,
            details={"resource": resource, "field": field, "value": str(value)},
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(
            code=ErrorCode.FORBIDDEN,
            message=message,
            status_code=403,
        )


class ExternalServiceError(AppException):
    def __init__(self, service: str, message: str) -> None:
        super().__init__(
            code=ErrorCode.EXTERNAL_SERVICE,
            message=f"External service '{service}' error: {message}",
            status_code=502,
            details={"service": service},
        )
```

**Key rule**: Service layer raises `AppException` subclasses (NOT `HTTPException`). This keeps business logic framework-agnostic — the same exceptions work with FastAPI, CLI, or message consumers.

---

## Pattern 26.2: Global Exception Handlers

```python
import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("api.errors")


def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers in app factory."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(
            "Domain error: %s %s → %s: %s",
            request.method, request.url.path, exc.code, exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "HTTP_ERROR",
                    "message": exc.detail,
                    "details": {},
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": {"errors": errors},
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Unhandled error: %s %s",
            request.method, request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                    "details": {},
                }
            },
        )
```

**Key rule**: ALWAYS register a catch-all handler for `Exception`. Without it, unhandled errors return Starlette's default HTML error page instead of JSON.

---

## Pattern 26.3: "Let It Crash" Philosophy

```python
# ✅ CORRECT: Raise low, catch high
class UserService:
    async def create_user(self, data: CreateUserRequest) -> User:
        existing = await self._repo.get_by_email(data.email)
        if existing:
            raise AlreadyExistsError("User", "email", data.email)

        # Let DB errors propagate — caught by global handler
        return await self._repo.create(data)


# ❌ WRONG: Catching everything locally
class UserService:
    async def create_user(self, data: CreateUserRequest) -> User:
        try:
            existing = await self._repo.get_by_email(data.email)
            if existing:
                raise AlreadyExistsError("User", "email", data.email)
            return await self._repo.create(data)
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise  # Pointless: just let it propagate
```

**Rules**:
1. **Raise low**: Services raise specific domain exceptions at the point of failure
2. **Catch high**: Global handlers catch and format responses
3. **No bare `except`**: Always catch specific exception types
4. **Preserve context**: Use `raise NewError(...) from original_error` to chain exceptions
5. **Don't suppress**: If you catch, either handle meaningfully or re-raise

```python
# Preserve exception chain
try:
    result = await external_api.call()
except httpx.HTTPError as e:
    raise ExternalServiceError("payment-api", str(e)) from e
```

---

## Pattern 26.4: Error Response Schema

```python
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Structured error detail for API consumers."""
    code: str
    message: str
    details: dict = {}


class ErrorResponse(BaseModel):
    """Standard error envelope."""
    error: ErrorDetail


# Use in OpenAPI docs
@router.get(
    "/users/{user_id}",
    responses={
        404: {"model": ErrorResponse, "description": "User not found"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def get_user(user_id: int) -> UserResponse:
    ...
```

**Response format** (consistent across all errors):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id '42' not found",
    "details": {
      "resource": "User",
      "id": "42"
    }
  }
}
```

**Key rule**: Every error response follows the same `{"error": {"code", "message", "details"}}` envelope. This makes client-side error handling predictable.

---

## Pattern 26.5: Third-Party SDK Wrapping (Tenacity Retry)

```python
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)


class PaymentClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10.0,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def charge(self, amount: int, currency: str) -> dict:
        try:
            response = await self._client.post(
                "/charges",
                json={"amount": amount, "currency": currency},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise ExternalServiceError(
                "payment-api",
                f"HTTP {e.response.status_code}: {e.response.text}",
            ) from e

    async def close(self) -> None:
        await self._client.aclose()
```

**Install**: `pip install tenacity`

**Key rule**: Wrap external SDK calls with retry for transient failures (network, timeout). Convert SDK-specific exceptions to domain exceptions (`ExternalServiceError`) at the boundary.

---

## Pattern 26.6: Background Task Error Handling

```python
import logging
from functools import wraps
from typing import Callable, Coroutine

logger = logging.getLogger("api.background")


def safe_background_task(func: Callable[..., Coroutine]) -> Callable:
    """Decorator: catch and log errors in background tasks.
    Background tasks run after response is sent — unhandled errors are silent."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception:
            logger.exception(
                "Background task '%s' failed",
                func.__name__,
            )

    return wrapper


@safe_background_task
async def send_welcome_email(user_email: str, user_name: str) -> None:
    """Background: failures are logged but don't crash the app."""
    await email_service.send(
        to=user_email,
        template="welcome",
        context={"name": user_name},
    )


# Usage in route
@router.post("/users", status_code=201)
async def create_user(
    data: CreateUserRequest,
    background_tasks: BackgroundTasks,
    service: UserService = Depends(),
) -> UserResponse:
    user = await service.create_user(data)
    background_tasks.add_task(send_welcome_email, user.email, user.name)
    return user
```

**Key rule**: Background tasks run after the response is sent. Unhandled exceptions in background tasks are silently swallowed by FastAPI. Always wrap with error logging.

---

## MUST DO

- Create domain exception hierarchy (NOT `HTTPException` in services)
- Register global handlers for `AppException`, `StarletteHTTPException`, `RequestValidationError`, and `Exception`
- Use consistent error response envelope (`{"error": {"code", "message", "details"}}`)
- Preserve exception chains (`raise ... from original`)
- Wrap background tasks with error logging
- Retry transient external API failures with exponential backoff

## MUST NOT DO

- Raise `HTTPException` in service/domain layer (couples to FastAPI)
- Use bare `except:` or `except Exception: pass`
- Suppress errors without logging
- Return different error formats from different endpoints
- Let background task errors go silently (wrap with `safe_background_task`)
- Retry non-idempotent operations (only retry reads and idempotent writes)

---

## References

- [FastAPI: Handling Errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)
- [jiatastic: error-handling skill](https://github.com/jiatastic/open-python-skills)
- [derekmizak: fastapi-error-handling](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
- [Tenacity: Retry Library](https://tenacity.readthedocs.io/)
