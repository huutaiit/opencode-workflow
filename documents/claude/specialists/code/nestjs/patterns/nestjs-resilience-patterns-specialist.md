# NestJS Resilience Patterns Specialist — Patterns
# NestJS耐障害パターンスペシャリスト — パターン
# Chuyen Gia Pattern Kha Nang Phuc Hoi NestJS — Pattern

**Version**: 1.0.0
**Technology**: NestJS 10+ Resilience (cockatiel, opossum)
**Aspect**: Resilience Patterns
**Category**: patterns
**Purpose**: Knowledge provider for NestJS resilience — circuit breaker, retry, timeout, bulkhead, rate limiter, fallback, health-based routing

---

## Metadata

```json
{
  "id": "nestjs-resilience-patterns-specialist",
  "technology": "NestJS 10+ Resilience Patterns",
  "aspect": "Resilience Patterns",
  "category": "patterns",
  "subcategory": "nestjs",
  "lines": 380,
  "token_cost": 2300,
  "version": "1.0.0",
  "evidence": [
    "E1: Resilience patterns — circuit breaker, retry, timeout, bulkhead",
    "E2: cockatiel library — TypeScript resilience library for Node.js",
    "E3: Microservice reliability — failure isolation, graceful degradation"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 251.1–251.7 |
| **Directory Pattern** | `src/infrastructure/resilience/` |
| **Dependencies** | cockatiel |
| **When To Use** | Circuit breaker, retry, timeout, bulkhead for external dependency resilience |
| **Source Skeleton** | src/infrastructure/resilience/{concern}.policy.ts |
| **Specialist Type** | code |
| **Purpose** | Resilience patterns — circuit breaker, retry, timeout, fallback |
| **Activation Trigger** | files: **/resilience/**; keywords: circuitBreaker, retry, timeout, fallback, opossum |

---

## Role

You are a **NestJS Resilience Patterns Specialist**. You supply patterns for making NestJS microservices resilient — circuit breakers for external dependencies, retry with backoff, timeout enforcement, bulkhead isolation, and fallback strategies.

---

## Patterns

### Pattern 251.1: Circuit Breaker

**Category**: Core Resilience
**Description**: Stop calling failing dependency — prevent cascade failures.

```typescript
import { CircuitBreakerPolicy, ConsecutiveBreaker, SamplingBreaker } from 'cockatiel';

@Injectable()
export class PaymentGatewayClient {
  private readonly breaker = new CircuitBreakerPolicy(
    new ConsecutiveBreaker(5), // open after 5 consecutive failures
    10_000,                     // half-open after 10 seconds
  );

  async charge(amount: number): Promise<PaymentResult> {
    return this.breaker.execute(async () => {
      const response = await this.httpService.post('/charge', { amount });
      return response.data;
    });
  }
}
```

**Key Points**:
- Open after N consecutive failures — stops wasting resources on dead dependency
- Half-open after timeout — allows single test request
- Close on success in half-open state — dependency recovered
- Throw BrokenCircuitError when open — handle with fallback

---

### Pattern 251.2: Retry with Exponential Backoff

**Category**: Core Resilience
**Description**: Retry transient failures with increasing delays.

```typescript
import { RetryPolicy, ExponentialBackoff } from 'cockatiel';

@Injectable()
export class ExternalApiClient {
  private readonly retry = new RetryPolicy(
    new ExponentialBackoff({
      initial: 200,      // first retry after 200ms
      maxDelay: 5_000,   // cap at 5 seconds
      exponent: 2,       // double each time: 200, 400, 800, 1600, 3200
    }),
    3, // max 3 retries
  );

  async fetchData(id: string): Promise<Data> {
    return this.retry.execute(async () => {
      const response = await this.httpService.get(`/data/${id}`);
      return response.data;
    });
  }
}
```

**Key Points**:
- Only retry transient errors (timeout, 503, connection reset)
- Never retry business errors (400, 404, 422)
- Exponential backoff prevents thundering herd on recovery
- Add jitter for distributed systems: `+ Math.random() * 100`

---

### Pattern 251.3: Timeout

**Category**: Core Resilience
**Description**: Enforce maximum wait time for external calls.

```typescript
import { TimeoutPolicy, TimeoutStrategy } from 'cockatiel';

@Injectable()
export class RiskScoringClient {
  private readonly timeout = new TimeoutPolicy(3_000, TimeoutStrategy.Aggressive);

  async getScore(userId: string): Promise<RiskScore> {
    return this.timeout.execute(async ({ signal }) => {
      const response = await this.httpService.get(`/score/${userId}`, {
        signal, // AbortController signal — cancels HTTP request on timeout
      });
      return response.data;
    });
  }
}
```

**Key Points**:
- Aggressive: cancel immediately on timeout (AbortController)
- Cooperative: signal handler to check for cancellation
- Set timeout < K8s readiness probe interval — prevent probe timeout

---

### Pattern 251.4: Bulkhead (Concurrency Limiter)

**Category**: Advanced Resilience
**Description**: Limit concurrent calls to a dependency — isolate failures.

```typescript
import { BulkheadPolicy } from 'cockatiel';

@Injectable()
export class ReportGenerator {
  private readonly bulkhead = new BulkheadPolicy(5, 10);
  // 5 concurrent executions, 10 queued — reject after

  async generateReport(params: ReportParams): Promise<Report> {
    return this.bulkhead.execute(async () => {
      return this.heavyComputation(params); // CPU-intensive
    });
  }
}
```

---

### Pattern 251.5: Fallback

**Category**: Advanced Resilience
**Description**: Return degraded response when primary fails.

```typescript
@Injectable()
export class ProductCatalogService {
  async getProducts(query: string): Promise<Product[]> {
    try {
      return await this.searchService.search(query); // Elasticsearch
    } catch (error) {
      this.logger.warn('Search service unavailable — falling back to DB');
      return this.productRepo.findByNameLike(query); // DB fallback
    }
  }

  async getRecommendations(userId: string): Promise<Product[]> {
    try {
      return await this.mlService.recommend(userId);
    } catch {
      return this.productRepo.findPopular(10); // static fallback
    }
  }
}
```

---

### Pattern 251.6: Composed Resilience Policy

**Category**: Advanced Resilience
**Description**: Combine retry + circuit breaker + timeout into single policy.

```typescript
import { Policy, wrap } from 'cockatiel';

@Injectable()
export class ResilientHttpClient {
  private readonly policy = wrap(
    Policy.handleAll()
      .retry(3, new ExponentialBackoff({ initial: 200 })),
    new CircuitBreakerPolicy(new ConsecutiveBreaker(5), 10_000),
    new TimeoutPolicy(5_000),
  );

  async request<T>(url: string): Promise<T> {
    return this.policy.execute(async ({ signal }) => {
      const response = await this.httpService.get(url, { signal });
      return response.data;
    });
  }
}
```

**Key Points**:
- Order matters: outer policy wraps inner: retry(circuitBreaker(timeout(call)))
- Timeout on each attempt, circuit breaker across attempts, retry the whole thing
- Single `policy.execute()` call — clean abstraction

---

### Pattern 251.7: Health-Based Routing

**Category**: Advanced Resilience
**Description**: Route to healthy instances based on dependency status.

```typescript
@Injectable()
export class ServiceRegistry {
  private readonly healthStatus = new Map<string, { healthy: boolean; lastCheck: Date }>();

  async getHealthyEndpoint(service: string): Promise<string> {
    const endpoints = this.config.get(`services.${service}.endpoints`);
    for (const endpoint of endpoints) {
      const status = this.healthStatus.get(endpoint);
      if (!status || status.healthy) return endpoint;
    }
    throw new ServiceUnavailableException(`All ${service} endpoints unhealthy`);
  }
}
```

---

### Pattern 251.8: Bulkhead Isolation per Service

**When**: Isolate failures per downstream service — one slow service shouldn't exhaust all connections.

```typescript
import pLimit from 'p-limit';

@Injectable()
export class BulkheadService {
  // Separate semaphore per downstream service
  private limits = new Map<string, ReturnType<typeof pLimit>>();

  getLimit(service: string, concurrency: number = 10): ReturnType<typeof pLimit> {
    if (!this.limits.has(service)) {
      this.limits.set(service, pLimit(concurrency));
    }
    return this.limits.get(service)!;
  }

  async callWithBulkhead<T>(service: string, fn: () => Promise<T>): Promise<T> {
    const limit = this.getLimit(service);
    return limit(fn); // queued if concurrency exceeded
  }
}

// Usage: isolate payment service (max 5 concurrent) from user service (max 20)
await this.bulkhead.callWithBulkhead('payment-service', () => this.paymentClient.charge(amount));
await this.bulkhead.callWithBulkhead('user-service', () => this.userClient.getProfile(userId));
```

---

### Pattern 251.9: Timeout Cascade Prevention

**When**: Upstream timeout MUST be > downstream timeout to prevent cascading timeouts.

```typescript
// Rule: API Gateway (30s) > Service (20s) > DB query (10s) > External API (5s)
//
// ❌ BAD: Gateway 10s, Service 15s → service still running after gateway returns 504
// ✅ GOOD: Gateway 30s > Service 20s > DB 10s → clean timeout propagation

// NestJS interceptor for timeout enforcement
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(@Inject('TIMEOUT_MS') private timeoutMs: number) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException(`Operation timed out after ${this.timeoutMs}ms`);
        }
        throw err;
      }),
    );
  }
}

// Per-route timeout via decorator
@UseInterceptors(new TimeoutInterceptor(5000)) // 5s for this endpoint
@Get('external-data')
getData() { ... }
```

---

### Pattern 251.10: Fallback Strategy Chain

**When**: Multiple fallback levels — primary → secondary → cache → default.

```typescript
@Injectable()
export class FallbackChain<T> {
  async execute(strategies: Array<{ name: string; fn: () => Promise<T> }>): Promise<T> {
    for (const strategy of strategies) {
      try {
        const result = await strategy.fn();
        this.logger.log(`${strategy.name}: SUCCESS`);
        return result;
      } catch (error) {
        this.logger.warn(`${strategy.name}: FAILED — ${error.message}`);
      }
    }
    throw new ServiceUnavailableException('All fallback strategies exhausted');
  }
}

// Usage: primary API → replica API → Redis cache → static default
const price = await this.fallback.execute([
  { name: 'primary', fn: () => this.priceApi.getPrice(symbol) },
  { name: 'replica', fn: () => this.priceApiReplica.getPrice(symbol) },
  { name: 'cache', fn: () => this.redis.get(`price:${symbol}`) },
  { name: 'default', fn: async () => ({ price: 0, stale: true }) },
]);
```

---

## Best Practices

### Policy Selection
| Pattern | When to Use |
|---------|-------------|
| Retry | Transient errors (timeout, 503) |
| Circuit Breaker | Dependency frequently failing |
| Timeout | External call with unpredictable latency |
| Bulkhead | CPU-intensive or limited-resource operations |
| Fallback | Degraded experience acceptable |

### Configuration
- Retry: max 3 attempts, exponential backoff starting at 200ms
- Circuit breaker: open after 5 failures, half-open after 10s
- Timeout: 3-5s for API calls, 30s for report generation
- Bulkhead: match downstream capacity (if downstream handles 10 concurrent, limit to 10)

---

## Abnormal Case Patterns

1. **Retry amplifies load** — Retrying during outage overwhelms dependency on recovery. Fix: add circuit breaker + jitter.
2. **Timeout too long** — 30s timeout blocks thread pool. Fix: set timeout ≤ 5s for API calls.
3. **Circuit breaker too sensitive** — Opens on 1 failure. Fix: require 3-5 consecutive failures.
4. **Fallback hides failure** — Clients never know dependency is down. Fix: log and metric on fallback usage.
5. **Bulkhead queue infinite** — No queue limit causes memory growth. Fix: set max queue size, reject excess.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (251.1-251.7)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Resilience Patterns Specialist — Patterns | EPS v3.2*
