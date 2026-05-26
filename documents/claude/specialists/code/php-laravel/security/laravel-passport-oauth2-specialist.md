# Laravel Passport OAuth2 Specialist — Security
# Laravel Passport OAuth2スペシャリスト — セキュリティ
# Chuyen Gia Passport OAuth2 Laravel — Bao Mat

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11 Passport
**Aspect**: OAuth2 Authentication
**Category**: security
**Purpose**: Knowledge provider for Laravel Passport OAuth2 — client credentials grant, authorization code flow, personal access tokens, token scopes, and PKCE flow for secure API authentication

---

## Metadata

```json
{
  "id": "laravel-passport-oauth2-specialist",
  "technology": "PHP 8.3 + Laravel 11 Passport",
  "aspect": "OAuth2 Authentication",
  "category": "security",
  "subcategory": "php-laravel",
  "lines": 420,
  "token_cost": 2800,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Passport 12.x — full OAuth2 server implementation for Laravel",
    "E2: OAuth2 RFC 6749 — authorization framework with grant types",
    "E3: PKCE RFC 7636 — Proof Key for Code Exchange for public clients"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | API (OAuth2) |
| **Pattern Numbers** | 334.1–334.6 |
| **Directory Pattern** | `app/`, `config/passport.php` |
| **Naming Convention** | OAuth2-standard endpoints, `Passport::` configuration |
| **Imports From** | Domain (User model), Infrastructure (Passport package, encryption keys) |
| **Imported By** | Presentation (controllers, routes), Application (services requiring OAuth tokens) |
| **Cannot Import** | Domain logic must not depend on Passport directly |
| **Dependencies** | `laravel/passport` |
| **When To Use** | Third-party API access, machine-to-machine auth, OAuth2-compliant API |
| **Source Skeleton** | `config/passport.php`, `app/Providers/AppServiceProvider.php` |
| **Specialist Type** | code |
| **Purpose** | Passport OAuth2 lifecycle — grant types, scopes, token management, PKCE |
| **Activation Trigger** | files: `config/passport.php`; keywords: Passport, OAuth, client_credentials, authorization_code, PKCE |

---

## Role

You are a **Laravel Passport OAuth2 Specialist**. Your responsibility is to provide best practices for Laravel 11 + Passport 12.x — OAuth2 server setup, client credentials grant for machine-to-machine, authorization code flow for third-party apps, personal access tokens, scope management, and PKCE for public clients.

**Used by**: Any code agent implementing OAuth2 authentication with Laravel Passport
**Not used by**: First-party SPA/mobile apps (use Sanctum specialist), non-Laravel stacks

---

## Patterns

### Pattern 334.1: Passport Setup

**Category**: Installation & Configuration
**Description**: Install and configure Passport as a full OAuth2 server in Laravel 11.

```php
<?php

declare(strict_types=1);

// config/passport.php
return [
    'guard' => 'api',

    'private_key' => env('PASSPORT_PRIVATE_KEY'),
    'public_key' => env('PASSPORT_PUBLIC_KEY'),

    'client_uuids' => true,

    'personal_access_client' => [
        'id' => env('PASSPORT_PERSONAL_ACCESS_CLIENT_ID'),
        'secret' => env('PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET'),
    ],

    'storage' => [
        'database' => [
            'connection' => env('DB_CONNECTION', 'mysql'),
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

// app/Models/User.php — HasApiTokens trait
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Passport\HasApiTokens;

final class User extends Authenticatable
{
    use HasApiTokens;

    // ...
}
```

```php
<?php

declare(strict_types=1);

// app/Providers/AppServiceProvider.php — Passport configuration
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Passport::tokensExpireIn(now()->addDays(15));
        Passport::refreshTokensExpireIn(now()->addDays(30));
        Passport::personalAccessTokensExpireIn(now()->addMonths(6));

        Passport::hashClientSecrets();
    }
}
```

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — API guard configuration
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'client' => \Laravel\Passport\Http\Middleware\CheckClientCredentials::class,
            'scopes' => \Laravel\Passport\Http\Middleware\CheckScopes::class,
            'scope' => \Laravel\Passport\Http\Middleware\CheckForAnyScope::class,
        ]);
    })
    ->create();
```

**Key Points**:
- Use `Passport::hashClientSecrets()` in production — prevents plaintext secret storage
- Set explicit token expiration — never use unlimited tokens in production
- Use UUID client IDs (`client_uuids => true`) for distributed systems
- Store keys in environment variables, not in the filesystem for containerized deployments
- Laravel 11 registers Passport routes automatically — no `Passport::routes()` call needed

---

### Pattern 334.2: Client Credentials Grant

**Category**: Machine-to-Machine
**Description**: Machine-to-machine authentication using client credentials grant (no user context).

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ServiceHealthController
{
    // Protected by client credentials — no user, only client
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'client_id' => $request->attributes->get('oauth_client_id'),
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

// routes/api.php — client credentials protected routes
use Illuminate\Support\Facades\Route;

Route::middleware('client:service-health')->group(function (): void {
    Route::get('/health', [\App\Http\Controllers\Api\ServiceHealthController::class, 'index']);
});

Route::middleware('client:data-sync,reporting')->group(function (): void {
    Route::get('/sync/status', [\App\Http\Controllers\Api\SyncController::class, 'status']);
});
```

```php
<?php

declare(strict_types=1);

// Consuming service — requesting token
namespace App\Services;

use Illuminate\Support\Facades\Http;

final class ExternalApiClient
{
    public function __construct(
        private readonly string $tokenUrl,
        private readonly string $clientId,
        private readonly string $clientSecret,
    ) {}

    public function getAccessToken(array $scopes = []): string
    {
        $response = Http::asForm()->post($this->tokenUrl, [
            'grant_type' => 'client_credentials',
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'scope' => implode(' ', $scopes),
        ]);

        $response->throw();

        return $response->json('access_token');
    }
}
```

**Key Points**:
- Client credentials grant has no user context — `$request->user()` returns null
- Use `client` middleware (not `auth:api`) for client-only routes
- Pass scopes to `client:scope1,scope2` middleware for scope enforcement
- Create clients via `php artisan passport:client --client` for machine-to-machine

---

### Pattern 334.3: Authorization Code Flow

**Category**: Third-Party Authorization
**Description**: Full authorization code flow for third-party applications accessing user data.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Passport::tokensCan([
            'read-profile' => 'Read user profile information',
            'read-orders' => 'Read order history',
            'create-orders' => 'Create new orders',
            'manage-account' => 'Manage account settings',
        ]);

        Passport::setDefaultScope([
            'read-profile',
        ]);

        Passport::tokensExpireIn(now()->addHours(1));
        Passport::refreshTokensExpireIn(now()->addDays(30));
    }
}
```

```php
<?php

declare(strict_types=1);

// Third-party app initiating authorization code flow
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

final class OAuthAuthorizationService
{
    public function __construct(
        private readonly string $authServerUrl,
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $redirectUri,
    ) {}

    public function getAuthorizationUrl(array $scopes = ['read-profile']): string
    {
        $state = Str::random(40);
        session(['oauth_state' => $state]);

        $query = http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', $scopes),
            'state' => $state,
        ]);

        return "{$this->authServerUrl}/oauth/authorize?{$query}";
    }

    public function exchangeCodeForToken(string $code): array
    {
        $response = Http::asForm()->post("{$this->authServerUrl}/oauth/token", [
            'grant_type' => 'authorization_code',
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'redirect_uri' => $this->redirectUri,
            'code' => $code,
        ]);

        $response->throw();

        return $response->json();
    }

    public function refreshToken(string $refreshToken): array
    {
        $response = Http::asForm()->post("{$this->authServerUrl}/oauth/token", [
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'scope' => '',
        ]);

        $response->throw();

        return $response->json();
    }
}
```

**Key Points**:
- Always validate `state` parameter to prevent CSRF attacks
- Set short access token expiry (1 hour) with longer refresh token expiry (30 days)
- Define scopes in `tokensCan()` with human-readable descriptions
- Refresh tokens should be stored securely and rotated on use

---

### Pattern 334.4: Personal Access Tokens

**Category**: User-Issued Tokens
**Description**: Allow users to create personal access tokens for API access from their own applications.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PersonalAccessTokenController
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tokens = $user->tokens()->where('revoked', false)->get()->map(
            fn ($token) => [
                'id' => $token->id,
                'name' => $token->name,
                'scopes' => $token->scopes,
                'created_at' => $token->created_at->toIso8601String(),
                'last_used_at' => $token->last_used_at?->toIso8601String(),
            ],
        );

        return response()->json(['tokens' => $tokens]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'scopes' => ['required', 'array'],
            'scopes.*' => ['string', 'in:read-profile,read-orders,create-orders'],
        ]);

        /** @var User $user */
        $user = $request->user();

        // Enforce maximum token count per user
        $activeTokenCount = $user->tokens()->where('revoked', false)->count();
        abort_if($activeTokenCount >= 10, 422, 'Maximum of 10 active tokens allowed.');

        $token = $user->createToken(
            name: $validated['name'],
            scopes: $validated['scopes'],
        );

        return response()->json([
            'token' => $token->accessToken,
            'token_id' => $token->token->id,
            'expires_at' => $token->token->expires_at?->toIso8601String(),
        ], 201);
    }

    public function destroy(Request $request, string $tokenId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $token = $user->tokens()->findOrFail($tokenId);
        $token->revoke();

        // Also revoke associated refresh tokens
        $token->refreshToken?->revoke();

        return response()->json(null, 204);
    }
}
```

**Key Points**:
- Limit active tokens per user to prevent token proliferation
- Validate requested scopes against allowed scopes (whitelist approach)
- Return `accessToken` only at creation time — it cannot be retrieved later
- Revoke refresh tokens when revoking access tokens to prevent token reuse

---

### Pattern 334.5: Token Scopes

**Category**: Scope Management
**Description**: Define, assign, and enforce token scopes for fine-grained API access control.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Passport::tokensCan([
            'read-profile' => 'Read your profile information',
            'update-profile' => 'Update your profile information',
            'read-orders' => 'View your order history',
            'create-orders' => 'Place new orders',
            'manage-orders' => 'Update and cancel orders',
            'read-analytics' => 'Access analytics data',
            'admin' => 'Full administrative access',
        ]);

        Passport::setDefaultScope([
            'read-profile',
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

// routes/api.php — scope-protected routes
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->group(function (): void {
    // Requires ALL listed scopes (AND logic)
    Route::middleware('scopes:read-orders,read-profile')->group(function (): void {
        Route::get('/orders', [\App\Http\Controllers\Api\OrderController::class, 'index']);
    });

    // Requires ANY listed scope (OR logic)
    Route::middleware('scope:manage-orders,admin')->group(function (): void {
        Route::put('/orders/{order}', [\App\Http\Controllers\Api\OrderController::class, 'update']);
        Route::delete('/orders/{order}', [\App\Http\Controllers\Api\OrderController::class, 'destroy']);
    });
});
```

```php
<?php

declare(strict_types=1);

// Programmatic scope checking in controllers
namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AnalyticsController
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->tokenCan('read-analytics')) {
            abort(403, 'Token does not have read-analytics scope.');
        }

        // Scope-dependent response shaping
        $data = match (true) {
            $request->user()->tokenCan('admin') => $this->fullAnalytics(),
            $request->user()->tokenCan('read-analytics') => $this->limitedAnalytics(),
            default => [],
        };

        return response()->json(['analytics' => $data]);
    }

    private function fullAnalytics(): array { return [/* full data */]; }
    private function limitedAnalytics(): array { return [/* limited data */]; }
}
```

**Key Points**:
- `scopes` middleware: requires ALL scopes (AND logic)
- `scope` middleware: requires ANY scope (OR logic)
- Use `tokenCan()` for programmatic scope checks within controllers
- Define scope hierarchy — broad scopes (admin) subsume specific scopes
- Set default scopes for tokens issued without explicit scope request

---

### Pattern 334.6: PKCE Flow

**Category**: Public Client Security
**Description**: Proof Key for Code Exchange for public clients (SPAs, mobile apps) that cannot securely store client secrets.

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

final class PkceAuthorizationService
{
    public function __construct(
        private readonly string $authServerUrl,
        private readonly string $clientId,
        private readonly string $redirectUri,
    ) {}

    /**
     * Generate PKCE code verifier and challenge.
     *
     * @return array{verifier: string, challenge: string}
     */
    public function generatePkceChallenge(): array
    {
        $verifier = Str::random(128);

        $challenge = strtr(
            rtrim(base64_encode(hash('sha256', $verifier, true)), '='),
            '+/',
            '-_',
        );

        return [
            'verifier' => $verifier,
            'challenge' => $challenge,
        ];
    }

    public function getAuthorizationUrl(string $codeChallenge, array $scopes = []): string
    {
        $state = Str::random(40);
        session(['oauth_state' => $state]);

        $query = http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', $scopes),
            'state' => $state,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]);

        return "{$this->authServerUrl}/oauth/authorize?{$query}";
    }

    public function exchangeCodeForToken(string $code, string $codeVerifier): array
    {
        $response = Http::asForm()->post("{$this->authServerUrl}/oauth/token", [
            'grant_type' => 'authorization_code',
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'code' => $code,
            'code_verifier' => $codeVerifier,
        ]);

        $response->throw();

        return $response->json();
    }
}
```

```php
<?php

declare(strict_types=1);

// Create PKCE-enabled client via artisan or programmatically
// php artisan passport:client --public

// Programmatic client creation
use Laravel\Passport\ClientRepository;

$clientRepository = app(ClientRepository::class);

$client = $clientRepository->create(
    userId: null,
    name: 'SPA Frontend',
    redirect: 'https://spa.example.com/callback',
    provider: null,
    personalAccess: false,
    password: false,
    confidential: false, // Public client — no secret
);
```

**Key Points**:
- PKCE eliminates the need for client secret — suitable for public clients (SPA, mobile)
- Always use S256 challenge method — never plain
- Store `code_verifier` in session/memory during auth flow — never transmit it to the auth server before token exchange
- Create public clients with `--public` flag or `confidential: false`
- PKCE is recommended even for confidential clients as defense-in-depth

---

## Best Practices

- **Use Passport for third-party OAuth2** — Sanctum is simpler for first-party apps
- **Hash client secrets** — call `Passport::hashClientSecrets()` in production
- **Short-lived access tokens** — 1 hour max; use refresh tokens for persistence
- **Scope minimally** — clients should request only the scopes they need
- **PKCE for public clients** — never trust client secrets from SPAs or mobile apps
- **Rotate encryption keys** — use `passport:keys` periodically, manage key rotation
- **Prune revoked tokens** — schedule `passport:purge` to clean up expired/revoked tokens
- **Validate state parameter** — always verify CSRF state in authorization code flow
- **Monitor token usage** — track issued tokens, revocations, and scope usage for audit

---

## Abnormal Case Patterns

1. **"Personal access client not found"** — personal access client not created. Fix: run `php artisan passport:client --personal` and set `PASSPORT_PERSONAL_ACCESS_CLIENT_ID` and `PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET` in `.env`.

2. **"Key path does not exist"** — encryption keys missing. Fix: run `php artisan passport:keys` or set `PASSPORT_PRIVATE_KEY` and `PASSPORT_PUBLIC_KEY` environment variables directly.

3. **Token endpoint returns 401 for valid credentials** — client secret hashed but sent unhashed, or vice versa. Fix: ensure `Passport::hashClientSecrets()` is called consistently; rehash existing secrets after enabling.

4. **PKCE flow fails with "invalid code verifier"** — verifier/challenge mismatch or encoding error. Fix: verify S256 hashing uses raw binary output and URL-safe base64 encoding without padding.

5. **Refresh token rejected after rotation** — old refresh token reused after new one issued. Fix: implement refresh token rotation and invalidate old tokens on use; alert on reuse attempts (token theft indicator).

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (334.1–334.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Passport OAuth2 Specialist — Security | EPS v3.2*
