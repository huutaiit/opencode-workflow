# FastAPI WebSocket Specialist
# FastAPI WebSocketスペシャリスト
# Chuyen Gia WebSocket FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `src/{domain}/ws.py`, `src/realtime/` |
| **Variant** | ALL |
| **Naming Convention** | `ws.py`, `websocket.py`, `connection_manager.py` |
| **Imports From** | Application (services), Domain (schemas) |
| **Cannot Import** | Data Access directly |
| **Dependencies** | N/A (FastAPI built-in WebSocket), `python-socketio` (optional) |
| **When To Use** | Bidirectional real-time communication, chat, live collaboration |
| **Source Skeleton** | `src/{domain}/ws.py`, `src/core/ws_manager.py` |
| **Pattern Numbers** | 35.1–35.6 |
| **Source Paths** | `**/ws.py`, `**/websocket*.py`, `**/realtime/**/*.py` |
| **File Count** | 1-2 per realtime feature |
| **Imported By** | Main app (mount/include) |
| **Specialist Type** | code |
| **Purpose** | WebSocket endpoints, ConnectionManager with rooms, heartbeat, authentication, Redis Pub/Sub scaling, python-socketio |
| **Activation Trigger** | websocket, ws://, real-time, chat, live, broadcast |

---

## Purpose

Define WebSocket patterns for FastAPI: endpoint basics with proper disconnect handling, ConnectionManager for rooms and broadcast, heartbeat/ping-pong keep-alive, authentication strategies, Redis Pub/Sub for multi-process scaling, and python-socketio for production.

---

## Pattern 35.1: WebSocket Endpoint Basics

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        # Use async for — cleaner than while True + receive
        async for message in ws.iter_text():
            # Echo back
            await ws.send_text(f"Echo: {message}")
    except WebSocketDisconnect:
        # Client disconnected — cleanup here
        pass
```

**Key rules**:
- Use `async for message in ws.iter_text()` (or `iter_json()`, `iter_bytes()`) instead of `while True` + `receive_text()` — cleaner, auto-handles disconnect
- `WebSocketDisconnect` is raised when client disconnects — always catch it
- Call `await ws.accept()` before any send/receive

> Source: Kludex/fastapi-tips (tips #3, #4)

---

## Pattern 35.2: ConnectionManager (Rooms + Broadcast)

```python
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import WebSocket


@dataclass
class ConnectionManager:
    """Manage WebSocket connections with room support."""

    # room_name → set of connections
    rooms: dict[str, set[WebSocket]] = field(
        default_factory=lambda: defaultdict(set)
    )

    async def connect(self, ws: WebSocket, room: str = "default") -> None:
        await ws.accept()
        self.rooms[room].add(ws)

    def disconnect(self, ws: WebSocket, room: str = "default") -> None:
        self.rooms[room].discard(ws)
        if not self.rooms[room]:
            del self.rooms[room]  # Cleanup empty rooms

    async def broadcast(self, message: str, room: str = "default") -> None:
        """Broadcast to all connections in a room, prune dead clients."""
        dead: list[WebSocket] = []
        for connection in self.rooms.get(room, set()):
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)

        for ws in dead:
            self.rooms[room].discard(ws)

    async def send_personal(self, ws: WebSocket, message: str) -> None:
        await ws.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/{room}")
async def room_websocket(ws: WebSocket, room: str):
    await manager.connect(ws, room)
    try:
        async for message in ws.iter_text():
            await manager.broadcast(f"{message}", room)
    except WebSocketDisconnect:
        manager.disconnect(ws, room)
```

**Key rules**:
- Always prune dead clients on broadcast (prevents memory leaks)
- Use `discard` not `remove` (no error if already gone)
- Clean up empty rooms to prevent dict growth

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-advanced-patterns)

---

## Pattern 35.3: Heartbeat / Ping-Pong

```python
import asyncio

from fastapi import WebSocket, WebSocketDisconnect


HEARTBEAT_INTERVAL = 30  # seconds
HEARTBEAT_TIMEOUT = 10   # seconds


async def heartbeat(ws: WebSocket):
    """Send periodic pings to detect dead connections."""
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            try:
                await asyncio.wait_for(
                    ws.send_json({"type": "ping"}),
                    timeout=HEARTBEAT_TIMEOUT,
                )
            except (asyncio.TimeoutError, Exception):
                await ws.close(code=1001)
                break
    except Exception:
        pass


@app.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    await ws.accept()
    heartbeat_task = asyncio.create_task(heartbeat(ws))

    try:
        async for data in ws.iter_json():
            if data.get("type") == "pong":
                continue  # Heartbeat response
            # Handle actual messages
            await ws.send_json({"type": "message", "data": data})
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
```

**Why heartbeat matters**:
- Detect half-open connections (client crashed, network dropped)
- Mobile clients entering sleep mode
- Load balancers with idle timeouts (60-120s typical)

---

## Pattern 35.4: WebSocket Authentication

```python
from fastapi import WebSocket, Query, HTTPException, status
from jose import jwt, JWTError

from src.core.config import settings


async def authenticate_ws(ws: WebSocket) -> dict:
    """Authenticate WebSocket via query token.

    Strategy: REST endpoint issues short-lived WS token (30s),
    client connects with token as query param.
    """
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=4001)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "ws":
            await ws.close(code=4001)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        return payload
    except JWTError:
        await ws.close(code=4001)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


@app.websocket("/ws/secure")
async def secure_ws(ws: WebSocket):
    user = await authenticate_ws(ws)
    await ws.accept()

    try:
        async for message in ws.iter_text():
            await ws.send_text(f"[{user['sub']}]: {message}")
    except WebSocketDisconnect:
        pass
```

**Authentication strategies** (in order of preference):

| Strategy | Pros | Cons |
|----------|------|------|
| Query token (short-lived) | Simple, stateless | Token in URL logs |
| First-message auth | Token not in URL | Extra message round |
| Cookie | Automatic | CSRF risk, cookie domain |
| Sec-WebSocket-Protocol | Standard header | Complex client code |

**Key rule**: Issue short-lived WS tokens (30s TTL) via REST endpoint. Never reuse long-lived JWTs as WS tokens.

---

## Pattern 35.5: Scaling with Redis Pub/Sub

```python
import asyncio
import json

import redis.asyncio as redis


class RedisBus:
    """Redis Pub/Sub message bus for cross-process WebSocket broadcasting."""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis = redis.from_url(redis_url)
        self.pubsub = self.redis.pubsub()

    async def publish(self, channel: str, message: dict) -> None:
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe(self, channel: str):
        await self.pubsub.subscribe(channel)

    async def listen(self):
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                yield json.loads(message["data"])

    async def close(self):
        await self.pubsub.unsubscribe()
        await self.redis.aclose()


bus = RedisBus()


@app.websocket("/ws/scaled/{room}")
async def scaled_ws(ws: WebSocket, room: str):
    await manager.connect(ws, room)
    await bus.subscribe(f"room:{room}")

    async def relay_from_redis():
        async for msg in bus.listen():
            await manager.broadcast(json.dumps(msg), room)

    relay_task = asyncio.create_task(relay_from_redis())

    try:
        async for message in ws.iter_text():
            # Publish to Redis → all processes receive
            await bus.publish(f"room:{room}", {"text": message})
    except WebSocketDisconnect:
        manager.disconnect(ws, room)
    finally:
        relay_task.cancel()
```

**Why Redis Pub/Sub**:
- Single-process ConnectionManager only sees its own clients
- Multiple Uvicorn workers (or Kubernetes pods) each have separate memory
- Redis Pub/Sub acts as cross-process message bus

---

## Pattern 35.6: python-socketio (Production)

```python
import socketio

# Create Socket.IO server with Redis adapter (multi-process)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    client_manager=socketio.AsyncRedisManager("redis://localhost:6379"),
)

# Wrap as ASGI app
socket_app = socketio.ASGIApp(sio)


@sio.on("connect")
async def connect(sid, environ):
    print(f"Connected: {sid}")


@sio.on("join_room")
async def join_room(sid, data):
    sio.enter_room(sid, data["room"])
    await sio.emit("message", f"User joined {data['room']}", room=data["room"])


@sio.on("message")
async def message(sid, data):
    room = data.get("room", "default")
    await sio.emit("message", data["text"], room=room, skip_sid=sid)


@sio.on("disconnect")
async def disconnect(sid):
    print(f"Disconnected: {sid}")


# Mount in FastAPI
app = FastAPI()
app.mount("/socket.io", socket_app)
```

**When to use python-socketio vs raw WebSocket**:

| Factor | Raw WebSocket | python-socketio |
|--------|---------------|-----------------|
| **Complexity** | DIY everything | Rooms, namespaces, ack built-in |
| **Scaling** | Manual Redis Pub/Sub | Redis adapter built-in |
| **Client libs** | Browser WebSocket API | socket.io-client (JS, Python, Java, Swift) |
| **Reconnection** | Manual | Automatic |
| **Best for** | Simple, few connections | Chat, notifications, collaborative |

---

## MUST DO

- Use `async for ws.iter_text()` pattern (not `while True` + `receive`)
- Implement heartbeat for long-lived connections
- Prune dead clients on broadcast
- Authenticate WebSocket connections (query token preferred)
- Use Redis Pub/Sub or python-socketio for multi-process scaling
- Handle `WebSocketDisconnect` in every endpoint

## MUST NOT DO

- Skip authentication on WebSocket endpoints
- Use long-lived JWT tokens for WebSocket auth
- Rely on single-process ConnectionManager in production (won't scale)
- Block the event loop in WebSocket handlers
- Forget to cancel background tasks (heartbeat, relay) on disconnect
- Send unbounded messages without backpressure

---

## References

- [FastAPI: WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [Kludex/fastapi-tips: WebSocket](https://github.com/Kludex/fastapi-tips)
- [python-socketio](https://python-socketio.readthedocs.io/)
- [derekmizak: Advanced Patterns](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
