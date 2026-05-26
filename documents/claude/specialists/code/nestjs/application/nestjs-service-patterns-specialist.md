# NestJS Service Patterns Specialist — Application
# NestJSサービスパターンスペシャリスト — アプリケーション
# Chuyen Gia Mau Dich Vu NestJS — Ung Dung

**Version**: 1.0.0
**Technology**: NestJS 10+ Application Services
**Aspect**: Service Layer Patterns
**Category**: application
**Purpose**: Knowledge provider for NestJS service layer — @Injectable services, transaction boundaries, DI scopes, service composition

---

## Metadata

```json
{
  "id": "nestjs-service-patterns-specialist",
  "technology": "NestJS 10+ Application Services",
  "aspect": "Service Layer Patterns",
  "category": "application",
  "subcategory": "nestjs",
  "lines": 420,
  "token_cost": 2500,
  "version": "1.0.0",
  "evidence": [
    "E1: NestJS providers — @Injectable, service lifecycle, DI scopes",
    "E2: Clean architecture — application service vs domain service boundary",
    "E5: p2plend services — real-world NestJS service composition patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 270.1–270.8 |
| **Directory Pattern** | `src/application/services/` |
| **Naming Convention** | `{feature}.service.ts`, `{action}.handler.ts` |
| **Imports From** | Domain (entities, port interfaces), Infrastructure (via DI tokens) |
| **Imported By** | Presentation (controllers, resolvers) |
| **Cannot Import** | Presentation, Infrastructure directly (only via ports) |
| **Dependencies** | @nestjs/common |
| **When To Use** | Application layer — use cases, services, mappers in clean architecture |
| **Source Skeleton** | src/application/{feature}/{action}.use-case.ts, src/application/{feature}/{entity}.mapper.ts |
| **Specialist Type** | code |
| **Purpose** | Application service patterns — orchestration, transaction boundaries, service composition |
| **Activation Trigger** | files: **/services/**/*.ts; keywords: service, injectable, orchestration, transaction |

> **See also**: nestjs-use-case-orchestration (245) for command/query handler patterns

---

## Role

You are a **NestJS Service Patterns Specialist**. You supply patterns for designing application-layer services in NestJS — transaction management, service composition, domain vs application service distinction, and error handling boundaries.

**Used by**: Any code agent building NestJS application services
**Not used by**: Agents working only on domain entities or infrastructure adapters

---

## Patterns

### Pattern 270.1: Application Service

**Category**: Service Fundamentals
**Description**: Orchestrates use cases by coordinating domain objects and infrastructure ports.

```typescript
@Injectable()
export class LoanApplicationService {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepo: LoanRepositoryPort,
    @Inject(RISK_SERVICE) private readonly riskService: RiskServicePort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async applyForLoan(dto: ApplyLoanDto): Promise<Loan> {
    const riskScore = await this.riskService.evaluate(dto.borrowerId);
    const loan = Loan.create(dto.borrowerId, dto.amount, riskScore);
    const saved = await this.loanRepo.save(loan);
    this.eventEmitter.emit('loan.applied', { loanId: saved.id });
    return saved;
  }
}
```

**Key Points**:
- Application service = orchestrator — coordinates, does NOT contain business rules
- Business rules live in Domain entities/services
- Inject ports (interfaces), not concrete implementations
- One public method per use case (Single Responsibility)

---

### Pattern 243.2: Domain Service vs Application Service

**Category**: Service Fundamentals
**Description**: Clear boundary between domain logic and orchestration.

```typescript
// Domain service — pure business logic, no framework deps
export class LoanEligibilityService {
  evaluate(borrower: Borrower, amount: number, riskScore: number): EligibilityResult {
    if (riskScore < 300) return EligibilityResult.rejected('Low credit score');
    if (amount > borrower.maxLoanAmount) return EligibilityResult.rejected('Amount exceeds limit');
    return EligibilityResult.approved(this.calculateRate(riskScore));
  }
  private calculateRate(score: number): number { return score > 700 ? 0.05 : 0.12; }
}

// Application service — orchestrates domain + infrastructure
@Injectable()
export class ProcessLoanService {
  constructor(
    private readonly eligibility: LoanEligibilityService,
    @Inject(BORROWER_REPO) private readonly borrowerRepo: BorrowerRepositoryPort,
  ) {}

  async process(dto: ProcessLoanDto): Promise<LoanDecision> {
    const borrower = await this.borrowerRepo.findById(dto.borrowerId);
    return this.eligibility.evaluate(borrower, dto.amount, dto.riskScore);
  }
}
```

**Key Points**:
- Domain service: pure TypeScript, no @Injectable, no DI framework
- Application service: @Injectable, coordinates domain + infra via ports
- Domain service can be tested without NestJS TestingModule

---

### Pattern 243.3: Transaction Boundaries

**Category**: Service Fundamentals
**Description**: Manage database transactions at the application service level.

```typescript
@Injectable()
export class TransferService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ACCOUNT_REPO) private readonly accountRepo: AccountRepositoryPort,
  ) {}

  async transfer(from: string, to: string, amount: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const sender = await this.accountRepo.findById(from, queryRunner.manager);
      const receiver = await this.accountRepo.findById(to, queryRunner.manager);
      sender.debit(amount);
      receiver.credit(amount);
      await this.accountRepo.save(sender, queryRunner.manager);
      await this.accountRepo.save(receiver, queryRunner.manager);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Key Points**:
- Transaction boundary = application service responsibility (not controller, not repository)
- Pass EntityManager to repository methods for transactional consistency
- Always rollback on error, release queryRunner in finally

---

### Pattern 243.4: Service Composition

**Category**: Service Fundamentals
**Description**: Compose multiple services for complex workflows.

```typescript
@Injectable()
export class OrderFulfillmentService {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  async fulfill(orderId: string): Promise<FulfillmentResult> {
    const order = await this.orderService.findById(orderId);
    await this.inventoryService.reserve(order.items);
    const payment = await this.paymentService.charge(order.total, order.paymentMethod);
    await this.orderService.markPaid(orderId, payment.transactionId);
    await this.notificationService.sendOrderConfirmation(order);
    return FulfillmentResult.success(orderId);
  }
}
```

**Key Points**:
- Compose services, don't create god-service — each service owns one concern
- If >5 injected services → service has too many responsibilities, split it
- Consider saga pattern for distributed transactions across services

---

### Pattern 243.5: Error Handling in Services

**Category**: Advanced Services
**Description**: Transform infrastructure errors into domain exceptions.

```typescript
@Injectable()
export class PaymentService {
  async charge(amount: number, method: PaymentMethod): Promise<PaymentResult> {
    try {
      const result = await this.paymentGateway.process(amount, method);
      return PaymentResult.success(result.transactionId);
    } catch (error) {
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new InsufficientFundsException(amount);
      }
      if (error.code === 'CARD_EXPIRED') {
        throw new PaymentMethodExpiredException(method.id);
      }
      throw new PaymentGatewayException('Unexpected payment error', error);
    }
  }
}
```

**Key Points**:
- Catch infrastructure errors, throw domain exceptions
- Never let raw DB/HTTP errors propagate to presentation layer
- Log original error for debugging, throw clean domain error for consumers

---

### Pattern 243.6: Retry and Idempotency

**Category**: Advanced Services
**Description**: Handle transient failures with retry logic.

```typescript
@Injectable()
export class ExternalApiService {
  async callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryable(error)) throw error;
        await this.delay(attempt * 1000); // exponential backoff
      }
    }
    throw new Error('Unreachable');
  }

  private isRetryable(error: any): boolean {
    return [408, 429, 500, 502, 503, 504].includes(error.status);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### Pattern 243.7: Service Scoping

**Category**: Advanced Services
**Description**: Singleton vs request-scoped services.

```typescript
// Default: singleton — one instance for all requests
@Injectable()
export class CacheService { /* stateless, shared */ }

// Request-scoped: per-request state
@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(@Inject(REQUEST) private request: Request) {}

  get userId(): string { return this.request.user?.id; }
  log(action: string) { /* log with userId context */ }
}
```

**Key Points**:
- 99% of services should be DEFAULT (singleton) — stateless
- REQUEST scope only for request-specific context (user, tenant, correlation ID)
- Scope propagates up: REQUEST-scoped service forces consumers to be REQUEST-scoped

---

### Pattern 270.8: Service Testing

**Category**: Advanced Services
**Description**: Unit test services with mocked dependencies.

```typescript
describe('LoanApplicationService', () => {
  let service: LoanApplicationService;
  let mockLoanRepo: jest.Mocked<LoanRepositoryPort>;
  let mockRiskService: jest.Mocked<RiskServicePort>;

  beforeEach(async () => {
    mockLoanRepo = { save: jest.fn(), findById: jest.fn() };
    mockRiskService = { evaluate: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        LoanApplicationService,
        { provide: LOAN_REPOSITORY, useValue: mockLoanRepo },
        { provide: RISK_SERVICE, useValue: mockRiskService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(LoanApplicationService);
  });

  it('should create loan with risk score', async () => {
    mockRiskService.evaluate.mockResolvedValue(750);
    mockLoanRepo.save.mockResolvedValue(mockLoan);
    const result = await service.applyForLoan(dto);
    expect(result.id).toBeDefined();
    expect(mockRiskService.evaluate).toHaveBeenCalledWith(dto.borrowerId);
  });
});
```

---

## Best Practices

### Design
- Application service = thin orchestrator — domain logic in entities/domain services
- One method per use case — avoid fat services with 10+ methods
- Inject ports (interfaces), never concrete infrastructure classes

### Transactions
- Transaction boundary at application service level
- Never start transactions in controllers or repositories
- Use queryRunner pattern for multi-table operations

### Error Handling
- Catch infra errors → throw domain exceptions
- Never swallow errors silently
- Log original error, throw clean domain exception

---

## Abnormal Case Patterns

1. **God service** — Service with 15+ methods covering multiple domains. Fix: split by bounded context.

2. **Business logic in service** — Validation, calculation in application service. Fix: move to domain entity/service.

3. **Direct infra access** — Service imports TypeORM Repository instead of port. Fix: use injection token.

4. **Missing transaction rollback** — Catch without rollback. Fix: always rollback in catch, release in finally.

5. **Scope bubble-up cascade** — REQUEST-scoped service injected everywhere. Fix: minimize REQUEST scope usage.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (270.1-270.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Service Patterns Specialist — Application | EPS v3.2*
