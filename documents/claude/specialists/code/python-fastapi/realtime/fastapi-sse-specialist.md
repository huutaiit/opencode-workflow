# FastAPI SSE Specialist
# FastAPI SSEスペシャリスト
# Chuyen Gia SSE FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `src/{domain}/sse.py`, `src/realtime/sse.py` |
| **Variant** | ALL |
| **Naming Convention** | `sse.py`, `stream.py` |
| **Imports From** | Application (services) |
| **Cannot Import** | Data Access directly |
| **Dependencies** | `sse-starlette` |
| **When To Use** | Server-Sent Events, LLM streaming responses, live updates |
| **Source Skeleton** | `src/{domain}/sse.py` |
| **Pattern Numbers** | 36.1–36.5 |
| **Source Paths** | `**/sse.py`, `**/stream*.py` |
| **File Count** | 1 per streaming feature |
| **Imported By** | Main app (include_router) |
| **Specialist Type** | code |
| **Purpose** | Native SSE with EventSourceResponse, streaming events, Last-Event-ID resume, POST SSE for LLM chat, SSE vs WebSocket decision |
| **Activation Trigger** | sse, server-sent-events, EventSourceResponse, stream, text/event-stream |

---

## Purpose

Define Server-Sent Events (SSE) patterns for FastAPI: native SSE support (v0.135+), structured ServerSentEvent objects, resume with Last-Event-ID, POST-based SSE for LLM chat streaming, and decision guidance for SSE vs WebSocket.

---

## Pattern 36.1: Native SSE (FastAPI v0.135+)

```python
import asyncio
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.sse import EventSourceResponse

router = APIRouter(prefix="/events", tags=["events"])


async def event_generator() -> AsyncGenerator[dict, None]:
    """Generate SSE events as dicts."""
    counter = 0
    while True:
        counter += 1
        yield {
            "event": "update",
            "id": str(counter),
            "data": f"Event #{counter}",
        }
        await asyncio.sleep(1)


@router.get("/stream")
async def stream_events():
    """Stream SSE events to client.

    Native SSE — no third-party packages needed (FastAPI 0.135+).
    Response Content-Type: text/event-stream (set automatically).
    """
    return EventSourceResponse(event_generator())
```

**Pre-0.135 fallback** (sse-starlette):
```python
# pip install sse-starlette
from sse_starlette.sse import EventSourceResponse

# Same API — drop-in replacement
@router.get("/stream")
async def stream_events():
    return EventSourceResponse(event_generator())
```

**Key rule**: Use native `fastapi.sse.EventSourceResponse` on v0.135+. Fallback to `sse-starlette` for older versions.

---

## Pattern 36.2: ServerSentEvent (Structured Events)

```python
from fastapi.sse import ServerSentEvent


async def typed_events() -> AsyncGenerator[ServerSentEvent, None]:
    """Yield structured SSE events with type, id, retry."""

    # Named event — client listens via addEventListener("notification", ...)
    yield ServerSentEvent(
        data='{"title": "New message", "body": "Hello!"}',
        event="notification",
        id="1",
        retry=5000,  # Client reconnect interval (ms)
    )

    # Default event — client listens via onmessage
    yield ServerSentEvent(
        data="Simple text message",
        id="2",
    )

    # Multi-line data
    yield ServerSentEvent(
        data="Line 1\nLine 2\nLine 3",
        event="multiline",
        id="3",
    )


@router.get("/typed")
async def typed_stream():
    return EventSourceResponse(typed_events())
```

**SSE wire format**:
```
event: notification
id: 1
retry: 5000
data: {"title": "New message", "body": "Hello!"}

data: Simple text message
id: 2

event: multiline
id: 3
data: Line 1
data: Line 2
data: Line 3

```

**Key rules**:
- `event`: Custom event type (client uses `addEventListener(eventType, ...)`)
- `id`: Event ID for resume (client sends `Last-Event-ID` on reconnect)
- `retry`: Reconnect interval in ms (client auto-reconnects)
- `data`: Payload (auto-splits multi-line on `\n`)

---

## Pattern 36.3: Resume with Last-Event-ID

```python
from fastapi import Request


async def resumable_events(
    last_id: int = 0,
) -> AsyncGenerator[ServerSentEvent, None]:
    """Generate events starting from last_id (for resume)."""
    # In production: fetch missed events from DB/cache
    counter = last_id
    while True:
        counter += 1
        yield ServerSentEvent(
            data=f'{{"counter": {counter}}}',
            event="tick",
            id=str(counter),
        )
        await asyncio.sleep(1)


@router.get("/resumable")
async def resumable_stream(request: Request):
    """SSE with resume support via Last-Event-ID header."""
    last_event_id = request.headers.get("Last-Event-ID", "0")
    last_id = int(last_event_id)

    return EventSourceResponse(resumable_events(last_id))
```

**Client side**:
```javascript
// Browser auto-sends Last-Event-ID on reconnect
const es = new EventSource("/events/resumable");
es.addEventListener("tick", (e) => {
    console.log(e.data, e.lastEventId);
});
// If connection drops, browser reconnects with Last-Event-ID header
```

**Key rule**: Always set `id` on events you want to be resumable. Store events in DB/Redis for replay.

---

## Pattern 36.4: POST SSE for LLM Chat Streaming

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    model: str = "gpt-4"
    stream: bool = True


async def stream_llm_response(
    request: ChatRequest,
) -> AsyncGenerator[ServerSentEvent, None]:
    """Stream LLM response tokens via SSE."""
    # Example with OpenAI-style streaming
    from openai import AsyncOpenAI

    client = AsyncOpenAI()
    response = await client.chat.completions.create(
        model=request.model,
        messages=[{"role": "user", "content": request.message}],
        stream=True,
    )

    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta.content:
            yield ServerSentEvent(
                data=delta.content,
                event="token",
            )

    yield ServerSentEvent(data="[DONE]", event="done")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """POST with SSE response — standard for LLM chat APIs.

    Note: EventSource API only supports GET.
    Use fetch() with ReadableStream on client side.
    """
    return EventSourceResponse(stream_llm_response(request))
```

**Client for POST SSE** (fetch + ReadableStream):
```javascript
const response = await fetch("/chat/stream", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({message: "Hello", stream: true}),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const {value, done} = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    // Parse SSE format: "event: token\ndata: Hello\n\n"
    for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            process.stdout.write(data);
        }
    }
}
```

**Key rule**: POST SSE requires `fetch()` + `ReadableStream` on client (not `EventSource` which is GET-only).

---

## Pattern 36.5: SSE vs WebSocket Decision Table

| Factor | SSE | WebSocket |
|--------|-----|-----------|
| **Direction** | Server → Client only | Bidirectional |
| **Protocol** | HTTP/1.1 (auto-reconnect) | ws:// (manual reconnect) |
| **Browser API** | `EventSource` (simple) | `WebSocket` (complex) |
| **Authentication** | Cookie/header (standard HTTP) | Query param or first-message |
| **Load balancer** | Standard HTTP (easy) | Requires sticky sessions or upgrade |
| **Reconnection** | Automatic + Last-Event-ID | Manual implementation |
| **Max connections** | ~6 per domain (HTTP/1.1) | No limit |
| **HTTP/2** | Multiplexed (no limit) | Still separate |

**Use SSE when**:
- Server pushes updates to client (notifications, live feeds, LLM streaming)
- Simple one-way data flow
- You want automatic reconnection + resume
- HTTP/2 available (removes 6-connection limit)

**Use WebSocket when**:
- Bidirectional communication (chat, collaborative editing)
- Client sends frequent messages
- Low-latency round-trip needed (<50ms)
- Binary data transfer

---

## MUST DO

- Use native `fastapi.sse.EventSourceResponse` on v0.135+
- Set `id` on events for resume support
- Handle `Last-Event-ID` header for reconnection
- Use POST + fetch for LLM streaming (not EventSource)
- Set `retry` field to control client reconnect interval
- Properly handle client disconnect (generator cleanup)

## MUST NOT DO

- Use SSE for bidirectional communication (use WebSocket instead)
- Forget `id` on events you want resumable
- Ignore HTTP/1.1 six-connection limit (use HTTP/2)
- Send binary data over SSE (text-only protocol)
- Skip cleanup in async generator on disconnect
- Use `EventSource` API for POST requests (GET-only)

---

## References

- [FastAPI: SSE](https://fastapi.tiangolo.com/advanced/custom-response/#eventstream-response)
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [sse-starlette](https://github.com/sysid/sse-starlette)
