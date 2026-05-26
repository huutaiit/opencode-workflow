# DRF Authentication Specialist
# DRF認証スペシャリスト
# Chuyen Gia Xac Thuc DRF

**Stack**: Python 3.12+ / Django 5.x / DRF 3.15+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `apps/auth/`, `config/settings/` |
| **Variant** | ALL |
| **Naming Convention** | `authentication.py`, settings in REST_FRAMEWORK |
| **Imports From** | Domain (User model) |
| **Cannot Import** | Views |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | token-auth, jwt-simplejwt, session-auth, custom-auth, per-view-override, jwt-settings |
| **Pattern Numbers** | 7.1–7.6 |
| **Source Paths** | `**/authentication.py`, `config/settings/*.py` |
| **File Count** | 1-2 per project |
| **Imported By** | ViewSets, Views |
| **Specialist Type** | code |
| **Purpose** | Token authentication, JWT with simplejwt, session auth, custom auth backends, per-view override, JWT configuration |
| **Activation Trigger** | authentication, JWT, token, simplejwt, login, auth, DRF auth |

---

## Purpose

Define DRF authentication patterns: built-in token auth, JWT with djangorestframework-simplejwt (access + refresh + rotation + blacklist), session auth for browser clients, custom authentication backends, and per-view auth override.

---

## Pattern 7.1: Token Authentication (Built-in)

```python
# settings.py
INSTALLED_APPS += ["rest_framework.authtoken"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
}

# Generate token for user
from rest_framework.authtoken.models import Token
token, created = Token.objects.get_or_create(user=user)

# urls.py — obtain token endpoint
from rest_framework.authtoken.views import obtain_auth_token
urlpatterns += [path("api/token/", obtain_auth_token)]

# Client: Authorization: Token <token>
```

---

## Pattern 7.2: JWT with simplejwt

```python
# pip install djangorestframework-simplejwt
# settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

# urls.py
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
]
```

---

## Pattern 7.3: JWT Settings

```python
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,       # New refresh token on each refresh
    "BLACKLIST_AFTER_ROTATION": True,     # Blacklist old refresh token
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.auth.serializers.MyTokenObtainPairSerializer",
}
```

**Custom claims**:
```python
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["role"] = user.role
        return token
```

---

## Pattern 7.4: Session Authentication

```python
# For browser-based API clients (admin, browsable API)
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",  # For browsable API
    ],
}
```

---

## Pattern 7.5: Custom Authentication Backend

```python
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return None  # Try next authenticator

        try:
            api_key_obj = APIKey.objects.select_related("user").get(
                key=api_key, is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed("Invalid API key")

        return (api_key_obj.user, api_key_obj)
```

---

## Pattern 7.6: Per-View Override

```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication


class PublicViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = []  # No auth required
    permission_classes = [permissions.AllowAny]


class AdminViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAdminUser]
```

---

## MUST DO

- Use JWT (simplejwt) for API authentication
- Rotate refresh tokens on each use
- Blacklist old refresh tokens
- Set short access token lifetime (15-30 min)
- Use custom claims for role/email in JWT

## MUST NOT DO

- Store JWT in localStorage (use httpOnly cookies for web)
- Skip refresh token rotation
- Use long access token lifetime (>1 hour)
- Use Token auth for production API (no expiry)
- Skip blacklisting on logout

---

## References

- [DRF: Authentication](https://www.django-rest-framework.org/api-guide/authentication/)
- [djangorestframework-simplejwt](https://django-rest-framework-simplejwt.readthedocs.io/)
