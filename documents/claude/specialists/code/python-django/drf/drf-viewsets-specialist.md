# DRF ViewSets & Routers Specialist
# DRF ViewSets・ルータースペシャリスト
# Chuyen Gia ViewSets va Routers DRF

**Stack**: Python 3.12+ / Django 5.x / DRF 3.15+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `apps/{domain}/views.py`, `apps/{domain}/urls.py` |
| **Variant** | ALL |
| **Naming Convention** | `PascalCase` + `ViewSet` suffix |
| **Imports From** | Domain (models), Serializers |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-viewset, router-registration, custom-action, multiple-serializers, generic-apiview, apiview, nested-routers |
| **Pattern Numbers** | 6.1–6.7 |
| **Source Paths** | `**/views.py`, `**/urls.py` |
| **File Count** | 1 per app |
| **Imported By** | URL routing |
| **Specialist Type** | code |
| **Purpose** | ModelViewSet, DefaultRouter, @action custom endpoints, multiple serializer classes, GenericAPIView + mixins, APIView, nested routers |
| **Activation Trigger** | ViewSet, ModelViewSet, Router, @action, APIView, DRF views |

---

## Purpose

Define DRF ViewSet and Router patterns: ModelViewSet for full CRUD, Router registration, custom actions, action-based serializer selection, GenericAPIView with selective mixins, raw APIView for custom endpoints, and nested routers for hierarchical resources.

---

## Pattern 6.1: ModelViewSet (Full CRUD)

```python
from rest_framework import viewsets, permissions
from apps.articles.models import Article
from apps.articles.serializers import ArticleReadSerializer, ArticleCreateSerializer


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.select_related("author", "category")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ArticleCreateSerializer
        return ArticleReadSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
```

---

## Pattern 6.2: Router Registration

```python
from rest_framework.routers import DefaultRouter
from apps.articles.views import ArticleViewSet

router = DefaultRouter()
router.register("articles", ArticleViewSet, basename="articles")

# urls.py
urlpatterns = [
    path("api/v1/", include(router.urls)),
]
# Auto-generates: list, create, retrieve, update, partial_update, destroy
```

---

## Pattern 6.3: @action (Custom Endpoints)

```python
from rest_framework.decorators import action
from rest_framework.response import Response


class ArticleViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def publish(self, request, pk=None):
        """POST /api/v1/articles/{pk}/publish/"""
        article = self.get_object()
        article.status = "published"
        article.save(update_fields=["status"])
        return Response({"status": "published"})

    @action(detail=False, methods=["get"])
    def recent(self, request):
        """GET /api/v1/articles/recent/"""
        recent = self.queryset.filter(status="published").order_by("-created_at")[:10]
        serializer = self.get_serializer(recent, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """POST /api/v1/articles/bulk-delete/"""
        ids = request.data.get("ids", [])
        deleted = Article.objects.filter(id__in=ids, author=request.user).delete()
        return Response({"deleted": deleted[0]})
```

---

## Pattern 6.4: Multiple Serializer Classes

```python
class ArticleViewSet(viewsets.ModelViewSet):
    serializer_classes = {
        "list": ArticleListSerializer,
        "retrieve": ArticleDetailSerializer,
        "create": ArticleCreateSerializer,
        "update": ArticleUpdateSerializer,
        "publish": ArticlePublishSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_classes.get(self.action, ArticleReadSerializer)
```

---

## Pattern 6.5: GenericAPIView + Mixins

```python
from rest_framework import generics, mixins


# Read-only (list + retrieve)
class ArticleListView(generics.ListCreateAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer


class ArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    lookup_field = "slug"
```

---

## Pattern 6.6: APIView (Fully Custom)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        stats = {
            "total_users": User.objects.count(),
            "total_articles": Article.objects.count(),
            "recent_orders": Order.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count(),
        }
        return Response(stats, status=status.HTTP_200_OK)
```

---

## Pattern 6.7: Nested Routers

```python
# pip install drf-nested-routers
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register("courses", CourseViewSet)

# /courses/{course_pk}/lessons/
courses_router = routers.NestedDefaultRouter(router, "courses", lookup="course")
courses_router.register("lessons", LessonViewSet, basename="course-lessons")

urlpatterns = router.urls + courses_router.urls
```

---

## MUST DO

- Use Router for standard CRUD ViewSets
- Use `get_serializer_class` for action-based serializer selection
- Use `@action` for custom endpoints (not separate APIView)
- Use `perform_create` to set request.user
- Use `select_related`/`prefetch_related` in queryset

## MUST NOT DO

- Put business logic in ViewSets (delegate to services/models)
- Skip `permission_classes` on ViewSets
- Use raw `APIView` for standard CRUD (use ModelViewSet)
- Forget `basename` when queryset is overridden
- Use `get` queryset without `select_related` (N+1)

---

## References

- [DRF: ViewSets](https://www.django-rest-framework.org/api-guide/viewsets/)
- [DRF: Routers](https://www.django-rest-framework.org/api-guide/routers/)
- [drf-nested-routers](https://github.com/alanjds/drf-nested-routers)
