# Test Plan Specialist — Laravel OWASP Security Testing
# テストプランスペシャリスト — Laravel OWASPセキュリティテスト
# Chuyen Gia Ke Hoach Test — Test Bao Mat OWASP Laravel

**Version**: 1.0.0
**Technology**: Laravel 11+ Testing
**Aspect**: OWASP Security Testing
**Category**: test-plan
**Purpose**: Test plan for OWASP testing — SQL injection, XSS, CSRF, mass assignment, file upload, rate limiting, security headers

---

## Metadata

```json
{
  "id": "tps-laravel-security-owasp",
  "technology": "Laravel 11+ Testing",
  "aspect": "OWASP Security Testing",
  "category": "test-plan",
  "subcategory": "php-laravel",
  "lines": 330,
  "token_cost": 2200,
  "version": "1.0.0",
  "evidence": [
    "E1: OWASP Top 10 2021 — web application security risks",
    "E2: Laravel Eloquent — parameterized queries prevent SQL injection",
    "E3: Laravel CSRF/XSS — VerifyCsrfToken, Blade escaping"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Test |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-LARAVEL-SECURITY-OWASP |
| **Directory Pattern** | `tests/Feature/Security/OWASP/` |
| **Naming Convention** | `{Vulnerability}SecurityTest.php` |
| **Specialist Type** | test-plan |
| **Purpose** | OWASP security tests — injection, XSS, CSRF, mass assignment, file upload |
| **Activation Trigger** | keywords: owasp, sql injection, xss, csrf, mass assignment, file upload, security headers |

---

## Test Strategy

OWASP tests verify the application resists common web security attacks. Each OWASP Top 10 category has at least one automated test. Focus on injection, XSS, CSRF, mass assignment, and security headers. Use Laravel HTTP test client with malicious payloads.

---

## Test Cases

### TC-1: SQL Injection Prevention (A03)
**Priority**: HIGH
**Type**: Integration
**Description**: Verify application resists SQL injection attacks.

```php
it('resists SQL injection in search parameter', function () {
    User::factory()->create(['name' => 'Legit User']);

    $maliciousPayloads = [
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "' UNION SELECT password FROM users --",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --",
    ];

    foreach ($maliciousPayloads as $payload) {
        $response = $this->actingAs($admin)
            ->getJson("/api/v1/users?search={$payload}");

        $response->assertStatus(200);
        // Should return 0 or filtered results — NOT all users
        expect($response->json('data'))->not->toContain(
            fn ($user) => $user['name'] === 'Legit User'
        );
    }
});

it('resists SQL injection in route parameter', function () {
    $response = $this->actingAs($admin)
        ->getJson("/api/v1/orders/' OR '1'='1");

    $response->assertStatus(404); // not 200 with all orders
});

it('uses parameterized queries, never raw string interpolation', function () {
    // This test verifies at code level — no raw DB::statement with user input
    DB::listen(function ($query) {
        expect($query->sql)->not->toContain("' OR");
    });

    $this->actingAs($user)
        ->getJson("/api/v1/orders?status=' OR 1=1");
});
```

### TC-2: Cross-Site Scripting (XSS) Prevention (A03/A07)
**Priority**: HIGH
**Type**: Integration
**Description**: Verify application sanitizes output to prevent XSS.

```php
it('escapes HTML in user-generated content', function () {
    $xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(1)>',
        "javascript:alert('xss')",
    ];

    foreach ($xssPayloads as $payload) {
        $response = $this->actingAs($user)
            ->postJson('/api/v1/products', [
                'name' => $payload,
                'description' => $payload,
                'price' => 1000,
            ]);

        if ($response->status() === 201) {
            $data = $response->json('data');
            expect($data['name'])->not->toContain('<script>')
                ->and($data['description'])->not->toContain('<script>');
        }
    }
});

it('sets Content-Type to application/json (prevents browser HTML rendering)', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders');

    $response->assertHeader('Content-Type', 'application/json');
});
```

### TC-3: CSRF Protection (A08)
**Priority**: HIGH
**Type**: Integration
**Description**: Verify CSRF token enforcement on state-changing web routes.

```php
it('rejects POST without CSRF token on web routes', function () {
    $response = $this->post('/orders', $validPayload);

    $response->assertStatus(419); // CSRF token mismatch
});

it('accepts POST with valid CSRF token', function () {
    $response = $this->actingAs($user)
        ->post('/orders', array_merge($validPayload, [
            '_token' => csrf_token(),
        ]));

    $response->assertStatus(302); // redirect after success
});

it('API routes are exempt from CSRF (use token auth instead)', function () {
    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/orders', $validPayload);

    $response->assertStatus(201); // no CSRF needed for API
});
```

### TC-4: Mass Assignment Protection (A01)
**Priority**: HIGH
**Type**: Integration
**Description**: Verify models resist mass assignment of protected fields.

```php
it('ignores mass assignment of role field', function () {
    $response = $this->actingAs($user)
        ->postJson('/api/v1/register', [
            'name' => 'Attacker',
            'email' => 'attacker@example.com',
            'password' => 'password123',
            'role' => 'admin', // injected field
        ]);

    $createdUser = User::where('email', 'attacker@example.com')->first();
    expect($createdUser->role)->not->toBe('admin')
        ->and($createdUser->role)->toBe('customer'); // default role
});

it('ignores mass assignment of is_verified field', function () {
    $response = $this->actingAs($user)
        ->putJson('/api/v1/profile', [
            'name' => 'Updated Name',
            'is_verified' => true, // injected
            'is_admin' => true,     // injected
        ]);

    $updated = $user->fresh();
    expect($updated->is_verified)->toBeFalse()
        ->and($updated->is_admin)->toBeFalse();
});
```

### TC-5: File Upload Security
**Priority**: HIGH
**Type**: Integration
**Description**: Verify file upload validates type, size, and prevents malicious files.

```php
it('rejects PHP file disguised as image', function () {
    $file = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

    $response = $this->actingAs($user)
        ->postJson('/api/v1/documents', ['file' => $file]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['file']);
});

it('rejects double-extension files', function () {
    $file = UploadedFile::fake()->create('image.php.jpg', 100, 'image/jpeg');

    $response = $this->actingAs($user)
        ->postJson('/api/v1/documents', ['file' => $file]);

    // Should either reject or strip dangerous extension
    if ($response->status() === 201) {
        $path = $response->json('data.path');
        expect($path)->not->toContain('.php');
    }
});

it('enforces file size limit', function () {
    $file = UploadedFile::fake()->create('large.pdf', 51200); // 50MB

    $response = $this->actingAs($user)
        ->postJson('/api/v1/documents', ['file' => $file]);

    $response->assertStatus(422);
});

it('stores files outside web root', function () {
    $file = UploadedFile::fake()->image('avatar.jpg');

    $response = $this->actingAs($user)
        ->postJson('/api/v1/documents', ['file' => $file]);

    $path = $response->json('data.path');
    expect($path)->not->toStartWith('public/');
});
```

### TC-6: Rate Limiting (A07)
**Priority**: HIGH
**Type**: Integration
**Description**: Verify rate limiting on sensitive endpoints.

```php
it('rate limits login attempts', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->postJson('/api/login', [
        'email' => 'user@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(429) // Too Many Requests
        ->assertHeader('Retry-After');
});

it('rate limits API endpoints per user', function () {
    $user = User::factory()->create();

    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user)->getJson('/api/v1/orders');
    }

    $response = $this->actingAs($user)->getJson('/api/v1/orders');
    $response->assertStatus(429);
});
```

### TC-7: Security Headers
**Priority**: MEDIUM
**Type**: Integration
**Description**: Verify security headers are present in responses.

```php
it('includes security headers in response', function () {
    $response = $this->actingAs($user)
        ->getJson('/api/v1/orders');

    $response->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
});

it('does not expose server version', function () {
    $response = $this->getJson('/api/v1/health');

    expect($response->headers->get('Server'))->toBeNull()
        ->and($response->headers->get('X-Powered-By'))->toBeNull();
});
```

---

## Coverage Requirements

| Concern | Target | Rationale |
|---------|--------|-----------|
| SQL injection | All input-accepting endpoints | Data breach prevention |
| XSS | All user-content-displaying endpoints | Script injection prevention |
| CSRF | All state-changing web routes | Cross-site request forgery |
| Mass assignment | All models with user input | Privilege escalation |
| File upload | All file upload endpoints | Malicious file execution |
| Rate limiting | Login + API endpoints | Brute force prevention |
| Security headers | All responses | Browser security policies |

---

## Anti-Patterns

| # | Anti-Pattern | Why Wrong | Correct |
|---|-------------|-----------|---------|
| 1 | Test SQL injection with only one payload | Many bypass techniques | Test multiple payload variants |
| 2 | Skip mass assignment tests | "Laravel handles it" | Verify $fillable/$guarded actually work |
| 3 | Test rate limiting with exact threshold | Off-by-one errors | Test at threshold + 1 |
| 4 | Skip file upload MIME validation | PHP files execute on server | Validate MIME + extension + content |
| 5 | Trust Content-Type header from client | Easily spoofed | Validate actual file content |

---

## Quality Checklist

- [ ] **Q1**: SQL injection tested with multiple payload variants?
- [ ] **Q2**: Mass assignment tested on all models with user-writable fields?
- [ ] **Q3**: File upload tested for MIME spoofing and double extensions?
- [ ] **Q4**: Rate limiting enforced on login and API endpoints?
- [ ] **Q5**: Security headers verified in responses?

---

*Test Plan Specialist — Laravel OWASP Security Testing v1.0 | EPS v3.2*
