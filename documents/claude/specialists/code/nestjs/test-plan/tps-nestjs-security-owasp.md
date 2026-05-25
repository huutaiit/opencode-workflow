# Test Plan Specialist — NestJS Security Testing: OWASP
# テストプランスペシャリスト — NestJS OWASPセキュリティテスト
# Chuyen Gia Test — OWASP Security Test NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Security Testing — OWASP
**Purpose**: OWASP Top 10 testing for NestJS — injection testing, XSS, CSRF, rate limit validation, security headers, dependency scanning, SSRF prevention

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation + Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-SEC-OWASP |
| **Directory Pattern** | `test/security/owasp/**/*.spec.ts` |
| **Naming Convention** | `a0{N}-{vulnerability}.security.spec.ts` |
| **Imports From** | Presentation (endpoints), Infrastructure (security middleware) |
| **Imported By** | N/A |
| **Cannot Import** | Domain |
| **Dependencies** | jest, supertest, helmet-csp-tester (optional) |
| **When To Use** | Every production release — baseline OWASP security verification |
| **Source Skeleton** | `test/security/owasp/` |
| **Specialist Type** | code |
| **Purpose** | OWASP Top 10 testing for NestJS — injection, XSS, CSRF, rate limit, security headers, dependency scanning, SSRF |
| **Activation Trigger** | files: **/security/owasp/**; keywords: owaspTest, injectionTest, xssTest, csrfTest, securityHeaders |

---

## Patterns

### Pattern SEC-O.1: A03 Injection Testing

```typescript
describe('A03: Injection Prevention', () => {
  it('should sanitize SQL injection in query params', async () => {
    await request(app.getHttpServer())
      .get("/orders?status=PENDING' OR '1'='1")
      .set('Authorization', `Bearer ${token}`)
      .expect(400); // ValidationPipe rejects
  });

  it('should sanitize SQL injection in request body', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: "'; DROP TABLE orders; --", items: [] })
      .expect(400);
  });

  it('should prevent NoSQL injection via object payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } })
      .expect(400); // ValidationPipe: email must be string
  });
});
```

### Pattern SEC-O.2: A05 Security Headers Testing

```typescript
describe('A05: Security Headers (Helmet)', () => {
  it('should set X-Content-Type-Options: nosniff', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set Strict-Transport-Security', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
  });

  it('should NOT expose X-Powered-By', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should set Content-Security-Policy', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
```

### Pattern SEC-O.3: A07 Rate Limit Testing

```typescript
describe('A07: Rate Limiting', () => {
  it('should return 429 after exceeding rate limit', async () => {
    const limit = 10; // configured limit per endpoint
    for (let i = 0; i < limit; i++) {
      await request(app.getHttpServer()).post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }
    // Next request should be rate limited
    const res = await request(app.getHttpServer()).post('/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('should include rate limit headers in response', async () => {
    const res = await request(app.getHttpServer()).get('/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});
```

### Pattern SEC-O.4: A01 Broken Access Control Testing

```typescript
describe('A01: Broken Access Control', () => {
  it('should not allow user to access another user orders (IDOR)', async () => {
    const userToken = await getToken('user-1');
    const otherUserOrderId = 'order-belonging-to-user-2';
    await request(app.getHttpServer())
      .get(`/orders/${otherUserOrderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403); // or 404 — should not expose existence
  });

  it('should not allow privilege escalation via role parameter', async () => {
    const userToken = await getToken('regular-user');
    await request(app.getHttpServer())
      .put('/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'admin' }) // attempt to set admin role
      .expect(res => {
        // Role should NOT be changed
        expect(res.body.role).not.toBe('admin');
      });
  });
});
```

### Pattern SEC-O.5: A10 SSRF Prevention Testing

```typescript
describe('A10: SSRF Prevention', () => {
  it('should reject private IP in URL parameter', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/test')
      .send({ callbackUrl: 'http://192.168.1.1/admin' })
      .expect(400);
  });

  it('should reject localhost in URL parameter', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/test')
      .send({ callbackUrl: 'http://localhost:3000/admin' })
      .expect(400);
  });

  it('should reject internal DNS in URL parameter', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/test')
      .send({ callbackUrl: 'http://metadata.google.internal/computeMetadata/v1/' })
      .expect(400);
  });
});
```

---

## Coverage Target

| OWASP | Test Scope | Target |
|-------|-----------|--------|
| A01 Broken Access Control | IDOR, privilege escalation | ≥3 scenarios |
| A03 Injection | SQL, NoSQL, command injection | ≥5 payloads |
| A05 Security Misconfiguration | Headers, CORS, debug mode | All headers |
| A07 Auth Failures | Rate limit, brute force | Limit enforcement |
| A10 SSRF | Private IP, localhost, internal DNS | ≥3 vectors |

---

*Test Plan Specialist — NestJS Security Testing: OWASP | EPS v10.0*
