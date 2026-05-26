# Test Plan Specialist — FastAPI Security Testing: Auth
# テストプランスペシャリスト — FastAPI Security Testing: Auth
# Chuyen Gia Test — FastAPI Security Testing: Auth

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Auth testing - JWT/OAuth2 validation, dependency_overrides for auth, RBAC matrix, token refresh

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | SEC-A |
| **Specialist Type** | code |
| **Purpose** | Auth testing - JWT/OAuth2 validation, dependency_overrides for auth, RBAC matrix, token refresh |

---

## Patterns

### Pattern SEC-A.1: JWT Validation

Test: expired token -> 401, wrong secret -> 401, malformed -> 401. FastAPI Depends(oauth2_scheme) + jwt.decode() chain.

---

### Pattern SEC-A.2: RBAC Matrix

@pytest.mark.parametrize("role,endpoint,method,expected", rbac_matrix). Override get_current_user with specific role. Test all combinations.

---

### Pattern SEC-A.3: OAuth2 Password Flow

POST /token with valid credentials -> 200 + access_token. POST /token with wrong password -> 401. Verify token contains correct claims.

---

### Pattern SEC-A.4: Token Refresh

Use refresh token -> get new pair -> old refresh rejected (rotation). Password change -> all tokens invalidated.

---

## ❌ Negative Example

BAD: Override auth in ALL tests (skip security testing). GOOD: Test with AND without auth override.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Security Testing: Auth | EPS v10.0*
