# Odoo MRP Work Order Specialist — Enterprise
# Odoo MRP Work Order Chuyen Gia — Enterprise
# Odoo 作業指示 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Work Orders & Work Centers
**Category**: domain-mrp | **Purpose**: Configure work centers, operations, work orders, and shop floor capacity

---

## Metadata

```json
{"id":"odoo-mrp-workorder-specialist","technology":"Odoo 18 Enterprise","aspect":"Work Orders & Work Centers","category":"domain-mrp","subcategory":"odoo","lines":150,"token_cost":1900,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/mrp_workorder/models/ (11 files)","E2: Odoo 18 official docs (manufacturing/work_orders)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 448.1–448.8 |
| **Dependencies** | `mrp_workorder` (Enterprise) |
| **When To Use** | Routing-based manufacturing with work centers, operations, and time tracking |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: mrp.workorder, mrp.workcenter, mrp.routing.workcenter |

---

## Patterns

**448.1** `mrp.workcenter` — machine/station with capacity, cost/hour, OEE tracking.
**448.2** `mrp.routing.workcenter` — operation step in BOM routing (sequence, duration).
**448.3** `mrp.workorder` — individual work order generated from production + routing.
**448.4** Work order lifecycle: pending → waiting → ready → progress → done.
**448.5** Time tracking: start/pause/finish with duration recording.
**448.6** Tablet/shop floor interface for operators.
**448.7** Work center capacity planning and scheduling.
**448.8** Quality checks integrated into work order steps.

---

*Odoo MRP Work Order Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
