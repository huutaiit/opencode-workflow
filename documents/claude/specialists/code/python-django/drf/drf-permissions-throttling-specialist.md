# DRF Permissions & Throttling Specialist
# DRFパーミッション・スロットリングスペシャリスト
# Chuyen Gia Phan Quyen va Throttling DRF

**Stack**: Python 3.12+ / Django 5.x / DRF 3.15+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `apps/{domain}/permissions.py` |
| **Variant** | ALL |
| **Naming Convention** | `permissions.py`, `Is*` prefix for permission classes |
| **Imports From** | Domain (models) |
| **Cannot Import** | Views |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | builtin-permissions, custom-permissions, object-permissions, throttling, per-view-override, django-guardian |
| **Pattern Numbers** | 7.7–7.12 |
| **Source Paths** | `**/permissions.py` |
| **File Count** | 1 per app |
| **Imported By** | ViewSets, Views |
| **Specialist Type** | code |
| **Purpose** | Built-in permission classes, custom permissions, object-level, throttling rates, per-view override, django-guardian |
| **Activation Trigger** | permission, IsAuthenticated, throttle, rate limit, object permission |

---

## Purpose

Define DRF permission and throttling patterns: built-in classes, custom permission with has_permission/has_object_permission, object-level ownership checks, throttle rates and scoping, per-view override, and django-guardian integration.

---

## Pattern 7.7: Built-in Permissions

```python
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",  # Global default
    ],
}

# Per-view: AllowAny, IsAuthenticated, IsAdminUser, IsAuthenticatedOrReadOnly
class PublicArticleViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
```

---

## Pattern 7.8: Custom Permissions

```python
from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Object-level: only owner can modify."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user


class IsSubscribed(BasePermission):
    """View-level: only subscribed users can access."""
    def has_permission(self, request, view):
        return hasattr(request.user, "subscription") and request.user.subscription.is_active
```

---

## Pattern 7.9: Object-Level Permissions

```python
class ArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        # List: show all published + own drafts
        if self.action == "list":
            return Article.objects.filter(
                models.Q(status="published") | models.Q(author=self.request.user)
            )
        return Article.objects.all()

    # DRF auto-calls check_object_permissions() in retrieve/update/delete
```

---

## Pattern 7.10: Throttling

```python
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "login": "5/minute",
    },
}


# Scoped throttle for specific endpoints
from rest_framework.throttling import ScopedRateThrottle

class LoginView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"  # Uses "login": "5/minute"
```

---

## Pattern 7.11: Per-View Override

```python
class AdminArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    throttle_classes = []  # No throttle for admins

    @action(detail=True, methods=["post"],
            permission_classes=[permissions.IsAuthenticated, IsOwner])
    def publish(self, request, pk=None):
        ...
```

---

## Pattern 7.12: django-guardian (Object-Level)

```python
# pip install django-guardian
# settings.py
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "guardian.backends.ObjectPermissionBackend",
]

# Assign object permission
from guardian.shortcuts import assign_perm, get_objects_for_user

assign_perm("change_article", user, article)

# Check
user.has_perm("change_article", article)  # True for this specific article

# QuerySet filtered by object permissions
articles = get_objects_for_user(user, "articles.change_article")
```

---

## MUST DO

- Set `DEFAULT_PERMISSION_CLASSES` in settings (never AllowAny)
- Use `has_object_permission` for ownership checks
- Set throttle rates for anonymous and authenticated users
- Use `ScopedRateThrottle` for login/sensitive endpoints
- Use django-guardian for fine-grained object permissions

## MUST NOT DO

- Use `AllowAny` as default permission
- Skip object-level checks on detail/update/delete views
- Allow unlimited API calls (always throttle)
- Hardcode user checks (use permission framework)
- Skip throttle on login endpoint (brute force risk)

---

## References

- [DRF: Permissions](https://www.django-rest-framework.org/api-guide/permissions/)
- [DRF: Throttling](https://www.django-rest-framework.org/api-guide/throttling/)
- [django-guardian](https://django-guardian.readthedocs.io/)
