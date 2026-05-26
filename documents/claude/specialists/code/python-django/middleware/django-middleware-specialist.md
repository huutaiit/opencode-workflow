# Django Middleware Specialist
# Djangoミドルウェアスペシャリスト
# Chuyen Gia Middleware Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Middleware |
| **Directory Pattern** | `apps/core/middleware.py`, `config/middleware.py` |
| **Variant** | ALL |
| **Naming Convention** | `middleware.py`, function or class-based |
| **Imports From** | django.http, django.utils |
| **Cannot Import** | Domain models (keep thin) |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | execution-order, function-middleware, class-middleware, asgi-middleware, common-patterns, error-handling |
| **Pattern Numbers** | 17.1–17.6 |
| **Source Paths** | `**/middleware.py` |
| **File Count** | 1 per app or project-wide |
| **Imported By** | — (configured in MIDDLEWARE) |
| **Specialist Type** | code |
| **Purpose** | Middleware execution order, function-based middleware, class-based middleware, ASGI async middleware, common custom patterns (timing, correlation ID, tenant), error handling middleware |
| **Activation Trigger** | middleware, MIDDLEWARE, process_request, process_response, get_response |

---

## Purpose

Define Django middleware patterns: understanding the request/response execution order, function-based middleware (new style), class-based middleware with hook methods, ASGI async middleware for Django async views, common custom middleware patterns (timing, correlation ID, tenant detection), and global error handling middleware.

---

## Pattern 17.1: Middleware Execution Order

```python
# settings.py — Order matters!
MIDDLEWARE = [
    # 1. Security (outermost — runs first on request, last on response)
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",

    # 2. Session
    "django.contrib.sessions.middleware.SessionMiddleware",

    # 3. Common (URL normalization, Content-Length)
    "django.middleware.common.CommonMiddleware",

    # 4. CSRF
    "django.middleware.csrf.CsrfViewMiddleware",

    # 5. Authentication (needs session)
    "django.contrib.auth.middleware.AuthenticationMiddleware",

    # 6. Messages (needs session + auth)
    "django.contrib.messages.middleware.MessageMiddleware",

    # 7. Clickjacking
    "django.middleware.clickjacking.XFrameOptionsMiddleware",

    # 8. Third-party
    "django_htmx.middleware.HtmxMiddleware",

    # 9. Custom (after Django core)
    "apps.core.middleware.TimingMiddleware",
    "apps.core.middleware.CorrelationIdMiddleware",
]
```

Request flows **top → bottom**. Response flows **bottom → top**.

---

## Pattern 17.2: Function-Based Middleware

```python
# apps/core/middleware.py
import time
import logging

logger = logging.getLogger(__name__)


def timing_middleware(get_response):
    """Log request processing time."""

    def middleware(request):
        start = time.monotonic()
        response = get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        logger.info(
            "Request %s %s completed in %.2fms (status=%d)",
            request.method,
            request.path,
            duration_ms,
            response.status_code,
        )

        response["X-Request-Duration-Ms"] = f"{duration_ms:.2f}"
        return response

    return middleware
```

```python
import uuid


def correlation_id_middleware(get_response):
    """Add correlation ID to every request for tracing."""

    def middleware(request):
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.correlation_id = correlation_id

        response = get_response(request)
        response["X-Correlation-ID"] = correlation_id
        return response

    return middleware
```

---

## Pattern 17.3: Class-Based Middleware

```python
import logging
import traceback

logger = logging.getLogger("django.request")


class ExceptionLoggingMiddleware:
    """Log unhandled exceptions with full context."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        """Called when a view raises an exception."""
        logger.error(
            "Unhandled exception in %s %s: %s\nUser: %s\nBody: %s",
            request.method,
            request.path,
            str(exception),
            getattr(request, "user", "anonymous"),
            request.body[:500] if request.body else "",
            exc_info=True,
        )
        # Return None to let Django's default exception handling continue
        return None
```

```python
class MaintenanceModeMiddleware:
    """Return 503 when maintenance mode is active."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        from django.http import HttpResponse

        if getattr(settings, "MAINTENANCE_MODE", False):
            # Allow admin access during maintenance
            if request.path.startswith("/admin/"):
                return self.get_response(request)
            return HttpResponse(
                "Site is under maintenance. Please try again later.",
                status=503,
                content_type="text/plain",
            )
        return self.get_response(request)
```

---

## Pattern 17.4: ASGI Middleware (Async)

```python
import time
import logging

logger = logging.getLogger(__name__)


class AsyncTimingMiddleware:
    """Async-compatible timing middleware."""

    def __init__(self, get_response):
        self.get_response = get_response

    async def __call__(self, request):
        start = time.monotonic()
        response = await self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        logger.info(
            "Async %s %s completed in %.2fms",
            request.method,
            request.path,
            duration_ms,
        )
        response["X-Request-Duration-Ms"] = f"{duration_ms:.2f}"
        return response
```

```python
# Middleware that supports both sync and async
from asgiref.sync import iscoroutinefunction, markcoroutinefunction


class DualModeMiddleware:
    """Works with both WSGI and ASGI."""

    async_capable = True
    sync_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        if iscoroutinefunction(self.get_response):
            markcoroutinefunction(self)

    def __call__(self, request):
        if iscoroutinefunction(self):
            return self.__acall__(request)
        # Sync path
        response = self.get_response(request)
        self.process_response(request, response)
        return response

    async def __acall__(self, request):
        response = await self.get_response(request)
        self.process_response(request, response)
        return response

    def process_response(self, request, response):
        response["X-Powered-By"] = "Django"
```

---

## Pattern 17.5: Common Custom Middleware Patterns

```python
# Tenant detection (multi-tenant SaaS)
class TenantMiddleware:
    """Detect tenant from subdomain or header."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(":")[0]
        subdomain = host.split(".")[0] if "." in host else None

        if subdomain and subdomain not in ("www", "api"):
            from apps.tenants.models import Tenant
            try:
                request.tenant = Tenant.objects.get(subdomain=subdomain)
            except Tenant.DoesNotExist:
                from django.http import Http404
                raise Http404("Tenant not found.")
        else:
            request.tenant = None

        return self.get_response(request)
```

```python
# IP blocking middleware
class IPBlockMiddleware:
    """Block requests from blacklisted IPs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        from django.http import HttpResponseForbidden

        blocked_ips = getattr(settings, "BLOCKED_IPS", [])
        client_ip = self.get_client_ip(request)

        if client_ip in blocked_ips:
            return HttpResponseForbidden("Access denied.")

        return self.get_response(request)

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
```

---

## Pattern 17.6: Middleware Error Handling

```python
import logging
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger("django.request")


class GlobalExceptionMiddleware:
    """Convert unhandled exceptions to JSON responses for API, HTML for web."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        logger.error(
            "Unhandled: %s %s — %s",
            request.method,
            request.path,
            exception,
            exc_info=True,
        )

        # API requests get JSON response
        if request.path.startswith("/api/"):
            return JsonResponse(
                {
                    "error": "Internal server error.",
                    "detail": str(exception) if settings.DEBUG else None,
                },
                status=500,
            )

        # Web requests: let Django render default error page
        return None
```

---

## MUST DO

- Keep middleware thin — delegate heavy work to views/services
- Place custom middleware **after** Django core middleware
- Use `process_exception` for global error handling
- Add correlation IDs for request tracing in production
- Support both sync and async if using ASGI

## MUST NOT DO

- Import heavy models at module level in middleware (import inside `__call__`)
- Modify `MIDDLEWARE` order without understanding the dependency chain
- Put business logic in middleware (it runs on every request)
- Block the event loop with sync operations in async middleware
- Swallow exceptions silently (always log before returning None)

---

## References

- [Django: Middleware](https://docs.djangoproject.com/en/5.0/topics/http/middleware/)
- [Django: Async support](https://docs.djangoproject.com/en/5.0/topics/async/)
