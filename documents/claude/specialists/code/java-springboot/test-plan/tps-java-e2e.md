# Test Plan Specialist — Java E2E Testing
# テストプランスペシャリスト — Java E2Eテスト
# Chuyen Gia Test — E2E Test Java

**Version**: 1.0.0
**Technology**: WebTestClient/RestAssured + Testcontainers + @SpringBootTest
**Aspect**: E2E Testing
**Category**: backend
**Purpose**: End-to-end testing — full Spring Boot app with real DB, auth flow, multi-endpoint scenarios, data seeding

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | E2E |
| **Specialist Type** | code |
| **Purpose** | End-to-end testing — full Spring Boot app with real DB, auth flow, multi-endpoint scenarios, data seeding |

---

## Patterns

### Pattern E2E.1: @SpringBootTest + WebTestClient

Full application context + Testcontainers. WebTestClient for reactive, RestAssured for standard. Test full request lifecycle: auth → validation → service → DB → response.

---

### Pattern E2E.2: Auth Flow E2E

Login → get JWT → call protected endpoint → verify response. Test token expiry, refresh, role-based access in full stack.

---

### Pattern E2E.3: Multi-Step Scenario

Create customer → create order → process payment → verify all DB tables updated. Test cross-module flows end-to-end.

---

### Pattern E2E.4: Data Seeding

@Sql("test-data.sql") for declarative seeding. TestFixtures class for programmatic seeding. Cleanup: @Sql(executionPhase=AFTER) or @Transactional rollback.

---

### Pattern E2E.5: Error Response Format

Verify ALL error responses match API contract: {"errorCode","message","timestamp","path"}. Test 400, 401, 403, 404, 409, 422, 500.

---

## ❌ Negative Example

❌ E2E with mocked DB: tests HTTP framework, not real behavior. ✅ E2E with Testcontainers: catches SQL, constraint, migration bugs.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java E2E Testing | EPS v10.0*
