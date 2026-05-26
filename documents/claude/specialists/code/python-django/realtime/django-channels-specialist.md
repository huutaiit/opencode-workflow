# Django Channels Specialist
# Django Channelsスペシャリスト
# Chuyen Gia Django Channels

**Stack**: Python 3.12+ / Django 5.x / Channels 4.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (real-time) |
| **Directory Pattern** | `config/asgi.py`, `apps/{domain}/consumers.py`, `apps/{domain}/routing.py` |
| **Variant** | ALL |
| **Naming Convention** | `consumers.py`, `routing.py`, `PascalCase` + `Consumer` suffix |
| **Imports From** | channels, Domain (models) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | channels-setup, websocket-consumer, channel-layer, routing, ws-auth, groups, testing |
| **Pattern Numbers** | 25.1–25.7 |
| **Source Paths** | `**/consumers.py`, `**/routing.py`, `config/asgi.py` |
| **File Count** | 1 consumer + 1 routing per app |
| **Imported By** | — (ASGI routing) |
| **Specialist Type** | code |
| **Purpose** | Django Channels setup, WebSocket consumers (sync/async), Redis channel layer, URL routing, WebSocket authentication, channel groups for broadcast, testing consumers |
| **Activation Trigger** | channels, websocket, consumer, channel layer, ASGI, real-time, WebSocket |

---

## Purpose

Define Django Channels patterns: ASGI application setup, WebSocket consumers for bidirectional communication, Redis channel layer for multi-process messaging, URL routing with protocol type detection, WebSocket authentication via middleware, channel groups for room-based broadcast, and async test patterns for consumers.

---

## Pattern 25.1: Django Channels Setup

```bash
pip install channels channels-redis
```

```python
# settings.py
INSTALLED_APPS = [
    "daphne",  # ASGI server — must be before django.contrib.staticfiles
    "channels",
    # ...
]

ASGI_APPLICATION = "config.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("localhost", 6379)],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}
```

```python
# config/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django_asgi_app = get_asgi_application()

from apps.chat.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

---

## Pattern 25.2: WebSocket Consumer

```python
# apps/chat/consumers.py — Async consumer (recommended)
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data["message"]
        user = self.scope["user"]

        # Send to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": message,
                "username": user.email if user.is_authenticated else "anonymous",
            },
        )

    async def chat_message(self, event):
        """Handler for chat.message type — sends to WebSocket client."""
        await self.send(text_data=json.dumps({
            "message": event["message"],
            "username": event["username"],
        }))
```

```python
# Sync consumer (for simpler use cases)
from channels.generic.websocket import WebsocketConsumer


class SyncChatConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()

    def disconnect(self, close_code):
        pass

    def receive(self, text_data):
        data = json.loads(text_data)
        self.send(text_data=json.dumps({
            "message": data["message"],
            "echo": True,
        }))
```

---

## Pattern 25.3: Channel Layer (Redis)

```python
# Send message from Django view to WebSocket consumers
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def notify_room(room_name, message):
    """Send notification to all users in a room (from sync code)."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"chat_{room_name}",
        {
            "type": "chat.message",
            "message": message,
            "username": "system",
        },
    )


# Usage from Celery task or view
def order_completed_view(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    order.status = "completed"
    order.save()

    # Notify user via WebSocket
    notify_room(f"user_{order.customer_id}", f"Order #{order.id} completed!")
    return redirect("orders:detail", pk=order.pk)
```

```python
# Async version (from async views or consumers)
async def async_notify_room(room_name, message):
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"chat_{room_name}",
        {
            "type": "chat.message",
            "message": message,
            "username": "system",
        },
    )
```

---

## Pattern 25.4: Routing (URLRouter)

```python
# apps/chat/routing.py
from django.urls import re_path
from apps.chat.consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<room_name>\w+)/$", ChatConsumer.as_asgi()),
]
```

```python
# apps/notifications/routing.py
from django.urls import path
from apps.notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    path("ws/notifications/", NotificationConsumer.as_asgi()),
]
```

```python
# config/asgi.py — combine routing from multiple apps
from apps.chat.routing import websocket_urlpatterns as chat_urls
from apps.notifications.routing import websocket_urlpatterns as notification_urls

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(chat_urls + notification_urls)
    ),
})
```

---

## Pattern 25.5: WebSocket Authentication

```python
# Session-based (built-in) — via AuthMiddlewareStack
# Already configured in asgi.py:
# "websocket": AuthMiddlewareStack(URLRouter(...))
# Access user: self.scope["user"]
```

```python
# Token/JWT authentication middleware
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Get token from query string: ws://host/ws/chat/?token=xxx
        query_string = scope.get("query_string", b"").decode()
        params = dict(p.split("=") for p in query_string.split("&") if "=" in p)
        token = params.get("token")

        if token:
            scope["user"] = await self.get_user(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token_str):
        try:
            token = AccessToken(token_str)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            return User.objects.get(id=token["user_id"])
        except Exception:
            return AnonymousUser()
```

```python
# asgi.py with JWT middleware
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
```

---

## Pattern 25.6: Channel Groups (Broadcast)

```python
# apps/notifications/consumers.py
class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        # Personal notification group
        self.user_group = f"user_{user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # Role-based groups
        groups = await self.get_user_groups(user)
        self.role_groups = []
        for group in groups:
            group_name = f"role_{group}"
            self.role_groups.append(group_name)
            await self.channel_layer.group_add(group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Clean up all groups
        await self.channel_layer.group_discard(self.user_group, self.channel_name)
        for group_name in self.role_groups:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def notification_send(self, event):
        """Handler for notification.send type."""
        await self.send(text_data=json.dumps({
            "type": event.get("notification_type", "info"),
            "title": event["title"],
            "message": event["message"],
        }))

    @database_sync_to_async
    def get_user_groups(self, user):
        return list(user.groups.values_list("name", flat=True))
```

```python
# Send notification to specific user from anywhere
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def send_user_notification(user_id, title, message, notification_type="info"):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "notification.send",
            "title": title,
            "message": message,
            "notification_type": notification_type,
        },
    )
```

---

## Pattern 25.7: Testing Channels

```python
# tests/test_consumers.py
import pytest
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from apps.chat.consumers import ChatConsumer


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_chat_consumer_connect():
    communicator = WebsocketCommunicator(
        ChatConsumer.as_asgi(),
        "/ws/chat/test-room/",
    )
    connected, _ = await communicator.connect()
    assert connected

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_chat_consumer_echo():
    communicator = WebsocketCommunicator(
        ChatConsumer.as_asgi(),
        "/ws/chat/test-room/",
    )
    await communicator.connect()

    # Send message
    await communicator.send_json_to({"message": "hello"})

    # Receive response
    response = await communicator.receive_json_from(timeout=5)
    assert response["message"] == "hello"

    await communicator.disconnect()
```

---

## MUST DO

- Use Redis channel layer in production (never InMemoryChannelLayer)
- Use `AuthMiddlewareStack` for session-based WebSocket auth
- Clean up groups in `disconnect()` to prevent memory leaks
- Use `database_sync_to_async` for ORM calls in async consumers
- Test consumers with `WebsocketCommunicator`

## MUST NOT DO

- Use `InMemoryChannelLayer` in production (breaks with multiple workers)
- Skip authentication on WebSocket endpoints
- Make blocking/sync calls in `AsyncWebsocketConsumer`
- Forget to `group_discard` on disconnect
- Store large data in channel layer messages (use DB + send notification)

---

## References

- [Django Channels](https://channels.readthedocs.io/)
- [Channels: Tutorial](https://channels.readthedocs.io/en/stable/tutorial/)
- [channels-redis](https://github.com/django/channels_redis)
