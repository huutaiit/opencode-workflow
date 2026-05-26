# FastAPI Logging Specialist
# FastAPIログスペシャリスト
# Chuyen Gia Logging FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/core/logging.py`, `src/core/config.py` |
| **Variant** | ALL |
| **Naming Convention** | `logging.py`, `log_config.py` |
| **Imports From** | N/A (infrastructure) |
| **Cannot Import** | N/A |
| **Dependencies** | structlog>=24.0, logfire (optional) |
| **When To Use** | Structured logging, correlation IDs, production log config |
| **Source Skeleton** | `src/core/logging.py` |
| **Pattern Numbers** | 75.1–75.6 |
| **Source Paths** | `**/core/logging.py`, `**/core/log*.py` |
| **File Count** | 1-2 per project |
| **Imported By** | ALL modules |
| **Specialist Type** | code |
| **Purpose** | structlog JSON logging, correlation IDs, Pydantic Logfire, dev vs prod config, Uvicorn log unification, sensitive data scrubbing |
| **Activation Trigger** | logging, structlog, loguru, logfire, correlation_id, log |

---

## Purpose

Define logging patterns for FastAPI: structlog with JSON output, correlation IDs via ASGI middleware, Pydantic Logfire for observability, environment-based dev/prod configuration, Uvicorn log unification, and sensitive data scrubbing.

---

## Pattern 75.1: structlog Configuration

```python
# pip install structlog
import structlog
from structlog.types import Processor


def setup_logging(json_logs: bool = True, log_level: str = "INFO") -> None:
    """Configure structlog with processor pipeline."""
    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if json_logs:
        # Production: JSON output
        renderer = structlog.processors.JSONRenderer()
    else:
        # Development: colored console output
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    import logging
    handler = logging.StreamHandler()
    handler.setFormatter(structlog.stdlib.ProcessorFormatter(
        processors=[*shared_processors, renderer],
    ))

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(log_level)


# Usage
import structlog

logger = structlog.get_logger()

async def create_user(email: str):
    logger.info("creating_user", email=email)
    # Output: {"event": "creating_user", "email": "john@example.com", "timestamp": "...", "level": "info"}
```

---

## Pattern 75.2: Correlation ID

```python
# pip install asgi-correlation-id
from asgi_correlation_id import CorrelationIdMiddleware
from asgi_correlation_id import correlation_id
import structlog


# Add middleware
app.add_middleware(
    CorrelationIdMiddleware,
    header_name="X-Request-ID",
    generator=lambda: str(uuid.uuid4()),
)


# structlog auto-includes correlation_id via contextvars
def add_correlation_id(logger, method_name, event_dict):
    """Add correlation ID to every log entry."""
    request_id = correlation_id.get()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


# Add to processor pipeline
structlog.configure(
    processors=[
        add_correlation_id,
        structlog.contextvars.merge_contextvars,
        # ... rest of processors
    ],
)


# Every log entry now has request_id:
# {"event": "creating_user", "request_id": "abc-123", "email": "...", "level": "info"}

# Also returned in response headers:
# X-Request-ID: abc-123
```

---

## Pattern 75.3: Pydantic Logfire

```python
# pip install logfire[fastapi]
import logfire

logfire.configure()

# Auto-instrument FastAPI
logfire.instrument_fastapi(app)

# Auto-instrument SQLAlchemy
logfire.instrument_sqlalchemy(engine)

# Auto-instrument httpx
logfire.instrument_httpx()

# Custom spans
@router.post("/users")
async def create_user(payload: UserCreate):
    with logfire.span("create_user", email=payload.email):
        user = await user_service.create(payload)

        logfire.info("user_created", user_id=user.id)

        with logfire.span("send_welcome_email"):
            await email_service.send_welcome(user.email)

    return user


# Metrics
logfire.metric_counter("users_created").add(1, {"tier": "free"})
logfire.metric_histogram("response_time").record(0.123)
```

> Source: jiatastic logfire skill

---

## Pattern 75.4: Dev vs Prod Config

```python
from src.core.config import settings


def configure_logging():
    """Environment-aware logging configuration."""
    if settings.ENVIRONMENT == "production":
        setup_logging(
            json_logs=True,       # JSON for log aggregation
            log_level="INFO",
        )
    elif settings.ENVIRONMENT == "staging":
        setup_logging(
            json_logs=True,
            log_level="DEBUG",
        )
    else:
        # Development
        setup_logging(
            json_logs=False,      # Pretty console output
            log_level="DEBUG",
        )
```

---

## Pattern 75.5: Uvicorn Log Unification

```python
import logging


def unify_uvicorn_logs():
    """Route Uvicorn logs through structlog."""
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uv_logger = logging.getLogger(logger_name)
        uv_logger.handlers = []  # Remove default handlers
        uv_logger.propagate = True  # Use root handler (structlog)


# Call during startup
@asynccontextmanager
async def lifespan(app):
    configure_logging()
    unify_uvicorn_logs()
    yield
```

---

## Pattern 75.6: Sensitive Data Scrubbing

```python
# With Logfire
import logfire

logfire.configure(
    scrubbing=logfire.ScrubbingOptions(
        extra_patterns=[
            r"password",
            r"secret",
            r"token",
            r"api[_-]?key",
            r"authorization",
            r"credit[_-]?card",
            r"ssn",
        ],
    ),
)

# Manual scrubbing in structlog
def scrub_sensitive(logger, method_name, event_dict):
    """Remove sensitive fields from log entries."""
    sensitive_keys = {"password", "token", "secret", "api_key", "authorization"}
    for key in list(event_dict.keys()):
        if any(s in key.lower() for s in sensitive_keys):
            event_dict[key] = "***REDACTED***"
    return event_dict
```

---

## MUST DO

- Use structlog for structured JSON logging in production
- Add correlation IDs to every request (X-Request-ID)
- Configure different log levels per environment
- Unify Uvicorn logs through structlog
- Scrub sensitive data (passwords, tokens, API keys)
- Use structured key-value pairs (not string interpolation)

## MUST NOT DO

- Use `print()` for logging
- Use string formatting in log messages (`f"User {user_id}"` — use kwargs)
- Log sensitive data (passwords, tokens, PII)
- Use different logging libraries across the project
- Skip correlation IDs (makes debugging distributed systems impossible)
- Use DEBUG level in production

---

## References

- [structlog](https://www.structlog.org/)
- [asgi-correlation-id](https://github.com/snok/asgi-correlation-id)
- [Pydantic Logfire](https://logfire.pydantic.dev/)
