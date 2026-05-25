# Django Settings Specialist
# Django設定スペシャリスト
# Chuyen Gia Cau Hinh Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | `config/settings/` |
| **Variant** | ALL |
| **Naming Convention** | `base.py`, `development.py`, `production.py`, `testing.py` |
| **Imports From** | N/A (configuration) |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | split-settings, django-environ, secret-management, database-config, static-media-config, logging-config, third-party-settings |
| **Pattern Numbers** | 0.8–0.14 |
| **Source Paths** | `config/settings/*.py`, `.env` |
| **File Count** | 4-5 settings files |
| **Imported By** | ALL modules |
| **Specialist Type** | architecture |
| **Purpose** | Split settings, django-environ, secrets, database URL, static/media, logging, third-party configuration |
| **Activation Trigger** | settings, .env, configuration, SECRET_KEY, DEBUG, ALLOWED_HOSTS, database |

---

## Purpose

Define Django settings patterns: split settings per environment, django-environ for .env parsing, secret management, database configuration with dj-database-url, static/media file settings, structured logging, and third-party package settings organization.

---

## Pattern 0.8: Split Settings

```python
# config/settings/base.py — Shared across ALL environments
import environ
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

# Apps, middleware, templates, etc. (shared)
INSTALLED_APPS = [...]
MIDDLEWARE = [...]

AUTH_USER_MODEL = "users.User"  # ALWAYS set before first migration
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

```python
# config/settings/development.py
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": env.db("DATABASE_URL", default="sqlite:///db.sqlite3")
}

# Debug toolbar
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")
INTERNAL_IPS = ["127.0.0.1"]
```

```python
# config/settings/production.py
from .base import *  # noqa: F401,F403

DEBUG = False
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

DATABASES = {"default": env.db("DATABASE_URL")}

# Security
SECURE_HSTS_SECONDS = 31536000
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
```

> Source: Two Scoops of Django (Chapter 5)

---

## Pattern 0.9: django-environ

```python
# pip install django-environ
import environ

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CACHE_TTL=(int, 300),
)
environ.Env.read_env(".env")

# Type-safe access
DEBUG = env("DEBUG")                          # bool
SECRET_KEY = env("SECRET_KEY")                # str (required)
ALLOWED_HOSTS = env("ALLOWED_HOSTS")          # list
CACHE_TTL = env("CACHE_TTL")                  # int
DATABASE_URL = env.db("DATABASE_URL")         # dict (Django DB config)
REDIS_URL = env.cache("REDIS_URL")            # dict (Django cache config)
EMAIL_URL = env.email("EMAIL_URL")            # dict (Django email config)
```

```bash
# .env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
REDIS_URL=redis://localhost:6379/0
```

---

## Pattern 0.10: Database Configuration

```python
# Option 1: django-environ (recommended)
DATABASES = {"default": env.db("DATABASE_URL")}

# Option 2: dj-database-url
import dj_database_url
DATABASES = {"default": dj_database_url.config(conn_max_age=600)}

# Option 3: Explicit (for complex setups)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 600,
        "OPTIONS": {"connect_timeout": 10},
    }
}
```

---

## Pattern 0.11: Logging Configuration

```python
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
        "console": {
            "format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if not DEBUG else "console",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"level": "INFO"},
        "django.db.backends": {"level": "WARNING"},  # Silence SQL logs
        "apps": {"level": "DEBUG" if DEBUG else "INFO"},
    },
}
```

---

## Pattern 0.12: REST Framework Settings

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
    },
}
```

---

## Pattern 0.13: Static & Media Settings

```python
# Static files (CSS, JS, images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# WhiteNoise (serve static without nginx)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Media files (user uploads)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Production: S3 via django-storages
if not DEBUG:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    }
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
```

---

## Pattern 0.14: Secret Key Generation

```python
# Generate new SECRET_KEY
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())

# Or via CLI
# python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## MUST DO

- Split settings per environment (base/dev/prod/test)
- Use django-environ for .env parsing
- Store SECRET_KEY in environment variable
- Set AUTH_USER_MODEL before first migration
- Use `CONN_MAX_AGE` for database connection pooling
- Use WhiteNoise or S3 for static files in production

## MUST NOT DO

- Hardcode SECRET_KEY in settings
- Commit .env to version control
- Use single settings.py with if/else for environments
- Set DEBUG=True in production
- Skip ALLOWED_HOSTS in production
- Use SQLite in production

---

## References

- [Django: Settings](https://docs.djangoproject.com/en/5.0/ref/settings/)
- [django-environ](https://django-environ.readthedocs.io/)
- [Two Scoops of Django: Settings](https://www.feldroy.com/books/two-scoops-of-django-5-0)
