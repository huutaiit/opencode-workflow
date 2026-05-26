# Odoo MRP Quality Specialist — Enterprise
# Odoo MRP Quality Chuyen Gia — Enterprise
# Odoo 品質管理 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Quality Control
**Category**: domain-mrp | **Purpose**: Define quality checks, control points, alerts, and worksheets for manufacturing

---

## Metadata

```json
{"id":"odoo-mrp-quality-specialist","technology":"Odoo 18 Enterprise","aspect":"Quality Control","category":"domain-mrp","subcategory":"odoo","lines":150,"token_cost":1900,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/quality_control/models/ (8 files)","E2: Odoo 18 official docs (manufacturing/quality)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 449.1–449.8 |
| **Dependencies** | `quality_control` (Enterprise) |
| **When To Use** | Quality assurance — inspection points during receipt, production, and shipping |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: quality.check, quality.point, quality.alert |

---

## Patterns

**449.1** `quality.point` — defines when/what to check (trigger: receipt/production/transfer).
**449.2** `quality.check` — individual check instance. Types: pass/fail, measure, picture, instructions.
**449.3** `quality.alert` — raised on check failure for corrective action.
**449.4** Control plan: group of quality points for a product/operation.
**449.5** Worksheet-based quality checks (custom forms).
**449.6** Auto-generate checks on transfer/work order based on quality points.
**449.7** SPC (Statistical Process Control) charts for measure-type checks.
**449.8** Integration with work orders (quality step in routing).

---

*Odoo MRP Quality Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
