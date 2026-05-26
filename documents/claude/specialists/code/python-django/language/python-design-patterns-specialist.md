# Python Design Patterns Specialist
# Pythonデザインパターンスペシャリスト
# Chuyen Gia Design Patterns Python

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Directory Pattern** | `apps/{domain}/services/`, `apps/{domain}/models.py` |
| **Variant** | ALL |
| **Naming Convention** | Service classes, Manager/QuerySet |
| **Imports From** | django.db, Domain |
| **Cannot Import** | N/A |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | manager-as-repository, transaction-atomic-uow, factory-pattern, strategy-pattern, dependency-injection, observer-signals, service-layer |
| **Pattern Numbers** | 68.1–68.7 |
| **Source Paths** | `**/models.py`, `**/services/*.py` |
| **File Count** | N/A (applies to architecture) |
| **Imported By** | ALL specialists |
| **Specialist Type** | language |
| **Purpose** | Manager/QuerySet as Repository, transaction.atomic as Unit of Work, Factory pattern, Strategy pattern, dependency injection in Django, signals as Observer, service layer pattern |
| **Activation Trigger** | pattern, manager, factory, strategy, signal, design, service layer, repository |

---

## Purpose

Define design patterns adapted for Django: Manager and QuerySet as the Repository pattern (Django's built-in), transaction.atomic as Unit of Work, Factory pattern for object creation, Strategy pattern for interchangeable algorithms, dependency injection via settings and constructor, signals as Observer pattern, and service layer for complex business logic.

---

## Pattern 68.1: Manager/QuerySet as Repository

```python
# Django doesn't need a separate Repository — Manager IS the repository
# Custom QuerySet = chainable query builder
# Custom Manager = entry point with convenience methods

class ArticleQuerySet(models.QuerySet):
    """Chainable query builder — replaces Repository methods."""

    def published(self):
        return self.filter(status="published")

    def by_author(self, user):
        return self.filter(author=user)

    def recent(self, days=30):
        cutoff = timezone.now() - timedelta(days=days)
        return self.filter(created_at__gte=cutoff)

    def with_comment_count(self):
        return self.annotate(comment_count=Count("comments"))

    def popular(self, min_views=100):
        return self.filter(view_count__gte=min_views)


class ArticleManager(models.Manager):
    """Manager — convenience entry point."""

    def get_queryset(self):
        return ArticleQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()

    def feed_for_user(self, user):
        """Complex query encapsulated in manager."""
        return (
            self.get_queryset()
            .published()
            .filter(
                models.Q(author__in=user.following.all())
                | models.Q(category__in=user.interests.all())
            )
            .with_comment_count()
            .order_by("-created_at")
        )


class Article(models.Model):
    objects = ArticleManager()
    # Usage: Article.objects.published().recent().popular()
    # Usage: Article.objects.feed_for_user(user)
```

---

## Pattern 68.2: transaction.atomic as Unit of Work

```python
from django.db import transaction


def complete_order(order):
    """
    Unit of Work — all operations succeed or all fail.
    Django's transaction.atomic() IS the UoW pattern.
    """
    with transaction.atomic():
        # Update order status
        order.status = "completed"
        order.completed_at = timezone.now()
        order.save(update_fields=["status", "completed_at"])

        # Create payment record
        Payment.objects.create(
            order=order,
            amount=order.total,
            method=order.payment_method,
            status="captured",
        )

        # Reduce inventory
        for item in order.items.select_related("product"):
            item.product.stock -= item.quantity
            if item.product.stock < 0:
                raise ValueError(f"Insufficient stock for {item.product.name}")
            item.product.save(update_fields=["stock"])

        # All committed atomically — or all rolled back


# Nested atomic blocks with savepoints
def create_order_with_items(customer, items_data):
    with transaction.atomic():
        order = Order.objects.create(customer=customer)

        for item_data in items_data:
            try:
                with transaction.atomic():  # Savepoint
                    OrderItem.objects.create(order=order, **item_data)
            except Exception:
                # Individual item failure doesn't roll back the whole order
                continue

        order.recalculate_total()
        return order
```

---

## Pattern 68.3: Factory Pattern

```python
# Factory for creating different notification types
class NotificationFactory:
    @staticmethod
    def create(notification_type: str, user, **kwargs):
        match notification_type:
            case "email":
                return EmailNotification.objects.create(
                    user=user,
                    subject=kwargs["subject"],
                    body=kwargs["body"],
                )
            case "push":
                return PushNotification.objects.create(
                    user=user,
                    title=kwargs["title"],
                    body=kwargs["body"],
                )
            case "sms":
                return SMSNotification.objects.create(
                    user=user,
                    phone=user.phone,
                    message=kwargs["message"],
                )
            case _:
                raise ValueError(f"Unknown notification type: {notification_type}")
```

```python
# Factory with registration (extensible)
class ExportFactory:
    _exporters: dict[str, type] = {}

    @classmethod
    def register(cls, format_name: str, exporter_class: type):
        cls._exporters[format_name] = exporter_class

    @classmethod
    def create(cls, format_name: str, queryset):
        exporter_class = cls._exporters.get(format_name)
        if not exporter_class:
            raise ValueError(f"Unknown format: {format_name}")
        return exporter_class(queryset)


# Register exporters
ExportFactory.register("csv", CSVExporter)
ExportFactory.register("excel", ExcelExporter)
ExportFactory.register("pdf", PDFExporter)

# Usage
exporter = ExportFactory.create("excel", Article.objects.all())
response = exporter.export()
```

---

## Pattern 68.4: Strategy Pattern

```python
from abc import ABC, abstractmethod


class PricingStrategy(ABC):
    @abstractmethod
    def calculate(self, base_price: float, quantity: int) -> float: ...


class RegularPricing(PricingStrategy):
    def calculate(self, base_price, quantity):
        return base_price * quantity


class BulkPricing(PricingStrategy):
    def calculate(self, base_price, quantity):
        if quantity >= 100:
            return base_price * quantity * 0.8  # 20% discount
        if quantity >= 10:
            return base_price * quantity * 0.9  # 10% discount
        return base_price * quantity


class SubscriptionPricing(PricingStrategy):
    def calculate(self, base_price, quantity):
        return base_price * quantity * 0.7  # 30% subscriber discount


# Usage in service
class OrderService:
    def __init__(self, pricing: PricingStrategy):
        self.pricing = pricing

    def calculate_total(self, items):
        return sum(
            self.pricing.calculate(item.unit_price, item.quantity)
            for item in items
        )


# Settings-based strategy selection
PRICING_STRATEGIES = {
    "regular": RegularPricing,
    "bulk": BulkPricing,
    "subscription": SubscriptionPricing,
}

def get_pricing_strategy(customer) -> PricingStrategy:
    strategy_name = customer.pricing_tier or "regular"
    return PRICING_STRATEGIES[strategy_name]()
```

---

## Pattern 68.5: Dependency Injection in Django

```python
# Django doesn't have FastAPI's Depends() — use these patterns instead:

# Pattern A: Settings-based injection (Django's built-in DI)
# settings.py
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# tests: EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
# Django auto-injects the correct backend


# Pattern B: Constructor injection in services
class OrderService:
    def __init__(self, payment_gateway=None, notification_service=None):
        self.payment = payment_gateway or StripeGateway()
        self.notifications = notification_service or EmailNotificationService()

    def complete(self, order):
        self.payment.charge(order)
        self.notifications.send_confirmation(order)


# Pattern C: Module-level factory (lazy init)
def get_payment_gateway():
    from django.conf import settings
    gateways = {
        "stripe": StripeGateway,
        "paypal": PayPalGateway,
    }
    return gateways[settings.PAYMENT_GATEWAY]()


# Pattern D: Override in tests
class TestOrderService:
    def test_complete(self):
        mock_payment = Mock(spec=PaymentGateway)
        service = OrderService(payment_gateway=mock_payment)
        service.complete(order)
        mock_payment.charge.assert_called_once_with(order)
```

---

## Pattern 68.6: Signals as Observer Pattern

```python
# Django signals = built-in Observer pattern
# Sender (Subject) dispatches events, Receivers (Observers) react

# Built-in: model lifecycle events
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Order)
def on_order_saved(sender, instance, created, **kwargs):
    if created:
        send_order_confirmation.delay(instance.id)  # Observer 1
        update_analytics.delay(instance.id)          # Observer 2


# Custom signals for domain events
from django.dispatch import Signal

order_completed = Signal()  # Custom event

# Multiple observers
@receiver(order_completed)
def send_confirmation(sender, order, **kwargs):
    NotificationService.send(order.customer, "Order completed")

@receiver(order_completed)
def update_inventory(sender, order, **kwargs):
    InventoryService.reduce(order)

@receiver(order_completed)
def track_analytics(sender, order, **kwargs):
    AnalyticsService.track("order_completed", order)

# Dispatch
order_completed.send(sender=Order, order=order)
```

**When to use signals vs explicit calls:**
- **Signals**: Cross-app, decoupled side-effects (notifications, analytics)
- **Explicit calls**: Core business logic, same-app operations

---

## Pattern 68.7: Service Layer Pattern

```python
# apps/orders/services.py
from django.db import transaction
from apps.orders.models import Order, OrderItem
from apps.payments.services import PaymentService
from apps.notifications.services import NotificationService


class OrderService:
    """Encapsulate complex business logic outside models and views."""

    @staticmethod
    def create_from_cart(user, cart):
        """Create order from shopping cart — multi-step business process."""
        with transaction.atomic():
            order = Order.objects.create(
                customer=user,
                total=cart.total,
            )

            for cart_item in cart.items.select_related("product"):
                OrderItem.objects.create(
                    order=order,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    unit_price=cart_item.product.price,
                )

            cart.clear()
            return order

    @staticmethod
    def complete(order):
        """Complete order — payment + fulfillment."""
        with transaction.atomic():
            PaymentService.capture(order)
            order.status = "completed"
            order.save(update_fields=["status"])

        # Side-effects outside transaction
        NotificationService.send_confirmation(order)
```

```python
# views.py — thin views delegating to services
class OrderCreateView(LoginRequiredMixin, View):
    def post(self, request):
        cart = request.user.cart
        order = OrderService.create_from_cart(request.user, cart)
        return redirect("orders:detail", pk=order.pk)
```

**Rule**: Views call services. Services call models. Models own data logic. This keeps views thin and business logic testable.

---

## MUST DO

- Use Manager/QuerySet as Repository (don't create separate Repository classes)
- Use `transaction.atomic()` for multi-step operations
- Keep views thin — delegate to service layer
- Use constructor injection for testable services
- Use signals for cross-app decoupled side-effects

## MUST NOT DO

- Create a separate Repository layer on top of Django ORM (redundant)
- Put complex business logic in views or serializers
- Use signals for core business logic (hard to trace and test)
- Create God services (one service per domain concern)
- Skip `transaction.atomic()` for multi-model writes

---

## References

- [Django: Managers](https://docs.djangoproject.com/en/5.0/topics/db/managers/)
- [Django: Database transactions](https://docs.djangoproject.com/en/5.0/topics/db/transactions/)
- [Django: Signals](https://docs.djangoproject.com/en/5.0/topics/signals/)
