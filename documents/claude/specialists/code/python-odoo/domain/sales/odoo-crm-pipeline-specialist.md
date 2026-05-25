# Odoo CRM Pipeline Specialist — Enterprise
# Odoo CRM Pipeline Chuyen Gia — Enterprise
# Odoo CRMパイプライン スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: CRM Pipeline
**Category**: domain-sales | **Purpose**: Manage leads, opportunities, stages, scoring, activities, and won/lost tracking

---

## Metadata

```json
{"id":"odoo-crm-pipeline-specialist","technology":"Odoo 18 Enterprise","aspect":"CRM Pipeline","category":"domain-sales","subcategory":"odoo","lines":170,"token_cost":2100,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/crm/models/crm_lead.py","E2: Odoo 18 official docs (sales/crm)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 453.1–453.10 |
| **Dependencies** | `crm` module |
| **When To Use** | Sales pipeline — lead tracking, opportunity management, and conversion to quotation |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: crm.lead, crm.stage, pipeline, opportunity, lead |

---

## Patterns

**453.1** `crm.lead` — unified lead/opportunity model (`type`: lead vs opportunity).
**453.2** `crm.stage` — Kanban stages (New → Qualified → Proposition → Won).
**453.3** Lead scoring: `lead_scoring_crm` module with predictive scoring.
**453.4** Lead-to-opportunity conversion.
**453.5** Activity scheduling: next action dates and follow-up reminders.
**453.6** Won/lost tracking with `lost_reason_id`.
**453.7** Duplicate lead detection and merging.
**453.8** Sales team assignment and pipeline per team.
**453.9** Expected revenue and probability tracking.
**453.10** Lead enrichment (IAP service for company data).

---

*Odoo CRM Pipeline Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
