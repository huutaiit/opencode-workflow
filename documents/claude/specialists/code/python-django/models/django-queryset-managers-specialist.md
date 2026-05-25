# Django QuerySet & Managers Specialist
# Django QuerySet・マネージャースペシャリスト
# Chuyen Gia QuerySet va Manager Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `apps/{domain}/models.py`, `apps/{domain}/managers.py` |
| **Variant** | ALL |
| **Naming Convention** | `managers.py` or inline in `models.py` |
| **Imports From** | N/A (foundation) |
| **Cannot Import** | Presentation |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | queryset-chaining, custom-manager, f-expressions, q-objects, subquery, annotations, raw-sql |
| **Pattern Numbers** | 2.1–2.7 |
| **Source Paths** | `**/models.py`, `**/managers.py` |
| **File Count** | 1 per app |
| **Imported By** | Views, Serializers, Services |
| **Specialist Type** | code |
| **Purpose** | QuerySet API chaining, custom Manager/QuerySet, F/Q expressions, Subquery, annotations, aggregations, raw SQL |
| **Activation Trigger** | QuerySet, filter, exclude, annotate, aggregate, Manager, F, Q |

---

## Purpose

Define Django QuerySet and Manager patterns: lazy evaluation and chaining, custom Manager and QuerySet for reusable queries, F expressions for DB-level operations, Q objects for complex lookups, Subquery for correlated queries, annotations/aggregations for reports, and raw SQL escape hatch.

---

## Pattern 2.1: QuerySet Chaining (Lazy Evaluation)

```python
# QuerySets are LAZY — not executed until evaluated
qs = Article.objects.filter(status="published")  # No DB hit
qs = qs.exclude(author__is_staff=True)            # Still no DB hit
qs = qs.order_by("-created_at")                   # Still no DB hit
qs = qs[:10]                                       # Still no DB hit

# DB hit happens on evaluation:
list(qs)           # Iteration
len(qs)            # Count (use .count() instead)
qs[0]              # Indexing
bool(qs)           # Boolean (use .exists() instead)
for a in qs: ...   # Iteration

# Efficient checks
if qs.exists():    # SELECT 1 LIMIT 1 (fast)
    count = qs.count()  # SELECT COUNT(*) (no full load)
```

---

## Pattern 2.2: Custom Manager + QuerySet

```python
from django.db import models


class ArticleQuerySet(models.QuerySet):
    """Chainable query methods."""

    def published(self):
        return self.filter(status="published")

    def by_author(self, user):
        return self.filter(author=user)

    def recent(self, days=7):
        from django.utils import timezone
        cutoff = timezone.now() - timezone.timedelta(days=days)
        return self.filter(created_at__gte=cutoff)

    def with_comment_count(self):
        return self.annotate(comment_count=models.Count("comments"))


class ArticleManager(models.Manager):
    def get_queryset(self):
        return ArticleQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()


class Article(models.Model):
    objects = ArticleManager()
    # Or shortcut: objects = ArticleQuerySet.as_manager()

# Usage — chainable!
Article.objects.published().by_author(user).recent(30).with_comment_count()
```

---

## Pattern 2.3: F Expressions

```python
from django.db.models import F

# DB-level operations (no Python, no race conditions)
Product.objects.filter(stock__gt=F("reserved"))  # Compare fields
Product.objects.update(price=F("price") * 1.1)    # Increment 10%

# Atomic increment (thread-safe)
article.views_count = F("views_count") + 1
article.save(update_fields=["views_count"])
article.refresh_from_db()  # MUST refresh after F() update
```

---

## Pattern 2.4: Q Objects

```python
from django.db.models import Q

# OR
Article.objects.filter(Q(status="published") | Q(author=request.user))

# AND + NOT
Article.objects.filter(
    Q(status="published") & ~Q(is_deleted=True)
)

# Dynamic query building
filters = Q()
if search_term:
    filters &= Q(title__icontains=search_term) | Q(body__icontains=search_term)
if category_id:
    filters &= Q(category_id=category_id)
Article.objects.filter(filters)
```

---

## Pattern 2.5: Subquery and Exists

```python
from django.db.models import Subquery, OuterRef, Exists

# Latest order per customer
latest_order = Order.objects.filter(
    customer=OuterRef("pk")
).order_by("-created_at")

customers = Customer.objects.annotate(
    latest_order_date=Subquery(latest_order.values("created_at")[:1])
)

# Exists check (efficient boolean subquery)
active_customers = Customer.objects.filter(
    Exists(Order.objects.filter(customer=OuterRef("pk"), status="active"))
)
```

---

## Pattern 2.6: Annotations and Aggregations

```python
from django.db.models import Count, Sum, Avg, Max, Min

# Aggregation (single result)
stats = Order.objects.aggregate(
    total_revenue=Sum("amount"),
    avg_order=Avg("amount"),
    order_count=Count("id"),
)
# {'total_revenue': Decimal('50000'), 'avg_order': Decimal('125'), 'order_count': 400}

# Annotation (per-row computed field)
authors = User.objects.annotate(
    article_count=Count("articles"),
    total_views=Sum("articles__views_count"),
).filter(article_count__gt=5).order_by("-total_views")
```

---

## Pattern 2.7: Raw SQL (Escape Hatch)

```python
# Model.objects.raw() — returns model instances
users = User.objects.raw(
    "SELECT * FROM users_user WHERE last_login > %s",
    [cutoff_date],  # ALWAYS parameterized
)

# connection.cursor() — raw dict results
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute(
        "SELECT category, COUNT(*) as cnt FROM articles GROUP BY category"
    )
    rows = cursor.fetchall()  # [(cat, cnt), ...]
```

**Key rule**: Only use raw SQL when ORM cannot express the query. ALWAYS use parameterized queries.

---

## MUST DO

- Use custom QuerySet methods for reusable filters
- Use `F()` for atomic DB-level updates
- Use `select_related`/`prefetch_related` before evaluating (see 2.x relationships)
- Use `.exists()` instead of `bool(qs)`, `.count()` instead of `len(qs)`
- Parameterize all raw SQL queries

## MUST NOT DO

- Evaluate QuerySets unnecessarily (avoid `list()` early)
- Filter in Python when DB can do it (avoid `[x for x in qs if x.active]`)
- Use raw SQL without parameters (SQL injection)
- Forget `refresh_from_db()` after F() update
- Chain `.count()` after `.all()` (just use `.count()`)

---

## References

- [Django: QuerySet API](https://docs.djangoproject.com/en/5.0/ref/models/querysets/)
- [Django: F Expressions](https://docs.djangoproject.com/en/5.0/ref/models/expressions/)
- [Django: Q Objects](https://docs.djangoproject.com/en/5.0/topics/db/queries/#complex-lookups-with-q-objects)
