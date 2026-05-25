# Django Security Hardening Specialist
# Djangoセキュリティ強化スペシャリスト
# Chuyen Gia Bao Mat Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `config/settings/`, `apps/{domain}/middleware.py` |
| **Variant** | ALL |
| **Naming Convention** | Security settings in `settings.py` |
| **Imports From** | django.middleware.security |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | csrf-protection, xss-prevention, security-headers, csp, cors, rate-limiting, security-checklist |
| **Pattern Numbers** | 16.7–16.13 |
| **Source Paths** | `**/settings.py`, `**/settings/*.py` |
| **File Count** | 1 settings file + middleware |
| **Imported By** | — (applied globally) |
| **Specialist Type** | code |
| **Purpose** | CSRF protection, XSS prevention, security headers, Content Security Policy, CORS, rate limiting, deployment security checklist |
| **Activation Trigger** | CSRF, XSS, security, CSP, CORS, OWASP, rate limit, security headers |

---

## Purpose

Define Django security hardening patterns: CSRF protection for forms and AJAX, XSS prevention with auto-escaping and sanitization, security headers via Django settings, Content Security Policy with django-csp, CORS configuration with django-cors-headers, rate limiting for abuse prevention, and production security checklist.

---

## Pattern 16.7: CSRF Protection

```html
<!-- Form CSRF token -->
<form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Submit</button>
</form>
```

```javascript
// AJAX CSRF token (fetch API)
const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

fetch('/api/articles/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ title: 'New Article' }),
});
```

```python
# settings.py — CSRF settings
CSRF_COOKIE_SECURE = True  # HTTPS only
CSRF_COOKIE_HTTPONLY = True  # No JS access to cookie
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_TRUSTED_ORIGINS = [
    "https://myapp.example.com",
]

# Only exempt webhooks (with signature verification)
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def stripe_webhook(request):
    # MUST verify webhook signature manually
    payload = request.body
    sig = request.headers.get("Stripe-Signature")
    # ... verify signature
```

---

## Pattern 16.8: XSS Prevention

```html
<!-- Django auto-escapes by default -->
{{ user_input }}  <!-- SAFE: auto-escaped -->

<!-- DANGEROUS: only use for trusted HTML -->
{{ trusted_html|safe }}

<!-- NEVER do this with user input -->
<!-- {{ user_input|safe }}  ← XSS vulnerability -->
```

```python
# Sanitize user HTML with bleach
# pip install bleach
import bleach

ALLOWED_TAGS = ["p", "br", "strong", "em", "a", "ul", "ol", "li", "h2", "h3"]
ALLOWED_ATTRIBUTES = {"a": ["href", "title"]}


def sanitize_html(html_input):
    """Clean user-submitted HTML."""
    return bleach.clean(
        html_input,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
    )
```

```python
# Model with sanitized HTML field
class Article(models.Model):
    body_raw = models.TextField(help_text="Raw HTML input")
    body_safe = models.TextField(editable=False, help_text="Sanitized HTML")

    def save(self, *args, **kwargs):
        self.body_safe = sanitize_html(self.body_raw)
        super().save(*args, **kwargs)
```

---

## Pattern 16.9: Security Headers

```python
# settings.py — Production security settings
# HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookie security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Clickjacking protection
X_FRAME_OPTIONS = "DENY"

# Content type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# Referrer policy
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Cross-origin opener policy
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
```

---

## Pattern 16.10: Content Security Policy (django-csp)

```bash
pip install django-csp
```

```python
# settings.py
MIDDLEWARE = [
    "csp.middleware.CSPMiddleware",
    # ...
]

# CSP directives
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "https://cdn.jsdelivr.net", "https://unpkg.com")
CSP_STYLE_SRC = ("'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_CONNECT_SRC = ("'self'",)
CSP_FRAME_SRC = ("'none'",)
CSP_OBJECT_SRC = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)

# Report violations (optional)
CSP_REPORT_URI = "/csp-report/"
CSP_REPORT_ONLY = False  # Set True to test before enforcing
```

```python
# Per-view CSP override
from csp.decorators import csp_update

@csp_update(SCRIPT_SRC=("'self'", "https://maps.googleapis.com"))
def map_view(request):
    return render(request, "map.html")
```

---

## Pattern 16.11: CORS (django-cors-headers)

```bash
pip install django-cors-headers
```

```python
# settings.py
INSTALLED_APPS = [
    "corsheaders",
    # ...
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # Must be BEFORE CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    # ...
]

# Option A: Specific origins (recommended)
CORS_ALLOWED_ORIGINS = [
    "https://frontend.example.com",
    "http://localhost:3000",
]

# Option B: Regex patterns
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://\w+\.example\.com$",
]

# Credentials (cookies, auth headers)
CORS_ALLOW_CREDENTIALS = True

# Headers and methods
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

# Preflight cache
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours
```

---

## Pattern 16.12: Rate Limiting

```bash
pip install django-ratelimit
```

```python
# views.py
from django_ratelimit.decorators import ratelimit


@ratelimit(key="ip", rate="5/m", method="POST", block=True)
def login_view(request):
    """Max 5 login attempts per minute per IP."""
    form = LoginForm(request.POST)
    if form.is_valid():
        # ... authenticate
        pass
    return render(request, "login.html", {"form": form})


@ratelimit(key="user", rate="100/h", method="GET", block=True)
def api_search(request):
    """Max 100 searches per hour per user."""
    query = request.GET.get("q", "")
    results = Article.objects.filter(title__icontains=query)
    return render(request, "search_results.html", {"results": results})


@ratelimit(key="ip", rate="3/h", method="POST", block=True)
def password_reset(request):
    """Max 3 password reset requests per hour per IP."""
    # ... send reset email
    pass
```

```python
# CBV rate limiting
from django_ratelimit.mixins import RatelimitMixin


class ContactView(RatelimitMixin, FormView):
    ratelimit_key = "ip"
    ratelimit_rate = "10/h"
    ratelimit_method = "POST"
    ratelimit_block = True

    form_class = ContactForm
    template_name = "contact.html"
```

---

## Pattern 16.13: Django Security Checklist

```bash
# Run Django's built-in security check
python manage.py check --deploy
```

```python
# Checklist in settings.py (production)
# ✅ DEBUG = False
DEBUG = False

# ✅ ALLOWED_HOSTS set
ALLOWED_HOSTS = ["myapp.example.com", "www.myapp.example.com"]

# ✅ SECRET_KEY from environment
SECRET_KEY = env("DJANGO_SECRET_KEY")

# ✅ Database password from environment
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
    },
}

# ✅ Logging for security events
LOGGING = {
    "version": 1,
    "handlers": {
        "security": {
            "class": "logging.FileHandler",
            "filename": "/var/log/django/security.log",
        },
    },
    "loggers": {
        "django.security": {
            "handlers": ["security"],
            "level": "WARNING",
        },
    },
}
```

---

## MUST DO

- Run `manage.py check --deploy` before every release
- Set all `SECURE_*` settings for production
- Use django-csp to prevent XSS via injected scripts
- Use django-cors-headers with explicit allowed origins
- Rate-limit authentication endpoints (login, password reset)
- Store secrets in environment variables (never in code)

## MUST NOT DO

- Set `DEBUG = True` in production
- Use `CORS_ALLOW_ALL_ORIGINS = True` in production
- Use `@csrf_exempt` without webhook signature verification
- Use `mark_safe()` or `|safe` on user-provided content
- Skip `ALLOWED_HOSTS` configuration
- Disable security middleware for convenience

---

## References

- [Django: Security in Django](https://docs.djangoproject.com/en/5.0/topics/security/)
- [Django: Deployment checklist](https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/)
- [django-csp](https://django-csp.readthedocs.io/)
- [django-cors-headers](https://github.com/adamchainz/django-cors-headers)
- [django-ratelimit](https://django-ratelimit.readthedocs.io/)
