# DRF Testing Specialist
# DRFテストスペシャリスト
# Chuyen Gia Testing DRF

**Stack**: Python 3.12+ / Django 5.x / DRF 3.15+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Directory Pattern** | `apps/{domain}/tests/test_api.py` |
| **Variant** | ALL |
| **Naming Convention** | `test_api_*.py`, `test_` prefix |
| **Imports From** | rest_framework.test, pytest, Domain |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | api-client, api-request-factory, response-assertions, file-upload-test, pagination-filter-test, permission-test |
| **Pattern Numbers** | 41.1–41.6 |
| **Source Paths** | `**/tests/test_api*.py` |
| **File Count** | 1 per app with API |
| **Imported By** | — (pytest runner) |
| **Specialist Type** | code |
| **Purpose** | APIClient setup and authentication, APIRequestFactory for ViewSet unit tests, response assertions, file upload testing, pagination and filtering tests, permission matrix testing |
| **Activation Trigger** | APIClient, API test, DRF test, force_authenticate, api_client |

---

## Purpose

Define DRF testing patterns: APIClient with force_authenticate for authenticated API tests, APIRequestFactory for ViewSet unit tests, response data assertions for CRUD endpoints, file upload endpoint testing, pagination and filtering response validation, and permission matrix testing across roles.

---

## Pattern 41.1: APIClient Setup

```python
# conftest.py
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_api_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_api_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client
```

```python
# tests/test_api.py
import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_article_list(auth_api_client, article):
    url = reverse("api:article-list")
    response = auth_api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) >= 1


@pytest.mark.django_db
def test_article_create(auth_api_client):
    url = reverse("api:article-list")
    data = {"title": "New Article", "body": "Content", "category": 1}
    response = auth_api_client.post(url, data, format="json")
    assert response.status_code == 201
    assert response.data["title"] == "New Article"
```

---

## Pattern 41.2: APIRequestFactory

```python
import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.articles.views import ArticleViewSet


@pytest.fixture
def api_rf():
    return APIRequestFactory()


@pytest.mark.django_db
def test_article_viewset_list(api_rf, user, article):
    """Unit test ViewSet — no routing, no middleware."""
    request = api_rf.get("/api/articles/")
    force_authenticate(request, user=user)

    view = ArticleViewSet.as_view({"get": "list"})
    response = view(request)

    assert response.status_code == 200
    assert len(response.data["results"]) >= 1


@pytest.mark.django_db
def test_article_viewset_create(api_rf, user):
    data = {"title": "Test", "body": "Content"}
    request = api_rf.post("/api/articles/", data, format="json")
    force_authenticate(request, user=user)

    view = ArticleViewSet.as_view({"post": "create"})
    response = view(request)

    assert response.status_code == 201
```

---

## Pattern 41.3: Response Assertions

```python
@pytest.mark.django_db
class TestArticleCRUD:
    def test_list(self, auth_api_client, article):
        response = auth_api_client.get(reverse("api:article-list"))
        assert response.status_code == 200
        assert "results" in response.data
        assert response.data["count"] >= 1

    def test_retrieve(self, auth_api_client, article):
        response = auth_api_client.get(reverse("api:article-detail", args=[article.pk]))
        assert response.status_code == 200
        assert response.data["id"] == article.pk
        assert response.data["title"] == article.title

    def test_create(self, auth_api_client):
        data = {"title": "New", "body": "Content", "category": 1}
        response = auth_api_client.post(reverse("api:article-list"), data, format="json")
        assert response.status_code == 201
        assert response.data["title"] == "New"
        assert "id" in response.data

    def test_update(self, auth_api_client, article):
        data = {"title": "Updated Title"}
        response = auth_api_client.patch(
            reverse("api:article-detail", args=[article.pk]),
            data,
            format="json",
        )
        assert response.status_code == 200
        assert response.data["title"] == "Updated Title"

    def test_delete(self, auth_api_client, article):
        response = auth_api_client.delete(reverse("api:article-detail", args=[article.pk]))
        assert response.status_code == 204

    def test_create_invalid(self, auth_api_client):
        response = auth_api_client.post(reverse("api:article-list"), {}, format="json")
        assert response.status_code == 400
        assert "title" in response.data

    def test_not_found(self, auth_api_client):
        response = auth_api_client.get(reverse("api:article-detail", args=[99999]))
        assert response.status_code == 404
```

---

## Pattern 41.4: File Upload Testing

```python
from django.core.files.uploadedfile import SimpleUploadedFile


@pytest.mark.django_db
def test_document_upload(auth_api_client):
    file = SimpleUploadedFile(
        name="test.pdf",
        content=b"%PDF-1.4 test content",
        content_type="application/pdf",
    )
    response = auth_api_client.post(
        reverse("api:document-list"),
        {"title": "Test Doc", "file": file},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["file_size"] > 0


@pytest.mark.django_db
def test_image_upload(auth_api_client):
    # Create a minimal valid PNG
    import io
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="red")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    file = SimpleUploadedFile("test.png", buffer.read(), content_type="image/png")
    response = auth_api_client.post(
        reverse("api:profile-avatar"),
        {"avatar": file},
        format="multipart",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_upload_invalid_type(auth_api_client):
    file = SimpleUploadedFile("test.exe", b"binary content", content_type="application/exe")
    response = auth_api_client.post(
        reverse("api:document-list"),
        {"title": "Bad File", "file": file},
        format="multipart",
    )
    assert response.status_code == 400
```

---

## Pattern 41.5: Pagination + Filtering Tests

```python
@pytest.mark.django_db
def test_article_list_pagination(auth_api_client, article_factory):
    # Create 25 articles
    article_factory.create_batch(25)

    response = auth_api_client.get(reverse("api:article-list"))
    assert response.status_code == 200
    assert response.data["count"] == 25
    assert len(response.data["results"]) == 20  # Default page size
    assert response.data["next"] is not None

    # Page 2
    response = auth_api_client.get(reverse("api:article-list"), {"page": 2})
    assert len(response.data["results"]) == 5
    assert response.data["previous"] is not None


@pytest.mark.django_db
def test_article_filter_by_status(auth_api_client, article_factory):
    article_factory.create_batch(3, status="published")
    article_factory.create_batch(2, status="draft")

    response = auth_api_client.get(reverse("api:article-list"), {"status": "published"})
    assert response.data["count"] == 3

    response = auth_api_client.get(reverse("api:article-list"), {"status": "draft"})
    assert response.data["count"] == 2


@pytest.mark.django_db
def test_article_search(auth_api_client, article_factory):
    article_factory.create(title="Django Tutorial")
    article_factory.create(title="Flask Guide")

    response = auth_api_client.get(reverse("api:article-list"), {"search": "Django"})
    assert response.data["count"] == 1
    assert response.data["results"][0]["title"] == "Django Tutorial"


@pytest.mark.django_db
def test_article_ordering(auth_api_client, article_factory):
    article_factory.create(title="B Article")
    article_factory.create(title="A Article")

    response = auth_api_client.get(reverse("api:article-list"), {"ordering": "title"})
    titles = [r["title"] for r in response.data["results"]]
    assert titles == sorted(titles)
```

---

## Pattern 41.6: Permission Testing

```python
@pytest.mark.django_db
class TestArticlePermissions:
    """Test permission matrix for article endpoints."""

    def test_unauthenticated_cannot_create(self, api_client):
        response = api_client.post(
            reverse("api:article-list"),
            {"title": "Test", "body": "Content"},
            format="json",
        )
        assert response.status_code == 401

    def test_unauthenticated_can_list(self, api_client):
        response = api_client.get(reverse("api:article-list"))
        assert response.status_code == 200

    def test_user_cannot_edit_others_article(self, auth_api_client, other_user_article):
        response = auth_api_client.patch(
            reverse("api:article-detail", args=[other_user_article.pk]),
            {"title": "Hacked"},
            format="json",
        )
        assert response.status_code == 403

    def test_admin_can_edit_any_article(self, admin_api_client, article):
        response = admin_api_client.patch(
            reverse("api:article-detail", args=[article.pk]),
            {"title": "Admin Edit"},
            format="json",
        )
        assert response.status_code == 200

    def test_user_can_delete_own_article(self, auth_api_client, article):
        response = auth_api_client.delete(
            reverse("api:article-detail", args=[article.pk])
        )
        assert response.status_code == 204

    def test_user_cannot_delete_others_article(self, auth_api_client, other_user_article):
        response = auth_api_client.delete(
            reverse("api:article-detail", args=[other_user_article.pk])
        )
        assert response.status_code == 403
```

---

## MUST DO

- Use `force_authenticate` for API auth tests (not login credentials)
- Test all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Test error responses (400, 401, 403, 404)
- Test pagination with batch-created data
- Test permission matrix (authenticated vs anonymous, owner vs other)

## MUST NOT DO

- Skip 4xx/5xx error response tests
- Test against production database
- Hardcode URLs (use `reverse()`)
- Use `unittest.TestCase` with DRF tests (use pytest)
- Skip file upload tests for endpoints accepting files

---

## References

- [DRF: Testing](https://www.django-rest-framework.org/api-guide/testing/)
- [pytest-django: Fixtures](https://pytest-django.readthedocs.io/en/latest/helpers.html)
