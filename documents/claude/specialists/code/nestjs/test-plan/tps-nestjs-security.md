# Test Plan Specialist — NestJS Security Testing (Strategy + Routing)
# テストプランスペシャリスト — NestJSセキュリティテスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Security Test NestJS (Chien Luoc + Routing)

**Version**: 2.0.0
**Stack**: TypeScript/NestJS | **Type**: Security Testing — Strategy Hub
**Purpose**: Security test strategy for NestJS — OWASP Top 10 coverage, auth/RBAC testing, concern routing, dependency scanning, penetration test checklist

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation + Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-SECURITY |
| **Directory Pattern** | `test/security/**/*.spec.ts` |
| **Naming Convention** | `{concern}.security.spec.ts` |
| **Imports From** | Presentation (endpoints, guards), Infrastructure (auth) |
| **Imported By** | N/A |
| **Cannot Import** | Domain |
| **Dependencies** | jest, supertest, jsonwebtoken, npm-audit |
| **When To Use** | Every feature with auth, input handling, or external-facing endpoints |
| **Source Skeleton** | `test/security/` |
| **Specialist Type** | code |
| **Purpose** | Security test strategy hub — routes DD/Plan/Execute to auth or OWASP test plans |
| **Activation Trigger** | files: **/security/**; keywords: securityTest, owaspTest, authTest, penTest, vulnerability |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Auth & RBAC | TPS-NESTJS-SEC-AUTH | `tps-nestjs-security-auth.md` | Testing JWT, guards, RBAC matrix, token refresh, bypass attempts |
| OWASP Top 10 | TPS-NESTJS-SEC-OWASP | `tps-nestjs-security-owasp.md` | Testing injection, XSS, CSRF, rate limiting, security headers, SSRF |

---

## Security Test Strategy Overview

### OWASP Top 10 — NestJS Coverage Map

| # | Vulnerability | Test Plan | Mitigation Specialist |
|---|-------------|-----------|----------------------|
| A01 | Broken Access Control | SEC-AUTH (RBAC matrix, IDOR) | 213.x Auth Guards, 293.x Keycloak |
| A02 | Cryptographic Failures | SEC-AUTH (JWT algorithm) | 214.x Security Advanced |
| A03 | Injection | SEC-OWASP (SQL/NoSQL injection) | 277.x OWASP, 206.x Validation Pipes |
| A04 | Insecure Design | Unit tests (domain invariants) | 260.x Clean Architecture |
| A05 | Security Misconfiguration | SEC-OWASP (headers, CORS) | 277.x OWASP (Helmet) |
| A06 | Vulnerable Components | CI pipeline (`npm audit`) | 277.x OWASP (dependency scan) |
| A07 | Auth Failures | SEC-OWASP (rate limiting) + SEC-AUTH | 277.x OWASP (Throttler) |
| A08 | Software/Data Integrity | SEC-OWASP (CSP) + SEC-AUTH (JWT) | 277.x OWASP (Helmet CSP) |
| A09 | Logging Failures | Integration tests (audit trail) | 284.x Auditing, 258.x Logging |
| A10 | SSRF | SEC-OWASP (URL whitelist) | 277.x OWASP |

### Security Testing Pyramid

```
           ┌──────────────┐
           │  Pen Testing  │  Manual / external — annual
           │  (DAST/SAST)  │
           ├──────────────┤
           │ OWASP Tests  │  Automated — every release
           │ (SEC-OWASP)  │
           ├──────────────┤
           │  Auth/RBAC   │  Automated — every feature
           │  (SEC-AUTH)   │
           ├──────────────┤
           │ Unit Tests   │  Automated — every commit
           │ (Guard/Pipe) │
           └──────────────┘
```

---

## Dependency Scanning

```bash
# CI pipeline: block on critical vulnerabilities
npm audit --audit-level=critical --production
# → Fails CI if any CRITICAL vulnerability in production dependencies

# Snyk integration (deeper analysis)
npx snyk test --severity-threshold=high

# Scheduled scan (weekly)
# GitHub Dependabot or Snyk monitors for new CVEs automatically

# License compliance
npx license-checker --production --failOn "GPL-3.0;AGPL-3.0"
```

---

## Penetration Test Checklist (Manual — Annual)

| # | Category | Check | Tool |
|---|----------|-------|------|
| 1 | Authentication | Brute force login endpoint | Burp Suite |
| 2 | Authentication | Session fixation | Manual |
| 3 | Authorization | Horizontal privilege escalation (IDOR) | Burp Suite |
| 4 | Authorization | Vertical privilege escalation (role manipulation) | Manual |
| 5 | Injection | SQL injection on all input fields | SQLMap |
| 6 | Injection | NoSQL injection on MongoDB endpoints | Manual |
| 7 | XSS | Reflected XSS on error messages | Burp Suite |
| 8 | XSS | Stored XSS in user-generated content | Manual |
| 9 | SSRF | Internal network scanning via URL params | Manual |
| 10 | API | Mass assignment (extra fields in request body) | Manual |
| 11 | API | Rate limit bypass (header manipulation, IP rotation) | Burp Suite |
| 12 | Crypto | JWT algorithm confusion (RS256→HS256) | jwt_tool |
| 13 | Infrastructure | Exposed debug endpoints in production | Nmap + curl |
| 14 | Infrastructure | Default credentials on services (Redis, DB) | Manual |

---

## CI Pipeline Integration

```yaml
security-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    # Dependency scan
    - run: npm audit --audit-level=critical --production
    # OWASP automated tests
    - run: npm run test:security
    # SAST (static analysis)
    - uses: github/codeql-action/analyze@v3
      with: { languages: javascript-typescript }
```

---

## Coverage Targets

| Scope | Target |
|-------|--------|
| OWASP Top 10 | All 10 categories with ≥1 test |
| RBAC matrix | 100% of role × endpoint combinations |
| JWT validation | All attack vectors (expired, wrong secret, alg:none, malformed) |
| Rate limiting | Enforcement verified on all protected endpoints |
| Security headers | All Helmet headers verified |
| Dependency scan | 0 critical vulnerabilities in CI |

---

## Quality Checklist

- [ ] **Q1**: OWASP Top 10 coverage map complete?
- [ ] **Q2**: Concern routing table (auth, OWASP) defined?
- [ ] **Q3**: Penetration test checklist included?
- [ ] **Q4**: CI pipeline with dependency scanning documented?

---

*Test Plan Specialist — NestJS Security Testing (Strategy + Routing) v2.0 | EPS v10.0*
