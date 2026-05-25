# NestJS Monitoring Specialist — Infrastructure
# NestJSモニタリングスペシャリスト — インフラ
# Chuyen Gia Giam Sat NestJS — Ha Tang

**Version**: 1.0.0
**Technology**: NestJS 10+ @nestjs/terminus + Prometheus
**Aspect**: Health Checks & Monitoring
**Category**: infrastructure
**Purpose**: Knowledge provider for NestJS monitoring — health checks, Prometheus metrics, Grafana dashboards, alert rules, uptime monitoring

---

## Metadata

```json
{
  "id": "nestjs-monitoring-specialist",
  "technology": "NestJS 10+ Monitoring",
  "aspect": "Health Checks & Monitoring",
  "category": "infrastructure",
  "subcategory": "nestjs",
  "lines": 320,
  "token_cost": 1900,
  "version": "1.0.0",
  "evidence": [
    "E1: @nestjs/terminus — health check framework for NestJS",
    "E2: prom-client — Prometheus metrics for Node.js",
    "E3: Grafana dashboards — visualization of application metrics"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 259.1–259.6 |
| **Directory Pattern** | `src/infrastructure/observability/` |
| **Dependencies** | @nestjs/terminus, prom-client |
| **When To Use** | Health checks for K8s probes and Prometheus metrics exposure |
| **Source Skeleton** | src/presentation/health/health.controller.ts, src/infrastructure/monitoring/metrics.service.ts |
| **Specialist Type** | code |
| **Purpose** | NestJS monitoring — Prometheus metrics, Grafana dashboards, alerting |
| **Activation Trigger** | files: **/monitoring/**, **/metrics/**; keywords: prometheus, grafana, metrics, gauge, counter |

---

## Role

You are a **NestJS Monitoring Specialist**. You supply patterns for application health monitoring and metrics in NestJS — @nestjs/terminus health checks, Prometheus metrics exposure, custom business metrics, Grafana dashboard patterns, and alerting strategies.

---

## Patterns

### Pattern 259.1: Health Check Controller

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024), // 256MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),  // 512MB
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.redisHealthCheck(),
      () => this.rabbitHealthCheck(),
    ]);
  }
}
```

---

### Pattern 259.2: Custom Health Indicator

```typescript
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private redis: RedisService) { super(); }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redis.ping();
      if (result === 'PONG') {
        return this.getStatus(key, true);
      }
      throw new Error('Redis ping failed');
    } catch (error) {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false, { error: error.message }));
    }
  }
}

@Injectable()
export class ExternalApiHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const response = await this.httpService.get('/health', { timeout: 3000 }).toPromise();
      return this.getStatus(key, true, { latency: response.headers['x-response-time'] });
    } catch {
      throw new HealthCheckError('External API unavailable', this.getStatus(key, false));
    }
  }
}
```

---

### Pattern 259.3: Prometheus Metrics

```typescript
import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [this.registry],
  });

  readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly businessMetric = new Counter({
    name: 'orders_created_total',
    help: 'Total orders created',
    labelNames: ['status', 'payment_method'],
    registers: [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

@Controller('metrics')
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics() { return this.metrics.getMetrics(); }
}
```

---

### Pattern 259.4: Metrics Interceptor

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const route = req.route?.path || req.url;
    const start = process.hrtime();

    return next.handle().pipe(
      tap(() => {
        const [s, ns] = process.hrtime(start);
        const duration = s + ns / 1e9;
        const statusCode = context.switchToHttp().getResponse().statusCode;
        this.metrics.httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, duration);
        this.metrics.httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
      }),
    );
  }
}
```

---

### Pattern 259.5: Key Metrics to Track

| Metric | Type | Purpose |
|--------|------|---------|
| `http_request_duration_seconds` | Histogram | Latency distribution |
| `http_requests_total` | Counter | Request rate, error rate |
| `nodejs_heap_size_bytes` | Gauge | Memory usage |
| `nodejs_active_handles_total` | Gauge | Open connections/files |
| `db_query_duration_seconds` | Histogram | Database performance |
| `queue_jobs_total` | Counter | Job throughput |
| `orders_created_total` | Counter | Business KPI |

---

### Pattern 259.6: Alert Rules

```yaml
# Prometheus alert rules
groups:
  - name: nestjs-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels: { severity: critical }
        annotations: { summary: 'Error rate >5% for 2 minutes' }

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels: { severity: warning }
        annotations: { summary: 'P99 latency >2s for 5 minutes' }

      - alert: MemoryHigh
        expr: process_resident_memory_bytes / 1024 / 1024 > 450
        for: 5m
        annotations: { summary: 'Memory usage >450MB (limit 512MB)' }
```

---

### Pattern 259.7: Custom Business Metrics

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class BusinessMetricsService {
  // Counter: monotonically increasing events
  private loanApplications = new Counter({
    name: 'loan_applications_total',
    help: 'Total loan applications submitted',
    labelNames: ['status', 'product_type'],
  });

  // Gauge: current value (can go up/down)
  private activeSessions = new Gauge({
    name: 'active_sessions_current',
    help: 'Currently active user sessions',
  });

  // Histogram: distribution of values (durations, amounts)
  private disbursementDuration = new Histogram({
    name: 'disbursement_duration_seconds',
    help: 'Time to process loan disbursement',
    labelNames: ['payment_method'],
    buckets: [0.5, 1, 2, 5, 10, 30],
  });

  // Custom decorator for automatic metric tracking
  trackLoanApplication(status: string, productType: string): void {
    this.loanApplications.inc({ status, product_type: productType });
  }

  measureDisbursement(paymentMethod: string): () => void {
    return this.disbursementDuration.startTimer({ payment_method: paymentMethod });
  }
}

// Usage in use case:
const stopTimer = this.metrics.measureDisbursement('bank_transfer');
await this.processPayment(loan);
stopTimer(); // records duration automatically
```

---

### Pattern 259.8: Alerting Rules & Thresholds

```yaml
# Prometheus alerting rules for NestJS services
groups:
  - name: nestjs-service-alerts
    rules:
      # Error rate > 5% for 5 minutes
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: 'Error rate > 5% on {{ $labels.service }}'
          runbook: 'Check application logs for stack traces'

      # p99 latency > 2 seconds
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels: { severity: warning }

      # Connection pool exhaustion (< 2 available)
      - alert: DBPoolExhausted
        expr: pg_pool_available_connections < 2
        for: 1m
        labels: { severity: critical }

      # Event loop lag > 100ms (Node.js specific)
      - alert: EventLoopLag
        expr: nodejs_eventloop_lag_seconds > 0.1
        for: 2m
        labels: { severity: warning }
        annotations:
          summary: 'Event loop lag > 100ms — possible CPU-bound blocking'
```

---

### Pattern 259.9: Grafana Dashboard Templates

```json
// Grafana dashboard JSON — NestJS RED metrics (Rate, Errors, Duration)
// Import via Grafana UI → Import Dashboard → paste JSON

// Panel 1: Request Rate (per second)
// Query: sum(rate(http_requests_total[5m])) by (method, route)

// Panel 2: Error Rate (%)
// Query: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

// Panel 3: p50/p95/p99 Latency
// Query: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

// Panel 4: Node.js Runtime
// - Event loop lag: nodejs_eventloop_lag_seconds
// - Heap usage: process_heap_bytes / 1024 / 1024
// - Active handles: nodejs_active_handles_total

// Panel 5: Business KPIs (from Pattern 259.7)
// - Loan applications: rate(loan_applications_total[1h])
// - Disbursement p95: histogram_quantile(0.95, rate(disbursement_duration_seconds_bucket[5m]))

// Panel 6: Per-service breakdown (microservices)
// Query: sum(rate(http_requests_total[5m])) by (service)
// Variable: $service = label_values(http_requests_total, service)
```

**Recommended dashboards**: Create 3 dashboards — (1) Service Overview (RED), (2) Node.js Runtime, (3) Business KPIs.

---

## Best Practices

- Health check: liveness (process alive) vs readiness (dependencies ready)
- Expose /metrics endpoint for Prometheus scraping
- Track both technical (latency, errors) and business (orders, payments) metrics
- Alert on symptoms (high error rate) not causes (disk usage) when possible

---

## Abnormal Case Patterns

1. **Health check too heavy** — Queries full table. Fix: use ping/simple query only.
2. **Metrics cardinality explosion** — Dynamic labels (user IDs). Fix: use bounded labels (method, route, status).
3. **Missing readiness probe** — Traffic hits pod before DB connected. Fix: separate /health and /health/ready.
4. **No business metrics** — Only infrastructure metrics tracked. Fix: add domain counters (orders, payments).
5. **Alert fatigue** — Too many alerts, team ignores them. Fix: tune thresholds, use severity levels.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (259.1-259.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Monitoring Specialist — Infrastructure | EPS v3.2*
