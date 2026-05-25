# Python Async Patterns Specialist
# Python非同期パターンスペシャリスト
# Chuyen Gia Async Python

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All Python files with async |
| **Variant** | ALL |
| **Naming Convention** | `async def` prefix, `await` calls |
| **Imports From** | asyncio, asgiref |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | async-vs-sync, sync-to-async, async-orm, async-views, task-groups, async-generators, async-context, asgi-servers |
| **Pattern Numbers** | 66.1–66.8 |
| **Source Paths** | `**/*.py` |
| **File Count** | N/A (applies to async code) |
| **Imported By** | ALL async specialists |
| **Specialist Type** | language |
| **Purpose** | Async vs sync decision in Django, sync_to_async/async_to_sync bridges, Django async ORM, async views, task groups, async generators for SSE, async context managers, ASGI server configuration |
| **Activation Trigger** | async, await, asyncio, sync_to_async, async views, ASGI, async ORM |

---

## Purpose

Define Python async patterns for Django: when to use sync vs async views, bridging sync Django ORM with async code via sync_to_async, Django 5.x async ORM methods, async views for I/O-bound work, task groups for concurrent operations, async generators for streaming, and ASGI server configuration.

---

## Pattern 66.1: Async vs Sync Decision in Django

```python
# DEFAULT: Use sync views (Django ORM is sync by default)
def article_list(request):
    articles = Article.objects.filter(status="published")  # Sync ORM — fine
    return render(request, "articles/list.html", {"articles": articles})

# USE ASYNC WHEN:
# 1. Calling external APIs
# 2. WebSocket consumers
# 3. SSE endpoints
# 4. Multiple independent I/O operations

async def external_api_view(request):
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
    return JsonResponse(response.json())
```

**Rule**: Use `def` for views that only use Django ORM. Use `async def` for views with external I/O.

---

## Pattern 66.2: sync_to_async / async_to_sync

```python
from asgiref.sync import sync_to_async, async_to_sync

# sync_to_async: Call sync code from async context
async def async_view(request):
    # Wrap ORM calls with sync_to_async
    articles = await sync_to_async(
        lambda: list(Article.objects.filter(status="published")[:10])
    )()
    return JsonResponse({"count": len(articles)})

# With thread_sensitive=True (default) — runs in main thread
get_user = sync_to_async(User.objects.get, thread_sensitive=True)
user = await get_user(pk=1)

# With thread_sensitive=False — runs in thread pool (faster for pure DB)
get_articles = sync_to_async(
    lambda: list(Article.objects.all()[:10]),
    thread_sensitive=False,
)

# async_to_sync: Call async code from sync context
from channels.layers import get_channel_layer

def notify_user(user_id, message):
    """Call from sync code (views, signals, Celery tasks)."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": "notification.send", "message": message},
    )
```

---

## Pattern 66.3: Django Async ORM (5.x)

```python
# Django 4.1+ introduced async ORM methods
# Maturing in Django 5.x — use for new async views

# Single object
article = await Article.objects.aget(pk=1)
article = await Article.objects.afirst()

# Create/Update/Delete
article = await Article.objects.acreate(title="Test", body="Content")
await Article.objects.filter(pk=1).aupdate(status="published")
await Article.objects.filter(pk=1).adelete()

# Iteration (async for)
async for article in Article.objects.filter(status="published"):
    print(article.title)

# Count and exists
count = await Article.objects.acount()
exists = await Article.objects.filter(slug="test").aexists()

# Aggregation
from django.db.models import Avg
avg = await Article.objects.aaggregate(avg_views=Avg("view_count"))
```

```python
# Full async view with async ORM
from django.http import JsonResponse


async def async_article_list(request):
    articles = []
    async for article in Article.objects.filter(status="published").order_by("-created_at")[:20]:
        articles.append({
            "id": article.id,
            "title": article.title,
        })
    return JsonResponse({"articles": articles})
```

---

## Pattern 66.4: Async Views

```python
# Async view with multiple concurrent I/O
import asyncio
import httpx


async def dashboard_view(request):
    """Fetch data from multiple sources concurrently."""
    async with httpx.AsyncClient() as client:
        weather_task = client.get("https://api.weather.com/current")
        news_task = client.get("https://api.news.com/top")

        weather_response, news_response = await asyncio.gather(
            weather_task, news_task,
            return_exceptions=True,
        )

    context = {
        "weather": weather_response.json() if not isinstance(weather_response, Exception) else None,
        "news": news_response.json() if not isinstance(news_response, Exception) else None,
    }
    return render(request, "dashboard.html", context)
```

---

## Pattern 66.5: Task Groups (3.11+)

```python
import asyncio


async def fetch_all_sources(request):
    """TaskGroup for structured concurrency."""
    results = {}

    async with asyncio.TaskGroup() as tg:
        async def fetch(name, url):
            async with httpx.AsyncClient() as client:
                resp = await client.get(url)
                results[name] = resp.json()

        tg.create_task(fetch("users", "https://api.example.com/users"))
        tg.create_task(fetch("products", "https://api.example.com/products"))
        tg.create_task(fetch("orders", "https://api.example.com/orders"))

    # All tasks completed here
    return JsonResponse(results)
```

---

## Pattern 66.6: Async Generators (SSE)

```python
from django.http import StreamingHttpResponse


async def sse_updates(request):
    async def event_stream():
        while True:
            # Async ORM query
            count = await Notification.objects.filter(
                user=request.user, read=False
            ).acount()

            yield f"data: {{\"unread\": {count}}}\n\n"
            await asyncio.sleep(5)

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    return response
```

---

## Pattern 66.7: Async Context Managers

```python
import httpx
from contextlib import asynccontextmanager


@asynccontextmanager
async def managed_http_client():
    """Reusable async HTTP client context."""
    client = httpx.AsyncClient(timeout=30.0)
    try:
        yield client
    finally:
        await client.aclose()


async def fetch_data(request):
    async with managed_http_client() as client:
        response = await client.get("https://api.example.com/data")
        return JsonResponse(response.json())
```

---

## Pattern 66.8: ASGI Server Configuration

```python
# config/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_asgi_application()
```

```bash
# Uvicorn (recommended for async Django)
uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --workers 4

# Daphne (for Django Channels)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Gunicorn with Uvicorn workers
gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker --workers 4
```

```python
# gunicorn_conf.py for ASGI
worker_class = "uvicorn.workers.UvicornWorker"
workers = 4
bind = "0.0.0.0:8000"
```

---

## MUST DO

- Use `def` for views that only use Django ORM (sync is fine)
- Use `async def` for views with external I/O (httpx, aiofiles)
- Use `sync_to_async` to wrap ORM calls in async views
- Use `asyncio.gather` or `TaskGroup` for concurrent I/O
- Use Uvicorn or Daphne for ASGI deployment

## MUST NOT DO

- Use `async def` for views that only do ORM queries (adds overhead)
- Call sync ORM methods directly in `async def` views (blocks event loop)
- Use `requests` library in async views (use `httpx`)
- Mix `time.sleep()` in async code (use `asyncio.sleep()`)
- Use `async_to_sync` inside async views (defeats the purpose)

---

## References

- [Django: Async support](https://docs.djangoproject.com/en/5.0/topics/async/)
- [asgiref](https://github.com/django/asgiref)
- [Uvicorn](https://www.uvicorn.org/)
