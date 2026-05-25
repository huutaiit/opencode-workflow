# Django Factory & Fixtures Specialist
# Djangoファクトリー＆フィクスチャスペシャリスト
# Chuyen Gia Factory va Fixtures Django

**Stack**: Python 3.12+ / Django 5.x / factory_boy | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Directory Pattern** | `apps/{domain}/tests/factories.py`, `conftest.py` |
| **Variant** | ALL |
| **Naming Convention** | `factories.py`, `PascalCase` + `Factory` suffix |
| **Imports From** | factory, faker, Domain (models) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | django-model-factory, sub-factory, lazy-attribute, traits, batch-creation, conftest-integration |
| **Pattern Numbers** | 41.7–41.12 |
| **Source Paths** | `**/tests/factories.py`, `**/conftest.py` |
| **File Count** | 1 factories.py per app + conftest |
| **Imported By** | Test files, conftest.py |
| **Specialist Type** | code |
| **Purpose** | DjangoModelFactory for test data, SubFactory for relationships, LazyAttribute for computed fields, Traits for optional features, batch creation, conftest.py integration with pytest fixtures |
| **Activation Trigger** | factory_boy, DjangoModelFactory, SubFactory, fixture, fake data, factory |

---

## Purpose

Define factory_boy patterns for Django test data: DjangoModelFactory for creating model instances, SubFactory for related objects, LazyAttribute and LazyFunction for computed fields, Traits for optional model variations, batch creation for performance tests, and integration with pytest fixtures via conftest.py.

---

## Pattern 41.7: DjangoModelFactory

```python
# apps/users/tests/factories.py
import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    full_name = factory.Faker("name")
    is_active = True
    is_staff = False

    @factory.lazy_attribute
    def password(self):
        return factory.django.Password("testpass123")
```

```python
# apps/articles/tests/factories.py
import factory
from apps.articles.models import Article, Category


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ("slug",)

    name = factory.Faker("word")
    slug = factory.LazyAttribute(lambda o: o.name.lower())


class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Faker("sentence", nb_words=5)
    slug = factory.LazyAttribute(lambda o: o.title.lower().replace(" ", "-")[:50])
    body = factory.Faker("paragraphs", nb=3, ext_word_list=None)
    status = "published"
    author = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory)
```

---

## Pattern 41.8: SubFactory (Relationships)

```python
# apps/orders/tests/factories.py
class OrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Order

    customer = factory.SubFactory(UserFactory)
    status = "pending"
    total = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)


class OrderItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = factory.Faker("random_int", min=1, max=10)
    unit_price = factory.Faker("pydecimal", left_digits=3, right_digits=2, positive=True)
```

```python
# Usage
order = OrderFactory()  # Creates User + Order
item = OrderItemFactory(order=order)  # Reuses existing order
item2 = OrderItemFactory(order=order, quantity=5)  # Override fields

# Share the same user across related objects
user = UserFactory()
order = OrderFactory(customer=user)
article = ArticleFactory(author=user)
```

---

## Pattern 41.9: LazyAttribute and LazyFunction

```python
class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Faker("sentence")

    # LazyAttribute — depends on other fields
    slug = factory.LazyAttribute(lambda o: slugify(o.title)[:50])
    excerpt = factory.LazyAttribute(lambda o: o.body[:200] if o.body else "")

    # LazyFunction — no dependency on other fields
    created_at = factory.LazyFunction(timezone.now)
    published_at = factory.LazyFunction(lambda: timezone.now() - timedelta(hours=1))

    # Sequence for unique values
    sku = factory.Sequence(lambda n: f"SKU-{n:05d}")

    # Faker with locale
    body = factory.Faker("text", max_nb_chars=1000, locale="en_US")
```

---

## Pattern 41.10: Traits and Parameters

```python
class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    is_active = True
    is_staff = False
    is_superuser = False

    class Params:
        admin = factory.Trait(
            is_staff=True,
            is_superuser=True,
            username=factory.Sequence(lambda n: f"admin{n}"),
        )
        inactive = factory.Trait(
            is_active=False,
        )
        editor = factory.Trait(
            is_staff=True,
        )
```

```python
# Usage
regular_user = UserFactory()
admin = UserFactory(admin=True)
inactive = UserFactory(inactive=True)
editor = UserFactory(editor=True)
```

```python
class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Faker("sentence")
    status = "draft"

    class Params:
        published = factory.Trait(
            status="published",
            published_at=factory.LazyFunction(timezone.now),
        )
        featured = factory.Trait(
            status="published",
            is_featured=True,
            published_at=factory.LazyFunction(timezone.now),
        )
```

```python
draft = ArticleFactory()
published = ArticleFactory(published=True)
featured = ArticleFactory(featured=True)
```

---

## Pattern 41.11: Batch Creation

```python
# Create multiple instances
users = UserFactory.create_batch(10)
articles = ArticleFactory.create_batch(50, status="published")

# Build without saving (for unit tests that don't need DB)
users = UserFactory.build_batch(5)

# Create with related objects
orders = OrderFactory.create_batch(20)
for order in orders:
    OrderItemFactory.create_batch(3, order=order)
```

```python
# Performance test data
@pytest.mark.django_db
@pytest.mark.slow
def test_article_list_performance(auth_api_client):
    """Test list endpoint handles large datasets."""
    ArticleFactory.create_batch(1000, status="published")

    import time
    start = time.monotonic()
    response = auth_api_client.get(reverse("api:article-list"))
    duration = time.monotonic() - start

    assert response.status_code == 200
    assert duration < 1.0  # Must respond within 1 second
```

---

## Pattern 41.12: Fixtures Integration (conftest.py)

```python
# conftest.py (project root)
import pytest
from apps.users.tests.factories import UserFactory
from apps.articles.tests.factories import ArticleFactory, CategoryFactory


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def admin_user():
    return UserFactory(admin=True)


@pytest.fixture
def other_user():
    return UserFactory(username="other", email="other@example.com")


@pytest.fixture
def category():
    return CategoryFactory(name="Technology", slug="technology")


@pytest.fixture
def article(user, category):
    return ArticleFactory(author=user, category=category)


@pytest.fixture
def published_articles(user, category):
    return ArticleFactory.create_batch(5, author=user, category=category, published=True)


@pytest.fixture
def other_user_article(other_user, category):
    return ArticleFactory(author=other_user, category=category)


# Reusable factory fixtures
@pytest.fixture
def article_factory(user, category):
    """Factory fixture — call to create articles with defaults."""
    def _create(**kwargs):
        defaults = {"author": user, "category": category}
        defaults.update(kwargs)
        return ArticleFactory(**defaults)
    return _create
```

```python
# Usage in tests
@pytest.mark.django_db
def test_with_factory_fixture(auth_api_client, article_factory):
    article_factory(title="First", status="published")
    article_factory(title="Second", status="draft")

    response = auth_api_client.get(reverse("api:article-list"), {"status": "published"})
    assert response.data["count"] == 1
```

---

## MUST DO

- Create factories for all models with test data
- Use SubFactory for required ForeignKey relationships
- Use Traits for common model variations (admin, published, inactive)
- Share fixtures via conftest.py (project root + per-app)
- Use `create_batch` for bulk test data, `build_batch` for no-DB tests

## MUST NOT DO

- Hardcode test data in individual tests
- Create model instances manually with `Model.objects.create()` in every test
- Skip Faker for realistic test data
- Use `django_get_or_create` on fields that aren't unique
- Create fixtures with side effects (keep them pure data)

---

## References

- [factory_boy](https://factoryboy.readthedocs.io/)
- [factory_boy: Django integration](https://factoryboy.readthedocs.io/en/stable/orms.html#django)
- [Faker](https://faker.readthedocs.io/)
