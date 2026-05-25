# Test Plan Specialist — NestJS Financial Integrity Testing
# テストプランスペシャリスト — NestJS 金融整合性テスト
# Chuyen Gia Test — Kiem Thu Toan Ven Tai Chinh NestJS

**Version**: 1.0.0
**Stack**: TypeScript/NestJS | **Type**: Financial Integrity Testing
**Purpose**: Financial integrity test patterns — Decimal.js precision, Money VO arithmetic, ledger balance verification, amortization schedule accuracy, idempotency, payment state machine, regulatory audit trail

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain + Application + Infrastructure (test) |
| **Variant** | ALL |
| **Pattern Numbers** | TPS-NESTJS-FIN-INT |
| **Directory Pattern** | `src/domain/financial/**/*.spec.ts`, `test/integration/financial/**/*.spec.ts` |
| **Naming Convention** | `{concern}.financial.spec.ts` |
| **Imports From** | Domain (Money VO, entities), Application (use cases), Infrastructure (repositories) |
| **Imported By** | N/A |
| **Cannot Import** | N/A |
| **Dependencies** | jest, decimal.js, @testcontainers/postgresql |
| **When To Use** | Any feature involving money, payments, interest, ledger, regulatory compliance |
| **Source Skeleton** | `src/domain/financial/**/*.spec.ts`, `test/integration/financial/` |
| **Specialist Type** | code |
| **Purpose** | Financial integrity test patterns — precision, ledger balance, amortization, idempotency, audit trail |
| **Activation Trigger** | files: **/financial/**, **/domain/lending/**; keywords: money, ledger, payment, interest, amortization, idempotency, audit |

---

## Why This TPS Exists

Financial bugs are the most expensive bugs in production. A rounding error of $0.01 per transaction × 1M transactions = $10,000 loss. A missing idempotency check = double payment. A broken audit trail = regulatory fine.

This TPS teaches the AI agent **fintech-specific test patterns** that generic unit/integration TPS files don't cover.

---

## Patterns

### Pattern FIN.1: Money Value Object Precision Testing

```typescript
describe('Money — Financial Precision', () => {
  // CRITICAL: JavaScript number fails these — MUST use Decimal.js
  describe('floating point traps', () => {
    it('should handle 0.1 + 0.2 correctly (the classic JS trap)', () => {
      const a = Money.create(0.1, 'USD');
      const b = Money.create(0.2, 'USD');
      const sum = a.add(b);
      expect(sum.amount).toBe(0.3); // JS number: 0.30000000000000004
      expect(sum.amountString).toBe('0.30');
    });

    it('should handle large amounts without precision loss', () => {
      const a = Money.create(999999999.99, 'USD');
      const b = Money.create(0.01, 'USD');
      expect(a.add(b).amount).toBe(1000000000.00);
    });

    it('should handle very small amounts', () => {
      const a = Money.create(0.01, 'USD');
      const b = Money.create(0.01, 'USD');
      expect(a.subtract(b).amount).toBe(0);
    });
  });

  describe('rounding rules', () => {
    it('should round HALF_UP (banker standard) not HALF_EVEN', () => {
      expect(Money.create(100.555, 'USD').round(2).amount).toBe(100.56); // HALF_UP
      expect(Money.create(100.545, 'USD').round(2).amount).toBe(100.55); // HALF_UP
      expect(Money.create(100.565, 'USD').round(2).amount).toBe(100.57); // HALF_UP
    });

    it('should preserve precision through chain of operations', () => {
      // Simulate: principal × rate × (days/365) for 3 installments
      const principal = Money.create(10000, 'USD');
      const rate = 0.08; // 8% annual
      const days = [30, 31, 28];
      let totalInterest = Money.zero('USD');
      for (const d of days) {
        const interest = principal.multiply(rate * d / 365).round(2);
        totalInterest = totalInterest.add(interest);
      }
      // Verify total matches independent calculation
      const expected = 10000 * 0.08 * (30 + 31 + 28) / 365;
      expect(totalInterest.amount).toBeCloseTo(expected, 1); // within $0.1
    });
  });

  // ❌ NEGATIVE EXAMPLE: What goes wrong WITHOUT Decimal.js
  // const total = 0.1 + 0.2; // = 0.30000000000000004
  // After 10M transactions: accumulated error = $3,000+
  // After rounding per transaction: silent $0.01 loss per txn
});
```

---

### Pattern FIN.2: Ledger Double-Entry Balance Verification

```typescript
describe('Ledger — Double-Entry Integrity', () => {
  let ds: DataSource;

  beforeAll(async () => { ds = await setupTestDb(); });
  afterAll(() => teardownTestDb());
  afterEach(() => cleanDb(ds));

  it('should maintain zero-sum across all entries (fundamental accounting equation)', async () => {
    // Create 100 random transactions
    for (let i = 0; i < 100; i++) {
      const amount = Money.create(Math.random() * 1000, 'USD');
      const [debit, credit] = LedgerEntry.createPair(
        randomUUID(), `account-${i % 10}`, `account-${(i + 5) % 10}`, amount, 'test',
      );
      await ds.getRepository(LedgerEntry).save([debit, credit]);
    }

    // CRITICAL CHECK: sum of ALL entries must be exactly 0
    const result = await ds.query(`
      SELECT SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END) as balance
      FROM ledger_entries
    `);
    expect(parseFloat(result[0].balance)).toBe(0); // MUST be exact 0, not "close to 0"
  });

  it('should reject orphaned entry (debit without credit)', async () => {
    // LedgerEntry.createPair ALWAYS returns [debit, credit]
    // Saving only one should fail or leave inconsistent state
    const [debit] = LedgerEntry.createPair(randomUUID(), 'a1', 'a2', Money.create(100, 'USD'), 'test');
    await ds.getRepository(LedgerEntry).save(debit);

    // Verify balance is NOT zero → orphaned entry detected
    const result = await ds.query(`
      SELECT SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END) as balance
      FROM ledger_entries WHERE transaction_id = '${debit.transactionId}'
    `);
    expect(parseFloat(result[0].balance)).not.toBe(0); // IMBALANCE detected
  });

  it('should compute correct account balance as of specific date', async () => {
    // Seed: account-1 receives $1000 on Jan 1, spends $300 on Jan 15
    await seedLedger(ds, [
      { date: '2026-01-01', from: 'account-2', to: 'account-1', amount: 1000 },
      { date: '2026-01-15', from: 'account-1', to: 'account-3', amount: 300 },
    ]);

    // Balance as of Jan 10: $1000 (before spend)
    const jan10 = await ledgerService.getBalance('account-1', new Date('2026-01-10'));
    expect(jan10.amount).toBe(1000);

    // Balance as of Jan 20: $700 (after spend)
    const jan20 = await ledgerService.getBalance('account-1', new Date('2026-01-20'));
    expect(jan20.amount).toBe(700);
  });

  // ❌ NEGATIVE EXAMPLE: Single-entry bookkeeping
  // account.balance += amount; // no audit trail, can't detect errors
  // If server crashes between debit and credit → money vanishes or duplicates
  // Double-entry guarantees: sum of all entries = 0 ALWAYS
});
```

---

### Pattern FIN.3: Amortization Schedule Accuracy

```typescript
describe('InterestCalculator — Amortization', () => {
  it('should generate correct 12-month amortization schedule', () => {
    const schedule = InterestCalculator.amortizationSchedule(
      Money.create(10000, 'USD'), 0.08, 12, // $10K, 8% annual, 12 months
    );

    expect(schedule).toHaveLength(12);

    // First payment: mostly interest
    expect(schedule[0].payment.amount).toBeCloseTo(869.88, 2);
    expect(schedule[0].interest.amount).toBeCloseTo(66.67, 2); // 10000 * 0.08/12
    expect(schedule[0].principal.amount).toBeCloseTo(803.21, 2);

    // Last payment: mostly principal
    expect(schedule[11].interest.amount).toBeLessThan(10); // minimal interest
    expect(schedule[11].balance.amount).toBe(0); // fully repaid

    // Total payments should exceed principal (interest earned)
    const totalPayments = schedule.reduce((sum, s) => sum + s.payment.amount, 0);
    expect(totalPayments).toBeGreaterThan(10000);
    expect(totalPayments).toBeCloseTo(10438.56, 0); // known correct value

    // Sum of all principal portions = original principal
    const totalPrincipal = schedule.reduce((sum, s) => sum + s.principal.amount, 0);
    expect(totalPrincipal).toBeCloseTo(10000, 0);
  });

  it('should handle final payment rounding adjustment', () => {
    // Accumulated rounding may leave $0.01-$0.03 remaining
    // Final payment should adjust to close balance exactly to 0
    const schedule = InterestCalculator.amortizationSchedule(
      Money.create(9999.99, 'USD'), 0.075, 36,
    );
    const lastEntry = schedule[schedule.length - 1];
    expect(lastEntry.balance.amount).toBe(0); // MUST be exact 0
  });

  it('should match known reference calculation (Excel PMT function)', () => {
    // Cross-validate with Excel: =PMT(0.08/12, 12, -10000) = 869.88
    const schedule = InterestCalculator.amortizationSchedule(
      Money.create(10000, 'USD'), 0.08, 12,
    );
    expect(schedule[0].payment.amount).toBeCloseTo(869.88, 2);
  });

  // ❌ NEGATIVE EXAMPLE: Using JavaScript Math for financial calculations
  // const monthlyRate = 0.08 / 12; // 0.006666666666666667 (repeating)
  // Over 360 months: accumulated floating-point drift = $10-100 depending on principal
});
```

---

### Pattern FIN.4: Payment Idempotency Testing

```typescript
describe('Payment Processing — Idempotency', () => {
  it('should process payment exactly once despite duplicate requests', async () => {
    const idempotencyKey = 'pay-key-unique-123';
    const paymentDto = { amount: 1000, currency: 'USD', loanId: 'loan-1', idempotencyKey };

    // First request: processes payment
    const result1 = await paymentUseCase.execute(paymentDto);
    expect(result1.status).toBe('COMPLETED');

    // Second request (same idempotency key): returns same result, NOT double charge
    const result2 = await paymentUseCase.execute(paymentDto);
    expect(result2.transactionId).toBe(result1.transactionId); // SAME transaction
    expect(result2.status).toBe('COMPLETED');

    // Verify: only 1 ledger entry pair created
    const entries = await ledgerRepo.findByTransactionId(result1.transactionId);
    expect(entries).toHaveLength(2); // 1 debit + 1 credit, NOT 4
  });

  it('should reject different amount with same idempotency key', async () => {
    const idempotencyKey = 'pay-key-conflict';
    await paymentUseCase.execute({ amount: 1000, currency: 'USD', loanId: 'loan-1', idempotencyKey });

    // Different amount, same key → conflict
    await expect(
      paymentUseCase.execute({ amount: 2000, currency: 'USD', loanId: 'loan-1', idempotencyKey }),
    ).rejects.toThrow(IdempotencyConflictException);
  });

  it('should handle concurrent duplicate requests safely', async () => {
    const idempotencyKey = 'pay-key-concurrent';
    const dto = { amount: 500, currency: 'USD', loanId: 'loan-1', idempotencyKey };

    // Fire 5 concurrent requests with same key
    const results = await Promise.allSettled([
      paymentUseCase.execute(dto),
      paymentUseCase.execute(dto),
      paymentUseCase.execute(dto),
      paymentUseCase.execute(dto),
      paymentUseCase.execute(dto),
    ]);

    const successes = results.filter(r => r.status === 'fulfilled');
    // ALL should succeed (idempotent) with SAME transactionId
    expect(successes.length).toBe(5);
    const txIds = new Set(successes.map(r => (r as any).value.transactionId));
    expect(txIds.size).toBe(1); // all return same transaction
  });

  // ❌ NEGATIVE EXAMPLE: No idempotency key
  // User clicks "Pay" twice → two ledger entries → account debited $2000 instead of $1000
  // Payment gateway webhook retries → triple charge
  // Fix: ALWAYS require idempotency key, check BEFORE processing
});
```

---

### Pattern FIN.5: Payment State Machine Testing

```typescript
describe('Payment State Machine', () => {
  const validTransitions = [
    ['INITIATED', 'PROCESS', 'PROCESSING'],
    ['PROCESSING', 'COMPLETE', 'COMPLETED'],
    ['PROCESSING', 'FAIL', 'FAILED'],
    ['FAILED', 'RETRY', 'PROCESSING'],
    ['COMPLETED', 'REFUND', 'REFUNDING'],
    ['REFUNDING', 'REFUND_COMPLETE', 'REFUNDED'],
  ];

  const invalidTransitions = [
    ['INITIATED', 'COMPLETE'],    // can't skip PROCESSING
    ['COMPLETED', 'PROCESS'],     // can't reprocess completed
    ['REFUNDED', 'REFUND'],       // can't re-refund
    ['FAILED', 'COMPLETE'],       // can't complete from failed (must retry first)
  ];

  describe.each(validTransitions)('%s + %s → %s', (from, event, to) => {
    it(`should transition`, () => {
      const newState = paymentFSM.transition(from, event);
      expect(newState).toBe(to);
    });
  });

  describe.each(invalidTransitions)('%s + %s → REJECT', (from, event) => {
    it(`should throw InvalidTransitionException`, () => {
      expect(() => paymentFSM.transition(from, event)).toThrow(InvalidTransitionException);
    });
  });

  it('should record full lifecycle in audit trail', async () => {
    const payment = await createPayment();
    await transitionPayment(payment.id, 'PROCESS');
    await transitionPayment(payment.id, 'COMPLETE');
    await transitionPayment(payment.id, 'REFUND');
    await transitionPayment(payment.id, 'REFUND_COMPLETE');

    const history = await stateTransitionRepo.findByEntityId(payment.id);
    expect(history.map(h => h.toState)).toEqual(['PROCESSING', 'COMPLETED', 'REFUNDING', 'REFUNDED']);
    expect(history.every(h => h.actor && h.timestamp)).toBe(true);
  });

  // ❌ NEGATIVE EXAMPLE: String-based status without FSM
  // payment.status = 'completed'; // no validation, any status accepted
  // payment.status = 'REFUNDED'; // can set without going through REFUNDING
  // Result: inconsistent state, missed webhook, lost money
});
```

---

### Pattern FIN.6: Regulatory Audit Trail Testing

```typescript
describe('Audit Trail — Regulatory Compliance', () => {
  it('should log ALL financial mutations with who/when/what', async () => {
    // Simulate: officer approves loan
    await approveLoanUseCase.execute({ loanId: 'loan-1', approvedAmount: 8000 }, { userId: 'officer-1' });

    const audits = await auditLogRepo.findByEntity('Loan', 'loan-1');
    expect(audits.length).toBeGreaterThanOrEqual(1);

    const approvalAudit = audits.find(a => a.action === 'UPDATE' && a.newValues?.status === 'APPROVED');
    expect(approvalAudit).toBeDefined();
    expect(approvalAudit.actor).toBe('officer-1');          // WHO
    expect(approvalAudit.timestamp).toBeDefined();           // WHEN
    expect(approvalAudit.oldValues.status).toBe('PENDING');  // WHAT (before)
    expect(approvalAudit.newValues.status).toBe('APPROVED'); // WHAT (after)
    expect(approvalAudit.newValues.approvedAmount).toBe(8000);
  });

  it('should NOT allow audit log modification (append-only)', async () => {
    const audit = await auditLogRepo.findOne({ where: { id: existingAuditId } });

    // Direct update should fail (DB permission or application-level check)
    audit.action = 'TAMPERED';
    await expect(auditLogRepo.save(audit)).rejects.toThrow(); // or verify no UPDATE query executed
  });

  it('should include correlation ID for cross-service trace', async () => {
    const audits = await auditLogRepo.findByEntity('Payment', 'pay-1');
    expect(audits.every(a => a.correlationId)).toBe(true);
    // All audits for same request should share correlation ID
    const correlationIds = new Set(audits.map(a => a.correlationId));
    expect(correlationIds.size).toBe(1);
  });

  it('should support data retention query (GDPR/compliance)', async () => {
    // Find all audit logs older than retention period
    const oldLogs = await auditLogRepo.findOlderThan(365); // 1 year
    // Should be archivable, not deletable in-place
    expect(oldLogs.every(l => l.canArchive)).toBe(true);
  });

  // ❌ NEGATIVE EXAMPLE: console.log for audit
  // console.log('Loan approved by', userId); // lost on container restart
  // No who/when/what structure, no queryability, fails compliance audit
  // Fix: Structured audit entity + immutable table + retention policy
});
```

---

### Pattern FIN.7: Multi-Currency Conversion Testing

```typescript
describe('Currency Exchange — Edge Cases', () => {
  it('should prevent conversion with stale rate (>1 hour old)', async () => {
    const staleRate = ExchangeRate.create('USD', 'EUR', 0.92, 0.005, new Date(Date.now() - 2 * 3600000)); // 2h old
    rateProvider.getRate.mockResolvedValue(staleRate);

    await expect(
      exchangeService.convert(Money.create(1000, 'USD'), 'EUR'),
    ).rejects.toThrow(StaleExchangeRateException);
  });

  it('should apply spread correctly (buy vs sell rate)', () => {
    const rate = ExchangeRate.create('USD', 'EUR', 0.92, 0.005); // 0.5% spread
    expect(rate.buyRate).toBeCloseTo(0.9246, 4);  // mid + spread
    expect(rate.sellRate).toBeCloseTo(0.9154, 4); // mid - spread
  });

  it('should round converted amount per target currency rules', async () => {
    // JPY: 0 decimal places, VND: 0, USD: 2, BTC: 8
    const result = await exchangeService.convert(Money.create(100.50, 'USD'), 'JPY');
    expect(result.amount).toBe(Math.round(result.amount)); // no decimals for JPY
  });
});
```

---

## Anti-Patterns (Financial-Specific)

| # | Anti-Pattern | Consequence | Correct Pattern |
|---|-------------|-------------|-----------------|
| 1 | `number` type for money amounts | $0.01 errors accumulate to $1000s | Decimal.js Money VO (FIN.1) |
| 2 | Single-entry bookkeeping | Money appears/disappears, undetectable | Double-entry ledger (FIN.2) |
| 3 | No idempotency key on payments | Double/triple charges on retry | Idempotency key check BEFORE processing (FIN.4) |
| 4 | `console.log` for audit trail | Lost on restart, fails compliance | Immutable audit entity (FIN.6) |
| 5 | String-based payment status | Invalid transitions, inconsistent state | FSM with guard functions (FIN.5) |
| 6 | Skip final payment rounding check | Loan shows $0.01 remaining forever | Adjust last installment to close balance (FIN.3) |

---

## Coverage Target

| Concern | Target | Critical Because |
|---------|--------|-----------------|
| Money VO arithmetic | 100% | $0.01 error × 1M txn = $10K loss |
| Ledger zero-sum | 100% | Any imbalance = accounting error |
| Amortization accuracy | 100% + cross-validation | Regulatory reporting depends on this |
| Payment idempotency | 100% including concurrent | Double-charge = refund + customer trust lost |
| State machine transitions | 100% valid + invalid | Invalid state = stuck payment, lost money |
| Audit trail completeness | 100% | Compliance audit failure = regulatory fine |
| Currency conversion | 90% | Stale rate, spread, rounding per currency |

---

## Quality Checklist

- [ ] **Q1**: All Money operations tested with Decimal.js precision (not JS number)?
- [ ] **Q2**: Ledger zero-sum invariant verified after all test scenarios?
- [ ] **Q3**: Amortization cross-validated against known reference (Excel PMT)?
- [ ] **Q4**: Idempotency tested with concurrent requests (not just sequential)?
- [ ] **Q5**: Audit trail verified as immutable (append-only)?

---

*Test Plan Specialist — NestJS Financial Integrity Testing | EPS v10.0*
*Created from cross-debate W1: Gemini × Claude converged on fintech domain blindspot*
