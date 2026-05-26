# Test Plan Specialist — Laravel Security Testing (Strategy + Routing)
# テストプランスペシャリスト — Laravelセキュリティテスト（戦略＋ルーティング）
# Chuyen Gia Ke Hoach Test — Security Test Laravel (Chien Luoc + Routing)

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: Security Testing Strategy
**Category**: test-plan
**Purpose**: Test plan for security testing strategy — auth, authorization, input validation, OWASP coverage, concern routing

---

## Metadata

```json
{
  "id": "tps-laravel-security",
  "technology": "Laravel 11+ Testing",
  "aspect": "Security Testing Strategy",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 260,
  "token_cost": 1750,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Sanctum/Passport — API token authentication",
    "E2: Laravel Gates and Policies — authorization framework",
    "E3: OWASP Top 10 — web application security standards"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-SECURITY |
| **Directory Pattern** | `tests/Feature/Security/` |
| **Naming Convention** | `{Concern}SecurityTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | Security test strategy hub — routes to auth and OWASP test plans |
| **Activation Trigger** | keywords: security test, auth test, owasp test, vulnerability test, penetration test |

---

## Concern Routing Table

| Concern | Test Plan | File | Load When |
|---------|-----------|------|-----------|
| Auth & Authorization | TPS-LARAVEL-SEC-AUTH | `tps-laravel-security-auth.md` | Testing Sanctum, Passport, gates, policies, guards |
| OWASP Top 10 | TPS-LARAVEL-SEC-OWASP | `tps-laravel-security-owasp.md` | Testing injection, XSS, CSRF, mass assignment, file upload |

---

## OWASP Top 10 — Laravel Coverage Map

| # | Vulnerability | Test Plan | Laravel Mitigation |
|---|-------------|-----------|-------------------|
| A01 | Broken Access Control | SEC-AUTH (gates, policies, IDOR) | Gates, Policies, middleware |
| A02 | Cryptographic Failures | SEC-AUTH (token storage, hashing) | bcrypt, Crypt facade |
| A03 | Injection | SEC-OWASP (SQL injection, command injection) | Eloquent parameterized queries |
| A04 | Insecure Design | Unit tests (domain invariants) | Clean Architecture |
| A05 | Security Misconfiguration | SEC-OWASP (debug mode, CORS, headers) | config/app.php, cors.php |
| A06 | Vulnerable Components | CI pipeline (composer audit) | composer audit |
| A07 | Auth Failures | SEC-OWASP (rate limiting) + SEC-AUTH | RateLimiter, Throttle middleware |
| A08 | Software/Data Integrity | SEC-AUTH (signed URLs, CSRF tokens) | VerifyCsrfToken, URL::signedRoute |
| A09 | Logging Failures | Integration tests (audit trail) | Laravel logging, Telescope |
| A10 | SSRF | SEC-OWASP (URL validation) | Input validation, allowlist |

---

## Security Testing Pyramid

```
           ┌──────────────┐
           │  Pen Testing  │  Manual / external — annual
           │  (DAST/SAST)  │
           ├──────────────┤
           │ OWASP Tests  │  Automated — every release
           │ (SEC-OWASP)  │
           ├──────────────┤
           │  Auth/Authz  │  Automated — every feature
           │  (SEC-AUTH)   │
           ├──────────────┤
           │ Unit Tests   │  Automated — every commit
           │ (FormRequest)│
           └──────────────┘
```

---

## Dependency Scanning

```bash
# CI pipeline: block on critical vulnerabilities
composer audit --format=json
# Fails if any advisory exists in production dependencies

# Roave security advisories (dev dependency)
composer require --dev roave/security-advisories:dev-latest

# License compliance
composer licenses --format=json | jq '.dependencies | to_entries[] | select(.value.license[0] | test("GPL-3|AGPL"))'
```

---

## Penetration Test Checklist (Manual — Annual)

| # | Category | Check | Tool |
|---|----------|-------|------|
| 1 | Authentication | Brute force login endpoint | Burp Suite |
| 2 | Authentication | Session fixation/hijacking | Manual |
| 3 | Authorization | Horizontal privilege escalation (IDOR) | Burp Suite |
| 4 | Authorization | Vertical privilege escalation (role manipulation) | Manual |
| 5 | Injection | SQL injection on all input fields | SQLMap |
| 6 | XSS | Reflected XSS on error messages | Burp Suite |
| 7 | XSS | Stored XSS in user-generated content | Manual |
| 8 | SSRF | Internal network scanning via URL params | Manual |
| 9 | API | Mass assignment via extra request fields | Manual |
| 10 | API | Rate limit bypass (header manipulation) | Burp Suite |
| 11 | Crypto | Password hash strength verification | hashcat |
| 12 | Config | Debug mode enabled in production | curl |
| 13 | Config | Exposed .env or storage directory | Nmap + curl |
| 14 | Upload | File upload bypass (MIME spoofing) | Manual |

---

## CI Pipeline Integration

```yaml
security-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: shivammathur/setup-php@v2
      with: { php-version: '8.3' }
    - run: composer install --no-interaction
    # Dependency scan
    - run: composer audit
    # Security tests
    - run: php artisan test --testsuite=Security
    # SAST (static analysis)
    - run: vendor/bin/phpstan analyse --level=max
    - run: vendor/bin/psalm --show-info=false
```

---

## Security Test Configuration

```php
// tests/Pest.php — security test group
uses(Tests\TestCase::class)->in('Feature/Security');

// phpunit.xml — separate security testsuite
// <testsuite name="Security">
//     <directory>tests/Feature/Security</directory>
// </testsuite>
```

### Environment Variables for Security Tests

```php
// .env.testing — security-specific config
APP_DEBUG=false               // never test with debug on
SESSION_DRIVER=array          // isolated sessions
RATE_LIMITER_ENABLED=true     // test rate limiting
LOG_CHANNEL=null              // suppress logs in tests
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test auth only for admin role | Misses role escalation | Test all role x endpoint |
| 2 | Skip rate limiting tests | Brute force possible | Test at threshold + 1 |
| 3 | Test with APP_DEBUG=true | Hides security headers, leaks stack traces | APP_DEBUG=false in test |
| 4 | Trust client Content-Type | MIME spoofing | Validate actual content |
| 5 | No dependency scanning in CI | Known CVEs ship to production | composer audit in pipeline |

---

## Coverage Targets

| Scope | Target |
|-------|--------|
| OWASP Top 10 | All 10 categories with >=1 test |
| Auth matrix | 100% of role x endpoint combinations |
| Token validation | All attack vectors (expired, invalid, revoked) |
| Rate limiting | Enforcement verified on protected endpoints |
| Mass assignment | All models with $fillable/$guarded |
| Dependency scan | 0 critical vulnerabilities in CI |

---

## Quality Checklist

- [ ] **Q1**: OWASP Top 10 coverage map complete?
- [ ] **Q2**: Concern routing table (auth, OWASP) defined?
- [ ] **Q3**: Penetration test checklist included?
- [ ] **Q4**: CI pipeline with dependency scanning documented?

---

*Test Plan Specialist — Laravel Security Testing (Strategy + Routing) v1.0 | EPS v3.2*
