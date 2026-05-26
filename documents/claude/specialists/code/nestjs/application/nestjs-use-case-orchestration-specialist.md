# NestJS Use Case Orchestration Specialist — Application
# NestJSユースケースオーケストレーションスペシャリスト — アプリケーション
# Chuyen Gia Dieu Phoi Use Case NestJS — Ung Dung

**Version**: 1.0.0
**Technology**: NestJS 10+ Use Cases
**Aspect**: Use Case / Command-Query Orchestration
**Category**: application
**Purpose**: Knowledge provider for clean architecture use cases — command/query pattern, input/output ports, orchestration flows

---

## Metadata

```json
{
  "id": "nestjs-use-case-orchestration-specialist",
  "technology": "NestJS 10+ Use Cases",
  "aspect": "Use Case Orchestration",
  "category": "application",
  "subcategory": "nestjs",
  "lines": 370,
  "token_cost": 2200,
  "version": "1.0.0",
  "evidence": [
    "E1: Clean architecture — use case layer between controller and domain",
    "E2: Command/Query separation — distinct classes for reads and writes",
    "E5: p2plend use cases — loan application, risk evaluation, payment processing"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Variant** | ALL |
| **Pattern Numbers** | 272.1–272.7 |
| **Directory Pattern** | `src/application/{feature}/` |
| **Naming Convention** | `{action}-{entity}.use-case.ts`, `{entity}.port.ts` |
| **Imports From** | Domain (entities, ports, domain services) |
| **Imported By** | Presentation (controllers, resolvers) |
| **Cannot Import** | Presentation, Infrastructure directly |
| **Dependencies** | @nestjs/common |
| **When To Use** | Application layer — use cases, services, mappers in clean architecture |
| **Source Skeleton** | src/application/{feature}/{action}.use-case.ts, src/application/{feature}/{entity}.mapper.ts |
| **Specialist Type** | code |
| **Purpose** | Use case orchestration — single-responsibility use cases, execute pattern, DI wiring |
| **Activation Trigger** | files: **/*.use-case.ts; keywords: useCase, execute, orchestration, injectable |

> **See also**: nestjs-cqrs (261) for @nestjs/cqrs module with CommandBus/QueryBus

---

## Role

You are a **NestJS Use Case Orchestration Specialist**. You supply patterns for structuring application-layer use cases following clean architecture — each use case is a single class with one `execute()` method.

**Used by**: Any code agent building NestJS application use cases
**Not used by**: Non-NestJS stacks, simple CRUD without clean architecture

---

## Patterns

### Pattern 272.1: Use Case Class

**Category**: Use Case Fundamentals
**Description**: One class per use case, one execute() method.

```typescript
// application/lending/use-cases/apply-for-loan.use-case.ts
@Injectable()
export class ApplyForLoanUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepo: LoanRepositoryPort,
    private readonly eligibilityService: LoanEligibilityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ApplyLoanInput): Promise<ApplyLoanOutput> {
    const eligibility = this.eligibilityService.evaluate(input.borrowerId, input.amount);
    if (!eligibility.approved) {
      throw new LoanNotEligibleException(input.borrowerId, eligibility.reason);
    }
    const loan = Loan.create(input.borrowerId, input.amount, eligibility.rate);
    const saved = await this.loanRepo.save(loan);
    this.eventEmitter.emit('loan.applied', { loanId: saved.id });
    return { loanId: saved.id, status: saved.status, rate: eligibility.rate };
  }
}
```

**Key Points**:
- One use case = one class = one responsibility
- `execute(input): Promise<output>` — consistent interface
- Input/Output are plain TypeScript interfaces (not DTOs, not entities)
- Controller calls `useCase.execute(input)` — nothing more

---

### Pattern 245.2: Input/Output Ports

**Category**: Use Case Fundamentals
**Description**: Typed contracts for use case boundaries.

```typescript
// application/lending/ports/apply-loan.port.ts
export interface ApplyLoanInput {
  borrowerId: string;
  amount: number;
  termMonths: number;
  purpose: string;
}

export interface ApplyLoanOutput {
  loanId: string;
  status: LoanStatus;
  rate: number;
}

// Repository port (driven port)
export const LOAN_REPOSITORY = Symbol('LOAN_REPOSITORY');
export interface LoanRepositoryPort {
  save(loan: Loan): Promise<Loan>;
  findById(id: string): Promise<Loan | null>;
  findByBorrower(borrowerId: string): Promise<Loan[]>;
}
```

**Key Points**:
- Input/Output are NOT DTOs — they're application-level contracts
- Controller maps DTO → Input, Output → ResponseDTO
- Repository port defined in application or domain layer, implemented in infrastructure

---

### Pattern 245.3: Command Use Case (Write)

**Category**: Use Case Fundamentals
**Description**: Use cases that mutate state.

```typescript
@Injectable()
export class ApproveLoanUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepo: LoanRepositoryPort,
    private readonly notificationService: NotificationServicePort,
  ) {}

  async execute(input: { loanId: string; approvedBy: string }): Promise<void> {
    const loan = await this.loanRepo.findById(input.loanId);
    if (!loan) throw new EntityNotFoundException('Loan', input.loanId);
    loan.approve(input.approvedBy); // domain method — validates state transition
    await this.loanRepo.save(loan);
    await this.notificationService.sendApprovalNotice(loan.borrowerId, loan.id);
  }
}
```

---

### Pattern 245.4: Query Use Case (Read)

**Category**: Use Case Fundamentals
**Description**: Use cases that retrieve data without side effects.

```typescript
@Injectable()
export class GetLoanDetailsUseCase {
  constructor(
    @Inject(LOAN_REPOSITORY) private readonly loanRepo: LoanRepositoryPort,
  ) {}

  async execute(loanId: string): Promise<LoanDetailsOutput> {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) throw new EntityNotFoundException('Loan', loanId);
    return {
      id: loan.id,
      status: loan.status,
      amount: loan.amount.toNumber(),
      term: loan.termMonths,
      borrowerName: loan.borrower.fullName,
      repaymentSchedule: loan.schedule.toSummary(),
    };
  }
}
```

**Key Points**:
- Query use cases: read-only, no events emitted, no state changes
- Can be optimized: skip domain object hydration, query directly if performance critical
- Separate from command use cases for CQRS compatibility

---

### Pattern 245.5: Orchestration Flow

**Category**: Advanced Use Cases
**Description**: Multi-step workflow with error compensation.

```typescript
@Injectable()
export class ProcessPaymentUseCase {
  async execute(input: ProcessPaymentInput): Promise<PaymentOutput> {
    // Step 1: Validate
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) throw new EntityNotFoundException('Order', input.orderId);

    // Step 2: Charge
    let paymentResult: PaymentResult;
    try {
      paymentResult = await this.paymentGateway.charge(order.total, input.paymentMethod);
    } catch (error) {
      throw new PaymentFailedException(input.orderId, error.message);
    }

    // Step 3: Update order
    order.markPaid(paymentResult.transactionId);
    await this.orderRepo.save(order);

    // Step 4: Emit event
    this.eventEmitter.emit('payment.completed', { orderId: order.id });

    return { transactionId: paymentResult.transactionId, status: 'PAID' };
  }
}
```

**Key Points**:
- Steps in sequence — if step N fails, earlier steps may need compensation
- For cross-service orchestration → use saga pattern (see domain-events-saga 227)
- Log each step for debugging long-running workflows

---

### Pattern 245.6: Use Case with Authorization

**Category**: Advanced Use Cases
**Description**: Embed authorization checks in use case.

```typescript
@Injectable()
export class CancelLoanUseCase {
  async execute(input: { loanId: string; userId: string; userRole: string }): Promise<void> {
    const loan = await this.loanRepo.findById(input.loanId);
    if (!loan) throw new EntityNotFoundException('Loan', input.loanId);

    // Authorization: only borrower or admin can cancel
    if (loan.borrowerId !== input.userId && input.userRole !== 'admin') {
      throw new ForbiddenActionException('cancel', 'loan', input.loanId);
    }

    loan.cancel(); // domain validates state transition
    await this.loanRepo.save(loan);
  }
}
```

---

### Pattern 272.7: Use Case Registration

**Category**: Advanced Use Cases
**Description**: Register use cases in NestJS module.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([LoanEntity])],
  providers: [
    // Use cases
    ApplyForLoanUseCase,
    ApproveLoanUseCase,
    GetLoanDetailsUseCase,
    CancelLoanUseCase,
    // Domain services
    LoanEligibilityService,
    // Infrastructure adapters (bound to ports)
    { provide: LOAN_REPOSITORY, useClass: TypeOrmLoanRepository },
  ],
  controllers: [LoanController],
  exports: [GetLoanDetailsUseCase], // for cross-module access
})
export class LendingModule {}
```

---

## Best Practices

### Design
- One file per use case — never combine create + update + delete in one class
- Use case naming: `{Verb}{Noun}UseCase` — ApplyForLoan, ApproveLoan, GetLoanDetails
- execute() signature: `execute(input): Promise<output>` — consistent across all use cases

### Layer Rules
- Use case receives plain input (not DTO, not entity)
- Use case returns plain output (not entity, not HTTP response)
- Controller maps: DTO → Input, Output → ResponseDTO

---

## Testing Patterns

```typescript
describe('ApplyForLoanUseCase', () => {
  it('should reject ineligible borrower', async () => {
    mockEligibility.evaluate.mockReturnValue({ approved: false, reason: 'Low score' });
    await expect(useCase.execute(input)).rejects.toThrow(LoanNotEligibleException);
    expect(mockLoanRepo.save).not.toHaveBeenCalled();
  });
});
```

---

## Abnormal Case Patterns

1. **Fat use case** — 100+ lines with multiple concerns. Fix: extract sub-steps into domain services.
2. **Use case returns entity** — Leaks domain internals. Fix: return typed output interface.
3. **Controller calls repo directly** — Bypasses use case. Fix: controller → use case → repo.
4. **Missing authorization** — Use case doesn't check permissions. Fix: validate user context in use case.
5. **No error compensation** — Payment charged but order update fails. Fix: saga/compensation pattern.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5)?
- [ ] **Q2**: Pattern IDs unique (272.1-272.7)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*NestJS Use Case Orchestration Specialist — Application | EPS v3.2*
