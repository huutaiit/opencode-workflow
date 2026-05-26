# Odoo Stock Batch Picking Specialist — Enterprise
# Odoo Stock Batch Picking Chuyen Gia — Enterprise
# Odoo バッチピッキング スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Batch & Wave Picking
**Category**: domain-inventory | **Purpose**: Group multiple transfers into batch/wave picks for warehouse efficiency

---

## Metadata

```json
{"id":"odoo-stock-batch-specialist","technology":"Odoo 18 Enterprise","aspect":"Batch & Wave Picking","category":"domain-inventory","subcategory":"odoo","lines":130,"token_cost":1600,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/stock_picking_batch/models/","E2: Odoo 18 official docs (inventory/shipping/batch)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 445.1–445.5 |
| **Dependencies** | `stock_picking_batch` |
| **When To Use** | High-volume warehouses — batch picking, wave picking, and cluster picking strategies |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: stock.picking.batch, batch_id, wave |

---

## Patterns

**445.1** `stock.picking.batch` — groups pickings for parallel processing.
**445.2** Batch states: draft → in_progress → done → cancel.
**445.3** Wave picking: create batch from filtered pickings by zone/priority.
**445.4** Batch validation: validate all pickings in batch at once.
**445.5** Barcode integration for batch picking.

---

*Odoo Stock Batch Picking Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
