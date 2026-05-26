# Test Plan Specialist — Java Security Testing: OWASP
# テストプランスペシャリスト — Java OWASPセキュリティテスト
# Chuyen Gia Test — Security OWASP Test Java

**Version**: 1.0.0
**Technology**: WebTestClient + Spring Security Headers + OWASP ZAP
**Aspect**: Security Testing: OWASP
**Category**: backend
**Purpose**: OWASP Top 10 testing — injection, XSS, security headers, rate limiting, CORS, SSRF prevention

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | SEC-O |
| **Specialist Type** | code |
| **Purpose** | OWASP Top 10 testing — injection, XSS, security headers, rate limiting, CORS, SSRF prevention |

---

## Patterns

### Pattern SEC-O.1: A03 Injection Prevention

SQL injection via path params/body: SELECT * WHERE status='PENDING OR 1=1. Spring Data parameterized queries should prevent. Test with SqlHelper custom queries too.

---

### Pattern SEC-O.2: A05 Security Headers

Verify: X-Content-Type-Options: nosniff, Strict-Transport-Security, X-Frame-Options: DENY, Content-Security-Policy. Spring Security defaults + custom config.

---

### Pattern SEC-O.3: A07 Rate Limiting

Test: send N+1 requests → Nth+1 returns 429 Too Many Requests. Verify X-RateLimit-Remaining header. Test per-endpoint and global limits.

---

### Pattern SEC-O.4: A01 Broken Access Control

IDOR: user-1 tries to access user-2 order → 403/404. Privilege escalation: regular user sends role=ADMIN in body → ignored.

---

### Pattern SEC-O.5: A10 SSRF Prevention

URL parameter with private IP (192.168.x.x, 127.0.0.1, metadata.google.internal) → rejected 400.

---

## ❌ Negative Example

❌ Only test happy path security: attacker finds the one untested endpoint. ✅ Test every endpoint with malicious input.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Security Testing: OWASP | EPS v10.0*
