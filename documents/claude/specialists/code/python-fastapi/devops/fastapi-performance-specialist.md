# FastAPI Performance Specialist
# FastAPIパフォーマンスス専門家
# Chuyen Gia Hieu Nang FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | DevOps |
| **Directory Pattern** | `src/core/`, `gunicorn_conf.py` |
| **Variant** | ALL |
| **Naming Convention** | N/A (cross-cutting concern) |
| **Imports From** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | `orjson`, `uvloop`, `locust` (testing) |
| **When To Use** | Performance optimization, connection pooling, profiling |
| **Source Skeleton** | N/A (optimization patterns on existing code) |
| **Pattern Numbers** | 93.1–93.7 |
| **Source Paths** | `**/core/**/*.py`, `gunicorn_conf.py` |
| **File Count** | N/A |
| **Imported By** | N/A |
| **Specialist Type** | devops |
| **Purpose** | Connection pooling tuning, ORJSONResponse, parallel I/O, profiling, load testing, uvloop, ASGI middleware performance |
| **Activation Trigger** | performance, optimize, slow, latency, throughput, profiling |

---

## Purpose

Define performance optimization patterns for FastAPI: connection pool tuning for 3x throughput, ORJSONResponse for faster JSON, parallel I/O with asyncio.gather, production profiling, load testing, uvloop, and pure ASGI middleware for 20-30% faster middleware.

---

## Pattern 93.1: Connection Pooling Tuning

```python
from sqlalchemy.ext.asyncio import create_async_engine


# Default settings (too conservative for production)
engine_bad = create_async_engine("postgresql+asyncpg://...", pool_size=5)

# Tuned for production (3x throughput improvement)
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost:5432/mydb",
    pool_size=20,              # Max persistent connections
    max_overflow=10,           # Extra connections when pool is full
    pool_timeout=30,           # Wait time for connection from pool
    pool_recycle=1800,         # Recycle connections every 30 min
    pool_pre_ping=True,        # Verify connection before checkout
    echo=False,                # Disable SQL logging in production
)
```

**Tuning formula**:
- `pool_size` = `expected_concurrent_requests / workers`
- `max_overflow` = `pool_size * 0.5` (burst capacity)
- Total max connections = `pool_size + max_overflow` per worker
- PostgreSQL max = `workers * (pool_size + max_overflow) + overhead`

**Redis connection pooling**:
```python
import redis.asyncio as redis

pool = redis.ConnectionPool.from_url(
    "redis://localhost:6379",
    max_connections=20,
    decode_responses=True,
)
redis_client = redis.Redis(connection_pool=pool)
```

---

## Pattern 93.2: ORJSONResponse (2-3x Faster JSON)

```python
# pip install orjson
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

# Set as default response class
app = FastAPI(default_response_class=ORJSONResponse)

# Or per-route
@router.get("/data", response_class=ORJSONResponse)
async def get_data():
    return {"items": large_list}  # Serialized with orjson (2-3x faster)
```

**Benchmark** (serializing 1MB JSON):
- `json.dumps`: ~15ms
- `orjson.dumps`: ~5ms (3x faster)
- `ujson.dumps`: ~8ms (2x faster)

**Key rule**: Install `orjson` and set `ORJSONResponse` as default. Zero code changes needed.

---

## Pattern 93.3: Parallel I/O with asyncio.gather

```python
import asyncio


# ❌ Sequential: 300ms (100 + 100 + 100)
async def get_dashboard_slow(user_id: int):
    user = await user_service.get(user_id)          # 100ms
    orders = await order_service.list(user_id)       # 100ms
    notifications = await notif_service.get(user_id) # 100ms
    return {"user": user, "orders": orders, "notifications": notifications}


# ✅ Parallel: 100ms (max of all)
async def get_dashboard_fast(user_id: int):
    user, orders, notifications = await asyncio.gather(
        user_service.get(user_id),
        order_service.list(user_id),
        notif_service.get(user_id),
    )
    return {"user": user, "orders": orders, "notifications": notifications}
```

**Impact**: 2-5x speedup for endpoints with multiple independent I/O calls.

---

## Pattern 93.4: Profiling

```bash
# py-spy: Production-safe profiling (no code changes)
# pip install py-spy
py-spy record -o profile.svg --pid $(pgrep -f uvicorn)

# py-spy top (live view)
py-spy top --pid $(pgrep -f uvicorn)
```

```python
# yappi: Async-aware profiling
# pip install yappi
import yappi

yappi.set_clock_type("wall")  # Wall time (not CPU time) for async
yappi.start()
# ... run workload ...
yappi.stop()

stats = yappi.get_func_stats()
stats.sort("ttot", "desc")
stats.print_all(columns={
    0: ("name", 60),
    1: ("ncall", 10),
    2: ("ttot", 10),
    3: ("tavg", 10),
})
```

**Rule**: Profile first, optimize second. Never optimize without data.

---

## Pattern 93.5: Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task, between, events
import time


class APIUser(HttpUser):
    wait_time = between(0.5, 2)

    @task(5)
    def list_items(self):
        self.client.get("/api/v1/items?page=1&size=20")

    @task(1)
    def create_item(self):
        self.client.post("/api/v1/items", json={"name": "test"})
```

```bash
# Run with report
locust -f locustfile.py --host http://localhost:8000 \
    --headless -u 200 -r 20 --run-time 120s \
    --html results/report.html
```

**Key metrics to watch**:
- p95 response time < 200ms
- Error rate < 1%
- Throughput (RPS) linear with users until saturation

---

## Pattern 93.6: uvloop + httptools

```bash
# Install (Linux/macOS only)
pip install uvloop httptools

# Uvicorn auto-detects installed packages
uvicorn src.main:app --loop uvloop --http httptools
```

**Impact**: 2-4x improvement in raw request handling throughput.

> Source: Kludex tip #1

---

## Pattern 93.7: Pure ASGI Middleware (20-30% Faster)

```python
# ❌ BaseHTTPMiddleware: reads entire request/response body
from starlette.middleware.base import BaseHTTPMiddleware

class SlowMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Reads entire request body into memory
        response = await call_next(request)
        return response


# ✅ Pure ASGI middleware: zero-copy, streaming-compatible
from starlette.types import ASGIApp, Receive, Scope, Send


class FastMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Add timing header
        import time
        start = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                elapsed = time.perf_counter() - start
                headers = list(message.get("headers", []))
                headers.append((b"x-process-time", f"{elapsed:.4f}".encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


app.add_middleware(FastMiddleware)
```

> Source: Kludex tip #8

---

## MUST DO

- Profile before optimizing (py-spy for production)
- Tune connection pool sizes for your workload
- Use ORJSONResponse as default response class
- Use asyncio.gather for parallel independent I/O
- Install uvloop + httptools for production
- Use pure ASGI middleware for performance-critical paths

## MUST NOT DO

- Optimize without profiling data (premature optimization)
- Use `async def` for CPU-bound code (blocks event loop)
- Use BaseHTTPMiddleware for high-throughput paths
- Set pool_size too high (exhausts database connections)
- Skip load testing before production deployment
- Ignore p95/p99 latency (average hides tail latency)

---

## References

- [FastAPI Performance Tips](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)
- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [Kludex/fastapi-tips](https://github.com/Kludex/fastapi-tips)
- [py-spy](https://github.com/benfred/py-spy)
