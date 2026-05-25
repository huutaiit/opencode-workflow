# NestJS BFF Orchestration Specialist — Orchestration
# NestJS BFFオーケストレーションスペシャリスト — オーケストレーション
# Chuyen Gia Dieu Phoi BFF NestJS — Dieu Phoi

**Version**: 1.0.0
**Technology**: NestJS 10+ BFF Orchestration
**Aspect**: BFF Orchestration
**Category**: orchestration
**Purpose**: Knowledge provider for NestJS BFF orchestration — aggregate models, port interfaces, parallel service calls, error aggregation, BFF caching, circuit breaker

---

## Metadata

```json
{
  "id": "nestjs-bff-orchestration-specialist",
  "technology": "NestJS 10+ BFF Orchestration",
  "aspect": "BFF Orchestration",
  "category": "orchestration",
  "subcategory": "nestjs",
  "lines": 240,
  "token_cost": 1500,
  "version": "1.0.0",
  "evidence": [
    "E1: 6 architecture rules — BFF use cases in Application layer, ports in Domain",
    "E2: Clean architecture — use cases depend on port interfaces, not concrete gRPC clients",
    "E5: p2plend BFF architecture — 4 BFF services orchestrating backend microservices"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application, Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 216.1–216.8 |
| **Directory Pattern** | `src/application/`, `src/presentation/controllers/` |
| **Naming Convention** | `{action}-{entity}.use-case.ts`, `{entity}.aggregate.ts`, `{service}-client.port.ts` |
| **Imports From** | Domain (aggregate models, port interfaces), Application (other use cases for composition) |
| **Imported By** | Presentation (controllers invoke use cases), Infrastructure (adapters implement port interfaces) |
| **Cannot Import** | Infrastructure directly (BFF use cases must use port interfaces, not concrete gRPC clients) |
| **Dependencies** | @nestjs/axios, @nestjs/microservices |
| **When To Use** | Backend-for-Frontend — aggregate multiple service responses for client |
| **Source Skeleton** | src/application/{feature}/{feature}-bff.service.ts, src/presentation/controllers/{feature}-bff.controller.ts |
| **Specialist Type** | code |
| **Purpose** | Backend-for-Frontend — API composition, response aggregation, client-specific endpoints |
| **Activation Trigger** | files: **/bff/**; keywords: bff, apiComposition, aggregate, clientSpecific |

---

## Role

You are a **NestJS BFF Orchestration Specialist**. Your responsibility is to provide BFF (Backend-for-Frontend) orchestration patterns for NestJS microservice projects following clean architecture. You supply patterns for aggregate models, port interfaces, parallel service calls, error aggregation, caching, use case composition, response mapping, and circuit breaker integration.

**Used by**: Any code agent working with NestJS BFF services that aggregate multiple backend microservices
**Not used by**: Non-NestJS stacks, single-service backends without BFF layer

---

## Patterns

### Pattern 216.1–216.4: BFF Core Patterns (HIGH)

```
216.1 Aggregate model: Combine data from multiple backend services into single response.
      Define aggregate in Domain layer — pure data shape, no infrastructure deps.
```

```typescript
export class LoanDashboardAggregate {
  constructor(
    public readonly loan: LoanSummary,
    public readonly borrower: BorrowerProfile,
    public readonly payments: PaymentHistory[],
    public readonly riskScore: number | null,
  ) {}
  static create(loan: LoanSummary, borrower: BorrowerProfile,
    payments: PaymentHistory[], riskScore: number | null,
  ): LoanDashboardAggregate {
    return new LoanDashboardAggregate(loan, borrower, payments, riskScore);
  }
}
```

```
216.2 Port interface: Define {Service}ClientPort in Domain, implement with gRPC in Infrastructure.
      Invert dependency — use case depends on abstraction, not concrete client.
```

```typescript
// Domain layer — port interface
export interface ILoanServiceClientPort {
  findLoanById(id: string): Promise<LoanSummary>;
  findLoansByBorrower(borrowerId: string): Promise<LoanSummary[]>;
}

// Infrastructure layer — gRPC adapter
@Injectable()
export class LoanGrpcClientAdapter implements ILoanServiceClientPort {
  constructor(@Inject('LOAN_PACKAGE') private client: ClientGrpc) {}
  async findLoanById(id: string): Promise<LoanSummary> {
    const svc = this.client.getService<LoanGrpcService>('LoanService');
    return lastValueFrom(svc.findById({ id }));
  }
}
```

```
216.3 Parallel service calls: Promise.allSettled for concurrent backend queries.
      Fetch from multiple services simultaneously, handle partial failures gracefully.
```

```typescript
@Injectable()
export class GetLoanDashboardUseCase {
  constructor(
    private loanClient: ILoanServiceClientPort,
    private borrowerClient: IBorrowerServiceClientPort,
    private paymentClient: IPaymentServiceClientPort,
  ) {}
  async execute(loanId: string): Promise<LoanDashboardAggregate> {
    const [loan, borrower, payments] = await Promise.allSettled([
      this.loanClient.findLoanById(loanId),
      this.borrowerClient.findByLoanId(loanId),
      this.paymentClient.findByLoanId(loanId),
    ]);
    return this.buildAggregate(loan, borrower, payments);
  }
}
```

```
216.4 Error aggregation: Collect partial failures, return available data with error details.
      Never fail entirely if one backend service is down — return what is available.
```

```typescript
private buildAggregate(
  ...results: PromiseSettledResult<any>[]
): LoanDashboardAggregate & { errors: string[] } {
  const errors: string[] = [];
  const extract = <T>(r: PromiseSettledResult<T>, name: string): T | null => {
    if (r.status === 'fulfilled') return r.value;
    errors.push(`${name}: ${r.reason.message}`);
    return null;
  };
  return {
    ...LoanDashboardAggregate.create(
      extract(results[0], 'loan'), extract(results[1], 'borrower'),
      extract(results[2], 'payments') ?? [], null,
    ),
    errors,
  };
}
```

### Pattern 216.5–216.8: Advanced BFF Patterns (MEDIUM-HIGH)

```
216.5 BFF caching: Cache aggregate results in Redis with appropriate TTL.
      Reduce backend load for frequently accessed aggregates.
```

```typescript
@Injectable()
export class CachedLoanDashboardUseCase {
  constructor(
    private inner: GetLoanDashboardUseCase,
    private cache: ICachePort,
  ) {}
  async execute(loanId: string): Promise<LoanDashboardAggregate> {
    const cacheKey = `dashboard:${loanId}`;
    const cached = await this.cache.get<LoanDashboardAggregate>(cacheKey);
    if (cached) return cached;
    const result = await this.inner.execute(loanId);
    await this.cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }
}
```

```
216.6 Use case composition: One use case calls others for complex orchestration flows.
      Compose smaller use cases into larger workflows, maintain single responsibility.
```

```typescript
@Injectable()
export class ProcessLoanApplicationUseCase {
  constructor(
    private validateBorrower: ValidateBorrowerUseCase,
    private assessRisk: AssessRiskUseCase,
    private createLoan: CreateLoanUseCase,
  ) {}
  async execute(input: LoanApplicationInput): Promise<LoanResult> {
    const borrower = await this.validateBorrower.execute(input.borrowerId);
    const risk = await this.assessRisk.execute(borrower);
    return this.createLoan.execute({ ...input, riskScore: risk.score });
  }
}
```

```
216.7 Response mapping: Map backend DTOs to frontend-optimized response shapes.
      BFF transforms raw backend data into shapes the frontend expects.
```

```typescript
@Injectable()
export class LoanResponseMapper {
  toFrontendResponse(aggregate: LoanDashboardAggregate): LoanDashboardDto {
    return {
      id: aggregate.loan.id,
      displayAmount: `${aggregate.loan.currency} ${aggregate.loan.amount.toLocaleString()}`,
      borrowerName: `${aggregate.borrower.lastName} ${aggregate.borrower.firstName}`,
      paymentCount: aggregate.payments.length,
      nextPaymentDate: aggregate.payments[0]?.dueDate ?? null,
    };
  }
}
```

```
216.8 Circuit breaker: Graceful degradation when backend service is unavailable.
      Wrap service calls with circuit breaker to prevent cascade failures.
```

```typescript
@Injectable()
export class CircuitBreakerClientDecorator implements ILoanServiceClientPort {
  private breaker: CircuitBreaker;
  constructor(private inner: ILoanServiceClientPort) {
    this.breaker = new CircuitBreaker(
      (method: string, ...args: any[]) => this.inner[method](...args),
      { timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 30000 },
    );
  }
  async findLoanById(id: string): Promise<LoanSummary> {
    return this.breaker.fire('findLoanById', id);
  }
}
```

---

## Best Practices

### Orchestration Design
- Use `Promise.allSettled` over `Promise.all` for parallel service calls — allows partial success responses instead of failing everything on one error
- Define explicit timeout per downstream service based on its SLA, not a single global timeout
- Keep BFF stateless — store no session data in the BFF layer; delegate state to backend services or external stores
- Use the adapter/port pattern to abstract downstream service communication, enabling easy swapping of HTTP/gRPC/message transports

### Error Handling
- Implement circuit breaker per downstream service to prevent cascade failures across the aggregation layer
- Return partial responses with degradation metadata (e.g., `{ data: ..., degraded: ['pricing-service'] }`) rather than failing the entire request
- Map all downstream errors to BFF-specific error codes — never expose internal service error messages or stack traces to the frontend
- Log the full downstream error internally with correlation ID for debugging

### Performance
- Cache aggregated responses at the BFF level with short TTL for frequently accessed compositions
- Use request collapsing (deduplication) when multiple frontend components request the same backend data within a single page load
- Implement response streaming for large aggregated payloads to reduce time-to-first-byte

### Response Shaping
- Transform backend domain models into frontend-optimized view models — the BFF owns the API contract with the frontend
- Strip internal IDs, audit fields, and infrastructure metadata before sending responses
- Version BFF endpoints independently from backend service versions to decouple frontend release cycles

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Sequential service calls | Total latency = sum of all calls; unacceptable for multi-service aggregation | Use `Promise.allSettled` for independent calls; only sequence truly dependent calls |
| No per-service timeout | One slow service blocks the entire aggregation response indefinitely | Set individual `AbortController` timeout per service call (e.g., 2s for cache, 5s for DB services) |
| Exposing internal service IDs | Frontend becomes coupled to backend identity scheme; security risk | Map internal IDs to external-facing identifiers or UUIDs in the BFF response shaping layer |
| Business logic in BFF | BFF becomes a monolith; duplicates logic that belongs in domain services | BFF should only orchestrate, transform, and aggregate — push all business rules to domain services |
| No circuit breaker | One failing service causes timeout cascade across all BFF endpoints | Implement circuit breaker per downstream service with fallback to cached/default responses |

## Testing Patterns

### Test Parallel Calls with Promise.allSettled
```typescript
describe('BffOrchestrator', () => {
  it('should aggregate results from parallel service calls', async () => {
    userService.getProfile.mockResolvedValue({ id: 1, name: 'Test' });
    orderService.getRecent.mockResolvedValue([{ orderId: 'A1' }]);
    const result = await orchestrator.getDashboard(1);
    expect(result.profile).toBeDefined();
    expect(result.recentOrders).toHaveLength(1);
  });
});
```

### Test Partial Failure Handling
```typescript
it('should return partial response when one service fails', async () => {
  userService.getProfile.mockResolvedValue({ id: 1, name: 'Test' });
  orderService.getRecent.mockRejectedValue(new Error('Service unavailable'));
  const result = await orchestrator.getDashboard(1);
  expect(result.profile).toBeDefined();
  expect(result.recentOrders).toBeNull();
  expect(result.degraded).toContain('order-service');
});
```

### Test Circuit Breaker Activation
```typescript
it('should open circuit after threshold failures', async () => {
  for (let i = 0; i < 5; i++) {
    pricingService.getQuote.mockRejectedValue(new Error('timeout'));
    await orchestrator.getQuote('product-1').catch(() => {});
  }
  const result = await orchestrator.getQuote('product-1');
  expect(result).toEqual({ fallback: true, message: 'Pricing unavailable' });
  expect(pricingService.getQuote).toHaveBeenCalledTimes(5); // circuit open, no new call
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **All backend services timeout simultaneously** — BFF returns 504 to frontend. Fix: Set per-service timeout limits, return cached stale data when available, add `Retry-After` header.

2. **Aggregate cache returns stale data after backend update** — User sees outdated information. Fix: Implement cache invalidation via event bus (backend publishes change event, BFF invalidates cache key).

3. **Port interface mismatch after backend proto update** — gRPC adapter breaks at runtime, not compile time. Fix: Generate TypeScript types from proto files, run proto compatibility check in CI pipeline.

4. **Use case composition creates implicit transaction boundary** — Partial execution leaves inconsistent state across services. Fix: Implement saga pattern with compensating actions, or accept eventual consistency with idempotent retries.

5. **Response shaping leaks internal fields** — Internal audit timestamps, database IDs, or infrastructure metadata exposed to frontend. Fix: Define explicit DTO/view-model classes for BFF responses; use `class-transformer` `@Exclude()` on all non-public fields and whitelist with `@Expose()`.

6. **N+1 service calls in aggregation** — BFF fetches list from Service A, then calls Service B once per item for enrichment. Fix: Batch enrichment calls using bulk/batch endpoints on Service B; if unavailable, use `DataLoader` pattern with request-scoped batching.

7. **Auth token not propagated to downstream services** — BFF makes authenticated request but downstream rejects with 401. Fix: Extract bearer token from incoming request and attach to all outgoing service calls via a shared HTTP interceptor; use `AsyncLocalStorage` to carry auth context.

8. **BFF becomes a monolith** — Business logic, validation, and data transformation accumulate in BFF over time. Fix: Enforce BFF responsibility boundary in code review — BFF may only orchestrate, transform shape, and handle partial failure. Move any domain logic back to owning microservice.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (216.1-216.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS BFF Orchestration Specialist — Orchestration | EPS v3.2*
