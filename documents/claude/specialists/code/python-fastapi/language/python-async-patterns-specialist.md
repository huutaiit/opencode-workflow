# Python Async Patterns Specialist
# Python非同期パタ���ンスペシャリスト
# Chuyen Gia Async Python

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All async Python files |
| **Variant** | ALL |
| **Naming Convention** | `async def` for I/O, `def` for CPU-bound |
| **Imports From** | N/A (language-level) |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (Python built-in asyncio) |
| **When To Use** | Async operations, TaskGroup, Semaphore, thread pool awareness |
| **Source Skeleton** | N/A (patterns, not files) |
| **Pattern Numbers** | 66.1–66.8 |
| **Source Paths** | `**/*.py` |
| **File Count** | N/A |
| **Imported By** | ALL specialists |
| **Specialist Type** | language |
| **Purpose** | asyncio patterns, async def vs def decision, TaskGroup, Semaphore, gather, run_in_executor, debug mode, uvloop |
| **Activation Trigger** | async, await, asyncio, concurrent, TaskGroup, event loop, thread |

---

## Purpose

Define async programming patterns for FastAPI: async def vs def decision guide, thread pool awareness, parallel I/O with gather, structured concurrency with TaskGroup, throttling with Semaphore, running sync code in async context, asyncio debug mode, and performance with uvloop.

---

## Pattern 66.1: async def vs def

```python
from fastapi import APIRouter

router = APIRouter()


# ✅ async def — for I/O-bound operations with await
@router.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get(user_id)       # Async I/O — doesn't block
    profile = await cache.get(user_id)  # Another async call
    return {"user": user, "profile": profile}


# ✅ def — for CPU-bound or sync library calls
# FastAPI automatically runs `def` in a threadpool
@router.post("/predict")
def predict(features: list[float]):
    result = model.predict(features)  # CPU-bound, sync library
    return {"prediction": result}


# ❌ WRONG — sync blocking code in async def
@router.get("/users/{user_id}")
async def get_user_bad(user_id: int):
    import time
    time.sleep(1)  # BLOCKS entire event loop!
    user = sync_db.get(user_id)  # BLOCKS entire event loop!
    return user
```

**Decision guide**:
- **Has `await`**: Use `async def`
- **Uses sync library** (sklearn, Pillow, boto3): Use `def`
- **Pure computation** (numpy, math): Use `def`
- **Mixed** (async I/O + sync compute): Use `async def` + `asyncio.to_thread()`

> Source: zhanymkanov/fastapi-best-practices AGENTS.md, Kludex tip #2

---

## Pattern 66.2: Thread Pool Awareness

```python
# FastAPI uses anyio's default threadpool: 40 threads
# Every `def` endpoint runs in this pool

# If you have 50 concurrent requests to `def` endpoints,
# 10 will WAIT for a thread to free up

# Check/configure thread pool size:
import anyio

# In startup
anyio.to_thread.current_default_thread_limiter().total_tokens = 100


# Monitor thread pool usage
@router.get("/debug/threads")
async def thread_info():
    limiter = anyio.to_thread.current_default_thread_limiter()
    return {
        "total_threads": limiter.total_tokens,
        "available": limiter.available_tokens,
        "in_use": limiter.total_tokens - limiter.available_tokens,
    }
```

**Key rule**: If most endpoints are `def` with heavy computation, increase thread pool size. If most are `async def`, 40 is usually sufficient.

> Source: Kludex/fastapi-tips (tip #2)

---

## Pattern 66.3: asyncio.gather (Parallel I/O)

```python
import asyncio


# ✅ Parallel — 2-5x faster than sequential
async def get_user_dashboard(user_id: int):
    user, orders, notifications = await asyncio.gather(
        user_service.get(user_id),
        order_service.list_by_user(user_id),
        notification_service.unread(user_id),
    )
    return {"user": user, "orders": orders, "notifications": notifications}


# ❌ Sequential — each await blocks until complete
async def get_user_dashboard_slow(user_id: int):
    user = await user_service.get(user_id)          # Wait...
    orders = await order_service.list_by_user(user_id)  # Wait...
    notifications = await notification_service.unread(user_id)  # Wait...
    return {"user": user, "orders": orders, "notifications": notifications}


# With error handling
async def get_dashboard_safe(user_id: int):
    results = await asyncio.gather(
        user_service.get(user_id),
        order_service.list_by_user(user_id),
        notification_service.unread(user_id),
        return_exceptions=True,  # Don't raise, return exceptions
    )

    user, orders, notifications = results
    return {
        "user": user if not isinstance(user, Exception) else None,
        "orders": orders if not isinstance(orders, Exception) else [],
        "notifications": notifications if not isinstance(notifications, Exception) else [],
    }
```

---

## Pattern 66.4: TaskGroup (Python 3.11+)

```python
import asyncio


# Structured concurrency — auto-cancel on first failure
async def process_batch(items: list[dict]):
    results = []

    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(process_item(item))
            for item in items
        ]

    # All tasks completed (or ExceptionGroup raised)
    results = [task.result() for task in tasks]
    return results


# TaskGroup vs gather:
# - TaskGroup: cancels remaining tasks on first failure (safer)
# - gather: with return_exceptions=True, waits for all (more tolerant)
# - gather: without return_exceptions, cancels but messy cleanup

# Use TaskGroup when: all-or-nothing, clean cancellation
# Use gather when: partial results acceptable
```

---

## Pattern 66.5: Semaphore (Throttle Concurrency)

```python
import asyncio


# Limit concurrent database connections
db_semaphore = asyncio.Semaphore(10)  # Max 10 concurrent queries


async def query_db(sql: str) -> list[dict]:
    async with db_semaphore:
        return await db.execute(sql)


# Limit concurrent API calls (respect rate limits)
api_semaphore = asyncio.Semaphore(5)  # Max 5 concurrent API calls


async def fetch_all_profiles(user_ids: list[int]) -> list[dict]:
    async def fetch_one(uid: int):
        async with api_semaphore:
            return await external_api.get_profile(uid)

    return await asyncio.gather(*[fetch_one(uid) for uid in user_ids])
```

---

## Pattern 66.6: run_in_threadpool / run_in_executor

```python
import asyncio
from starlette.concurrency import run_in_threadpool


# Option 1: Starlette's run_in_threadpool (recommended in FastAPI)
async def process_image(image_data: bytes) -> bytes:
    # Pillow is sync — run in threadpool
    result = await run_in_threadpool(pillow_resize, image_data, 800, 600)
    return result


# Option 2: asyncio.to_thread (Python 3.9+, same thing)
async def process_image_v2(image_data: bytes) -> bytes:
    result = await asyncio.to_thread(pillow_resize, image_data, 800, 600)
    return result


# Option 3: Custom executor (for CPU-heavy work)
from concurrent.futures import ProcessPoolExecutor

process_pool = ProcessPoolExecutor(max_workers=4)


async def heavy_compute(data: list[float]) -> float:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(process_pool, numpy_compute, data)
    return result
```

**Decision**:
- **Thread pool** (`to_thread`): sync I/O, light CPU (Pillow, boto3)
- **Process pool** (`ProcessPoolExecutor`): heavy CPU (numpy, ML inference)

> Source: zhanymkanov AGENTS.md, Kludex tip #2

---

## Pattern 66.7: AsyncIO Debug Mode

```python
# Enable debug mode to catch common mistakes:
# - Coroutines that were never awaited
# - Blocking calls in async context (> 100ms)
# - Resource leaks (unclosed connections)

# Option 1: Environment variable
# PYTHONASYNCIODEBUG=1 uvicorn src.main:app

# Option 2: In code
import asyncio
asyncio.get_event_loop().set_debug(True)

# Option 3: Python flag
# python -X dev src/main.py
```

**What debug mode catches**:
- `RuntimeWarning: coroutine 'func' was never awaited`
- Slow callbacks (> 100ms blocking the event loop)
- Unclosed transports and event loops

> Source: Kludex/fastapi-tips (tip #7)

---

## Pattern 66.8: uvloop + httptools

```python
# Install for 2-4x performance boost on Linux/macOS
# pip install uvloop httptools

# Option 1: Uvicorn auto-detects (just install)
# uvicorn src.main:app --loop uvloop --http httptools

# Option 2: In pyproject.toml dependencies
# [project.optional-dependencies]
# performance = ["uvloop", "httptools"]

# Option 3: Explicit in code (rarely needed)
import uvloop
uvloop.install()
```

**Performance impact**:
- uvloop: Replaces default asyncio event loop with libuv-based loop (2-4x faster)
- httptools: Replaces default HTTP parser with Joyent's http-parser (faster parsing)
- Both are C extensions — not available on Windows

> Source: Kludex/fastapi-tips (tip #1)

---

## MUST DO

- Use `async def` for I/O-bound operations with `await`
- Use `def` for CPU-bound or sync library code (auto threadpool)
- Use `asyncio.gather()` for parallel independent I/O
- Use `Semaphore` to throttle concurrent access to external resources
- Use `asyncio.to_thread()` for sync code in async context
- Install `uvloop` + `httptools` for production

## MUST NOT DO

- Use `time.sleep()` in `async def` (use `await asyncio.sleep()`)
- Call sync I/O (requests, boto3) directly in `async def`
- Use `async def` for CPU-bound inference (blocks event loop)
- Create unbounded concurrent tasks without semaphore
- Ignore asyncio debug mode warnings
- Use ProcessPoolExecutor for I/O-bound work (overkill)

---

## References

- [asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
- [FastAPI: async def vs def](https://fastapi.tiangolo.com/async/)
- [Kludex/fastapi-tips](https://github.com/Kludex/fastapi-tips)
- [uvloop](https://github.com/MagicStack/uvloop)
