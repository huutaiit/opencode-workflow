# Django URL Routing Specialist
# Django URLルーティングスペシャリスト
# Chuyen Gia URL Routing Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `apps/{domain}/urls.py`, `config/urls.py` |
| **Variant** | ALL |
| **Naming Convention** | `urls.py` per app, `app_name` required |
| **Imports From** | Views |
| **Cannot Import** | Models directly |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | url-patterns, app-namespacing, url-include, custom-converters, url-reversing |
| **Pattern Numbers** | 4.6–4.10 |
| **Source Paths** | `**/urls.py` |
| **File Count** | 1 per app + 1 root |
| **Imported By** | Root URL configuration |
| **Specialist Type** | code |
| **Purpose** | path(), re_path(), include(), namespace, app_name, URL reversing, custom converters |
| **Activation Trigger** | urls.py, path, include, namespace, reverse, URL patterns |

---

## Purpose

Define Django URL routing patterns: path with converters, app namespacing, URL include composition, custom path converters, and URL reversing best practices.

---

## Pattern 4.6: URL Patterns

```python
# apps/articles/urls.py
from django.urls import path
from apps.articles import views

app_name = "articles"  # REQUIRED for namespacing

urlpatterns = [
    path("", views.ArticleListView.as_view(), name="list"),
    path("<slug:slug>/", views.ArticleDetailView.as_view(), name="detail"),
    path("create/", views.ArticleCreateView.as_view(), name="create"),
    path("<slug:slug>/edit/", views.ArticleUpdateView.as_view(), name="update"),
    path("<slug:slug>/delete/", views.ArticleDeleteView.as_view(), name="delete"),
]
```

**Built-in converters**: `str`, `int`, `slug`, `uuid`, `path`

---

## Pattern 4.7: App Namespacing

```python
# config/urls.py
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("articles/", include("apps.articles.urls")),  # namespace from app_name
    path("api/v1/", include("apps.api.urls", namespace="api-v1")),
]

# Usage in templates
# {% url 'articles:detail' slug=article.slug %}

# Usage in views
# reverse('articles:detail', kwargs={'slug': article.slug})
```

---

## Pattern 4.8: API Versioning with URL Include

```python
# config/urls.py
urlpatterns = [
    path("api/v1/", include("apps.api.v1.urls")),
    path("api/v2/", include("apps.api.v2.urls")),
]
```

---

## Pattern 4.9: Custom Path Converters

```python
# apps/core/converters.py
class FourDigitYearConverter:
    regex = r"[0-9]{4}"

    def to_python(self, value: str) -> int:
        return int(value)

    def to_url(self, value: int) -> str:
        return f"{value:04d}"


# config/urls.py
from django.urls import register_converter
from apps.core.converters import FourDigitYearConverter

register_converter(FourDigitYearConverter, "yyyy")

urlpatterns = [
    path("archive/<yyyy:year>/", views.archive_view, name="archive"),
]
```

---

## Pattern 4.10: URL Reversing

```python
from django.urls import reverse, reverse_lazy

# In views
url = reverse("articles:detail", kwargs={"slug": "my-article"})

# In class attributes (evaluated at import time — use lazy)
class ArticleCreateView(CreateView):
    success_url = reverse_lazy("articles:list")

# In templates
# {% url 'articles:detail' slug=article.slug %}

# In serializers (DRF)
from rest_framework.reverse import reverse
url = reverse("articles:detail", kwargs={"slug": obj.slug}, request=request)
```

---

## MUST DO

- Set `app_name` in every app's `urls.py`
- Use `reverse()` / `{% url %}` (never hardcode URLs)
- Use `reverse_lazy` for class-level attributes
- Use built-in converters (`int`, `slug`, `uuid`) where possible

## MUST NOT DO

- Hardcode URLs in views or templates
- Skip `app_name` (breaks namespacing)
- Use `re_path` when `path` with converter suffices
- Use `reverse` in class attributes (use `reverse_lazy`)

---

## References

- [Django: URL Dispatcher](https://docs.djangoproject.com/en/5.0/topics/http/urls/)
- [Django: reverse()](https://docs.djangoproject.com/en/5.0/ref/urlresolvers/)
