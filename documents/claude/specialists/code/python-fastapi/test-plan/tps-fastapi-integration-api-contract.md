# Test Plan Specialist — FastAPI Integration Testing: API Contract
# テストプランスペシャリスト — FastAPI Integration Testing: API Contract
# Chuyen Gia Test — FastAPI Integration Testing: API Contract

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: API contract testing - OpenAPI schema validation, Pact Python, Schemathesis property-based API testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-C |
| **Specialist Type** | code |
| **Purpose** | API contract testing - OpenAPI schema validation, Pact Python, Schemathesis property-based API testing |

---

## Patterns

### Pattern INT-C.1: OpenAPI Schema Auto-Validation

FastAPI auto-generates OpenAPI. response = client.get("/openapi.json"). Validate all endpoints return responses matching declared schemas. openapi-spec-validator.

---

### Pattern INT-C.2: Schemathesis Property-Based Testing

schemathesis.from_uri("http://localhost:8000/openapi.json"). @given(case=schema["/users"]["POST"].as_strategy()). Automatically generates random valid inputs and tests all endpoints.

---

### Pattern INT-C.3: Pact Python Consumer

pact-python: define expected interactions. Mock provider serves expected response. Consumer test validates client library against mock.

---

### Pattern INT-C.4: Response Schema Regression

Snapshot test: response.json() matches saved snapshot. Detect unintended schema changes (new fields, removed fields, type changes).

---

## ❌ Negative Example

BAD: Only test happy path manually. GOOD: Schemathesis finds edge cases automatically by fuzzing the OpenAPI spec.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Integration Testing: API Contract | EPS v10.0*
