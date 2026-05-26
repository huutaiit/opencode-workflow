# DRF Filtering & Pagination Specialist
# DRFフィルタリング・ページネーションスペシャリスト
# Chuyen Gia Filtering va Pagination DRF

**Stack**: Python 3.12+ / Django 5.x / DRF 3.15+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `apps/{domain}/filters.py`, settings |
| **Variant** | ALL |
| **Naming Convention** | `filters.py`, `*Filter` suffix |
| **Imports From** | Domain (models) |
| **Cannot Import** | Views |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | django-filter, search-filter, ordering-filter, page-number, cursor-pagination, custom-pagination, combined |
| **Pattern Numbers** | 8.1–8.7 |
| **Source Paths** | `**/filters.py` |
| **File Count** | 1 per app with filtering |
| **Imported By** | ViewSets |
| **Specialist Type** | code |
| **Purpose** | django-filter FilterSet, SearchFilter, OrderingFilter, pagination styles, CursorPagination, custom response, combined setup |
| **Activation Trigger** | filter, search, ordering, pagination, page, limit, django-filter |

---

## Purpose

Define DRF filtering and pagination: django-filter for complex filtering, SearchFilter for text search, OrderingFilter for sorting, PageNumberPagination and CursorPagination, custom pagination response format, and combining all filters in a single ViewSet.

---

## Pattern 8.1: django-filter Integration

```python
# pip install django-filter
# apps/products/filters.py
import django_filters
from apps.products.models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    category = django_filters.CharFilter(field_name="category__slug")
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")

    class Meta:
        model = Product
        fields = ["status", "is_active"]

# Usage: GET /api/products/?min_price=10&max_price=100&category=electronics
```

---

## Pattern 8.2: SearchFilter

```python
class ProductViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "title",           # icontains (default)
        "=sku",            # exact match
        "^name",           # startswith
        "description",     # icontains
        "category__name",  # related field
    ]
# Usage: GET /api/products/?search=laptop
```

---

## Pattern 8.3: OrderingFilter

```python
class ProductViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["price", "created_at", "name"]
    ordering = ["-created_at"]  # Default ordering

# Usage: GET /api/products/?ordering=-price,name
```

---

## Pattern 8.4: PageNumberPagination

```python
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

# Settings (global default)
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
}
# Response: {"count": 100, "next": "...?page=2", "previous": null, "results": [...]}
```

---

## Pattern 8.5: CursorPagination (Infinite Scroll)

```python
from rest_framework.pagination import CursorPagination


class TimelinePagination(CursorPagination):
    page_size = 20
    ordering = "-created_at"
    cursor_query_param = "cursor"

# Usage: GET /api/feed/?cursor=cD0yMDI0LTEyLTI1
# Benefits: No COUNT query (faster), consistent for real-time data
```

---

## Pattern 8.6: Custom Pagination Response

```python
class CustomPagination(PageNumberPagination):
    def get_paginated_response(self, data):
        return Response({
            "meta": {
                "total": self.page.paginator.count,
                "page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "total_pages": self.page.paginator.num_pages,
            },
            "links": {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
            },
            "results": data,
        })
```

---

## Pattern 8.7: Combined Filtering + Pagination

```python
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    pagination_class = StandardPagination

    filter_backends = [
        DjangoFilterBackend,     # ?category=electronics&status=active
        filters.SearchFilter,    # ?search=laptop
        filters.OrderingFilter,  # ?ordering=-price
    ]
    filterset_class = ProductFilter
    search_fields = ["title", "description"]
    ordering_fields = ["price", "created_at"]
    ordering = ["-created_at"]
```

---

## MUST DO

- Use CursorPagination for infinite scroll / large datasets
- Use django-filter for complex filtering (ranges, dates, relations)
- Set `max_page_size` to prevent abuse
- Add index on ordering fields
- Combine SearchFilter + OrderingFilter + DjangoFilterBackend

## MUST NOT DO

- Skip pagination (unbounded queries kill performance)
- Allow filtering on unindexed fields
- Use PageNumberPagination for real-time feeds (inconsistent)
- Set page_size > 100 (too much data per request)
- Allow ordering on computed/annotated fields without index

---

## References

- [DRF: Filtering](https://www.django-rest-framework.org/api-guide/filtering/)
- [DRF: Pagination](https://www.django-rest-framework.org/api-guide/pagination/)
- [django-filter](https://django-filter.readthedocs.io/)
