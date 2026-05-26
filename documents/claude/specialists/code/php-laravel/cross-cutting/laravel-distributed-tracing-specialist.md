# Laravel Distributed Tracing Specialist — Cross-Cutting
# Laravel分散トレーシングスペシャリスト — 横断的関心事
# Chuyen Gia Tracing Phan Tan Laravel — Cat Ngang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x Distributed Tracing
**Aspect**: Distributed Tracing
**Category**: cross-cutting
**Purpose**: Knowledge provider for Laravel distributed tracing — OpenTelemetry integration, correlation IDs, span management, and trace context propagation across services

---

## Metadata

```json
{
  "id": "laravel-distributed-tracing-specialist",
  "technology": "PHP 8.3 + Laravel 11.x Distributed Tracing",
  "aspect": "Distributed Tracing",
  "category": "cross-cutting",
  "subcategory": "php-laravel",
  "lines": 400,
  "token_cost": 2700,
  "version": "1.0.0",
  "evidence": [
    "E1: OpenTelemetry PHP SDK — vendor-neutral tracing instrumentation",
    "E2: W3C Trace Context — standardized traceparent/tracestate header propagation",
    "E3: Correlation IDs — request-scoped identifiers for cross-service log correlation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 331.1–331.5 |
| **Directory Pattern** | `app/Tracing/`, `app/Http/Middleware/` |
| **Naming Convention** | `{Concern}Tracer.php`, `TraceContextMiddleware.php` |
| **Imports From** | Infrastructure (HTTP clients, queue, logging) |
| **Imported By** | ALL (tracing is passive instrumentation across layers) |
| **Cannot Import** | Domain (tracing must not depend on business logic) |
| **Dependencies** | `open-telemetry/sdk`, `open-telemetry/exporter-otlp` |
| **When To Use** | Microservice architectures, distributed systems requiring end-to-end request visibility |
| **Source Skeleton** | `app/Tracing/TracerFactory.php`, `config/tracing.php` |
| **Specialist Type** | code |
| **Purpose** | Laravel distributed tracing — OpenTelemetry setup, correlation IDs, spans, context propagation |
| **Activation Trigger** | files: `app/Tracing/*.php`, `config/tracing.php`; keywords: OpenTelemetry, trace, span, correlation_id, traceparent |

---

## Role

You are a **Laravel Distributed Tracing Specialist**. Your responsibility is to provide best practices for Laravel 11 distributed tracing — OpenTelemetry SDK integration, correlation ID generation and propagation, distributed tracing setup with exporters, span management for granular instrumentation, and trace context propagation across HTTP and queue boundaries.

**Used by**: Any code agent working with Laravel microservices, distributed systems, or observability infrastructure
**Not used by**: Non-Laravel stacks, monolithic applications without cross-service communication

---

## Patterns

### Pattern 331.1: OpenTelemetry Integration

**Category**: Setup
**Description**: Configuring OpenTelemetry PHP SDK with Laravel for distributed tracing.

```php
<?php

declare(strict_types=1);

// config/tracing.php
return [
    'enabled' => env('TRACING_ENABLED', false),

    'service_name' => env('TRACING_SERVICE_NAME', env('APP_NAME', 'laravel')),

    'exporter' => [
        'driver' => env('TRACING_EXPORTER', 'otlp'),
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
        'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
    ],

    'sampler' => [
        'type' => env('TRACING_SAMPLER', 'always_on'),
        'ratio' => (float) env('TRACING_SAMPLE_RATIO', 1.0),
    ],
];
```

```php
<?php

declare(strict_types=1);

namespace App\Tracing;

use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\API\Trace\TracerProviderInterface;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\SpanProcessor\SimpleSpanProcessor;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\TraceIdRatioBasedSampler;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SemConv\ResourceAttributes;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;

final class TracerFactory
{
    public static function create(): TracerProviderInterface
    {
        $config = config('tracing');

        $resource = ResourceInfoFactory::defaultResource()->merge(
            ResourceInfo::create(Attributes::create([
                ResourceAttributes::SERVICE_NAME => $config['service_name'],
                ResourceAttributes::SERVICE_VERSION => config('app.version', '1.0.0'),
                ResourceAttributes::DEPLOYMENT_ENVIRONMENT => app()->environment(),
            ])),
        );

        $transport = (new OtlpHttpTransportFactory())->create(
            endpoint: $config['exporter']['endpoint'] . '/v1/traces',
            contentType: 'application/x-protobuf',
        );

        $exporter = new SpanExporter($transport);

        $sampler = match ($config['sampler']['type']) {
            'ratio' => new TraceIdRatioBasedSampler($config['sampler']['ratio']),
            default => new AlwaysOnSampler(),
        };

        return TracerProvider::builder()
            ->addSpanProcessor(new SimpleSpanProcessor($exporter))
            ->setResource($resource)
            ->setSampler($sampler)
            ->build();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Providers;

use App\Tracing\TracerFactory;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\API\Trace\TracerProviderInterface;
use Illuminate\Support\ServiceProvider;

final class TracingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if (! config('tracing.enabled', false)) {
            return;
        }

        $this->app->singleton(
            abstract: TracerProviderInterface::class,
            concrete: fn () => TracerFactory::create(),
        );

        $this->app->singleton(
            abstract: TracerInterface::class,
            concrete: fn ($app) => $app->make(TracerProviderInterface::class)
                ->getTracer(config('tracing.service_name')),
        );
    }
}
```

**Key Points**:
- Use `open-telemetry/sdk` and `open-telemetry/exporter-otlp` packages
- Configure via environment variables following OpenTelemetry conventions
- Register `TracerProviderInterface` and `TracerInterface` as singletons
- Use `TraceIdRatioBasedSampler` in production to control trace volume

---

### Pattern 331.2: Correlation IDs

**Category**: Request Correlation
**Description**: Generating and propagating correlation IDs across request lifecycle and services.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class CorrelationIdMiddleware
{
    public const HEADER = 'X-Correlation-ID';

    public function handle(Request $request, Closure $next): Response
    {
        // Reuse incoming correlation ID or generate new
        $correlationId = $request->header(self::HEADER) ?? Str::uuid()->toString();

        // Store in request for downstream access
        $request->attributes->set('correlation_id', $correlationId);

        // Add to log context for all log entries in this request
        \Illuminate\Support\Facades\Log::shareContext([
            'correlation_id' => $correlationId,
        ]);

        /** @var Response $response */
        $response = $next($request);

        // Include in response for client-side correlation
        $response->headers->set(self::HEADER, $correlationId);

        return $response;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

final class ExternalApiClient
{
    public function makeRequest(string $url, array $data = []): mixed
    {
        $correlationId = request()->attributes->get('correlation_id', '');

        return Http::withHeaders([
            'X-Correlation-ID' => $correlationId,
        ])
        ->timeout(30)
        ->post($url, $data)
        ->json();
    }
}
```

**Key Points**:
- Accept incoming `X-Correlation-ID` from upstream or generate a new UUID
- Use `Log::shareContext()` (Laravel 11) to attach correlation ID to all log entries
- Forward correlation ID to downstream services via HTTP headers
- Return correlation ID in response header for client-side debugging

---

### Pattern 331.3: Distributed Tracing Setup

**Category**: Infrastructure
**Description**: End-to-end tracing setup with HTTP middleware and queue integration.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\StatusCode;
use OpenTelemetry\API\Trace\TracerInterface;
use Symfony\Component\HttpFoundation\Response;

final class TraceRequestMiddleware
{
    public function __construct(
        private readonly TracerInterface $tracer,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $span = $this->tracer->spanBuilder(
            name: "{$request->method()} {$request->path()}",
        )
        ->setSpanKind(SpanKind::KIND_SERVER)
        ->setAttribute('http.method', $request->method())
        ->setAttribute('http.url', $request->fullUrl())
        ->setAttribute('http.route', $request->route()?->uri() ?? $request->path())
        ->setAttribute('http.user_agent', $request->userAgent() ?? '')
        ->setAttribute('net.host.name', $request->getHost())
        ->startSpan();

        $scope = $span->activate();

        try {
            /** @var Response $response */
            $response = $next($request);

            $span->setAttribute('http.status_code', $response->getStatusCode());

            if ($response->getStatusCode() >= 400) {
                $span->setStatus(StatusCode::STATUS_ERROR);
            }

            return $response;
        } catch (\Throwable $e) {
            $span->setStatus(StatusCode::STATUS_ERROR, $e->getMessage());
            $span->recordException($e);
            throw $e;
        } finally {
            $scope->detach();
            $span->end();
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Tracing;

use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\TracerInterface;

final class QueueTracer
{
    public function __construct(
        private readonly TracerInterface $tracer,
    ) {}

    /**
     * Wrap job execution in a trace span.
     */
    public function traceJob(string $jobName, callable $callback): mixed
    {
        $span = $this->tracer->spanBuilder($jobName)
            ->setSpanKind(SpanKind::KIND_CONSUMER)
            ->setAttribute('messaging.system', 'laravel-queue')
            ->setAttribute('messaging.operation', 'process')
            ->startSpan();

        $scope = $span->activate();

        try {
            $result = $callback();
            return $result;
        } catch (\Throwable $e) {
            $span->recordException($e);
            throw $e;
        } finally {
            $scope->detach();
            $span->end();
        }
    }
}
```

**Key Points**:
- Create SERVER spans for incoming HTTP requests with OpenTelemetry semantic conventions
- Always `detach()` scope and `end()` span in `finally` to prevent leaks
- Set `http.status_code` and error status for failed requests
- Use CONSUMER span kind for queue job tracing

---

### Pattern 331.4: Span Management

**Category**: Instrumentation
**Description**: Creating and managing child spans for granular operation tracing.

```php
<?php

declare(strict_types=1);

namespace App\Tracing;

use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\StatusCode;
use OpenTelemetry\API\Trace\TracerInterface;

final class SpanManager
{
    public function __construct(
        private readonly TracerInterface $tracer,
    ) {}

    /**
     * Create a span around a callable, automatically handling lifecycle.
     *
     * @template T
     * @param callable(): T $callback
     * @return T
     */
    public function trace(
        string $name,
        callable $callback,
        SpanKind $kind = SpanKind::KIND_INTERNAL,
        array $attributes = [],
    ): mixed {
        $spanBuilder = $this->tracer->spanBuilder($name)
            ->setSpanKind($kind);

        foreach ($attributes as $key => $value) {
            $spanBuilder->setAttribute($key, $value);
        }

        $span = $spanBuilder->startSpan();
        $scope = $span->activate();

        try {
            $result = $callback();
            return $result;
        } catch (\Throwable $e) {
            $span->setStatus(StatusCode::STATUS_ERROR, $e->getMessage());
            $span->recordException($e);
            throw $e;
        } finally {
            $scope->detach();
            $span->end();
        }
    }

    /**
     * Create a client span for outgoing HTTP calls.
     */
    public function traceHttpClient(
        string $method,
        string $url,
        callable $callback,
    ): mixed {
        return $this->trace(
            name: "HTTP {$method}",
            callback: $callback,
            kind: SpanKind::KIND_CLIENT,
            attributes: [
                'http.method' => $method,
                'http.url' => $url,
            ],
        );
    }

    /**
     * Create a span for database operations.
     */
    public function traceDatabase(
        string $operation,
        string $table,
        callable $callback,
    ): mixed {
        return $this->trace(
            name: "DB {$operation} {$table}",
            callback: $callback,
            kind: SpanKind::KIND_CLIENT,
            attributes: [
                'db.system' => 'mysql',
                'db.operation' => $operation,
                'db.sql.table' => $table,
            ],
        );
    }
}
```

```php
<?php

declare(strict_types=1);

// Usage in a service
namespace App\Services;

use App\Tracing\SpanManager;

final class OrderService
{
    public function __construct(
        private readonly SpanManager $spanManager,
    ) {}

    public function placeOrder(array $orderData): object
    {
        return $this->spanManager->trace(
            name: 'OrderService.placeOrder',
            callback: function () use ($orderData): object {
                // Nested span for validation
                $this->spanManager->trace(
                    name: 'OrderService.validate',
                    callback: fn () => $this->validate($orderData),
                );

                // Nested span for payment
                $result = $this->spanManager->traceHttpClient(
                    method: 'POST',
                    url: 'https://payment.example.com/charge',
                    callback: fn () => $this->processPayment($orderData),
                );

                // Nested span for persistence
                $this->spanManager->traceDatabase(
                    operation: 'INSERT',
                    table: 'orders',
                    callback: fn () => $this->saveOrder($orderData),
                );

                return $result;
            },
        );
    }
}
```

**Key Points**:
- `SpanManager` wraps OpenTelemetry span lifecycle in a clean callable API
- Child spans automatically nest under the active parent span via context
- Use semantic conventions for span attributes (`http.*`, `db.*`, `messaging.*`)
- Specialized methods (`traceHttpClient`, `traceDatabase`) enforce attribute consistency

---

### Pattern 331.5: Trace Context Propagation

**Category**: Cross-Service
**Description**: Propagating trace context across HTTP boundaries and queue messages.

```php
<?php

declare(strict_types=1);

namespace App\Tracing;

use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\Context\Context;

final class TraceContextManager
{
    /**
     * Extract trace context from incoming request headers.
     *
     * @param array<string, string> $headers
     */
    public static function extractFromHeaders(array $headers): Context
    {
        $propagator = TraceContextPropagator::getInstance();

        return $propagator->extract(
            carrier: $headers,
        );
    }

    /**
     * Inject current trace context into outgoing headers.
     *
     * @return array<string, string>
     */
    public static function injectToHeaders(): array
    {
        $headers = [];
        $propagator = TraceContextPropagator::getInstance();

        $propagator->inject(
            carrier: $headers,
        );

        return $headers;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Tracing\TraceContextManager;
use Closure;
use Illuminate\Http\Request;
use OpenTelemetry\Context\Context;
use Symfony\Component\HttpFoundation\Response;

final class ExtractTraceContextMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Extract W3C traceparent from incoming request
        $context = TraceContextManager::extractFromHeaders(
            headers: $request->headers->all(),
        );

        // Set as active context for this request
        $scope = $context->activate();

        try {
            return $next($request);
        } finally {
            $scope->detach();
        }
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Tracing\TraceContextManager;
use Illuminate\Support\Facades\Http;

final class DownstreamServiceClient
{
    /**
     * Call downstream service with trace context propagation.
     */
    public function callInventoryService(array $items): array
    {
        // Inject current trace context into outgoing headers
        $traceHeaders = TraceContextManager::injectToHeaders();

        $response = Http::withHeaders($traceHeaders)
            ->timeout(30)
            ->post(
                url: config('services.inventory.url') . '/api/v1/reserve',
                data: ['items' => $items],
            );

        return $response->json();
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Tracing\TraceContextManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

final class ProcessOrderJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * @param array<string, string> $traceContext Serialized trace context
     */
    public function __construct(
        private readonly int $orderId,
        private readonly array $traceContext,
    ) {}

    public static function dispatchWithTrace(int $orderId): self
    {
        $traceContext = TraceContextManager::injectToHeaders();

        return new self(
            orderId: $orderId,
            traceContext: $traceContext,
        );
    }

    public function handle(): void
    {
        // Restore trace context from serialized headers
        $context = TraceContextManager::extractFromHeaders($this->traceContext);
        $scope = $context->activate();

        try {
            // Job logic — spans created here will be children of the original trace
            // ...
        } finally {
            $scope->detach();
        }
    }
}
```

**Key Points**:
- Use W3C `TraceContextPropagator` for standard `traceparent`/`tracestate` header handling
- Extract incoming context in middleware before span creation — ensures parent-child linkage
- Inject context into outgoing HTTP calls to propagate trace to downstream services
- Serialize trace context in queue job constructors — queues break context automatically

---

## Best Practices

- **Use OpenTelemetry SDK** — vendor-neutral, works with Jaeger, Zipkin, Datadog, New Relic
- **Sample in production** — use ratio-based sampling (0.1 = 10%) to control costs
- **Semantic conventions** — follow OpenTelemetry semantic convention attributes for spans
- **Always end spans** — use `finally` blocks to prevent span leaks on exceptions
- **Propagate context everywhere** — HTTP calls, queue jobs, event listeners, scheduled tasks
- **Keep spans meaningful** — name spans by operation, not by class/method name
- **Avoid high-cardinality attributes** — never use user IDs or request IDs as span attribute keys
- **Test tracing in isolation** — mock `TracerInterface` in unit tests, verify span creation in integration tests

---

## Abnormal Case Patterns

1. **Trace context lost in queue** — queue serialization drops OpenTelemetry context. Fix: serialize trace headers in job constructor, extract in `handle()`.

2. **Span leak causes memory growth** — span started but never ended due to exception. Fix: always use `try/finally` pattern with `scope.detach()` and `span.end()`.

3. **High trace volume overwhelms collector** — all traces exported in production without sampling. Fix: use `TraceIdRatioBasedSampler` with appropriate ratio.

4. **Incorrect parent-child relationships** — child spans created without extracting parent context. Fix: extract context from incoming headers before creating server span.

5. **Correlation ID and trace ID mismatch** — two separate ID systems causing confusion. Fix: use OpenTelemetry trace ID as correlation ID, or log both consistently.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (331.1–331.5), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Distributed Tracing Specialist — Cross-Cutting | EPS v3.2*
