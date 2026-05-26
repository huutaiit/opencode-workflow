# NestJS Insurance Domain Specialist — Domain
# NestJS保険ドメインスペシャリスト — ドメイン
# Chuyen Gia Domain Bao Hiem NestJS — Domain

**Version**: 1.0.0
**Technology**: NestJS 10+ Insurance Domain
**Aspect**: Insurance Policy Lifecycle & Claims
**Category**: domain
**Purpose**: Knowledge provider for insurance domain — policy lifecycle, premium calculation, claims processing, multi-insurer strategies, underwriting rules

---

## Metadata

```json
{
  "id": "nestjs-insurance-domain-specialist",
  "technology": "NestJS 10+ Insurance Domain",
  "aspect": "Insurance Policy Lifecycle & Claims",
  "category": "domain",
  "subcategory": "nestjs",
  "lines": 280,
  "token_cost": 1700,
  "version": "1.0.0",
  "evidence": [
    "E1: Insurance domain patterns — policy lifecycle, premium, claims",
    "E5: p2plend insurance — real-world insurance integration patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 219.1–219.10 |
| **Directory Pattern** | `src/domain/insurance/` |
| **Naming Convention** | `{entity}.entity.ts`, `{type}-policy.vo.ts`, `{action}-claim.use-case.ts`, `premium-{type}.calculator.ts` |
| **Imports From** | Domain part: nothing (innermost layer). Application part: Domain (policy models, premium rules) |
| **Imported By** | Application (use cases manage policy lifecycle), Infrastructure (insurer adapters) |
| **Cannot Import** | Domain part: Application, Infrastructure, Presentation (ZERO outward deps). Application part: Infrastructure directly, Presentation (use cases use ports only) |
| **Dependencies** | none (pure domain — no framework dependencies) |
| **When To Use** | Domain modeling for specific bounded context |
| **Source Skeleton** | src/domain/{feature}/entities/*.ts, src/domain/{feature}/value-objects/*.ts |
| **Specialist Type** | code |
| **Purpose** | Insurance domain — policy management, claims processing, premium calculation |
| **Activation Trigger** | files: **/domain/insurance/**; keywords: policy, claim, premium, insurance, coverage |

---

## Role

You are a **NestJS Insurance Domain Specialist**. Your responsibility is to provide domain modeling best practices for the insurance bounded context in a NestJS clean-architecture microservice. You supply patterns for policy entities, lifecycle state machines, premium calculation, claims processing, multi-insurer strategies, underwriting rules, and renewal logic.

**Used by**: Any code agent working with insurance policies, claims, or premium calculation logic
**Not used by**: Non-insurance domains, lending domain specialists (they trigger insurance via ports), infrastructure adapters

---

## Patterns

### Pattern 219.1: Insurance Policy Entity (HIGH)

```
219.1 Insurance policy entity: Coverage type, premium, term, beneficiary, status.
      Aggregate root — all policy operations go through entity methods.
```

```typescript
export class InsurancePolicy {
  constructor(
    public readonly id: string,
    private coverageType: CoverageType,
    private premium: PremiumAmount,
    private term: PolicyTerm,
    private beneficiaryId: string,
    private status: PolicyStatus,
    private loanId?: string,
  ) {}
  activate(): void {
    if (this.status !== PolicyStatus.QUOTED) throw new PolicyStateError('Only QUOTED policies can be activated');
    this.status = PolicyStatus.ACTIVE;
  }
}
```

### Pattern 219.2: Policy Lifecycle State Machine (HIGH)

```
219.2 Policy lifecycle: Draft → Quoted → Active → Claimed → Expired/Cancelled.
      Enforced by entity methods — invalid transitions throw domain errors.
```

```typescript
export enum PolicyStatus {
  DRAFT = 'DRAFT', QUOTED = 'QUOTED', ACTIVE = 'ACTIVE',
  CLAIMED = 'CLAIMED', EXPIRED = 'EXPIRED', CANCELLED = 'CANCELLED',
}
const TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  [PolicyStatus.DRAFT]: [PolicyStatus.QUOTED, PolicyStatus.CANCELLED],
  [PolicyStatus.QUOTED]: [PolicyStatus.ACTIVE, PolicyStatus.CANCELLED],
  [PolicyStatus.ACTIVE]: [PolicyStatus.CLAIMED, PolicyStatus.EXPIRED, PolicyStatus.CANCELLED],
  [PolicyStatus.CLAIMED]: [PolicyStatus.EXPIRED],
  [PolicyStatus.EXPIRED]: [], [PolicyStatus.CANCELLED]: [],
};
```

### Pattern 219.3: Premium Calculation (HIGH)

```
219.3 Premium calculation: Risk-based pricing with actuarial factors.
      Domain service — pure calculation, no side effects. Takes risk profile, returns premium.
```

```typescript
export class PremiumCalculator {
  calculate(coverage: CoverageLimit, riskLevel: RiskLevel, term: PolicyTerm): PremiumAmount {
    const baseRate = this.getBaseRate(coverage.type);
    const riskMultiplier = this.getRiskMultiplier(riskLevel);
    const monthlyPremium = coverage.amount.multiply(baseRate).multiply(riskMultiplier);
    return new PremiumAmount(monthlyPremium, term.months);
  }
  private getRiskMultiplier(risk: RiskLevel): number {
    const multipliers = { LOW: 1.0, MEDIUM: 1.5, HIGH: 2.2, CRITICAL: 3.5 };
    return multipliers[risk];
  }
}
```

### Pattern 219.4: Claims Processing (HIGH)

```
219.4 Claims processing: Claim submission → verification → approval → payout.
      Application use case orchestrates claim lifecycle via domain entities and ports.
```

```typescript
export class FileClaimUseCase {
  constructor(
    private readonly policyRepo: PolicyRepositoryPort,
    private readonly claimRepo: ClaimRepositoryPort,
    private readonly payoutPort: PayoutPort,
  ) {}
  async execute(policyId: string, evidence: ClaimEvidence): Promise<Claim> {
    const policy = await this.policyRepo.findById(policyId);
    policy.fileClaim();
    const claim = Claim.create(policy.id, evidence);
    await this.claimRepo.save(claim);
    await this.policyRepo.save(policy);
    return claim;
  }
}
```

### Pattern 219.5: Multi-Insurer Strategy (MEDIUM-HIGH)

```
219.5 Multi-insurer: Strategy pattern for different insurance providers.
      Domain defines InsuranceProviderPort — infrastructure implements per insurer.
```

```typescript
export interface InsuranceProviderPort {
  readonly providerName: string;
  getQuote(coverage: CoverageType, amount: CoverageLimit, term: PolicyTerm): Promise<QuoteResult>;
  submitClaim(claimId: string, evidence: ClaimEvidence): Promise<ClaimResult>;
}
export class QuoteAggregator {
  constructor(private readonly providers: InsuranceProviderPort[]) {}
  async getBestQuote(coverage: CoverageType, amount: CoverageLimit, term: PolicyTerm): Promise<QuoteResult> {
    const quotes = await Promise.all(this.providers.map(p => p.getQuote(coverage, amount, term)));
    return quotes.sort((a, b) => a.premium.compareTo(b.premium))[0];
  }
}
```

### Pattern 219.6: Insurance Product Types (MEDIUM-HIGH)

```
219.6 Insurance product types: Loan protection, health, property with different rules.
      Each product type defines its own coverage rules, exclusions, and premium factors.
```

```typescript
export enum CoverageType { LOAN_PROTECTION = 'LOAN_PROTECTION', HEALTH = 'HEALTH', PROPERTY = 'PROPERTY' }
export class InsuranceProductRules {
  static forType(type: CoverageType): ProductRules {
    const rules: Record<CoverageType, ProductRules> = {
      [CoverageType.LOAN_PROTECTION]: { maxCoverage: 500_000_000, maxTermMonths: 60, requiresMedical: false },
      [CoverageType.HEALTH]: { maxCoverage: 1_000_000_000, maxTermMonths: 12, requiresMedical: true },
      [CoverageType.PROPERTY]: { maxCoverage: 10_000_000_000, maxTermMonths: 120, requiresMedical: false },
    };
    return rules[type];
  }
}
```

### Pattern 219.7: Coverage Value Objects (HIGH)

```
219.7 Coverage value objects: PremiumAmount, CoverageLimit, DeductibleAmount.
      Immutable, self-validating. Encapsulate insurance-specific monetary concepts.
```

```typescript
export class PremiumAmount {
  constructor(public readonly monthly: Money, public readonly termMonths: number) {
    if (monthly.isNegativeOrZero()) throw new InvalidPremiumError('Premium must be positive');
  }
  totalCost(): Money { return this.monthly.multiply(this.termMonths); }
}
export class CoverageLimit {
  constructor(public readonly amount: Money, public readonly type: CoverageType) {
    const rules = InsuranceProductRules.forType(type);
    if (amount.exceeds(rules.maxCoverage)) throw new CoverageLimitExceeded(type, amount);
  }
}
```

### Pattern 219.8: Policy Events (HIGH)

```
219.8 Policy events: PolicyCreated, PremiumPaid, ClaimFiled, ClaimApproved.
      Immutable domain events — emitted by aggregate, dispatched by use case.
```

```typescript
export class PolicyCreatedEvent {
  constructor(public readonly policyId: string, public readonly coverageType: CoverageType,
    public readonly beneficiaryId: string, public readonly occurredAt: Date = new Date()) {}
}
export class ClaimFiledEvent {
  constructor(public readonly claimId: string, public readonly policyId: string,
    public readonly amount: Money, public readonly occurredAt: Date = new Date()) {}
}
```

### Pattern 219.9: Underwriting Rules (MEDIUM-HIGH)

```
219.9 Underwriting rules: Domain service for policy approval decisions.
      Evaluates risk factors against product rules — returns approve/reject/refer.
```

```typescript
export class UnderwritingService {
  evaluate(application: PolicyApplication, riskAssessment: RiskAssessment): UnderwritingDecision {
    if (riskAssessment.level === RiskLevel.CRITICAL) return UnderwritingDecision.reject('Risk too high');
    if (riskAssessment.level === RiskLevel.HIGH) return UnderwritingDecision.refer('Manual review required');
    const rules = InsuranceProductRules.forType(application.coverageType);
    if (application.amount.exceeds(rules.maxCoverage)) return UnderwritingDecision.reject('Exceeds coverage limit');
    return UnderwritingDecision.approve();
  }
}
```

### Pattern 219.10: Renewal Logic (MEDIUM)

```
219.10 Renewal logic: Auto-renewal, grace period, lapse handling.
       Domain service — determines if policy qualifies for renewal, applies grace period rules.
```

```typescript
export class RenewalService {
  canRenew(policy: InsurancePolicy): boolean {
    return policy.isActive() && !policy.hasPendingClaims();
  }
  applyGracePeriod(policy: InsurancePolicy, daysPastExpiry: number): PolicyStatus {
    const GRACE_DAYS = 30;
    if (daysPastExpiry <= GRACE_DAYS) return PolicyStatus.ACTIVE;
    return PolicyStatus.EXPIRED;
  }
}
```

---

## Best Practices

### Policy Lifecycle
- Policy is aggregate root — all state changes (activate, cancel, claim) through entity methods
- Status transitions enforced via state machine — same pattern as Loan entity
- Grace period logic in domain service, not in persistence layer
- Premium calculation is pure function — no side effects, fully testable

### Claims Processing
- Claims are separate aggregate — reference policy by ID, not object
- Claim status machine: FILED → UNDER_REVIEW → APPROVED/REJECTED → PAID/CLOSED
- Multi-insurer: aggregate quotes, rank by premium + coverage ratio
- Blockchain: claim record → chaincode for immutable audit trail

### Financial Integrity
- Use Decimal.js for premium calculations — never floating point
- All amounts in policy currency — convert at adapter boundary only
- Idempotent claim filing — same claim reference returns existing claim

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Mutable Policy | External code changes status directly | Private status, domain methods only |
| Premium in Controller | Calculation logic in REST handler | Domain service for premium calc |
| Claim References Policy Object | Circular dependency | Reference by policy ID (string) |
| No Grace Period | Instant expiry on date | RenewalService handles grace logic |
| Hardcoded Insurer Rules | Product rules in code | Inject InsuranceProductRules config |

---

## Testing Patterns

```typescript
// 1. Test policy lifecycle
describe('InsurancePolicy', () => {
  it('should transition ACTIVE → CLAIMED', () => {
    const policy = PolicyBuilder.active().build();
    policy.fileClaim(Money.create(5_000_000, 'VND'), 'accident');
    expect(policy.status).toBe(PolicyStatus.CLAIMED);
  });

  it('should reject claim on expired policy', () => {
    const policy = PolicyBuilder.expired().build();
    expect(() => policy.fileClaim(Money.create(5_000_000, 'VND'), 'accident'))
      .toThrow(PolicyExpiredError);
  });
});
```

```typescript
// 2. Test premium calculation
describe('PremiumCalculator', () => {
  it('should calculate monthly premium based on risk and coverage', () => {
    const premium = calculator.calculate(
      CoverageType.LOAN_PROTECTION,
      Money.create(50_000_000, 'VND'),
      RiskLevel.MEDIUM,
      12, // months
    );
    expect(premium.amount).toBeGreaterThan(0);
    expect(premium.currency).toBe('VND');
  });
});
```

```typescript
// 3. Test underwriting rules
describe('UnderwritingService', () => {
  it('should reject CRITICAL risk', () => {
    const decision = underwriting.evaluate(application, criticalRiskAssessment);
    expect(decision.status).toBe('REJECTED');
  });

  it('should refer HIGH risk for manual review', () => {
    const decision = underwriting.evaluate(application, highRiskAssessment);
    expect(decision.status).toBe('REFERRED');
  });
});
```

---

## Policy Lifecycle Reference

```
DRAFT ──→ ACTIVE ──→ CLAIMED ──→ CLAIM_APPROVED ──→ PAID
                │              └──→ CLAIM_REJECTED
                ├──→ CANCELLED
                └──→ EXPIRED ──→ RENEWED (grace period)
                          └──→ LAPSED (past grace)
```

---

## Abnormal Case Patterns

1. **Claim filed on expired policy** — Fix: fileClaim() checks ACTIVE status, grace period via RenewalService.

2. **Premium calculation drift** — Multi-insurer quotes diverge. Fix: validate bounds, flag outliers.

3. **Concurrent claim and cancellation** — Fix: optimistic locking on policy version.

4. **Coverage limit violated after currency conversion** — Fix: CoverageLimit in policy currency, convert at boundary.

5. **Double claim payment** — Same claim paid twice due to retry. Fix: idempotency on claim payment via reference key.

6. **Renewal without re-underwriting** — Risk changed since original policy. Fix: re-assess risk on renewal, adjust premium.

7. **Blockchain sync failure** — Claim recorded in DB but not on-chain. Fix: outbox pattern for blockchain events.

8. **Grace period abuse** — Policyholder files claim during grace period then doesn't renew. Fix: grace period allows renewal only, not new claims.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (219.1-219.10), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Insurance Domain Specialist — Domain | EPS v3.2*
