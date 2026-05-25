# Django Celery Beat Specialist
# Django Celery Beatスペシャリスト
# Chuyen Gia Celery Beat Django

**Stack**: Python 3.12+ / Django 5.x / Celery 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `config/settings/`, `apps/{domain}/tasks.py` |
| **Variant** | ALL |
| **Naming Convention** | Periodic tasks in admin or settings |
| **Imports From** | celery.schedules, django_celery_beat |
| **Cannot Import** | Views |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | beat-setup, admin-schedules, programmatic-schedule, solar-schedule, beat-production |
| **Pattern Numbers** | 35.8–35.12 |
| **Source Paths** | `**/settings.py`, `**/tasks.py` |
| **File Count** | Settings + management commands |
| **Imported By** | — (Celery Beat scheduler) |
| **Specialist Type** | code |
| **Purpose** | django-celery-beat setup, periodic tasks via admin UI, programmatic schedule creation, solar schedules, production Beat deployment (single instance) |
| **Activation Trigger** | celery beat, periodic, crontab, schedule, recurring, PeriodicTask |

---

## Purpose

Define Django Celery Beat patterns: database-backed periodic task scheduler setup, managing schedules via Django admin, programmatic schedule creation via management commands, solar schedules for time-of-day tasks, and production deployment with single Beat instance constraint.

---

## Pattern 35.8: django-celery-beat Setup

```bash
pip install django-celery-beat
```

```python
# settings.py
INSTALLED_APPS = [
    "django_celery_beat",
    # ...
]

# Use database scheduler instead of file-based
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
```

```bash
# Run migrations for beat tables
python manage.py migrate django_celery_beat

# Start beat with database scheduler
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

---

## Pattern 35.9: Periodic Tasks (Admin UI)

```python
# Tasks are managed via Django admin:
# /admin/django_celery_beat/periodictask/
# /admin/django_celery_beat/crontabschedule/
# /admin/django_celery_beat/intervalschedule/

# Admin allows creating:
# 1. Interval schedules (every N seconds/minutes/hours/days)
# 2. Crontab schedules (minute/hour/day_of_week/day_of_month/month_of_year)
# 3. Solar schedules (sunrise/sunset)
# 4. Clocked schedules (one-time at specific datetime)

# Each periodic task specifies:
# - Task name (dotted path to @shared_task)
# - Schedule (interval, crontab, solar, or clocked)
# - Arguments (JSON)
# - Keyword arguments (JSON)
# - Queue (optional)
# - Enabled/disabled toggle
```

```python
# Example tasks that can be scheduled via admin
# apps/analytics/tasks.py
from celery import shared_task


@shared_task
def generate_daily_report():
    """Generate daily analytics report — schedule: every day at 2am."""
    from apps.analytics.services import ReportService
    ReportService.generate_daily()


@shared_task
def cleanup_expired_sessions():
    """Remove expired sessions — schedule: every day at 3am."""
    from django.core.management import call_command
    call_command("clearsessions")


@shared_task
def sync_inventory():
    """Sync inventory with external system — schedule: every 30 minutes."""
    from apps.products.services import InventoryService
    InventoryService.sync_from_erp()
```

---

## Pattern 35.10: Programmatic Schedule Creation

```python
# apps/core/management/commands/setup_schedules.py
from django.core.management.base import BaseCommand
from django_celery_beat.models import (
    CrontabSchedule,
    IntervalSchedule,
    PeriodicTask,
)
import json


class Command(BaseCommand):
    help = "Create or update periodic task schedules (idempotent)."

    def handle(self, *args, **options):
        self.setup_crontab_tasks()
        self.setup_interval_tasks()
        self.stdout.write(self.style.SUCCESS("Schedules configured."))

    def setup_crontab_tasks(self):
        """Crontab-based schedules."""
        tasks = [
            {
                "name": "Daily Report",
                "task": "apps.analytics.tasks.generate_daily_report",
                "crontab": {"minute": "0", "hour": "2"},
            },
            {
                "name": "Cleanup Sessions",
                "task": "apps.analytics.tasks.cleanup_expired_sessions",
                "crontab": {"minute": "0", "hour": "3"},
            },
            {
                "name": "Weekly Digest",
                "task": "apps.notifications.tasks.send_weekly_digest",
                "crontab": {"minute": "0", "hour": "9", "day_of_week": "1"},  # Monday 9am
            },
        ]

        for task_config in tasks:
            crontab, _ = CrontabSchedule.objects.get_or_create(
                **task_config["crontab"],
                defaults={"timezone": "UTC"},
            )
            task, created = PeriodicTask.objects.update_or_create(
                name=task_config["name"],
                defaults={
                    "task": task_config["task"],
                    "crontab": crontab,
                    "enabled": True,
                },
            )
            status = "created" if created else "updated"
            self.stdout.write(f"  {task.name}: {status}")

    def setup_interval_tasks(self):
        """Interval-based schedules."""
        # Every 30 minutes
        interval_30m, _ = IntervalSchedule.objects.get_or_create(
            every=30,
            period=IntervalSchedule.MINUTES,
        )

        PeriodicTask.objects.update_or_create(
            name="Sync Inventory",
            defaults={
                "task": "apps.products.tasks.sync_inventory",
                "interval": interval_30m,
                "enabled": True,
            },
        )
```

```python
# Create one-time scheduled task programmatically
from django_celery_beat.models import ClockedSchedule, PeriodicTask
from django.utils import timezone
import json


def schedule_one_time_task(task_name, run_at, args=None, kwargs=None):
    """Schedule a task to run once at a specific time."""
    clocked, _ = ClockedSchedule.objects.get_or_create(
        clocked_time=run_at,
    )
    return PeriodicTask.objects.create(
        name=f"{task_name}_{run_at.isoformat()}",
        task=task_name,
        clocked=clocked,
        one_off=True,
        args=json.dumps(args or []),
        kwargs=json.dumps(kwargs or {}),
        enabled=True,
    )


# Usage
schedule_one_time_task(
    "apps.notifications.tasks.send_email_task",
    run_at=timezone.now() + timezone.timedelta(hours=24),
    kwargs={"to_email": "user@example.com", "subject": "Reminder"},
)
```

---

## Pattern 35.11: Solar Schedules

```python
# Solar schedules — based on sunrise/sunset at a location
from django_celery_beat.models import SolarSchedule, PeriodicTask


def setup_solar_schedules():
    """Schedule tasks based on sun position (IoT, agriculture, energy)."""

    # Turn on lights at sunset
    sunset, _ = SolarSchedule.objects.get_or_create(
        event="sunset",
        latitude=35.6762,   # Tokyo
        longitude=139.6503,
    )
    PeriodicTask.objects.update_or_create(
        name="Turn on lights at sunset",
        defaults={
            "task": "apps.iot.tasks.turn_on_lights",
            "solar": sunset,
            "enabled": True,
        },
    )

    # Start irrigation at dawn
    dawn, _ = SolarSchedule.objects.get_or_create(
        event="dawn_astronomical",
        latitude=35.6762,
        longitude=139.6503,
    )
    PeriodicTask.objects.update_or_create(
        name="Start irrigation at dawn",
        defaults={
            "task": "apps.agriculture.tasks.start_irrigation",
            "solar": dawn,
            "enabled": True,
        },
    )
```

Available solar events: `dawn_astronomical`, `dawn_nautical`, `dawn_civil`, `sunrise`, `solar_noon`, `sunset`, `dusk_civil`, `dusk_nautical`, `dusk_astronomical`.

---

## Pattern 35.12: Beat in Production

```yaml
# docker-compose.yml — CRITICAL: Only ONE beat instance
services:
  beat:
    build: .
    command: celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: .env
    depends_on:
      - db
      - redis
    deploy:
      replicas: 1  # MUST be exactly 1
      resources:
        limits:
          memory: 256M
    restart: unless-stopped
```

```python
# Kubernetes — single replica with leader election
# k8s/beat-deployment.yaml
"""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-beat
spec:
  replicas: 1  # MUST be 1 — multiple beats = duplicate tasks
  strategy:
    type: Recreate  # Not RollingUpdate — avoid 2 beats running simultaneously
  selector:
    matchLabels:
      app: celery-beat
  template:
    spec:
      containers:
        - name: beat
          image: myapp:latest
          command: ["celery", "-A", "config", "beat", "--loglevel=info",
                    "--scheduler", "django_celery_beat.schedulers:DatabaseScheduler"]
"""
```

```python
# Health check for beat process
# apps/core/management/commands/check_beat.py
from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask
from django.utils import timezone


class Command(BaseCommand):
    help = "Check if Celery Beat is running (for health checks)."

    def handle(self, *args, **options):
        # Check if schedules exist and last run is recent
        recent = PeriodicTask.objects.filter(
            enabled=True,
            last_run_at__gte=timezone.now() - timezone.timedelta(hours=1),
        ).count()

        total = PeriodicTask.objects.filter(enabled=True).count()
        self.stdout.write(f"Active tasks: {total}, recently run: {recent}")

        if total > 0 and recent == 0:
            self.stderr.write(self.style.ERROR("Beat may not be running!"))
            exit(1)
```

---

## MUST DO

- Use DatabaseScheduler (not file-based) in production
- Run **exactly one** Beat instance (multiple = duplicate tasks)
- Use `Recreate` strategy in Kubernetes (not `RollingUpdate`)
- Use management commands to seed schedules (idempotent)
- Set `one_off=True` for single-execution clocked tasks

## MUST NOT DO

- Run multiple Beat processes (causes duplicate task execution)
- Use file-based scheduler in production (doesn't sync across processes)
- Create schedules manually in production DB (use management commands)
- Skip monitoring Beat process health
- Forget to run `migrate django_celery_beat` after installation

---

## References

- [django-celery-beat](https://django-celery-beat.readthedocs.io/)
- [Celery: Periodic tasks](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html)
