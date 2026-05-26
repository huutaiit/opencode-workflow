# Python Fundamentals Specialist
# Python基礎スペシャリスト
# Chuyen Gia Python Co Ban

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | All Python files |
| **Variant** | ALL |
| **Naming Convention** | PEP 8: `snake_case` vars/funcs, `PascalCase` classes, `UPPER_CASE` constants |
| **Imports From** | N/A (language-level) |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | modern-features, type-hints, naming, solid-principles, context-managers, comprehensions, fstrings, docstrings |
| **Pattern Numbers** | 65.1–65.8 |
| **Source Paths** | `**/*.py` |
| **File Count** | N/A (applies to all) |
| **Imported By** | ALL specialists |
| **Specialist Type** | language |
| **Purpose** | Python 3.12+ modern features, type hints with django-stubs, naming conventions, SOLID principles adapted for Django, context managers, comprehensions, docstrings |
| **Activation Trigger** | python basics, type hints, dataclass, match, walrus, modern python, naming |

---

## Purpose

Define Python language fundamentals for Django projects: modern Python 3.12+ features, comprehensive type hints with django-stubs integration, naming conventions, SOLID principles adapted to Django's patterns (fat models, custom managers), context managers, comprehensions and generators, and docstring conventions.

---

## Pattern 65.1: Modern Python Features (3.10+)

```python
# Union types with | (3.10+)
def get_user(user_id: int) -> User | None:
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return None

# match/case (3.10+)
def handle_status(status: str) -> str:
    match status:
        case "draft":
            return "Not yet published"
        case "published":
            return "Live"
        case "archived":
            return "No longer available"
        case _:
            return "Unknown status"

# Walrus operator :=
if (article := Article.objects.filter(slug=slug).first()) is not None:
    return render(request, "detail.html", {"article": article})

# Exception groups (3.11+)
try:
    validate_form_data(data)
except* ValidationError as eg:
    errors = [str(e) for e in eg.exceptions]

# TypeVar with bound (3.12+)
type ModelT = TypeVar("ModelT", bound=models.Model)
```

---

## Pattern 65.2: Type Hints (Django-Specific)

```python
from __future__ import annotations
from typing import TYPE_CHECKING
from django.db import models
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.db.models import QuerySet

# Django model fields ARE type-aware with django-stubs
class Article(models.Model):
    title: models.CharField = models.CharField(max_length=200)
    body: models.TextField = models.TextField()
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)

# Avoid circular imports with TYPE_CHECKING
if TYPE_CHECKING:
    from apps.users.models import User

# View type hints
def article_list(request: HttpRequest) -> HttpResponse:
    articles: QuerySet[Article] = Article.objects.filter(status="published")
    return render(request, "articles/list.html", {"articles": articles})

# Service layer types
def get_articles_by_author(author_id: int) -> QuerySet[Article]:
    return Article.objects.filter(author_id=author_id, status="published")

# Custom Manager return types
class ArticleManager(models.Manager["Article"]):
    def published(self) -> QuerySet["Article"]:
        return self.filter(status="published")
```

---

## Pattern 65.3: Naming Conventions

```python
# Models — PascalCase (singular)
class Article(models.Model): ...
class OrderItem(models.Model): ...

# Views — snake_case with descriptive suffix
def article_list(request): ...
def article_detail(request, pk): ...
class ArticleListView(ListView): ...
class ArticleCreateView(CreateView): ...

# URLs — kebab-case for URL paths
path("articles/", views.article_list, name="article-list")
path("articles/<int:pk>/", views.article_detail, name="article-detail")

# Settings — UPPER_CASE
DEBUG = False
ALLOWED_HOSTS = ["example.com"]
DEFAULT_PAGE_SIZE = 20

# App labels — lowercase, no hyphens
# apps/articles/apps.py
class ArticlesConfig(AppConfig):
    name = "apps.articles"

# Template files — snake_case
# templates/articles/article_list.html
# templates/articles/article_detail.html
```

---

## Pattern 65.4: SOLID Principles (Django-Adapted)

```python
# SRP: Fat models — each model owns its domain logic
class Article(models.Model):
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, default="draft")

    def publish(self):
        """Model owns its state transitions."""
        self.status = "published"
        self.published_at = timezone.now()
        self.save(update_fields=["status", "published_at"])

    def can_be_published(self) -> bool:
        return self.status == "draft" and bool(self.body)


# OCP: Custom Manager + QuerySet — extend without modifying
class ArticleQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status="published")

    def by_category(self, category_slug: str):
        return self.filter(category__slug=category_slug)

    def recent(self, days: int = 30):
        cutoff = timezone.now() - timedelta(days=days)
        return self.filter(created_at__gte=cutoff)

class ArticleManager(models.Manager):
    def get_queryset(self):
        return ArticleQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()


# LSP: CBV mixins — interchangeable
class OwnerRequiredMixin:
    def get_queryset(self):
        return super().get_queryset().filter(author=self.request.user)

class ArticleUpdateView(OwnerRequiredMixin, UpdateView): ...
class ArticleDeleteView(OwnerRequiredMixin, DeleteView): ...


# ISP: Small, focused ABCs for services
from abc import ABC, abstractmethod

class EmailSender(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> bool: ...

class SMTPEmailSender(EmailSender):
    def send(self, to, subject, body):
        send_mail(subject, body, None, [to])
        return True


# DIP: Settings-based dependency injection
# settings.py
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# Tests: EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
```

---

## Pattern 65.5: Context Managers

```python
from django.db import transaction, connection
from contextlib import contextmanager


# Django's built-in context managers
with transaction.atomic():
    order.status = "completed"
    order.save()
    Payment.objects.create(order=order, amount=order.total)

# Custom context manager
@contextmanager
def temporary_debug(enabled: bool = True):
    from django.conf import settings
    original = settings.DEBUG
    settings.DEBUG = enabled
    try:
        yield
    finally:
        settings.DEBUG = original

# Database cursor context manager
with connection.cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM articles WHERE status = %s", ["published"])
    count = cursor.fetchone()[0]
```

---

## Pattern 65.6: Comprehensions and Generators

```python
# List comprehension for serialized data
article_data = [
    {"id": a.id, "title": a.title}
    for a in Article.objects.filter(status="published").only("id", "title")
]

# Dict comprehension for settings
field_map = {
    field.name: field.verbose_name
    for field in Article._meta.get_fields()
    if hasattr(field, "verbose_name")
}

# Generator for streaming CSV
def csv_row_generator(queryset):
    yield "id,title,status\n"
    for obj in queryset.iterator(chunk_size=1000):
        yield f"{obj.id},{obj.title},{obj.status}\n"
```

---

## Pattern 65.7: F-Strings and Formatting

```python
# Model __str__
def __str__(self):
    return f"{self.title} ({self.get_status_display()})"

# Logging
logger.info("Article %d published by %s", article.id, article.author.email)

# Admin display
@admin.display(description="Full Name")
def full_name(self, obj):
    return f"{obj.first_name} {obj.last_name}"
```

---

## Pattern 65.8: Docstrings

```python
class Article(models.Model):
    """
    Blog article with publishing workflow.

    Attributes:
        title: Article headline (max 200 chars).
        status: One of 'draft', 'published', 'archived'.
    """

    def publish(self):
        """Transition article from draft to published state."""
        ...

def get_articles_for_feed(user_id: int, limit: int = 20) -> QuerySet[Article]:
    """
    Get personalized article feed for a user.

    Args:
        user_id: The user to generate feed for.
        limit: Maximum articles to return.

    Returns:
        QuerySet of published articles ordered by relevance.
    """
    ...
```

---

## MUST DO

- Use `from __future__ import annotations` for forward references
- Use `TYPE_CHECKING` for imports only needed by type checkers
- Follow PEP 8 naming conventions consistently
- Apply SOLID via Django patterns (fat models, custom managers, mixins)

## MUST NOT DO

- Use `Any` type when a specific type is available
- Import models at module level when it causes circular imports
- Mix naming conventions (camelCase in Python code)
- Put business logic in views (use models or services)

---

## References

- [PEP 8 — Style Guide](https://peps.python.org/pep-0008/)
- [Python: typing module](https://docs.python.org/3/library/typing.html)
- [django-stubs](https://github.com/typeddjango/django-stubs)
