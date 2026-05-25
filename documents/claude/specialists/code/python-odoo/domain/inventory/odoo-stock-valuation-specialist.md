# Odoo Stock Valuation Specialist — Enterprise
# Odoo Stock Valuation Chuyen Gia — Enterprise
# Odoo 在庫評価 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Stock Valuation
**Category**: domain-inventory | **Purpose**: Configure inventory valuation methods (FIFO/AVCO/Standard) and accounting entries

---

## Metadata

```json
{"id":"odoo-stock-valuation-specialist","technology":"Odoo 18 Enterprise","aspect":"Stock Valuation","category":"domain-inventory","subcategory":"odoo","lines":160,"token_cost":2000,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/stock_account/models/ (15 files)","E2: Odoo 18 official docs (inventory/valuation)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 442.1–442.8 |
| **Dependencies** | `stock_account` (Enterprise) |
| **When To Use** | Inventory costing — FIFO, Average Cost (AVCO), Standard Cost, and automated accounting entries |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: stock.valuation.layer, product_category.property_cost_method, stock_account |

---

## Patterns

**442.1** Cost methods: `standard` (fixed), `fifo` (first-in-first-out), `average` (weighted average).
**442.2** `stock.valuation.layer` — tracks value per stock move (quantity, unit_cost, value, remaining_qty).
**442.3** Automated accounting entries on stock moves (perpetual inventory).
**442.4** Manual valuation (periodic inventory) — no auto journal entries.
**442.5** Product category configuration: `property_cost_method`, `property_valuation`.
**442.6** Stock input/output/valuation accounts on product category.
**442.7** Anglo-Saxon vs Continental accounting mode.
**442.8** Inventory adjustment valuation (revaluation entries).

---

*Odoo Stock Valuation Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
