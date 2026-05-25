# Laravel Error Handling Specialist — Core
# Laravelエラーハンドリングスペシャリスト — コア
# Chuyen Gia Xu Ly Loi Laravel — Loi

**Version**: 1.0.0
**Technology**: Laravel 11+ Error Handling
**Aspect**: Error Handling
**Category**: core
**Purpose**: Knowledge provider for Laravel error handling — exception handler, custom exceptions, domain exception hierarchy, HTTP mapping, reportable/renderable exceptions, and API error responses

---

## Metadata

```json
{
  "id": "laravel-error-handling-specialist",
  "technology": "Laravel 11+ Error Handling",
  "aspect": "Error Handling",
  "category": "core",
  "subcategory": "php-laravel",
  "lines": 460,
  "token_cost": 3100,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 exception handling — bootstrap/app.php withExceptions()",
    "E2: Domain exception hierarchies — clean architecture error boundaries",
    "E3: API error response standards — RFC 7807 Problem Details"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application, Presentation |
| **Variant** | ALL |
| **Pattern Numbers** | 303.1–303.8 |
| **Directory Pattern** | `app/Exceptions/` |
| **Naming Convention** | `{Name}Exception.php` |
| **Imports From** | Domain (exception base classes), Application (use case errors) |
| **Imported By** | Presentation (controllers catch/render), Infrastructure (wraps external errors) |
| **Cannot Import** | Infrastructure (domain exceptions must not depend on external packages) |
| **Dependencies** | `illuminate/foundation`, `illuminate/http` |
| **When To Use** | Every Laravel project — error handling is mandatory |
| **Source Skeleton** | `app/Exceptions/{Domain}/{Name}Exception.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel exception handling — custom exceptions, HTTP mapping, structured error responses |
| **Activation Trigger** | files: `app/Exceptions/**/*.php`; keywords: exception, throw, report, render, abort |

---

## Role

You are a **Laravel Error Handling Specialist**. Your responsibility is to provide best practices for Laravel 11+ error handling — the exception handler, domain-specific exception hierarchies, HTTP status mapping, reportable/renderable exceptions, and structured API error responses.

**Used by**: Any code agent working with Laravel error handling and API responses
**Not used by**: Non-Laravel stacks, projects not handling exceptions

---

## Patterns

### Pattern 303.1: Exception Handler (Laravel 11)

**Category**: Handler Configuration
**Description**: Laravel 11 configures exception handling in bootstrap/app.php — no dedicated Handler class.

```php
<?php

declare(strict_types=1);

// bootstrap/app.php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withExceptions(function (Exceptions $exceptions): void {
        // Don't report these (expected business exceptions)
        $exceptions->dontReport([
            \App\Exceptions\BusinessRuleViolationException::class,
            \App\Exceptions\InsufficientFundsException::class,
        ]);

        // Custom rendering for API requests
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => 'resource_not_found',
                    'message' => 'The requested resource does not exist.',
                ], 404);
            }
        });

        // Custom reporting — send to external service
        $exceptions->report(function (\App\Exceptions\PaymentFailedException $e) {
            app(\App\Services\AlertService::class)->critical(
                channel: 'payments',
                message: "Payment failed: {$e->getMessage()}",
                context: ['order_id' => $e->orderId],
            );

            return false; // stop propagation to default logger
        });

        // Global context for all reported exceptions
        $exceptions->context(fn () => [
            'request_id' => request()?->header('X-Request-Id'),
            'user_id' => auth()->id(),
        ]);
    })
    ->create();
```

**Key Points**:
- Laravel 11 uses `withExceptions()` in `bootstrap/app.php` — no `app/Exceptions/Handler.php`
- `dontReport()` suppresses logging for expected business exceptions
- `render()` customizes HTTP response per exception type
- `report()` sends to external services; return `false` to stop default logging
- `context()` adds global metadata to all reported exceptions

---

### Pattern 303.2: Custom Domain Exceptions

**Category**: Exception Hierarchy
**Description**: Build a domain exception hierarchy that separates business errors from infrastructure errors.

```php
<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

use RuntimeException;

// Base domain exception — all business logic errors extend this
abstract class DomainException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode,
        public readonly array $context = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

// Specific domain exceptions
final class OrderNotFoundException extends DomainException
{
    public function __construct(public readonly int $orderId)
    {
        parent::__construct(
            message: "Order #{$orderId} not found",
            errorCode: 'ORDER_NOT_FOUND',
            context: ['order_id' => $orderId],
        );
    }
}

final class InsufficientStockException extends DomainException
{
    public function __construct(
        public readonly string $sku,
        public readonly int $requested,
        public readonly int $available,
    ) {
        parent::__construct(
            message: "Insufficient stock for SKU {$sku}: requested {$requested}, available {$available}",
            errorCode: 'INSUFFICIENT_STOCK',
            context: ['sku' => $sku, 'requested' => $requested, 'available' => $available],
        );
    }
}

final class BusinessRuleViolationException extends DomainException
{
    public function __construct(string $rule, array $context = [])
    {
        parent::__construct(
            message: "Business rule violated: {$rule}",
            errorCode: 'BUSINESS_RULE_VIOLATION',
            context: $context,
        );
    }
}
```

**Key Points**:
- Abstract base `DomainException` carries error code and structured context
- Specific exceptions use `readonly` promoted properties for immutability
- Error codes are uppercase snake_case constants for API consumers
- Context array provides machine-readable details for debugging

---

### Pattern 303.3: Domain Exception Hierarchy

**Category**: Exception Hierarchy
**Description**: Layered exception taxonomy — domain, application, infrastructure.

```php
<?php

declare(strict_types=1);

// Domain layer exceptions — pure business logic errors
namespace App\Exceptions\Domain;

abstract class DomainException extends \RuntimeException { /* ... */ }
class EntityNotFoundException extends DomainException {}
class BusinessRuleViolationException extends DomainException {}
class InvalidStateTransitionException extends DomainException {}
class DomainConstraintException extends DomainException {}

// Application layer exceptions — use case orchestration errors
namespace App\Exceptions\Application;

abstract class ApplicationException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode,
        public readonly array $validationErrors = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

class UnauthorizedActionException extends ApplicationException {}
class ValidationFailedException extends ApplicationException {}
class ConcurrencyConflictException extends ApplicationException {}

// Infrastructure layer exceptions — external system failures
namespace App\Exceptions\Infrastructure;

abstract class InfrastructureException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $service,
        public readonly ?int $retryAfterSeconds = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}

class ExternalServiceUnavailableException extends InfrastructureException {}
class DatabaseConnectionException extends InfrastructureException {}
class CacheUnavailableException extends InfrastructureException {}
```

**Key Points**:
- Three exception families matching clean architecture layers
- Each base class carries layer-appropriate metadata
- Infrastructure exceptions include retry hints for resilience
- Never throw infrastructure exceptions from domain code

---

### Pattern 303.4: HTTP Exception Mapping

**Category**: API Integration
**Description**: Map domain/application exceptions to appropriate HTTP status codes.

```php
<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Exceptions\Application\ConcurrencyConflictException;
use App\Exceptions\Application\UnauthorizedActionException;
use App\Exceptions\Application\ValidationFailedException;
use App\Exceptions\Domain\BusinessRuleViolationException;
use App\Exceptions\Domain\EntityNotFoundException;
use App\Exceptions\Infrastructure\ExternalServiceUnavailableException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ExceptionMapping
{
    /** @var array<class-string, int> */
    private const STATUS_MAP = [
        EntityNotFoundException::class => 404,
        BusinessRuleViolationException::class => 422,
        ValidationFailedException::class => 422,
        UnauthorizedActionException::class => 403,
        ConcurrencyConflictException::class => 409,
        ExternalServiceUnavailableException::class => 503,
    ];

    public static function register(Exceptions $exceptions): void
    {
        foreach (self::STATUS_MAP as $exceptionClass => $statusCode) {
            $exceptions->render(function ($e, Request $request) use ($statusCode) {
                if ($request->expectsJson()) {
                    return self::toJsonResponse($e, $statusCode);
                }
            });
        }
    }

    private static function toJsonResponse(\Throwable $e, int $status): JsonResponse
    {
        $body = [
            'error' => match (true) {
                $e instanceof \App\Exceptions\Domain\DomainException => $e->errorCode,
                $e instanceof \App\Exceptions\Application\ApplicationException => $e->errorCode,
                default => 'internal_error',
            },
            'message' => $e->getMessage(),
        ];

        if ($e instanceof ValidationFailedException && $e->validationErrors) {
            $body['errors'] = $e->validationErrors;
        }

        if ($e instanceof ExternalServiceUnavailableException && $e->retryAfterSeconds) {
            $body['retry_after'] = $e->retryAfterSeconds;
        }

        return response()->json($body, $status);
    }
}
```

**Key Points**:
- Centralized status code mapping — single source of truth
- Domain exceptions map to client-error 4xx codes
- Infrastructure exceptions map to server-error 5xx codes
- Include structured error details (validation errors, retry hints) in response body
- Only return JSON for API requests (`expectsJson()`)

---

### Pattern 303.5: Reportable and Renderable Exceptions

**Category**: Self-Contained Exceptions
**Description**: Exceptions that define their own reporting and rendering behavior.

```php
<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PaymentFailedException extends Exception
{
    public function __construct(
        public readonly int $orderId,
        public readonly string $provider,
        public readonly string $providerError,
        ?\Throwable $previous = null,
    ) {
        parent::__construct(
            "Payment failed for order #{$orderId} via {$provider}: {$providerError}",
            previous: $previous,
        );
    }

    /**
     * Report the exception — custom logging/alerting.
     * Return false to prevent default logging.
     */
    public function report(): false
    {
        \Log::channel('payments')->error($this->getMessage(), [
            'order_id' => $this->orderId,
            'provider' => $this->provider,
            'provider_error' => $this->providerError,
        ]);

        // Alert ops team for repeated failures
        app(AlertService::class)->warn(
            channel: 'payments',
            message: "Payment failure: {$this->provider}",
        );

        return false; // don't double-log via default handler
    }

    /**
     * Render the exception into an HTTP response.
     */
    public function render(Request $request): JsonResponse|null
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error' => 'payment_failed',
                'message' => 'Payment could not be processed. Please try again.',
                'retry' => true,
            ], 402);
        }

        return null; // fall through to default rendering
    }
}
```

**Key Points**:
- `report()` method — custom logging, alerting, metrics; return `false` to stop propagation
- `render()` method — custom HTTP response; return `null` to use default rendering
- Self-contained exceptions reduce coupling to the central handler
- Never expose internal error details (provider error) in API responses

---

### Pattern 303.6: API Error Response Standards

**Category**: API Integration
**Description**: Structured JSON error responses following consistent format for all API endpoints.

```php
<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

final readonly class ApiErrorResponse
{
    /**
     * @param array<string, array<string>> $fieldErrors
     */
    public function __construct(
        private string $error,
        private string $message,
        private int $status,
        private array $fieldErrors = [],
        private ?string $traceId = null,
    ) {}

    public function toResponse(): JsonResponse
    {
        $body = [
            'error' => $this->error,
            'message' => $this->message,
        ];

        if ($this->fieldErrors !== []) {
            $body['errors'] = $this->fieldErrors;
        }

        if ($this->traceId !== null) {
            $body['trace_id'] = $this->traceId;
        }

        return response()->json(data: $body, status: $this->status);
    }

    public static function notFound(string $resource, string|int $id): self
    {
        return new self(
            error: 'resource_not_found',
            message: "{$resource} with ID {$id} not found.",
            status: 404,
            traceId: request()?->header('X-Request-Id'),
        );
    }

    public static function validation(array $errors): self
    {
        return new self(
            error: 'validation_failed',
            message: 'The given data was invalid.',
            status: 422,
            fieldErrors: $errors,
            traceId: request()?->header('X-Request-Id'),
        );
    }

    public static function unauthorized(string $reason = 'Unauthorized'): self
    {
        return new self(
            error: 'unauthorized',
            message: $reason,
            status: 403,
            traceId: request()?->header('X-Request-Id'),
        );
    }

    public static function serverError(string $traceId): self
    {
        return new self(
            error: 'internal_error',
            message: 'An unexpected error occurred. Please try again later.',
            status: 500,
            traceId: $traceId,
        );
    }
}
```

**Key Points**:
- Consistent JSON structure: `error` (code), `message` (human), `errors` (field-level)
- Include `trace_id` for support/debugging correlation
- Factory methods for common error types — prevents inconsistent formatting
- Never expose stack traces, SQL queries, or internal paths in production responses

---

### Pattern 303.7: Logging Exceptions

**Category**: Observability
**Description**: Structured exception logging with channels, context, and severity mapping.

```php
<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Exceptions\Domain\DomainException;
use App\Exceptions\Infrastructure\InfrastructureException;
use Illuminate\Foundation\Configuration\Exceptions;
use Psr\Log\LogLevel;

final class ExceptionLogger
{
    /** @var array<class-string, string> */
    private const SEVERITY_MAP = [
        DomainException::class => LogLevel::WARNING,
        InfrastructureException::class => LogLevel::ERROR,
        \App\Exceptions\Application\ApplicationException::class => LogLevel::NOTICE,
    ];

    /** @var array<class-string, string> */
    private const CHANNEL_MAP = [
        \App\Exceptions\PaymentFailedException::class => 'payments',
        InfrastructureException::class => 'infrastructure',
    ];

    public static function register(Exceptions $exceptions): void
    {
        $exceptions->report(function (\Throwable $e) {
            $severity = self::resolveSeverity($e);
            $channel = self::resolveChannel($e);

            $context = [
                'exception_class' => $e::class,
                'trace_id' => request()?->header('X-Request-Id'),
                'user_id' => auth()->id(),
            ];

            if ($e instanceof DomainException) {
                $context = array_merge($context, $e->context);
            }

            \Log::channel($channel)->log($severity, $e->getMessage(), $context);

            return false; // handled — don't double-log
        });
    }

    private static function resolveSeverity(\Throwable $e): string
    {
        foreach (self::SEVERITY_MAP as $class => $level) {
            if ($e instanceof $class) {
                return $level;
            }
        }
        return LogLevel::ERROR;
    }

    private static function resolveChannel(\Throwable $e): string
    {
        foreach (self::CHANNEL_MAP as $class => $channel) {
            if ($e instanceof $class) {
                return $channel;
            }
        }
        return 'stack';
    }
}
```

**Key Points**:
- Map exception types to log severity levels — domain = WARNING, infrastructure = ERROR
- Route exceptions to dedicated log channels for separation
- Include structured context (trace ID, user ID, domain context) for searchability
- Return `false` from report callbacks to prevent duplicate logging

---

### Pattern 303.8: Retry-After Exceptions

**Category**: Resilience
**Description**: Exceptions that communicate retry semantics for transient failures.

```php
<?php

declare(strict_types=1);

namespace App\Exceptions\Infrastructure;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RateLimitExceededException extends InfrastructureException
{
    public function __construct(
        string $service,
        public readonly int $retryAfter = 60,
    ) {
        parent::__construct(
            message: "Rate limit exceeded for {$service}",
            service: $service,
            retryAfterSeconds: $retryAfter,
        );
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(
            data: [
                'error' => 'rate_limit_exceeded',
                'message' => "Too many requests. Please retry after {$this->retryAfter} seconds.",
                'retry_after' => $this->retryAfter,
            ],
            status: 429,
            headers: ['Retry-After' => (string) $this->retryAfter],
        );
    }
}

final class ServiceUnavailableException extends InfrastructureException
{
    public function __construct(
        string $service,
        int $retryAfter = 30,
        ?\Throwable $previous = null,
    ) {
        parent::__construct(
            message: "Service {$service} is temporarily unavailable",
            service: $service,
            retryAfterSeconds: $retryAfter,
            previous: $previous,
        );
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(
            data: [
                'error' => 'service_unavailable',
                'message' => 'Service is temporarily unavailable. Please try again later.',
                'retry_after' => $this->retryAfterSeconds,
            ],
            status: 503,
            headers: ['Retry-After' => (string) $this->retryAfterSeconds],
        );
    }
}
```

**Key Points**:
- Include `Retry-After` HTTP header for standards-compliant retry signaling
- Provide `retry_after` in JSON body for API consumers
- Use for rate limits (429), circuit breaker opens (503), external service degradation
- Queue workers can use `retryAfterSeconds` to schedule delayed retry

---

## Best Practices

- **Layer-specific exceptions** — domain throws DomainException, infrastructure throws InfrastructureException
- **Never catch-all silently** — `catch (\Throwable)` must log or rethrow
- **Error codes as constants** — machine-readable codes enable API consumer automation
- **Structured context** — pass array context, not interpolated strings
- **Separate report from render** — logging and HTTP response are independent concerns
- **Don't expose internals** — stack traces, SQL, file paths never in production responses
- **Use `dontReport()` for expected exceptions** — business rule violations are not errors
- **Include trace IDs** — correlate errors across services with request/trace identifiers
- **Test exception rendering** — verify JSON structure and status codes in feature tests

---

## Abnormal Case Patterns

1. **Exception in exception handler** — render() throws another exception, causing 500. Fix: wrap render logic in try-catch with fallback response.

2. **Missing render for API** — domain exception renders HTML to API client. Fix: always check `$request->expectsJson()` before rendering.

3. **Over-reporting** — expected business exceptions flood error monitoring. Fix: add to `dontReport()` list or return `false` from report().

4. **Lost context** — re-throwing exception without chaining previous. Fix: always pass `$previous` parameter when wrapping exceptions.

5. **Inconsistent error format** — different endpoints return different JSON shapes. Fix: use `ApiErrorResponse` factory class for all error responses.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (303.1–303.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Error Handling Specialist — Core | EPS v3.2*
