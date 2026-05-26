# Django Celery Specialist
# Django Celeryスペシャリスト
# Chuyen Gia Celery Django

**Stack**: Python 3.12+ / Django 5.x / Celery 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `config/celery.py`, `apps/{domain}/tasks.py` |
| **Variant** | ALL |
| **Naming Convention** | `tasks.py`, `@shared_task`, snake_case task names |
| **Imports From** | celery, Domain (models, services) |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | celery-config, shared-task, retry-backoff, result-backend, routing-queues, docker-compose, error-monitoring |
| **Pattern Numbers** | 35.1–35.7 |
| **Source Paths** | `config/celery.py`, `**/tasks.py` |
| **File Count** | 1 config + 1 per app with tasks |
| **Imported By** | Views, Services, Signals |
| **Specialist Type** | code |
| **Purpose** | Celery configuration, @shared_task definition, retry with exponential backoff, result backend (django-celery-results), task routing and priority queues, Docker Compose deployment, error handling and monitoring |
| **Activation Trigger** | celery, task, @shared_task, worker, background, async task |

---

## Purpose

Define Django Celery patterns: project-level Celery configuration with autodiscovery, task definition with @shared_task, retry with exponential backoff for resilience, result backend for status tracking, task routing for priority queues, Docker Compose for worker deployment, and error handling with monitoring.

---

## Pattern 35.1: Celery Configuration

```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("myproject")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

```python
# config/__init__.py
from config.celery import app as celery_app

__all__ = ["celery_app"]
```

```python
# settings.py
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes soft limit
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Fair scheduling
CELERY_TASK_ACKS_LATE = True  # Ack after execution (resilient)
```

---

## Pattern 35.2: Task Definition (@shared_task)

```python
# apps/notifications/tasks.py
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string


@shared_task(bind=True)
def send_email_task(self, to_email, subject, template_name, context):
    """Send email asynchronously."""
    html_content = render_to_string(template_name, context)
    send_mail(
        subject=subject,
        message="",
        from_email=None,  # Uses DEFAULT_FROM_EMAIL
        recipient_list=[to_email],
        html_message=html_content,
    )
```

```python
# apps/orders/tasks.py
@shared_task
def generate_invoice(order_id):
    """Generate invoice PDF for completed order."""
    from apps.orders.models import Order
    from apps.orders.services import InvoiceService

    order = Order.objects.get(pk=order_id)
    InvoiceService.generate_pdf(order)
```

```python
# Calling tasks
send_email_task.delay("user@example.com", "Welcome", "emails/welcome.html", {"name": "John"})

# With countdown (delay execution)
send_email_task.apply_async(
    args=["user@example.com", "Reminder", "emails/reminder.html", {}],
    countdown=3600,  # Execute after 1 hour
)

# With ETA (specific time)
from datetime import datetime, timedelta
send_email_task.apply_async(
    args=["user@example.com", "Scheduled", "emails/scheduled.html", {}],
    eta=datetime.utcnow() + timedelta(hours=24),
)
```

---

## Pattern 35.3: Retry with Exponential Backoff

```python
@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def call_external_api(self, url, payload):
    """Call external API with automatic retry and exponential backoff."""
    import requests

    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()
```

```python
# Manual retry with custom backoff
@shared_task(bind=True, max_retries=3)
def process_payment(self, order_id):
    """Process payment with manual retry control."""
    from apps.orders.models import Order

    try:
        order = Order.objects.get(pk=order_id)
        result = PaymentGateway.charge(order)
        order.payment_status = "paid"
        order.save(update_fields=["payment_status"])
        return result
    except PaymentGateway.TemporaryError as exc:
        # Exponential backoff: 60s, 120s, 240s
        countdown = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=countdown)
    except PaymentGateway.PermanentError:
        order.payment_status = "failed"
        order.save(update_fields=["payment_status"])
        raise  # Don't retry permanent errors
```

---

## Pattern 35.4: Result Backend

```bash
pip install django-celery-results
```

```python
# settings.py
INSTALLED_APPS = [
    "django_celery_results",
    # ...
]

CELERY_RESULT_BACKEND = "django-db"
CELERY_RESULT_EXTENDED = True  # Store task args, kwargs, worker info
```

```python
# Check task status
from celery.result import AsyncResult


def check_task_status(request, task_id):
    result = AsyncResult(task_id)
    return JsonResponse({
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    })
```

```python
# DRF endpoint for task status
class TaskStatusView(APIView):
    def get(self, request, task_id):
        result = AsyncResult(task_id)
        response = {
            "task_id": task_id,
            "status": result.status,
        }
        if result.ready():
            response["result"] = result.result
        if result.failed():
            response["error"] = str(result.result)
        return Response(response)
```

---

## Pattern 35.5: Task Routing and Queues

```python
# settings.py — Priority queues
from kombu import Queue

CELERY_TASK_QUEUES = [
    Queue("default", routing_key="default"),
    Queue("high_priority", routing_key="high"),
    Queue("low_priority", routing_key="low"),
    Queue("email", routing_key="email"),
]

CELERY_TASK_DEFAULT_QUEUE = "default"

CELERY_TASK_ROUTES = {
    "apps.notifications.tasks.send_email_task": {"queue": "email"},
    "apps.orders.tasks.process_payment": {"queue": "high_priority"},
    "apps.analytics.tasks.*": {"queue": "low_priority"},
}
```

```bash
# Start workers for specific queues
celery -A config worker -Q default,high_priority -c 4 --loglevel=info
celery -A config worker -Q email -c 2 --loglevel=info
celery -A config worker -Q low_priority -c 1 --loglevel=info
```

---

## Pattern 35.6: Docker Compose

```yaml
# docker-compose.yml
services:
  web:
    build: .
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    env_file: .env
    depends_on:
      - db
      - redis

  worker:
    build: .
    command: celery -A config worker --loglevel=info -c 4
    env_file: .env
    depends_on:
      - db
      - redis
    deploy:
      resources:
        limits:
          memory: 512M

  beat:
    build: .
    command: celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: .env
    depends_on:
      - db
      - redis

  flower:
    build: .
    command: celery -A config flower --port=5555
    ports:
      - "5555:5555"
    env_file: .env
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myproject
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Pattern 35.7: Error Handling and Monitoring

```python
# apps/core/tasks.py — Base task with error handling
from celery import Task
import logging

logger = logging.getLogger(__name__)


class BaseTaskWithErrorHandling(Task):
    """Base task class with logging and error callbacks."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            "Task %s[%s] failed: %s",
            self.name,
            task_id,
            exc,
            exc_info=True,
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_success(self, retval, task_id, args, kwargs):
        logger.info("Task %s[%s] completed successfully.", self.name, task_id)

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning("Task %s[%s] retrying: %s", self.name, task_id, exc)
```

```python
# Usage
@shared_task(base=BaseTaskWithErrorHandling, bind=True, max_retries=3)
def critical_task(self, data):
    # Task implementation
    pass
```

```python
# Sentry integration
# pip install sentry-sdk
import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=env("SENTRY_DSN"),
    integrations=[DjangoIntegration(), CeleryIntegration()],
    traces_sample_rate=0.1,
)
```

---

## MUST DO

- Use `@shared_task` (not `@app.task`) for reusable tasks
- Use `bind=True` for access to `self.retry()` and `self.request`
- Set `CELERY_TASK_ACKS_LATE = True` for resilience
- Run workers in separate containers from web
- Use django-celery-results for task status tracking

## MUST NOT DO

- Run long tasks in the HTTP request cycle (use `.delay()`)
- Skip retry for critical tasks (payments, notifications)
- Run workers in the same container as the web server
- Use `@app.task` instead of `@shared_task` (breaks reusability)
- Pass large objects as task arguments (pass IDs, query in task)

---

## References

- [Celery: Getting started with Django](https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html)
- [django-celery-results](https://github.com/celery/django-celery-results)
- [Celery: Configuration](https://docs.celeryq.dev/en/stable/userguide/configuration.html)
