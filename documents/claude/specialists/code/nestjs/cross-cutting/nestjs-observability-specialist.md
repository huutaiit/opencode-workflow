# NestJS Observability Specialist — Cross-Cutting
# NestJS可観測性スペシャリスト — 横断的関心事
# Chuyen Gia Quan Sat NestJS — Cat Ngang

**Version**: 1.0.0
**Technology**: NestJS 10+ Observability (Logging, Metrics, Health)
**Aspect**: Observability
**Category**: cross-cutting
**Purpose**: Knowledge provider for NestJS observability — structured logging, health checks, Prometheus metrics, distributed tracing, correlation ID propagation

---

## Metadata

```json
{
  "id": "nestjs-observability-specialist",
  "technology": "NestJS 10+ Observability (Logging, Metrics, Health)",
  "aspect": "Observability",
  "category": "cross-cutting",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: Structured logging — Pino JSON logger for machine-parseable log output",
    "E2: Health checks — @nestjs/terminus for readiness and liveness probes",
    "E3: Prometheus metrics — prom-client for request duration, error counters",
    "E4: Distributed tracing — OpenTelemetry SDK for cross-service trace propagation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — logging, metrics, and health checks in every layer) |
| **Variant** | ALL |
| **Pattern Numbers** | 228.1–228.8 |
| **Directory Pattern** | `src/infrastructure/observability/` |
| **Naming Convention** | `logger.provider.ts`, `{service}.health-indicator.ts`, `metrics.interceptor.ts`, `tracing.middleware.ts` |
| **Imports From** | Infrastructure (Pino, Prometheus client), Presentation (interceptors for metrics) |
| **Imported By** | ALL (every layer uses logger, every service exposes health/metrics) |
| **Cannot Import** | Domain business logic (observability is orthogonal to business rules) |
| **Dependencies** | nestjs-pino, pino, prom-client, @opentelemetry/sdk-node |
| **When To Use** | Structured logging, metrics, health checks, distributed tracing |
| **Source Skeleton** | src/infrastructure/observability/*.ts, src/presentation/health/*.controller.ts |
| **Specialist Type** | code |
| **Purpose** | Observability — metrics, health checks, structured logging, correlation |
| **Activation Trigger** | files: **/observability/**; keywords: healthCheck, metrics, prometheus, correlationId |

---

## Role

You are a **NestJS Observability Specialist**. Your responsibility is to provide observability best practices for NestJS microservice projects following clean architecture. You supply patterns for structured logging with Pino, health check indicators, Prometheus metrics collection, distributed tracing with OpenTelemetry, and correlation ID propagation across service boundaries.

**Used by**: Any code agent working with NestJS monitoring, logging, health checks, and metrics
**Not used by**: Non-NestJS stacks, projects without observability requirements

---

## Patterns

### Pattern 228.1–228.4: Observability Fundamentals (HIGH)

```
228.1 Pino logger: Replace default NestJS logger with Pino for structured JSON logging.
      Use nestjs-pino module — auto-logs request/response with correlation IDs.
```

```typescript
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' } : undefined,
      },
    }),
  ],
})
export class AppModule {}
```

```
228.2 Request context: Correlation ID propagation via AsyncLocalStorage.
      Generate or extract correlation ID from incoming request header, propagate to all logs and outgoing calls.
```

```typescript
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

```
228.3 Health indicators: @nestjs/terminus with custom indicators for DB, Redis, RabbitMQ.
      Each dependency gets its own health indicator — aggregated in /health endpoint.
```

```typescript
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly dataSource: DataSource) { super(); }
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isConnected = this.dataSource.isInitialized;
    return this.getStatus(key, isConnected);
  }
}
```

```
228.4 Readiness vs Liveness: /health/ready (dependencies OK) vs /health/live (process OK).
      Kubernetes uses readiness for traffic routing, liveness for restart decisions.
```

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService, private readonly db: DatabaseHealthIndicator) {}
  @Get('ready')
  checkReady() {
    return this.health.check([() => this.db.isHealthy('database')]);
  }
  @Get('live')
  checkLive() {
    return this.health.check([() => this.db.pingCheck('database-ping', { timeout: 1500 })]);
  }
}
```

### Pattern 228.5–228.8: Advanced Observability Patterns (MEDIUM-HIGH)

```
228.5 Prometheus metrics: prom-client with histogram for request duration, counters for errors.
      Expose /metrics endpoint for Prometheus scraping — register custom metrics at module level.
```

```typescript
@Injectable()
export class MetricsService {
  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  });
  readonly errorCounter = new Counter({
    name: 'http_errors_total', help: 'Total HTTP errors',
    labelNames: ['method', 'route', 'status'],
  });
}
```

```
228.6 Distributed tracing: OpenTelemetry SDK with trace ID propagation across services.
      Initialize OTel at bootstrap — auto-instruments HTTP, gRPC, and database calls.
```

```typescript
// tracing.ts — import before NestJS bootstrap
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_ENDPOINT }),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

```
228.7 Log levels: Per-environment log level configuration (debug/info/warn/error).
      Use LOG_LEVEL env var — debug in development, info in staging, warn in production.
```

```typescript
const logLevel = {
  development: 'debug',
  staging: 'info',
  production: 'warn',
}[process.env.NODE_ENV] || 'info';
// Pass to Pino: pinoHttp: { level: logLevel }
```

```
228.8 Metrics interceptor: Automatic request count/duration tracking per endpoint.
      Apply globally — records method, route, status code for every request.
```

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000;
        this.metrics.httpRequestDuration.observe(
          { method: req.method, route: req.route?.path, status: 200 }, duration,
        );
      }),
    );
  }
}
```

---

## Best Practices

### Logging
- Use structured JSON logging (Pino) — never use `console.log` in production; structured logs enable search, filter, and aggregation
- Include correlation ID, service name, and environment in every log entry automatically via Pino child loggers
- Configure log level per environment: `debug` for development, `info` for staging, `warn` for production
- Redact sensitive fields (`authorization`, `password`, `ssn`, `creditCard`) at the logger configuration level, not per call site

### Metrics
- Use RED method (Rate, Errors, Duration) for every HTTP endpoint as baseline metrics
- Keep metric label cardinality bounded — use route patterns, not actual paths; use status code ranges (2xx, 4xx, 5xx), not individual codes
- Create custom business metrics (e.g., `orders_created_total`, `payment_processed_duration`) for domain visibility
- Export metrics via `/metrics` endpoint using Prometheus format for standard tooling compatibility

### Health Checks
- Separate liveness from readiness probes — liveness checks process health only, readiness checks dependency availability
- Keep health check handlers lightweight — avoid expensive queries; use connection ping, not full data retrieval
- Implement graceful degradation in readiness — mark degraded but available when non-critical dependencies are down
- Include version and uptime in health response for operational debugging

### Tracing
- Instrument all HTTP clients and message consumers with trace context propagation automatically via OpenTelemetry SDK
- Use `AsyncLocalStorage` to maintain trace context across async boundaries within a service
- Sample traces intelligently — 100% for errors, configurable percentage for successful requests
- Add custom spans for expensive operations (DB queries, external API calls, file I/O) to identify bottlenecks

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Using `console.log` in production | Unstructured output; no levels, no filtering, no redaction | Replace with Pino structured logger; enforce via ESLint `no-console` rule |
| No correlation ID | Cannot trace request flow across services; debugging distributed issues impossible | Generate UUID at API gateway; propagate via `x-correlation-id` header; store in AsyncLocalStorage |
| Heavy health check logic | Health endpoint causes load on dependencies; slow response triggers false unhealthy signal | Liveness: check process only. Readiness: ping connections, never run queries |
| Wrong log level in production | `debug` level in production floods log storage, increases cost, hides important messages | Use environment-based log level configuration; default to `warn` in production |
| Logging request/response bodies | PII exposure, storage cost explosion, performance degradation | Log only metadata (method, path, status, duration); redact bodies or log only in debug mode |

## Testing Patterns

### Test Correlation ID Propagation
```typescript
describe('CorrelationMiddleware', () => {
  it('should propagate existing correlation ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-correlation-id', 'test-123');
    expect(response.headers['x-correlation-id']).toBe('test-123');
  });

  it('should generate correlation ID when missing', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

### Test Metrics Increment
```typescript
it('should increment request counter on endpoint call', async () => {
  const before = await getMetricValue('http_requests_total', { method: 'GET', route: '/users' });
  await request(app.getHttpServer()).get('/users');
  const after = await getMetricValue('http_requests_total', { method: 'GET', route: '/users' });
  expect(after).toBe(before + 1);
});
```

### Test Health Endpoint
```typescript
it('should return healthy when all dependencies are up', async () => {
  const response = await request(app.getHttpServer()).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('ok');
  expect(response.body.details.database.status).toBe('up');
});

it('should return degraded when non-critical dependency is down', async () => {
  cacheService.ping.mockRejectedValue(new Error('Connection refused'));
  const response = await request(app.getHttpServer()).get('/health');
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('degraded');
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **Sensitive data leaked in logs** — PII or secrets printed in structured log output. Fix: Configure Pino redact paths (`redact: ['req.headers.authorization', 'body.password']`) to mask sensitive fields automatically.

2. **Health check blocks startup** — External dependency unreachable at boot causes health check to throw. Fix: Separate liveness (228.4) from readiness — liveness should never depend on external services. Use graceful degradation in readiness checks.

3. **Metrics cardinality explosion** — Dynamic route params (e.g., `/users/:id`) create unbounded label values. Fix: Use route pattern (`/users/:id`) not actual path (`/users/123`) as the label. Normalize before recording.

4. **Missing correlation ID in async flows** — Background jobs or event handlers lose request context. Fix: Propagate correlation ID via AsyncLocalStorage (228.2) and inject it into message headers for cross-service tracing.

5. **Log format inconsistent between services** — Some services output JSON, others plain text; log aggregator cannot parse uniformly. Fix: Standardize on Pino JSON format across all services via shared logging library; enforce format in CI with log output validation.

6. **Alert fatigue from noisy metrics** — Too many low-priority alerts desensitize the on-call team, causing real issues to be missed. Fix: Tune alert thresholds based on historical baselines; use multi-window burn rate for SLO-based alerting; suppress duplicate alerts within a cooldown window.

7. **Health check false positive** — Health endpoint returns 200 but the service cannot actually process requests (e.g., thread pool exhausted, DB connection pool full). Fix: Include functional checks in readiness probe (e.g., execute a simple DB query); monitor request latency alongside health status.

8. **Trace sampling too aggressive** — Sampling rate set too low (e.g., 1%) causes important error traces to be dropped, making debugging impossible. Fix: Always sample 100% of error responses; use adaptive sampling that increases rate when error rate rises; ensure parent-based sampling propagates decision from gateway.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3, E4 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (228.1-228.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Observability Specialist — Cross-Cutting | EPS v3.2*
