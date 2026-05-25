# Test Plan Specialist — FastAPI Security Testing: OWASP
# テストプランスペシャリスト — FastAPI Security Testing: OWASP
# Chuyen Gia Test — FastAPI Security Testing: OWASP

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: OWASP Top 10 - injection via SQLAlchemy, XSS in response, rate limiting (slowapi), CORS, SSRF prevention

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | SEC-O |
| **Specialist Type** | code |
| **Purpose** | OWASP Top 10 - injection via SQLAlchemy, XSS in response, rate limiting (slowapi), CORS, SSRF prevention |

---

## Patterns

### Pattern SEC-O.1: A03 Injection

SQL injection via query params: GET /users?name=admin' OR 1=1. SQLAlchemy parameterized queries should prevent. Test raw SQL endpoints (if any) specifically.

---

### Pattern SEC-O.2: A05 Security Headers

Verify middleware adds: X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options. FastAPI + Starlette middleware.

---

### Pattern SEC-O.3: A07 Rate Limiting

slowapi: send N+1 requests -> last returns 429. Verify Retry-After header. Test per-endpoint and global limits.

---

### Pattern SEC-O.4: A01 Broken Access Control

IDOR: user-1 accesses user-2 resource -> 403/404. Privilege escalation: regular user sends role=admin -> ignored.

---

### Pattern SEC-O.5: A10 SSRF

URL param with private IP -> rejected. Test: 127.0.0.1, 192.168.x.x, metadata.google.internal.

---

## ❌ Negative Example

BAD: Trust SQLAlchemy blindly. GOOD: Also test raw SQL paths and query string injection.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Security Testing: OWASP | EPS v10.0*
