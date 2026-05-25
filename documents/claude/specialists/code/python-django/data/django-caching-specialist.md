# Django Caching Specialist
# Djangoキャッシュスペシャリスト
# Chuyen Gia Cache Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `config/settings/`, `apps/{domain}/views.py` |
| **Variant** | ALL |
| **Naming Convention** | Cache keys: `{app}:{model}:{id}` or `{app}:{view}:{params}` |
| **Imports From** | django.core.cache |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | cache-backend, per-view-cache, low-level-api, template-fragment, invalidation, cache-middleware, session-backend |
| **Pattern Numbers** | 20.1–20.7 |
| **Source Paths** | `**/settings.py`, `**/views.py` |
| **File Count** | Settings + per-view usage |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | Cache backend configuration (Redis, Memcached), per-view cache, low-level cache API, template fragment cache, cache invalidation strategies, full-page cache middleware, Redis session backend |
| **Activation Trigger** | cache, redis, memcached, @cache_page, cache.get, cache.set, CACHES |

---

## Purpose

Define Django caching patterns: Redis/Memcached backend configuration, per-view cache with decorators, low-level cache API for fine-grained control, template fragment caching, signal-based and version-based cache invalidation, full-page cache middleware, and Redis-backed session storage.

---

## Pattern 20.1: Cache Backend Configuration

```python
# settings.py — Redis (recommended for production)
# pip install django-redis
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://localhost:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SERIALIZER": "django_redis.serializers.json.JSONSerializer",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
            "RETRY_ON_TIMEOUT": True,
        },
        "KEY_PREFIX": "myapp",
        "TIMEOUT": 300,  # 5 minutes default
    },
}
```

```python
# Multiple cache backends
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://localhost:6379/1",
        "KEY_PREFIX": "myapp",
        "TIMEOUT": 300,
    },
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://localhost:6379/2",
        "KEY_PREFIX": "sessions",
        "TIMEOUT": 86400,  # 24 hours
    },
    "pages": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://localhost:6379/3",
        "KEY_PREFIX": "pages",
        "TIMEOUT": 900,  # 15 minutes
    },
}
```

---

## Pattern 20.2: Per-View Cache

```python
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers, vary_on_cookie


# Cache for 15 minutes
@cache_page(60 * 15)
def article_list(request):
    articles = Article.objects.filter(status="published")
    return render(request, "articles/list.html", {"articles": articles})


# Vary by Authorization header (different cache per user)
@cache_page(60 * 15)
@vary_on_headers("Authorization")
def user_dashboard(request):
    return render(request, "dashboard.html")


# Vary by cookie (different cache per session)
@cache_page(60 * 5)
@vary_on_cookie
def personalized_feed(request):
    return render(request, "feed.html")
```

```python
# CBV cache — in urls.py
from django.views.decorators.cache import cache_page

urlpatterns = [
    path("articles/", cache_page(60 * 15)(ArticleListView.as_view()), name="article-list"),
]
```

---

## Pattern 20.3: Low-Level Cache API

```python
from django.core.cache import cache


def get_article_stats(article_id):
    """Cache expensive aggregation query."""
    cache_key = f"article:{article_id}:stats"
    stats = cache.get(cache_key)

    if stats is None:
        stats = {
            "views": ArticleView.objects.filter(article_id=article_id).count(),
            "comments": Comment.objects.filter(article_id=article_id).count(),
            "likes": Like.objects.filter(article_id=article_id).count(),
        }
        cache.set(cache_key, stats, timeout=600)  # 10 minutes

    return stats


# get_or_set — atomic get-or-compute
def get_categories():
    return cache.get_or_set(
        "categories:all",
        lambda: list(Category.objects.values("id", "name", "slug")),
        timeout=3600,  # 1 hour
    )


# Increment/decrement (atomic with Redis)
def increment_view_count(article_id):
    cache_key = f"article:{article_id}:view_count"
    try:
        cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=86400)


# Delete multiple keys
def clear_article_cache(article_id):
    cache.delete_many([
        f"article:{article_id}:stats",
        f"article:{article_id}:view_count",
        f"article:{article_id}:detail",
    ])
```

---

## Pattern 20.4: Template Fragment Cache

```html
{% load cache %}

<!-- Cache sidebar for 10 minutes -->
{% cache 600 sidebar %}
<div class="sidebar">
    <h3>Popular Articles</h3>
    {% for article in popular_articles %}
        <a href="{{ article.get_absolute_url }}">{{ article.title }}</a>
    {% endfor %}
</div>
{% endcache %}

<!-- Cache per user (vary by user ID) -->
{% cache 300 user_profile request.user.id %}
<div class="profile-card">
    <img src="{{ request.user.profile.avatar.url }}" alt="Avatar">
    <h4>{{ request.user.get_full_name }}</h4>
</div>
{% endcache %}

<!-- Cache with version (for manual invalidation) -->
{% cache 3600 footer CACHE_VERSION %}
<footer>
    <p>{{ site_settings.footer_text }}</p>
</footer>
{% endcache %}
```

---

## Pattern 20.5: Cache Invalidation Strategies

```python
# Signal-based invalidation — clear cache when model changes
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache


@receiver([post_save, post_delete], sender=Article)
def invalidate_article_cache(sender, instance, **kwargs):
    """Clear article caches on save/delete."""
    cache.delete(f"article:{instance.pk}:stats")
    cache.delete(f"article:{instance.pk}:detail")
    cache.delete("articles:list:page_1")
    # Clear category article counts
    if instance.category_id:
        cache.delete(f"category:{instance.category_id}:articles")
```

```python
# Version-based invalidation — bump version to clear all
from django.core.cache import cache


class CacheVersion:
    """Version-based cache invalidation."""

    @staticmethod
    def get(namespace):
        version = cache.get(f"version:{namespace}")
        if version is None:
            version = 1
            cache.set(f"version:{namespace}", version, timeout=None)
        return version

    @staticmethod
    def bump(namespace):
        """Invalidate all keys in namespace by bumping version."""
        try:
            cache.incr(f"version:{namespace}")
        except ValueError:
            cache.set(f"version:{namespace}", 1, timeout=None)


# Usage
def get_articles_list(page):
    version = CacheVersion.get("articles")
    cache_key = f"articles:v{version}:list:page_{page}"
    return cache.get_or_set(
        cache_key,
        lambda: list(Article.objects.filter(status="published")[:20]),
        timeout=900,
    )

# Invalidate all article list caches
CacheVersion.bump("articles")
```

---

## Pattern 20.6: Cache Middleware (Full Page)

```python
# settings.py — Full-page cache
MIDDLEWARE = [
    "django.middleware.cache.UpdateCacheMiddleware",      # Must be first
    "django.middleware.security.SecurityMiddleware",
    # ... other middleware ...
    "django.middleware.cache.FetchFromCacheMiddleware",   # Must be last
]

CACHE_MIDDLEWARE_ALIAS = "pages"
CACHE_MIDDLEWARE_SECONDS = 600  # 10 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = "fullpage"
```

**Note**: Full-page cache is aggressive — skip for pages with user-specific content. Use per-view `@cache_page` for selective caching.

---

## Pattern 20.7: Session Backend (Redis)

```python
# settings.py
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days
SESSION_SAVE_EVERY_REQUEST = False
```

---

## MUST DO

- Use django-redis for production caching
- Use `vary_on_headers("Authorization")` for auth-dependent views
- Invalidate cache on model writes (signals or explicit)
- Use structured cache keys: `{app}:{model}:{id}:{field}`
- Set explicit `timeout` on every `cache.set()` call

## MUST NOT DO

- Cache user-specific data without vary (serves wrong user's data)
- Use infinite timeout without invalidation strategy
- Skip cache invalidation on write operations
- Use full-page cache middleware on pages with user-specific content
- Cache database querysets directly (cache serialized data instead)

---

## References

- [Django: Cache framework](https://docs.djangoproject.com/en/5.0/topics/cache/)
- [django-redis](https://github.com/jazzband/django-redis)
