# Laravel Auth Sanctum Specialist — Security
# Laravel認証Sanctumスペシャリスト — セキュリティ
# Chuyen Gia Xac Thuc Sanctum Laravel — Bao Mat

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11 Sanctum
**Aspect**: API Token & SPA Authentication
**Category**: security
**Purpose**: Knowledge provider for Laravel Sanctum authentication — API token issuance, SPA cookie authentication, token abilities, multi-guard configuration, and auth middleware in Laravel 11

---

## Metadata

```json
{
  "id": "laravel-auth-sanctum-specialist",
  "technology": "PHP 8.3 + Laravel 11 Sanctum",
  "aspect": "API Token & SPA Authentication",
  "category": "security",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel Sanctum 4.x — token-based API authentication for SPAs, mobile, and simple APIs",
    "E2: Laravel 11 middleware configuration — bootstrap/app.php withMiddleware() approach",
    "E3: Sanctum token abilities — fine-grained permission scoping per token"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Presentation |
| **Variant** | API, SPA |
| **Pattern Numbers** | 332.1–332.8 |
| **Directory Pattern** | `app/Http/Middleware/`, `config/auth.php` |
| **Naming Convention** | `{Context}Guard.php`, `{Context}Middleware.php` |
| **Imports From** | Domain (User model), Infrastructure (Sanctum package) |
| **Imported By** | Presentation (controllers, routes), Application (services needing auth context) |
| **Cannot Import** | Domain logic must not depend on Sanctum directly |
| **Dependencies** | `laravel/sanctum` |
| **When To Use** | API token auth, SPA auth, mobile app auth — lightweight alternative to OAuth2 |
| **Source Skeleton** | `app/Http/Middleware/{Name}.php`, `config/auth.php` |
| **Specialist Type** | code |
| **Purpose** | Sanctum authentication lifecycle — token issuance, SPA cookie auth, abilities, guards, middleware |
| **Activation Trigger** | files: `config/sanctum.php`, `app/Http/Middleware/Authenticate*`; keywords: Sanctum, createToken, tokenCan, PersonalAccessToken |

---

## Role

You are a **Laravel Sanctum Authentication Specialist**. Your responsibility is to provide best practices for Laravel 11 + Sanctum 4.x authentication — API token management, SPA cookie-based auth, token abilities and scoping, multi-guard configuration, and auth middleware patterns.

**Used by**: Any code agent implementing API or SPA authentication with Laravel Sanctum
**Not used by**: Projects using Passport/OAuth2, non-Laravel stacks, session-only web apps without API

---

## Patterns

### Pattern 332.1: Sanctum API Token Authentication

**Category**: Token Issuance
**Description**: Issue and manage personal access tokens for API authentication using Sanctum.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class TokenAuthController
{
    public function store(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken(
            name: $request->validated('device_name', 'api-token'),
            abilities: ['read', 'write'],
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => now()->addMinutes(
                config('sanctum.expiration', 60 * 24)
            )->toIso8601String(),
        ], 201);
    }

    public function destroy(): JsonResponse
    {
        /** @var User $user */
        $user = auth()->user();
        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'Token revoked'], 200);
    }
}
```

**Key Points**:
- Always hash-check credentials before issuing tokens
- Use `plainTextToken` only in the issuance response — it cannot be retrieved later
- Name tokens by device/context for audit trails
- Delete via `currentAccessToken()->delete()` to revoke the active token only

---

### Pattern 332.2: SPA Authentication (Cookie-Based)

**Category**: SPA Auth
**Description**: Configure Sanctum for first-party SPA authentication using cookie-based sessions.

```php
<?php

declare(strict_types=1);

// config/sanctum.php — SPA stateful domains
return [
    'stateful' => explode(',', env(
        'SANCTUM_STATEFUL_DOMAINS',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1'
    )),

    'guard' => ['web'],

    'expiration' => null, // session-based, no token expiration

    'middleware' => [
        'authenticate_session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => \Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
```

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — Laravel 11 middleware configuration for SPA
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->statefulApi();
    })
    ->create();
```

**Key Points**:
- SPA must call `/sanctum/csrf-cookie` before login to obtain XSRF-TOKEN
- `SANCTUM_STATEFUL_DOMAINS` must include the SPA's domain and port
- Session driver must be `cookie`, `database`, or `redis` — not `array`
- `EnsureFrontendRequestsAreStateful` must be prepended to API middleware stack

---

### Pattern 332.3: Token Abilities and Scopes

**Category**: Authorization
**Description**: Define and check fine-grained token abilities for API access control.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class OrderController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless(
            $request->user()->tokenCan('orders:read'),
            403,
            'Token lacks orders:read ability',
        );

        return OrderResource::collection(
            Order::where('user_id', $request->user()->id)
                ->paginate(perPage: 20),
        );
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->tokenCan('orders:write'),
            403,
            'Token lacks orders:write ability',
        );

        $order = Order::create($request->validated());

        return response()->json(new OrderResource($order), 201);
    }
}
```

```php
<?php

declare(strict_types=1);

// Token issuance with scoped abilities
$adminToken = $user->createToken(
    name: 'admin-dashboard',
    abilities: ['orders:read', 'orders:write', 'users:manage'],
);

$readOnlyToken = $user->createToken(
    name: 'reporting-service',
    abilities: ['orders:read', 'analytics:read'],
);

// Wildcard ability
$superToken = $user->createToken(
    name: 'super-admin',
    abilities: ['*'],
);
```

**Key Points**:
- Use colon-delimited abilities: `resource:action` (e.g., `orders:read`)
- `tokenCan()` returns true for `*` wildcard tokens
- SPA cookie auth tokens always pass `tokenCan()` checks — abilities apply to API tokens only
- Prefer `abort_unless()` over manual if/throw for concise guarding

---

### Pattern 332.4: Token Expiration

**Category**: Token Lifecycle
**Description**: Configure and enforce token expiration for API tokens.

```php
<?php

declare(strict_types=1);

// config/sanctum.php — global expiration (minutes)
return [
    'expiration' => 60 * 24, // 24 hours — null for no expiration
];
```

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Sanctum\PersonalAccessToken;

final class PruneExpiredTokensCommand extends Command
{
    protected $signature = 'sanctum:prune-expired
                            {--hours=48 : Delete tokens expired for this many hours}';

    protected $description = 'Prune expired Sanctum tokens from database';

    public function handle(): int
    {
        $hours = (int) $this->option('hours');

        $deleted = PersonalAccessToken::where('expires_at', '<', now()->subHours($hours))
            ->orWhere(function ($query) use ($hours): void {
                $query->whereNull('expires_at')
                    ->where('created_at', '<', now()->subHours($hours));
            })
            ->delete();

        $this->info("Pruned {$deleted} expired tokens.");

        return self::SUCCESS;
    }
}
```

**Key Points**:
- Set `expiration` in config for global token TTL (in minutes)
- Sanctum 4.x supports `expires_at` column on `personal_access_tokens` table
- Schedule `sanctum:prune-expired` daily via `routes/console.php`
- Expired tokens are rejected automatically by Sanctum guard

---

### Pattern 332.5: Multi-Guard Setup

**Category**: Guard Configuration
**Description**: Configure multiple authentication guards for different user types (admin, API, web).

```php
<?php

declare(strict_types=1);

// config/auth.php — multi-guard configuration
return [
    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
        'api' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
        'admin' => [
            'driver' => 'sanctum',
            'provider' => 'admins',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => \App\Models\User::class,
        ],
        'admins' => [
            'driver' => 'eloquent',
            'model' => \App\Models\Admin::class,
        ],
    ],
];
```

```php
<?php

declare(strict_types=1);

// Route definition with specific guard
use Illuminate\Support\Facades\Route;

Route::middleware('auth:admin')->prefix('admin/api')->group(function (): void {
    Route::get('/dashboard', [\App\Http\Controllers\Admin\DashboardController::class, 'index']);
});

Route::middleware('auth:api')->prefix('api/v1')->group(function (): void {
    Route::apiResource('orders', \App\Http\Controllers\Api\OrderController::class);
});
```

**Key Points**:
- Each guard maps to a provider (Eloquent model)
- Specify guard in middleware: `auth:admin`, `auth:api`
- Admin model must also use `HasApiTokens` trait for Sanctum
- Default guard applies when `auth` middleware is used without specifier

---

### Pattern 332.6: Custom Guard Implementation

**Category**: Custom Authentication
**Description**: Build a custom guard for non-standard authentication mechanisms (API key header, JWT hybrid).

```php
<?php

declare(strict_types=1);

namespace App\Auth;

use App\Models\ApiClient;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Http\Request;

final class ApiKeyGuard implements Guard
{
    private ?Authenticatable $user = null;

    public function __construct(
        private readonly Request $request,
    ) {}

    public function check(): bool
    {
        return $this->user() !== null;
    }

    public function guest(): bool
    {
        return ! $this->check();
    }

    public function user(): ?Authenticatable
    {
        if ($this->user !== null) {
            return $this->user;
        }

        $apiKey = $this->request->header('X-API-Key');

        if ($apiKey === null) {
            return null;
        }

        $this->user = ApiClient::where('api_key', hash('sha256', $apiKey))
            ->where('is_active', true)
            ->first();

        return $this->user;
    }

    public function id(): int|string|null
    {
        return $this->user()?->getAuthIdentifier();
    }

    public function validate(array $credentials = []): bool
    {
        $client = ApiClient::where('api_key', hash('sha256', $credentials['api_key'] ?? ''))
            ->where('is_active', true)
            ->first();

        return $client !== null;
    }

    public function hasUser(): bool
    {
        return $this->user !== null;
    }

    public function setUser(Authenticatable $user): static
    {
        $this->user = $user;

        return $this;
    }
}
```

```php
<?php

declare(strict_types=1);

// Register custom guard in AuthServiceProvider or AppServiceProvider
namespace App\Providers;

use App\Auth\ApiKeyGuard;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

final class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Auth::extend('api-key', function ($app, $name, array $config) {
            return new ApiKeyGuard($app['request']);
        });
    }
}
```

**Key Points**:
- Implement `Illuminate\Contracts\Auth\Guard` interface
- Always hash API keys before database lookup — never store plaintext
- Register via `Auth::extend()` in a service provider's boot()
- Wire in `config/auth.php` guards: `'driver' => 'api-key'`

---

### Pattern 332.7: Auth Middleware (Laravel 11)

**Category**: Middleware
**Description**: Configure authentication middleware using Laravel 11's bootstrap/app.php approach.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — Laravel 11 auth middleware configuration
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        // Redirect unauthenticated users
        $middleware->redirectGuestsTo('/login');

        // Redirect authenticated users away from guest routes
        $middleware->redirectUsersTo('/dashboard');

        // Append custom middleware to groups
        $middleware->api(append: [
            \App\Http\Middleware\LogApiAccess::class,
        ]);

        // Define middleware aliases
        $middleware->alias([
            'abilities' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'ability' => \Laravel\Sanctum\Http\Middleware\CheckForAnyAbility::class,
            'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
        ]);
    })
    ->create();
```

```php
<?php

declare(strict_types=1);

// Route using Sanctum ability middleware
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'abilities:orders:read,orders:write'])->group(function (): void {
    Route::apiResource('orders', \App\Http\Controllers\Api\OrderController::class);
});

// Check for ANY ability (OR logic)
Route::middleware(['auth:sanctum', 'ability:admin,super-admin'])->group(function (): void {
    Route::get('/admin/stats', [\App\Http\Controllers\Admin\StatsController::class, 'index']);
});
```

**Key Points**:
- Laravel 11 configures middleware in `bootstrap/app.php`, not in Kernel.php
- `abilities` middleware checks ALL listed abilities (AND logic)
- `ability` middleware checks ANY listed ability (OR logic)
- Define aliases for Sanctum middleware for cleaner route definitions

---

### Pattern 332.8: Current User Resolution

**Category**: User Context
**Description**: Resolve and type-hint the authenticated user in controllers and services.

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ProfileController
{
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'token_abilities' => $user->currentAccessToken()?->abilities ?? [],
            'token_name' => $user->currentAccessToken()?->name,
            'token_last_used' => $user->currentAccessToken()?->last_used_at?->toIso8601String(),
        ]);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;

final class AuditService
{
    public function log(string $action, array $context = []): void
    {
        /** @var User|null $user */
        $user = auth()->user();

        \App\Models\AuditLog::create([
            'user_id' => $user?->id,
            'user_type' => $user ? $user::class : 'anonymous',
            'action' => $action,
            'context' => $context,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
```

**Key Points**:
- `$request->user()` is the preferred way to access the authenticated user
- Use `@var` annotation for IDE support when the return type is `Authenticatable`
- `currentAccessToken()` provides token metadata (name, abilities, last_used_at)
- In services, inject `Authenticatable` or use `auth()->user()` — prefer explicit injection

---

## Best Practices

- **Use Sanctum for first-party apps** — Sanctum is simpler than Passport for SPAs and mobile apps owned by you
- **Hash API keys** — never store plaintext API keys; use `hash('sha256', $key)` before lookup
- **Scope tokens minimally** — issue tokens with the least abilities needed for the use case
- **Set token expiration** — never issue non-expiring tokens in production
- **Prune expired tokens** — schedule daily cleanup to prevent table bloat
- **Name tokens meaningfully** — include device name, service name, or purpose for audit trails
- **SPA: validate stateful domains** — misconfigured `SANCTUM_STATEFUL_DOMAINS` causes silent auth failures
- **Use middleware aliases** — define `abilities` and `ability` aliases for clean route definitions
- **Log token usage** — track `last_used_at` for security auditing and stale token detection

---

## Abnormal Case Patterns

1. **CORS blocking SPA auth** — SPA on different subdomain cannot set cookies. Fix: configure `SANCTUM_STATEFUL_DOMAINS` to include the SPA origin and set `SESSION_DOMAIN` to the shared root domain (e.g., `.example.com`).

2. **Token abilities ignored for SPA sessions** — `tokenCan()` always returns true for session-based auth. Fix: use separate authorization layer (policies/gates) for SPA; token abilities only apply to API tokens.

3. **CSRF token mismatch on SPA login** — SPA skips `/sanctum/csrf-cookie` call. Fix: always call `GET /sanctum/csrf-cookie` before POST to `/login`. Ensure Axios sends `withCredentials: true`.

4. **Multi-guard token resolution failure** — Sanctum resolves against wrong provider. Fix: set `'guard' => ['web', 'admin']` in `config/sanctum.php` and ensure each guard has the correct provider.

5. **Expired tokens not rejected** — `expiration` set to null in config. Fix: set `expiration` to a positive integer (minutes) and verify `expires_at` column exists in `personal_access_tokens` migration.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (332.1–332.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Auth Sanctum Specialist — Security | EPS v3.2*
