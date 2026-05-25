# Redis Patterns Specialist
# Redisパターンスペシャリスト
# Chuyên Gia Redis Patterns

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data Access |
| **Directory Pattern** | `src/core/redis.py`, `src/{domain}/cache.py` |
| **Variant** | ALL |
| **Naming Convention** | `redis.py` (client setup), `cache.py` (domain caching logic) |
| **Imports From** | Domain (schemas for serialization) |
| **Cannot Import** | Presentation, Application |
| **Dependencies** | redis[hiredis]>=5.0 |
| **When To Use** | Caching, rate limiting, pub/sub, session storage |
| **Source Skeleton** | `src/core/redis.py`, `src/{domain}/cache.py` |
| **Pattern Numbers** | 15.1–15.6 |
| **Source Paths** | `**/redis.py`, `**/cache.py` |
| **File Count** | 1 core + optional per domain |
| **Imported By** | Application (services via DI), Middleware (rate limiting) |
| **Specialist Type** | code |
| **Purpose** | redis.asyncio client, cache-aside pattern, rate limiting, pub/sub, session storage, graceful degradation |
| **Activation Trigger** | `redis`, cache, `rate_limit`, `pub/sub`, session storage |

---

## Purpose

Define Redis patterns for FastAPI async: client setup with `redis.asyncio`, cache-aside with tag invalidation, token bucket rate limiting, pub/sub messaging, session storage, and graceful degradation on Redis failure.

---

## Pattern 15.1: Async Client Setup

```python
import redis.asyncio as redis
from src.core.config import get_settings


async def get_redis_client() -> redis.Redis:
    """Create Redis client. Use in lifespan for lifecycle management."""
    settings = get_settings()
    return redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=settings.REDIS_MAX_CONNECTIONS,
    )


# In lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await get_redis_client()
    yield
    await app.state.redis.close()


# As dependency
async def get_redis(request: Request) -> redis.Redis:
    return request.app.state.redis

RedisDep = Annotated[redis.Redis, Depends(get_redis)]
```

**Key rule**: Use `redis.asyncio` (NOT `aioredis` — deprecated since redis-py 4.2, merged into `redis`).

**Install**: `pip install redis[hiredis]` (hiredis = C parser, 10x faster)

---

## Pattern 15.2: Cache-Aside Pattern

```python
import json
from typing import TypeVar, Callable, Any

T = TypeVar("T")


class CacheService:
    def __init__(self, redis_client: redis.Redis, prefix: str = "cache") -> None:
        self._redis = redis_client
        self._prefix = prefix

    def _key(self, key: str) -> str:
        return f"{self._prefix}:{key}"

    async def get_or_set(
        self,
        key: str,
        factory: Callable[[], Any],
        ttl: int = 300,  # 5 minutes
    ) -> Any:
        """Cache-aside: check cache → miss → compute → store."""
        cached = await self._redis.get(self._key(key))
        if cached is not None:
            return json.loads(cached)

        value = await factory()
        await self._redis.set(
            self._key(key),
            json.dumps(value, default=str),
            ex=ttl,
        )
        return value

    async def invalidate(self, key: str) -> None:
        await self._redis.delete(self._key(key))

    async def invalidate_pattern(self, pattern: str) -> None:
        """Tag-based invalidation: delete all keys matching pattern."""
        async for key in self._redis.scan_iter(f"{self._prefix}:{pattern}"):
            await self._redis.delete(key)


# Usage in service
class ProductService:
    def __init__(self, repo: ProductRepository, cache: CacheService) -> None:
        self._repo = repo
        self._cache = cache

    async def get_product(self, product_id: int) -> ProductResponse:
        return await self._cache.get_or_set(
            f"product:{product_id}",
            lambda: self._repo.get_by_id(product_id),
            ttl=600,
        )

    async def update_product(self, product_id: int, data: ProductUpdate) -> ProductResponse:
        result = await self._repo.update(product_id, data)
        await self._cache.invalidate(f"product:{product_id}")
        return result
```

---

## Pattern 15.3: Rate Limiting (Token Bucket)

```python
import time


class RateLimiter:
    def __init__(self, redis_client: redis.Redis) -> None:
        self._redis = redis_client

    async def check(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int, int]:
        """
        Returns: (allowed, remaining, retry_after_seconds)
        Atomic via Redis INCR + EXPIRE.
        """
        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        results = await pipe.execute()

        current = results[0]
        remaining = max(0, max_requests - current)
        allowed = current <= max_requests

        retry_after = 0 if allowed else window_seconds
        return allowed, remaining, retry_after


# As FastAPI dependency
async def rate_limit(
    request: Request,
    redis_client: RedisDep,
) -> None:
    limiter = RateLimiter(redis_client)
    client_ip = request.client.host
    key = f"rate_limit:{client_ip}:{request.url.path}"

    allowed, remaining, retry_after = await limiter.check(
        key, max_requests=100, window_seconds=60
    )

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Remaining": "0",
            },
        )
```

---

## Pattern 15.4: Pub/Sub

```python
import asyncio
import json


async def publish(redis_client: redis.Redis, channel: str, data: dict) -> None:
    await redis_client.publish(channel, json.dumps(data))


async def subscribe(redis_client: redis.Redis, channel: str, callback):
    """Subscribe to channel. Run as background task in lifespan."""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    async for message in pubsub.listen():
        if message["type"] == "message":
            data = json.loads(message["data"])
            await callback(data)


# Usage in lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client = await get_redis_client()
    app.state.redis = redis_client

    task = asyncio.create_task(
        subscribe(redis_client, "notifications", handle_notification)
    )
    yield
    task.cancel()
    await redis_client.close()
```

**Key rule**: Pub/Sub is fire-and-forget (no message persistence). Use Redis Streams for durable messaging.

---

## Pattern 15.5: Session Storage

```python
import json
import uuid


class SessionStore:
    def __init__(self, redis_client: redis.Redis, ttl: int = 3600) -> None:
        self._redis = redis_client
        self._ttl = ttl
        self._prefix = "session"

    async def create(self, data: dict) -> str:
        session_id = str(uuid.uuid4())
        key = f"{self._prefix}:{session_id}"
        await self._redis.set(key, json.dumps(data), ex=self._ttl)
        return session_id

    async def get(self, session_id: str) -> dict | None:
        key = f"{self._prefix}:{session_id}"
        data = await self._redis.get(key)
        if data is None:
            return None
        # Refresh TTL on access
        await self._redis.expire(key, self._ttl)
        return json.loads(data)

    async def destroy(self, session_id: str) -> None:
        await self._redis.delete(f"{self._prefix}:{session_id}")
```

---

## Pattern 15.6: Graceful Degradation

```python
import logging

logger = logging.getLogger(__name__)


class ResilientCacheService:
    """Cache that degrades gracefully — app works without Redis."""

    def __init__(self, redis_client: redis.Redis) -> None:
        self._redis = redis_client

    async def get_or_set(self, key: str, factory, ttl: int = 300):
        try:
            cached = await self._redis.get(key)
            if cached is not None:
                return json.loads(cached)
        except redis.RedisError as e:
            logger.warning(f"Redis GET failed: {e}")
            # Fall through to factory

        value = await factory()

        try:
            await self._redis.set(key, json.dumps(value, default=str), ex=ttl)
        except redis.RedisError as e:
            logger.warning(f"Redis SET failed: {e}")

        return value
```

**Key rule**: Cache failure ≠ application failure. Always fall through to the data source if Redis is down.

---

## MUST DO

- Use `redis.asyncio` (NOT deprecated `aioredis`)
- Install `redis[hiredis]` for C-based parser (10x faster)
- Use key prefixes for namespacing (`cache:`, `session:`, `rate_limit:`)
- Set TTL on all cached data (prevent unbounded memory growth)
- Implement graceful degradation (cache miss → data source)
- Use `pipeline()` for atomic multi-command operations

## MUST NOT DO

- Use `aioredis` directly (deprecated, merged into `redis`)
- Use `KEYS *` in production (blocks server — use `SCAN` instead)
- Store large objects (>1MB) in Redis without compression
- Skip TTL on cache keys (memory leak)
- Let cache failures crash the application
- Use Pub/Sub for durable messaging (use Redis Streams instead)

---

## References

- [redis-py: Async Support](https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html)
- [redis.io: FastAPI Tutorial](https://redis.io/learn/develop/python/fastapi)
- [zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices)
