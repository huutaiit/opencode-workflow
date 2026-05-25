# Django ORM Models Specialist
# Django ORMモデルスペシャリスト
# Chuyen Gia ORM Models Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `apps/{domain}/models.py` |
| **Variant** | ALL |
| **Naming Convention** | `models.py`, PascalCase model names, snake_case fields |
| **Imports From** | N/A (foundation layer) |
| **Cannot Import** | Presentation (views, serializers) |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-definition, field-types, custom-validators, abstract-base, custom-save, model-properties, choices, indexes-constraints |
| **Pattern Numbers** | 1.1–1.8 |
| **Source Paths** | `**/models.py` |
| **File Count** | 1 per app |
| **Imported By** | Views, Serializers, Admin, Forms |
| **Specialist Type** | code |
| **Purpose** | Model field definitions, Meta class, validators, custom save, abstract models, TextChoices, indexes, constraints |
| **Activation Trigger** | models.py, Model, CharField, IntegerField, field types, model definition |

---

## Purpose

Define Django ORM model patterns: field types with correct blank/null usage, Meta class configuration, custom validators, abstract base models for DRY, custom save methods, model properties, TextChoices enums, and database indexes/constraints.

---

## Pattern 1.1: Model Definition Best Practices

```python
from django.db import models
from django.urls import reverse


class Article(models.Model):
    """Article model — field ordering convention:
    1. PK (auto) → 2. ForeignKeys → 3. Data fields → 4. Timestamps
    """

    # ForeignKeys first
    author = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="articles",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="articles",
    )

    # Data fields
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    body = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[("draft", "Draft"), ("published", "Published")],
        default="draft",
    )

    # Timestamps (use abstract mixin in production)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Article"
        verbose_name_plural = "Articles"
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self) -> str:
        return self.title

    def get_absolute_url(self) -> str:
        return reverse("articles:detail", kwargs={"slug": self.slug})
```

---

## Pattern 1.2: Field Types & blank vs null

```python
# String fields: blank=True, NEVER null=True
name = models.CharField(max_length=100, blank=True)  # ✅ empty string ""
name = models.CharField(max_length=100, null=True)    # ❌ two states for "empty"

# Non-string fields: null=True, blank=True
price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
published_at = models.DateTimeField(null=True, blank=True)

# ForeignKey: null=True for optional relationships
category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)

# BooleanField: NEVER null (use default)
is_active = models.BooleanField(default=True)
```

**Rule**: `blank` = form validation, `null` = database NULL. String fields use empty string, not NULL.

---

## Pattern 1.3: Custom Validators

```python
from django.core.validators import RegexValidator, MinValueValidator
from django.core.exceptions import ValidationError


phone_validator = RegexValidator(
    regex=r"^\+?1?\d{9,15}$",
    message="Phone number must be in format: '+999999999'.",
)


def validate_file_size(value):
    max_size = 10 * 1024 * 1024  # 10MB
    if value.size > max_size:
        raise ValidationError(f"File size must be under {max_size // (1024*1024)}MB.")


class Product(models.Model):
    phone = models.CharField(max_length=17, validators=[phone_validator])
    price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)]
    )
    image = models.ImageField(upload_to="products/", validators=[validate_file_size])

    def clean(self):
        """Cross-field validation."""
        if self.sale_price and self.sale_price >= self.price:
            raise ValidationError("Sale price must be less than regular price.")
```

---

## Pattern 1.4: Abstract Base Models (DRY Mixins)

```python
import uuid
from django.db import models


class TimestampMixin(models.Model):
    """Adds created_at and updated_at to any model."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDMixin(models.Model):
    """UUID primary key instead of auto-increment integer."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """Soft delete — mark as deleted instead of removing from DB."""
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])


# Usage: inherit multiple mixins
class Order(UUIDMixin, TimestampMixin, SoftDeleteMixin):
    total = models.DecimalField(max_digits=10, decimal_places=2)
```

---

## Pattern 1.5: Custom save()

```python
from django.utils.text import slugify


class Article(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
            # Handle uniqueness
            original_slug = self.slug
            counter = 1
            while Article.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)
```

---

## Pattern 1.6: Model Properties

```python
class User(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def is_premium(self) -> bool:
        return self.subscriptions.filter(
            status="active", plan__tier="premium"
        ).exists()
```

---

## Pattern 1.7: TextChoices (Python Enum)

```python
class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEW = "review", "In Review"
        PUBLISHED = "published", "Published"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

# Usage
article.status = Article.Status.PUBLISHED
Article.objects.filter(status=Article.Status.PUBLISHED)
```

---

## Pattern 1.8: Indexes and Constraints

```python
from django.db.models import UniqueConstraint, CheckConstraint, Q


class Product(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["name", "is_active"]),
            models.Index(fields=["-price"], name="price_desc_idx"),
        ]
        constraints = [
            UniqueConstraint(fields=["sku"], name="unique_sku"),
            CheckConstraint(check=Q(price__gte=0), name="price_non_negative"),
            UniqueConstraint(
                fields=["name"],
                condition=Q(is_active=True),
                name="unique_active_name",
            ),
        ]
```

---

## MUST DO

- Define `__str__` on every model
- Use abstract mixins for shared fields (Timestamp, UUID, SoftDelete)
- Use `TextChoices` for enum fields (not tuple lists)
- Add indexes on frequently filtered/sorted fields
- Use `blank=True` (not `null=True`) for string fields
- Validate in `clean()` for cross-field rules

## MUST NOT DO

- Set `null=True` on string fields (CharField, TextField)
- Skip `__str__` (admin becomes unusable)
- Put business logic in views instead of models
- Use tuple choices instead of TextChoices
- Skip indexes on fields used in filters/ordering
- Override `save()` without calling `super().save()`

---

## References

- [Django: Models](https://docs.djangoproject.com/en/5.0/topics/db/models/)
- [Django: Field Reference](https://docs.djangoproject.com/en/5.0/ref/models/fields/)
- [Django: Constraints](https://docs.djangoproject.com/en/5.0/ref/models/constraints/)
