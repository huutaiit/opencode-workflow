# NestJS Distributed Tracing Specialist
# NestJS 分散トレーシングスペシャリスト
# Chuyen Gia Tracing Phan Tan NestJS

**Version**: 1.0.0
**Technology**: NestJS 10+ Distributed Tracing
**Aspect**: Distributed Tracing
**Category**: cross-cutting
**Purpose**: Distributed tracing for NestJS — OpenTelemetry SDK, trace context propagation, custom spans, baggage, Jaeger/Tempo integration

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (SDK setup) + ALL (span creation) |
| **Variant** | ALL |
| **Pattern Numbers** | 281.1–281.6 |
| **Directory Pattern** | `src/infrastructure/observability/tracing/` |
| **Naming Convention** | `tracing.ts` (bootstrap), `{concern}.interceptor.ts` (auto-span) |
| **Imports From** | Infrastructure (config) |
| **Imported By** | ALL (every layer can create spans) |
| **Cannot Import** | Domain (tracing is infrastructure — use interceptors not domain decorators) |
| **Dependencies** | @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node, nestjs-otel |
| **When To Use** | Microservice architectures — trace requests across HTTP/gRPC/messaging boundaries |
| **Source Skeleton** | `apps/{service}/src/infrastructure/observability/tracing/tracing.ts` |
| **Specialist Type** | code |
| **Purpose** | Distributed tracing for NestJS — OpenTelemetry SDK, trace context propagation, custom spans, baggage, Jaeger/Tempo integration |
| **Activation Trigger** | files: **/observability/**, **/tracing/**; keywords: opentelemetry, otel, tracing, span, jaeger, tempo |

---

## SCOPE

### What You Handle
- OpenTelemetry SDK bootstrap for NestJS
- W3C TraceContext propagation across HTTP/gRPC/messaging
- Custom span creation for business operations
- Baggage propagation for tenant/user context
- Jaeger/Tempo exporter configuration
- Auto vs manual instrumentation tradeoffs

### What You DON'T Handle
- Logging → `nestjs-logging-specialist` (258.x)
- Prometheus metrics → `nestjs-monitoring-specialist` (259.x)
- Health checks → `nestjs-graceful-shutdown-specialist` (282.x)

---

## Role

You are a **NestJS Distributed Tracing Specialist**. You supply patterns for implementing OpenTelemetry-based distributed tracing in NestJS microservices.

---

## APPROVED PATTERNS

### Pattern 281.1: OpenTelemetry SDK Setup

```typescript
// infrastructure/observability/tracing/tracing.ts — loaded BEFORE NestJS bootstrap
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'unknown',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': { enabled: true },
    '@opentelemetry/instrumentation-express': { enabled: true },
    '@opentelemetry/instrumentation-pg': { enabled: true },
    '@opentelemetry/instrumentation-redis': { enabled: true },
  })],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());

// main.ts: import tracing FIRST
import './infrastructure/observability/tracing/tracing'; // side-effect import
import { NestFactory } from '@nestjs/core';
```

---

### Pattern 281.2: Trace Context Propagation

```typescript
// HTTP: W3C TraceContext headers propagated automatically by OTel HTTP instrumentation
// Headers: traceparent, tracestate

// gRPC: propagation via metadata
// OTel gRPC instrumentation handles this automatically

// RabbitMQ: manual propagation via message headers
@Injectable()
export class TracedMessageProducer {
  constructor(private tracer: Tracer) {}

  async publish(exchange: string, routingKey: string, payload: any): Promise<void> {
    const span = this.tracer.startSpan('message.publish', { attributes: { 'messaging.destination': exchange } });
    const context = trace.setSpan(otelContext.active(), span);

    // Inject trace context into message headers
    const headers: Record<string, string> = {};
    propagation.inject(context, headers);

    await this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), { headers });
    span.end();
  }
}
```

---

### Pattern 281.3: Custom Span Creation

```typescript
// Business operation spans — meaningful names for business tracing
import { SpanStatusCode, trace } from '@opentelemetry/api';

@Injectable()
export class DisbursementUseCase {
  private tracer = trace.getTracer('loan-service');

  async execute(loanId: string): Promise<void> {
    const span = this.tracer.startSpan('loan.disbursement', {
      attributes: { 'loan.id': loanId, 'loan.operation': 'disburse' },
    });

    try {
      const loan = await this.loanRepo.findById(loanId);
      span.setAttribute('loan.amount', loan.amount.toString());

      await this.paymentService.transfer(loan);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

---

### Pattern 281.4: Baggage Propagation

```typescript
// Propagate tenant/user context across services via OTel Baggage
import { propagation, BaggageEntry } from '@opentelemetry/api';

@Injectable()
export class BaggageMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const entries: Record<string, BaggageEntry> = {};
    if (req.headers['x-tenant-id']) entries['tenant.id'] = { value: req.headers['x-tenant-id'] as string };
    if (req.user?.id) entries['user.id'] = { value: req.user.id };

    const baggage = propagation.createBaggage(entries);
    const ctx = propagation.setBaggage(otelContext.active(), baggage);
    otelContext.with(ctx, () => next());
  }
}

// Extract baggage in downstream service
function getTenantId(): string | undefined {
  const baggage = propagation.getBaggage(otelContext.active());
  return baggage?.getEntry('tenant.id')?.value;
}
```

---

### Pattern 281.5: Jaeger/Tempo Integration

```yaml
# docker-compose: Jaeger all-in-one for development
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"   # UI
    - "4317:4317"     # OTLP gRPC
  environment:
    - COLLECTOR_OTLP_ENABLED=true

# .env for NestJS service
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
OTEL_SERVICE_NAME=loan-service

# Production: Grafana Tempo (S3 backend, longer retention)
# tempo.yaml: distributor → ingester → compactor → querier → S3
```

---

### Pattern 281.6: Auto vs Manual Instrumentation

```
AUTO (use @opentelemetry/auto-instrumentations-node):
  ✅ HTTP requests (inbound + outbound)
  ✅ PostgreSQL/MySQL queries
  ✅ Redis commands
  ✅ gRPC calls
  → Sufficient for 80% of tracing needs

MANUAL (add custom spans):
  ✅ Business operations (loan.disbursement, order.processing)
  ✅ Message queue processing (consumer span)
  ✅ Complex domain logic (multi-step workflow)
  ✅ External API calls not covered by auto-instrumentation

PERFORMANCE:
  - Auto-instrumentation overhead: ~2-5% CPU increase
  - Custom spans: negligible (<0.1ms per span)
  - Sampling: use 10% sampling in production for high-traffic services
```

---

## REJECTED PATTERNS

| # | Anti-Pattern | Why Rejected | Use Instead |
|---|-------------|-------------|-------------|
| 1 | Tracing in domain layer directly | Couples domain to infrastructure | Use interceptors or application layer spans |
| 2 | 100% sampling in production | Storage cost + performance impact | Use probabilistic sampling (10-50%) |
| 3 | String span names like "doWork" | Not searchable, no business context | Meaningful names: "order.create", "payment.process" |

---

## Abnormal Case Patterns

1. **Trace context lost across message queue** — Consumer starts new trace instead of continuing. Fix: Extract traceparent from message headers.
2. **Span not ended** — Memory leak, incomplete traces. Fix: Always end spans in finally block.
3. **Too many spans** — 100+ spans per request overwhelm UI. Fix: Reduce instrumentation granularity, use sampling.
4. **Jaeger UI shows disconnected traces** — Services use different propagation formats. Fix: Standardize on W3C TraceContext.
5. **Sensitive data in span attributes** — PII in span attributes stored in Jaeger. Fix: Sanitize attributes, never include passwords/tokens.
6. **Tracing SDK blocks startup** — OTLP endpoint unreachable. Fix: Use async initialization, fail-open on connection error.
7. **High cardinality labels** — Span attribute with userId creates millions of unique label combinations. Fix: Use baggage for user context, not span attributes.

---

## Quality Checklist

- [ ] **Q1**: OTel SDK setup covers HTTP, DB, messaging instrumentation?
- [ ] **Q2**: Pattern IDs unique (281.1–281.6)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: Both auto and manual instrumentation patterns provided?

---

*NestJS Distributed Tracing Specialist — Pattern 281.x | EPS v10.0*
