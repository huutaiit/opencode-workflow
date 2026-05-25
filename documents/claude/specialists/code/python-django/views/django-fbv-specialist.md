# Django Function-Based Views Specialist
# Django関数ベースビュースペシャリスト
# Chuyen Gia FBV Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `apps/{domain}/views.py` |
| **Variant** | ALL |
| **Naming Convention** | `snake_case`: `article_list`, `article_create` |
| **Imports From** | Domain (models), Application (forms) |
| **Cannot Import** | Data Access directly |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | basic-fbv, view-decorators, json-response, async-views, decision-guide |
| **Pattern Numbers** | 4.1–4.5 |
| **Source Paths** | `**/views.py` |
| **File Count** | 1 per app |
| **Imported By** | URL routing |
| **Specialist Type** | code |
| **Purpose** | Function views, decorators, HttpResponse, JsonResponse, async views, FBV vs CBV decision |
| **Activation Trigger** | def view, @login_required, HttpResponse, JsonResponse, async def view |

---

## Purpose

Define Django FBV patterns: basic request handling, view decorators for auth and HTTP methods, JsonResponse for API endpoints without DRF, async views for external API calls, and decision guide for FBV vs CBV.

---

## Pattern 4.1: Basic FBV Pattern

```python
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from apps.articles.models import Article
from apps.articles.forms import ArticleForm


def article_list(request):
    articles = Article.objects.filter(status="published").select_related("author")
    return render(request, "articles/list.html", {"articles": articles})


def article_detail(request, slug):
    article = get_object_or_404(Article, slug=slug, status="published")
    return render(request, "articles/detail.html", {"article": article})


def article_create(request):
    if request.method == "POST":
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save(commit=False)
            article.author = request.user
            article.save()
            return redirect("articles:detail", slug=article.slug)
    else:
        form = ArticleForm()
    return render(request, "articles/form.html", {"form": form})
```

---

## Pattern 4.2: View Decorators

```python
from django.contrib.auth.decorators import login_required, permission_required
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.cache import cache_page


@login_required
@require_http_methods(["GET", "POST"])
def article_create(request):
    ...


@permission_required("articles.can_publish", raise_exception=True)
def article_publish(request, pk):
    ...


@cache_page(60 * 15)  # Cache for 15 minutes
def article_list(request):
    ...


# Stack decorators: bottom → top execution order
@login_required           # Runs 1st (outermost)
@permission_required("articles.add_article")  # Runs 2nd
@require_POST             # Runs 3rd (innermost)
def article_quick_create(request):
    ...
```

---

## Pattern 4.3: JsonResponse (API without DRF)

```python
from django.http import JsonResponse
import json


def api_articles(request):
    """Simple JSON API endpoint without DRF."""
    articles = Article.objects.filter(status="published").values(
        "id", "title", "slug", "created_at"
    )
    return JsonResponse({"articles": list(articles)})


def api_article_create(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Validate and create
    article = Article.objects.create(
        title=data["title"],
        body=data["body"],
        author=request.user,
    )
    return JsonResponse({"id": article.id, "slug": article.slug}, status=201)
```

---

## Pattern 4.4: Async Views (Django 4.1+)

```python
import httpx
from django.http import JsonResponse


async def proxy_api(request):
    """Async view — efficient for external API calls."""
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
    return JsonResponse(response.json())


# ORM in async view — use sync_to_async
from asgiref.sync import sync_to_async

async def async_article_list(request):
    articles = await sync_to_async(
        lambda: list(Article.objects.filter(status="published")[:20])
    )()
    return JsonResponse({"count": len(articles)})
```

---

## Pattern 4.5: FBV vs CBV Decision

| Scenario | Use | Why |
|----------|-----|-----|
| Standard CRUD | CBV | Built-in, less code |
| Simple one-off | FBV | More explicit, readable |
| Complex multi-step form | FBV | Easier flow control |
| API endpoint (no DRF) | FBV | JsonResponse + decorators |
| Webhook handler | FBV | Non-standard flow |
| Dashboard with multiple queries | FBV | Complex context building |

---

## MUST DO

- Use `get_object_or_404` (never manual try/except for 404)
- Use decorators for auth and HTTP method enforcement
- Use `render()` shortcut (not `HttpResponse` + loader)
- Use async views for external API calls
- Redirect after successful POST (PRG pattern)

## MUST NOT DO

- Put business logic in views (delegate to models/services)
- Use FBV for standard CRUD (use CBV)
- Use huge if/elif chains for methods (use `require_http_methods`)
- Call sync ORM directly in async views (use `sync_to_async`)
- Return 200 for errors (use proper status codes)

---

## References

- [Django: Views](https://docs.djangoproject.com/en/5.0/topics/http/views/)
- [Django: View Decorators](https://docs.djangoproject.com/en/5.0/topics/http/decorators/)
- [Django: Async Views](https://docs.djangoproject.com/en/5.0/topics/async/)
