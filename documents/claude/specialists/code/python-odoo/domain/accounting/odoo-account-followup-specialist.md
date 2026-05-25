# Odoo Account Follow-up Specialist — Enterprise
# Odoo Account Follow-up Chuyen Gia — Enterprise
# Odoo 督促 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Payment Follow-up
**Category**: domain-accounting | **Purpose**: Automate overdue payment reminders with multi-level follow-up actions

---

## Metadata

```json
{"id":"odoo-account-followup-specialist","technology":"Odoo 18 Enterprise","aspect":"Payment Follow-up","category":"domain-accounting","subcategory":"odoo","lines":150,"token_cost":1900,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_followup/models/ (6 files)","E2: Odoo 18 official docs (accounting/receivables/follow_up)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 436.1–436.6 |
| **Dependencies** | `account_followup` (Enterprise) |
| **When To Use** | Overdue invoice collection — automated reminder emails, SMS, and escalation actions |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: account.followup, followup_level, overdue |

---

## Patterns

**436.1** `account.followup.report` — partner-level follow-up report showing overdue invoices.
**436.2** Follow-up levels — multi-step escalation (e.g., 15 days: email, 30 days: letter, 60 days: legal).
**436.3** Follow-up actions: send email, send SMS, print letter, manual action.
**436.4** Automatic follow-up via scheduled action (cron).
**436.5** Exclude disputed invoices from follow-up.
**436.6** Follow-up history tracking on partner.

---

*Odoo Account Follow-up Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
