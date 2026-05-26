# Django Admin Specialist
# Django管理画面スペシャリスト
# Chuyen Gia Django Admin

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (admin interface) |
| **Directory Pattern** | `apps/{domain}/admin.py` |
| **Variant** | ALL |
| **Naming Convention** | `admin.py`, `PascalCase` + `Admin` suffix |
| **Imports From** | Domain (models) |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-admin, inline, actions, fieldsets, readonly, custom-filter, admin-permissions |
| **Pattern Numbers** | 10.1–10.7 |
| **Source Paths** | `**/admin.py` |
| **File Count** | 1 per app |
| **Imported By** | — (auto-discovered) |
| **Specialist Type** | code |
| **Purpose** | ModelAdmin registration, list_display, search, filters, inline models, custom actions, fieldsets, admin permissions |
| **Activation Trigger** | admin.py, ModelAdmin, admin.site.register, list_display, TabularInline |

---

## Purpose

Define Django admin patterns: ModelAdmin with list_display/search/filter, inline models for related data, custom admin actions for bulk operations, fieldset layouts, readonly and computed display fields, custom list filters, and role-based admin permissions.

---

## Pattern 10.1: ModelAdmin Registration

```python
from django.contrib import admin
from apps.articles.models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status", "category", "created_at"]
    list_filter = ["status", "category", "created_at"]
    search_fields = ["title", "body", "author__email"]
    list_per_page = 25
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    list_editable = ["status"]
    list_display_links = ["title"]
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ["author"]
    autocomplete_fields = ["category"]
```

**Key rule**: Always define `list_display`, `list_filter`, `search_fields` for usability.

---

## Pattern 10.2: Inline Models

```python
from apps.orders.models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    min_num = 1
    max_num = 50
    fields = ["product", "quantity", "unit_price", "subtotal"]
    readonly_fields = ["subtotal"]
    autocomplete_fields = ["product"]

    def subtotal(self, obj):
        return obj.quantity * obj.unit_price

    subtotal.short_description = "Subtotal"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "status", "total", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["id", "customer__email"]
    inlines = [OrderItemInline]
```

Use `TabularInline` for compact data, `StackedInline` for forms with many fields. Always set `extra = 0`.

---

## Pattern 10.3: Custom Admin Actions

```python
from django.contrib import admin, messages


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "created_at"]
    actions = ["publish_selected", "archive_selected", "export_csv"]

    @admin.action(description="Publish selected articles")
    def publish_selected(self, request, queryset):
        updated = queryset.filter(status="draft").update(status="published")
        self.message_user(request, f"{updated} articles published.", messages.SUCCESS)

    @admin.action(description="Archive selected articles")
    def archive_selected(self, request, queryset):
        updated = queryset.update(status="archived")
        self.message_user(request, f"{updated} articles archived.", messages.SUCCESS)

    @admin.action(description="Export selected as CSV")
    def export_csv(self, request, queryset):
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="articles.csv"'

        writer = csv.writer(response)
        writer.writerow(["Title", "Status", "Author", "Created"])
        for article in queryset.select_related("author"):
            writer.writerow([article.title, article.status, article.author.email, article.created_at])

        return response
```

---

## Pattern 10.4: Fieldsets and Layout

```python
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    fieldsets = [
        (None, {
            "fields": ["title", "slug", "author"],
        }),
        ("Content", {
            "fields": ["body", "excerpt", "featured_image"],
        }),
        ("Publishing", {
            "fields": ["status", "published_at", "category", "tags"],
        }),
        ("SEO", {
            "fields": ["meta_title", "meta_description"],
            "classes": ["collapse"],
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"],
            "classes": ["collapse"],
        }),
    ]
    readonly_fields = ["created_at", "updated_at"]
    prepopulated_fields = {"slug": ("title",)}
```

Use `"classes": ["collapse"]` for less-used sections. Group related fields logically.

---

## Pattern 10.5: readonly_fields and Computed Display

```python
from django.utils.html import format_html


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "colored_status", "formatted_total", "created_at"]
    readonly_fields = ["total", "created_at", "updated_at"]

    @admin.display(description="Status", ordering="status")
    def colored_status(self, obj):
        colors = {
            "pending": "#ffa500",
            "confirmed": "#007bff",
            "shipped": "#17a2b8",
            "delivered": "#28a745",
            "cancelled": "#dc3545",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html('<span style="color: {};">{}</span>', color, obj.get_status_display())

    @admin.display(description="Total (¥)", ordering="total")
    def formatted_total(self, obj):
        return f"¥{obj.total:,.0f}"
```

---

## Pattern 10.6: Custom List Filters

```python
from django.utils import timezone


class DateRangeFilter(admin.SimpleListFilter):
    title = "date range"
    parameter_name = "date_range"

    def lookups(self, request, model_admin):
        return [
            ("today", "Today"),
            ("week", "This week"),
            ("month", "This month"),
            ("quarter", "This quarter"),
        ]

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == "today":
            return queryset.filter(created_at__date=now.date())
        if self.value() == "week":
            return queryset.filter(created_at__gte=now - timezone.timedelta(days=7))
        if self.value() == "month":
            return queryset.filter(created_at__month=now.month, created_at__year=now.year)
        if self.value() == "quarter":
            quarter_start_month = ((now.month - 1) // 3) * 3 + 1
            return queryset.filter(
                created_at__month__gte=quarter_start_month,
                created_at__year=now.year,
            )
        return queryset


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_filter = ["status", DateRangeFilter]
```

---

## Pattern 10.7: Admin Permissions

```python
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status"]

    def has_add_permission(self, request):
        """Only editors and admins can add."""
        return request.user.groups.filter(name__in=["editors", "admins"]).exists()

    def has_change_permission(self, request, obj=None):
        """Editors can edit own articles, admins can edit all."""
        if obj is None:
            return True
        if request.user.groups.filter(name="admins").exists():
            return True
        return obj.author == request.user

    def has_delete_permission(self, request, obj=None):
        """Only admins can delete."""
        return request.user.groups.filter(name="admins").exists()

    def get_queryset(self, request):
        """Non-admins only see their own articles."""
        qs = super().get_queryset(request)
        if request.user.groups.filter(name="admins").exists():
            return qs
        return qs.filter(author=request.user)
```

---

## MUST DO

- Define `list_display`, `list_filter`, `search_fields` for every ModelAdmin
- Use `@admin.register` decorator (not `admin.site.register`)
- Set `extra = 0` on inlines to avoid empty forms
- Use `raw_id_fields` or `autocomplete_fields` for ForeignKey with many records
- Use `readonly_fields` for computed or auto-generated fields

## MUST NOT DO

- Build end-user UI in admin (admin is for staff only)
- Expose sensitive fields (passwords, tokens) in `list_display`
- Skip `search_fields` (makes admin unusable at scale)
- Override admin for non-staff users (use custom views instead)
- Use `list_editable` on fields that require validation

---

## References

- [Django: The Django admin site](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/)
- [Django: ModelAdmin options](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/#modeladmin-options)
- [Django: InlineModelAdmin](https://docs.djangoproject.com/en/5.0/ref/contrib/admin/#inlinemodeladmin-objects)
