# Odoo Delivery Tracking Specialist — Enterprise
# Odoo Delivery Tracking Chuyen Gia — Enterprise
# Odoo 配送追跡 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Delivery Tracking
**Category**: domain-delivery | **Purpose**: Integrate carrier APIs for label generation, tracking numbers, and rate shopping

---

## Metadata

```json
{"id":"odoo-delivery-tracking-specialist","technology":"Odoo 18 Enterprise","aspect":"Delivery Tracking","category":"domain-delivery","subcategory":"odoo","lines":130,"token_cost":1600,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/delivery_fedex/","E2: /opt/workspace/odoo-18/odoo/addons/delivery_ups/"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 504.1–504.5 |
| **Dependencies** | `delivery_fedex`, `delivery_ups`, `delivery_dhl` (Enterprise) |
| **When To Use** | Carrier API integration — shipping labels, tracking, and rate comparison |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: delivery_fedex, delivery_ups, tracking_number, label |

---

## Patterns

**504.1** Carrier API pattern: `send_shipping()` → returns tracking_number + label.
**504.2** Rate shopping: `rate_shipment()` → compare rates across carriers.
**504.3** Label generation: PDF shipping label stored on picking.
**504.4** Tracking URL: auto-generated link for customer portal.
**504.5** Supported carriers: FedEx, UPS, DHL, USPS, Easypost, Sendcloud.

---

*Odoo Delivery Tracking Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
