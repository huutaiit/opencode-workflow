# Odoo Delivery Carrier Specialist — Enterprise
# Odoo Delivery Carrier Chuyen Gia — Enterprise
# Odoo 配送キャリア スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Delivery Carriers
**Category**: domain-delivery | **Purpose**: Configure shipping methods, delivery rules, and price computation

---

## Metadata

```json
{"id":"odoo-delivery-carrier-specialist","technology":"Odoo 18 Enterprise","aspect":"Delivery Carriers","category":"domain-delivery","subcategory":"odoo","lines":130,"token_cost":1600,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/delivery/models/"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 503.1–503.6 |
| **Dependencies** | `delivery` module |
| **When To Use** | Shipping configuration — carrier setup, delivery methods, and rate computation |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: delivery.carrier, shipping, carrier_id |

---

## Patterns

**503.1** `delivery.carrier` — shipping method with pricing rules.
**503.2** Delivery price rules: fixed price, based on weight, based on order amount.
**503.3** Free shipping threshold.
**503.4** Delivery method on SO: auto-add shipping line.
**503.5** Multi-carrier per warehouse.
**503.6** Delivery grid: zone-based pricing.

---

*Odoo Delivery Carrier Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
