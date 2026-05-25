# Test Plan Specialist — NestJS Security Testing: Authentication & Authorization
# テストプランスペシャリスト — NestJS 認証・認可セキュリティテスト
# Chuyen Gia Test — Security Auth Test NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Security Testing — Auth
**Purpose**: Auth security testing — JWT validation, guard bypass testing, RBAC matrix, token expiry, refresh rotation, Keycloak integration testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation + Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-SEC-AUTH |
| **Directory Pattern** | `test/security/auth/**/*.spec.ts` |
| **Naming Convention** | `{guard}.security.spec.ts`, `rbac-matrix.security.spec.ts` |
| **Imports From** | Presentation (guards), Infrastructure (auth strategies) |
| **Imported By** | N/A |
| **Cannot Import** | Domain |
| **Dependencies** | jest, supertest, jsonwebtoken, @nestjs/testing |
| **When To Use** | DD/Plan generates auth guards, RBAC, JWT, Keycloak integration |
| **Source Skeleton** | `test/security/auth/` |
| **Specialist Type** | code |
| **Purpose** | Auth security testing — JWT validation, guard bypass, RBAC matrix, token expiry, refresh rotation |
| **Activation Trigger** | files: **/security/auth/**; keywords: authTest, jwtTest, rbacTest, guardBypass, tokenExpiry |

---

## Patterns

### Pattern SEC-A.1: JWT Validation Testing

```typescript
describe('JWT Security', () => {
  it('should reject expired token', async () => {
    const expiredToken = jwt.sign({ sub: 'user-1' }, secret, { expiresIn: '-1h' });
    await request(app.getHttpServer())
      .get('/orders').set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should reject token with wrong secret', async () => {
    const badToken = jwt.sign({ sub: 'user-1' }, 'wrong-secret', { expiresIn: '1h' });
    await request(app.getHttpServer())
      .get('/orders').set('Authorization', `Bearer ${badToken}`)
      .expect(401);
  });

  it('should reject token with invalid algorithm (alg: none attack)', async () => {
    const noneToken = jwt.sign({ sub: 'user-1' }, '', { algorithm: 'none' });
    await request(app.getHttpServer())
      .get('/orders').set('Authorization', `Bearer ${noneToken}`)
      .expect(401);
  });

  it('should reject malformed Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/orders').set('Authorization', 'NotBearer token')
      .expect(401);
  });
});
```

### Pattern SEC-A.2: RBAC Matrix Testing

```typescript
// Test every role × every endpoint combination
const RBAC_MATRIX = [
  // [role, method, path, expectedStatus]
  ['admin', 'GET', '/orders', 200],
  ['admin', 'POST', '/orders', 201],
  ['admin', 'DELETE', '/orders/1', 200],
  ['officer', 'GET', '/orders', 200],
  ['officer', 'POST', '/orders', 201],
  ['officer', 'DELETE', '/orders/1', 403],  // officer cannot delete
  ['user', 'GET', '/orders', 200],
  ['user', 'POST', '/orders', 403],         // user cannot create
  ['user', 'DELETE', '/orders/1', 403],
  [null, 'GET', '/orders', 401],            // unauthenticated
  [null, 'GET', '/health/live', 200],       // public endpoint
];

describe.each(RBAC_MATRIX)('RBAC: %s %s %s → %d', (role, method, path, expected) => {
  it(`should return ${expected}`, async () => {
    const token = role ? generateToken({ role }) : null;
    const req = request(app.getHttpServer())[method.toLowerCase()](path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    await req.expect(expected);
  });
});
```

### Pattern SEC-A.3: Token Refresh Testing

```typescript
describe('Token Refresh', () => {
  it('should issue new access token with valid refresh token', async () => {
    const { refreshToken } = await login(app, validCredentials);
    const res = await request(app.getHttpServer())
      .post('/auth/refresh').send({ refreshToken }).expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken).not.toBe(refreshToken); // different token
  });

  it('should reject used refresh token (rotation)', async () => {
    const { refreshToken } = await login(app, validCredentials);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(200);
    // Same refresh token used again → rejected
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('should invalidate all tokens on password change', async () => {
    const { accessToken } = await login(app, validCredentials);
    await request(app.getHttpServer())
      .put('/auth/change-password').set('Authorization', `Bearer ${accessToken}`)
      .send({ oldPassword: 'pass', newPassword: 'newpass' }).expect(200);
    // Old token should be invalid
    await request(app.getHttpServer())
      .get('/orders').set('Authorization', `Bearer ${accessToken}`).expect(401);
  });
});
```

### Pattern SEC-A.4: Guard Bypass Testing

```typescript
describe('Guard Bypass Attempts', () => {
  it('should not bypass auth via X-Forwarded-For header spoofing', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('X-Forwarded-For', '127.0.0.1') // attempt to spoof internal IP
      .expect(401);
  });

  it('should not bypass via case manipulation (/Admin vs /admin)', async () => {
    await request(app.getHttpServer()).get('/Admin/users').expect(401);
    await request(app.getHttpServer()).get('/ADMIN/users').expect(401);
  });

  it('should not bypass via path traversal (/../admin)', async () => {
    await request(app.getHttpServer()).get('/orders/../admin/users').expect(401);
  });
});
```

---

## Coverage Target

| Scope | Target |
|-------|--------|
| JWT validation (valid/invalid/expired/algorithm) | 100% |
| RBAC matrix (every role × endpoint) | 100% |
| Token refresh/rotation | 100% |
| Guard bypass attempts | ≥5 common attack vectors |

---

*Test Plan Specialist — NestJS Security Testing: Authentication & Authorization | EPS v10.0*
