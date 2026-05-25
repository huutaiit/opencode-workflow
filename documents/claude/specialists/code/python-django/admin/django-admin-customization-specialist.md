# Django Admin Customization Specialist
# Django管理画面カスタマイズスペシャリスト
# Chuyen Gia Tuy Chinh Django Admin

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (admin interface) |
| **Directory Pattern** | `apps/{domain}/admin.py`, `config/admin.py` |
| **Variant** | ALL |
| **Naming Convention** | `admin.py`, `PascalCase` + `AdminSite` suffix |
| **Imports From** | Domain (models), django.contrib.admin |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | custom-adminsite, import-export, unfold-ui, custom-views, audit-log, multi-site |
| **Pattern Numbers** | 10.8–10.13 |
| **Source Paths** | `**/admin.py`, `config/admin.py` |
| **File Count** | 1 per project + 1 per app |
| **Imported By** | — (auto-discovered) |
| **Specialist Type** | code |
| **Purpose** | Custom AdminSite, django-import-export, django-unfold UI, custom admin views, audit logging, multi-site admin |
| **Activation Trigger** | AdminSite, admin dashboard, import-export, unfold, admin theme, auditlog |

---

## Purpose

Define advanced Django admin customization: custom AdminSite for branding, django-import-export for CSV/Excel data management, django-unfold for modern admin UI, custom non-model views in admin, audit logging with django-simple-history or django-auditlog, and multi-site admin for role separation.

---

## Pattern 10.8: Custom AdminSite

```python
# config/admin.py
from django.contrib import admin


class MyAdminSite(admin.AdminSite):
    site_header = "My Project Admin"
    site_title = "My Project"
    index_title = "Dashboard"
    site_url = "/app/"
    empty_value_display = "—"

    def has_permission(self, request):
        """Restrict admin access to staff users."""
        return request.user.is_active and request.user.is_staff


# Create instance
my_admin = MyAdminSite(name="myadmin")
```

```python
# config/urls.py
from config.admin import my_admin

urlpatterns = [
    path("admin/", my_admin.urls),
]
```

```python
# apps/articles/admin.py — register with custom site
from config.admin import my_admin
from apps.articles.models import Article


@admin.register(Article, site=my_admin)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "created_at"]
```

---

## Pattern 10.9: django-import-export

```python
# pip install django-import-export

from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget
from apps.products.models import Product, Category


class ProductResource(resources.ModelResource):
    category = fields.Field(
        column_name="category",
        attribute="category",
        widget=ForeignKeyWidget(Category, field="name"),
    )

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "price", "category", "stock", "is_active"]
        export_order = fields
        import_id_fields = ["sku"]
        skip_unchanged = True
        report_skipped = True


@admin.register(Product)
class ProductAdmin(ImportExportModelAdmin):
    resource_classes = [ProductResource]
    list_display = ["name", "sku", "price", "category", "stock", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "sku"]
```

Supports CSV, XLSX, JSON, YAML formats out of the box.

---

## Pattern 10.10: django-unfold (Modern UI)

```python
# pip install django-unfold

# settings.py
INSTALLED_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.import_export",
    "django.contrib.admin",
    # ...
]

UNFOLD = {
    "SITE_TITLE": "My Project",
    "SITE_HEADER": "My Project Admin",
    "SITE_SYMBOL": "settings",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Content",
                "separator": True,
                "items": [
                    {
                        "title": "Articles",
                        "icon": "article",
                        "link": "/admin/articles/article/",
                    },
                    {
                        "title": "Categories",
                        "icon": "category",
                        "link": "/admin/articles/category/",
                    },
                ],
            },
        ],
    },
}
```

```python
# admin.py — unfold ModelAdmin
from unfold.admin import ModelAdmin


@admin.register(Article)
class ArticleAdmin(ModelAdmin):
    list_display = ["title", "status", "created_at"]
    list_filter_submit = True  # unfold: apply filters on submit
```

---

## Pattern 10.11: Custom Admin Views

```python
from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path


class MyAdminSite(admin.AdminSite):
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("dashboard/", self.admin_view(self.dashboard_view), name="dashboard"),
            path("reports/", self.admin_view(self.reports_view), name="reports"),
        ]
        return custom_urls + urls

    def dashboard_view(self, request):
        from apps.orders.models import Order
        from apps.users.models import User
        from django.utils import timezone

        today = timezone.now().date()
        context = {
            **self.each_context(request),
            "title": "Dashboard",
            "total_users": User.objects.count(),
            "today_orders": Order.objects.filter(created_at__date=today).count(),
            "today_revenue": Order.objects.filter(
                created_at__date=today, status="delivered"
            ).aggregate(total=Sum("total"))["total"] or 0,
        }
        return TemplateResponse(request, "admin/dashboard.html", context)

    def reports_view(self, request):
        context = {
            **self.each_context(request),
            "title": "Reports",
        }
        return TemplateResponse(request, "admin/reports.html", context)
```

**Key rule**: Always wrap custom views with `self.admin_view()` for permission checks.

---

## Pattern 10.12: Admin Audit Log

```python
# Option A: django-simple-history
# pip install django-simple-history

# models.py
from simple_history.models import HistoricalRecords


class Article(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=20, default="draft")
    history = HistoricalRecords()


# admin.py
from simple_history.admin import SimpleHistoryAdmin


@admin.register(Article)
class ArticleAdmin(SimpleHistoryAdmin):
    list_display = ["title", "status", "created_at"]
    history_list_display = ["status"]
```

```python
# Option B: django-auditlog
# pip install django-auditlog

# settings.py
INSTALLED_APPS = [
    "auditlog",
    # ...
]
MIDDLEWARE = [
    # ...
    "auditlog.middleware.AuditlogMiddleware",
]

# models.py
from auditlog.registry import auditlog


class Article(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=20, default="draft")


auditlog.register(Article)
```

---

## Pattern 10.13: Multi-Site Admin

```python
# config/admin.py
from django.contrib import admin


class StaffAdminSite(admin.AdminSite):
    site_header = "Staff Portal"
    site_title = "Staff"

    def has_permission(self, request):
        return request.user.is_active and request.user.is_staff


class SuperAdminSite(admin.AdminSite):
    site_header = "Super Admin"
    site_title = "Super Admin"

    def has_permission(self, request):
        return request.user.is_active and request.user.is_superuser


staff_admin = StaffAdminSite(name="staff_admin")
super_admin = SuperAdminSite(name="super_admin")
```

```python
# config/urls.py
from config.admin import staff_admin, super_admin

urlpatterns = [
    path("staff/", staff_admin.urls),
    path("super-admin/", super_admin.urls),
]
```

```python
# apps/articles/admin.py — register with different sites
from config.admin import staff_admin, super_admin

# Staff sees limited fields
@admin.register(Article, site=staff_admin)
class ArticleStaffAdmin(admin.ModelAdmin):
    list_display = ["title", "status"]
    readonly_fields = ["author"]

# Superadmin sees everything
@admin.register(Article, site=super_admin)
class ArticleSuperAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status", "created_at", "updated_at"]
```

---

## MUST DO

- Use django-import-export for data management (CSV/Excel import/export)
- Brand admin with custom AdminSite for client projects
- Add audit logging (simple-history or auditlog) for sensitive models
- Wrap custom admin views with `self.admin_view()` for permission checks
- Use `self.each_context(request)` in custom view context

## MUST NOT DO

- Build end-user dashboards inside admin (use custom views/frontend)
- Skip audit logging for models with financial or personal data
- Expose multiple admin sites without proper permission separation
- Override admin templates without extending the original blocks
- Install django-unfold without testing existing admin customizations

---

## References

- [django-import-export](https://django-import-export.readthedocs.io/)
- [django-unfold](https://unfoldadmin.com/)
- [django-simple-history](https://django-simple-history.readthedocs.io/)
- [django-auditlog](https://django-auditlog.readthedocs.io/)
