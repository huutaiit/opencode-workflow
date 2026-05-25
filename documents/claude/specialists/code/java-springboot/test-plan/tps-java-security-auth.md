# Test Plan Specialist — Java Security Testing: Auth
# テストプランスペシャリスト — Java 認証セキュリティテスト
# Chuyen Gia Test — Security Auth Test Java

**Version**: 1.0.0
**Technology**: Spring Security Test + JWT + WebTestClient/MockMvc
**Aspect**: Security Testing: Auth
**Category**: backend
**Purpose**: Auth security testing — JWT validation, SecurityWebFilterChain/SecurityFilterChain, RBAC matrix, Keycloak integration, token refresh

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | SEC-A |
| **Specialist Type** | code |
| **Purpose** | Auth security testing — JWT validation, SecurityWebFilterChain/SecurityFilterChain, RBAC matrix, Keycloak integration, token refresh |

---

## Patterns

### Pattern SEC-A.1: JWT Validation

Test: expired token → 401, wrong secret → 401, alg:none attack → 401, malformed header → 401. Spring Security rejects automatically but must verify.

---

### Pattern SEC-A.2: RBAC Matrix

@WithMockUser(roles="ADMIN") for each role × endpoint combination. Test all [role, method, path, expectedStatus] combinations systematically.

---

### Pattern SEC-A.3: SecurityWebFilterChain (Reactive)

Verify: /actuator/health = public, /api/** = authenticated, /admin/** = ADMIN role. Test with @WithMockUser and without auth header.

---

### Pattern SEC-A.4: Keycloak Integration

Mock Keycloak JWKS endpoint via WireMock. Test realm role extraction, client role extraction, token introspection. Verify multi-tenant realm switching.

---

### Pattern SEC-A.5: Token Refresh

Test refresh token rotation: use once → get new pair → use old refresh → rejected. Password change → all tokens invalidated.

---

## ❌ Negative Example

❌ @WithMockUser only: bypasses actual JWT parsing. ✅ Also test with real JWT (signed with test secret) to verify full chain.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Security Testing: Auth | EPS v10.0*
