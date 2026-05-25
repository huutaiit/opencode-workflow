# Odoo Sale Subscription Specialist — Enterprise
# Odoo Sale Subscription Chuyen Gia — Enterprise
# Odoo サブスクリプション スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Subscriptions
**Category**: domain-sales | **Purpose**: Manage recurring contracts, MRR/ARR, renewals, upsells, and churn

---

## Metadata

```json
{"id":"odoo-sale-subscription-specialist","technology":"Odoo 18 Enterprise","aspect":"Subscriptions","category":"domain-sales","subcategory":"odoo","lines":180,"token_cost":2200,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/sale_subscription/models/ (19 files)","E2: Odoo 18 official docs (sales/subscriptions)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 455.1–455.12 |
| **Dependencies** | `sale_subscription` (Enterprise) |
| **When To Use** | Recurring revenue — subscription creation, auto-invoicing, renewal, and churn management |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: sale_subscription, is_subscription, subscription_state, MRR, recurring |

---

## Patterns

**455.1** Subscription states: draft → progress → paused → renewed → churned → upsell.
**455.2** `sale.subscription.plan` — billing period (monthly, yearly).
**455.3** Recurring invoice generation via cron (`_cron_create_subscription_invoices`).
**455.4** MRR/ARR computation.
**455.5** Renewal quotation: `prepare_renewal_order()`.
**455.6** Upsell: `prepare_upsell_order()`.
**455.7** Close/churn with reason tracking.
**455.8** Pause/resume invoicing.
**455.9** Subscription KPIs: churn rate, ARPU, LTV.
**455.10** Rating integration (customer satisfaction).
**455.11** Auto-payment with tokenized cards.
**455.12** Subscription alerts and notifications.

---

*Odoo Sale Subscription Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
