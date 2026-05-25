# Odoo Stock Landed Costs Specialist — Enterprise
# Odoo Stock Landed Costs Chuyen Gia — Enterprise
# Odoo ランデッドコスト スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Landed Costs
**Category**: domain-inventory | **Purpose**: Allocate additional costs (freight, customs, insurance) to inventory receipts

---

## Metadata

```json
{"id":"odoo-stock-landed-costs-specialist","technology":"Odoo 18 Enterprise","aspect":"Landed Costs","category":"domain-inventory","subcategory":"odoo","lines":130,"token_cost":1600,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/stock_landed_costs/models/","E2: Odoo 18 official docs (inventory/valuation/landed_costs)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 444.1–444.5 |
| **Dependencies** | `stock_landed_costs` |
| **When To Use** | Adding freight, customs, insurance costs to product cost after receipt |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: stock.landed.cost, landed_costs, split_method |

---

## Patterns

**444.1** `stock.landed.cost` — header record linking vendor bill lines to receipt pickings.
**444.2** Split methods: by quantity, by current cost, by weight, by volume, equal.
**444.3** Validate → creates valuation adjustment entries.
**444.4** Links to vendor bill (cost lines from bill).
**444.5** Impact on FIFO/AVCO valuation layers.

---

*Odoo Stock Landed Costs Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
