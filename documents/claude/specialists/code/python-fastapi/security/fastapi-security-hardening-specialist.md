# FastAPI Security Hardening Specialist
# FastAPIセキュリティ強化スペシャリスト
# Chuyen Gia FastAPI Security Hardening

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `src/core/middleware/security.py`, `src/core/validators.py` |
| **Variant** | ALL |
| **Naming Convention** | `security.py` (security middleware), `validators.py` (input sanitization) |
| **Imports From** | Core (config, settings) |
| **Cannot Import** | Domain, Application, Presentation |
| **Dependencies** | N/A (FastAPI/Starlette built-in CORS, headers) |
| **When To Use** | CORS config, security headers, rate limiting, CSRF, input validation |
| **Source Skeleton** | `src/core/security_headers.py` |
| **Pattern Numbers** | 22.1–22.7 |
| **Source Paths** | `**/middleware/security.py`, `**/validators.py` |
| **File Count** | 1-2 (security middleware + optional validators) |
| **Imported By** | Core (app factory for middleware registration) |
| **Specialist Type** | code |
| **Purpose** | CORS production config, security headers, rate limiting with SlowAPI, CSRF protection, input validation hardening, OWASP Top 10 checklist, HTTPS/TLS guidance |
| **Activation Trigger** | CORS, CSRF, security, OWASP, headers, `rate_limit`, hardening, `X-Frame-Options` |

---

## Purpose

Define security hardening patterns for FastAPI: production CORS configuration, security response headers, rate limiting with SlowAPI and Redis, CSRF protection for cookie-based auth, input validation hardening via Pydantic, OWASP Top 10 compliance checklist, and HTTPS/TLS termination guidance.

---

## Pattern 22.1: CORS Production Configuration

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import get_settings


def configure_cors(app: FastAPI) -> None:
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,  # ["https://app.example.com"]
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
        max_age=600,  # Preflight cache: 10 minutes
    )
```

```python
# In settings
class Settings(BaseSettings):
    CORS_ORIGINS: list[str] = []  # MUST be explicit in production

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
```

**Key rule**: NEVER use `allow_origins=["*"]` with `allow_credentials=True`. Browsers block this combination. Always list explicit origins from environment config.

---

## Pattern 22.2: Security Headers Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # XSS protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS: force HTTPS (1 year, include subdomains)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        # Content Security Policy (adjust per app)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "frame-ancestors 'none'"
        )

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        return response


# Register in app factory
app.add_middleware(SecurityHeadersMiddleware)
```

**Key rule**: Add security headers to ALL responses. For API-only backends, CSP can be minimal. For backends serving HTML, configure CSP strictly.

---

## Pattern 22.3: Rate Limiting (SlowAPI + Redis)

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from src.core.config import get_settings

settings = get_settings()

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,  # Redis for distributed rate limiting
    default_limits=["100/minute"],
)


def configure_rate_limiting(app: FastAPI) -> None:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)


# Per-route override
@router.post("/auth/login")
@limiter.limit("5/minute")  # Stricter for sensitive endpoints
async def login(request: Request, credentials: LoginRequest):
    ...


# Per-route with custom key (by user instead of IP)
@router.post("/api/expensive-operation")
@limiter.limit("10/hour", key_func=lambda request: request.state.user_id)
async def expensive_op(request: Request):
    ...
```

**Install**: `pip install slowapi`

**Key rule**: Use Redis backend in production (in-memory limiter won't work across multiple workers/pods).

---

## Pattern 22.4: CSRF Protection

```python
from fastapi_csrf_protect import CsrfProtect
from pydantic import BaseModel


class CsrfSettings(BaseModel):
    secret_key: str = get_settings().SECRET_KEY
    cookie_samesite: str = "lax"
    cookie_secure: bool = True  # HTTPS only


@CsrfProtect.load_config
def get_csrf_config():
    return CsrfSettings()


# Usage in form-based endpoints
@router.post("/form/submit")
async def submit_form(
    request: Request,
    csrf_protect: CsrfProtect = Depends(),
):
    await csrf_protect.validate_csrf(request)
    # Process form...


# Generate CSRF token for frontend
@router.get("/csrf-token")
async def get_csrf_token(csrf_protect: CsrfProtect = Depends()):
    response = JSONResponse({"detail": "CSRF cookie set"})
    csrf_protect.set_csrf_cookie(response)
    return response
```

**Install**: `pip install fastapi-csrf-protect`

**Key rule**: CSRF protection is needed ONLY for cookie/session-based auth. Bearer token APIs (Authorization header) are NOT vulnerable to CSRF because browsers don't auto-attach custom headers.

---

## Pattern 22.5: Input Validation Hardening

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re


class StrictInput(BaseModel):
    """Base model with security-hardened defaults."""
    model_config = ConfigDict(
        extra="forbid",      # Reject unknown fields (prevent mass assignment)
        str_strip_whitespace=True,
        str_max_length=10000,  # Global string limit
    )


class CreateUserRequest(StrictInput):
    email: str = Field(max_length=254, pattern=r"^[\w.+-]+@[\w-]+\.[\w.]+$")
    username: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_-]+$",  # Alphanumeric only
    )
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower()


class SearchQuery(StrictInput):
    q: str = Field(max_length=200)
    page: int = Field(ge=1, le=1000, default=1)
    per_page: int = Field(ge=1, le=100, default=20)

    @field_validator("q")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        """Remove potentially dangerous characters for search."""
        return re.sub(r"[<>\"';]", "", v)
```

**Key rules**:
- `extra="forbid"` prevents mass assignment attacks (unknown fields rejected)
- Always set `max_length` on string fields
- Use `pattern` for format validation (email, username)
- Sanitize free-text input that may be reflected in responses

---

## Pattern 22.6: OWASP Top 10 Checklist

| # | Vulnerability | FastAPI Mitigation |
|---|--------------|-------------------|
| A01 | Broken Access Control | RBAC dependencies (21.x), tenant isolation (21.4) |
| A02 | Cryptographic Failures | PyJWT + Argon2 (20.x), HTTPS (22.7) |
| A03 | Injection | SQLAlchemy ORM (never raw SQL), Pydantic validation (22.5) |
| A04 | Insecure Design | Clean architecture (0.x), security by default |
| A05 | Security Misconfiguration | Explicit CORS (22.1), security headers (22.2) |
| A06 | Vulnerable Components | `pip-audit` in CI, dependabot, minimum versions |
| A07 | Auth Failures | Token rotation (20.2), rate limiting (22.3), timing-safe (20.6) |
| A08 | Software Integrity | Signed dependencies (`pip install --require-hashes`), CSP (22.2) |
| A09 | Logging Failures | Structured logging (75.x), NEVER log tokens/passwords |
| A10 | SSRF | Validate URLs, allowlist external hosts, no user-supplied URLs in requests |

```python
# A06: Dependency auditing in CI
# pip install pip-audit
# pip-audit --strict --desc

# A09: Sanitize logs
import logging

class SanitizingFilter(logging.Filter):
    SENSITIVE_KEYS = {"password", "token", "secret", "authorization", "cookie"}

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, "msg") and isinstance(record.msg, str):
            for key in self.SENSITIVE_KEYS:
                record.msg = re.sub(
                    rf"({key})\s*[=:]\s*\S+",
                    rf"\1=***REDACTED***",
                    record.msg,
                    flags=re.IGNORECASE,
                )
        return True
```

---

## Pattern 22.7: HTTPS / TLS Termination

```nginx
# Nginx reverse proxy — TLS termination (NOT in FastAPI)
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/api.example.com.pem;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```python
# FastAPI: trust proxy headers
from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI(root_path="/api")  # If behind path-based proxy

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.example.com", "*.example.com"],
)

# Configure uvicorn to trust proxy
# uvicorn main:app --proxy-headers --forwarded-allow-ips="*"
```

**Key rule**: TLS termination happens at the reverse proxy (Nginx/Traefik/cloud LB), NOT in FastAPI. FastAPI only needs `--proxy-headers` to trust `X-Forwarded-*` headers.

---

## MUST DO

- Use explicit CORS origins (never `["*"]` with credentials)
- Add security headers to all responses (HSTS, CSP, X-Frame-Options)
- Use Redis-backed rate limiting in production
- Set `extra="forbid"` on Pydantic models receiving external input
- Run `pip-audit` in CI pipeline
- Sanitize sensitive data in logs (tokens, passwords, secrets)
- Terminate TLS at reverse proxy, not in FastAPI

## MUST NOT DO

- Use `allow_origins=["*"]` with `allow_credentials=True`
- Skip rate limiting on authentication endpoints
- Log tokens, passwords, API keys, or PII
- Trust client-supplied `X-Forwarded-For` without trusted proxy config
- Use CSRF protection for Bearer token APIs (unnecessary)
- Serve FastAPI directly on port 443 with TLS (use Nginx/Traefik)
- Disable Pydantic validation for "performance" reasons

---

## References

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [FastAPI: CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [SlowAPI Documentation](https://slowapi.readthedocs.io/)
- [fastapi-csrf-protect](https://github.com/aekasitt/fastapi-csrf-protect)
- [ivangrynenko: OWASP Cursor Rules](https://github.com/ivangrynenko/cursorrules)
- [Van-LLM-Crew: ASVS Secure Coding](https://github.com/Van-LLM-Crew/cursor-secure-coding)
- [derekmizak: security-implementation](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
