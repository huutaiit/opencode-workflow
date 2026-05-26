# NestJS Logging Specialist — Infrastructure
# NestJSロギングスペシャリスト — インフラ
# Chuyen Gia Logging NestJS — Ha Tang

**Version**: 1.0.0
**Technology**: NestJS 10+ Logging (Pino, Winston)
**Aspect**: Structured Logging
**Category**: infrastructure
**Purpose**: Knowledge provider for NestJS logging — Pino/Winston setup, structured JSON logs, correlation IDs, log levels, request logging, error logging, log rotation

---

## Metadata

```json
{
  "id": "nestjs-logging-specialist",
  "technology": "NestJS 10+ Logging",
  "aspect": "Structured Logging",
  "category": "infrastructure",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: nestjs-pino — high-performance structured logging for NestJS",
    "E2: Structured logging — JSON format, correlation IDs, log levels",
    "E3: Observability best practices — request tracing, error context"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 258.1–258.6 |
| **Directory Pattern** | `src/infrastructure/logging/` |
| **Dependencies** | nestjs-pino, pino, pino-pretty |
| **When To Use** | Structured JSON logging with correlation IDs |
| **Source Skeleton** | src/infrastructure/logging/logger.module.ts, src/presentation/middleware/correlation-id.middleware.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS logging — Pino/Winston integration, log levels, request logging |
| **Activation Trigger** | files: **/logging/**; keywords: logger, pinoLogger, winstonLogger, logLevel |

---

## Role

You are a **NestJS Logging Specialist**. You supply patterns for structured logging in NestJS — Pino for high-performance JSON logs, correlation IDs for request tracing, log levels, request/response logging, error logging with context, and log aggregation readiness.

---

## Patterns

### Pattern 258.1: Pino Setup

```typescript
// Using nestjs-pino (recommended for production)
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined, // JSON in production
        serializers: {
          req: (req) => ({ method: req.method, url: req.url, id: req.id }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
        redact: ['req.headers.authorization', 'req.body.password'], // hide sensitive
      },
    }),
  ],
})
export class AppModule {}

// main.ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
```

**Key Points**:
- Pino is 5-10x faster than Winston — critical for high-throughput APIs
- JSON format in production — parseable by log aggregators (ELK, Datadog)
- Pretty print in development — human-readable
- Redact sensitive fields — passwords, tokens, credit cards

---

### Pattern 258.2: Correlation ID

```typescript
// Middleware adds correlation ID to every request
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || randomUUID();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}

// In services — log with correlation ID
@Injectable()
export class OrderService {
  constructor(private logger: PinoLogger) {}

  async createOrder(dto: CreateOrderDto, correlationId: string) {
    this.logger.info({ correlationId, customerId: dto.customerId }, 'Creating order');
    // ... business logic
    this.logger.info({ correlationId, orderId: result.id }, 'Order created');
  }
}
```

---

### Pattern 258.3: Log Levels Strategy

| Level | When to Use | Example |
|-------|------------|---------|
| `fatal` | App cannot continue | DB connection permanently lost |
| `error` | Operation failed, needs attention | Payment gateway error |
| `warn` | Unexpected but recoverable | Retry succeeded on 2nd attempt |
| `info` | Normal operation milestones | Order created, user logged in |
| `debug` | Development diagnostics | SQL query, cache hit/miss |
| `trace` | Extremely verbose | Every function entry/exit |

```typescript
// Production: info
// Staging: debug
// Development: debug or trace
// Never log at trace/debug level in production — performance impact
```

---

### Pattern 258.4: Error Logging with Context

```typescript
// In exception filter — structured error logging
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    this.logger.error({
      err: exception instanceof Error ? exception : undefined,
      correlationId: req['correlationId'],
      method: req.method,
      url: req.url,
      statusCode: status,
      userId: req.user?.id,
    }, 'Request failed');

    // ... send response
  }
}
```

---

### Pattern 258.5: Request/Response Logging

```typescript
// nestjs-pino auto-logs requests. Customize with serializers:
pinoHttp: {
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode} ERROR`,
}
```

---

### Pattern 258.6: Structured Logging (JSON Standards)

```typescript
// Mandatory fields for every log entry — standardized across microservices
interface StructuredLog {
  timestamp: string;       // ISO 8601
  level: string;           // debug, info, warn, error
  message: string;         // human-readable
  correlationId: string;   // from AsyncLocalStorage
  service: string;         // microservice name
  layer: string;           // domain, application, infrastructure, presentation
  // Optional context
  userId?: string;
  traceId?: string;        // OpenTelemetry trace ID
  duration?: number;       // operation duration in ms
}

// Pino custom serializers for sensitive data redaction
const pinoConfig = {
  serializers: {
    req: (req) => ({
      method: req.method, url: req.url,
      headers: { ...req.headers, authorization: req.headers.authorization ? '[REDACTED]' : undefined },
    }),
    err: pino.stdSerializers.err,
  },
  redact: ['req.headers.cookie', 'req.body.password', 'req.body.creditCard'],
};
```

---

### Pattern 258.7: Correlation ID Propagation

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

// Shared AsyncLocalStorage instance
export const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

// Middleware: set correlation ID from header or generate
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    res.setHeader('x-correlation-id', correlationId);

    correlationStorage.run({ correlationId }, () => next());
  }
}

// Auto-inject into all log calls via Pino mixin
const logger = pino({
  mixin: () => {
    const store = correlationStorage.getStore();
    return { correlationId: store?.correlationId || 'no-context' };
  },
});

// Propagate to downstream HTTP calls
this.httpService.get(url, {
  headers: { 'x-correlation-id': correlationStorage.getStore()?.correlationId },
});

// Propagate to message queue
channel.publish(exchange, routingKey, payload, {
  headers: { 'x-correlation-id': correlationStorage.getStore()?.correlationId },
});
```

---

### Pattern 258.8: Log Aggregation Patterns

```typescript
// ELK Stack: Filebeat → Logstash → Elasticsearch
// Pino outputs JSON → Filebeat reads container stdout → ships to Logstash

// Filebeat config (sidecar or DaemonSet):
// filebeat.inputs:
//   - type: container
//     paths: ['/var/log/containers/*.log']
//     processors:
//       - decode_json_fields: { fields: ['message'], target: '' }

// CloudWatch (AWS): use pino-cloudwatch transport
import { pinoCloudwatch } from 'pino-cloudwatch';
const transport = pino.transport({
  target: 'pino-cloudwatch',
  options: { logGroupName: '/nestjs/my-service', logStreamName: process.env.HOSTNAME },
});

// Datadog: use pino + dd-trace auto-instrumentation
// dd-trace automatically correlates Pino logs with APM traces
// Just ensure JSON format + trace_id/span_id fields

// Log rotation (if writing to files — NOT recommended in containers):
// Use logrotate or pino-roll for file-based logging
// Containers: stdout → aggregator (no rotation needed)
```

---

## Best Practices

- JSON format in production — always, no exceptions
- Correlation ID on every log entry — trace requests across services
- Redact sensitive data — never log passwords, tokens, PII
- Log the "what" not the "how" — `Order created (id=123)` not `Calling save method`
- Error logs include: correlationId, userId, path, statusCode, stack trace

---

## Abnormal Case Patterns

1. **Log flooding** — Debug level in production. Fix: `LOG_LEVEL=info` in production.
2. **Sensitive data logged** — Password/token in logs. Fix: use `redact` option in Pino.
3. **No correlation ID** — Can't trace request across services. Fix: middleware + propagate in headers.
4. **Console.log in production** — Unstructured, blocks event loop. Fix: replace with Pino logger.
5. **Log rotation missing** — Disk fills up. Fix: use log aggregator (ELK/Datadog) or logrotate.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (258.1-258.5)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Logging Specialist — Infrastructure | EPS v3.2*
