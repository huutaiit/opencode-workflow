# Django SSE Specialist
# Django SSEスペシャリスト
# Chuyen Gia SSE Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (real-time) |
| **Directory Pattern** | `apps/{domain}/views.py` |
| **Variant** | ALL |
| **Naming Convention** | Views with `_sse` suffix |
| **Imports From** | django.http, asyncio |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | native-sse, async-sse, eventstream, redis-pubsub-sse, sse-vs-websocket |
| **Pattern Numbers** | 25.8–25.12 |
| **Source Paths** | `**/views.py` |
| **File Count** | SSE views in existing view files |
| **Imported By** | — (URL routing) |
| **Specialist Type** | code |
| **Purpose** | Native SSE with StreamingHttpResponse, async SSE with Django async views, django-eventstream for managed SSE, Redis Pub/Sub backed SSE, SSE vs WebSocket decision guide |
| **Activation Trigger** | SSE, server-sent events, StreamingHttpResponse, eventstream, EventSource |

---

## Purpose

Define Server-Sent Events patterns in Django: native SSE using StreamingHttpResponse with generators, async SSE with Django 4.1+ async views, managed SSE via django-eventstream with auto-reconnect, Redis Pub/Sub for multi-process SSE, and a decision guide for choosing between SSE and WebSocket.

---

## Pattern 25.8: Native SSE (StreamingHttpResponse)

```python
# apps/notifications/views.py
import json
import time
from django.http import StreamingHttpResponse


def sse_notifications(request):
    """Basic SSE endpoint with sync generator."""

    def event_stream():
        while True:
            # Poll for new notifications (simple approach)
            notifications = get_pending_notifications(request.user)

            if notifications:
                for notification in notifications:
                    data = json.dumps({
                        "id": notification.id,
                        "title": notification.title,
                        "message": notification.message,
                    })
                    yield f"id: {notification.id}\nevent: notification\ndata: {data}\n\n"
                    notification.delivered = True
                    notification.save(update_fields=["delivered"])

            # Send keepalive comment every 15 seconds
            yield ": keepalive\n\n"
            time.sleep(15)

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"  # Disable nginx buffering
    return response
```

```javascript
// Client-side
const evtSource = new EventSource('/sse/notifications/');

evtSource.addEventListener('notification', (event) => {
    const data = JSON.parse(event.data);
    showNotification(data.title, data.message);
});

evtSource.onerror = () => {
    console.log('SSE connection lost, reconnecting...');
};
```

---

## Pattern 25.9: Async SSE (Django 4.1+)

```python
# apps/notifications/views.py
import json
import asyncio
from django.http import StreamingHttpResponse


async def async_sse_notifications(request):
    """Async SSE endpoint — non-blocking, efficient."""

    async def event_stream():
        last_id = 0
        while True:
            # Async ORM query (Django 4.1+)
            notifications = []
            async for n in Notification.objects.filter(
                user=request.user,
                id__gt=last_id,
                delivered=False,
            ).order_by("id")[:10]:
                notifications.append(n)

            for notification in notifications:
                data = json.dumps({
                    "id": notification.id,
                    "title": notification.title,
                    "type": notification.notification_type,
                })
                yield f"id: {notification.id}\nevent: notification\ndata: {data}\n\n"
                last_id = notification.id
                notification.delivered = True
                await notification.asave(update_fields=["delivered"])

            yield ": keepalive\n\n"
            await asyncio.sleep(5)

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
```

---

## Pattern 25.10: django-eventstream

```bash
pip install django-eventstream
```

```python
# settings.py
INSTALLED_APPS = [
    "django_eventstream",
    # ...
]

EVENTSTREAM_STORAGE_CLASS = "django_eventstream.storage.DjangoModelStorage"
```

```python
# urls.py
from django.urls import include, path
import django_eventstream

urlpatterns = [
    path(
        "events/<channel>/",
        include(django_eventstream.urls),
        {"channels": ["notifications"]},
    ),
]
```

```python
# Send events from anywhere
from django_eventstream import send_event

# Send to channel
send_event("notifications", "message", {
    "title": "New order",
    "body": "Order #123 received",
})

# Send to user-specific channel
send_event(f"user-{user.id}", "notification", {
    "type": "info",
    "message": "Your export is ready",
})
```

```javascript
// Client with auto-reconnect and Last-Event-ID
const evtSource = new EventSource('/events/notifications/');

evtSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
});
```

---

## Pattern 25.11: SSE with Redis Pub/Sub

```python
# apps/realtime/views.py
import json
import asyncio
import redis.asyncio as aioredis
from django.http import StreamingHttpResponse


async def redis_sse_view(request):
    """SSE backed by Redis Pub/Sub — works across multiple processes."""
    channel_name = f"user:{request.user.id}:notifications"

    async def event_stream():
        client = aioredis.Redis(host="localhost", port=6379)
        pubsub = client.pubsub()
        await pubsub.subscribe(channel_name)

        try:
            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=15.0,
                )
                if message and message["type"] == "message":
                    data = message["data"].decode()
                    yield f"data: {data}\n\n"
                else:
                    yield ": keepalive\n\n"
        finally:
            await pubsub.unsubscribe(channel_name)
            await client.aclose()

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
```

```python
# Publishing from anywhere (sync code)
import redis
import json


def publish_notification(user_id, data):
    """Publish notification to Redis for SSE delivery."""
    r = redis.Redis(host="localhost", port=6379)
    r.publish(
        f"user:{user_id}:notifications",
        json.dumps(data),
    )
```

---

## Pattern 25.12: SSE vs WebSocket Decision Guide

| Factor | SSE | WebSocket |
|--------|-----|-----------|
| **Direction** | Server → Client only | Bidirectional |
| **Protocol** | HTTP/1.1 (standard) | ws:// (upgrade) |
| **Auto-reconnect** | Built-in (EventSource) | Manual implementation |
| **Last-Event-ID** | Built-in resume | Manual implementation |
| **Proxy support** | Works through most proxies | May need proxy config |
| **Complexity** | Low (just HTTP) | Higher (handshake + framing) |
| **Binary data** | Text only (base64 encode) | Native binary support |
| **Scalability** | Holds connection open | Holds connection open |

**Use SSE when:**
- Server-to-client notifications (alerts, status updates, live feeds)
- Simple real-time updates without client-to-server messaging
- Need auto-reconnect and resume (Last-Event-ID)
- Working behind restrictive proxies

**Use WebSocket when:**
- Bidirectional communication (chat, gaming, collaboration)
- High-frequency data exchange
- Binary data streaming
- Client needs to send messages to server

---

## MUST DO

- Set `Cache-Control: no-cache` on SSE responses
- Set `X-Accel-Buffering: no` for nginx
- Send keepalive comments (`: keepalive\n\n`) every 15-30 seconds
- Support `Last-Event-ID` header for resume after disconnect
- Use Redis Pub/Sub for multi-process deployments

## MUST NOT DO

- Use SSE for bidirectional communication (use WebSocket)
- Forget `Cache-Control: no-cache` (browsers will cache the stream)
- Skip keepalive (proxies close idle connections)
- Use polling-based SSE generator without async (blocks threads)
- Send large payloads via SSE (send notification + fetch details via API)

---

## References

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [django-eventstream](https://github.com/fanout/django-eventstream)
- [Django: Async views](https://docs.djangoproject.com/en/5.0/topics/async/)
