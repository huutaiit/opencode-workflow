# Odoo Account Bank Specialist — Enterprise
# Odoo Account Bank Chuyen Gia — Enterprise
# Odoo 銀行照合 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Bank Reconciliation
**Category**: domain-accounting | **Purpose**: Manage bank statements, reconciliation widget, and matching rules

---

## Metadata

```json
{"id":"odoo-account-bank-specialist","technology":"Odoo 18 Enterprise","aspect":"Bank Reconciliation","category":"domain-accounting","subcategory":"odoo","lines":180,"token_cost":2200,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_accountant/models/bank_rec_widget.py","E2: Odoo 18 official docs (accounting/bank)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 434.1–434.14 |
| **Dependencies** | `account_accountant` (Enterprise) |
| **When To Use** | Bank statement import, transaction matching, reconciliation widget, and reconciliation models |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: bank.rec.widget, account.bank.statement, reconcile |

---

## Patterns

**434.1** Bank statement import (OFX, CSV, CAMT.053).
**434.2** `bank.rec.widget` — reconciliation widget model.
**434.3** `bank.rec.widget.line` — matching lines in the widget.
**434.4** Auto-reconciliation rules (`account.reconcile.model`).
**434.5** Manual matching: drag invoice to bank statement line.
**434.6** Partial reconciliation (amount mismatch → write-off).
**434.7** Bank synchronization (Plaid, Yodlee).
**434.8–434.14** Advanced: multi-currency reconciliation, batch reconciliation, reconciliation models (invoice matching, write-off, payment tolerance).

---

*Odoo Account Bank Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
