# Odoo MRP BOM Specialist — Enterprise
# Odoo MRP BOM Chuyen Gia — Enterprise
# Odoo 部品表 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Bills of Materials
**Category**: domain-mrp | **Purpose**: Define BOMs (normal/phantom/kit), BOM lines, by-products, and ECO changes

---

## Metadata

```json
{"id":"odoo-mrp-bom-specialist","technology":"Odoo 18 Enterprise","aspect":"Bills of Materials","category":"domain-mrp","subcategory":"odoo","lines":160,"token_cost":2000,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/mrp/models/mrp_bom.py","E2: Odoo 18 official docs (manufacturing/bom)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 446.1–446.8 |
| **Dependencies** | `mrp` module |
| **When To Use** | Defining product recipes — component lists, kit explosions, and BOM versioning |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: mrp.bom, bom_line_ids, bom_id, phantom, kit |

---

## Patterns

**446.1** `mrp.bom` — BOM types: `normal` (manufacturing), `phantom` (kit, exploded in deliveries).
**446.2** `mrp.bom.line` — component with quantity, unit of measure, and operation.
**446.3** `mrp.bom.byproduct` — by-products from manufacturing.
**446.4** Multi-level BOM: nested BOMs for sub-assemblies.
**446.5** BOM variants: apply BOM to specific product variants via `bom_product_template_attribute_value_ids`.
**446.6** Kit explosion: phantom BOM auto-expands in SO/DO (no manufacturing order).
**446.7** ECO (Engineering Change Order): BOM changes via `mrp_plm`.
**446.8** BOM cost computation: rolled-up cost from components.

---

*Odoo MRP BOM Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
