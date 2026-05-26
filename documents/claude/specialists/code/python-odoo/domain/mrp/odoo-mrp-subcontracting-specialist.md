# Odoo MRP Subcontracting Specialist — Enterprise
# Odoo MRP Subcontracting Chuyen Gia — Enterprise
# Odoo 外注 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Subcontracting
**Category**: domain-mrp | **Purpose**: Manage subcontracted manufacturing with component shipping and finished product receipt

---

## Metadata

```json
{"id":"odoo-mrp-subcontracting-specialist","technology":"Odoo 18 Enterprise","aspect":"Subcontracting","category":"domain-mrp","subcategory":"odoo","lines":150,"token_cost":1900,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/mrp_subcontracting/models/ (14 files)","E2: Odoo 18 official docs (manufacturing/subcontracting)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 452.1–452.8 |
| **Dependencies** | `mrp_subcontracting` (Enterprise) |
| **When To Use** | Outsourced manufacturing — sending components to subcontractor and receiving finished products |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: mrp_subcontracting, subcontractor, is_subcontractor |

---

## Patterns

**452.1** Subcontracted BOM: BOM with `type='subcontract'` and subcontractor partner.
**452.2** PO to subcontractor → auto-generates component delivery.
**452.3** Receipt of finished product from subcontractor.
**452.4** Component tracking: resupply subcontractor location.
**452.5** Cost: subcontracting service cost + component cost.
**452.6** Quality checks on subcontracted receipt.
**452.7** Multi-step subcontracting (ship components → receive finished).
**452.8** Subcontractor portal for production reporting.

---

*Odoo MRP Subcontracting Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
