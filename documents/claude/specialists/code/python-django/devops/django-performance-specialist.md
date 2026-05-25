# Django Performance Specialist
# Djangoパフォーマンススペシャリスト
# Chuyen Gia Hieu Suat Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `apps/{domain}/views.py`, `config/settings/` |
| **Variant** | ALL |
| **Naming Convention** | — |
| **Imports From** | django.db.models, django-debug-toolbar |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | n-plus-one-detection, select-prefetch-related, db-indexes, queryset-optimization, connection-pooling, caching-strategy, async-performance |
| **Pattern Numbers** | 47.1–47.7 |
| **Source Paths** | `**/views.py`, `**/models.py`, `settings.py` |
| **File Count** | Across existing files |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | N+1 query detection, select_related/prefetch_related, database indexes, QuerySet optimization (.only, .defer, .values), connection pooling, caching strategy overview, async Django performance |
| **Activation Trigger** | performance, slow, N+1, select_related, debug toolbar, optimize, query |

---

## Purpose

Define Django performance optimization patterns: detecting and fixing N+1 queries, select_related and prefetch_related for query reduction, database index optimization, QuerySet field selection, connection pooling, caching strategy decision tree, and async Django patterns for I/O-bound workloads.

---

## Pattern 47.1: N+1 Query Detection

```bash
pip install django-debug-toolbar nplusone
```

```python
# settings/development.py
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
INTERNAL_IPS = ["127.0.0.1"]

# nplusone — raises exception on N+1 in development
INSTALLED_APPS += ["nplusone.ext.django"]
MIDDLEWARE += ["nplusone.ext.django.NPlusOneMiddleware"]
NPLUSONE_RAISE = True  # Raise exception (strict mode)
# NPLUSONE_RAISE = False  # Log warning instead
NPLUSONE_LOGGER = logging.getLogger("nplusone")
```

```python
# urls.py
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
```

---

## Pattern 47.2: select_related / prefetch_related

```python
# BEFORE: N+1 — 1 query for articles + N queries for author
articles = Article.objects.all()
for article in articles:
    print(article.author.email)  # Each access = 1 query

# AFTER: select_related (ForeignKey, OneToOne) — 1 JOIN query
articles = Article.objects.select_related("author", "category").all()
for article in articles:
    print(article.author.email)  # No extra query

# prefetch_related (ManyToMany, reverse FK) — 2 queries total
articles = Article.objects.prefetch_related("tags", "comments").all()
for article in articles:
    print(article.tags.all())    # No extra query
    print(article.comments.all())  # No extra query
```

```python
# Nested prefetch with Prefetch object
from django.db.models import Prefetch

articles = Article.objects.prefetch_related(
    Prefetch(
        "comments",
        queryset=Comment.objects.select_related("author").filter(is_approved=True),
        to_attr="approved_comments",
    ),
).select_related("author", "category")

# ViewSet optimization
class ArticleViewSet(ModelViewSet):
    def get_queryset(self):
        return Article.objects.select_related(
            "author", "category"
        ).prefetch_related(
            "tags",
            Prefetch("comments", queryset=Comment.objects.select_related("author")),
        )
```

**Rule**: `select_related` for ForeignKey/OneToOne (SQL JOIN). `prefetch_related` for ManyToMany/reverse FK (separate query).

---

## Pattern 47.3: Database Indexes

```python
# models.py — Single field index
class Article(models.Model):
    title = models.CharField(max_length=200, db_index=True)
    status = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    slug = models.SlugField(unique=True)  # unique=True creates index

    class Meta:
        indexes = [
            # Composite index for common queries
            models.Index(fields=["status", "-created_at"], name="idx_status_created"),
            # Partial index (PostgreSQL)
            models.Index(
                fields=["created_at"],
                condition=models.Q(status="published"),
                name="idx_published_date",
            ),
        ]
```

```sql
-- Check query plan in PostgreSQL
EXPLAIN ANALYZE SELECT * FROM articles WHERE status = 'published' ORDER BY created_at DESC LIMIT 20;
```

```python
# Django shell — check query
from django.db import connection

qs = Article.objects.filter(status="published").order_by("-created_at")[:20]
print(qs.query)  # See SQL
print(connection.queries[-1])  # See execution time
```

**Rule**: Add indexes on fields used in `filter()`, `order_by()`, `exclude()`. Use `EXPLAIN ANALYZE` to verify.

---

## Pattern 47.4: QuerySet Optimization

```python
# .only() — load specific fields only
articles = Article.objects.only("id", "title", "slug", "created_at")

# .defer() — load all EXCEPT specified fields
articles = Article.objects.defer("body", "metadata")

# .values() — returns dictionaries (no model instantiation)
articles = Article.objects.values("id", "title", "created_at")

# .values_list() — returns tuples
titles = Article.objects.values_list("title", flat=True)

# .count() instead of len()
count = Article.objects.filter(status="published").count()  # SELECT COUNT(*)
# NOT: len(Article.objects.filter(status="published"))  # Loads all objects

# .exists() instead of count > 0
if Article.objects.filter(slug="test").exists():  # SELECT 1 LIMIT 1
    pass
# NOT: if Article.objects.filter(slug="test").count() > 0:

# .iterator() for large datasets (no cache)
for article in Article.objects.iterator(chunk_size=1000):
    process(article)

# .bulk_create() and .bulk_update()
articles = [Article(title=f"Article {i}") for i in range(1000)]
Article.objects.bulk_create(articles, batch_size=100)

Article.objects.bulk_update(articles, ["status"], batch_size=100)
```

---

## Pattern 47.5: Connection Pooling

```python
# Option A: CONN_MAX_AGE (built-in, simple)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "myproject",
        "CONN_MAX_AGE": 600,  # Keep connections alive for 10 minutes
        # "CONN_MAX_AGE": None,  # Keep alive forever (for gunicorn --preload)
    },
}
```

```python
# Option B: PgBouncer (external pooler, recommended for high traffic)
# pgbouncer.ini
# [databases]
# myproject = host=db-host port=5432 dbname=myproject

# Django connects to PgBouncer instead of directly to PostgreSQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": "pgbouncer-host",
        "PORT": 6432,  # PgBouncer port
        "NAME": "myproject",
        "CONN_MAX_AGE": 0,  # Let PgBouncer manage pooling
    },
}
```

---

## Pattern 47.6: Caching Strategy Decision Tree

```
1. Full-page cache (anonymous users only)
   → Use cache middleware or @cache_page
   → Best for: marketing pages, blog, public API lists

2. Per-view cache (authenticated, vary by user)
   → @cache_page + @vary_on_headers("Authorization")
   → Best for: dashboards, user-specific lists

3. Template fragment cache
   → {% cache 600 sidebar request.user.id %}
   → Best for: expensive template partials (sidebar, footer)

4. Low-level cache (fine-grained control)
   → cache.get_or_set("key", callable, timeout)
   → Best for: aggregations, expensive computations, external API results

5. QuerySet cache (django-cacheops or manual)
   → Cache serialized query results
   → Best for: frequently queried, rarely changed data
```

See [django-caching-specialist.md](../data/django-caching-specialist.md) for detailed patterns.

---

## Pattern 47.7: Async Django Performance

```python
# Async view for I/O-bound work (external API calls)
import httpx
from django.http import JsonResponse


async def external_api_view(request):
    """Async view — non-blocking I/O."""
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
    return JsonResponse(response.json())


# Mixed: async view with sync ORM (use sync_to_async)
from asgiref.sync import sync_to_async


async def mixed_view(request):
    # ORM is still sync (wrap with sync_to_async)
    articles = await sync_to_async(
        lambda: list(Article.objects.filter(status="published")[:10])
    )()
    return JsonResponse({"count": len(articles)})
```

```python
# Gunicorn with Uvicorn workers for ASGI
# gunicorn_conf.py
worker_class = "uvicorn.workers.UvicornWorker"
workers = 4
```

**When to use async:**
- External API calls (httpx, aiohttp)
- WebSocket consumers (Django Channels)
- SSE endpoints
- File I/O with aiofiles

**When NOT to use async:**
- CPU-bound work (use Celery)
- Django ORM queries (still sync in Django 5.x, async ORM maturing)

---

## MUST DO

- Use django-debug-toolbar in development (check SQL panel)
- Add `select_related`/`prefetch_related` for all QuerySets with related access
- Add `db_index` on fields used in `filter()` and `order_by()`
- Use `.count()`, `.exists()`, `.only()` for targeted queries
- Profile with `EXPLAIN ANALYZE` before optimizing

## MUST NOT DO

- Optimize without measuring first (premature optimization)
- Skip indexes on frequently filtered fields
- Load all model fields when only needing 2-3 (use `.only()`)
- Use `len(queryset)` instead of `.count()`
- Use `if queryset.count() > 0` instead of `.exists()`

---

## References

- [Django: Database optimization](https://docs.djangoproject.com/en/5.0/topics/db/optimization/)
- [django-debug-toolbar](https://django-debug-toolbar.readthedocs.io/)
- [nplusone](https://github.com/jmcarp/nplusone)
- [Django: Async support](https://docs.djangoproject.com/en/5.0/topics/async/)
