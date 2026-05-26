# Odoo Stock Route Specialist — Enterprise
# Odoo Stock Route Chuyen Gia — Enterprise
# Odoo 在庫ルート スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Routes & Procurement
**Category**: domain-inventory | **Purpose**: Configure stock routes, push/pull rules, warehouses, and procurement logic

---

## Metadata

```json
{"id":"odoo-stock-route-specialist","technology":"Odoo 18 Enterprise","aspect":"Routes & Procurement","category":"domain-inventory","subcategory":"odoo","lines":170,"token_cost":2100,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/stock/models/stock_rule.py","E2: /opt/workspace/odoo-18/odoo/addons/stock/models/stock_warehouse.py"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 441.1–441.8 |
| **Dependencies** | `stock` module |
| **When To Use** | Warehouse configuration — routes, locations, push/pull rules, and multi-step operations |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: stock.route, stock.rule, stock.warehouse, stock.location, procurement |

---

## Patterns

**441.1** `stock.route` — defines how products move (Buy, Manufacture, Dropship, etc.).
**441.2** `stock.rule` — push/pull rule within a route (action: pull/push/pull_push/buy/manufacture).
**441.3** `stock.warehouse` — warehouse with location hierarchy (stock, input, output, QC, packing).
**441.4** `stock.location` — tree structure (usage: internal/customer/supplier/transit/production/inventory).
**441.5** Multi-step routes: 1-step (ship), 2-step (pick+ship), 3-step (pick+pack+ship).
**441.6** Procurement group: groups related moves for same SO/PO.
**441.7** Reordering rules (`stock.warehouse.orderpoint`): min/max, trigger: auto/manual.
**441.8** Cross-dock and dropship routes.

---

*Odoo Stock Route Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
