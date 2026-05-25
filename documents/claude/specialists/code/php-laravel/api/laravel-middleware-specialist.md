# Laravel Middleware Specialist — API
# Laravelミドルウェアスペシャリスト — API
# Chuyen Gia Middleware Laravel — API

**Version**: 1.0.0
**Technology**: Laravel 11+ Middleware
**Aspect**: Middleware
**Category**: api
**Purpose**: Knowledge provider for Laravel 11+ middleware architecture — custom middleware, middleware groups, global middleware via bootstrap/app.php, parameters, terminable middleware, rate limiting, CORS, and priority ordering

---

## Metadata

```json
{
  "id": "laravel-middleware-specialist",
  "technology": "Laravel 11+ Middleware",
  "aspect": "Middleware",
  "category": "api",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 middleware registration — bootstrap/app.php withMiddleware(), no Kernel.php",
    "E2: Terminable middleware — post-response processing for logging, analytics",
    "E3: Rate limiting — RateLimiter facade in AppServiceProvider"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 309.1–309.8 |
| **Directory Pattern** | `app/Http/Middleware/` |
| **Naming Convention** | `{Action}{Concern}Middleware.php` |
| **Imports From** | Domain (models), Application (services for auth checks) |
| **Imported By** | Routes, Controllers (via HasMiddleware) |
| **Cannot Import** | Infrastructure (repositories directly) |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Cross-cutting concerns — authentication, logging, throttling, CORS, request transformation |
| **Source Skeleton** | `app/Http/Middleware/{Action}{Concern}Middleware.php` |
| **Specialist Type** | code |
| **Purpose** | HTTP middleware pipeline — request/response filtering, transformation, rate limiting |
| **Activation Trigger** | files: `app/Http/Middleware/*.php`, `bootstrap/app.php`; keywords: middleware, throttle, rate limit, CORS |

---

## Role

You are a **Laravel Middleware Specialist**. Your responsibility is to provide best practices for Laravel 11+ middleware architecture — custom middleware creation, middleware groups, global middleware registration via bootstrap/app.php (replacing Kernel.php), parameterized middleware, terminable middleware, rate limiting, CORS configuration, and middleware priority ordering.

**Used by**: Any code agent implementing cross-cutting HTTP concerns in Laravel
**Not used by**: Non-Laravel stacks, console-only applications

---

## Patterns

### Pattern 309.1: Custom Middleware

**Category**: Middleware Fundamentals
**Description**: Create custom middleware with typed handle method following Laravel 11 conventions.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
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

final readonly class EnsureEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->hasVerifiedEmail()) {
            return response()->json(
                data: ['message' => 'Email address must be verified.'],
                status: 403,
            );
        }

        return $next($request);
    }
}
```

**Key Points**:
- Use `final readonly` class — middleware should be stateless
- Type-hint return as `Response` (Symfony component)
- Before-middleware: modify request, then call `$next($request)`
- Guard middleware: return early response or pass to `$next`

---

### Pattern 309.2: Middleware Groups

**Category**: Group Registration
**Description**: Register middleware groups in bootstrap/app.php for Laravel 11 — replaces Kernel.php $middlewareGroups.

```php
<?php

// bootstrap/app.php — Laravel 11
use App\Http\Middleware\EnsureEmailVerified;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\TrackApiUsage;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        // Prepend to API group
        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);

        // Append to API group
        $middleware->api(append: [
            TrackApiUsage::class,
        ]);

        // Append to web group
        $middleware->web(append: [
            EnsureEmailVerified::class,
        ]);

        // Create custom middleware group
        $middleware->group('admin', [
            'auth:sanctum',
            EnsureEmailVerified::class,
            \App\Http\Middleware\EnsureUserIsAdmin::class,
        ]);

        // Middleware aliases
        $middleware->alias([
            'verified' => EnsureEmailVerified::class,
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'track' => TrackApiUsage::class,
        ]);
    })
    ->create();
```

**Key Points**:
- Laravel 11 uses `bootstrap/app.php` `withMiddleware()` — no `Kernel.php`
- `prepend` runs before default group middleware; `append` runs after
- `group()` creates named middleware groups for route assignment
- `alias()` creates short names usable in routes as strings

---

### Pattern 309.3: Global Middleware

**Category**: Global Pipeline
**Description**: Register global middleware that runs on every request in Laravel 11.

```php
<?php

// bootstrap/app.php
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\TrackRequestTiming;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        // Add global middleware (runs on ALL requests)
        $middleware->append(SecurityHeaders::class);
        $middleware->prepend(TrackRequestTiming::class);

        // Remove default global middleware if needed
        $middleware->remove(
            \Illuminate\Http\Middleware\TrustProxies::class,
        );

        // Replace a default middleware
        $middleware->replace(
            \Illuminate\Http\Middleware\TrustProxies::class,
            \App\Http\Middleware\CustomTrustProxies::class,
        );
    })
    ->create();
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        return $response;
    }
}
```

**Key Points**:
- `append()` adds to end of global pipeline; `prepend()` adds to beginning
- `remove()` disables default middleware; `replace()` swaps implementation
- Global middleware runs on EVERY request — keep it lightweight
- After-middleware pattern: modify response after `$next($request)`

---

### Pattern 309.4: Middleware Parameters

**Category**: Parameterized Middleware
**Description**: Pass parameters to middleware via route definition and receive them in handle().

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class EnsureUserHasRole
{
    public function handle(
        Request $request,
        Closure $next,
        string ...$roles,
    ): Response {
        $user = $request->user();

        if (!$user || !$user->hasAnyRole(...$roles)) {
            return response()->json(
                data: [
                    'message' => 'Insufficient permissions.',
                    'required_roles' => $roles,
                ],
                status: 403,
            );
        }

        return $next($request);
    }
}
```

```php
// routes/api.php — passing parameters
use Illuminate\Support\Facades\Route;

Route::middleware('role:admin,super-admin')->group(function (): void {
    Route::apiResource('users', UserController::class);
});

Route::middleware('role:editor')->group(function (): void {
    Route::apiResource('posts', PostController::class);
});

// Or with HasMiddleware interface
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

final class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('role:admin', only: ['destroy']),
            new Middleware('role:admin,editor', only: ['store', 'update']),
        ];
    }
}
```

**Key Points**:
- Parameters passed after colon: `'role:admin,editor'` → `handle($request, $next, 'admin', 'editor')`
- Use variadic `...$roles` to accept multiple parameters
- Combine with `only`/`except` on `HasMiddleware` for per-action parameterization
- Register alias in bootstrap/app.php: `$middleware->alias(['role' => EnsureUserHasRole::class])`

---

### Pattern 309.5: Terminable Middleware

**Category**: Post-Response Processing
**Description**: Execute logic after the response has been sent to the client — for logging, analytics, cleanup.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\ApiAnalyticsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class TrackApiUsage
{
    public function __construct(
        private readonly ApiAnalyticsService $analytics,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('request_started_at', microtime(true));

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $duration = microtime(true) - $request->attributes->get('request_started_at', 0);

        $this->analytics->record(
            endpoint: $request->path(),
            method: $request->method(),
            statusCode: $response->getStatusCode(),
            durationMs: round($duration * 1000, 2),
            userId: $request->user()?->id,
            ipAddress: $request->ip(),
        );
    }
}
```

**Key Points**:
- `terminate()` runs AFTER response is sent — does not delay client response
- Terminable middleware is NOT `readonly` — it needs the injected service in terminate()
- Store request-scoped data via `$request->attributes` (Symfony parameter bag)
- Use for: analytics, audit logging, cleanup, background job dispatch

---

### Pattern 309.6: Rate Limiting Middleware

**Category**: Throttling
**Description**: Configure rate limiters in AppServiceProvider and apply via middleware.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Default API rate limit
        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Strict rate limit for auth endpoints
        RateLimiter::for('auth', function (Request $request): array {
            return [
                Limit::perMinute(5)->by('auth-attempt:' . $request->ip()),
                Limit::perDay(50)->by('auth-daily:' . $request->ip()),
            ];
        });

        // Tiered rate limiting based on subscription
        RateLimiter::for('tiered', function (Request $request): Limit {
            $user = $request->user();

            return match ($user?->subscription_tier) {
                'enterprise' => Limit::none(),
                'pro' => Limit::perMinute(300)->by($user->id),
                'basic' => Limit::perMinute(60)->by($user->id),
                default => Limit::perMinute(10)->by($request->ip()),
            };
        });
    }
}
```

```php
// routes/api.php
Route::middleware('throttle:auth')->group(function (): void {
    Route::post('/login', LoginController::class);
    Route::post('/register', RegisterController::class);
});

Route::middleware(['auth:sanctum', 'throttle:tiered'])->group(function (): void {
    Route::apiResource('data', DataController::class);
});
```

**Key Points**:
- Define rate limiters in `AppServiceProvider::boot()` using `RateLimiter::for()`
- Return array of `Limit` objects for multiple rate limit tiers (per-minute AND per-day)
- `->by()` sets the rate limit key — use user ID for authenticated, IP for guests
- `Limit::none()` disables rate limiting for premium tiers
- `match` expression for clean tier-based rate limiting

---

### Pattern 309.7: CORS Middleware

**Category**: Cross-Origin
**Description**: Configure CORS in Laravel 11 using the built-in CORS middleware and custom configuration.

```php
<?php

// config/cors.php — Laravel 11 CORS configuration
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.example\.com$/',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [
        'X-Request-Id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
    ],
    'max_age' => 86400,
    'supports_credentials' => true,
];
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class DynamicCors
{
    /**
     * Dynamic CORS for multi-tenant — allowed origins from tenant config.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');

        if ($origin === null) {
            return $next($request);
        }

        $allowedOrigins = $this->resolveAllowedOrigins($request);

        if (!in_array($origin, $allowedOrigins, strict: true)) {
            return response()->json(
                data: ['message' => 'CORS origin not allowed.'],
                status: 403,
            );
        }

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');

        return $response;
    }

    private function resolveAllowedOrigins(Request $request): array
    {
        // Resolve from tenant configuration or database
        return config('cors.allowed_origins', []);
    }
}
```

**Key Points**:
- Use `config/cors.php` for static CORS configuration (covers most cases)
- Custom middleware for dynamic CORS (multi-tenant, per-route origins)
- `supports_credentials: true` required for cookies/auth headers across origins
- `exposed_headers` makes custom headers accessible to browser JavaScript
- Set `max_age` to cache preflight responses (reduce OPTIONS requests)

---

### Pattern 309.8: Middleware Priority & Ordering

**Category**: Pipeline Control
**Description**: Control middleware execution order using priority configuration in Laravel 11.

```php
<?php

// bootstrap/app.php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        // Define priority — middleware runs in this order regardless of assignment order
        $middleware->priority([
            \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Routing\Middleware\ThrottleRequests::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Illuminate\Auth\Middleware\Authorize::class,
            // Custom middleware ordering
            \App\Http\Middleware\ForceJsonResponse::class,
            \App\Http\Middleware\EnsureUserHasRole::class,
            \App\Http\Middleware\TrackApiUsage::class,
        ]);

        // Ensure specific middleware runs before/after others
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);
    })
    ->create();
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class RequestIdMiddleware
{
    /**
     * Must run FIRST — generates request ID used by all subsequent middleware.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-Id')
            ?? (string) \Illuminate\Support\Str::uuid();

        $request->headers->set('X-Request-Id', $requestId);

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
```

**Key Points**:
- `priority()` defines global execution order — middleware runs in listed order
- Middleware not in priority list runs in assignment order
- Request ID middleware should be first — provides correlation ID for logging
- Authentication must run before authorization (auth before role check)
- Terminable middleware terminate() runs in REVERSE order

---

## Best Practices

- **Keep middleware stateless** — use `final readonly` class, no mutable properties
- **Single responsibility** — one middleware per concern (auth, logging, CORS, throttle)
- **Use bootstrap/app.php** — Laravel 11 middleware registration, not Kernel.php
- **Alias frequently used middleware** — `$middleware->alias(['role' => ...])` for clean route definitions
- **Terminate for async work** — use `terminate()` for post-response logging, analytics, cleanup
- **Parameterize with variadic** — `string ...$roles` instead of parsing comma-separated strings
- **Test middleware in isolation** — unit test handle() with mock Request/Response
- **Order matters** — request ID before auth, auth before authorization, throttle before heavy processing
- **Global middleware is expensive** — only add truly cross-cutting concerns (security headers, request ID)

---

## Abnormal Case Patterns

1. **Business logic in middleware** — middleware that queries database, processes orders, sends emails. Fix: middleware should only filter/transform requests; delegate business logic to controllers/services.

2. **Stateful middleware with mutable properties** — storing request data in class properties causes cross-request contamination in Octane. Fix: use `$request->attributes` for request-scoped data.

3. **Missing terminate() registration** — terminable middleware added to route but not registered as singleton. Fix: Laravel auto-resolves terminable middleware, but ensure DI container provides same instance in handle() and terminate().

4. **Over-throttling** — applying global rate limit without per-user differentiation. Fix: use `->by($request->user()?->id ?: $request->ip())` for user-aware throttling.

5. **CORS misconfiguration** — `allowed_origins: ['*']` with `supports_credentials: true` is invalid per CORS spec. Fix: list specific origins when credentials are enabled.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (309.1–309.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Middleware Specialist — API | EPS v3.2*
