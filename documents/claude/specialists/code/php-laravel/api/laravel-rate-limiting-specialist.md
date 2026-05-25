# Laravel Rate Limiting Specialist — API
# Laravelレート制限スペシャリスト — API
# Chuyen Gia Rate Limiting Laravel — API

**Version**: 1.0.0
**Technology**: Laravel 11+ Rate Limiting
**Aspect**: Rate Limiting
**Category**: api
**Purpose**: Knowledge provider for Laravel 11+ rate limiting architecture — rate limiter configuration in AppServiceProvider, per-user and per-IP throttling, API rate limiting, dynamic rate limits based on subscription tier, and rate limit response headers

---

## Metadata

```json
{
  "id": "laravel-rate-limiting-specialist",
  "technology": "Laravel 11+ Rate Limiting",
  "aspect": "Rate Limiting",
  "category": "api",
  "subcategory": "php-laravel",
  "lines": 380,
  "token_cost": 2500,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 rate limiting — RateLimiter::for() in AppServiceProvider, ThrottleRequests middleware",
    "E2: Cache-based rate limiting — uses configured cache driver for counter storage",
    "E3: Rate limit headers — X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 312.1–312.5 |
| **Directory Pattern** | `app/Providers/`, `routes/` |
| **Naming Convention** | Rate limiters defined as named closures in `AppServiceProvider` |
| **Imports From** | Domain (user model for tier-based limiting) |
| **Imported By** | Routes (via `throttle:` middleware), Controllers (via HasMiddleware) |
| **Cannot Import** | N/A |
| **Dependencies** | `laravel/framework` |
| **When To Use** | Every API endpoint to prevent abuse, protect resources, enforce fair usage |
| **Source Skeleton** | `app/Providers/AppServiceProvider.php` (boot method) |
| **Specialist Type** | code |
| **Purpose** | Rate limiting configuration, per-user throttling, dynamic limits, response headers |
| **Activation Trigger** | files: `app/Providers/AppServiceProvider.php`; keywords: RateLimiter, throttle, rate limit, Limit::perMinute |

---

## Role

You are a **Laravel Rate Limiting Specialist**. Your responsibility is to provide best practices for Laravel 11+ rate limiting — configuring rate limiters in AppServiceProvider (replacing RouteServiceProvider), implementing per-user and per-IP throttling, building dynamic rate limits based on subscription tiers, managing API throttling strategies, and properly exposing rate limit headers to API consumers.

**Used by**: Any code agent implementing API rate limiting and throttling in Laravel
**Not used by**: Non-Laravel stacks, CLI-only applications without HTTP layer

---

## Patterns

### Pattern 312.1: Rate Limiter Configuration

**Category**: Rate Limiter Setup
**Description**: Define named rate limiters in AppServiceProvider using the RateLimiter facade — Laravel 11 convention.

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
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        // Default API rate limiter
        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers): \Illuminate\Http\JsonResponse {
                    return response()->json(
                        data: [
                            'message' => 'Too many requests. Please try again later.',
                            'retry_after' => $headers['Retry-After'] ?? null,
                        ],
                        status: 429,
                        headers: $headers,
                    );
                });
        });

        // Strict limiter for authentication endpoints
        RateLimiter::for('auth', function (Request $request): array {
            return [
                Limit::perMinute(5)->by('auth-min:' . $request->ip()),
                Limit::perHour(30)->by('auth-hour:' . $request->ip()),
                Limit::perDay(100)->by('auth-day:' . $request->ip()),
            ];
        });

        // Upload limiter — by size and count
        RateLimiter::for('uploads', function (Request $request): Limit {
            return Limit::perMinute(10)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Webhook receiver — per source IP
        RateLimiter::for('webhooks', function (Request $request): Limit {
            return Limit::perMinute(120)
                ->by('webhook:' . $request->ip());
        });
    }
}
```

```php
// routes/api.php — applying rate limiters
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:api')->group(function (): void {
    Route::apiResource('products', ProductController::class);
    Route::apiResource('orders', OrderController::class);
});

Route::middleware('throttle:auth')->group(function (): void {
    Route::post('/login', LoginController::class);
    Route::post('/register', RegisterController::class);
    Route::post('/forgot-password', ForgotPasswordController::class);
});

Route::middleware('throttle:uploads')->group(function (): void {
    Route::post('/uploads', UploadController::class);
});
```

**Key Points**:
- Rate limiters defined in `AppServiceProvider::boot()` — Laravel 11 has no RouteServiceProvider
- `->by()` sets the rate limit key — unique per user/IP/endpoint
- `->response()` customizes the 429 Too Many Requests response
- Return array of `Limit` objects for multi-tier limits (per-minute AND per-hour)
- Apply via `throttle:{limiter-name}` middleware alias

---

### Pattern 312.2: Per-User Rate Limiting

**Category**: User-Aware Throttling
**Description**: Rate limits that adapt based on authenticated user identity, role, or subscription plan.

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Enums\SubscriptionTier;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Per-user rate limiting with role awareness
        RateLimiter::for('api', function (Request $request): Limit {
            $user = $request->user();

            if ($user === null) {
                // Unauthenticated: strict limit by IP
                return Limit::perMinute(10)
                    ->by('guest:' . $request->ip());
            }

            // Authenticated: rate by user ID, limit by role
            return match (true) {
                $user->hasRole('admin') => Limit::none(),
                $user->hasRole('service-account') => Limit::perMinute(1000)
                    ->by('svc:' . $user->id),
                default => Limit::perMinute(60)
                    ->by('user:' . $user->id),
            };
        });

        // Per-user with subscription tier
        RateLimiter::for('tiered-api', function (Request $request): Limit|array {
            $user = $request->user();
            $tier = $user?->subscription_tier ?? SubscriptionTier::FREE;

            return match ($tier) {
                SubscriptionTier::ENTERPRISE => Limit::none(),
                SubscriptionTier::PRO => [
                    Limit::perMinute(300)->by('pro-min:' . $user->id),
                    Limit::perDay(50_000)->by('pro-day:' . $user->id),
                ],
                SubscriptionTier::BASIC => [
                    Limit::perMinute(60)->by('basic-min:' . $user->id),
                    Limit::perDay(10_000)->by('basic-day:' . $user->id),
                ],
                SubscriptionTier::FREE => [
                    Limit::perMinute(10)->by('free-min:' . ($user?->id ?? $request->ip())),
                    Limit::perDay(500)->by('free-day:' . ($user?->id ?? $request->ip())),
                ],
            };
        });
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Enums;

enum SubscriptionTier: string
{
    case FREE = 'free';
    case BASIC = 'basic';
    case PRO = 'pro';
    case ENTERPRISE = 'enterprise';

    public function rateLimit(): int
    {
        return match ($this) {
            self::FREE => 10,
            self::BASIC => 60,
            self::PRO => 300,
            self::ENTERPRISE => 0, // unlimited
        };
    }
}
```

**Key Points**:
- Always differentiate authenticated vs guest rate limits
- Use unique `->by()` keys to avoid collisions between tiers
- `Limit::none()` disables rate limiting for admin/enterprise users
- Multi-tier: combine per-minute AND per-day limits
- Use PHP enums for subscription tiers with `rateLimit()` method
- Service accounts get higher limits than regular users

---

### Pattern 312.3: API Throttling Strategies

**Category**: Endpoint-Level Throttling
**Description**: Apply different throttling strategies per endpoint group — read vs write, public vs private.

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
        // Read-heavy endpoints — generous limits
        RateLimiter::for('api-read', function (Request $request): Limit {
            return Limit::perMinute(120)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Write endpoints — stricter limits
        RateLimiter::for('api-write', function (Request $request): Limit {
            return Limit::perMinute(30)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Expensive operations (reports, exports)
        RateLimiter::for('api-expensive', function (Request $request): Limit {
            return Limit::perMinute(5)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Per-endpoint rate limiting
        RateLimiter::for('api-endpoint', function (Request $request): Limit {
            $key = sprintf(
                '%s:%s:%s',
                $request->method(),
                $request->path(),
                $request->user()?->id ?: $request->ip(),
            );

            return Limit::perMinute(30)->by($key);
        });

        // Search endpoint — prevent abuse
        RateLimiter::for('search', function (Request $request): array {
            $userId = $request->user()?->id ?: $request->ip();

            return [
                Limit::perMinute(20)->by('search-min:' . $userId),
                Limit::perHour(200)->by('search-hour:' . $userId),
            ];
        });
    }
}
```

```php
// routes/api.php — apply per-group
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function (): void {
    // Read endpoints — generous throttling
    Route::middleware('throttle:api-read')->group(function (): void {
        Route::get('/products', [ProductController::class, 'index']);
        Route::get('/products/{product}', [ProductController::class, 'show']);
        Route::get('/categories', [CategoryController::class, 'index']);
    });

    // Write endpoints — stricter throttling
    Route::middleware('throttle:api-write')->group(function (): void {
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    });

    // Expensive endpoints
    Route::middleware('throttle:api-expensive')->group(function (): void {
        Route::post('/reports/generate', GenerateReportController::class);
        Route::post('/exports/orders', ExportOrdersController::class);
    });

    // Search with dedicated limiter
    Route::middleware('throttle:search')->group(function (): void {
        Route::get('/search', SearchController::class);
    });
});
```

**Key Points**:
- Separate read vs write limits — reads are cheaper, allow more
- Expensive operations (reports, exports) need strict per-user limits
- Per-endpoint rate limiting includes method + path in the key
- Stack multiple limiters on the same route for layered protection
- Search endpoints are abuse targets — dedicated limiter with hourly cap

---

### Pattern 312.4: Dynamic Rate Limits

**Category**: Runtime Configuration
**Description**: Rate limits that change based on runtime conditions — feature flags, config, database values.

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
        // Config-driven rate limits
        RateLimiter::for('api', function (Request $request): Limit {
            $defaultLimit = (int) config('rate-limiting.api.per_minute', 60);

            return Limit::perMinute($defaultLimit)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Database-driven rate limits (cached)
        RateLimiter::for('tenant-api', function (Request $request): Limit {
            $user = $request->user();
            if ($user === null) {
                return Limit::perMinute(10)->by($request->ip());
            }

            // Cache tenant rate limit for 5 minutes
            $tenantLimit = cache()->remember(
                key: "rate_limit:tenant:{$user->tenant_id}",
                ttl: 300,
                callback: fn () => $user->tenant->api_rate_limit ?? 60,
            );

            return Limit::perMinute($tenantLimit)
                ->by("tenant:{$user->tenant_id}:user:{$user->id}");
        });

        // Time-of-day rate limiting — reduced during peak hours
        RateLimiter::for('time-aware', function (Request $request): Limit {
            $hour = (int) now()->format('H');
            $isPeakHours = $hour >= 9 && $hour <= 17;

            $limit = $isPeakHours ? 30 : 120;

            return Limit::perMinute($limit)
                ->by($request->user()?->id ?: $request->ip());
        });
    }
}
```

```php
// config/rate-limiting.php
return [
    'api' => [
        'per_minute' => (int) env('API_RATE_LIMIT_PER_MINUTE', 60),
    ],
    'auth' => [
        'per_minute' => (int) env('AUTH_RATE_LIMIT_PER_MINUTE', 5),
        'per_hour' => (int) env('AUTH_RATE_LIMIT_PER_HOUR', 30),
    ],
    'uploads' => [
        'per_minute' => (int) env('UPLOAD_RATE_LIMIT_PER_MINUTE', 10),
    ],
];
```

**Key Points**:
- Use `config()` for environment-aware rate limits (different per deploy)
- Cache database-driven limits to avoid per-request queries
- Time-of-day limits reduce load during peak business hours
- Tenant-based limits enable per-customer SLA enforcement
- `.env` variables for easy deployment-specific configuration
- Always provide sensible defaults when config values are missing

---

### Pattern 312.5: Rate Limit Headers

**Category**: Client Communication
**Description**: Expose rate limit information via response headers for API client consumption and retry logic.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

final readonly class RateLimitHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $limiterKey = $this->resolveKey($request);

        if ($limiterKey !== null) {
            $maxAttempts = 60; // From limiter config
            $remainingAttempts = RateLimiter::remaining($limiterKey, $maxAttempts);
            $retryAfter = RateLimiter::availableIn($limiterKey);

            $response->headers->set('X-RateLimit-Limit', (string) $maxAttempts);
            $response->headers->set('X-RateLimit-Remaining', (string) max(0, $remainingAttempts));
            $response->headers->set('X-RateLimit-Reset', (string) (time() + $retryAfter));
        }

        return $response;
    }

    private function resolveKey(Request $request): ?string
    {
        $userId = $request->user()?->id;

        return $userId !== null
            ? "user:{$userId}"
            : "guest:{$request->ip()}";
    }
}
```

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
        // Custom 429 response with headers
        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers): \Illuminate\Http\JsonResponse {
                    return response()->json(
                        data: [
                            'message' => 'Rate limit exceeded.',
                            'error' => [
                                'code' => 'RATE_LIMIT_EXCEEDED',
                                'retry_after_seconds' => (int) ($headers['Retry-After'] ?? 60),
                                'limit' => (int) ($headers['X-RateLimit-Limit'] ?? 60),
                            ],
                        ],
                        status: 429,
                        headers: $headers,
                    );
                });
        });
    }
}
```

```php
// Testing rate limit behavior
<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function api_returns_rate_limit_headers(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/products');

        $response->assertOk()
            ->assertHeader('X-RateLimit-Limit')
            ->assertHeader('X-RateLimit-Remaining');
    }

    #[Test]
    public function api_returns_429_when_rate_limited(): void
    {
        $user = User::factory()->create();

        // Exhaust rate limit
        for ($i = 0; $i < 61; $i++) {
            $response = $this->actingAs($user, 'sanctum')
                ->getJson('/api/v1/products');
        }

        $response->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMIT_EXCEEDED')
            ->assertHeader('Retry-After');
    }

    #[Test]
    public function auth_endpoint_has_strict_rate_limit(): void
    {
        // 5 per minute for auth endpoints
        for ($i = 0; $i < 6; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'test@example.com',
                'password' => 'wrong-password',
            ]);
        }

        $response->assertStatus(429);
    }
}
```

**Key Points**:
- Standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- `Retry-After` header automatically included by Laravel on 429 responses
- `->response()` callback customizes the 429 response body
- Include machine-readable error codes (`RATE_LIMIT_EXCEEDED`) for client automation
- `X-RateLimit-Reset` is Unix timestamp when the rate limit window resets
- Test rate limiting by exhausting the limit and asserting 429

---

## Best Practices

- **Always rate limit API endpoints** — even internal APIs to prevent accidental abuse
- **Use named rate limiters** — define in `AppServiceProvider::boot()` for centralized management
- **Differentiate by user type** — guest vs authenticated vs admin vs service account
- **Multi-tier limits** — combine per-minute AND per-hour AND per-day limits
- **Include rate limit headers** — API consumers need `X-RateLimit-Remaining` for retry logic
- **Cache-backed counters** — use Redis for rate limiting in multi-server deployments
- **Config-driven limits** — use `.env` variables for easy per-environment tuning
- **Strict auth limits** — login/register/password-reset need aggressive rate limiting (5/min)
- **Custom 429 response** — include `retry_after_seconds` and machine-readable error codes
- **Test rate limits** — verify 429 responses and header presence in feature tests

---

## Abnormal Case Patterns

1. **No rate limiting on auth endpoints** — login endpoint without throttling enables brute force attacks. Fix: apply `throttle:auth` with 5/minute limit on all auth routes.

2. **Same limit for all users** — free and enterprise users have identical rate limits. Fix: use `match` on subscription tier with `Limit::none()` for enterprise.

3. **Missing rate limit headers** — API consumers cannot implement retry logic without knowing remaining quota. Fix: add `RateLimitHeaders` middleware or use Laravel's built-in header support.

4. **File cache for rate limiting** — file-based cache causes race conditions in multi-server deployments. Fix: use Redis or Memcached as cache driver for rate limiting.

5. **Rate limit key collisions** — using bare `$request->ip()` without prefix causes different limiters to share counters. Fix: always prefix keys: `'auth:' . $request->ip()`, `'api:' . $request->ip()`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (312.1–312.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Rate Limiting Specialist — API | EPS v3.2*
