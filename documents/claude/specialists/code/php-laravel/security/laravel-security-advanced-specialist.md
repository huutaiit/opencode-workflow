# Laravel Security Advanced Specialist — Security
# Laravel高度セキュリティスペシャリスト — セキュリティ
# Chuyen Gia Bao Mat Nang Cao Laravel — Bao Mat

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11 Advanced Security
**Aspect**: Advanced Security Mechanisms
**Category**: security
**Purpose**: Knowledge provider for advanced Laravel security — CORS configuration, Content Security Policy, API key management, two-factor authentication, session security, and signed URLs/routes

---

## Metadata

```json
{
  "id": "laravel-security-advanced-specialist",
  "technology": "PHP 8.3 + Laravel 11 Advanced Security",
  "aspect": "Advanced Security Mechanisms",
  "category": "security",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 CORS — HandleCors middleware configured via config/cors.php",
    "E2: Content Security Policy — defense-in-depth header preventing XSS and data injection",
    "E3: Laravel signed URLs — tamper-proof URL generation with HMAC signatures"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Presentation |
| **Variant** | API, Web |
| **Pattern Numbers** | 336.1–336.6 |
| **Directory Pattern** | `bootstrap/app.php`, `config/` |
| **Naming Convention** | `{Security}Middleware.php`, config files |
| **Imports From** | Infrastructure (config, encryption), Presentation (middleware, responses) |
| **Imported By** | Presentation (routes, controllers), Application (services needing signed URLs) |
| **Cannot Import** | Domain logic — security infrastructure is a separate concern |
| **Dependencies** | `illuminate/routing` (signed URLs), `illuminate/session` |
| **When To Use** | Production applications requiring defense-in-depth security beyond OWASP basics |
| **Source Skeleton** | `bootstrap/app.php`, `config/cors.php`, `app/Http/Middleware/` |
| **Specialist Type** | code |
| **Purpose** | Advanced security patterns — CORS, CSP, API keys, 2FA, session hardening, signed URLs |
| **Activation Trigger** | keywords: CORS, CSP, Content-Security-Policy, API key, two-factor, 2FA, session security, signed URL, signed route |

---

## Role

You are a **Laravel Advanced Security Specialist**. Your responsibility is to provide best practices for advanced security mechanisms in Laravel 11 — CORS configuration, Content Security Policy headers, API key management, two-factor authentication, session hardening, and signed URL/route patterns.

**Used by**: Any code agent implementing defense-in-depth security for production Laravel applications
**Not used by**: Non-Laravel stacks, development-only environments without security requirements

---

## Patterns

### Pattern 336.1: CORS Configuration (Laravel 11)

**Category**: Cross-Origin Resource Sharing
**Description**: Configure CORS headers for API access from browser-based clients.

```php
<?php

declare(strict_types=1);

// config/cors.php — production CORS configuration
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    // Production: 'https://app.example.com,https://admin.example.com'
    // Never use '*' in production with credentials

    'allowed_origins_patterns' => [
        // Dynamic subdomains: matches tenant1.example.com, tenant2.example.com
        '#^https://[a-z0-9\-]+\.example\.com$#',
    ],

    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'X-API-Key',
    ],

    'exposed_headers' => [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'Retry-After',
        'X-Request-Id',
    ],

    'max_age' => 86400, // 24 hours — preflight cache duration

    'supports_credentials' => true, // Required for Sanctum SPA auth
];
```

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — environment-specific CORS for development
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        // CORS middleware is global by default in Laravel 11
        // Custom middleware for additional security headers
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
    })
    ->create();
```

**Key Points**:
- Never use `allowed_origins: ['*']` with `supports_credentials: true` — browsers reject this
- List explicit origins in production — use environment variables for flexibility
- `allowed_origins_patterns` supports regex for dynamic subdomain/tenant patterns
- `max_age` caches preflight responses — set to 24h to reduce OPTIONS requests
- `exposed_headers` makes custom headers accessible to JavaScript clients

---

### Pattern 336.2: Content Security Policy

**Category**: HTTP Security Headers
**Description**: Implement Content Security Policy and other security headers to prevent XSS and data injection.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // Generate nonce for inline scripts (pass to Blade via view share)
        $nonce = Str::random(32);
        app()->instance('csp-nonce', $nonce);

        $response->headers->set(
            'Content-Security-Policy',
            implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'nonce-{$nonce}' https://cdn.example.com",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: https:",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https://api.example.com",
                "frame-src 'none'",
                "object-src 'none'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "upgrade-insecure-requests",
            ]),
        );

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '0'); // Deprecated, CSP replaces this
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload',
        );

        return $response;
    }
}
```

```php
<?php

declare(strict_types=1);

// API-specific security headers — no CSP needed for JSON responses
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ApiSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains',
        );

        return $response;
    }
}
```

**Key Points**:
- CSP is the most effective defense against XSS — use `nonce` for inline scripts
- Set `frame-ancestors 'none'` to prevent clickjacking (replaces X-Frame-Options)
- `object-src 'none'` blocks Flash/Java plugins — attack vectors for older browsers
- API responses need `no-store` cache control to prevent sensitive data caching
- HSTS with `preload` tells browsers to always use HTTPS — submit domain to HSTS preload list

---

### Pattern 336.3: API Key Management

**Category**: API Authentication
**Description**: Manage API keys for service-to-service authentication with rotation support.

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

final class ApiKey extends Model
{
    use HasFactory;
    use HasUlids;

    protected $fillable = [
        'name',
        'key_hash',
        'key_prefix',
        'permissions',
        'rate_limit',
        'expires_at',
        'last_used_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'rate_limit' => 'integer',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function isValid(): bool
    {
        return $this->is_active
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions ?? [], true)
            || in_array('*', $this->permissions ?? [], true);
    }

    public function markUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ApiKey;
use Illuminate\Support\Str;

final class ApiKeyService
{
    private const PREFIX_LENGTH = 8;

    /**
     * @return array{key: string, model: ApiKey}
     */
    public function create(string $name, array $permissions, ?int $expiresInDays = null): array
    {
        $rawKey = Str::random(64);
        $prefix = substr($rawKey, 0, self::PREFIX_LENGTH);

        $apiKey = ApiKey::create([
            'name' => $name,
            'key_hash' => hash('sha256', $rawKey),
            'key_prefix' => $prefix,
            'permissions' => $permissions,
            'rate_limit' => 1000,
            'expires_at' => $expiresInDays ? now()->addDays($expiresInDays) : null,
            'is_active' => true,
        ]);

        return [
            'key' => $rawKey, // Only returned once — not retrievable later
            'model' => $apiKey,
        ];
    }

    public function verify(string $rawKey): ?ApiKey
    {
        $hash = hash('sha256', $rawKey);
        $prefix = substr($rawKey, 0, self::PREFIX_LENGTH);

        $apiKey = ApiKey::where('key_prefix', $prefix)
            ->where('key_hash', $hash)
            ->first();

        if ($apiKey === null || ! $apiKey->isValid()) {
            return null;
        }

        $apiKey->markUsed();

        return $apiKey;
    }

    public function rotate(ApiKey $existing): array
    {
        // Create new key
        $newKey = $this->create(
            name: $existing->name . ' (rotated)',
            permissions: $existing->permissions,
            expiresInDays: $existing->expires_at
                ? (int) now()->diffInDays($existing->expires_at)
                : null,
        );

        // Grace period — old key valid for 24 hours
        $existing->update([
            'expires_at' => now()->addHours(24),
            'name' => $existing->name . ' (deprecated)',
        ]);

        return $newKey;
    }
}
```

**Key Points**:
- Store only the hash of the API key — never store plaintext keys in the database
- Use a key prefix for efficient database lookup before hash comparison
- Return the raw key only at creation time — it cannot be retrieved later
- Implement rotation with grace periods — old key stays valid for 24h during transition
- Track `last_used_at` for detecting stale/unused keys

---

### Pattern 336.4: Two-Factor Authentication

**Category**: Multi-Factor Auth
**Description**: Implement TOTP-based two-factor authentication with recovery codes.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

final class TwoFactorAuthService
{
    public function __construct(
        private readonly Google2FA $google2fa,
    ) {}

    /**
     * Generate a 2FA secret and provisioning URI for QR code display.
     *
     * @return array{secret: string, qr_uri: string}
     */
    public function generateSecret(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey(32);

        $qrUri = $this->google2fa->getQRCodeUrl(
            company: config('app.name'),
            holder: $user->email,
            secret: $secret,
        );

        return [
            'secret' => $secret,
            'qr_uri' => $qrUri,
        ];
    }

    public function enable(User $user, string $secret, string $code): bool
    {
        if (! $this->verify($secret, $code)) {
            return false;
        }

        $recoveryCodes = $this->generateRecoveryCodes();

        $user->update([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_recovery_codes' => Crypt::encryptString(
                json_encode($recoveryCodes, JSON_THROW_ON_ERROR),
            ),
            'two_factor_confirmed_at' => now(),
        ]);

        return true;
    }

    public function verify(string $secret, string $code): bool
    {
        return $this->google2fa->verifyKey(
            secret: $secret,
            key: $code,
            discrepancy: 1, // Allow 1 time-step window (30 seconds)
        );
    }

    public function verifyForUser(User $user, string $code): bool
    {
        if ($user->two_factor_secret === null) {
            return false;
        }

        $secret = Crypt::decryptString($user->two_factor_secret);

        return $this->verify($secret, $code);
    }

    public function verifyRecoveryCode(User $user, string $code): bool
    {
        $codes = json_decode(
            Crypt::decryptString($user->two_factor_recovery_codes),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $index = array_search($code, $codes, true);

        if ($index === false) {
            return false;
        }

        // Remove used recovery code
        unset($codes[$index]);
        $user->update([
            'two_factor_recovery_codes' => Crypt::encryptString(
                json_encode(array_values($codes), JSON_THROW_ON_ERROR),
            ),
        ]);

        return true;
    }

    public function disable(User $user): void
    {
        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);
    }

    /**
     * @return list<string>
     */
    private function generateRecoveryCodes(int $count = 8): array
    {
        return Collection::times($count, fn () => Str::random(10) . '-' . Str::random(10))
            ->all();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequireTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->two_factor_confirmed_at !== null
            && ! $request->session()->get('two_factor_verified', false)
        ) {
            return response()->json([
                'message' => 'Two-factor authentication required.',
                'two_factor_required' => true,
            ], 403);
        }

        return $next($request);
    }
}
```

**Key Points**:
- Encrypt the 2FA secret at rest using `Crypt::encryptString()`
- Generate 8 recovery codes at enablement — each is single-use
- Verify the TOTP code during enablement to confirm the user has the correct secret
- Use `discrepancy: 1` to allow one 30-second window drift
- Remove recovery codes after use — prevent replay attacks
- Rate-limit 2FA verification endpoints to prevent brute force

---

### Pattern 336.5: Session Security

**Category**: Session Hardening
**Description**: Harden session configuration to prevent session hijacking, fixation, and replay.

```php
<?php

declare(strict_types=1);

// config/session.php — production session hardening
return [
    'driver' => env('SESSION_DRIVER', 'redis'),

    'lifetime' => 120, // 2 hours
    'expire_on_close' => false,

    'encrypt' => true, // Encrypt session data

    'cookie' => env('SESSION_COOKIE', 'app_session'),

    'path' => '/',
    'domain' => env('SESSION_DOMAIN', null),

    'secure' => env('SESSION_SECURE_COOKIE', true), // HTTPS only
    'http_only' => true, // Not accessible via JavaScript
    'same_site' => 'lax', // 'strict' for maximum security, 'lax' for usability

    'partitioned' => false,
];
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class SessionAuthController
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Regenerate session ID to prevent session fixation
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Authenticated',
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();

        // Invalidate entire session and regenerate token
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }
}
```

```php
<?php

declare(strict_types=1);

// Concurrent session management — invalidate other sessions
namespace App\Http\Controllers\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class SessionManagerController
{
    public function destroyOtherSessions(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        // Delete all sessions except current (database driver)
        if (config('session.driver') === 'database') {
            DB::table('sessions')
                ->where('user_id', $request->user()->id)
                ->where('id', '!=', $request->session()->getId())
                ->delete();
        }

        // Regenerate current session
        $request->session()->regenerate();

        return response()->json(['message' => 'Other sessions terminated.']);
    }
}
```

**Key Points**:
- Use `redis` or `database` session driver in production — never `file` in load-balanced environments
- `encrypt: true` encrypts session payload — prevents tampering even if cookie is intercepted
- `secure: true` ensures cookies are only sent over HTTPS
- `http_only: true` prevents JavaScript access to session cookie
- Regenerate session ID on login to prevent session fixation attacks
- Invalidate session on logout — not just clear auth state

---

### Pattern 336.6: Signed URLs and Routes

**Category**: Tamper-Proof URLs
**Description**: Generate and verify signed URLs for email verification, file downloads, and temporary access.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\URL;

final class SignedUrlService
{
    /**
     * Generate a temporary signed URL for email verification.
     */
    public function generateEmailVerificationUrl(int $userId): string
    {
        return URL::temporarySignedRoute(
            name: 'verification.verify',
            expiration: now()->addMinutes(60),
            parameters: ['id' => $userId, 'hash' => sha1((string) $userId)],
        );
    }

    /**
     * Generate a signed URL for secure file download.
     */
    public function generateDownloadUrl(string $fileId): string
    {
        return URL::temporarySignedRoute(
            name: 'files.download',
            expiration: now()->addMinutes(30),
            parameters: ['file' => $fileId],
        );
    }

    /**
     * Generate a permanent signed URL (no expiration).
     */
    public function generateUnsubscribeUrl(int $userId, string $listId): string
    {
        return URL::signedRoute(
            name: 'newsletter.unsubscribe',
            parameters: ['user' => $userId, 'list' => $listId],
        );
    }
}
```

```php
<?php

declare(strict_types=1);

// routes/web.php — signed route definitions
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/verify-email/{id}/{hash}', function (Request $request, int $id, string $hash) {
    if (! $request->hasValidSignature()) {
        abort(403, 'Invalid or expired verification link.');
    }

    $user = \App\Models\User::findOrFail($id);
    $user->markEmailAsVerified();

    return response()->json(['message' => 'Email verified successfully.']);
})->name('verification.verify');

// Using middleware for signed URL validation
Route::middleware('signed')->group(function (): void {
    Route::get('/files/{file}/download', [
        \App\Http\Controllers\FileController::class,
        'download',
    ])->name('files.download');

    Route::get('/unsubscribe/{user}/{list}', [
        \App\Http\Controllers\NewsletterController::class,
        'unsubscribe',
    ])->name('newsletter.unsubscribe');
});
```

```php
<?php

declare(strict_types=1);

// Controller handling signed URL downloads
namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class FileController
{
    public function download(Request $request, File $file): StreamedResponse
    {
        // Signature already validated by 'signed' middleware
        abort_unless($file->is_downloadable, 404);

        return Storage::disk('private')->download(
            path: $file->storage_path,
            name: $file->original_filename,
            headers: [
                'Content-Type' => $file->mime_type,
                'Cache-Control' => 'no-store',
            ],
        );
    }
}
```

**Key Points**:
- `temporarySignedRoute()` adds expiration — use for time-sensitive links (verification, downloads)
- `signedRoute()` generates permanent signed URLs — use for idempotent actions (unsubscribe)
- Use `signed` middleware for automatic signature validation on routes
- Manual validation via `$request->hasValidSignature()` for custom error handling
- Signed URLs prevent URL tampering — modifying any parameter invalidates the signature
- `APP_KEY` is used for signing — key rotation invalidates all existing signed URLs

---

## Best Practices

- **CORS: explicit origins only** — never `*` with credentials in production
- **CSP nonces over unsafe-inline** — nonce-based CSP is stronger than hash-based
- **API keys: hash and prefix** — store hashed, lookup by prefix for performance
- **2FA: encrypt secrets at rest** — TOTP secrets are high-value targets
- **Session: regenerate on auth state change** — login, logout, privilege escalation
- **Signed URLs: set short expiration** — 30-60 minutes for downloads, 24h max for verification
- **HSTS preload** — submit domain to HSTS preload list for maximum HTTPS enforcement
- **Security headers on every response** — use global middleware, not per-route configuration
- **Audit key rotations** — log when API keys, 2FA secrets, or sessions are created/rotated/revoked

---

## Abnormal Case Patterns

1. **CORS preflight fails with 405** — `OPTIONS` route not handled. Fix: ensure `HandleCors` middleware is in the global middleware stack (default in Laravel 11); check that `paths` in `config/cors.php` includes the route prefix.

2. **CSP blocks legitimate inline scripts** — inline `<script>` without nonce. Fix: add `nonce` attribute to inline scripts and include `nonce-{value}` in CSP `script-src` directive. Generate per-request nonce.

3. **Signed URL invalid after deployment** — `APP_KEY` changed during deployment. Fix: use stable `APP_KEY` across deployments; never rotate APP_KEY without re-generating all active signed URLs.

4. **2FA recovery codes exhausted** — user used all 8 codes without generating new ones. Fix: show remaining recovery code count in UI; prompt regeneration when count drops below 3.

5. **Session fixation after login** — `$request->session()->regenerate()` not called. Fix: always regenerate session ID after `Auth::attempt()` succeeds.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (336.1–336.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Security Advanced Specialist — Security | EPS v3.2*
