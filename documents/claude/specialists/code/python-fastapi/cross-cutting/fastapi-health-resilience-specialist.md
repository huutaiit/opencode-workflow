# FastAPI Health & Resilience Specialist
# FastAPIヘルスチェック&レジリエンスス専門家
# Chuyen Gia Health Check & Resilience FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `src/core/health.py`, `src/core/resilience.py` |
| **Variant** | ALL |
| **Naming Convention** | `health.py`, `resilience.py`, `circuit_breaker.py` |
| **Imports From** | Infrastructure (DB, Redis, external APIs) |
| **Cannot Import** | Application, Presentation |
| **Dependencies** | tenacity>=8.0, circuitbreaker>=2.0 (optional) |
| **When To Use** | Health probes, circuit breakers, retry logic, graceful degradation |
| **Source Skeleton** | `src/core/health.py`, `src/core/resilience.py` |
| **Pattern Numbers** | 77.1–77.6 |
| **Source Paths** | `**/core/health.py`, `**/core/resilience.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Main app (routes), Infrastructure |
| **Specialist Type** | code |
| **Purpose** | Liveness/readiness probes, circuit breaker, retry with backoff, graceful degradation, resilience layering |
| **Activation Trigger** | health, liveness, readiness, circuit_breaker, retry, resilience |

---

## Purpose

Define health check and resilience patterns for FastAPI: Kubernetes-compatible liveness/readiness probes, circuit breaker with pybreaker, retry with tenacity, graceful degradation strategies, and proper resilience layering.

---

## Pattern 77.1: Liveness Probe

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health/live", status_code=200)
async def liveness():
    """Liveness probe — is the process alive?

    MUST NOT check external dependencies.
    Kubernetes restarts pod if this fails.
    If DB is down and liveness checks DB → unnecessary restarts.
    """
    return {"status": "alive"}
```

**Key rule**: Liveness = "is the process running?" Only return 503 if the process itself is broken (deadlock, OOM). NEVER check DB, Redis, or external APIs here.

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-deployment)

---

## Pattern 77.2: Readiness Probe

```python
import asyncio
from fastapi import APIRouter, Response

router = APIRouter(tags=["health"])


async def check_database() -> dict:
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"database": "ok"}
    except Exception as e:
        return {"database": f"error: {e}"}


async def check_redis() -> dict:
    try:
        await redis_client.ping()
        return {"redis": "ok"}
    except Exception as e:
        return {"redis": f"error: {e}"}


async def check_external_api() -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(settings.EXTERNAL_API_HEALTH_URL)
            if resp.status_code == 200:
                return {"external_api": "ok"}
            return {"external_api": f"status {resp.status_code}"}
    except Exception as e:
        return {"external_api": f"error: {e}"}


@router.get("/health/ready")
async def readiness(response: Response):
    """Readiness probe — can the app handle traffic?

    Checks ALL dependencies in parallel.
    Kubernetes removes pod from load balancer if this fails.
    """
    results = await asyncio.gather(
        check_database(),
        check_redis(),
        check_external_api(),
        return_exceptions=True,
    )

    checks = {}
    for result in results:
        if isinstance(result, dict):
            checks.update(result)
        else:
            checks["unknown"] = str(result)

    all_ok = all(v == "ok" for v in checks.values())

    if not all_ok:
        response.status_code = 503

    return {"status": "ready" if all_ok else "not_ready", "checks": checks}
```

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-deployment)

---

## Pattern 77.3: Circuit Breaker

```python
# pip install pybreaker
import pybreaker


# Circuit breaker for external API calls
external_api_breaker = pybreaker.CircuitBreaker(
    fail_max=5,          # Open after 5 consecutive failures
    reset_timeout=30,    # Try again after 30 seconds
    name="external_api",
)


# Async-compatible wrapper
class AsyncCircuitBreaker:
    """Wrap pybreaker for async functions."""

    def __init__(self, breaker: pybreaker.CircuitBreaker):
        self.breaker = breaker

    async def call(self, func, *args, **kwargs):
        """Execute function through circuit breaker."""
        if self.breaker.current_state == "open":
            raise pybreaker.CircuitBreakerError("Circuit is OPEN")

        try:
            result = await func(*args, **kwargs)
            self.breaker._success_call()
            return result
        except Exception as e:
            self.breaker._failure_call()
            raise


# Usage
api_breaker = AsyncCircuitBreaker(external_api_breaker)


async def get_user_profile(user_id: int) -> dict:
    """Call external API with circuit breaker protection."""
    try:
        return await api_breaker.call(external_api.get_profile, user_id)
    except pybreaker.CircuitBreakerError:
        # Fallback: return cached data or default
        return await cache.get(f"profile:{user_id}") or {"status": "unavailable"}
```

**Circuit Breaker states**:
```
CLOSED → (failures >= fail_max) → OPEN → (after reset_timeout) → HALF-OPEN
                                                                      ↓
                                                              Success → CLOSED
                                                              Failure → OPEN
```

---

## Pattern 77.4: Retry with Backoff

```python
# pip install tenacity
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)
import httpx
import structlog

logger = structlog.get_logger()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),  # 1s, 2s, 4s
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    before_sleep=before_sleep_log(logger, "WARNING"),
)
async def call_external_api(url: str) -> dict:
    """HTTP call with exponential backoff retry."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


# Retry with custom logic
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type(Exception),
)
async def process_payment(order_id: int) -> dict:
    """Payment processing with retry on transient failures."""
    result = await payment_gateway.charge(order_id)
    if result.status == "pending":
        raise Exception("Payment still pending")  # Triggers retry
    return result
```

---

## Pattern 77.5: Graceful Degradation

```python
async def get_product_with_recommendations(product_id: int) -> dict:
    """Product page with graceful degradation.

    Core data MUST succeed. Recommendations are optional.
    """
    # Core: MUST succeed (propagate errors)
    product = await product_service.get(product_id)

    # Optional: gracefully degrade on failure
    try:
        recommendations = await recommendation_service.get(product_id)
    except Exception:
        logger.warning("recommendations_unavailable", product_id=product_id)
        recommendations = []  # Degrade gracefully

    try:
        reviews = await review_service.get(product_id)
    except Exception:
        logger.warning("reviews_unavailable", product_id=product_id)
        reviews = []

    return {
        "product": product,
        "recommendations": recommendations,
        "reviews": reviews,
    }


# Cache-based degradation
async def get_data_with_cache_fallback(key: str) -> dict:
    """Try live data, fallback to cached on failure."""
    try:
        data = await live_service.get(key)
        await cache.set(key, data, ttl=3600)  # Update cache
        return data
    except Exception:
        cached = await cache.get(key)
        if cached:
            logger.warning("using_cached_data", key=key)
            return cached
        raise  # No cache available — propagate error
```

---

## Pattern 77.6: Resilience Layering

```
Correct layering order (outermost to innermost):

  Circuit Breaker
    └── Retry (with backoff)
         └── Timeout
              └── Actual call

Circuit breaker wraps retries — NOT the other way around.
If retries are outside circuit breaker, failed retries don't trip the breaker.
```

```python
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
async def _call_api_with_retry(url: str) -> dict:
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()


async def call_api_resilient(url: str) -> dict:
    """Full resilience stack: circuit breaker → retry → timeout."""
    try:
        return await api_breaker.call(_call_api_with_retry, url)
    except pybreaker.CircuitBreakerError:
        return await get_cached_fallback(url)
```

---

## MUST DO

- Separate liveness (no deps) from readiness (check deps)
- Use `asyncio.gather` for parallel health checks
- Implement circuit breaker for external API calls
- Use exponential backoff for retries (not fixed intervals)
- Layer: circuit breaker → retry → timeout → call
- Provide fallbacks (cache, defaults) when circuit is open

## MUST NOT DO

- Check external dependencies in liveness probe (causes unnecessary restarts)
- Retry non-idempotent operations (POST payments without idempotency key)
- Put retry outside circuit breaker (breaker never trips)
- Use unlimited retries (thundering herd on recovery)
- Treat cache failure as fatal (degrade, don't crash)
- Skip timeout on external calls (can hang indefinitely)

---

## References

- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [pybreaker](https://github.com/danielfm/pybreaker)
- [tenacity](https://tenacity.readthedocs.io/)
- [Release It! (Nygard)](https://pragprog.com/titles/mnee2/release-it-second-edition/)
