# Odoo Inheritance Specialist — Enterprise
# Odoo Inheritance Chuyen Gia — Enterprise
# Odoo 継承スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Model Inheritance
**Category**: core
**Purpose**: Apply correct Odoo inheritance type (extension, mixin injection, prototype, delegation) based on use case

---

## Metadata

```json
{
  "id": "odoo-inheritance-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Model Inheritance",
  "category": "core",
  "subcategory": "odoo",
  "lines": 200,
  "token_cost": 1200,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 inheritance tutorial (odoo.com/documentation/18.0/developer/tutorials/server_framework_101/12_inheritance.html)",
    "E2: /opt/workspace/odoo-18/odoo/models.py lines 439-606 (inheritance resolution)",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale_subscription/models/sale_order.py line 35-37 (mixin injection)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Model |
| **Directory Pattern** | `{module}/models/{model_name}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 402.1–402.4 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | Every model file potentially uses inheritance |
| **Naming Convention** | Class name = CamelCase of model (SaleOrder for sale.order) |
| **Imports From** | `odoo.models` |
| **Imported By** | All layers (inheritance is structural) |
| **Cannot Import** | N/A (structural concern) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Extending existing models, injecting mixins, creating model variants, or delegating to parent models |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Apply correct Odoo inheritance type based on use case |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: _inherit, _inherits, _name |

---

## Role

You are an **Odoo Inheritance Specialist** for Odoo 18 Enterprise. Your responsibility is to select and apply the correct inheritance mechanism. Odoo has 4 distinct inheritance types — choosing wrong type causes data loss, table bloat, or broken relationships.

**Used by**: Code agents creating models that extend or compose with existing models
**Not used by**: View inheritance (see odoo-view-extension specialist)

---

## Patterns

### Pattern 402.1: Extension Inheritance — Add to Existing (CRITICAL)

**Most common**. Extends an existing model in-place. Same database table. NO new `_name`.

Use when: Adding fields/methods to a model you don't own (from another module).

```python
# sale_stock/models/sale_order.py — adds stock fields to sale.order
class SaleOrder(models.Model):
    _inherit = 'sale.order'
    # NO _name — extends existing sale.order table

    warehouse_id = fields.Many2one('stock.warehouse', compute='_compute_warehouse_id')
    picking_ids = fields.One2many('stock.picking', 'sale_id')
    delivery_count = fields.Integer(compute='_compute_delivery_count')
```

**Rules**:
- NEVER set `_name` when extending (would create prototype inheritance instead)
- Class name can be anything but convention: same as original (SaleOrder)
- Multiple modules can extend same model — fields merge into same table

### Pattern 402.2: Mixin Injection — Retroactive Capability (HIGH)

Re-declares `_name` equal to original AND adds new mixin(s) to `_inherit` list.

Use when: Injecting mixin capabilities into a model you don't own.

```python
# sale_subscription/models/sale_order.py — injects rating.mixin into sale.order
class SaleOrder(models.Model):
    _name = "sale.order"
    _inherit = ["rating.mixin", "sale.order"]
    # _name == "sale.order" AND _inherit is a list → mixin injection
```

```python
# documents_hr/models/hr_employee.py — injects documents.mixin
class HrEmployee(models.Model):
    _name = 'hr.employee'
    _inherit = ['hr.employee', 'documents.mixin']
```

**Rules**:
- `_name` MUST equal original model name (not a new name)
- `_inherit` MUST be a list containing both original model AND new mixin(s)
- Original model MUST be in the list (usually last) — order matters for MRO
- After injection, model gains all mixin fields/methods retroactively

### Pattern 402.3: Prototype Inheritance — Copy Structure (LOW)

Creates a NEW model that copies parent's fields into a new table. Rarely used.

Use when: Creating a new model that shares structure with an existing one but is independent.

```python
# Creates res.supplier with all fields from res.partner but separate table
class ResSupplier(models.Model):
    _name = 'res.supplier'
    _inherit = 'res.partner'
    # _name != 'res.partner' → prototype: NEW table with copied fields
```

**Rules**:
- `_name` MUST differ from `_inherit` value
- `_inherit` is a string (not list) — single parent
- Creates entirely separate database table
- Changes to parent do NOT propagate to child after creation
- Rarely used in practice — prefer delegation or extension

### Pattern 402.4: Delegation Inheritance — Composition (MEDIUM)

Creates NEW model with transparent access to parent's fields via Many2one link. Two separate tables.

Use when: Model "is-a" parent but needs its own identity and additional fields.

```python
class HrEmployee(models.Model):
    _name = 'hr.employee'
    _inherits = {'res.partner': 'partner_id'}  # note: _inheritS with S

    partner_id = fields.Many2one('res.partner', required=True, ondelete='cascade')
    department_id = fields.Many2one('hr.department')
    # Can access partner_id.name as employee.name transparently
```

**Rules**:
- Use `_inherits` (with S) — dict mapping parent model → Many2one field name
- MUST declare the Many2one field explicitly with `required=True, ondelete='cascade'`
- Parent record created automatically when child is created
- Reading `employee.name` transparently reads `employee.partner_id.name`
- Writing `employee.name` writes to `employee.partner_id.name`
- Two database tables — parent has its own lifecycle

---

## Abnormal Case Patterns (3 patterns)

1. **Confusing _inherit (string) vs _inherit (list)** — `_inherit = 'sale.order'` extends; `_inherit = ['rating.mixin', 'sale.order']` with `_name = 'sale.order'` injects mixin. Fix: If adding mixin, MUST use list form AND set `_name`.

2. **Prototype when extension intended** — `_name = 'sale.order'` + `_inherit = 'other.model'` creates prototype, not extension. Fix: For extension, OMIT `_name`. For mixin injection, set `_name` equal to model in the list.

3. **_inherits without Many2one field** — Odoo silently fails. Fix: ALWAYS declare the Many2one field referenced in `_inherits` dict with `required=True, ondelete='cascade'`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (402.1-402.4), no overlap?
- [ ] **Q3**: Trilingual header present (EN/VI/JP)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Inheritance Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
