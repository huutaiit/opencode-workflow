# Odoo Account Reports Specialist — Enterprise
# Odoo Account Reports Chuyen Gia — Enterprise
# Odoo 会計レポート スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Financial Reports
**Category**: domain-accounting | **Purpose**: Build and customize financial reports using the account.report engine

---

## Metadata

```json
{"id":"odoo-account-reports-specialist","technology":"Odoo 18 Enterprise","aspect":"Financial Reports","category":"domain-accounting","subcategory":"odoo","lines":200,"token_cost":2500,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_reports/models/account_report.py (~7300 lines)","E2: Odoo 18 official docs (accounting/reporting)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 433.1–433.16 |
| **Dependencies** | `account_reports` (Enterprise) |
| **When To Use** | Financial statements (P&L, Balance Sheet), tax reports, aged receivables/payables, and custom reports |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: account.report, account.report.line, account.report.expression |

---

## Patterns

### 433.1–433.6: Report Engine (CRITICAL)

**433.1** `account.report` — report definition with lines and expressions.
**433.2** `account.report.line` — report row (hierarchy via parent_id).
**433.3** `account.report.expression` — formulas: `sum`, `balance`, `aggregation`, `account_codes`, `tax_tags`.
**433.4** Report options: date range, comparison, multi-company, cash/accrual basis.
**433.5** Built-in reports: Profit & Loss, Balance Sheet, Cash Flow, General Ledger.
**433.6** Aged Partner Balance — buckets (0-30, 31-60, 61-90, 90+).

### 433.7–433.12: Custom Reports (HIGH)

**433.7** Custom report via XML data: define `account.report` + `account.report.line` + `account.report.expression` records.
**433.8** Expression engine: domain-based aggregation.
**433.9** Column customization.
**433.10** Drill-down to journal entries.
**433.11** Export to Excel/PDF.
**433.12** Comparison periods (previous year, previous period).

### 433.13–433.16: Tax Reports (MEDIUM)

**433.13** Generic tax report.
**433.14** Country-specific tax declarations.
**433.15** EC Sales List (EU).
**433.16** Tax closing (lock period + generate closing entry).

---

*Odoo Account Reports Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
