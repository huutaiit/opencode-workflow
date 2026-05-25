# NestJS Lending Domain Specialist — Domain
# NestJS融資ドメインスペシャリスト — ドメイン
# Chuyen Gia Domain Cho Vay NestJS — Domain

**Version**: 1.0.0
**Technology**: NestJS 10+ Lending Domain
**Aspect**: P2P Lending Domain Logic
**Category**: domain
**Purpose**: Knowledge provider for lending domain — loan lifecycle, marketplace matching, repayment schedules, P2P offers, domain events

---

## Metadata

```json
{
  "id": "nestjs-lending-domain-specialist",
  "technology": "NestJS 10+ Lending Domain",
  "aspect": "P2P Lending Domain Logic",
  "category": "domain",
  "subcategory": "nestjs",
  "lines": 280,
  "token_cost": 1700,
  "version": "1.0.0",
  "evidence": [
    "E1: P2P lending domain patterns — loan lifecycle, marketplace, repayment",
    "E5: p2plend domain — real-world lending entities and use cases"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 217.1–217.10 |
| **Directory Pattern** | `src/domain/lending/` |
| **Naming Convention** | `{entity}.entity.ts`, `{value-object}.vo.ts`, `{action}-loan.use-case.ts`, `loan-{status}.event.ts` |
| **Imports From** | Domain part: nothing (innermost layer). Application part: Domain (entities, value objects, port interfaces) |
| **Imported By** | Application (use cases orchestrate domain logic), Infrastructure (repos persist domain entities) |
| **Cannot Import** | Domain part: Application, Infrastructure, Presentation (ZERO outward deps). Application part: Infrastructure directly, Presentation (use cases use ports only) |
| **Dependencies** | none (pure domain — no framework dependencies) |
| **When To Use** | Domain modeling for specific bounded context |
| **Source Skeleton** | src/domain/{feature}/entities/*.ts, src/domain/{feature}/value-objects/*.ts |
| **Specialist Type** | code |
| **Purpose** | P2P lending domain — loan lifecycle, disbursement, repayment, collections |
| **Activation Trigger** | files: **/domain/lending/**; keywords: loan, disbursement, repayment, lender, borrower |

---

## Role

You are a **NestJS Lending Domain Specialist**. Your responsibility is to provide domain modeling best practices for the P2P lending bounded context in a NestJS clean-architecture microservice. You supply patterns for loan entities, state machines, marketplace matching, repayment schedules, P2P offers, disbursement orchestration, and domain events.

**Used by**: Any code agent working with lending domain entities, loan use cases, or marketplace logic
**Not used by**: Non-lending domains, infrastructure/adapter specialists, presentation layer specialists

---

## Patterns

### Pattern 217.1: Loan Entity — Core Aggregate Root (HIGH)

```
217.1 Loan entity: Core aggregate root with amount, term, interest rate, status, borrower/lender refs.
      All state transitions enforced via domain methods — never set status directly.
```

```typescript
export class Loan {
  constructor(
    public readonly id: string,
    private amount: Money,
    private term: LoanTerm,
    private interestRate: InterestRate,
    private status: LoanStatus,
    public readonly borrowerId: string,
    private lenderId?: string,
  ) {}
  fund(lenderId: string): void {
    if (this.status !== LoanStatus.LISTED) throw new LoanStateError('Only LISTED loans can be funded');
    this.lenderId = lenderId;
    this.status = LoanStatus.FUNDED;
  }
}
```

### Pattern 217.2: Loan State Machine (HIGH)

```
217.2 Loan state machine: Draft → Listed → Funded → Active → Repaying → Completed/Defaulted.
      Transition rules enforced in entity methods — invalid transitions throw domain errors.
```

```typescript
export enum LoanStatus {
  DRAFT = 'DRAFT', LISTED = 'LISTED', FUNDED = 'FUNDED',
  ACTIVE = 'ACTIVE', REPAYING = 'REPAYING',
  COMPLETED = 'COMPLETED', DEFAULTED = 'DEFAULTED',
}
const TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  [LoanStatus.DRAFT]: [LoanStatus.LISTED],
  [LoanStatus.LISTED]: [LoanStatus.FUNDED],
  [LoanStatus.FUNDED]: [LoanStatus.ACTIVE],
  [LoanStatus.ACTIVE]: [LoanStatus.REPAYING],
  [LoanStatus.REPAYING]: [LoanStatus.COMPLETED, LoanStatus.DEFAULTED],
  [LoanStatus.COMPLETED]: [], [LoanStatus.DEFAULTED]: [],
};
```

### Pattern 217.3: Marketplace Matching (HIGH)

```
217.3 Marketplace matching: Match lender offers with borrower requests by criteria.
      Domain service — stateless, takes offers + requests, returns matches ranked by compatibility.
```

```typescript
export class MarketplaceMatchingService {
  match(offers: LenderOffer[], request: BorrowerRequest): MatchResult[] {
    return offers
      .filter(o => o.maxAmount.gte(request.amount) && o.maxTerm.gte(request.term))
      .map(o => new MatchResult(o, this.calculateScore(o, request)))
      .sort((a, b) => b.score - a.score);
  }
}
```

### Pattern 217.4: Repayment Schedule Generation (HIGH)

```
217.4 Repayment schedule: Generate amortization schedule with principal + interest splits.
      Pure domain calculation — no side effects. Returns immutable schedule value object.
```

```typescript
export class RepaymentScheduleGenerator {
  generate(principal: Money, rate: InterestRate, term: LoanTerm): RepaymentSchedule {
    const monthlyRate = rate.toMonthly();
    const payment = principal.amortize(monthlyRate, term.months);
    const installments = Array.from({ length: term.months }, (_, i) =>
      new Installment(i + 1, payment, payment.interestPortion(monthlyRate, i), payment.principalPortion(monthlyRate, i))
    );
    return new RepaymentSchedule(installments);
  }
}
```

### Pattern 217.5: P2P Offer (MEDIUM-HIGH)

```
217.5 P2P offer: Lender creates offer with amount, rate, term constraints.
      Value object with validation — reject offers with rate below minimum or term beyond max.
```

```typescript
export class LenderOffer {
  constructor(
    public readonly lenderId: string,
    public readonly maxAmount: Money,
    public readonly minRate: InterestRate,
    public readonly maxTerm: LoanTerm,
  ) {
    if (maxAmount.isNegativeOrZero()) throw new InvalidOfferError('Amount must be positive');
    if (minRate.isNegative()) throw new InvalidOfferError('Rate must be non-negative');
  }
}
```

### Pattern 217.6: Loan Disbursement Use Case (HIGH)

```
217.6 Loan disbursement: Application use case — orchestrate fund transfer from lender to borrower.
      Use case depends on port interfaces only — PaymentPort, LoanRepository port.
```

```typescript
export class DisburseLoanUseCase {
  constructor(
    private readonly loanRepo: LoanRepositoryPort,
    private readonly paymentPort: PaymentPort,
  ) {}
  async execute(loanId: string): Promise<void> {
    const loan = await this.loanRepo.findById(loanId);
    loan.activate();
    await this.paymentPort.transfer(loan.lenderId, loan.borrowerId, loan.amount);
    await this.loanRepo.save(loan);
  }
}
```

### Pattern 217.7: Late Payment Handling (MEDIUM)

```
217.7 Late payment handling: Calculate penalties, notify stakeholders, trigger insurance.
      Domain service computes penalty. Use case orchestrates notification + insurance claim.
```

```typescript
export class LatePaymentPolicy {
  calculatePenalty(installment: Installment, daysLate: number): Money {
    const dailyRate = installment.amount.multiply(0.001);
    return dailyRate.multiply(daysLate);
  }
  isDefault(daysLate: number): boolean {
    return daysLate > 90;
  }
}
```

### Pattern 217.8: Loan Value Objects (HIGH)

```
217.8 Loan value objects: Money, InterestRate, LoanTerm, RepaymentSchedule.
      Immutable, self-validating. Encapsulate domain math — never use raw numbers.
```

```typescript
export class Money {
  constructor(private readonly amount: number, private readonly currency: string) {
    if (amount < 0) throw new InvalidMoneyError('Negative amount');
  }
  add(other: Money): Money { this.assertSameCurrency(other); return new Money(this.amount + other.amount, this.currency); }
  gte(other: Money): boolean { this.assertSameCurrency(other); return this.amount >= other.amount; }
  isNegativeOrZero(): boolean { return this.amount <= 0; }
}
```

### Pattern 217.9: Domain Events (HIGH)

```
217.9 Domain events: LoanCreated, LoanFunded, PaymentReceived, LoanDefaulted.
      Events are immutable records emitted by aggregates — collected and dispatched by use cases.
```

```typescript
export class LoanCreatedEvent {
  constructor(
    public readonly loanId: string,
    public readonly borrowerId: string,
    public readonly amount: Money,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
export class LoanDefaultedEvent {
  constructor(public readonly loanId: string, public readonly daysLate: number, public readonly occurredAt: Date = new Date()) {}
}
```

### Pattern 217.10: Portfolio Aggregation (MEDIUM)

```
217.10 Portfolio aggregation: Calculate total exposure, diversification metrics.
       Domain service — aggregates across multiple loans for risk reporting.
```

```typescript
export class PortfolioService {
  calculateExposure(loans: Loan[]): Money {
    return loans
      .filter(l => l.isActive())
      .reduce((sum, l) => sum.add(l.outstandingBalance()), Money.zero('VND'));
  }
  diversificationRatio(loans: Loan[]): number {
    const uniqueBorrowers = new Set(loans.map(l => l.borrowerId)).size;
    return uniqueBorrowers / loans.length;
  }
}
```

---

## Best Practices

### Entity Design
- Loan is aggregate root — all state changes go through Loan methods
- Value objects (Money, InterestRate, LoanTerm) for domain primitives — never raw numbers
- State machine enforced in entity — transition map as const, throw on invalid
- Entities are PURE TypeScript — no @Entity, no @Injectable, no framework imports

### Financial Calculations
- Use Decimal.js for all money math — never JavaScript `number` for currency
- Store amounts as integer minor units in DB (cents/đồng) — convert at boundary
- Interest calculation: always specify compounding method (simple, compound, amortized)
- Rounding: HALF_UP for payment amounts, HALF_DOWN for interest allocations

### Blockchain Integration Points
- Loan creation → emit event → chaincode records loan on ledger (cross-ref blockchain/chaincode-core)
- Payment received → chaincode updates loan balance on-chain
- Default → chaincode triggers insurance claim workflow
- All financial state changes must be dual-written: DB + blockchain

### Domain Events
- Events are past tense facts — `LoanCreated`, not `CreateLoan`
- Include all data listeners need — avoid callback to emitter
- Events trigger: notification, analytics, blockchain sync, insurance

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Anemic Domain Model | Loan is just data, logic in service | Put behavior in entity methods |
| Raw Number for Money | `amount: number` — precision loss | Use Money value object |
| Direct Status Mutation | `loan.status = 'ACTIVE'` | Private status, expose transition methods |
| Cross-Aggregate Reference | Loan holds LenderOffer object | Use ID reference (string) |
| Logic in Controller | Interest calculation in controller | Move to domain service |
| Mutable Value Objects | `schedule.installments.push(...)` | Readonly arrays, return new instances |

---

## Testing Patterns

```typescript
// 1. Test state machine transitions
describe('Loan State Machine', () => {
  it('should transition LISTED → FUNDED', () => {
    const loan = LoanBuilder.listed().build();
    loan.fund('lender-1');
    expect(loan.status).toBe(LoanStatus.FUNDED);
  });

  it('should reject DRAFT → FUNDED (invalid transition)', () => {
    const loan = LoanBuilder.draft().build();
    expect(() => loan.fund('lender-1')).toThrow(LoanStateError);
  });

  it('should reject funding already funded loan', () => {
    const loan = LoanBuilder.funded().build();
    expect(() => loan.fund('another-lender')).toThrow(LoanStateError);
  });
});
```

```typescript
// 2. Test repayment schedule calculation
describe('RepaymentScheduleGenerator', () => {
  it('should generate correct number of installments', () => {
    const schedule = generator.generate(
      Money.create(10_000_000, 'VND'),
      InterestRate.annual(0.12),
      LoanTerm.months(12),
    );
    expect(schedule.installments).toHaveLength(12);
  });

  it('should sum installments to total with interest', () => {
    const schedule = generator.generate(Money.create(10_000_000, 'VND'), InterestRate.annual(0.12), LoanTerm.months(12));
    const totalPaid = schedule.installments.reduce((sum, i) => sum.add(i.totalPayment), Money.zero('VND'));
    expect(totalPaid.amount).toBeGreaterThan(10_000_000);
  });
});
```

```typescript
// 3. Test marketplace matching
describe('MarketplaceMatchingService', () => {
  it('should match offers meeting borrower criteria', () => {
    const offers = [
      new LenderOffer('l1', Money.create(50_000_000, 'VND'), InterestRate.annual(0.10), LoanTerm.months(24)),
      new LenderOffer('l2', Money.create(5_000_000, 'VND'), InterestRate.annual(0.08), LoanTerm.months(6)),
    ];
    const request = new BorrowerRequest(Money.create(10_000_000, 'VND'), LoanTerm.months(12));
    const matches = service.match(offers, request);
    expect(matches).toHaveLength(1); // only l1 meets amount+term
    expect(matches[0].offer.lenderId).toBe('l1');
  });
});
```

```typescript
// 4. Test domain event emission
describe('Loan domain events', () => {
  it('should emit LoanCreatedEvent on creation', () => {
    const loan = Loan.create('borrower-1', Money.create(10_000_000, 'VND'), InterestRate.annual(0.12), LoanTerm.months(12));
    expect(loan.domainEvents).toContainEqual(expect.any(LoanCreatedEvent));
  });

  it('should emit LoanDefaultedEvent on default', () => {
    const loan = LoanBuilder.repaying().build();
    loan.markDefaulted(91);
    expect(loan.domainEvents).toContainEqual(expect.objectContaining({ daysLate: 91 }));
  });
});
```

```typescript
// 5. Test late payment penalty
describe('LatePaymentPolicy', () => {
  it('should calculate daily penalty', () => {
    const installment = new Installment(1, Money.create(1_000_000, 'VND'));
    const penalty = policy.calculatePenalty(installment, 10);
    expect(penalty.amount).toBe(10_000); // 0.1% × 10 days
  });

  it('should flag default after 90 days', () => {
    expect(policy.isDefault(91)).toBe(true);
    expect(policy.isDefault(89)).toBe(false);
  });
});
```

---

## Loan Lifecycle Reference

```
DRAFT ──→ LISTED ──→ FUNDED ──→ ACTIVE ──→ REPAYING ──→ COMPLETED
                                                   └──→ DEFAULTED
                                                          └──→ (Insurance Claim)
```

| Transition | Trigger | Validation | Side Effects |
|-----------|---------|------------|--------------|
| DRAFT → LISTED | Borrower submits | Amount/term valid, borrower verified | Emit LoanListedEvent |
| LISTED → FUNDED | Lender accepts | Lender has funds, offer matches | Emit LoanFundedEvent |
| FUNDED → ACTIVE | System disburses | Payment port confirms transfer | Emit LoanActivatedEvent, generate schedule |
| ACTIVE → REPAYING | First payment received | Payment matches installment | Emit PaymentReceivedEvent |
| REPAYING → COMPLETED | All installments paid | Outstanding balance = 0 | Emit LoanCompletedEvent |
| REPAYING → DEFAULTED | 90+ days late | LatePaymentPolicy confirms | Emit LoanDefaultedEvent, trigger insurance |

---

## Abnormal Case Patterns

1. **Invalid state transition attempted** — External code sets loan status directly, bypassing state machine. Fix: Make status private, expose only domain methods (fund(), activate(), complete()) that enforce transitions.

2. **Floating-point money arithmetic** — Using raw `number` for currency leads to rounding errors (0.1 + 0.2 !== 0.3). Fix: Use Money value object backed by Decimal.js or integer minor units.

3. **Circular dependency between domain entities** — Loan references LenderOffer which references Loan. Fix: Use IDs (string references) instead of direct object references between aggregates.

4. **Repayment schedule mutated after creation** — External code modifies installment amounts. Fix: Make RepaymentSchedule and Installment deeply immutable (readonly properties, return new instances on "modification").

5. **Race condition on funding** — Two lenders fund same loan simultaneously. Fix: Optimistic locking on Loan entity (@VersionColumn) — second funder gets ConflictException.

6. **Interest rate precision loss** — Storing rate as `number` loses decimal precision over 12+ months. Fix: Store as basis points (integer) — 12.5% = 1250 bps.

7. **Timezone-dependent payment date** — Installment due date calculated in server timezone. Fix: Store all dates as UTC, convert to borrower's timezone only in presentation layer.

8. **Orphan offer after loan funded** — Unfunded offers still visible in marketplace. Fix: Emit LoanFundedEvent → listener deactivates remaining offers for that loan.

9. **Partial payment not handled** — Borrower pays less than installment amount. Fix: Domain policy: apply to interest first, then principal. Track partial payment state on installment.

10. **Schedule recalculation after early payment** — Early principal payment should reduce remaining interest. Fix: RecalculateScheduleUseCase generates new schedule from remaining balance.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (217.1-217.10), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Lending Domain Specialist — Domain | EPS v3.2*
