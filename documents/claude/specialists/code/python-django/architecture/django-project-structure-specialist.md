# Django Project Structure Specialist
# Djangoプロジェクト構造スペシャリスト
# Chuyen Gia Cau Truc Du An Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — defines structure for every layer) |
| **Directory Pattern** | `config/`, `apps/`, `src/` |
| **Variant** | ALL |
| **Naming Convention** | `snake_case` directories and files, domain-based apps |
| **Imports From** | ALL |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY (MTV, clean-architecture, modular) |
| **Implementation Patterns** | project-layout, app-organization, installed-apps, appconfig, wsgi-asgi, manage-py, monorepo |
| **Pattern Numbers** | 0.1–0.7 |
| **Source Paths** | `config/`, `apps/`, `manage.py` |
| **File Count** | N/A (structural) |
| **Imported By** | ALL specialists |
| **Specialist Type** | architecture |
| **Purpose** | Define project layout, app organization, INSTALLED_APPS, AppConfig, WSGI/ASGI, manage.py conventions |
| **Activation Trigger** | new project, project structure, startproject, startapp, apps.py, layout |

---

## Purpose

Define the canonical project structure for Django: Two Scoops-style layout with separated config, domain-based apps, proper AppConfig registration, WSGI/ASGI configuration. This is the **START HERE** specialist.

---

## Pattern 0.1: Project Layout (Two Scoops Style)

```
myproject/
├── config/                    # Project configuration (was myproject/)
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py           # Shared settings
│   │   ├── development.py    # DEBUG=True, local DB
│   │   ├── production.py     # Security, logging
│   │   └── testing.py        # Fast test DB
│   ├── urls.py               # Root URL configuration
│   ├── wsgi.py               # WSGI entry point
│   └── asgi.py               # ASGI entry point
├── apps/                      # All Django apps
│   ├── users/
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── serializers.py    # DRF
│   │   ├── forms.py
│   │   ├── signals.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models.py
│   │   │   └── test_views.py
│   │   └── migrations/
│   ├── orders/
│   └── products/
├── templates/                 # Global templates
│   └── base.html
├── static/                    # Global static files
├── media/                     # User uploads (dev only)
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── manage.py
├── pyproject.toml
└── .env
```

**Key rules**:
- `config/` separates project config from app code
- `apps/` groups all domain apps
- Each app = 1 business domain (users, orders, products)

> Source: Two Scoops of Django, Netflix Dispatch pattern

---

## Pattern 0.2: App Organization (Domain-Based)

```python
# apps/users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"  # Full dotted path
    verbose_name = "User Management"

    def ready(self):
        import apps.users.signals  # noqa: F401
```

**Each app contains**:
- `models.py` — Domain models
- `views.py` — Views (CBV/FBV)
- `urls.py` — App URL patterns with `app_name`
- `admin.py` — Admin registration
- `serializers.py` — DRF serializers (if API)
- `forms.py` — Django forms (if server-rendered)
- `signals.py` — Signal handlers
- `tests/` — Test directory

---

## Pattern 0.3: INSTALLED_APPS Organization

```python
# config/settings/base.py

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "django_filters",
    "corsheaders",
    "django_extensions",
]

LOCAL_APPS = [
    "apps.users",
    "apps.orders",
    "apps.products",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS
```

---

## Pattern 0.4: AppConfig and ready()

```python
from django.apps import AppConfig


class OrdersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    verbose_name = "Order Management"

    def ready(self):
        """Register signals when app is ready.

        This is the ONLY correct place to import signals.
        Do NOT import signals in models.py or __init__.py.
        """
        from apps.orders import signals  # noqa: F401
```

---

## Pattern 0.5: WSGI vs ASGI

```python
# config/wsgi.py — Sync (default, most projects)
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
application = get_wsgi_application()


# config/asgi.py — Async (Channels, async views)
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
application = get_asgi_application()
```

**When to use ASGI**: Django Channels (WebSocket), async views with external API calls.

---

## Pattern 0.6: manage.py Best Practices

```python
#!/usr/bin/env python
"""Django management script."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

**Key rule**: Never modify manage.py. Change settings via `DJANGO_SETTINGS_MODULE` env var.

---

## Pattern 0.7: Root URL Configuration

```python
# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.users.urls")),
    path("api/v1/", include("apps.orders.urls")),
]

# Serve media in development only
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## MUST DO

- Separate config/ from apps/ (Two Scoops layout)
- Organize apps by domain, not by file type
- Use AppConfig.ready() for signal registration
- Split settings per environment (base/dev/prod/test)
- Set `app_name` in every app's urls.py
- Use `default_auto_field = "django.db.models.BigAutoField"`

## MUST NOT DO

- Put all code in one giant app
- Import signals in models.py or __init__.py
- Modify manage.py
- Use single settings.py with if/else for environments
- Serve media files from Django in production
- Skip AppConfig registration

---

## Architecture: Folder Tree

<!-- Parser-compatible alias for Pattern 0.1 -->

```
myproject/
├── config/                    # Project configuration
│   ├── settings/
│   │   ├── base.py           # Shared settings
│   │   ├── development.py    # DEBUG=True, local DB
│   │   ├── production.py     # Security, logging
│   │   └── testing.py        # Fast test DB
│   ├── urls.py               # Root URL configuration
│   ├── wsgi.py               # WSGI entry point
│   └── asgi.py               # ASGI entry point
├── apps/                      # All Django apps (1 app = 1 domain)
│   ├── users/
│   ├── orders/
│   └── products/
├── templates/                 # Global templates
├── static/                    # Global static files
├── requirements/
├── manage.py
└── pyproject.toml
```

## Architecture: Dependency Rules

<!-- Parser-compatible — Django apps use MTV, no strict layer hierarchy like Clean Architecture -->
<!-- Django dependency rules are app-to-app, not layer-to-layer -->

| From | Can Import | Cannot Import |
|------|-----------|--------------|
| App (any) | Django framework, third-party libs | — |
| App A | App A's own models/views/forms | App B's internal modules (use signals or API) |
| config/ | All apps (INSTALLED_APPS registration) | — |
| templates/ | Template tags from any app | Python code directly |

**Key rule**: Apps should be loosely coupled. Cross-app communication via signals, shared interfaces, or API calls — NOT direct model imports across app boundaries.

## Architecture: File Type Mapping

<!-- Parser-compatible mapping for plan §0.1 -->

| File Type | Layer | Path Pattern |
|-----------|-------|-------------|
| Model | Domain (MTV: Model) | `apps/{app}/models.py` |
| View | Presentation (MTV: View) | `apps/{app}/views.py` |
| Template | Presentation (MTV: Template) | `templates/{app}/*.html` |
| URL Config | Routing | `apps/{app}/urls.py` |
| Serializer | API | `apps/{app}/serializers.py` |
| Form | Presentation | `apps/{app}/forms.py` |
| Admin | Admin | `apps/{app}/admin.py` |
| Signal | Cross-cutting | `apps/{app}/signals.py` |
| AppConfig | Configuration | `apps/{app}/apps.py` |
| Migration | Database | `apps/{app}/migrations/*.py` |
| Test | Testing | `apps/{app}/tests/test_*.py` |
| Settings | Configuration | `config/settings/*.py` |

## Architecture: Feature Completeness

<!-- Parser-compatible checklist for plan verification -->

### Rule 1: New Django App → MUST have

- [ ] `apps/{app}/__init__.py`
- [ ] `apps/{app}/apps.py` with AppConfig (name = `"apps.{app}"`)
- [ ] `apps/{app}/models.py`
- [ ] `apps/{app}/views.py` or `apps/{app}/serializers.py` (DRF)
- [ ] `apps/{app}/urls.py` with `app_name`
- [ ] `apps/{app}/admin.py`
- [ ] `apps/{app}/tests/__init__.py`
- [ ] Entry in `config/settings/base.py` LOCAL_APPS
- [ ] Include in `config/urls.py`

### Rule 2: Add Feature to Existing App → MUST have

- [ ] Model changes → migration (`python manage.py makemigrations`)
- [ ] View/Serializer for the feature
- [ ] URL pattern in app's urls.py
- [ ] Test in `apps/{app}/tests/`

### Rule 3: Validation

- [ ] All apps registered in INSTALLED_APPS via AppConfig dotted path
- [ ] No cross-app direct model imports (use signals or interfaces)
- [ ] Settings split per environment (base/dev/prod/test)

---

## References

- [Django: Applications](https://docs.djangoproject.com/en/5.0/ref/applications/)
- [Two Scoops of Django](https://www.feldroy.com/books/two-scoops-of-django-5-0)
- [Django Project Layout](https://docs.djangoproject.com/en/5.0/intro/tutorial01/)
