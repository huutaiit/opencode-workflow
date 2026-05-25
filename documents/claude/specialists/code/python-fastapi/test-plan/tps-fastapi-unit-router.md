# Test Plan Specialist — FastAPI Unit Testing: Router/Endpoint Layer
# テストプランスペシャリスト — FastAPI Unit Testing: Router/Endpoint Layer
# Chuyen Gia Test — FastAPI Unit Testing: Router/Endpoint Layer

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Router layer testing - httpx.AsyncClient/TestClient with dependency_overrides, status codes, response schema, auth, error format

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-E |
| **Specialist Type** | code |
| **Purpose** | Router layer testing - httpx.AsyncClient/TestClient with dependency_overrides, status codes, response schema, auth, error format |

---

## Patterns

### Pattern UT-E.1: Endpoint with httpx.AsyncClient

async with AsyncClient(app=app, base_url="http://test") as client: response = await client.post("/users", json=valid_data). assert response.status_code == 201. assert response.json()["id"] is not None.

---

### Pattern UT-E.2: Auth Endpoint Testing

Override get_current_user dependency for authenticated tests. Test without override = 401. Test with wrong role = 403. Test with correct role = 200.

---

### Pattern UT-E.3: Validation Error Format

POST with invalid body. assert response.status_code == 422. assert response.json()["detail"][0]["loc"] == ["body", "email"]. Verify FastAPI validation error format.

---

### Pattern UT-E.4: Error Response Format

Service raises custom BusinessError. assert response.json() matches {"error_code": "...", "message": "...", "timestamp": "..."}. Verify exception handler mapping.

---

### Pattern UT-E.5: File Upload Endpoint

files = {"file": ("test.pdf", b"content", "application/pdf")}. response = await client.post("/files/upload", files=files). assert response.status_code == 201.

---

## ❌ Negative Example

BAD: Mock the service AND the endpoint = tests nothing. GOOD: Override dependencies via app.dependency_overrides, test real endpoint routing.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Unit Testing: Router/Endpoint Layer | EPS v10.0*
