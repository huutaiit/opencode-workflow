# Odoo Account Budget Specialist — Enterprise
# Odoo Account Budget Chuyen Gia — Enterprise
# Odoo 予算 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Budget Management
**Category**: domain-accounting | **Purpose**: Create and track budgets with analytic-based budget lines and variance analysis

---

## Metadata

```json
{"id":"odoo-account-budget-specialist","technology":"Odoo 18 Enterprise","aspect":"Budget Management","category":"domain-accounting","subcategory":"odoo","lines":150,"token_cost":1900,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_budget/models/ (6 files)","E2: Odoo 18 official docs (accounting/budget)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 432.1–432.6 |
| **Dependencies** | `account_budget` (Enterprise) |
| **When To Use** | Budget planning, analytic-based spending limits, and budget vs actual variance tracking |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: crossovered.budget, budget_line, budget |

---

## Patterns

**432.1** `crossovered.budget` — budget header (name, date range, state: draft/confirm/validate/done/cancel).
**432.2** `crossovered.budget.lines` — budget lines by analytic account + account.
**432.3** Planned amount vs practical amount (actual spend from journal entries).
**432.4** Budget position — grouping accounts for budget comparison.
**432.5** Budget warnings when threshold exceeded.
**432.6** Multi-period budget creation.

---

*Odoo Account Budget Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
