# Laravel Logging Specialist — Infrastructure
# Laravelロギングスペシャリスト — インフラストラクチャ
# Chuyen Gia Ghi Log Laravel — Ha Tang

**Version**: 1.0.0
**Technology**: PHP 8.3 + Laravel 11.x + Monolog
**Aspect**: Logging
**Category**: infrastructure
**Purpose**: Knowledge provider for Laravel logging — Monolog channels, custom handlers, contextual logging, structured JSON output, log rotation, and formatting strategies

---

## Metadata

```json
{
  "id": "laravel-logging-specialist",
  "technology": "PHP 8.3 + Laravel 11.x + Monolog",
  "aspect": "Logging",
  "category": "infrastructure",
  "subcategory": "php-laravel",
  "lines": 450,
  "token_cost": 3000,
  "version": "1.0.0",
  "evidence": [
    "E1: Laravel 11 logging — Monolog 3.x channel-based architecture",
    "E2: Monolog handlers — RotatingFileHandler, StreamHandler, custom processors",
    "E3: Structured logging — JSON format for log aggregation (ELK, Datadog, CloudWatch)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 350.1–350.6 |
| **Directory Pattern** | `config/logging.php` |
| **Naming Convention** | Channel names in `config/logging.php`, custom handlers in `app/Logging/` |
| **Imports From** | Application (log calls from services, controllers) |
| **Imported By** | Monitoring, alerting, log aggregation systems |
| **Cannot Import** | Domain logic, business rules |
| **Dependencies** | `monolog/monolog` |
| **When To Use** | Every Laravel project — centralized logging strategy |
| **Source Skeleton** | `config/logging.php`, `app/Logging/` |
| **Specialist Type** | code |
| **Purpose** | Laravel logging infrastructure — channels, formatters, rotation, structured output |
| **Activation Trigger** | files: `config/logging.php`, `app/Logging/*.php`; keywords: logging, log channel, monolog, structured log |

---

## Role

You are a **Laravel Logging Specialist**. Your responsibility is to provide best practices for Laravel 11 logging infrastructure — Monolog channel configuration, custom log channels and handlers, contextual logging with request metadata, structured JSON formatting for log aggregation, and log rotation strategies.

**Used by**: Any code agent implementing logging strategy in Laravel applications
**Not used by**: Non-Laravel stacks, projects using external logging SDKs exclusively

---

## Patterns

### Pattern 350.1: Monolog Channels

**Category**: Channel Configuration
**Description**: Laravel logging channel configuration — stack, single, daily, and custom channels via `config/logging.php`.

```php
<?php
// config/logging.php

declare(strict_types=1);

return [
    'default' => env('LOG_CHANNEL', 'stack'),

    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace' => false,
    ],

    'channels' => [
        'stack' => [
            'driver' => 'stack',
            'channels' => explode(',', env('LOG_STACK_CHANNELS', 'daily,stderr')),
            'ignore_exceptions' => false,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'days' => (int) env('LOG_RETENTION_DAYS', 14),
            'replace_placeholders' => true,
        ],

        'stderr' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => \Monolog\Handler\StreamHandler::class,
            'with' => [
                'stream' => 'php://stderr',
            ],
            'formatter' => env('LOG_STDERR_FORMATTER'),
        ],

        'audit' => [
            'driver' => 'daily',
            'path' => storage_path('logs/audit.log'),
            'level' => 'info',
            'days' => 90,
        ],

        'performance' => [
            'driver' => 'daily',
            'path' => storage_path('logs/performance.log'),
            'level' => 'info',
            'days' => 30,
        ],
    ],
];
```

**Key Points**:
- `stack` driver combines multiple channels — production typically uses `daily` + `stderr`
- Separate channels for audit trails and performance logs — different retention policies
- `replace_placeholders` enables PSR-3 message interpolation (`{user_id}` style)
- Use `env()` for level and retention — configurable per environment without code changes

---

### Pattern 350.2: Custom Log Channels

**Category**: Advanced Channels
**Description**: Custom Monolog channel with dedicated handler, processor, and formatter.

```php
<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\Handler\RotatingFileHandler;
use Monolog\Logger;
use Monolog\Processor\IntrospectionProcessor;
use Monolog\Processor\MemoryUsageProcessor;
use Monolog\Processor\WebProcessor;

final class CustomChannelFactory
{
    public function __invoke(array $config): Logger
    {
        $logger = new Logger(name: 'custom');

        $handler = new RotatingFileHandler(
            filename: $config['path'] ?? storage_path('logs/custom.log'),
            maxFiles: $config['days'] ?? 14,
            level: Logger::toMonologLevel($config['level'] ?? 'debug'),
        );

        $handler->setFormatter(new \Monolog\Formatter\JsonFormatter());

        $logger->pushHandler($handler);

        // Add contextual processors
        $logger->pushProcessor(new WebProcessor());
        $logger->pushProcessor(new MemoryUsageProcessor());
        $logger->pushProcessor(new IntrospectionProcessor(
            level: Logger::DEBUG,
            skipClassesPartials: ['Illuminate\\'],
        ));

        return $logger;
    }
}
```

```php
<?php
// config/logging.php — registering the custom channel
'channels' => [
    'custom' => [
        'driver' => 'custom',
        'via' => \App\Logging\CustomChannelFactory::class,
        'path' => storage_path('logs/custom.log'),
        'level' => 'info',
        'days' => 30,
    ],
],
```

**Key Points**:
- `driver: custom` + `via` key invokes a factory class to build the Monolog Logger
- Processors add metadata automatically — memory usage, request info, call stack
- `IntrospectionProcessor` adds file/line/class info — skip framework classes to reduce noise
- Factory receives the full channel config array — use it for path, level, days

---

### Pattern 350.3: Contextual Logging

**Category**: Request Context
**Description**: Attach request-scoped context (request ID, user, tenant) to every log entry automatically.

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class LogContextMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-ID', Str::uuid()->toString());

        Log::shareContext([
            'request_id' => $requestId,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'url' => $request->fullUrl(),
            'method' => $request->method(),
        ]);

        if ($user = $request->user()) {
            Log::shareContext([
                'user_id' => $user->id,
                'user_email' => $user->email,
            ]);
        }

        $response = $next($request);

        $response->headers->set('X-Request-ID', $requestId);

        return $response;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Log;

final class OrderService
{
    public function processOrder(int $orderId): void
    {
        // Context from middleware is automatically included
        Log::info('Processing order', [
            'order_id' => $orderId,
            'step' => 'validation',
        ]);

        // Scoped context for a specific operation
        Log::withContext(['order_id' => $orderId]);

        // All subsequent logs in this request include order_id
        Log::info('Payment verified');
        Log::info('Inventory reserved');
    }
}
```

**Key Points**:
- `Log::shareContext()` adds context to ALL channels for the current request
- `Log::withContext()` adds context for subsequent calls in the same request
- Always include `request_id` — enables tracing across distributed systems
- Return `X-Request-ID` header for client-side correlation
- User context added after authentication middleware runs

---

### Pattern 350.4: Log Formatting

**Category**: Output Format
**Description**: Custom log formatters — line format for development, structured format for production.

```php
<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\Formatter\LineFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;

final class DevelopmentFormatter
{
    public function __invoke(Logger $logger): void
    {
        $format = "[%datetime%] %channel%.%level_name%: %message% %context%\n";

        foreach ($logger->getHandlers() as $handler) {
            if ($handler instanceof StreamHandler) {
                $handler->setFormatter(new LineFormatter(
                    format: $format,
                    dateFormat: 'Y-m-d H:i:s.u',
                    allowInlineLineBreaks: true,
                    ignoreEmptyContextAndExtra: true,
                ));
            }
        }
    }
}
```

```php
<?php
// config/logging.php — applying formatter via tap
'channels' => [
    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => 'debug',
        'days' => 14,
        'tap' => [
            \App\Logging\DevelopmentFormatter::class,
        ],
    ],
],
```

**Key Points**:
- `tap` array invokes callable classes that receive the Monolog Logger instance
- Development: `LineFormatter` with readable timestamps and inline breaks
- `ignoreEmptyContextAndExtra` keeps output clean when no context is passed
- Tap classes can modify handlers, add processors, or swap formatters entirely

---

### Pattern 350.5: Log Rotation

**Category**: Retention Management
**Description**: Log rotation strategies — daily rotation, size-based rotation, retention policies.

```php
<?php
// config/logging.php — rotation strategies

'channels' => [
    // Time-based rotation (built-in daily driver)
    'daily' => [
        'driver' => 'daily',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'info'),
        'days' => (int) env('LOG_RETENTION_DAYS', 14),
        'permission' => 0644,
    ],

    // Size-based rotation via custom channel
    'sized' => [
        'driver' => 'custom',
        'via' => \App\Logging\SizeRotatingChannelFactory::class,
        'path' => storage_path('logs/app.log'),
        'max_files' => 10,
        'max_size_mb' => 50,
    ],
],
```

```php
<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\Handler\RotatingFileHandler;
use Monolog\Logger;

final class SizeRotatingChannelFactory
{
    public function __invoke(array $config): Logger
    {
        $logger = new Logger('sized');

        $handler = new RotatingFileHandler(
            filename: $config['path'],
            maxFiles: $config['max_files'] ?? 10,
            level: Logger::toMonologLevel($config['level'] ?? 'info'),
        );

        $logger->pushHandler($handler);

        return $logger;
    }
}
```

```bash
# logrotate.d/laravel — OS-level rotation for non-daily drivers
/var/www/html/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        /usr/bin/supervisorctl signal USR1 php-fpm
    endscript
}
```

**Key Points**:
- Laravel `daily` driver uses `RotatingFileHandler` — files named `laravel-YYYY-MM-DD.log`
- `days` parameter controls how many rotated files to keep (0 = keep all)
- Production containers: prefer stderr logging with external rotation (Docker, ELK)
- OS-level logrotate as fallback for non-containerized deployments
- Signal PHP-FPM after rotation to reopen file handles

---

### Pattern 350.6: Structured Logging (JSON)

**Category**: Log Aggregation
**Description**: JSON-formatted structured logging for integration with ELK, Datadog, CloudWatch, and other log aggregation platforms.

```php
<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Monolog\Processor\UidProcessor;

final class StructuredJsonFormatter
{
    public function __invoke(Logger $logger): void
    {
        // Add unique ID to every log entry
        $logger->pushProcessor(new UidProcessor());

        foreach ($logger->getHandlers() as $handler) {
            if ($handler instanceof StreamHandler) {
                $handler->setFormatter(new JsonFormatter(
                    batchMode: JsonFormatter::BATCH_MODE_NEWLINES,
                    appendNewline: true,
                    ignoreEmptyContextAndExtra: false,
                    includeStacktraces: true,
                ));
            }
        }
    }
}
```

```php
<?php
// config/logging.php — JSON output for production
'channels' => [
    'json' => [
        'driver' => 'monolog',
        'handler' => \Monolog\Handler\StreamHandler::class,
        'with' => [
            'stream' => 'php://stderr',
        ],
        'tap' => [
            \App\Logging\StructuredJsonFormatter::class,
        ],
        'level' => 'info',
    ],

    'stack' => [
        'driver' => 'stack',
        'channels' => env('APP_ENV') === 'production'
            ? ['json']
            : ['daily'],
    ],
],
```

```php
<?php
// Example structured log output (JSON):
// {
//   "message": "Order processed",
//   "context": {
//     "order_id": 12345,
//     "amount": 99.99,
//     "currency": "USD"
//   },
//   "level": 200,
//   "level_name": "INFO",
//   "channel": "json",
//   "datetime": "2024-01-15T10:30:00.123456+00:00",
//   "extra": {
//     "uid": "a1b2c3d4"
//   }
// }

// Usage in application code:
Log::channel('json')->info('Order processed', [
    'order_id' => $order->id,
    'amount' => $order->total,
    'currency' => $order->currency,
    'customer_id' => $order->customer_id,
]);
```

**Key Points**:
- JSON format enables machine parsing — required for ELK, Datadog, CloudWatch
- `includeStacktraces: true` embeds exception traces in JSON (no multiline issues)
- `UidProcessor` adds a unique ID per log entry — useful for deduplication
- Production stack should use JSON channel; development should use human-readable daily
- One JSON object per line (`BATCH_MODE_NEWLINES`) for line-based log ingestion

---

## Best Practices

- **Separate channels by concern** — application logs, audit logs, performance logs, security logs
- **Use structured logging in production** — JSON format for machine-parseable log aggregation
- **Include request context** — request ID, user ID, URL in every log entry via middleware
- **Set appropriate log levels** — DEBUG in dev, INFO or WARNING in production
- **Rotate logs aggressively** — 14 days for application, 90 days for audit, never unlimited
- **Log to stderr in containers** — let Docker/orchestrator handle aggregation and rotation
- **Never log sensitive data** — mask passwords, tokens, credit card numbers, PII
- **Use channel-specific levels** — audit channel at INFO, debug channel at DEBUG
- **Test logging configuration** — verify channels, formatters, and rotation in integration tests

---

## Abnormal Case Patterns

1. **Log files growing unbounded** — `days` set to 0 or missing. Fix: always set explicit `days` value; use logrotate as safety net.

2. **Missing context in log entries** — `Log::shareContext()` called after the log statement. Fix: register `LogContextMiddleware` early in the middleware stack.

3. **JSON parse errors in log aggregator** — mixed JSON and plain text in same stream. Fix: use dedicated JSON channel for production; never mix formatters on same output.

4. **Permission denied writing logs** — storage/logs ownership mismatch between CLI (root) and web (www-data). Fix: set `permission` in channel config; run artisan commands as www-data.

5. **Performance degradation from excessive logging** — DEBUG level in production logging every query. Fix: set `LOG_LEVEL=warning` in production; use sampling for high-volume debug data.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (350.1–350.6), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Laravel Logging Specialist — Infrastructure | EPS v3.2*
