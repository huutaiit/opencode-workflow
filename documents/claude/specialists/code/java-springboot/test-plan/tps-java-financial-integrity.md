# Test Plan Specialist — Java Financial Integrity Testing
# テストプランスペシャリスト — Java 金融整合性テスト
# Chuyen Gia Test — Financial Integrity Test Java

**Version**: 1.0.0
**Technology**: JUnit 5 + BigDecimal + Testcontainers
**Aspect**: Financial Integrity Testing
**Category**: backend
**Purpose**: Financial integrity testing — BigDecimal precision, ledger balance verification, amortization accuracy, payment idempotency, audit trail

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | FIN |
| **Specialist Type** | code |
| **Purpose** | Financial integrity testing — BigDecimal precision, ledger balance verification, amortization accuracy, payment idempotency, audit trail |

---

## Patterns

### Pattern FIN.1: BigDecimal Precision Testing

Java uses BigDecimal (not double) for money. Test: new BigDecimal("0.1").add(new BigDecimal("0.2")).equals(new BigDecimal("0.3")) → true. RoundingMode.HALF_UP for financial. assertThat(amount).isEqualByComparingTo for scale-independent comparison.

---

### Pattern FIN.2: Ledger Double-Entry Balance

Insert 100 random debit/credit pairs → SUM(CASE WHEN type=CREDIT THEN amount ELSE -amount END) = 0 exactly. Test with real DB (Testcontainers). Orphaned entry detection.

---

### Pattern FIN.3: Amortization Schedule

Calculate 12-month schedule for 10,000 USD at 8%. First payment ≈ 869.88. Last balance = 0 exactly. Total payments ≈ 10,438.56. Cross-validate with Excel PMT().

---

### Pattern FIN.4: Payment Idempotency

Send same payment (idempotency key) twice → exactly 1 ledger entry. Send 5 concurrent duplicates → still 1 entry. Different amount + same key → IdempotencyConflictException.

---

### Pattern FIN.5: Regulatory Audit Trail

Financial mutation → AuditLog with actor, timestamp, oldValues, newValues, correlationId. Audit table is append-only (UPDATE/DELETE blocked). Retention query works.

---

## ❌ Negative Example

❌ double for money: new double(0.1) + new double(0.2) = 0.30000000000000004. Over 1M transactions: $3,000+ error. ✅ BigDecimal: exact arithmetic, explicit rounding.

---

## Quality Checklist

- [ ] **Q1**: All patterns have Java-specific code examples?
- [ ] **Q2**: Both reactive and standard variants covered where applicable?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: Testcontainers used (not H2/mocks) for data tests?

---

*Test Plan Specialist — Java Financial Integrity Testing | EPS v10.0*
