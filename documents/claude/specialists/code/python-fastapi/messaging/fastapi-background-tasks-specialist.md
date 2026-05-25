# FastAPI Background Tasks Specialist
# FastAPIバックグラウンドタスクスペシャリスト
# Chuyen Gia Tac Vu Nen FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/tasks.py`, `src/workers/` |
| **Variant** | ALL |
| **Naming Convention** | `tasks.py`, `worker.py`, `celery_app.py` |
| **Imports From** | Domain (models), Infrastructure (repositories, external) |
| **Cannot Import** | Presentation (routers) |
| **Dependencies** | `arq` (async), `celery` (traditional), `dramatiq` (alternative) |
| **When To Use** | Background job processing, async task queues |
| **Source Skeleton** | `src/core/tasks.py`, `src/{domain}/tasks.py`, `docker-compose.yml` (worker service) |
| **Pattern Numbers** | 40.1–40.7 |
| **Source Paths** | `**/tasks.py`, `**/workers/**/*.py`, `**/celery_app.py` |
| **File Count** | 1-3 per project |
| **Imported By** | Presentation (routes trigger tasks) |
| **Specialist Type** | code |
| **Purpose** | BackgroundTasks built-in, ARQ async queue, Celery integration, task status tracking, Docker worker setup, Dramatiq, comparison table |
| **Activation Trigger** | background_tasks, celery, arq, task queue, worker, async task, periodic |

---

## Purpose

Define background task patterns for FastAPI: built-in BackgroundTasks for lightweight fire-and-forget, ARQ for async Redis queues, Celery for production distributed tasks, task status polling endpoints, Docker Compose worker setup, Dramatiq actor-based tasks, and comparison guidance.

---

## Pattern 40.1: FastAPI BackgroundTasks (Built-in)

```python
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, EmailStr


router = APIRouter(prefix="/users", tags=["users"])


async def send_welcome_email(email: str, name: str) -> None:
    """Lightweight background task — runs after response is sent."""
    # Simulate email sending
    import aiosmtplib
    # ... send email logic


async def log_user_creation(user_id: int) -> None:
    """Another background task — runs sequentially after first."""
    # ... audit log


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str


@router.post("/", status_code=201)
async def create_user(
    payload: UserCreate,
    background_tasks: BackgroundTasks,
):
    user = await user_service.create(payload)

    # Tasks run AFTER response is sent, in order
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)
    background_tasks.add_task(log_user_creation, user.id)

    return user  # Response sent immediately
```

**When to use BackgroundTasks**:
- Execution time < 5 seconds
- No retry/status tracking needed
- Fire-and-forget (email, logging, webhooks)
- Single process (no distributed workers)

**Key rules**:
- Tasks run in the same process, same event loop
- If process crashes, task is lost (no persistence)
- Tasks run sequentially (add order matters)

> Source: derekmizak/Copilot-RuleSet-FastApi (fastapi-performance)

---

## Pattern 40.2: ARQ (Async Redis Queue)

```python
# src/workers/arq_worker.py
from arq import create_pool
from arq.connections import RedisSettings

from src.core.config import settings


async def send_email_task(ctx: dict, email: str, subject: str, body: str):
    """ARQ task — fully async, runs in worker process."""
    async with get_email_client() as client:
        await client.send(to=email, subject=subject, body=body)


async def generate_report_task(ctx: dict, report_id: int):
    """Long-running task with status updates."""
    redis = ctx["redis"]
    await redis.set(f"report:{report_id}:status", "processing")

    # ... generate report
    await redis.set(f"report:{report_id}:status", "completed")


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [send_email_task, generate_report_task]
    redis_settings = RedisSettings(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
    )
    max_jobs = 10
    job_timeout = 300  # 5 minutes
    retry_jobs = True
    max_tries = 3

    # Cron jobs
    cron_jobs = [
        # cron(cleanup_old_reports, hour=2, minute=0),  # Daily at 2 AM
    ]
```

**Enqueue from FastAPI**:
```python
from arq import create_pool
from arq.connections import RedisSettings


async def get_arq_pool():
    return await create_pool(RedisSettings())


@router.post("/reports")
async def create_report(payload: ReportCreate):
    pool = await get_arq_pool()
    job = await pool.enqueue_job(
        "generate_report_task",
        report_id=payload.id,
    )
    return {"job_id": job.job_id, "status": "queued"}
```

**Run worker**: `arq src.workers.arq_worker.WorkerSettings`

**Key rules**:
- ARQ is fully async (unlike Celery which is sync-first)
- Best for Python async ecosystems (FastAPI, httpx, asyncpg)
- Redis-only (no RabbitMQ/other backends)

---

## Pattern 40.3: Celery Integration

```python
# src/workers/celery_app.py
from celery import Celery

from src.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,     # redis://localhost:6379/0
    backend=settings.CELERY_RESULT_BACKEND, # redis://localhost:6379/1
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,       # Ack after completion (prevents lost tasks on crash)
    worker_prefetch_multiplier=1,  # Fair distribution
)

# Auto-discover tasks in all modules
celery_app.autodiscover_tasks(["src.users.tasks", "src.reports.tasks"])
```

```python
# src/users/tasks.py
from src.workers.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: int):
    """Celery task — sync execution in worker process."""
    try:
        user = get_user_sync(user_id)  # Sync DB call
        send_email_sync(user.email, "Welcome!")
    except Exception as exc:
        self.retry(exc=exc)
```

**Enqueue from FastAPI**:
```python
@router.post("/users")
async def create_user(payload: UserCreate):
    user = await user_service.create(payload)
    # .delay() sends task to Celery broker
    send_welcome_email.delay(user.id)
    return user
```

**Celery Beat (periodic tasks)**:
```python
celery_app.conf.beat_schedule = {
    "cleanup-expired-tokens": {
        "task": "src.auth.tasks.cleanup_expired_tokens",
        "schedule": 3600.0,  # Every hour
    },
    "generate-daily-report": {
        "task": "src.reports.tasks.daily_report",
        "schedule": crontab(hour=6, minute=0),  # Daily at 6 AM
    },
}
```

---

## Pattern 40.4: Task Status Endpoint

```python
from celery.result import AsyncResult

from src.workers.celery_app import celery_app


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Poll task status — works with Celery or ARQ."""
    result = AsyncResult(task_id, app=celery_app)

    response = {
        "task_id": task_id,
        "status": result.status,  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
    }

    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.result)

    return response
```

**Client polling pattern**:
```javascript
// POST /reports → {task_id: "abc-123"}
// GET /tasks/abc-123 → {status: "STARTED"}
// GET /tasks/abc-123 → {status: "SUCCESS", result: {...}}
```

---

## Pattern 40.5: Docker Compose (Web + Worker + Beat)

```yaml
services:
  api:
    build: .
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000
    ports: ["8000:8000"]
    depends_on: [redis]

  worker:
    build: .
    command: celery -A src.workers.celery_app worker --loglevel=info --concurrency=4
    depends_on: [redis]

  beat:
    build: .
    command: celery -A src.workers.celery_app beat --loglevel=info
    depends_on: [redis]

  flower:
    build: .
    command: celery -A src.workers.celery_app flower --port=5555
    ports: ["5555:5555"]
    depends_on: [worker]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

**For ARQ**:
```yaml
  arq-worker:
    build: .
    command: arq src.workers.arq_worker.WorkerSettings
    depends_on: [redis]
```

---

## Pattern 40.6: Dramatiq (Actor-Based)

```python
# pip install dramatiq[redis]
import dramatiq
from dramatiq.brokers.redis import RedisBroker

redis_broker = RedisBroker(url="redis://localhost:6379")
dramatiq.set_broker(redis_broker)


@dramatiq.actor(max_retries=3, min_backoff=1000)
def process_order(order_id: int):
    """Dramatiq actor — similar to Celery task."""
    order = get_order_sync(order_id)
    # ... process


# Enqueue
process_order.send(order_id=123)

# With delay
process_order.send_with_options(args=(123,), delay=60_000)  # 60s delay
```

---

## Pattern 40.7: Comparison Table

| Factor | BackgroundTasks | ARQ | Celery | Dramatiq |
|--------|----------------|-----|--------|----------|
| **Async native** | Yes | Yes | No (sync) | No (sync) |
| **Persistence** | No (in-process) | Redis | Redis/RabbitMQ | Redis/RabbitMQ |
| **Retry** | No | Yes | Yes | Yes |
| **Status tracking** | No | Yes | Yes (AsyncResult) | Yes |
| **Periodic/cron** | No | Yes (built-in) | Yes (Beat) | Yes (APScheduler) |
| **Monitoring** | No | No | Flower | dramatiq-dashboard |
| **Broker** | None | Redis only | Redis/RabbitMQ/SQS | Redis/RabbitMQ |
| **Best for** | Quick (<5s) | Async Python | Large-scale | Simple reliable |
| **Maturity** | Built-in | Moderate | Battle-tested | Growing |

**Decision guide**:
- **< 5s, no retry**: BackgroundTasks
- **Async Python, Redis**: ARQ
- **Large scale, monitoring**: Celery
- **Simple, reliable**: Dramatiq

---

## MUST DO

- Use BackgroundTasks only for lightweight, fire-and-forget operations
- Use task queues (ARQ/Celery) for anything needing retry or persistence
- Set `task_acks_late=True` in Celery (prevents lost tasks on crash)
- Provide task status endpoints for long-running operations
- Set timeouts on all tasks
- Use separate Docker services for workers

## MUST NOT DO

- Use BackgroundTasks for operations > 5 seconds
- Call async code directly in Celery tasks (Celery is sync)
- Skip retry configuration for critical tasks
- Run workers in the same process as the API in production
- Forget to set `worker_prefetch_multiplier=1` for fair task distribution
- Store large payloads in task arguments (pass IDs, fetch in worker)

---

## References

- [FastAPI: Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [ARQ Documentation](https://arq-docs.helpmanual.io/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [Dramatiq Documentation](https://dramatiq.io/)
- [derekmizak: Performance Patterns](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
