# NestJS Risk Scoring Specialist — Domain
# NestJSリスクスコアリングスペシャリスト — ドメイン
# Chuyen Gia Cham Diem Rui Ro NestJS — Domain

**Version**: 1.0.0
**Technology**: NestJS 10+ Risk Scoring
**Aspect**: Credit Risk Assessment & Compliance
**Category**: domain
**Purpose**: Knowledge provider for risk scoring domain — FICO-like scoring, affordability checks, AML/CFT compliance, pluggable scoring strategies

---

## Metadata

```json
{
  "id": "nestjs-risk-scoring-specialist",
  "technology": "NestJS 10+ Risk Scoring",
  "aspect": "Credit Risk Assessment & Compliance",
  "category": "domain",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: Risk scoring patterns — credit scoring, affordability, AML/CFT",
    "E5: p2plend risk — real-world risk assessment domain patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Application |
| **Variant** | ALL |
| **Pattern Numbers** | 218.1–218.8 |
| **Directory Pattern** | `src/domain/risk/` |
| **Naming Convention** | `{model}.scoring-model.ts`, `{check}.compliance-check.ts`, `calculate-{type}.use-case.ts` |
| **Imports From** | Domain part: nothing (innermost layer). Application part: Domain (scoring models, compliance rules) |
| **Imported By** | Application (use cases invoke scoring), Infrastructure (external data adapters feed scoring input) |
| **Cannot Import** | Domain part: Application, Infrastructure, Presentation (ZERO outward deps). Application part: Infrastructure directly, Presentation (use cases use ports only) |
| **Dependencies** | none (pure domain — no framework dependencies) |
| **When To Use** | Domain modeling for specific bounded context |
| **Source Skeleton** | src/domain/{feature}/entities/*.ts, src/domain/{feature}/value-objects/*.ts |
| **Specialist Type** | code |
| **Purpose** | Risk scoring domain — credit assessment, scoring models, risk factors |
| **Activation Trigger** | files: **/domain/risk/**; keywords: riskScore, creditScore, assessment, scoring |

---

## Role

You are a **NestJS Risk Scoring Specialist**. Your responsibility is to provide domain modeling best practices for credit risk assessment in a NestJS clean-architecture microservice. You supply patterns for FICO-like scoring models, affordability analysis, AML/CFT compliance checks, pluggable scoring strategies, and risk assessment orchestration.

**Used by**: Any code agent working with risk scoring models, compliance checks, or credit assessment use cases
**Not used by**: Non-risk domains, lending domain specialists (they consume risk results via ports), infrastructure adapters

---

## Patterns

### Pattern 218.1: Credit Score Model (HIGH)

```
218.1 Credit score model: FICO-like scoring with weighted factors.
      Pure domain model — takes input factors, produces score. No external dependencies.
```

```typescript
export class CreditScoreModel {
  private readonly weights: Record<string, number> = {
    paymentHistory: 0.35, creditUtilization: 0.30,
    creditAge: 0.15, creditMix: 0.10, newCredit: 0.10,
  };
  calculate(factors: ScoringFactors): CreditScore {
    const raw = Object.entries(this.weights)
      .reduce((sum, [key, weight]) => sum + factors[key] * weight, 0);
    return new CreditScore(Math.round(raw * 850));
  }
}
```

### Pattern 218.2: Affordability Check (HIGH)

```
218.2 Affordability check: Income-to-debt ratio, expense analysis.
      Domain service validates borrower can repay — returns pass/fail with detailed breakdown.
```

```typescript
export class AffordabilityCheck {
  assess(income: Money, existingDebt: Money, requestedPayment: Money): AffordabilityResult {
    const totalDebt = existingDebt.add(requestedPayment);
    const dtiRatio = totalDebt.dividedBy(income);
    const passed = dtiRatio <= 0.43;
    return new AffordabilityResult(passed, dtiRatio, income, totalDebt);
  }
}
```

### Pattern 218.3: AML/CFT Compliance (HIGH)

```
218.3 AML/CFT compliance: Anti-money laundering checks, sanctions screening.
      Domain defines check interface — infrastructure implements with external providers.
```

```typescript
export interface AmlCheckPort {
  screenSanctions(identity: UserIdentity): Promise<ComplianceResult>;
  checkPep(identity: UserIdentity): Promise<ComplianceResult>;
}
export class ComplianceResult {
  constructor(
    public readonly passed: boolean,
    public readonly flags: ComplianceFlag[],
    public readonly checkedAt: Date = new Date(),
  ) {}
  hasBlockingFlags(): boolean { return this.flags.some(f => f.severity === 'BLOCKING'); }
}
```

### Pattern 218.4: Risk Categories (HIGH)

```
218.4 Risk categories: LOW/MEDIUM/HIGH/CRITICAL with threshold configuration.
      Value object with comparison operators — thresholds configurable per product type.
```

```typescript
export enum RiskLevel { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', CRITICAL = 'CRITICAL' }
export class RiskCategory {
  static fromScore(score: CreditScore, thresholds: RiskThresholds): RiskCategory {
    if (score.value >= thresholds.low) return new RiskCategory(RiskLevel.LOW);
    if (score.value >= thresholds.medium) return new RiskCategory(RiskLevel.MEDIUM);
    if (score.value >= thresholds.high) return new RiskCategory(RiskLevel.HIGH);
    return new RiskCategory(RiskLevel.CRITICAL);
  }
  constructor(public readonly level: RiskLevel) {}
}
```

### Pattern 218.5: Scoring Strategy (MEDIUM-HIGH)

```
218.5 Scoring strategy: Strategy pattern for pluggable scoring algorithms.
      Domain defines ScoringStrategy interface — swap algorithms without changing use cases.
```

```typescript
export interface ScoringStrategy {
  readonly name: string;
  calculate(input: ScoringInput): CreditScore;
}
export class FicoScoringStrategy implements ScoringStrategy {
  readonly name = 'FICO';
  calculate(input: ScoringInput): CreditScore { /* FICO-specific logic */ }
}
export class BehavioralScoringStrategy implements ScoringStrategy {
  readonly name = 'BEHAVIORAL';
  calculate(input: ScoringInput): CreditScore { /* transaction-based scoring */ }
}
```

### Pattern 218.6: Risk Assessment Use Case (HIGH)

```
218.6 Risk assessment use case: Orchestrate multiple checks, produce final RiskAssessment.
      Application layer — composes domain services and port calls into single workflow.
```

```typescript
export class AssessRiskUseCase {
  constructor(
    private readonly scoreModel: CreditScoreModel,
    private readonly affordability: AffordabilityCheck,
    private readonly amlPort: AmlCheckPort,
    private readonly dataPort: CreditDataPort,
  ) {}
  async execute(borrowerId: string, loanAmount: Money): Promise<RiskAssessment> {
    const data = await this.dataPort.fetchCreditData(borrowerId);
    const score = this.scoreModel.calculate(data.factors);
    const afford = this.affordability.assess(data.income, data.existingDebt, loanAmount);
    const aml = await this.amlPort.screenSanctions(data.identity);
    return new RiskAssessment(score, afford, aml);
  }
}
```

### Pattern 218.7: External Data Ports (MEDIUM-HIGH)

```
218.7 External data ports: Define interfaces for credit bureau, identity verification.
      Domain defines port — infrastructure implements with actual API clients.
```

```typescript
export interface CreditDataPort {
  fetchCreditData(borrowerId: string): Promise<CreditData>;
}
export interface IdentityVerificationPort {
  verify(identity: UserIdentity): Promise<VerificationResult>;
}
```

### Pattern 218.8: Risk Value Objects (HIGH)

```
218.8 Risk value objects: CreditScore, RiskLevel, ComplianceResult.
      Immutable, self-validating. Encapsulate risk domain concepts with type safety.
```

```typescript
export class CreditScore {
  constructor(public readonly value: number) {
    if (value < 0 || value > 850) throw new InvalidScoreError(`Score ${value} out of range [0, 850]`);
  }
  isAbove(threshold: number): boolean { return this.value >= threshold; }
  equals(other: CreditScore): boolean { return this.value === other.value; }
}
```

---

## Best Practices

### Scoring Model
- Weights MUST sum to 1.0 — validate in constructor, throw if misconfigured
- Score range [0, 850] — FICO-compatible for familiarity
- Strategy pattern for scoring models — swap via DI, not code changes
- Version scoring models — track which model version scored each loan

### AML/CFT Compliance
- AML screening is BLOCKING — never auto-pass on timeout (use PENDING status)
- Log ALL screening results — regulatory audit trail requirement
- Re-screen on significant events: new loan, address change, large transaction
- Dual-check: sanctions list + PEP (Politically Exposed Persons) check

### Affordability
- DTI (Debt-to-Income) ratio mandatory — never skip regardless of credit score
- Include ALL existing debts — mortgage, credit cards, other P2P loans
- Factor in living expenses based on locale/household size
- Buffer: max DTI = 40% (VN regulation), stricter for higher amounts

### Blockchain Integration
- Risk assessment result → stored on-chain (immutable audit trail)
- Score + decision + timestamp → chaincode records for regulatory transparency
- Cross-ref: blockchain/chaincode-core for recording patterns

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Hardcoded Thresholds | `if (score > 650)` in service | Inject RiskThresholds config |
| AML Auto-Pass | Timeout treated as "clear" | Timeout = PENDING, manual review |
| Score as Number | `riskScore: number` | Use CreditScore value object |
| Skip Affordability | High score bypasses DTI check | DTI is always mandatory |
| Single Scoring Model | One formula for all products | Strategy pattern per product type |
| No Audit Trail | Score calculated but not logged | Persist RiskAssessment entity |

---

## Testing Patterns

```typescript
// 1. Test scoring model
describe('WeightedScoringModel', () => {
  it('should calculate weighted score within [0, 850]', () => {
    const model = new WeightedScoringModel({
      paymentHistory: { weight: 0.35, score: 750 },
      creditUtilization: { weight: 0.30, score: 600 },
      creditAge: { weight: 0.15, score: 800 },
      newCredit: { weight: 0.10, score: 700 },
      creditMix: { weight: 0.10, score: 650 },
    });
    const score = model.calculate();
    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(850);
  });

  it('should reject weights not summing to 1.0', () => {
    expect(() => new WeightedScoringModel({ a: { weight: 0.5, score: 700 } }))
      .toThrow('Weights must sum to 1.0');
  });
});
```

```typescript
// 2. Test affordability check
describe('AffordabilityAssessment', () => {
  it('should pass when DTI below threshold', () => {
    const result = affordability.assess(
      Money.create(20_000_000, 'VND'),  // monthly income
      Money.create(5_000_000, 'VND'),   // existing debt
      Money.create(3_000_000, 'VND'),   // new loan payment
    );
    expect(result.dtiRatio).toBeLessThan(0.4);
    expect(result.canAfford).toBe(true);
  });

  it('should fail when DTI exceeds 40%', () => {
    const result = affordability.assess(
      Money.create(10_000_000, 'VND'),
      Money.create(3_000_000, 'VND'),
      Money.create(2_000_000, 'VND'), // DTI = (3+2)/10 = 50%
    );
    expect(result.canAfford).toBe(false);
  });
});
```

```typescript
// 3. Test risk assessment use case
describe('AssessRiskUseCase', () => {
  it('should return complete risk assessment', async () => {
    mockCreditDataPort.fetchCreditData.mockResolvedValue(testCreditData);
    mockAmlPort.screenSanctions.mockResolvedValue({ clear: true });

    const result = await useCase.execute('borrower-1', Money.create(10_000_000, 'VND'));
    expect(result.score).toBeInstanceOf(CreditScore);
    expect(result.affordability.canAfford).toBe(true);
    expect(result.amlStatus).toBe('CLEAR');
  });

  it('should return PENDING on AML timeout', async () => {
    mockAmlPort.screenSanctions.mockRejectedValue(new TimeoutError());
    const result = await useCase.execute('borrower-1', Money.create(10_000_000, 'VND'));
    expect(result.amlStatus).toBe('PENDING');
  });
});
```

---

## Risk Level Reference

| Score Range | Risk Level | Max DTI | Interest Rate Spread | Auto-Approve |
|-------------|-----------|---------|---------------------|-------------|
| 750–850 | LOW | 40% | Base + 0% | Yes (if DTI OK) |
| 650–749 | MEDIUM | 35% | Base + 2% | Yes (if DTI OK) |
| 500–649 | HIGH | 30% | Base + 5% | No — manual review |
| 0–499 | VERY_HIGH | — | Rejected | No — rejected |

---

## Abnormal Case Patterns

1. **Scoring model returns inconsistent results** — Weights don't sum to 1.0. Fix: validate in constructor.

2. **AML check timeout blocks loan flow** — External screening hangs. Fix: timeout in port contract, PENDING status.

3. **Affordability check bypassed for high-score borrowers** — Fix: DTI check mandatory for ALL borrowers.

4. **Risk category thresholds hardcoded** — Fix: inject RiskThresholds config per product.

5. **External data provider down** — Credit bureau API unavailable. Fix: circuit breaker + fallback to cached data (with staleness warning).

6. **Score manipulation** — Borrower opens/closes accounts to game score. Fix: track velocity of credit changes, flag rapid changes.

7. **Stale credit data** — Using month-old data for assessment. Fix: enforce max data age (7 days), re-fetch if stale.

8. **PEP not checked** — AML only screens sanctions list. Fix: include PEP check in AmlCheckPort contract.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (218.1-218.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Risk Scoring Specialist — Domain | EPS v3.2*
