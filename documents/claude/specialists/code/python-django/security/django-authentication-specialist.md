# Django Authentication Specialist
# Django認証スペシャリスト
# Chuyen Gia Xac Thuc Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `apps/users/models.py`, `apps/users/managers.py` |
| **Variant** | ALL |
| **Naming Convention** | `User` model, `UserManager` |
| **Imports From** | django.contrib.auth.models |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | custom-user, abstract-base-user, allauth, social-auth, mfa, password-policies, session-config |
| **Pattern Numbers** | 15.1–15.7 |
| **Source Paths** | `**/models.py`, `**/managers.py`, `settings.py` |
| **File Count** | 1 (users app) |
| **Imported By** | All apps referencing User |
| **Specialist Type** | code |
| **Purpose** | Custom User model with email login, AbstractBaseUser, django-allauth, social authentication, MFA, password validation, session configuration |
| **Activation Trigger** | User model, AbstractUser, allauth, social auth, MFA, login, AUTH_USER_MODEL |

---

## Purpose

Define Django authentication patterns: custom User model with email as primary identifier (must create before first migration), AbstractBaseUser for full control, django-allauth for email verification and social auth, multi-factor authentication, password policies, and production session configuration with Redis.

---

## Pattern 15.1: Custom User Model (AbstractUser)

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField("email address", unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self):
        return self.email
```

```python
# settings.py
AUTH_USER_MODEL = "users.User"
```

**CRITICAL**: Set `AUTH_USER_MODEL` before running the **first** migration. Changing it later is extremely difficult.

---

## Pattern 15.2: AbstractBaseUser (Full Custom)

```python
# apps/users/managers.py
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)
```

```python
# apps/users/models.py
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def __str__(self):
        return self.email
```

Use `AbstractBaseUser` when you need to remove `username` entirely or have a radically different user model.

---

## Pattern 15.3: django-allauth Setup

```bash
pip install django-allauth
```

```python
# settings.py
INSTALLED_APPS = [
    "django.contrib.sites",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    # ...
]

MIDDLEWARE = [
    # ...
    "allauth.account.middleware.AccountMiddleware",
]

SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# allauth settings
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_LOGOUT_ON_GET = False
ACCOUNT_SESSION_REMEMBER = True
LOGIN_REDIRECT_URL = "/dashboard/"
LOGOUT_REDIRECT_URL = "/"
```

```python
# urls.py
urlpatterns = [
    path("accounts/", include("allauth.urls")),
]
```

---

## Pattern 15.4: Social Authentication (Google, GitHub)

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
]

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID"),
            "secret": env("GOOGLE_CLIENT_SECRET"),
        },
    },
    "github": {
        "SCOPE": ["user:email"],
        "APP": {
            "client_id": env("GITHUB_CLIENT_ID"),
            "secret": env("GITHUB_CLIENT_SECRET"),
        },
    },
}
```

```html
<!-- templates/account/login.html -->
{% load socialaccount %}
<a href="{% provider_login_url 'google' %}">Sign in with Google</a>
<a href="{% provider_login_url 'github' %}">Sign in with GitHub</a>
```

---

## Pattern 15.5: Multi-Factor Authentication (MFA)

```python
# django-allauth >= 0.56 includes MFA support
# settings.py
INSTALLED_APPS = [
    # ...
    "allauth.mfa",
]

MFA_ADAPTER = "allauth.mfa.adapter.DefaultMFAAdapter"
MFA_SUPPORTED_TYPES = ["totp", "recovery_codes"]
MFA_TOTP_PERIOD = 30
MFA_TOTP_DIGITS = 6
```

```python
# urls.py — MFA management pages
urlpatterns = [
    path("accounts/", include("allauth.urls")),
    # allauth.mfa URLs are included automatically
]
```

```python
# Programmatic MFA check in views
from allauth.mfa.utils import is_mfa_enabled


def sensitive_view(request):
    if not is_mfa_enabled(request.user):
        return redirect("mfa_activate_totp")
    # Proceed with sensitive operation
```

---

## Pattern 15.6: Password Policies

```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
```

```python
# apps/users/validators.py — custom validator
from django.core.exceptions import ValidationError
import re


class ComplexityValidator:
    """Require uppercase, lowercase, digit, and special character."""

    def validate(self, password, user=None):
        if not re.search(r"[A-Z]", password):
            raise ValidationError("Password must contain an uppercase letter.")
        if not re.search(r"[a-z]", password):
            raise ValidationError("Password must contain a lowercase letter.")
        if not re.search(r"\d", password):
            raise ValidationError("Password must contain a digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise ValidationError("Password must contain a special character.")

    def get_help_text(self):
        return "Password must contain uppercase, lowercase, digit, and special character."
```

```python
# settings.py — add custom validator
AUTH_PASSWORD_VALIDATORS = [
    # ... built-in validators
    {"NAME": "apps.users.validators.ComplexityValidator"},
]
```

---

## Pattern 15.7: Session Configuration

```python
# settings.py — Production session settings with Redis
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # No JS access
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_SAVE_EVERY_REQUEST = False  # Only save on modification
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# CACHES must be configured for session backend
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    },
}
```

---

## MUST DO

- Create custom User model **before** first migration
- Use `email` as `USERNAME_FIELD` for modern apps
- Use django-allauth for email verification + social auth
- Set `ACCOUNT_EMAIL_VERIFICATION = "mandatory"` in production
- Use Redis-backed sessions in production

## MUST NOT DO

- Use default `auth.User` model in production projects
- Store passwords as plaintext (always use `set_password()`)
- Skip email verification for user registration
- Set `SESSION_COOKIE_SECURE = False` in production
- Store client secrets in settings.py (use environment variables)

---

## References

- [Django: Customizing authentication](https://docs.djangoproject.com/en/5.0/topics/auth/customizing/)
- [django-allauth](https://docs.allauth.org/)
- [Django: Password management](https://docs.djangoproject.com/en/5.0/topics/auth/passwords/)
- [Django: Sessions](https://docs.djangoproject.com/en/5.0/topics/http/sessions/)
