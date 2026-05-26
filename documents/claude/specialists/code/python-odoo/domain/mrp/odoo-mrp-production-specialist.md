# Odoo MRP Production Specialist — Enterprise
# Odoo MRP Production Chuyen Gia — Enterprise
# Odoo 製造オーダー スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Manufacturing Orders
**Category**: domain-mrp | **Purpose**: Manage manufacturing orders, scheduling, planning, and production lifecycle

---

## Metadata

```json
{"id":"odoo-mrp-production-specialist","technology":"Odoo 18 Enterprise","aspect":"Manufacturing Orders","category":"domain-mrp","subcategory":"odoo","lines":170,"token_cost":2100,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/mrp/models/mrp_production.py","E2: Odoo 18 official docs (manufacturing/production)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 447.1–447.10 |
| **Dependencies** | `mrp` module |
| **When To Use** | Manufacturing order lifecycle — creation, component consumption, production recording, and completion |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: mrp.production, manufacturing_order, produce, mark_done |

---

## Patterns

**447.1** `mrp.production` — manufacturing order. State: draft → confirmed → progress → to_close → done → cancel.
**447.2** Auto-creation from reordering rules or SO (via routes).
**447.3** Component reservation: `action_assign()` reserves raw materials.
**447.4** Production recording: set `qty_producing` → `button_mark_done()`.
**447.5** Backorder: partial production creates backorder for remaining.
**447.6** Scrap during production.
**447.7** Serial number assignment for finished product.
**447.8** Unbuild: reverse a manufacturing order.
**447.9** Planning: scheduled start/finish dates, lead time computation.
**447.10** Cost tracking: raw material + operations = total manufacturing cost.

---

*Odoo MRP Production Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
