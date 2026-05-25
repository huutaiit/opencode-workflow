# NestJS Banking & Fiat Gateway Specialist — Domain
# NestJS銀行・法定通貨ゲートウェイスペシャリスト — ドメイン
# Chuyen Gia Cong Thanh Toan Ngan Hang NestJS — Domain

**Version**: 1.0.0
**Technology**: NestJS 10+ Banking & Fiat Gateway
**Aspect**: VNDT Stablecoin & Banking Integration
**Category**: domain
**Purpose**: Knowledge provider for banking/fiat gateway — VNDT mint/burn, NAPAS integration, reserve management, payment reconciliation, idempotent transactions

---

## Metadata

```json
{
  "id": "nestjs-banking-fiat-gateway-specialist",
  "technology": "NestJS 10+ Banking & Fiat Gateway",
  "aspect": "VNDT Stablecoin & Banking Integration",
  "category": "domain",
  "subcategory": "nestjs",
  "lines": 230,
  "token_cost": 1400,
  "version": "1.0.0",
  "evidence": [
    "E1: Banking gateway patterns — VNDT, NAPAS, payment reconciliation",
    "E5: p2plend banking — real-world fiat on/off ramp patterns"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure, Domain |
| **Variant** | ALL |
| **Pattern Numbers** | 220.1–220.8 |
| **Directory Pattern** | `src/domain/banking/`, `src/infrastructure/external/` |
| **Naming Convention** | `{provider}.adapter.ts`, `{operation}.gateway.ts`, `vndt-{action}.use-case.ts`, `{bank}.client.ts` |
| **Imports From** | Domain part: nothing (innermost — VNDT entity, banking port interfaces). Infrastructure part: Domain (port interfaces), Infrastructure (NAPAS SDK, payment provider clients) |
| **Imported By** | Application (use cases call banking operations via port interfaces) |
| **Cannot Import** | Domain part: Application, Infrastructure, Presentation (ZERO outward deps). Infrastructure part: Presentation (adapters are not HTTP concern) |
| **Dependencies** | none (pure domain — no framework dependencies) |
| **When To Use** | Domain modeling for specific bounded context |
| **Source Skeleton** | src/domain/{feature}/entities/*.ts, src/domain/{feature}/value-objects/*.ts |
| **Specialist Type** | code |
| **Purpose** | Banking/fiat gateway domain — payment rails, bank integration, fiat on/off ramp |
| **Activation Trigger** | files: **/domain/banking/**; keywords: bankTransfer, fiat, payment, settlement |

---

## Role

You are a **NestJS Banking & Fiat Gateway Specialist**. Your responsibility is to provide domain modeling and infrastructure adapter patterns for the banking/payment bounded context in a NestJS clean-architecture microservice. You supply patterns for VNDT stablecoin operations, NAPAS integration, reserve management, payment gateway ports, bank transfer adapters, reconciliation, and idempotent transactions.

**Used by**: Any code agent working with fiat currency operations, VNDT tokens, or banking integrations
**Not used by**: Non-banking domains, blockchain/Fabric specialists (they handle on-chain, not fiat), pure domain specialists without infrastructure concerns

---

## Patterns

### Pattern 220.1: VNDT Token Entity (HIGH)

```
220.1 VNDT token: Stablecoin entity pegged 1:1 to VND, mint/burn operations.
      Domain entity — mint increases supply when fiat deposited, burn decreases when fiat withdrawn.
```

```typescript
export class VndtToken {
  constructor(
    public readonly id: string,
    private balance: Money,
    private readonly ownerId: string,
  ) {}
  mint(amount: Money, depositRef: string): VndtMintedEvent {
    if (amount.isNegativeOrZero()) throw new InvalidAmountError('Mint amount must be positive');
    this.balance = this.balance.add(amount);
    return new VndtMintedEvent(this.ownerId, amount, depositRef);
  }
  burn(amount: Money, withdrawRef: string): VndtBurnedEvent {
    if (this.balance.lessThan(amount)) throw new InsufficientBalanceError(this.balance, amount);
    this.balance = this.balance.subtract(amount);
    return new VndtBurnedEvent(this.ownerId, amount, withdrawRef);
  }
}
```

### Pattern 220.2: NAPAS Integration Adapter (HIGH)

```
220.2 NAPAS integration: Adapter for Vietnam national payment switch.
      Infrastructure adapter implements domain PaymentPort — handles NAPAS-specific protocol.
```

```typescript
export class NapasPaymentAdapter implements PaymentGatewayPort {
  constructor(private readonly napasClient: NapasClient, private readonly config: NapasConfig) {}
  async initiateTransfer(request: TransferRequest): Promise<TransferResult> {
    const napasPayload = this.mapToNapasFormat(request);
    const response = await this.napasClient.post('/api/v1/transfers', napasPayload);
    return this.mapToTransferResult(response);
  }
  async checkStatus(referenceId: string): Promise<TransferStatus> {
    const response = await this.napasClient.get(`/api/v1/transfers/${referenceId}/status`);
    return this.mapToStatus(response);
  }
}
```

### Pattern 220.3: Reserve Management (HIGH)

```
220.3 Reserve management: Track fiat reserves backing VNDT tokens.
      Domain service — ensures total VNDT supply never exceeds verified fiat reserves.
```

```typescript
export class ReserveManager {
  constructor(private readonly reserveRepo: ReserveRepositoryPort) {}
  async verifyMintAllowed(amount: Money): Promise<boolean> {
    const reserve = await this.reserveRepo.getCurrentReserve();
    const totalSupply = await this.reserveRepo.getTotalVndtSupply();
    return reserve.subtract(totalSupply).gte(amount);
  }
  async recordDeposit(amount: Money, bankRef: string): Promise<void> {
    await this.reserveRepo.addReserve(amount, bankRef);
  }
}
```

### Pattern 220.4: Payment Gateway Port (HIGH)

```
220.4 Payment gateway port: Define interface for deposit/withdrawal operations.
      Domain defines port — infrastructure implements with NAPAS, bank APIs, etc.
```

```typescript
export interface PaymentGatewayPort {
  initiateTransfer(request: TransferRequest): Promise<TransferResult>;
  checkStatus(referenceId: string): Promise<TransferStatus>;
}
export interface TransferRequest {
  fromAccount: BankAccount;
  toAccount: BankAccount;
  amount: Money;
  reference: string;
  idempotencyKey: string;
}
```

### Pattern 220.5: Bank Transfer Adapter (MEDIUM-HIGH)

```
220.5 Bank transfer adapter: Implementation for specific bank APIs.
      Each bank has its own adapter class implementing PaymentGatewayPort.
```

```typescript
export class VietcombankAdapter implements PaymentGatewayPort {
  constructor(private readonly client: VcbApiClient) {}
  async initiateTransfer(request: TransferRequest): Promise<TransferResult> {
    const vcbPayload = { src: request.fromAccount.number, dst: request.toAccount.number,
      amt: request.amount.toMinorUnits(), ref: request.reference };
    const res = await this.client.transfer(vcbPayload);
    return new TransferResult(res.transactionId, TransferStatus.PENDING);
  }
}
```

### Pattern 220.6: Reconciliation (MEDIUM-HIGH)

```
220.6 Reconciliation: Scheduled job to match internal records with bank statements.
      Application use case — compares internal transactions against bank statement entries.
```

```typescript
export class ReconcileTransactionsUseCase {
  constructor(
    private readonly txRepo: TransactionRepositoryPort,
    private readonly bankPort: BankStatementPort,
  ) {}
  async execute(date: Date): Promise<ReconciliationReport> {
    const internal = await this.txRepo.findByDate(date);
    const bankEntries = await this.bankPort.getStatementEntries(date);
    const matched = this.matchEntries(internal, bankEntries);
    const unmatched = internal.filter(tx => !matched.has(tx.reference));
    return new ReconciliationReport(matched.size, unmatched, date);
  }
}
```

### Pattern 220.7: Transaction Entity (HIGH)

```
220.7 Transaction entity: Amount, currency, status, reference, timestamps.
      Core entity for tracking all monetary movements through the system.
```

```typescript
export class Transaction {
  constructor(
    public readonly id: string,
    public readonly amount: Money,
    private status: TransactionStatus,
    public readonly reference: string,
    public readonly idempotencyKey: string,
    public readonly createdAt: Date,
  ) {}
  complete(): void {
    if (this.status !== TransactionStatus.PENDING) throw new TransactionStateError('Only PENDING can complete');
    this.status = TransactionStatus.COMPLETED;
  }
  fail(reason: string): void { this.status = TransactionStatus.FAILED; }
}
```

### Pattern 220.8: Idempotency (HIGH)

```
220.8 Idempotency: Unique transaction reference to prevent double processing.
      Every payment operation requires idempotencyKey — duplicate key returns original result.
```

```typescript
export class IdempotencyGuard {
  constructor(private readonly store: IdempotencyStorePort) {}
  async executeOnce<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const existing = await this.store.find(key);
    if (existing) return existing.result as T;
    const result = await operation();
    await this.store.save(key, result);
    return result;
  }
}
```

---

## Best Practices

### Financial Safety
- EVERY operation requires idempotency key — no exception
- Saga pattern for cross-system operations (mint+transfer) — compensate on failure
- Never assume failure on payment timeout — schedule status check
- Reserve management: real-time balance tracking, never cache monetary totals

### NAPAS Integration
- Timeout ≠ failure — schedule retry/status check
- All NAPAS responses logged with full payload — regulatory requirement
- Test with NAPAS sandbox before production — different error codes per bank
- Rate limit outgoing transfers — prevent bulk unauthorized transfers

### Reconciliation
- Daily automated reconciliation: internal ledger vs bank statement
- Alert on any mismatch > threshold (e.g., 100,000 VND)
- All timestamps in UTC — convert to ICT only in reports/presentation
- Reconciliation is domain service, not cron job logic

### Blockchain Integration
- VNDT mint/burn → chaincode records on ledger
- Transfer events → blockchain for immutable audit trail
- Reserve proof: chaincode stores reserve balance, verifiable on-chain

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| No Idempotency | Double mint on retry | IdempotencyGuard on every payment op |
| Timeout = Failure | NAPAS timeout auto-fails transfer | Schedule status check, PENDING state |
| Reserve in Cache | Cached balance becomes stale | Real-time DB balance, never cache |
| UTC/Local Mix | Reconciliation mismatch | UTC everywhere, convert at boundary |
| Single-Step Saga | Mint+transfer in one tx | Saga: mint → transfer → compensate |

---

## Testing Patterns

```typescript
// 1. Test idempotent mint
describe('IdempotencyGuard', () => {
  it('should return same result on duplicate key', async () => {
    const result1 = await guard.executeOnce('dep-123', () => mintService.mint(amount));
    const result2 = await guard.executeOnce('dep-123', () => mintService.mint(amount));
    expect(result1).toEqual(result2);
    expect(mintService.mint).toHaveBeenCalledTimes(1); // only called once
  });
});
```

```typescript
// 2. Test saga compensation
describe('WithdrawalSaga', () => {
  it('should re-mint VNDT on transfer failure', async () => {
    mockPaymentPort.transfer.mockRejectedValue(new Error('Bank rejected'));
    await expect(saga.withdraw(userId, amount)).rejects.toThrow();
    expect(mockVndtService.mint).toHaveBeenCalledWith(userId, amount); // compensation
  });
});
```

```typescript
// 3. Test reconciliation
describe('ReconciliationService', () => {
  it('should detect mismatch between ledger and bank', async () => {
    const report = await reconciliation.run(new Date('2026-03-28'));
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0].difference.amount).toBe(50000);
  });
});
```

---

## Transaction Flow Reference

```
Deposit (Fiat → VNDT):
  Bank deposit confirmed → Verify amount → Mint VNDT → Credit user → Emit event

Withdrawal (VNDT → Fiat):
  User requests → Verify balance → Burn VNDT → Initiate bank transfer
                                             → Transfer OK → Complete
                                             → Transfer FAIL → Re-mint (compensate)
                                             → Transfer TIMEOUT → Schedule status check
```

---

## Abnormal Case Patterns

1. **Double mint on retry** — Fix: IdempotencyGuard with deposit reference as key.

2. **Reserve desync after failed withdrawal** — Fix: saga pattern, compensate (re-mint) on failure.

3. **NAPAS timeout treated as failure** — Fix: schedule status check, never auto-fail on timeout.

4. **Reconciliation mismatch due to timezone** — Fix: UTC everywhere, convert at boundary.

5. **Unauthorized bulk transfer** — Compromised API key initiates many transfers. Fix: rate limiting + anomaly detection on transfer frequency/amount.

6. **Bank maintenance window** — Transfers fail during bank downtime. Fix: queue transfers, retry after window, notify user of delay.

7. **VNDT supply exceeds reserve** — More VNDT minted than fiat in reserve. Fix: reserve check BEFORE mint, real-time balance from DB.

8. **Duplicate bank statement entry** — Bank sends same transaction twice in reconciliation file. Fix: deduplicate by bank reference ID before processing.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (220.1-220.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Banking & Fiat Gateway Specialist — Domain | EPS v3.2*
