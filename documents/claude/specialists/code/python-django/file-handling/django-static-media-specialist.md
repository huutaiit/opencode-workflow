# Django Static & Media Files Specialist
# Django静的ファイル・メディアスペシャリスト
# Chuyen Gia Static va Media Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `static/`, `staticfiles/`, `media/` |
| **Variant** | ALL |
| **Naming Convention** | `static/{app}/{type}/`, `media/{domain}/{date}/` |
| **Imports From** | django.conf, django.contrib.staticfiles |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | static-config, collectstatic, whitenoise, storages-s3, media-files, custom-storage |
| **Pattern Numbers** | 30.1–30.6 |
| **Source Paths** | `**/settings.py`, `Dockerfile` |
| **File Count** | Settings + storage backends |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | Static files configuration, collectstatic workflow, WhiteNoise for self-hosted static, django-storages + S3, media files (user uploads), custom storage backends |
| **Activation Trigger** | static, media, collectstatic, STATIC_URL, storages, S3, WhiteNoise, MEDIA_ROOT |

---

## Purpose

Define Django static and media file patterns: static files configuration for development and production, collectstatic for gathering files, WhiteNoise for serving static from Django directly, django-storages with S3 for cloud storage, media files for user uploads, and custom storage backends.

---

## Pattern 30.1: Static Files Configuration

```python
# settings.py — Development
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]  # App-independent static files
STATIC_ROOT = BASE_DIR / "staticfiles"    # collectstatic output

STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",    # STATICFILES_DIRS
    "django.contrib.staticfiles.finders.AppDirectoriesFinder", # apps/*/static/
]
```

```
# Project structure
myproject/
├── static/              # Project-level static (STATICFILES_DIRS)
│   ├── css/
│   ├── js/
│   └── images/
├── apps/
│   └── articles/
│       └── static/      # App-level static (AppDirectoriesFinder)
│           └── articles/
│               ├── css/
│               └── js/
├── staticfiles/         # STATIC_ROOT (collectstatic output, gitignored)
└── media/               # MEDIA_ROOT (user uploads, gitignored)
```

---

## Pattern 30.2: collectstatic

```bash
# Collect all static files to STATIC_ROOT
python manage.py collectstatic --noinput

# Clear existing and recollect
python manage.py collectstatic --clear --noinput
```

```dockerfile
# Dockerfile — collectstatic during build
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static during build (not at runtime)
RUN DJANGO_SETTINGS_MODULE=config.settings.production \
    SECRET_KEY=build-placeholder \
    python manage.py collectstatic --noinput

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## Pattern 30.3: WhiteNoise (Self-Hosted Static)

```bash
pip install whitenoise
```

```python
# settings.py
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Right after SecurityMiddleware
    # ...
]

STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
```

WhiteNoise serves static files directly from Django with:
- Gzip and Brotli compression
- Cache-busting filenames (hash in filename)
- Immutable cache headers for hashed files
- No need for nginx/CDN for static files

---

## Pattern 30.4: django-storages + S3

```bash
pip install django-storages boto3
```

```python
# settings.py — S3 for media files
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME"),
            "region_name": env("AWS_S3_REGION_NAME", default="ap-northeast-1"),
            "custom_domain": env("AWS_S3_CUSTOM_DOMAIN", default=None),
            "file_overwrite": False,
            "default_acl": "private",
            "querystring_auth": True,
            "querystring_expire": 3600,
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
```

```python
# S3 for both static AND media
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_MEDIA_BUCKET"),
            "location": "media",
        },
    },
    "staticfiles": {
        "BACKEND": "storages.backends.s3boto3.S3StaticStorage",
        "OPTIONS": {
            "bucket_name": env("AWS_STATIC_BUCKET"),
            "location": "static",
        },
    },
}
```

---

## Pattern 30.5: Media Files (User Uploads)

```python
# settings.py
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

```python
# urls.py — Serve media in development only
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ...
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

```python
# models.py — Media file fields
class Article(models.Model):
    featured_image = models.ImageField(
        upload_to="articles/images/%Y/%m/",
        blank=True,
    )

    def delete(self, *args, **kwargs):
        # Clean up file on model delete
        if self.featured_image:
            self.featured_image.delete(save=False)
        super().delete(*args, **kwargs)
```

**Key rule**: Never serve media from Django in production. Use S3, CDN, or nginx.

---

## Pattern 30.6: Custom Storage Backends

```python
# apps/core/storage.py
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class OverwriteStorage(Storage):
    """Storage that overwrites existing files with the same name."""

    def __init__(self, base_storage=None):
        from django.core.files.storage import default_storage
        self._base = base_storage or default_storage

    def _save(self, name, content):
        if self.exists(name):
            self.delete(name)
        return self._base.save(name, content)

    def exists(self, name):
        return self._base.exists(name)

    def url(self, name):
        return self._base.url(name)

    def delete(self, name):
        return self._base.delete(name)

    def _open(self, name, mode="rb"):
        return self._base.open(name, mode)
```

```python
# Usage in model
class Profile(models.Model):
    avatar = models.ImageField(
        upload_to="avatars/",
        storage=OverwriteStorage(),  # Overwrites previous avatar
    )
```

---

## MUST DO

- Use WhiteNoise or S3 in production (never Django's development server)
- Run `collectstatic` during Docker build (not at runtime)
- Separate `STATIC_ROOT` and `MEDIA_ROOT` directories
- Set `file_overwrite=False` on S3 storage to prevent data loss
- Clean up files on model delete

## MUST NOT DO

- Serve media files from Django in production
- Commit `staticfiles/` or `media/` to git
- Use `DEBUG=True` static serving in production
- Set `default_acl="public-read"` for private/sensitive uploads
- Skip `collectstatic` in deployment pipeline

---

## References

- [Django: Managing static files](https://docs.djangoproject.com/en/5.0/howto/static-files/)
- [Django: Managing files](https://docs.djangoproject.com/en/5.0/topics/files/)
- [WhiteNoise](https://whitenoise.readthedocs.io/)
- [django-storages](https://django-storages.readthedocs.io/)
