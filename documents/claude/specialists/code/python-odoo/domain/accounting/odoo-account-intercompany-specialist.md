# Odoo Account Inter-Company Specialist — Enterprise
# Odoo Account Inter-Company Chuyen Gia — Enterprise
# Odoo 会社間取引 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Inter-Company
**Category**: domain-accounting | **Purpose**: Automate inter-company transactions (SO→PO, invoice mirroring, and elimination)

---

## Metadata

```json
{"id":"odoo-account-intercompany-specialist","technology":"Odoo 18 Enterprise","aspect":"Inter-Company","category":"domain-accounting","subcategory":"odoo","lines":150,"token_cost":1900,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_inter_company_rules/models/ (5 files)","E2: Odoo 18 official docs (accounting/inter_company)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 437.1–437.5 |
| **Dependencies** | `account_inter_company_rules` (Enterprise) |
| **When To Use** | Multi-company groups where transactions between companies need automatic mirroring |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: inter_company, account_inter_company_rules |

---

## Patterns

**437.1** Inter-company SO → auto-generate PO in counterpart company.
**437.2** Inter-company invoice → auto-generate vendor bill in counterpart company.
**437.3** Configuration: per-company rules defining behavior (auto-generate SO/PO/invoice).
**437.4** Inter-company accounts mapping.
**437.5** Consolidation elimination entries for group reporting.

---

*Odoo Account Inter-Company Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
