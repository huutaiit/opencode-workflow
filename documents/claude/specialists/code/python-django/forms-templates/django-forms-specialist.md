# Django Forms Specialist
# Djangoフォームスペシャリスト
# Chuyen Gia Django Forms

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (form processing) |
| **Directory Pattern** | `apps/{domain}/forms.py` |
| **Variant** | ALL |
| **Naming Convention** | `forms.py`, `PascalCase` + `Form` suffix |
| **Imports From** | Domain (models) |
| **Cannot Import** | Views, Serializers |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-form, clean-validation, formsets, crispy-forms, file-upload, dynamic-forms, form-mixins |
| **Pattern Numbers** | 11.1–11.7 |
| **Source Paths** | `**/forms.py` |
| **File Count** | 1 per app with forms |
| **Imported By** | Views |
| **Specialist Type** | code |
| **Purpose** | ModelForm, custom validation with clean methods, formsets, crispy-forms with Bootstrap 5, file upload, dynamic form generation, reusable form mixins |
| **Activation Trigger** | forms.py, Form, ModelForm, formset, clean, crispy, FormHelper |

---

## Purpose

Define Django form patterns: ModelForm with widget customization, field-level and cross-field validation via clean methods, formsets for multiple related forms, crispy-forms with Bootstrap 5 for styled layouts, file upload handling, dynamic form field generation, and reusable form mixins.

---

## Pattern 11.1: ModelForm Basics

```python
from django import forms
from apps.articles.models import Article


class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ["title", "body", "category", "tags", "featured_image"]
        widgets = {
            "title": forms.TextInput(attrs={
                "class": "form-control",
                "placeholder": "Article title",
            }),
            "body": forms.Textarea(attrs={
                "class": "form-control",
                "rows": 10,
            }),
            "category": forms.Select(attrs={"class": "form-select"}),
            "tags": forms.CheckboxSelectMultiple(),
        }
        labels = {
            "body": "Content",
            "featured_image": "Cover Image",
        }
        help_texts = {
            "tags": "Select one or more tags.",
        }
```

**Key rule**: Always list `fields` explicitly. NEVER use `fields = "__all__"`.

---

## Pattern 11.2: Custom Validation (clean methods)

```python
from django.core.exceptions import ValidationError
from django.utils import timezone


class EventForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = ["title", "start_date", "end_date", "max_attendees"]

    def clean_title(self):
        """Field-level validation."""
        title = self.cleaned_data["title"]
        if len(title) < 5:
            raise ValidationError("Title must be at least 5 characters.")
        return title

    def clean_start_date(self):
        start_date = self.cleaned_data["start_date"]
        if start_date < timezone.now():
            raise ValidationError("Start date cannot be in the past.")
        return start_date

    def clean(self):
        """Cross-field validation."""
        cleaned_data = super().clean()
        start_date = cleaned_data.get("start_date")
        end_date = cleaned_data.get("end_date")

        if start_date and end_date and end_date <= start_date:
            raise ValidationError({
                "end_date": "End date must be after start date.",
            })

        return cleaned_data
```

---

## Pattern 11.3: Formsets

```python
from django.forms import inlineformset_factory
from apps.orders.models import Order, OrderItem


# Inline formset — OrderItems bound to Order
OrderItemFormSet = inlineformset_factory(
    Order,
    OrderItem,
    fields=["product", "quantity", "unit_price"],
    extra=1,
    min_num=1,
    validate_min=True,
    max_num=50,
    can_delete=True,
)
```

```python
# views.py — handling formset in view
from django.shortcuts import render, redirect


def order_create(request):
    if request.method == "POST":
        form = OrderForm(request.POST)
        formset = OrderItemFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            order = form.save(commit=False)
            order.customer = request.user
            order.save()
            formset.instance = order
            formset.save()
            return redirect("orders:detail", pk=order.pk)
    else:
        form = OrderForm()
        formset = OrderItemFormSet()

    return render(request, "orders/create.html", {
        "form": form,
        "formset": formset,
    })
```

---

## Pattern 11.4: crispy-forms + Bootstrap 5

```python
# pip install django-crispy-forms crispy-bootstrap5

# settings.py
INSTALLED_APPS = [
    "crispy_forms",
    "crispy_bootstrap5",
    # ...
]
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"
```

```python
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Field, Div, Submit, Row, Column, HTML


class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ["title", "body", "category", "status"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = "post"
        self.helper.layout = Layout(
            Field("title", css_class="mb-3"),
            Field("body", css_class="mb-3"),
            Row(
                Column("category", css_class="form-group col-md-6 mb-3"),
                Column("status", css_class="form-group col-md-6 mb-3"),
            ),
            Div(
                Submit("submit", "Save", css_class="btn btn-primary"),
                HTML('<a href="{% url \'articles:list\' %}" class="btn btn-secondary ms-2">Cancel</a>'),
                css_class="d-flex",
            ),
        )
```

```html
<!-- template: articles/form.html -->
{% load crispy_forms_tags %}
<form method="post" enctype="multipart/form-data">
    {% csrf_token %}
    {% crispy form %}
</form>
```

---

## Pattern 11.5: File Upload Forms

```python
class ProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ["display_name", "bio", "avatar"]
        widgets = {
            "avatar": forms.ClearableFileInput(attrs={
                "accept": "image/png,image/jpeg,image/webp",
            }),
        }

    def clean_avatar(self):
        avatar = self.cleaned_data.get("avatar")
        if avatar:
            # Validate file size (max 5MB)
            if avatar.size > 5 * 1024 * 1024:
                raise ValidationError("Image must be under 5MB.")
            # Validate content type
            if avatar.content_type not in ["image/png", "image/jpeg", "image/webp"]:
                raise ValidationError("Only PNG, JPEG, WebP allowed.")
        return avatar
```

```python
# views.py — handle file upload
def profile_edit(request):
    profile = request.user.profile
    if request.method == "POST":
        form = ProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect("profile:detail")
    else:
        form = ProfileForm(instance=profile)
    return render(request, "profile/edit.html", {"form": form})
```

**Key rule**: Always pass `request.FILES` and set `enctype="multipart/form-data"` in template.

---

## Pattern 11.6: Dynamic Forms

```python
class SurveyForm(forms.Form):
    """Form with dynamically generated fields from database."""

    def __init__(self, *args, questions=None, **kwargs):
        super().__init__(*args, **kwargs)
        if questions is None:
            questions = []

        for question in questions:
            field_name = f"question_{question.id}"

            if question.field_type == "text":
                self.fields[field_name] = forms.CharField(
                    label=question.text,
                    required=question.required,
                )
            elif question.field_type == "number":
                self.fields[field_name] = forms.IntegerField(
                    label=question.text,
                    required=question.required,
                )
            elif question.field_type == "choice":
                self.fields[field_name] = forms.ChoiceField(
                    label=question.text,
                    choices=[(c.id, c.text) for c in question.choices.all()],
                    required=question.required,
                )
            elif question.field_type == "multi_choice":
                self.fields[field_name] = forms.MultipleChoiceField(
                    label=question.text,
                    choices=[(c.id, c.text) for c in question.choices.all()],
                    widget=forms.CheckboxSelectMultiple,
                    required=question.required,
                )
```

---

## Pattern 11.7: Form Mixins

```python
from django.contrib import messages


class FormMessageMixin:
    """Add success/error messages after form submission."""
    success_message = "Saved successfully."
    error_message = "Please fix the errors below."

    def form_valid(self, form):
        messages.success(self.request, self.success_message)
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, self.error_message)
        return super().form_invalid(form)


class UserStampMixin:
    """Auto-set created_by/updated_by on form save."""

    def form_valid(self, form):
        obj = form.save(commit=False)
        if not obj.pk:
            obj.created_by = self.request.user
        obj.updated_by = self.request.user
        obj.save()
        form.save_m2m()
        return super().form_valid(form)
```

```python
# Usage in CBV
from django.views.generic import CreateView


class ArticleCreateView(FormMessageMixin, UserStampMixin, CreateView):
    model = Article
    form_class = ArticleForm
    success_message = "Article created."
    success_url = reverse_lazy("articles:list")
```

---

## MUST DO

- Use crispy-forms for consistent form styling
- Validate with `clean_<field>()` for field-level, `clean()` for cross-field
- Use `inlineformset_factory` for parent-child form relationships
- Pass `request.FILES` for file upload forms
- Set `extra=0` or `extra=1` on formsets (avoid excessive empty forms)

## MUST NOT DO

- Put validation logic in views (keep in forms)
- Use `fields = "__all__"` on ModelForm
- Hardcode HTML form markup (use crispy-forms or widget attrs)
- Skip CSRF token in form templates
- Skip file size/type validation on upload fields

---

## References

- [Django: Working with forms](https://docs.djangoproject.com/en/5.0/topics/forms/)
- [Django: ModelForm](https://docs.djangoproject.com/en/5.0/topics/forms/modelforms/)
- [Django: Formsets](https://docs.djangoproject.com/en/5.0/topics/forms/formsets/)
- [django-crispy-forms](https://django-crispy-forms.readthedocs.io/)
