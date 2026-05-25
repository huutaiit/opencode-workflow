# Django Migrations Specialist
# Djangoマイグレーションスペシャリスト
# Chuyen Gia Migration Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `apps/{domain}/migrations/` |
| **Variant** | ALL |
| **Naming Convention** | Auto-generated `0001_initial.py`, `0002_*.py` |
| **Imports From** | N/A |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | migration-workflow, data-migrations, squash, zero-downtime, custom-operations, troubleshooting |
| **Pattern Numbers** | 2.15–2.20 |
| **Source Paths** | `**/migrations/*.py` |
| **File Count** | Multiple per app |
| **Imported By** | Django migration framework |
| **Specialist Type** | code |
| **Purpose** | Migration workflow, data migrations with RunPython, squash, zero-downtime strategies, custom operations, troubleshooting |
| **Activation Trigger** | migration, makemigrations, migrate, squashmigrations, RunPython, schema change |

---

## Purpose

Define Django migration patterns: standard workflow, data migrations with RunPython and reverse functions, squashing for performance, zero-downtime deployment strategies, custom SQL operations, and common troubleshooting.

---

## Pattern 2.15: Migration Workflow

```bash
# 1. Make changes to models.py
# 2. Generate migration
python manage.py makemigrations

# 3. Review generated migration (ALWAYS review!)
# 4. Apply
python manage.py migrate

# CI: Check for missing migrations
python manage.py makemigrations --check --dry-run
python manage.py migrate --check  # Verify all applied
```

---

## Pattern 2.16: Data Migrations (RunPython)

```python
from django.db import migrations


def populate_slug(apps, schema_editor):
    """Forward: Generate slugs from titles."""
    Article = apps.get_model("articles", "Article")
    from django.utils.text import slugify
    for article in Article.objects.filter(slug=""):
        article.slug = slugify(article.title)
        article.save(update_fields=["slug"])


def reverse_slug(apps, schema_editor):
    """Reverse: Clear slugs (safe to re-run forward)."""
    Article = apps.get_model("articles", "Article")
    Article.objects.update(slug="")


class Migration(migrations.Migration):
    dependencies = [("articles", "0002_article_slug")]

    operations = [
        migrations.RunPython(populate_slug, reverse_slug),
    ]
```

**Key rules**:
- Use `apps.get_model()` (not direct import — migration state may differ)
- Always provide `reverse_func` (enables rollback)
- Keep data migrations small and idempotent

---

## Pattern 2.17: Squash Migrations

```bash
# Squash migrations 0001-0010 into one
python manage.py squashmigrations myapp 0001 0010

# Result: 0001_squashed_0010_*.py
# Old migrations kept until fully applied on all environments
```

**When to squash**: >20 migrations per app, CI migration time >30s.

---

## Pattern 2.18: Zero-Downtime Migrations

```python
# Problem: Adding NOT NULL column locks table

# Step 1: Add nullable column (no lock)
# Migration 0003:
migrations.AddField("article", "category_id", models.IntegerField(null=True))

# Step 2: Backfill data (RunPython)
# Migration 0004:
def backfill(apps, schema_editor):
    Article = apps.get_model("articles", "Article")
    default_cat = apps.get_model("categories", "Category").objects.first()
    Article.objects.filter(category_id=None).update(category_id=default_cat.id)

migrations.RunPython(backfill, migrations.RunPython.noop)

# Step 3: Make non-null (safe after backfill)
# Migration 0005:
migrations.AlterField("article", "category_id", models.IntegerField(null=False))
```

---

## Pattern 2.19: Custom SQL Operations

```python
class Migration(migrations.Migration):
    operations = [
        # Create index concurrently (PostgreSQL — no table lock)
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY idx_article_title ON articles_article (title);",
            reverse_sql="DROP INDEX IF EXISTS idx_article_title;",
            state_operations=[],  # Django doesn't track this index
        ),
    ]
```

---

## Pattern 2.20: Troubleshooting

```bash
# Show migration status
python manage.py showmigrations

# Fake migration (mark as applied without running)
python manage.py migrate myapp 0005 --fake

# Rollback to specific migration
python manage.py migrate myapp 0003

# Reset app migrations (DANGEROUS — dev only)
python manage.py migrate myapp zero
```

---

## MUST DO

- Review generated migrations before applying
- Always provide reverse function in RunPython
- Use `apps.get_model()` in data migrations (not direct imports)
- Check for missing migrations in CI
- Use 3-step pattern for zero-downtime NOT NULL additions

## MUST NOT DO

- Edit squashed migrations
- Skip reverse functions (prevents rollback)
- Import models directly in migrations
- Run migrations during deploy without testing first
- Use `--fake` in production without understanding consequences

---

## References

- [Django: Migrations](https://docs.djangoproject.com/en/5.0/topics/migrations/)
- [Django: Data Migrations](https://docs.djangoproject.com/en/5.0/topics/migrations/#data-migrations)
- [Django: Squashing](https://docs.djangoproject.com/en/5.0/topics/migrations/#squashing-migrations)
