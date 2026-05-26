# Django File Upload Specialist
# Djangoファイルアップロードスペシャリスト
# Chuyen Gia Upload File Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `apps/{domain}/models.py`, `apps/{domain}/views.py` |
| **Variant** | ALL |
| **Naming Convention** | `FileField`/`ImageField` in models, `upload_to` callable |
| **Imports From** | django.core.files, Domain (models, forms) |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | file-image-field, upload-views, file-validation, drf-upload, chunked-upload, processing-pipeline |
| **Pattern Numbers** | 31.1–31.6 |
| **Source Paths** | `**/models.py`, `**/views.py`, `**/serializers.py` |
| **File Count** | Across model/view/form files |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | FileField and ImageField with upload_to, file upload views (FBV/CBV), file validation (type, size, extension), DRF file upload endpoints, chunked upload for large files, async file processing pipeline |
| **Activation Trigger** | FileField, ImageField, upload_to, UploadedFile, file upload, request.FILES |

---

## Purpose

Define Django file upload patterns: FileField and ImageField model fields with callable upload_to, file upload views for both FBV and CBV, file validation for content type, size, and extension, DRF file upload API endpoints, chunked upload for large files, and async processing pipelines with Celery.

---

## Pattern 31.1: FileField and ImageField

```python
# apps/documents/models.py
import os
from django.db import models
from django.utils import timezone


def document_upload_path(instance, filename):
    """Generate upload path: documents/2026/03/user_42/report.pdf"""
    ext = os.path.splitext(filename)[1]
    date = timezone.now()
    return f"documents/{date.year}/{date.month:02d}/user_{instance.user_id}/{instance.title}{ext}"


class Document(models.Model):
    title = models.CharField(max_length=200)
    user = models.ForeignKey("users.User", on_delete=models.CASCADE)
    file = models.FileField(
        upload_to=document_upload_path,
        max_length=500,
    )
    file_size = models.PositiveIntegerField(editable=False, default=0)
    content_type = models.CharField(max_length=100, editable=False, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            self.content_type = getattr(self.file, "content_type", "")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)
```

```python
class Profile(models.Model):
    user = models.OneToOneField("users.User", on_delete=models.CASCADE)
    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        blank=True,
        help_text="Max 2MB, PNG/JPEG only.",
    )
```

---

## Pattern 31.2: File Upload Views

```python
# apps/documents/views.py — FBV
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from apps.documents.forms import DocumentUploadForm


@login_required
def document_upload(request):
    if request.method == "POST":
        form = DocumentUploadForm(request.POST, request.FILES)
        if form.is_valid():
            document = form.save(commit=False)
            document.user = request.user
            document.save()
            return redirect("documents:detail", pk=document.pk)
    else:
        form = DocumentUploadForm()

    return render(request, "documents/upload.html", {"form": form})
```

```python
# CBV
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import CreateView


class DocumentUploadView(LoginRequiredMixin, CreateView):
    model = Document
    form_class = DocumentUploadForm
    template_name = "documents/upload.html"
    success_url = "/documents/"

    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)
```

```html
<!-- templates/documents/upload.html -->
<form method="post" enctype="multipart/form-data">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Upload</button>
</form>
```

---

## Pattern 31.3: File Validation

```python
# apps/core/validators.py
import os
from django.core.exceptions import ValidationError


def validate_file_size(value, max_size_mb=10):
    """Validate file size (default max 10MB)."""
    if value.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"File size must be under {max_size_mb}MB. Got {value.size / 1024 / 1024:.1f}MB.")


def validate_file_extension(value, allowed_extensions=None):
    """Validate file extension."""
    if allowed_extensions is None:
        allowed_extensions = [".pdf", ".doc", ".docx", ".xlsx", ".csv"]
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f"File type '{ext}' not allowed. Allowed: {', '.join(allowed_extensions)}")


def validate_image_file(value):
    """Validate image type and size."""
    import imghdr
    allowed_types = ["jpeg", "png", "webp", "gif"]
    max_size_mb = 5

    if value.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"Image must be under {max_size_mb}MB.")

    # Check actual file content (not just extension)
    file_type = imghdr.what(value)
    if file_type not in allowed_types:
        raise ValidationError(f"Image type '{file_type}' not allowed. Allowed: {', '.join(allowed_types)}")
```

```python
# Usage in model
class Document(models.Model):
    file = models.FileField(
        upload_to="documents/",
        validators=[
            validate_file_size,
            validate_file_extension,
        ],
    )
```

---

## Pattern 31.4: DRF File Upload

```python
# apps/documents/serializers.py
from rest_framework import serializers
from apps.documents.models import Document
from apps.core.validators import validate_file_size, validate_file_extension


class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(
        validators=[validate_file_size, validate_file_extension],
    )

    class Meta:
        model = Document
        fields = ["id", "title", "file", "file_size", "content_type", "uploaded_at"]
        read_only_fields = ["id", "file_size", "content_type", "uploaded_at"]
```

```python
# apps/documents/views.py
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DocumentUploadAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

```python
# Multiple file upload
class MultipleFileUploadSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(validators=[validate_file_size]),
        allow_empty=False,
        max_length=10,
    )
    title = serializers.CharField(max_length=200)
```

---

## Pattern 31.5: Chunked Upload (Large Files)

```bash
pip install django-chunked-upload
```

```python
# settings.py
INSTALLED_APPS = [
    "chunked_upload",
    # ...
]

CHUNKED_UPLOAD_MAX_BYTES = 500 * 1024 * 1024  # 500MB
CHUNKED_UPLOAD_PATH = "chunked_uploads/%Y/%m/"
```

```python
# apps/documents/views.py
from chunked_upload.views import ChunkedUploadView, ChunkedUploadCompleteView
from apps.documents.models import LargeDocument


class LargeDocumentUploadView(ChunkedUploadView):
    model = LargeDocument
    field_name = "file"


class LargeDocumentCompleteView(ChunkedUploadCompleteView):
    model = LargeDocument

    def on_completion(self, uploaded_file, request):
        """Called when all chunks are received."""
        # Process the completed file
        process_large_file.delay(uploaded_file.id)

    def get_response_data(self, chunked_upload, request):
        return {
            "id": chunked_upload.id,
            "filename": chunked_upload.filename,
            "size": chunked_upload.offset,
        }
```

---

## Pattern 31.6: File Processing Pipeline

```python
# apps/documents/tasks.py
from celery import shared_task
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


@shared_task(bind=True, max_retries=3)
def process_uploaded_image(self, document_id):
    """Async pipeline: validate → resize → create thumbnails → update record."""
    from apps.documents.models import Document

    try:
        document = Document.objects.get(pk=document_id)
        file = document.file

        # Step 1: Open and validate
        img = Image.open(file)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Step 2: Create thumbnail
        thumb = img.copy()
        thumb.thumbnail((300, 300), Image.Resampling.LANCZOS)

        thumb_io = BytesIO()
        thumb.save(thumb_io, format="JPEG", quality=85)
        thumb_io.seek(0)

        # Step 3: Save thumbnail
        thumb_name = f"thumb_{document.file.name.split('/')[-1]}"
        document.thumbnail.save(
            thumb_name,
            ContentFile(thumb_io.read()),
            save=False,
        )

        # Step 4: Update status
        document.processed = True
        document.save(update_fields=["thumbnail", "processed"])

    except Exception as exc:
        self.retry(exc=exc, countdown=60 * self.request.retries)
```

```python
# Trigger processing after upload
class DocumentUploadAPIView(APIView):
    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save(user=request.user)

        # Async processing
        process_uploaded_image.delay(document.id)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

---

## MUST DO

- Validate file type (check content, not just extension) and size
- Use callable `upload_to` for organized storage paths
- Pass `request.FILES` in views and set `enctype="multipart/form-data"`
- Process large files asynchronously with Celery
- Clean up files on model delete

## MUST NOT DO

- Trust `Content-Type` header alone (can be spoofed)
- Store uploads in the web-accessible root directory
- Process large files synchronously (blocks the request)
- Skip file size limits (allows DoS via large uploads)
- Use `FileField` without `max_length` (default 100 chars may truncate paths)

---

## References

- [Django: File uploads](https://docs.djangoproject.com/en/5.0/topics/http/file-uploads/)
- [Django: FileField](https://docs.djangoproject.com/en/5.0/ref/models/fields/#filefield)
- [DRF: Parsers](https://www.django-rest-framework.org/api-guide/parsers/)
- [django-chunked-upload](https://github.com/juliomalegria/django-chunked-upload)
