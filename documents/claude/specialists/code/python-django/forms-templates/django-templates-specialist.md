# Django Templates Specialist
# Djangoテンプレートスペシャリスト
# Chuyen Gia Django Templates

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (rendering) |
| **Directory Pattern** | `templates/`, `apps/{domain}/templates/{domain}/` |
| **Variant** | ALL |
| **Naming Convention** | `snake_case.html`, `{domain}/{action}.html` |
| **Imports From** | — (receives context from views) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | template-inheritance, built-in-tags, custom-tags, custom-filters, context-processors, fragments, static-files |
| **Pattern Numbers** | 12.1–12.7 |
| **Source Paths** | `**/templates/**/*.html` |
| **File Count** | Multiple per app |
| **Imported By** | — (rendered by views) |
| **Specialist Type** | code |
| **Purpose** | Template inheritance (3-level), built-in tags/filters, custom template tags, custom filters, context processors, reusable fragments/components, static file handling |
| **Activation Trigger** | template, extends, block, include, templatetag, filter, context_processor |

---

## Purpose

Define Django template patterns: 3-level template inheritance for DRY layouts, built-in tags and filters for common operations, custom template tags for reusable UI logic, custom filters for value formatting, context processors for global template data, reusable fragments/components with include, and static file management.

---

## Pattern 12.1: Template Inheritance (3-Level)

```html
<!-- templates/base.html — Level 1: site-wide layout -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{% block title %}My Project{% endblock %}</title>
    {% load static %}
    <link rel="stylesheet" href="{% static 'css/style.css' %}">
    {% block extra_css %}{% endblock %}
</head>
<body>
    {% include "partials/navbar.html" %}

    <main class="container mt-4">
        {% if messages %}
        {% for message in messages %}
        <div class="alert alert-{{ message.tags }}">{{ message }}</div>
        {% endfor %}
        {% endif %}

        {% block content %}{% endblock %}
    </main>

    {% include "partials/footer.html" %}
    {% block extra_js %}{% endblock %}
</body>
</html>
```

```html
<!-- templates/articles/base.html — Level 2: section layout -->
{% extends "base.html" %}

{% block title %}Articles — {% block page_title %}{% endblock %}{% endblock %}

{% block content %}
<div class="row">
    <div class="col-md-8">
        {% block article_content %}{% endblock %}
    </div>
    <div class="col-md-4">
        {% block sidebar %}
            {% include "articles/partials/sidebar.html" %}
        {% endblock %}
    </div>
</div>
{% endblock %}
```

```html
<!-- templates/articles/detail.html — Level 3: page -->
{% extends "articles/base.html" %}

{% block page_title %}{{ article.title }}{% endblock %}

{% block article_content %}
<article>
    <h1>{{ article.title }}</h1>
    <p class="text-muted">By {{ article.author.get_full_name }} — {{ article.created_at|date:"M d, Y" }}</p>
    <div>{{ article.body|linebreaks }}</div>
</article>
{% endblock %}
```

---

## Pattern 12.2: Built-in Tags and Filters

```html
<!-- Conditionals -->
{% if article.status == "published" %}
    <span class="badge bg-success">Published</span>
{% elif article.status == "draft" %}
    <span class="badge bg-warning">Draft</span>
{% else %}
    <span class="badge bg-secondary">{{ article.get_status_display }}</span>
{% endif %}

<!-- Loops with forloop -->
{% for article in articles %}
<div class="card mb-3 {% if forloop.first %}border-primary{% endif %}">
    <div class="card-body">
        <h5>{{ forloop.counter }}. {{ article.title }}</h5>
        <p>{{ article.body|truncatewords:30 }}</p>
    </div>
</div>
{% empty %}
<p class="text-muted">No articles found.</p>
{% endfor %}

<!-- URL reversing -->
<a href="{% url 'articles:detail' slug=article.slug %}">Read more</a>
<a href="{% url 'articles:edit' pk=article.pk %}">Edit</a>

<!-- Common filters -->
<p>{{ article.created_at|date:"Y-m-d H:i" }}</p>
<p>{{ article.body|truncatechars:200 }}</p>
<p>{{ article.price|floatformat:2 }}</p>
<p>{{ article.tags.all|join:", " }}</p>
<p>{{ article.description|default:"No description" }}</p>
<p>{{ article.body|striptags|truncatewords:50 }}</p>
```

---

## Pattern 12.3: Custom Template Tags

```python
# apps/articles/templatetags/article_tags.py
from django import template
from apps.articles.models import Article

register = template.Library()


@register.simple_tag
def recent_articles(count=5):
    """Return recent published articles."""
    return Article.objects.filter(status="published").order_by("-created_at")[:count]


@register.simple_tag(takes_context=True)
def active_nav(context, url_name):
    """Return 'active' if current URL matches."""
    request = context["request"]
    if request.resolver_match and request.resolver_match.url_name == url_name:
        return "active"
    return ""


@register.inclusion_tag("articles/partials/article_card.html")
def article_card(article):
    """Render article card component."""
    return {"article": article}
```

```html
<!-- Usage in template -->
{% load article_tags %}

<nav>
    <a class="nav-link {% active_nav 'home' %}" href="{% url 'home' %}">Home</a>
    <a class="nav-link {% active_nav 'articles:list' %}" href="{% url 'articles:list' %}">Articles</a>
</nav>

{% recent_articles 5 as latest %}
{% for article in latest %}
    {% article_card article %}
{% endfor %}
```

---

## Pattern 12.4: Custom Template Filters

```python
# apps/core/templatetags/core_filters.py
from django import template
from django.utils import timezone
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def currency(value, symbol="$"):
    """Format number as currency: {{ price|currency:"¥" }}"""
    try:
        return f"{symbol}{value:,.2f}"
    except (ValueError, TypeError):
        return value


@register.filter
def time_ago(value):
    """Show relative time: {{ created_at|time_ago }}"""
    if not value:
        return ""
    now = timezone.now()
    diff = now - value
    seconds = diff.total_seconds()

    if seconds < 60:
        return "just now"
    if seconds < 3600:
        minutes = int(seconds // 60)
        return f"{minutes}m ago"
    if seconds < 86400:
        hours = int(seconds // 3600)
        return f"{hours}h ago"
    days = int(seconds // 86400)
    if days < 30:
        return f"{days}d ago"
    return value.strftime("%Y-%m-%d")


@register.filter(is_safe=True)
def badge(value, color="secondary"):
    """Render Bootstrap badge: {{ status|badge:"success" }}"""
    return mark_safe(f'<span class="badge bg-{color}">{value}</span>')
```

```html
{% load core_filters %}
<p>{{ product.price|currency:"¥" }}</p>
<p>{{ article.created_at|time_ago }}</p>
<p>{{ article.status|badge:"success" }}</p>
```

---

## Pattern 12.5: Context Processors

```python
# apps/core/context_processors.py
from django.conf import settings


def site_settings(request):
    """Global site settings available in all templates."""
    return {
        "SITE_NAME": getattr(settings, "SITE_NAME", "My Project"),
        "SITE_VERSION": getattr(settings, "SITE_VERSION", "1.0.0"),
    }


def notifications(request):
    """Unread notification count for authenticated users."""
    if request.user.is_authenticated:
        return {
            "unread_count": request.user.notifications.filter(read=False).count(),
        }
    return {"unread_count": 0}
```

```python
# settings.py
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                # Custom
                "apps.core.context_processors.site_settings",
                "apps.core.context_processors.notifications",
            ],
        },
    },
]
```

```html
<!-- Available in every template without passing from view -->
<title>{{ SITE_NAME }}</title>
<span class="badge">{{ unread_count }}</span>
```

---

## Pattern 12.6: Template Fragments and Components

```html
<!-- templates/partials/card.html — reusable component -->
<div class="card {{ extra_class|default:'' }}">
    {% if image %}
    <img src="{{ image }}" class="card-img-top" alt="{{ title }}">
    {% endif %}
    <div class="card-body">
        <h5 class="card-title">{{ title }}</h5>
        {% if subtitle %}<h6 class="card-subtitle text-muted">{{ subtitle }}</h6>{% endif %}
        <p class="card-text">{{ body|truncatewords:30 }}</p>
        {% if url %}
        <a href="{{ url }}" class="btn btn-primary">{{ button_text|default:"Read more" }}</a>
        {% endif %}
    </div>
</div>
```

```html
<!-- Usage with include + with -->
{% include "partials/card.html" with title=article.title body=article.excerpt url=article.get_absolute_url image=article.featured_image.url %}

<!-- Loop with include -->
{% for product in products %}
    {% include "partials/card.html" with title=product.name body=product.description url=product.get_absolute_url extra_class="mb-3" %}
{% endfor %}
```

---

## Pattern 12.7: Static Files in Templates

```html
{% load static %}

<!-- CSS -->
<link rel="stylesheet" href="{% static 'css/style.css' %}">

<!-- JavaScript -->
<script src="{% static 'js/app.js' %}"></script>

<!-- Images -->
<img src="{% static 'images/logo.png' %}" alt="Logo">

<!-- With ManifestStaticFilesStorage (cache busting) -->
<!-- Outputs: /static/css/style.a1b2c3d4.css -->
<link rel="stylesheet" href="{% static 'css/style.css' %}">
```

```python
# settings.py — static configuration
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Production: cache-busting filenames
STORAGES = {
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage",
    },
}
```

**Key rule**: Always use `{% static %}` tag. Never hardcode `/static/` paths.

---

## MUST DO

- Use 3-level template inheritance (base → section → page)
- Use context processors for global data (site settings, notifications)
- Always use `{% url %}` for links (never hardcode URLs)
- Always use `{% static %}` for static files
- Put custom tags in `{app}/templatetags/` with `register = template.Library()`

## MUST NOT DO

- Put business logic in templates (compute in views or model methods)
- Hardcode URLs in templates (use `{% url %}`)
- Embed inline CSS/JS in templates (use static files)
- Skip `{% csrf_token %}` in POST forms
- Create deeply nested template inheritance (max 3 levels)

---

## References

- [Django: Templates](https://docs.djangoproject.com/en/5.0/topics/templates/)
- [Django: Built-in template tags](https://docs.djangoproject.com/en/5.0/ref/templates/builtins/)
- [Django: Custom template tags](https://docs.djangoproject.com/en/5.0/howto/custom-template-tags/)
- [Django: Managing static files](https://docs.djangoproject.com/en/5.0/howto/static-files/)
