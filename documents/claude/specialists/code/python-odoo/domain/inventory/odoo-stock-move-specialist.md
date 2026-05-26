# Odoo Stock Move Specialist — Enterprise
# Odoo Stock Move Chuyen Gia — Enterprise
# Odoo 在庫移動 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Stock Moves & Pickings
**Category**: domain-inventory | **Purpose**: Manage stock moves, pickings, move lines, and reservation logic

---

## Metadata

```json
{"id":"odoo-stock-move-specialist","technology":"Odoo 18 Enterprise","aspect":"Stock Moves & Pickings","category":"domain-inventory","subcategory":"odoo","lines":200,"token_cost":2500,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/stock/models/stock_move.py","E2: /opt/workspace/odoo-18/odoo/addons/stock/models/stock_picking.py","E3: Odoo 18 official docs (inventory/warehouses/stock_moves)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 440.1–440.12 |
| **Source Paths** | `**/stock/models/stock_move*.py`, `**/stock/models/stock_picking.py` |
| **Dependencies** | `stock` module |
| **When To Use** | Warehouse operations — receipts, deliveries, internal transfers, reservation, and stock move lifecycle |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: stock.move, stock.picking, stock.move.line, reservation |

---

## Patterns

### 440.1–440.4: Core Models (CRITICAL)

**440.1** `stock.picking` — transfer document (receipt/delivery/internal). State: draft → waiting → confirmed → assigned → done → cancel.
**440.2** `stock.move` — individual product movement between locations. Key fields: product_id, product_uom_qty, quantity (done qty), location_id, location_dest_id.
**440.3** `stock.move.line` — detailed move with lot/serial tracking. Links move to specific lot_id, package_id.
**440.4** Reservation: `_action_assign()` reserves stock from quants. `_action_done()` confirms transfer.

### 440.5–440.8: Operations (HIGH)

**440.5** Receipt workflow: PO confirmation → picking created → validate → stock increased.
**440.6** Delivery workflow: SO confirmation → picking created → reserve → validate → stock decreased.
**440.7** Internal transfer: move between warehouse locations.
**440.8** Return/reverse transfer: create return picking from original.

### 440.9–440.12: Advanced (MEDIUM)

**440.9** Backorder creation when partial transfer.
**440.10** Immediate transfer (no reservation, direct validation).
**440.11** Scrap: move product to scrap location.
**440.12** Package operations (put in pack, unpack).

---

*Odoo Stock Move Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
