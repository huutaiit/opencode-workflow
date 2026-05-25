# Odoo Sale Commission Specialist — Enterprise
# Odoo Sale Commission Chuyen Gia — Enterprise
# Odoo 販売手数料 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Sales Commission
**Category**: domain-sales | **Purpose**: Configure commission plans, rates, and salesperson commission tracking

---

## Metadata

```json
{"id":"odoo-sale-commission-specialist","technology":"Odoo 18 Enterprise","aspect":"Sales Commission","category":"domain-sales","subcategory":"odoo","lines":120,"token_cost":1500,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/sale_commission/models/"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 457.1–457.5 |
| **Dependencies** | `sale_commission` (Enterprise) |
| **When To Use** | Salesperson incentives — commission plans, rate calculations, and payout tracking |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: sale_commission, commission_plan, commission |

---

## Patterns

**457.1** Commission plans: fixed rate, tiered, product-based.
**457.2** Commission rate assignment per salesperson/team.
**457.3** Commission computation on invoice payment.
**457.4** Commission reporting and payout.
**457.5** Multi-level commission (salesperson + manager).

---

*Odoo Sale Commission Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
