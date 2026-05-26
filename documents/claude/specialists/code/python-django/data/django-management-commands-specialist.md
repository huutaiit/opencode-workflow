# Django Management Commands Specialist
# Django管理コマンドスペシャリスト
# Chuyen Gia Management Commands Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `apps/{domain}/management/commands/{command}.py` |
| **Variant** | ALL |
| **Naming Convention** | `snake_case.py`, inherits `BaseCommand` |
| **Imports From** | django.core.management.base, Domain (models) |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | basic-command, progress-output, idempotent, call-command, cron-integration |
| **Pattern Numbers** | 22.1–22.5 |
| **Source Paths** | `**/management/commands/*.py` |
| **File Count** | 1 per command |
| **Imported By** | — (invoked via manage.py) |
| **Specialist Type** | code |
| **Purpose** | BaseCommand structure with arguments, progress output with styling, idempotent seed/import commands, programmatic call_command, cron scheduling (django-crontab, Celery Beat, K8s) |
| **Activation Trigger** | management command, manage.py, BaseCommand, handle, call_command |

---

## Purpose

Define Django management command patterns: basic command structure with arguments and options, progress output with styled messages, idempotent commands safe to run multiple times, programmatic invocation with call_command, and cron scheduling via django-crontab, Celery Beat, or Kubernetes CronJobs.

---

## Pattern 22.1: Basic Command Structure

```python
# apps/articles/management/commands/publish_scheduled.py
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.articles.models import Article


class Command(BaseCommand):
    help = "Publish articles that are scheduled for publication."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without making changes.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Max articles to publish (default: 100).",
        )
        parser.add_argument(
            "category_slugs",
            nargs="*",
            type=str,
            help="Optional category slugs to filter.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        categories = options["category_slugs"]

        queryset = Article.objects.filter(
            status="scheduled",
            publish_at__lte=timezone.now(),
        )

        if categories:
            queryset = queryset.filter(category__slug__in=categories)

        articles = queryset[:limit]
        count = articles.count()

        if count == 0:
            self.stdout.write(self.style.WARNING("No articles to publish."))
            return

        if dry_run:
            self.stdout.write(self.style.NOTICE(f"[DRY RUN] Would publish {count} articles."))
            for article in articles:
                self.stdout.write(f"  - {article.title} (scheduled: {article.publish_at})")
            return

        updated = queryset[:limit].update(status="published", published_at=timezone.now())
        self.stdout.write(self.style.SUCCESS(f"Published {updated} articles."))
```

```bash
# Usage
python manage.py publish_scheduled
python manage.py publish_scheduled --dry-run
python manage.py publish_scheduled --limit 10 tech news
```

---

## Pattern 22.2: Command with Progress Output

```python
# apps/products/management/commands/import_products.py
import csv
from django.core.management.base import BaseCommand
from apps.products.models import Product, Category


class Command(BaseCommand):
    help = "Import products from CSV file."

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to CSV file.")
        parser.add_argument(
            "--skip-header",
            action="store_true",
            default=True,
            help="Skip first row as header.",
        )

    def handle(self, *args, **options):
        csv_path = options["csv_file"]
        verbosity = options["verbosity"]

        try:
            with open(csv_path, "r") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
        except FileNotFoundError:
            raise CommandError(f"File not found: {csv_path}")

        total = len(rows)
        created = 0
        updated = 0
        errors = 0

        for i, row in enumerate(rows, start=1):
            try:
                category, _ = Category.objects.get_or_create(name=row["category"])
                _, was_created = Product.objects.update_or_create(
                    sku=row["sku"],
                    defaults={
                        "name": row["name"],
                        "price": row["price"],
                        "category": category,
                        "stock": row.get("stock", 0),
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            except Exception as e:
                errors += 1
                if verbosity >= 2:
                    self.stderr.write(self.style.ERROR(f"Row {i}: {e}"))

            # Progress output every 100 rows
            if verbosity >= 1 and i % 100 == 0:
                self.stdout.write(f"  Processed {i}/{total}...")

        self.stdout.write(self.style.SUCCESS(
            f"Done: {created} created, {updated} updated, {errors} errors (total: {total})"
        ))
```

---

## Pattern 22.3: Idempotent Commands

```python
# apps/core/management/commands/seed_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission


class Command(BaseCommand):
    help = "Seed initial data (groups, permissions, default settings). Safe to run multiple times."

    def handle(self, *args, **options):
        self.seed_groups()
        self.seed_site_settings()
        self.stdout.write(self.style.SUCCESS("Seed data applied."))

    def seed_groups(self):
        """Create groups with permissions (idempotent)."""
        groups_config = {
            "editors": [
                "add_article", "change_article", "view_article", "can_publish",
            ],
            "moderators": [
                "view_article", "change_article", "can_moderate",
            ],
            "viewers": [
                "view_article", "view_category",
            ],
        }

        for group_name, perm_codenames in groups_config.items():
            group, created = Group.objects.get_or_create(name=group_name)
            perms = Permission.objects.filter(codename__in=perm_codenames)
            group.permissions.set(perms)

            status = "created" if created else "updated"
            self.stdout.write(f"  Group '{group_name}' {status} ({perms.count()} perms)")

    def seed_site_settings(self):
        """Create default site settings (idempotent)."""
        from apps.core.models import SiteSettings

        settings, created = SiteSettings.objects.get_or_create(
            pk=1,
            defaults={
                "site_name": "My Project",
                "maintenance_mode": False,
                "items_per_page": 25,
            },
        )
        if created:
            self.stdout.write("  SiteSettings created with defaults.")
        else:
            self.stdout.write("  SiteSettings already exists — skipped.")
```

**Key rule**: Always use `get_or_create` / `update_or_create`. Never assume a clean database.

---

## Pattern 22.4: Programmatic call_command

```python
# scripts/deploy.py or apps/core/management/commands/full_deploy.py
from django.core.management import call_command
from io import StringIO


class Command(BaseCommand):
    help = "Run full deployment steps."

    def handle(self, *args, **options):
        steps = [
            ("migrate", {"verbosity": 1}),
            ("collectstatic", {"interactive": False, "verbosity": 0}),
            ("seed_data", {}),
        ]

        for cmd, kwargs in steps:
            self.stdout.write(f"Running: {cmd}...")
            out = StringIO()
            try:
                call_command(cmd, stdout=out, **kwargs)
                self.stdout.write(self.style.SUCCESS(f"  {cmd} ✓"))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"  {cmd} FAILED: {e}"))
                raise
```

```python
# In tests — run commands programmatically
from django.core.management import call_command
from io import StringIO


def test_publish_scheduled():
    out = StringIO()
    call_command("publish_scheduled", "--dry-run", stdout=out)
    assert "Would publish" in out.getvalue()
```

---

## Pattern 22.5: Cron Integration

```python
# Option A: django-crontab
# pip install django-crontab

# settings.py
INSTALLED_APPS = ["django_crontab", ...]

CRONJOBS = [
    ("*/5 * * * *", "django.core.management.call_command", ["publish_scheduled"]),
    ("0 2 * * *", "django.core.management.call_command", ["cleanup_expired_sessions"]),
    ("0 0 * * 0", "django.core.management.call_command", ["weekly_report"]),
]
```

```bash
# Install/remove cron entries
python manage.py crontab add
python manage.py crontab remove
python manage.py crontab show
```

```python
# Option B: Celery Beat (recommended for distributed systems)
# apps/core/tasks.py
from celery import shared_task
from django.core.management import call_command


@shared_task
def publish_scheduled_task():
    call_command("publish_scheduled")


@shared_task
def cleanup_sessions_task():
    call_command("clearsessions")
```

```python
# settings.py — Celery Beat schedule
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "publish-scheduled": {
        "task": "apps.core.tasks.publish_scheduled_task",
        "schedule": crontab(minute="*/5"),
    },
    "cleanup-sessions": {
        "task": "apps.core.tasks.cleanup_sessions_task",
        "schedule": crontab(hour=2, minute=0),
    },
}
```

```yaml
# Option C: Kubernetes CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: publish-scheduled
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: django
              image: myapp:latest
              command: ["python", "manage.py", "publish_scheduled"]
          restartPolicy: OnFailure
```

---

## MUST DO

- Make all seed/import commands idempotent (safe to run multiple times)
- Use `self.stdout.write` and `self.style` for output (never `print()`)
- Respect `verbosity` option for output level control
- Use `--dry-run` flag for destructive or bulk operations
- Handle errors gracefully with meaningful messages

## MUST NOT DO

- Use `print()` instead of `self.stdout.write`
- Create non-idempotent seed commands (crash on second run)
- Skip argument validation (use `CommandError` for bad inputs)
- Run slow operations synchronously without progress output
- Hardcode file paths or environment-specific values

---

## References

- [Django: Writing management commands](https://docs.djangoproject.com/en/5.0/howto/custom-management-commands/)
- [Django: call_command](https://docs.djangoproject.com/en/5.0/ref/django-admin/#running-management-commands-from-your-code)
- [django-crontab](https://github.com/kraiz/django-crontab)
