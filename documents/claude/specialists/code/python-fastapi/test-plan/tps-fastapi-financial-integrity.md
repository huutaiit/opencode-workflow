# Test Plan Specialist — FastAPI Financial Integrity Testing
# テストプランスペシャリスト — FastAPI Financial Integrity Testing
# Chuyen Gia Test — FastAPI Financial Integrity Testing

**Version**: 1.0.0
**Technology**: pytest + pytest-asyncio
**Purpose**: Financial testing - Decimal precision, ledger balance, payment idempotency, audit trail (Python has native Decimal - better than JS)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | FIN |
| **Specialist Type** | code |
| **Purpose** | Financial testing - Decimal precision, ledger balance, payment idempotency, audit trail (Python has native Decimal - better than JS) |

---

## Patterns

### Pattern FIN.1: Decimal Precision (Python Advantage)

Python Decimal is built-in: from decimal import Decimal, ROUND_HALF_UP. Decimal("0.1") + Decimal("0.2") == Decimal("0.3") -> True. quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) for financial rounding.

---

### Pattern FIN.2: Ledger Double-Entry

Insert 100 debit/credit pairs via SQLAlchemy. SELECT SUM(CASE WHEN type=CREDIT THEN amount ELSE -amount END) FROM ledger -> must be exactly 0. Test with real Postgres.

---

### Pattern FIN.3: Amortization Schedule

Calculate 12-month schedule. Assert: first_payment ~= 869.88, last_balance == 0 exactly. Cross-validate with numpy_financial.pmt() or manual formula.

---

### Pattern FIN.4: Payment Idempotency

Same idempotency_key twice -> same transaction returned. 5 concurrent duplicates (asyncio.gather) -> exactly 1 DB record. Different amount + same key -> 409 Conflict.

---

### Pattern FIN.5: Audit Trail

SQLAlchemy event.listen(mapper, "after_update", audit_handler). Verify: actor, timestamp, old_values, new_values logged. Audit table is append-only.

---

## ❌ Negative Example

BAD: float for money in Python. Decimal("0.1") + Decimal("0.2") == Decimal("0.3") (correct). 0.1 + 0.2 == 0.30000000000000004 (wrong). Python Decimal is safer than JS Number but still needs explicit use.

---

## Quality Checklist

- [ ] **Q1**: All patterns use pytest + async patterns (not unittest)?
- [ ] **Q2**: Testcontainers for DB tests (not SQLite)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: dependency_overrides pattern used for DI mocking?

---

*Test Plan Specialist — FastAPI Financial Integrity Testing | EPS v10.0*
