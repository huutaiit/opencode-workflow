# Odoo MRP MPS Specialist — Enterprise
# Odoo MRP MPS Chuyen Gia — Enterprise
# Odoo 生産計画 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Master Production Schedule
**Category**: domain-mrp | **Purpose**: Forecast demand, plan production quantities, and manage replenishment schedules

---

## Metadata

```json
{"id":"odoo-mrp-mps-specialist","technology":"Odoo 18 Enterprise","aspect":"Master Production Schedule","category":"domain-mrp","subcategory":"odoo","lines":140,"token_cost":1700,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/mrp_mps/models/ (9 files)","E2: Odoo 18 official docs (manufacturing/mps)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 451.1–451.6 |
| **Dependencies** | `mrp_mps` (Enterprise) |
| **When To Use** | Production planning — demand forecasting, safety stock, and replenishment scheduling |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: mrp.mps, master_production_schedule, forecast |

---

## Patterns

**451.1** MPS grid: product × time period matrix showing demand, supply, and replenishment.
**451.2** Demand sources: sales forecasts, confirmed SO, manual input.
**451.3** Supply sources: on-hand, incoming PO, planned MO.
**451.4** Safety stock: minimum stock level triggering replenishment.
**451.5** Replenishment: generate PO/MO from MPS recommendations.
**451.6** Multi-period view (weekly/monthly) with rolling forecast.

---

*Odoo MRP MPS Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
