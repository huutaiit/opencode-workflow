# Django Model Relationships Specialist
# Djangoモデルリレーションスペシャリスト
# Chuyen Gia Quan He Model Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `apps/{domain}/models.py` |
| **Variant** | ALL |
| **Naming Convention** | `related_name` = plural of related model |
| **Imports From** | N/A |
| **Cannot Import** | Presentation |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | foreignkey, manytomany, onetoone, select-related, prefetch-related, prefetch-object, n-plus-one |
| **Pattern Numbers** | 2.8–2.14 |
| **Source Paths** | `**/models.py` |
| **File Count** | 1 per app |
| **Imported By** | Views, Serializers |
| **Specialist Type** | code |
| **Purpose** | ForeignKey, ManyToMany, OneToOne, through models, select_related, prefetch_related, N+1 prevention |
| **Activation Trigger** | ForeignKey, ManyToManyField, OneToOneField, related_name, N+1, select_related |

---

## Purpose

Define Django model relationship patterns: ForeignKey with on_delete choices, ManyToManyField with through models, OneToOneField for profile extension, select_related for FK/O2O joins, prefetch_related for M2M/reverse, custom Prefetch objects, and N+1 query detection.

---

## Pattern 2.8: ForeignKey (Many-to-One)

```python
class Order(models.Model):
    customer = models.ForeignKey(
        "users.User",
        on_delete=models.PROTECT,       # Prevent deleting user with orders
        related_name="orders",           # user.orders.all()
    )
    shipping_address = models.ForeignKey(
        "addresses.Address",
        on_delete=models.SET_NULL,       # Keep order if address deleted
        null=True,
        blank=True,
        related_name="shipped_orders",
    )
```

**on_delete choices**:
| Value | Behavior | Use When |
|-------|----------|----------|
| CASCADE | Delete related objects | Child depends on parent |
| PROTECT | Prevent deletion | Must not lose parent |
| SET_NULL | Set FK to NULL | Optional relationship |
| SET_DEFAULT | Set FK to default | Has meaningful default |
| DO_NOTHING | No action (DB handles) | DB-level cascade |

---

## Pattern 2.9: ManyToManyField + Through Model

```python
class Student(models.Model):
    name = models.CharField(max_length=100)
    courses = models.ManyToManyField(
        "Course",
        through="Enrollment",       # Custom through table
        related_name="students",
    )

class Course(models.Model):
    title = models.CharField(max_length=200)

class Enrollment(models.Model):
    """Through model — adds extra fields to M2M relationship."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    grade = models.CharField(max_length=2, blank=True)

    class Meta:
        unique_together = ["student", "course"]
```

---

## Pattern 2.10: OneToOneField (Profile Pattern)

```python
class UserProfile(models.Model):
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="profile",      # user.profile
    )
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)

# Auto-create profile via signal
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
```

---

## Pattern 2.11: select_related (FK, O2O — SQL JOIN)

```python
# ❌ N+1: 1 query for orders + N queries for customers
orders = Order.objects.all()
for order in orders:
    print(order.customer.name)  # Hits DB each time!

# ✅ 1 query with JOIN
orders = Order.objects.select_related("customer", "customer__profile")
for order in orders:
    print(order.customer.name)       # No extra query
    print(order.customer.profile.bio) # No extra query
```

**Rule**: Use `select_related` for ForeignKey and OneToOneField (forward relationships).

---

## Pattern 2.12: prefetch_related (M2M, Reverse FK)

```python
# ❌ N+1: 1 query for authors + N queries for articles
authors = User.objects.all()
for author in authors:
    print(author.articles.count())  # Hits DB each time!

# ✅ 2 queries: 1 for authors + 1 for all their articles
authors = User.objects.prefetch_related("articles")
for author in authors:
    print(len(author.articles.all()))  # From cache, no extra query
```

**Rule**: Use `prefetch_related` for ManyToMany and reverse ForeignKey (backward relationships).

---

## Pattern 2.13: Prefetch Object (Custom QuerySet)

```python
from django.db.models import Prefetch

# Prefetch with filtered/annotated queryset
authors = User.objects.prefetch_related(
    Prefetch(
        "articles",
        queryset=Article.objects.filter(status="published").order_by("-created_at"),
        to_attr="published_articles",  # Store as list attribute
    )
)

for author in authors:
    for article in author.published_articles:  # Already filtered + ordered
        print(article.title)
```

---

## Pattern 2.14: N+1 Detection

```python
# django-debug-toolbar — SQL panel shows query count
INSTALLED_APPS += ["debug_toolbar"]

# nplusone — raises exception on N+1
# pip install nplusone
INSTALLED_APPS += ["nplusone.ext.django"]
MIDDLEWARE.insert(0, "nplusone.ext.django.NPlusOneMiddleware")
NPLUSONE_RAISE = True  # Raise in dev, log in prod
```

---

## MUST DO

- Always set `related_name` on FK/M2M/O2O
- Use `select_related` for FK/O2O before iteration
- Use `prefetch_related` for M2M/reverse FK before iteration
- Use through model when M2M needs extra fields
- Install nplusone or debug-toolbar in development

## MUST NOT DO

- Access related objects in loops without select/prefetch
- Use default `related_name` (collisions in multi-FK models)
- Skip `on_delete` consideration (always think about data integrity)
- Use `select_related` for M2M (use `prefetch_related`)
- Nest `select_related` more than 2-3 levels deep

---

## References

- [Django: Relationships](https://docs.djangoproject.com/en/5.0/topics/db/models/#relationships)
- [Django: select_related](https://docs.djangoproject.com/en/5.0/ref/models/querysets/#select-related)
- [Django: prefetch_related](https://docs.djangoproject.com/en/5.0/ref/models/querysets/#prefetch-related)
