# Django HTMX Specialist
# Django HTMXスペシャリスト
# Chuyen Gia Django HTMX

**Stack**: Python 3.12+ / Django 5.x / django-htmx 1.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (server-side reactivity) |
| **Directory Pattern** | `apps/{domain}/views.py`, `templates/{domain}/partials/` |
| **Variant** | ALL |
| **Naming Convention** | `partials/*.html` for fragments, views with `htmx` suffix |
| **Imports From** | Domain (models, forms) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | htmx-setup, partial-render, hx-get-post, hx-swap, htmx-forms, lazy-loading |
| **Pattern Numbers** | 12.8–12.13 |
| **Source Paths** | `**/views.py`, `**/templates/**/partials/*.html` |
| **File Count** | Multiple per app |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | django-htmx setup, partial template rendering, hx-get/hx-post patterns, hx-swap strategies, HTMX + Django forms integration, lazy loading |
| **Activation Trigger** | htmx, hx-get, hx-post, hx-swap, partial, django-htmx, HtmxMiddleware |

---

## Purpose

Define django-htmx patterns for server-side reactivity: middleware setup with request.htmx detection, partial template rendering for fragment updates, hx-get/hx-post for inline editing and actions, hx-swap strategies for DOM manipulation, form validation with partial re-render, and lazy loading of deferred content.

---

## Pattern 12.8: django-htmx Setup

```bash
pip install django-htmx
```

```python
# settings.py
INSTALLED_APPS = [
    "django_htmx",
    # ...
]

MIDDLEWARE = [
    # ...
    "django_htmx.middleware.HtmxMiddleware",
]
```

```html
<!-- base.html — include HTMX script -->
<head>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
</head>
<body hx-headers='{"X-CSRFToken": "{{ csrf_token }}"}'>
    {% block content %}{% endblock %}
</body>
```

**Key rule**: Set `hx-headers` with CSRF token on `<body>` so all HTMX requests include it.

---

## Pattern 12.9: Partial Template Rendering

```python
# views.py
from django.shortcuts import render
from apps.articles.models import Article


def article_list(request):
    articles = Article.objects.filter(status="published").order_by("-created_at")

    if request.htmx:
        # HTMX request — return only the list fragment
        return render(request, "articles/partials/article_list.html", {
            "articles": articles,
        })

    # Full page request
    return render(request, "articles/list.html", {
        "articles": articles,
    })
```

```html
<!-- templates/articles/list.html — full page -->
{% extends "base.html" %}
{% block content %}
<h1>Articles</h1>
<div id="article-list">
    {% include "articles/partials/article_list.html" %}
</div>
{% endblock %}
```

```html
<!-- templates/articles/partials/article_list.html — fragment -->
{% for article in articles %}
<div class="card mb-3" id="article-{{ article.pk }}">
    <div class="card-body">
        <h5>{{ article.title }}</h5>
        <p>{{ article.excerpt }}</p>
    </div>
</div>
{% empty %}
<p class="text-muted">No articles found.</p>
{% endfor %}
```

---

## Pattern 12.10: hx-get / hx-post Patterns

```html
<!-- Inline edit: click to load edit form -->
<div id="article-{{ article.pk }}">
    <h5>{{ article.title }}</h5>
    <button hx-get="{% url 'articles:edit_form' pk=article.pk %}"
            hx-target="#article-{{ article.pk }}"
            hx-swap="innerHTML"
            class="btn btn-sm btn-outline-primary">
        Edit
    </button>
</div>
```

```python
# views.py
def article_edit_form(request, pk):
    """Return inline edit form fragment."""
    article = get_object_or_404(Article, pk=pk)
    form = ArticleInlineForm(instance=article)
    return render(request, "articles/partials/edit_form.html", {
        "article": article,
        "form": form,
    })


def article_update_htmx(request, pk):
    """Handle inline edit submission."""
    article = get_object_or_404(Article, pk=pk)
    form = ArticleInlineForm(request.POST, instance=article)

    if form.is_valid():
        article = form.save()
        return render(request, "articles/partials/article_row.html", {
            "article": article,
        })

    return render(request, "articles/partials/edit_form.html", {
        "article": article,
        "form": form,
    })
```

```html
<!-- templates/articles/partials/edit_form.html -->
<form hx-post="{% url 'articles:update_htmx' pk=article.pk %}"
      hx-target="#article-{{ article.pk }}"
      hx-swap="outerHTML">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit" class="btn btn-primary btn-sm">Save</button>
    <button hx-get="{% url 'articles:row' pk=article.pk %}"
            hx-target="#article-{{ article.pk }}"
            hx-swap="outerHTML"
            class="btn btn-secondary btn-sm">
        Cancel
    </button>
</form>
```

---

## Pattern 12.11: hx-swap Strategies

```html
<!-- innerHTML (default) — replace inner content -->
<div id="results"
     hx-get="{% url 'search' %}"
     hx-trigger="keyup changed delay:300ms from:#search-input"
     hx-swap="innerHTML">
</div>

<!-- outerHTML — replace the entire element -->
<div id="article-{{ article.pk }}"
     hx-delete="{% url 'articles:delete' pk=article.pk %}"
     hx-swap="outerHTML"
     hx-confirm="Delete this article?">
</div>

<!-- beforeend — append to list (infinite scroll) -->
<div id="article-list">
    {% for article in articles %}
        {% include "articles/partials/article_card.html" %}
    {% endfor %}
</div>
<button hx-get="{% url 'articles:list' %}?page={{ next_page }}"
        hx-target="#article-list"
        hx-swap="beforeend"
        hx-select=".card">
    Load more
</button>

<!-- delete — remove element after request -->
<tr id="row-{{ item.pk }}">
    <td>{{ item.name }}</td>
    <td>
        <button hx-delete="{% url 'items:delete' pk=item.pk %}"
                hx-target="#row-{{ item.pk }}"
                hx-swap="delete"
                hx-confirm="Delete?">
            Delete
        </button>
    </td>
</tr>
```

---

## Pattern 12.12: HTMX + Django Forms

```python
# views.py — form with partial re-render on validation error
def contact_form(request):
    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            form.save()
            return render(request, "contact/partials/success.html")
        # Validation failed — re-render form with errors
        return render(request, "contact/partials/form.html", {
            "form": form,
        })

    form = ContactForm()
    if request.htmx:
        return render(request, "contact/partials/form.html", {"form": form})
    return render(request, "contact/page.html", {"form": form})
```

```html
<!-- templates/contact/page.html -->
{% extends "base.html" %}
{% block content %}
<h1>Contact Us</h1>
<div id="contact-form">
    {% include "contact/partials/form.html" %}
</div>
{% endblock %}
```

```html
<!-- templates/contact/partials/form.html -->
<form hx-post="{% url 'contact:submit' %}"
      hx-target="#contact-form"
      hx-swap="innerHTML">
    {% csrf_token %}
    {% load crispy_forms_tags %}
    {% crispy form %}
    <button type="submit" class="btn btn-primary">Send</button>
</form>
```

```html
<!-- templates/contact/partials/success.html -->
<div class="alert alert-success">
    <strong>Thank you!</strong> Your message has been sent.
</div>
```

---

## Pattern 12.13: Lazy Loading

```html
<!-- Load sidebar content on scroll reveal -->
<div hx-get="{% url 'sidebar:recent' %}"
     hx-trigger="revealed"
     hx-swap="innerHTML">
    <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
</div>

<!-- Load tab content on click -->
<ul class="nav nav-tabs">
    <li class="nav-item">
        <a class="nav-link active"
           hx-get="{% url 'articles:tab_recent' %}"
           hx-target="#tab-content"
           hx-swap="innerHTML"
           hx-trigger="click, load">
            Recent
        </a>
    </li>
    <li class="nav-item">
        <a class="nav-link"
           hx-get="{% url 'articles:tab_popular' %}"
           hx-target="#tab-content"
           hx-swap="innerHTML">
            Popular
        </a>
    </li>
</ul>
<div id="tab-content">
    <!-- Loaded via HTMX -->
</div>

<!-- Polling for live updates -->
<div hx-get="{% url 'notifications:count' %}"
     hx-trigger="every 30s"
     hx-swap="innerHTML">
    <span class="badge">{{ unread_count }}</span>
</div>
```

---

## MUST DO

- Install `django-htmx` middleware for `request.htmx` detection
- Set CSRF token via `hx-headers` on `<body>` tag
- Separate full-page templates from partial fragments (`partials/` folder)
- Return only the changed fragment on HTMX requests, not full page
- Use progressive enhancement (page works without JS)

## MUST NOT DO

- Depend on JavaScript for basic page functionality
- Skip CSRF token in HTMX requests (use `hx-headers` or `{% csrf_token %}`)
- Return full page HTML for HTMX requests (wastes bandwidth)
- Use HTMX for heavy client-side state management (use SPA framework instead)
- Mix HTMX partial responses with DRF JSON API endpoints

---

## References

- [django-htmx](https://django-htmx.readthedocs.io/)
- [HTMX docs](https://htmx.org/docs/)
- [HTMX examples](https://htmx.org/examples/)
