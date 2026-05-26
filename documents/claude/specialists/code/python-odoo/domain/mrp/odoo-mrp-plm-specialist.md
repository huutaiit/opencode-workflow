# Odoo MRP PLM Specialist — Enterprise
# Odoo MRP PLM Chuyen Gia — Enterprise
# Odoo PLM スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Product Lifecycle Management
**Category**: domain-mrp | **Purpose**: Manage Engineering Change Orders (ECOs), product revisions, and BOM change management

---

## Metadata

```json
{"id":"odoo-mrp-plm-specialist","technology":"Odoo 18 Enterprise","aspect":"Product Lifecycle Management","category":"domain-mrp","subcategory":"odoo","lines":140,"token_cost":1700,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/mrp_plm/models/ (7 files)","E2: Odoo 18 official docs (manufacturing/plm)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 450.1–450.7 |
| **Dependencies** | `mrp_plm` (Enterprise) |
| **When To Use** | Engineering changes — product revision control, BOM modifications, and approval workflows |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: mrp.eco, mrp_plm, eco, engineering_change |

---

## Patterns

**450.1** `mrp.eco` — Engineering Change Order with stage-based workflow.
**450.2** ECO types: BOM change, routing change, product change.
**450.3** Product revision: create new version of product with updated BOM.
**450.4** BOM comparison: diff between current and proposed BOM.
**450.5** Approval workflow: ECO stages with approval groups.
**450.6** Apply ECO: update BOM/routing/product automatically.
**450.7** Revision history tracking.

---

*Odoo MRP PLM Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
