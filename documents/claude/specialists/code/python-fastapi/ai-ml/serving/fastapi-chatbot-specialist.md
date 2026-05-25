# FastAPI Chatbot Specialist
# FastAPIチャットボットスペシャリスト
# Chuyen Gia Chatbot FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/chat/`, `src/ai/chatbot/` |
| **Variant** | ALL |
| **Naming Convention** | `chatbot.py`, `agent.py`, `conversation.py` |
| **Imports From** | Domain (schemas), Infrastructure (LLM clients, memory) |
| **Cannot Import** | Presentation |
| **Dependencies** | `pydantic-ai>=0.0.30` (or `langchain`), `redis` (memory) |
| **When To Use** | Conversational chatbot, memory management, token cost tracking |
| **Source Skeleton** | `src/chat/agent.py`, `src/chat/memory.py`, `src/chat/router.py` |
| **Pattern Numbers** | 59.1–59.7 |
| **Source Paths** | `**/chat/**/*.py`, `**/chatbot/**/*.py` |
| **File Count** | 2-4 per chatbot feature |
| **Imported By** | Presentation (routes, WebSocket) |
| **Specialist Type** | code |
| **Purpose** | Pydantic AI agents, conversation memory, WebSocket/SSE chat endpoints, token counting, rate limiting, LLM response caching |
| **Activation Trigger** | chatbot, conversational, chat, pydantic-ai, agent, conversation |

---

## Purpose

Define chatbot patterns for FastAPI: Pydantic AI type-safe agents, conversation memory with persistent storage, WebSocket bidirectional chat, SSE streaming chat, token counting and cost tracking, per-user rate limiting, and LLM response caching strategies.

---

## Pattern 59.1: Pydantic AI Agent

```python
# pip install pydantic-ai
from pydantic_ai import Agent
from pydantic import BaseModel


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    sources: list[str] = []


# Type-safe, provider-agnostic agent
support_agent = Agent(
    model="openai:gpt-4o",  # or "anthropic:claude-sonnet-4-20250514"
    result_type=ChatResponse,
    system_prompt=(
        "You are a customer support agent. "
        "Answer questions about our product. "
        "Always cite sources when available."
    ),
)


# Simple usage
result = await support_agent.run("How do I reset my password?")
print(result.data)  # ChatResponse instance
print(result.usage())  # Token usage


# With dependencies (injected context)
from pydantic_ai import RunContext
from dataclasses import dataclass


@dataclass
class SupportContext:
    user_id: str
    subscription_tier: str


agent_with_deps = Agent(
    model="openai:gpt-4o",
    result_type=ChatResponse,
    deps_type=SupportContext,
    system_prompt="You are a support agent.",
)


@agent_with_deps.system_prompt
async def add_user_context(ctx: RunContext[SupportContext]) -> str:
    return f"User tier: {ctx.deps.subscription_tier}. Adjust detail level accordingly."


@agent_with_deps.tool
async def lookup_faq(ctx: RunContext[SupportContext], query: str) -> str:
    """Search FAQ database for relevant answers."""
    results = await faq_service.search(query)
    return "\n".join([r.answer for r in results])
```

> Source: pydantic/pydantic-ai

---

## Pattern 59.2: Conversation Memory

```python
from datetime import datetime
from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime


class ConversationStore:
    """Persistent conversation memory."""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 3600 * 24  # 24 hours

    async def add_message(self, session_id: str, message: Message):
        key = f"chat:{session_id}"
        await self.redis.rpush(key, message.model_dump_json())
        await self.redis.expire(key, self.ttl)

    async def get_history(
        self,
        session_id: str,
        limit: int = 20,
    ) -> list[Message]:
        key = f"chat:{session_id}"
        messages = await self.redis.lrange(key, -limit, -1)
        return [Message.model_validate_json(m) for m in messages]

    async def get_messages_for_llm(
        self,
        session_id: str,
        limit: int = 20,
    ) -> list[dict]:
        """Format for LLM API (OpenAI/Anthropic message format)."""
        history = await self.get_history(session_id, limit)
        return [{"role": m.role, "content": m.content} for m in history]

    async def clear(self, session_id: str):
        await self.redis.delete(f"chat:{session_id}")
```

**Summarization for long conversations**:
```python
async def summarize_if_needed(
    session_id: str,
    max_messages: int = 50,
) -> str | None:
    """Summarize old messages when conversation gets long."""
    history = await store.get_history(session_id, limit=max_messages)
    if len(history) < max_messages:
        return None

    # Summarize oldest half
    old_messages = history[:len(history) // 2]
    summary = await llm.summarize(old_messages)

    # Replace old messages with summary
    await store.clear(session_id)
    await store.add_message(session_id, Message(
        role="system", content=f"Previous conversation summary: {summary}",
        timestamp=datetime.utcnow(),
    ))

    # Re-add recent messages
    for msg in history[len(history) // 2:]:
        await store.add_message(session_id, msg)

    return summary
```

---

## Pattern 59.3: WebSocket Chat Endpoint

```python
import json
from fastapi import WebSocket, WebSocketDisconnect, Depends


@app.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    ws: WebSocket,
    session_id: str,
):
    await ws.accept()

    try:
        async for raw in ws.iter_text():
            data = json.loads(raw)
            user_message = data["message"]

            # Save user message
            await store.add_message(
                session_id,
                Message(role="user", content=user_message, timestamp=datetime.utcnow()),
            )

            # Get history for context
            history = await store.get_messages_for_llm(session_id)

            # Stream response
            async with llm_client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=history,
            ) as stream:
                full_response = ""
                async for text in stream.text_stream:
                    full_response += text
                    await ws.send_json({"type": "token", "content": text})

            # Save assistant response
            await store.add_message(
                session_id,
                Message(role="assistant", content=full_response, timestamp=datetime.utcnow()),
            )
            await ws.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
```

---

## Pattern 59.4: SSE Chat Endpoint (POST)

```python
from fastapi import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str
    model: str = "gpt-4o"


async def stream_chat_response(request: ChatRequest):
    # Save user message
    await store.add_message(
        request.session_id,
        Message(role="user", content=request.message, timestamp=datetime.utcnow()),
    )

    history = await store.get_messages_for_llm(request.session_id)

    full_response = ""
    async for chunk in llm_service.stream(history, model=request.model):
        full_response += chunk
        yield ServerSentEvent(data=chunk, event="token")

    # Save assistant response
    await store.add_message(
        request.session_id,
        Message(role="assistant", content=full_response, timestamp=datetime.utcnow()),
    )
    yield ServerSentEvent(data="[DONE]", event="done")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    return EventSourceResponse(stream_chat_response(request))
```

---

## Pattern 59.5: Token Counting + Cost Tracking

```python
import tiktoken


class TokenTracker:
    """Track token usage and costs per user/session."""

    def __init__(self, redis_client):
        self.redis = redis_client

    def count_tokens(self, text: str, model: str = "gpt-4o") -> int:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))

    async def track_usage(
        self,
        user_id: str,
        input_tokens: int,
        output_tokens: int,
        model: str,
    ):
        """Track usage for billing/quotas."""
        key = f"tokens:{user_id}:{datetime.utcnow().strftime('%Y-%m')}"
        await self.redis.hincrby(key, "input", input_tokens)
        await self.redis.hincrby(key, "output", output_tokens)
        await self.redis.expire(key, 3600 * 24 * 90)  # 90 days

    async def get_usage(self, user_id: str) -> dict:
        key = f"tokens:{user_id}:{datetime.utcnow().strftime('%Y-%m')}"
        data = await self.redis.hgetall(key)
        return {
            "input_tokens": int(data.get("input", 0)),
            "output_tokens": int(data.get("output", 0)),
        }

    async def check_quota(self, user_id: str, max_tokens: int = 1_000_000) -> bool:
        usage = await self.get_usage(user_id)
        total = usage["input_tokens"] + usage["output_tokens"]
        return total < max_tokens
```

---

## Pattern 59.6: Rate Limiting for Chat

```python
from datetime import datetime


class ChatRateLimiter:
    """Per-user rate limiting for chat endpoints."""

    def __init__(self, redis_client, max_requests: int = 20, window: int = 60):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window = window  # seconds

    async def check(self, user_id: str) -> bool:
        """Returns True if request is allowed."""
        key = f"ratelimit:chat:{user_id}"
        current = await self.redis.get(key)

        if current and int(current) >= self.max_requests:
            return False

        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window)
        await pipe.execute()
        return True

    async def get_remaining(self, user_id: str) -> int:
        key = f"ratelimit:chat:{user_id}"
        current = await self.redis.get(key)
        return max(0, self.max_requests - int(current or 0))


# FastAPI dependency
async def check_rate_limit(
    user_id: str = Depends(get_current_user_id),
    limiter: ChatRateLimiter = Depends(get_rate_limiter),
):
    if not await limiter.check(user_id):
        remaining = await limiter.get_remaining(user_id)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {limiter.window}s.",
            headers={"Retry-After": str(limiter.window)},
        )
```

---

## Pattern 59.7: LLM Response Caching

```python
import hashlib


class ResponseCache:
    """Two-tier caching: exact match + semantic similarity."""

    def __init__(self, redis_client, vector_store=None, embed_fn=None):
        self.redis = redis_client
        self.vector_store = vector_store
        self.embed_fn = embed_fn
        self.ttl = 3600  # 1 hour

    async def get_exact(self, messages: list[dict]) -> str | None:
        """Exact match cache (hash-based)."""
        key = self._hash_key(messages)
        return await self.redis.get(f"cache:exact:{key}")

    async def get_semantic(self, query: str, threshold: float = 0.95) -> str | None:
        """Semantic similarity cache (vector-based)."""
        if not self.vector_store:
            return None
        embedding = await self.embed_fn([query])
        results = await self.vector_store.search(embedding[0], top_k=1)
        if results and results[0]["score"] >= threshold:
            return results[0]["payload"]["response"]
        return None

    async def set(self, messages: list[dict], response: str):
        key = self._hash_key(messages)
        await self.redis.setex(f"cache:exact:{key}", self.ttl, response)

    def _hash_key(self, messages: list[dict]) -> str:
        content = str(sorted([(m["role"], m["content"]) for m in messages]))
        return hashlib.sha256(content.encode()).hexdigest()
```

---

## MUST DO

- Persist conversation history (Redis/DB) — not in-memory
- Implement token counting and cost tracking per user
- Rate limit chat endpoints per user
- Stream responses for better UX (SSE or WebSocket)
- Summarize long conversations to manage context window
- Cache repeated queries (exact + semantic)

## MUST NOT DO

- Store conversation history in-memory in production
- Skip rate limiting on LLM-backed endpoints (cost risk)
- Send unlimited context to LLM (manage token budget)
- Forget to save assistant responses to history
- Use WebSocket without heartbeat for long chat sessions
- Cache responses without TTL (stale data)

---

## References

- [Pydantic AI](https://ai.pydantic.dev/)
- [tiktoken](https://github.com/openai/tiktoken)
- [FastAPI WebSocket Chat](https://fastapi.tiangolo.com/advanced/websockets/)
