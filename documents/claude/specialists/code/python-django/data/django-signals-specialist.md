# Django Signals Specialist
# Djangoシグナルスペシャリスト
# Chuyen Gia Signals Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `apps/{domain}/signals.py`, `apps/{domain}/apps.py` |
| **Variant** | ALL |
| **Naming Convention** | `signals.py`, receiver functions prefixed with domain |
| **Imports From** | django.db.models.signals, Domain (models) |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | built-in-signals, signal-registration, custom-signals, pitfalls, alternatives |
| **Pattern Numbers** | 21.1–21.5 |
| **Source Paths** | `**/signals.py`, `**/apps.py` |
| **File Count** | 1 per app with signals |
| **Imported By** | — (auto-registered via AppConfig.ready) |
| **Specialist Type** | code |
| **Purpose** | Built-in signals (pre_save, post_save, etc.), signal registration in AppConfig.ready, custom signals, signal pitfalls and debugging, alternatives (override save, django-lifecycle) |
| **Activation Trigger** | signal, pre_save, post_save, receiver, dispatch, @receiver |

---

## Purpose

Define Django signal patterns: using built-in signals for side-effects (profile creation, cache invalidation, slug generation), proper signal registration via AppConfig.ready(), custom signals for domain events, understanding pitfalls (implicit behavior, performance), and alternatives like overriding save() or using django-lifecycle.

---

## Pattern 21.1: Built-in Signals

```python
# apps/users/signals.py
from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.users.models import Profile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create Profile when a new User is created."""
    if created:
        Profile.objects.create(user=instance)


@receiver(pre_save, sender=User)
def normalize_email(sender, instance, **kwargs):
    """Normalize email before saving."""
    if instance.email:
        instance.email = instance.email.lower().strip()
```

```python
# apps/articles/signals.py
from django.utils.text import slugify
from apps.articles.models import Article


@receiver(pre_save, sender=Article)
def generate_slug(sender, instance, **kwargs):
    """Auto-generate slug from title if not set."""
    if not instance.slug:
        base_slug = slugify(instance.title)
        slug = base_slug
        counter = 1
        while Article.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        instance.slug = slug


@receiver(post_delete, sender=Article)
def cleanup_article_files(sender, instance, **kwargs):
    """Delete associated files when article is deleted."""
    if instance.featured_image:
        instance.featured_image.delete(save=False)
```

---

## Pattern 21.2: Signal Registration (AppConfig.ready)

```python
# apps/users/apps.py
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"

    def ready(self):
        import apps.users.signals  # noqa: F401
```

```python
# apps/articles/apps.py
class ArticlesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.articles"

    def ready(self):
        import apps.articles.signals  # noqa: F401
```

**CRITICAL**: Always register signals in `AppConfig.ready()`. Never import signals at module level in `models.py` — it causes circular imports and signals firing before Django is fully loaded.

---

## Pattern 21.3: Custom Signals

```python
# apps/orders/signals.py
from django.dispatch import Signal

# Define custom signals
order_completed = Signal()       # Provides: order, user
order_cancelled = Signal()       # Provides: order, reason
payment_received = Signal()      # Provides: order, amount, method
```

```python
# apps/orders/services.py — Dispatch signal
from apps.orders.signals import order_completed


def complete_order(order):
    """Complete order and notify subscribers."""
    order.status = "completed"
    order.completed_at = timezone.now()
    order.save()

    # Dispatch signal — decoupled from receivers
    order_completed.send(
        sender=order.__class__,
        order=order,
        user=order.customer,
    )
```

```python
# apps/notifications/signals.py — Receive in another app
from django.dispatch import receiver
from apps.orders.signals import order_completed


@receiver(order_completed)
def send_order_confirmation(sender, order, user, **kwargs):
    """Send confirmation email when order completes."""
    from apps.notifications.tasks import send_email_task
    send_email_task.delay(
        to=user.email,
        subject=f"Order #{order.id} confirmed",
        template="emails/order_confirmed.html",
        context={"order": order},
    )


@receiver(order_completed)
def update_inventory(sender, order, **kwargs):
    """Reduce stock for ordered items."""
    for item in order.items.select_related("product"):
        item.product.stock -= item.quantity
        item.product.save(update_fields=["stock"])
```

---

## Pattern 21.4: Signal Pitfalls

```python
# PITFALL 1: Signals don't fire on bulk operations
Article.objects.filter(status="draft").update(status="published")
# ❌ pre_save and post_save are NOT called!

# WORKAROUND: Loop if signals are needed
for article in Article.objects.filter(status="draft"):
    article.status = "published"
    article.save()  # ✅ Signals fire


# PITFALL 2: Signals run synchronously — slow receivers block the request
@receiver(post_save, sender=Order)
def slow_signal(sender, instance, **kwargs):
    # ❌ DON'T: This blocks the HTTP response
    send_email(instance.customer.email)  # 2+ seconds

    # ✅ DO: Offload to Celery
    send_email_task.delay(instance.customer.email)


# PITFALL 3: Infinite loops
@receiver(post_save, sender=Article)
def update_stats(sender, instance, **kwargs):
    instance.view_count += 1
    instance.save()  # ❌ Triggers post_save again → infinite loop

    # ✅ FIX: Use update_fields or update()
    Article.objects.filter(pk=instance.pk).update(view_count=F("view_count") + 1)


# PITFALL 4: Testing difficulty — signals fire during test setup
# Use factory_boy's @factory.django.mute_signals or django-test-without-migrations
```

---

## Pattern 21.5: Alternatives to Signals

```python
# Alternative 1: Override save() — explicit and debuggable
class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)
```

```python
# Alternative 2: Service layer — explicit calls
# apps/orders/services.py
class OrderService:
    @staticmethod
    def complete(order):
        order.status = "completed"
        order.save()

        # Explicit — easy to trace and test
        NotificationService.send_order_confirmation(order)
        InventoryService.reduce_stock(order)
        AnalyticsService.track_purchase(order)
```

```python
# Alternative 3: django-lifecycle — declarative hooks on model
# pip install django-lifecycle
from django_lifecycle import LifecycleModel, hook, AFTER_CREATE, BEFORE_UPDATE, AFTER_TRANSITION


class Article(LifecycleModel):
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, default="draft")

    @hook(AFTER_CREATE)
    def on_create(self):
        """Runs after article is created."""
        notify_editors.delay(self.pk)

    @hook(BEFORE_UPDATE, when="title", has_changed=True)
    def on_title_change(self):
        """Runs before save when title changes."""
        self.slug = slugify(self.title)

    @hook(AFTER_TRANSITION, when="status", was="draft", is_now="published")
    def on_publish(self):
        """Runs after status transitions from draft to published."""
        send_published_notification.delay(self.pk)
```

**When to use signals vs alternatives:**
- **Signals**: Cross-app side-effects (app A reacts to app B) where tight coupling is undesirable
- **Override save()**: Single-model logic (slug generation, normalization)
- **Service layer**: Complex business workflows with multiple steps
- **django-lifecycle**: Model-level hooks with field change detection

---

## MUST DO

- Register signals in `AppConfig.ready()` (never in `models.py`)
- Use signals for decoupled cross-app side-effects (email, cache, analytics)
- Offload slow signal work to Celery tasks
- Use `update_fields` in signal handlers to avoid infinite loops
- Accept `**kwargs` in all receiver functions (future-proof)

## MUST NOT DO

- Put business logic in signals (hard to test and debug)
- Create circular signal chains (A triggers B triggers A)
- Perform heavy computation synchronously in signals
- Assume signals fire on `QuerySet.update()` or `bulk_create()`
- Use signals when a simple `save()` override is sufficient

---

## References

- [Django: Signals](https://docs.djangoproject.com/en/5.0/topics/signals/)
- [Django: Built-in signal reference](https://docs.djangoproject.com/en/5.0/ref/signals/)
- [django-lifecycle](https://rsinger86.github.io/django-lifecycle/)
