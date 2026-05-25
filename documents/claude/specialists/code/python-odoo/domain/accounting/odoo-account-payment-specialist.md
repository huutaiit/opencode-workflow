# Odoo Account Payment Specialist — Enterprise
# Odoo Account Payment Chuyen Gia — Enterprise
# Odoo 支払い スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Payments
**Category**: domain-accounting | **Purpose**: Process payments, batch payments, SEPA/ISO20022, and payment matching

---

## Metadata

```json
{"id":"odoo-account-payment-specialist","technology":"Odoo 18 Enterprise","aspect":"Payments","category":"domain-accounting","subcategory":"odoo","lines":170,"token_cost":2100,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_batch_payment/","E2: /opt/workspace/odoo-18/odoo/addons/account_iso20022/"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 435.1–435.8 |
| **Dependencies** | `account_batch_payment`, `account_iso20022` (Enterprise) |
| **When To Use** | Payment registration, batch payment processing, SEPA transfers, and payment provider integration |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: account.payment, account.batch.payment, SEPA, ISO20022 |

---

## Patterns

**435.1** `account.payment` — register payment for invoice (payment_type: inbound/outbound).
**435.2** `account.batch.payment` — group payments for bank file generation.
**435.3** SEPA Credit Transfer (SCT) — pain.001 XML generation.
**435.4** SEPA Direct Debit (SDD) — pain.008 XML for recurring collection.
**435.5** ISO 20022 generic format support.
**435.6** Payment matching to invoices via `reconcile()`.
**435.7** Online payment integration (`payment.provider` → Stripe, PayPal, etc.).
**435.8** Payment difference handling (write-off, keep open, or partial).

---

*Odoo Account Payment Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
