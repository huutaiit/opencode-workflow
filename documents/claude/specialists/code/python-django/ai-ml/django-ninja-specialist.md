# Django Ninja Specialist
# Django Ninjaスペシャリスト
# Chuyen Gia Django Ninja

**Stack**: Python 3.12+ / Django 5.x / django-ninja 1.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `apps/{domain}/api.py`, `config/api.py` |
| **Variant** | ALL |
| **Naming Convention** | `api.py`, Schema in `schemas.py` |
| **Imports From** | ninja, Domain (models) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | ninja-setup, schema-io, path-operations, ninja-auth, async-views, file-upload, drf-vs-ninja |
| **Pattern Numbers** | 50.1–50.7 |
| **Source Paths** | `**/api.py`, `**/schemas.py` |
| **File Count** | 1 api.py + 1 schemas.py per app |
| **Imported By** | — (URL routing) |
| **Specialist Type** | code |
| **Purpose** | django-ninja setup, Pydantic Schema for I/O, path operations (CRUD), authentication, async views, file upload, DRF vs django-ninja decision guide |
| **Activation Trigger** | django-ninja, ninja, Schema, Router, async API, NinjaAPI |

---

## Purpose

Define django-ninja patterns: FastAPI-like API development in Django with Pydantic schemas for type-safe validation, routers for organization, built-in authentication, native async support, file upload handling, and a decision guide for choosing between DRF and django-ninja.

---

## Pattern 50.1: django-ninja Setup

```bash
pip install django-ninja
```

```python
# config/api.py
from ninja import NinjaAPI

api = NinjaAPI(
    title="My Project API",
    version="1.0.0",
    description="API documentation",
)

# Register routers from apps
from apps.articles.api import router as articles_router
from apps.users.api import router as users_router

api.add_router("/articles/", articles_router, tags=["Articles"])
api.add_router("/users/", users_router, tags=["Users"])
```

```python
# config/urls.py
from config.api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),  # Auto-generates OpenAPI docs at /api/docs
]
```

---

## Pattern 50.2: Schema (Input/Output)

```python
# apps/articles/schemas.py
from ninja import Schema, ModelSchema
from datetime import datetime
from apps.articles.models import Article


class ArticleIn(Schema):
    title: str
    body: str
    category_id: int
    tags: list[int] = []


class ArticleOut(Schema):
    id: int
    title: str
    slug: str
    body: str
    author_email: str
    category_name: str
    created_at: datetime


# ModelSchema — auto-generates from model
class ArticleModelOut(ModelSchema):
    class Meta:
        model = Article
        fields = ["id", "title", "slug", "body", "status", "created_at"]


class ArticleUpdate(Schema):
    title: str | None = None
    body: str | None = None
    category_id: int | None = None
```

---

## Pattern 50.3: Path Operations

```python
# apps/articles/api.py
from ninja import Router
from django.shortcuts import get_object_or_404
from apps.articles.models import Article
from apps.articles.schemas import ArticleIn, ArticleOut, ArticleUpdate

router = Router()


@router.get("/", response=list[ArticleOut])
def list_articles(request, status: str = "published", page: int = 1):
    qs = Article.objects.filter(status=status).select_related("author", "category")
    offset = (page - 1) * 20
    articles = qs[offset:offset + 20]
    return [
        ArticleOut(
            id=a.id, title=a.title, slug=a.slug, body=a.body,
            author_email=a.author.email, category_name=a.category.name,
            created_at=a.created_at,
        )
        for a in articles
    ]


@router.get("/{article_id}/", response=ArticleOut)
def get_article(request, article_id: int):
    article = get_object_or_404(Article.objects.select_related("author", "category"), pk=article_id)
    return ArticleOut(
        id=article.id, title=article.title, slug=article.slug, body=article.body,
        author_email=article.author.email, category_name=article.category.name,
        created_at=article.created_at,
    )


@router.post("/", response={201: ArticleOut})
def create_article(request, payload: ArticleIn):
    article = Article.objects.create(
        title=payload.title,
        body=payload.body,
        category_id=payload.category_id,
        author=request.user,
    )
    article.tags.set(payload.tags)
    return 201, get_article(request, article.id)


@router.patch("/{article_id}/", response=ArticleOut)
def update_article(request, article_id: int, payload: ArticleUpdate):
    article = get_object_or_404(Article, pk=article_id, author=request.user)
    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(article, attr, value)
    article.save()
    return get_article(request, article.id)


@router.delete("/{article_id}/", response={204: None})
def delete_article(request, article_id: int):
    article = get_object_or_404(Article, pk=article_id, author=request.user)
    article.delete()
    return 204, None
```

---

## Pattern 50.4: Authentication in Ninja

```python
# config/api.py
from ninja.security import HttpBearer, django_auth
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()


class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token["user_id"])
        except Exception:
            return None


# Global auth (all endpoints)
api = NinjaAPI(auth=JWTAuth())

# Or per-router
router = Router(auth=JWTAuth())

# Or per-endpoint
@router.get("/public/", auth=None)  # No auth required
def public_endpoint(request):
    return {"message": "public"}

@router.get("/private/", auth=JWTAuth())
def private_endpoint(request):
    return {"user": request.auth.email}

# Django session auth (for browser clients)
@router.get("/session/", auth=django_auth)
def session_endpoint(request):
    return {"user": request.user.email}
```

---

## Pattern 50.5: Async Views in Ninja

```python
import httpx
from ninja import Router

router = Router()


@router.get("/external-data/")
async def get_external_data(request):
    """Async endpoint — non-blocking external API call."""
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
    return response.json()


@router.get("/aggregation/")
async def get_aggregation(request):
    """Async with sync ORM via sync_to_async."""
    from asgiref.sync import sync_to_async

    count = await sync_to_async(
        Article.objects.filter(status="published").count
    )()
    return {"published_count": count}
```

---

## Pattern 50.6: File Upload in Ninja

```python
from ninja import Router, File, UploadedFile

router = Router()


@router.post("/upload/")
def upload_file(request, file: UploadedFile = File(...)):
    """Single file upload."""
    # Validate
    if file.size > 10 * 1024 * 1024:
        return {"error": "File too large (max 10MB)"}

    # Save
    from django.core.files.storage import default_storage
    path = default_storage.save(f"uploads/{file.name}", file)

    return {"path": path, "size": file.size, "content_type": file.content_type}


@router.post("/upload-multiple/")
def upload_multiple(request, files: list[UploadedFile] = File(...)):
    """Multiple file upload."""
    results = []
    for f in files:
        path = default_storage.save(f"uploads/{f.name}", f)
        results.append({"name": f.name, "path": path, "size": f.size})
    return results
```

---

## Pattern 50.7: DRF vs django-ninja Decision Guide

| Feature | DRF | django-ninja |
|---------|-----|-------------|
| **Maturity** | 10+ years, massive ecosystem | Newer, growing |
| **Browsable API** | Built-in | No |
| **Type safety** | Runtime validation | Pydantic (static + runtime) |
| **Async support** | Limited | Native |
| **Performance** | Good | Faster (less overhead) |
| **Admin integration** | Deep (import-export, filters) | Minimal |
| **ViewSets + Routers** | Built-in | Manual |
| **Serializers** | Powerful, complex | Pydantic Schema (simpler) |
| **Authentication** | Extensive (JWT, OAuth, etc.) | Basic (extensible) |
| **OpenAPI docs** | drf-spectacular | Built-in |

**Choose DRF when:** Browsable API needed, deep admin integration, existing DRF ecosystem, team familiarity.

**Choose django-ninja when:** FastAPI-like DX preferred, async-first, Pydantic-based validation, performance critical, new project.

---

## MUST DO

- Use Schema for input validation (never trust raw request data)
- Use Router for organizing endpoints by domain
- Use async for external API calls and I/O-bound work
- Add proper authentication (JWTAuth or django_auth)
- Auto-generated OpenAPI docs at `/api/docs`

## MUST NOT DO

- Mix DRF serializers and ninja Schemas in the same app
- Skip input validation (Schema validates automatically)
- Use sync views for external API calls
- Expose all model fields in Schema (explicit field lists)
- Return QuerySets directly (serialize to Schema)

---

## References

- [django-ninja](https://django-ninja.dev/)
- [django-ninja: Tutorial](https://django-ninja.dev/tutorial/)
- [django-ninja: Authentication](https://django-ninja.dev/guides/authentication/)
