# Django Class-Based Views Specialist
# Djangoクラスベースビュースペシャリスト
# Chuyen Gia CBV Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `apps/{domain}/views.py` |
| **Variant** | ALL |
| **Naming Convention** | `PascalCase` + `View` suffix: `ArticleListView`, `ArticleCreateView` |
| **Imports From** | Domain (models), Application (forms) |
| **Cannot Import** | Data Access directly |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | generic-display, generic-edit, get-queryset, get-context-data, auth-mixins, custom-mixins, formview, decision-guide |
| **Pattern Numbers** | 3.1–3.8 |
| **Source Paths** | `**/views.py` |
| **File Count** | 1 per app |
| **Imported By** | URL routing (urls.py) |
| **Specialist Type** | code |
| **Purpose** | ListView, DetailView, CreateView, UpdateView, DeleteView, mixins, get_queryset, get_context_data, authentication |
| **Activation Trigger** | class-based view, ListView, CreateView, get_queryset, get_context_data, CBV |

---

## Purpose

Define Django CBV patterns: generic display views (List/Detail), generic edit views (Create/Update/Delete), queryset customization, context injection, authentication mixins, custom mixins, FormView, and a decision guide for when to use CBV vs FBV.

---

## Pattern 3.1: Generic Display Views

```python
from django.views.generic import ListView, DetailView
from apps.articles.models import Article


class ArticleListView(ListView):
    model = Article
    template_name = "articles/article_list.html"
    context_object_name = "articles"  # Default: object_list
    paginate_by = 20
    ordering = ["-created_at"]


class ArticleDetailView(DetailView):
    model = Article
    template_name = "articles/article_detail.html"
    context_object_name = "article"  # Default: object
    slug_url_kwarg = "slug"          # URL param name
```

---

## Pattern 3.2: Generic Edit Views

```python
from django.views.generic import CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from apps.articles.models import Article
from apps.articles.forms import ArticleForm


class ArticleCreateView(CreateView):
    model = Article
    form_class = ArticleForm
    template_name = "articles/article_form.html"
    success_url = reverse_lazy("articles:list")

    def form_valid(self, form):
        form.instance.author = self.request.user  # Set author
        return super().form_valid(form)


class ArticleUpdateView(UpdateView):
    model = Article
    form_class = ArticleForm
    template_name = "articles/article_form.html"

    def get_success_url(self):
        return reverse_lazy("articles:detail", kwargs={"slug": self.object.slug})


class ArticleDeleteView(DeleteView):
    model = Article
    template_name = "articles/article_confirm_delete.html"
    success_url = reverse_lazy("articles:list")
```

---

## Pattern 3.3: get_queryset (Filter by User)

```python
class MyArticleListView(ListView):
    model = Article
    template_name = "articles/my_articles.html"

    def get_queryset(self):
        """Show only current user's articles."""
        return Article.objects.filter(
            author=self.request.user
        ).select_related("category").order_by("-created_at")
```

---

## Pattern 3.4: get_context_data (Extra Context)

```python
class ArticleDetailView(DetailView):
    model = Article

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["related_articles"] = Article.objects.filter(
            category=self.object.category
        ).exclude(pk=self.object.pk)[:5]
        context["comment_form"] = CommentForm()
        return context
```

---

## Pattern 3.5: Authentication Mixins

```python
from django.contrib.auth.mixins import (
    LoginRequiredMixin,
    PermissionRequiredMixin,
    UserPassesTestMixin,
)


# IMPORTANT: Mixin MUST be FIRST in MRO (before View class)
class ArticleCreateView(LoginRequiredMixin, CreateView):
    model = Article
    # LoginRequiredMixin redirects to LOGIN_URL if not authenticated


class ArticleAdminView(PermissionRequiredMixin, UpdateView):
    model = Article
    permission_required = "articles.change_article"


class ArticleOwnerView(UserPassesTestMixin, UpdateView):
    model = Article

    def test_func(self):
        """Only article author can edit."""
        return self.get_object().author == self.request.user
```

**Key rule**: Always place mixin FIRST in class definition (before `CreateView`, etc.).

---

## Pattern 3.6: Custom Mixins

```python
from django.contrib import messages


class FormMessageMixin:
    """Add success/error messages to form views."""
    success_message = "Saved successfully."

    def form_valid(self, form):
        messages.success(self.request, self.success_message)
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Please correct the errors below.")
        return super().form_invalid(form)


class OwnerMixin:
    """Filter queryset to current user's objects."""
    def get_queryset(self):
        return super().get_queryset().filter(author=self.request.user)


# Compose mixins
class ArticleCreateView(LoginRequiredMixin, FormMessageMixin, CreateView):
    model = Article
    success_message = "Article created!"
```

---

## Pattern 3.7: FormView (Non-Model Forms)

```python
from django.views.generic import FormView


class ContactFormView(FormView):
    template_name = "contact.html"
    form_class = ContactForm
    success_url = reverse_lazy("contact:success")

    def form_valid(self, form):
        form.send_email()  # Custom form method
        return super().form_valid(form)
```

---

## Pattern 3.8: CBV Decision Guide

| Task | View Class | Key Override |
|------|-----------|-------------|
| Display list | `ListView` | `get_queryset`, `paginate_by` |
| Display detail | `DetailView` | `get_context_data` |
| Create object | `CreateView` | `form_valid` (set author) |
| Update object | `UpdateView` | `get_queryset` (ownership) |
| Delete object | `DeleteView` | `get_queryset` (ownership) |
| Non-model form | `FormView` | `form_valid` |
| Static page | `TemplateView` | `get_context_data` |
| Redirect | `RedirectView` | `get_redirect_url` |

---

## MUST DO

- Place auth mixins FIRST in class definition (MRO)
- Override `get_queryset` for user-scoped data
- Use `reverse_lazy` (not `reverse`) for class attributes
- Use `form_valid` to set request.user on create
- Compose small mixins for reusable behavior

## MUST NOT DO

- Put business logic in views (delegate to models/services)
- Use CBV for simple one-off endpoints (use FBV)
- Skip `LoginRequiredMixin` on protected views
- Use `reverse` in class attributes (evaluated at import time)
- Override `dispatch` when a mixin would suffice

---

## References

- [Django: Class-Based Views](https://docs.djangoproject.com/en/5.0/topics/class-based-views/)
- [CCBV: Classy Class-Based Views](https://ccbv.co.uk/)
- [Django: Mixins](https://docs.djangoproject.com/en/5.0/topics/class-based-views/mixins/)
