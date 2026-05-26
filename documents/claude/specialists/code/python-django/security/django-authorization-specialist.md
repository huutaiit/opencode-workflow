# Django Authorization Specialist
# Django認可スペシャリスト
# Chuyen Gia Phan Quyen Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `apps/{domain}/permissions.py`, `apps/{domain}/views.py` |
| **Variant** | ALL |
| **Naming Convention** | `permissions.py`, decorators in views |
| **Imports From** | django.contrib.auth, django-guardian |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-permissions, custom-permissions, groups, view-decorators, guardian-object-level, template-permissions |
| **Pattern Numbers** | 16.1–16.6 |
| **Source Paths** | `**/permissions.py`, `**/views.py`, `**/models.py` |
| **File Count** | 1 per app with permissions |
| **Imported By** | Views, Templates |
| **Specialist Type** | code |
| **Purpose** | Built-in model permissions, custom permissions, groups for role-based access, view decorators/mixins, django-guardian object-level permissions, template permission checks |
| **Activation Trigger** | permission, group, has_perm, guardian, @permission_required, LoginRequiredMixin |

---

## Purpose

Define Django authorization patterns: built-in model permissions (add/change/delete/view), custom permissions in model Meta, groups for role-based access control, view decorators and CBV mixins for access enforcement, django-guardian for object-level permissions, and template-level permission conditionals.

---

## Pattern 16.1: Built-in Model Permissions

```python
# Django auto-creates 4 permissions per model:
# - app.add_model
# - app.change_model
# - app.delete_model
# - app.view_model

# Check in code
user.has_perm("articles.change_article")  # True/False
user.has_perms(["articles.view_article", "articles.change_article"])  # All must be True

# Superuser always returns True for has_perm
user.is_superuser  # bypasses all permission checks
```

```python
# Assign permission to user
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from apps.articles.models import Article

content_type = ContentType.objects.get_for_model(Article)
permission = Permission.objects.get(content_type=content_type, codename="change_article")
user.user_permissions.add(permission)
```

---

## Pattern 16.2: Custom Permissions

```python
# apps/articles/models.py
class Article(models.Model):
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, default="draft")

    class Meta:
        permissions = [
            ("can_publish", "Can publish article"),
            ("can_feature", "Can feature article on homepage"),
            ("can_moderate", "Can moderate comments"),
        ]
```

```python
# Usage
user.has_perm("articles.can_publish")

# Assign programmatically
from django.contrib.auth.models import Permission
perm = Permission.objects.get(codename="can_publish")
user.user_permissions.add(perm)
```

---

## Pattern 16.3: Groups (Role-Based)

```python
# Management command to setup groups
# apps/users/management/commands/setup_groups.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission


class Command(BaseCommand):
    help = "Create default groups and assign permissions"

    def handle(self, *args, **options):
        # Editor group
        editor_group, _ = Group.objects.get_or_create(name="editors")
        editor_perms = Permission.objects.filter(codename__in=[
            "add_article", "change_article", "view_article",
            "can_publish",
        ])
        editor_group.permissions.set(editor_perms)

        # Moderator group
        moderator_group, _ = Group.objects.get_or_create(name="moderators")
        moderator_perms = Permission.objects.filter(codename__in=[
            "view_article", "change_article",
            "can_moderate", "delete_comment",
        ])
        moderator_group.permissions.set(moderator_perms)

        # Viewer group (read-only)
        viewer_group, _ = Group.objects.get_or_create(name="viewers")
        viewer_perms = Permission.objects.filter(codename__startswith="view_")
        viewer_group.permissions.set(viewer_perms)

        self.stdout.write(self.style.SUCCESS("Groups created."))
```

```python
# Assign user to group
from django.contrib.auth.models import Group

editor_group = Group.objects.get(name="editors")
user.groups.add(editor_group)

# Check group membership
user.groups.filter(name="editors").exists()
```

---

## Pattern 16.4: View Decorators and Mixins

```python
# Function-based views
from django.contrib.auth.decorators import login_required, permission_required, user_passes_test


@login_required
def dashboard(request):
    return render(request, "dashboard.html")


@permission_required("articles.can_publish", raise_exception=True)
def publish_article(request, pk):
    article = get_object_or_404(Article, pk=pk)
    article.status = "published"
    article.save()
    return redirect("articles:detail", pk=pk)


@user_passes_test(lambda u: u.groups.filter(name="editors").exists())
def editor_panel(request):
    return render(request, "editor_panel.html")
```

```python
# Class-based views
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin, UserPassesTestMixin


class ArticleCreateView(LoginRequiredMixin, PermissionRequiredMixin, CreateView):
    model = Article
    form_class = ArticleForm
    permission_required = "articles.add_article"
    raise_exception = True


class ArticleUpdateView(UserPassesTestMixin, UpdateView):
    model = Article
    form_class = ArticleForm

    def test_func(self):
        """Only author or admin can edit."""
        article = self.get_object()
        return self.request.user == article.author or self.request.user.is_staff
```

---

## Pattern 16.5: django-guardian (Object-Level)

```bash
pip install django-guardian
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    "guardian",
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "guardian.backends.ObjectPermissionBackend",
]
```

```python
# Assign object-level permissions
from guardian.shortcuts import assign_perm, remove_perm, get_objects_for_user

# Assign permission on specific object
assign_perm("change_article", user, article)
assign_perm("delete_article", editor_group, article)

# Check object-level permission
user.has_perm("change_article", article)  # True for this specific article

# Get all articles user can edit
editable_articles = get_objects_for_user(user, "articles.change_article")

# Remove permission
remove_perm("change_article", user, article)
```

```python
# View with object-level permission check
from guardian.mixins import PermissionRequiredMixin as GuardianPermissionMixin


class ArticleUpdateView(GuardianPermissionMixin, UpdateView):
    model = Article
    form_class = ArticleForm
    permission_required = "articles.change_article"
    raise_exception = True
    # Automatically checks permission against the specific object
```

---

## Pattern 16.6: Template Permission Checks

```html
<!-- Check model-level permissions -->
{% if perms.articles.add_article %}
    <a href="{% url 'articles:create' %}" class="btn btn-primary">New Article</a>
{% endif %}

{% if perms.articles.can_publish %}
    <button type="submit">Publish</button>
{% endif %}

{% if perms.articles.delete_article %}
    <button class="btn btn-danger">Delete</button>
{% endif %}

<!-- Check group membership -->
{% if request.user.groups.all.0.name == "editors" %}
    <span class="badge bg-info">Editor</span>
{% endif %}

<!-- Check authentication -->
{% if user.is_authenticated %}
    <p>Welcome, {{ user.get_full_name }}</p>
{% else %}
    <a href="{% url 'account_login' %}">Login</a>
{% endif %}

<!-- Check staff/superuser -->
{% if user.is_staff %}
    <a href="{% url 'admin:index' %}">Admin Panel</a>
{% endif %}
```

---

## MUST DO

- Use Groups for role-based access (editors, moderators, viewers)
- Use `PermissionRequiredMixin` for CBV, `@permission_required` for FBV
- Use django-guardian for object-level permissions (ownership, per-object editing)
- Check permissions in both views AND templates
- Set `raise_exception=True` to return 403 instead of redirect to login

## MUST NOT DO

- Hardcode user IDs or usernames for permission checks
- Skip permission checks on API endpoints
- Use `is_superuser` checks instead of proper permissions
- Forget to run `setup_groups` after deployment
- Check permissions only in templates (always enforce in views)

---

## References

- [Django: Authorization](https://docs.djangoproject.com/en/5.0/topics/auth/default/#permissions-and-authorization)
- [Django: Custom permissions](https://docs.djangoproject.com/en/5.0/topics/auth/customizing/#custom-permissions)
- [django-guardian](https://django-guardian.readthedocs.io/)
