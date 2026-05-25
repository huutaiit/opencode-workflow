# FastAPI Middleware Specialist
# FastAPIミドルウェアスペシャリスト
# Chuyen Gia FastAPI Middleware

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/core/middleware/` |
| **Variant** | ALL |
| **Naming Convention** | `{concern}_middleware.py` (e.g., `timing_middleware.py`) |
| **Imports From** | Core (config, logging) |
| **Cannot Import** | Domain, Application, Presentation |
| **Dependencies** | N/A (FastAPI/Starlette built-in) |
| **When To Use** | Request/response processing, auth middleware, timing, CORS |
| **Source Skeleton** | `src/core/middleware.py` |
| **Pattern Numbers** | 25.1–25.5 |
| **Source Paths** | `**/middleware/*.py` |
| **File Count** | 1 per middleware concern |
| **Imported By** | Core (app factory for registration) |
| **Specialist Type** | code |
| **Purpose** | Middleware execution ordering, three implementation approaches (decorator, BaseHTTPMiddleware, Pure ASGI), request ID, timing, authentication middleware |
| **Activation Trigger** | middleware, `@app.middleware`, `BaseHTTPMiddleware`, ASGI, `dispatch` |

---

## Purpose

Define middleware patterns for FastAPI: correct execution ordering, three implementation approaches with performance tradeoffs, request ID injection, request timing, and authentication middleware. Covers when to use each approach and how to register middleware in the app factory.

---

## Pattern 25.1: Middleware Execution Order

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware


def create_app() -> FastAPI:
    app = FastAPI()

    # IMPORTANT: Registration order is REVERSED execution order
    # Last added = first executed (outermost layer)

    # 1. CORS — outermost (must handle preflight before anything)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Trusted Host — reject invalid Host headers
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

    # 3. Security Headers — add to all responses
    app.add_middleware(SecurityHeadersMiddleware)

    # 4. Request ID — inject before logging
    app.add_middleware(RequestIDMiddleware)

    # 5. Timing — measure request duration
    app.add_middleware(TimingMiddleware)

    # 6. GZip — innermost (compress final response)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    return app
```

**Execution flow** (request → response):
```
Request → CORS → TrustedHost → SecurityHeaders → RequestID → Timing → GZip → Route
Response ← CORS ← TrustedHost ← SecurityHeaders ← RequestID ← Timing ← GZip ← Route
```

**Key rule**: Last `add_middleware()` call = first executed. Think of it as wrapping layers — last added is the outermost.

---

## Pattern 25.2: Three Implementation Approaches

### Approach A: Decorator (`@app.middleware("http")`)

```python
@app.middleware("http")
async def simple_logging(request: Request, call_next):
    """Simplest approach — good for quick, one-off middleware."""
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{duration:.4f}"
    return response
```

**Use when**: Quick prototyping, simple cross-cutting concerns. Cannot be reused across apps.

### Approach B: BaseHTTPMiddleware (Class)

```python
from starlette.middleware.base import BaseHTTPMiddleware


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{duration:.4f}"
        return response
```

**Use when**: Reusable middleware, need constructor params, standard request/response access. Most common approach.

**Caveat**: `BaseHTTPMiddleware` reads the entire response body into memory before returning. For streaming responses, use Pure ASGI.

### Approach C: Pure ASGI (Fastest)

```python
class PureASGITimingMiddleware:
    """20-30% faster than BaseHTTPMiddleware — no response body buffering."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                duration = time.perf_counter() - start
                headers = list(message.get("headers", []))
                headers.append(
                    (b"x-process-time", f"{duration:.4f}".encode())
                )
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
```

**Use when**: Performance-critical paths, streaming responses, WebSocket-aware middleware. Requires ASGI protocol knowledge.

### Decision Matrix

| Criteria | Decorator | BaseHTTPMiddleware | Pure ASGI |
|----------|-----------|-------------------|-----------|
| Reusable | No | Yes | Yes |
| Performance | Medium | Medium | Best (20-30% faster) |
| Streaming support | No | No (buffers body) | Yes |
| WebSocket support | No | No | Yes |
| Complexity | Low | Low | High |

---

## Pattern 25.3: Request ID Middleware

```python
import uuid
from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Use client-provided ID or generate new
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store in contextvars for logging/tracing
        token = request_id_ctx.set(request_id)

        # Attach to request state for route access
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        request_id_ctx.reset(token)
        return response


# Access in any async context (logging, services)
def get_request_id() -> str:
    return request_id_ctx.get()
```

**Key rule**: Use `contextvars.ContextVar` (NOT thread-local) for async-safe request-scoped data. This works correctly with FastAPI's async handlers.

---

## Pattern 25.4: Timing Middleware

```python
import time
import logging

logger = logging.getLogger("api.timing")


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        response.headers["X-Process-Time"] = f"{duration:.4f}"

        # Log slow requests
        if duration > 1.0:
            logger.warning(
                "Slow request: %s %s took %.3fs (status=%d)",
                request.method,
                request.url.path,
                duration,
                response.status_code,
            )

        return response
```

**Key rule**: Use `time.perf_counter()` (NOT `time.time()`) for accurate duration measurement. `perf_counter` is monotonic and not affected by system clock changes.

---

## Pattern 25.5: Authentication Middleware

```python
from starlette.authentication import (
    AuthCredentials,
    AuthenticationBackend,
    AuthenticationError,
    SimpleUser,
)
from starlette.middleware.authentication import AuthenticationMiddleware


class JWTAuthBackend(AuthenticationBackend):
    """Starlette-native auth backend — sets request.user and request.auth."""

    async def authenticate(self, request: Request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None  # Anonymous — not an error

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            scopes = payload.get("scopes", [])
            return AuthCredentials(scopes), SimpleUser(payload["sub"])
        except Exception:
            return None  # Invalid token → anonymous


# Register
app.add_middleware(
    AuthenticationMiddleware,
    backend=JWTAuthBackend(),
)

# Access in routes
@router.get("/profile")
async def profile(request: Request):
    if not request.user.is_authenticated:
        raise HTTPException(status_code=401)
    return {"user_id": request.user.display_name}
```

**When to use middleware auth vs dependency auth**:
- **Middleware**: When ALL routes need auth context (even anonymous), or for Starlette-native `request.user`
- **Dependency** (`Depends(get_current_user)`): When only specific routes need auth, more flexible per-route control

**Recommendation**: Use dependency-based auth (Pattern 20.1) for most cases. Middleware auth is useful when integrating with Starlette ecosystem tools.

---

## MUST DO

- Register middleware in correct order (CORS outermost, compression innermost)
- Use `contextvars.ContextVar` for request-scoped data (async-safe)
- Use `time.perf_counter()` for timing (monotonic clock)
- Use Pure ASGI for streaming responses and WebSocket middleware
- Log slow requests (>1s threshold)
- Include `X-Request-ID` in all responses for traceability

## MUST NOT DO

- Use `BaseHTTPMiddleware` for streaming responses (buffers entire body in memory)
- Use thread-local storage (`threading.local()`) in async middleware
- Put business logic in middleware (keep middleware thin — cross-cutting only)
- Register CORS middleware after other middleware (preflight will fail)
- Use `time.time()` for duration measurement (not monotonic)
- Modify request body in middleware (use dependencies instead)

---

## References

- [FastAPI: Middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
- [Starlette: Middleware](https://www.starlette.io/middleware/)
- [Kludex FastAPI Tips: Pure ASGI Middleware](https://github.com/Kludex/fastapi-tips)
- [derekmizak: fastapi-error-handling (RequestIDMiddleware)](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
