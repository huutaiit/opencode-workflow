# Laravel Middleware Pipeline Specialist — Cross-Cutting
# Laravelミドルウェアパイプラインスペシャリスト — 横断的関心事
# Chuyen Gia Middleware Pipeline Laravel — Cat Ngang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Middleware Pipeline
**Aspect**: Middleware Pipeline
**Category**: cross-cutting
**Purpose**: Knowledge provider for Laravel middleware architecture — pipeline design pattern, middleware chaining, conditional middleware, middleware groups, terminable middleware, and middleware testing

---

## Metadata

```json
{
  "id": "laravel-middleware-pipeline-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Middleware Pipeline",
  "aspect": "Middleware Pipeline",
  "category": "cross-cutting",
  "subcategory": "php-laravel",
  "lines": 430,
  "token_cost": 2900,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 middleware configuration — bootstrap/app.php withMiddleware()",
    "E2: Pipeline design pattern — Illuminate\\Pipeline\\Pipeline",
    "E3: Terminable middleware — post-response processing for cleanup/logging"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 329.1–329.6 |
| **Directory Pattern** | `app/Http/Middleware/` |
| **Naming Convention** | `{Concern}Middleware.php` |
| **Imports From** | Application (services), Infrastructure (auth, cache) |
| **Imported By** | Presentation (routes, controllers via middleware assignment) |
| **Cannot Import** | Domain (middleware is infrastructure, not business logic) |
| **Dependencies** | `illuminate/routing`, `illuminate/pipeline` |
| **When To Use** | Cross-cutting request/response concerns — auth, rate limiting, CORS, logging |
| **Source Skeleton** | `app/Http/Middleware/{Concern}Middleware.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel middleware pipeline — request filtering, response transformation, conditional application, group management |
| **Activation Trigger** | files: `app/Http/Middleware/*.php`, `bootstrap/app.php`; keywords: middleware, pipeline, handle, $next |

---

## Role

You are a **Laravel Middleware Pipeline Specialist**. Your responsibility is to provide best practices for Laravel 11 middleware architecture — the pipeline design pattern, middleware chaining, conditional middleware, middleware groups configured in bootstrap/app.php, terminable middleware, and middleware testing strategies.

**Used by**: Any code agent working with Laravel HTTP request/response pipeline
**Not used by**: Non-Laravel stacks, CLI-only applications without HTTP layer

---

## Patterns

### Pattern 329.1: Pipeline Design Pattern

**Category**: Architecture
**Description**: Understanding Laravel's pipeline pattern — how requests flow through middleware layers.

```php
<?php

declare(strict_types=1);

// Laravel's Pipeline used outside HTTP context
namespace App\Services;

use Illuminate\Pipeline\Pipeline;

final class OrderProcessingPipeline
{
    /**
     * @param array<int, class-string> $pipes
     */
    public function __construct(
        private readonly Pipeline $pipeline,
        private readonly array $pipes = [
            \App\Pipes\ValidateOrderPipe::class,
            \App\Pipes\CalculateTaxPipe::class,
            \App\Pipes\ApplyDiscountPipe::class,
            \App\Pipes\ReserveInventoryPipe::class,
        ],
    ) {}

    public function process(object $order): object
    {
        return $this->pipeline
            ->send($order)
            ->through($this->pipes)
            ->thenReturn();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Pipes;

use Closure;

final class ValidateOrderPipe
{
    public function handle(object $order, Closure $next): mixed
    {
        if ($order->items->isEmpty()) {
            throw new \DomainException('Order must have at least one item');
        }

        return $next($order);
    }
}
```

**Key Points**:
- Pipeline sends a "passable" through a series of "pipes" (classes with `handle()`)
- Each pipe calls `$next($passable)` to pass to the next pipe or returns early to abort
- `thenReturn()` returns the final result; `then(fn ($result) => ...)` for post-processing
- Pipeline pattern is not limited to HTTP — use for any sequential processing chain

---

### Pattern 329.2: Middleware Chaining

**Category**: HTTP Middleware
**Description**: Custom middleware with before/after logic and response manipulation.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ForceJsonResponseMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // BEFORE: modify request
        $request->headers->set('Accept', 'application/json');

        /** @var Response $response */
        $response = $next($request);

        // AFTER: modify response
        $response->headers->set('Content-Type', 'application/json');

        return $response;
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

final class RequestTimingMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $duration = round((microtime(true) - $startTime) * 1000, 2);
        $response->headers->set('X-Response-Time', "{$duration}ms");

        return $response;
    }
}
```

**Key Points**:
- Code before `$next()` executes during request phase (top-down)
- Code after `$next()` executes during response phase (bottom-up)
- Type-hint `Response` from Symfony for proper IDE support
- Middleware should be stateless — no instance properties between requests

---

### Pattern 329.3: Conditional Middleware

**Category**: Dynamic Application
**Description**: Middleware with parameters and conditional execution logic.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CheckRoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole(...$roles)) {
            abort(403, 'Insufficient permissions');
        }

        return $next($request);
    }
}
```

```php
<?php

declare(strict_types=1);

// Route usage with middleware parameters
use Illuminate\Support\Facades\Route;

Route::middleware('role:admin,manager')->group(function (): void {
    Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
});

// Conditional middleware via controller
namespace App\Http\Controllers;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

final class ReportController implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('auth'),
            new Middleware('role:analyst', only: ['generate', 'export']),
            new Middleware('throttle:60,1', except: ['index']),
        ];
    }
}
```

**Key Points**:
- Middleware parameters passed as variadic arguments after `$next`
- Route syntax: `'middleware_alias:param1,param2'`
- Laravel 11 controller middleware via `HasMiddleware` interface — no constructor middleware
- Use `only` and `except` to scope middleware to specific controller methods

---

### Pattern 329.4: Middleware Groups (L11 bootstrap/app.php)

**Category**: Configuration
**Description**: Laravel 11 middleware group configuration in bootstrap/app.php.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php — Laravel 11 middleware configuration
use App\Http\Middleware\CheckRoleMiddleware;
use App\Http\Middleware\ForceJsonResponseMiddleware;
use App\Http\Middleware\RequestTimingMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        // Global middleware — runs on every request
        $middleware->use([
            \Illuminate\Http\Middleware\TrustProxies::class,
            RequestTimingMiddleware::class,
        ]);

        // Prepend/append to existing groups
        $middleware->api(prepend: [
            ForceJsonResponseMiddleware::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\TrackPageViewMiddleware::class,
        ]);

        // Middleware aliases for route-level usage
        $middleware->alias([
            'role' => CheckRoleMiddleware::class,
            'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        ]);

        // Middleware priority — execution order override
        $middleware->priority([
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\Auth\Middleware\Authenticate::class,
            CheckRoleMiddleware::class,
        ]);

        // Skip middleware for specific paths
        $middleware->trustProxies(at: '*');

        $middleware->redirectGuestsTo('/login');
        $middleware->redirectUsersTo('/dashboard');
    })
    ->create();
```

**Key Points**:
- Laravel 11 replaces `Kernel.php` with `bootstrap/app.php` middleware configuration
- `$middleware->use()` for global middleware; `->api()`, `->web()` for group modification
- `->alias()` registers middleware for route-level `middleware('alias')` usage
- `->priority()` controls execution order regardless of registration order

---

### Pattern 329.5: Terminable Middleware Pipeline

**Category**: Post-Response
**Description**: Middleware that executes after the response has been sent to the client.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Contracts\Foundation\MaintenanceMode;
use Symfony\Component\HttpFoundation\Response;

final class RequestLoggerMiddleware
{
    public function __construct(
        private readonly \App\Services\RequestLogService $logService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Store start time for terminate() access
        $request->attributes->set('_request_start', microtime(true));

        return $next($request);
    }

    /**
     * Called after response is sent to the client.
     * Does not block user response.
     */
    public function terminate(Request $request, Response $response): void
    {
        $startTime = $request->attributes->get('_request_start', microtime(true));
        $duration = (microtime(true) - $startTime) * 1000;

        $this->logService->log(
            method: $request->method(),
            uri: $request->getRequestUri(),
            statusCode: $response->getStatusCode(),
            durationMs: $duration,
            userId: $request->user()?->id,
            ip: $request->ip(),
        );
    }
}
```

**Key Points**:
- `terminate()` method runs after response is sent — does not block client
- Share data between `handle()` and `terminate()` via `$request->attributes`
- Useful for logging, analytics, cleanup, external API calls
- Terminable middleware must be registered as singleton to share instance state

---

### Pattern 329.6: Middleware Testing

**Category**: Testing
**Description**: Testing middleware in isolation and within the HTTP pipeline.

```php
<?php

declare(strict_types=1);

namespace Tests\Unit\Middleware;

use App\Http\Middleware\CheckRoleMiddleware;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tests\TestCase;

final class CheckRoleMiddlewareTest extends TestCase
{
    public function test_allows_user_with_matching_role(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn () => $user);

        $middleware = new CheckRoleMiddleware();
        $response = $middleware->handle(
            request: $request,
            next: fn () => new Response('OK', 200),
            roles: 'admin',
        );

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_rejects_user_without_role(): void
    {
        $user = User::factory()->create();

        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn () => $user);

        $middleware = new CheckRoleMiddleware();

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        $middleware->handle(
            request: $request,
            next: fn () => new Response('OK', 200),
            roles: 'admin',
        );
    }

    public function test_rejects_unauthenticated_request(): void
    {
        $request = Request::create('/admin/dashboard', 'GET');
        $request->setUserResolver(fn () => null);

        $middleware = new CheckRoleMiddleware();

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        $middleware->handle(
            request: $request,
            next: fn () => new Response('OK', 200),
            roles: 'admin',
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace Tests\Feature\Middleware;

use App\Models\User;
use Tests\TestCase;

final class MiddlewareIntegrationTest extends TestCase
{
    public function test_api_routes_return_json_content_type(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/profile');

        $response->assertHeader('Content-Type', 'application/json');
    }

    public function test_response_includes_timing_header(): void
    {
        $response = $this->get('/');

        $response->assertHeader('X-Response-Time');
    }

    public function test_admin_route_requires_role(): void
    {
        $user = User::factory()->create(); // No admin role

        $this->actingAs($user)
            ->get('/admin/dashboard')
            ->assertForbidden();
    }
}
```

**Key Points**:
- Unit test middleware by instantiating directly with mock request and `$next` closure
- Integration test via `$this->get()` / `$this->getJson()` to verify full pipeline
- Use `setUserResolver()` to simulate authenticated/unauthenticated users in unit tests
- Test both allow and deny paths — middleware is a security boundary

---

## Best Practices

- **Keep middleware thin** — delegate logic to services, middleware only orchestrates
- **Stateless middleware** — no instance state between requests (except terminable singletons)
- **Name by concern** — `EnsureEmailVerified`, not `CheckUser`
- **Use groups** — group related middleware (auth, session, CSRF) for consistent application
- **Order matters** — authentication before authorization, CORS before anything else
- **Avoid database queries in global middleware** — runs on every request, including static assets
- **Test both unit and integration** — unit for logic, integration for pipeline wiring
- **Use middleware parameters** — avoid multiple similar middleware classes

---

## Abnormal Case Patterns

1. **Middleware runs twice** — middleware registered both globally and on route group. Fix: check `bootstrap/app.php` global list and route group assignments for duplicates.

2. **Terminable middleware loses state** — `terminate()` has different instance than `handle()`. Fix: register middleware as singleton in service provider.

3. **Middleware parameter parsing fails** — commas in parameter values split incorrectly. Fix: use URL encoding or pass complex data via config/header instead.

4. **Priority not respected** — middleware runs in unexpected order despite priority config. Fix: verify middleware is in `priority()` array; priority only affects same-group middleware.

5. **Global middleware blocks health checks** — auth middleware on all routes prevents unauthenticated health probes. Fix: use `$middleware->except()` or exclude paths from auth middleware.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (329.1–329.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Middleware Pipeline Specialist — Cross-Cutting | EPS v3.2*
