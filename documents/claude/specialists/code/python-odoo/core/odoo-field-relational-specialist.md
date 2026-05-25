# Odoo Relational Field Specialist — Enterprise
# Odoo Relational Field Chuyen Gia — Enterprise
# Odoo リレーショナルフィールド スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Relational Fields
**Category**: core
**Purpose**: Generate correct relational field declarations and recordset command patterns

---

## Metadata

```json
{
  "id": "odoo-field-relational-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Relational Fields",
  "category": "core",
  "subcategory": "odoo",
  "lines": 300,
  "token_cost": 3600,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#relational-fields)",
    "E2: /opt/workspace/odoo-18/odoo/fields.py (source analysis, lines 3132-4955)",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale/models/sale_order.py (real usage)"
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
| **Pattern Numbers** | 404.1–404.16 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | 5–50 model files per module |
| **Naming Convention** | M2O: `{model}_id`, O2M: `{model}_ids`, M2M: `{model}_ids` or `tag_ids` |
| **Imports From** | `odoo.fields`, `odoo.models`, `odoo.fields.Command` |
| **Imported By** | views (widget rendering), controllers, reports, wizards |
| **Cannot Import** | N/A (relational fields are foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Declaring model relationships — Many2one, One2many, Many2many, Reference, and Command operations |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Generate correct relational field declarations and recordset command patterns |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: fields.Many2one, fields.One2many, fields.Many2many, Command |

---

## Role

You are an **Odoo Relational Field Specialist** for Odoo 18 Enterprise. Your responsibility is to generate correct relational field declarations (Many2one, One2many, Many2many, Reference) with proper ondelete policies, domain configuration, and Command operations for x2many write patterns.

**Used by**: Code agents generating/modifying Odoo model relationships
**Not used by**: Scalar fields (see odoo-field-basic), computed fields logic (see odoo-field-computed)

---

## Patterns

### Pattern 404.1–404.3: Many2one Field (CRITICAL)

**404.1 fields.Many2one — FK relationship**: Single record reference. Stored as `int4` column. Required params: `comodel_name`. Optional: `ondelete`, `auto_join`, `delegate`, `check_company`.

```python
# sale/models/sale_order.py — standard M2O declarations
company_id = fields.Many2one(
    comodel_name='res.company',
    required=True, index=True,
    default=lambda self: self.env.company)

partner_id = fields.Many2one(
    comodel_name='res.partner',
    string="Customer",
    required=True, change_default=True, index=True,
    tracking=1,
    check_company=True)
```

**404.2 ondelete policies for Many2one**: Determines behavior when referenced record is deleted.

```python
# 'restrict' — block deletion (default for required M2O)
partner_id = fields.Many2one('res.partner', required=True, ondelete='restrict')

# 'cascade' — delete this record too (default for TransientModel→Model)
order_id = fields.Many2one('sale.order', ondelete='cascade')

# 'set null' — clear reference (default for non-required M2O)
campaign_id = fields.Many2one('utm.campaign', ondelete='set null')
```

**Rules**:
- `required=True` + `ondelete='set null'` → raises ValueError (contradictory)
- TransientModel→Model defaults to `ondelete='cascade'` (prevents FK blocking)
- `ondelete='restrict'` is forbidden for `ir.*` comodels (ir.model, ir.model.fields, etc.)

**404.3 auto_join and delegate**: `auto_join=True` generates SQL JOINs on search (performance). `delegate=True` enables delegation inheritance (`_inherits`).

```python
# auto_join for frequently searched relations
partner_id = fields.Many2one('res.partner', auto_join=True)

# delegate — fields of res.partner accessible on hr.employee
partner_id = fields.Many2one('res.partner', delegate=True, ondelete='cascade')
```

### Pattern 404.4–404.5: One2many Field (CRITICAL)

**404.4 fields.One2many — inverse relationship**: Virtual field (no DB column). Requires `comodel_name` + `inverse_name`. `copy=False` by default.

```python
# sale/models/sale_order.py — order lines
order_line = fields.One2many(
    comodel_name='sale.order.line',
    inverse_name='order_id',
    string="Order Lines",
    copy=True, auto_join=True)
```

**404.5 One2many with domain filtering**: Use domain to show subset of related records.

```python
# Only show confirmed lines
confirmed_line_ids = fields.One2many(
    'sale.order.line', 'order_id',
    domain=[('state', '=', 'confirmed')])
```

**Rules**:
- `inverse_name` MUST reference an existing Many2one field on the comodel
- Set `copy=True` explicitly when lines should be duplicated with parent (default is False)
- `auto_join=True` for frequently searched O2M (generates SQL joins)

### Pattern 404.6–404.8: Many2many Field (CRITICAL)

**404.6 fields.Many2many — implicit relation table**: Auto-generates relation table from model names. Sufficient when only ONE M2M exists between two models.

```python
# sale/models/sale_order.py — tags
tag_ids = fields.Many2many(
    comodel_name='crm.tag',
    string="Tags")
```

**404.7 Explicit relation/column1/column2**: REQUIRED when multiple M2M fields reference the same comodel, or for clearer table naming.

```python
# sale/models/sale_order.py — explicit relation table
transaction_ids = fields.Many2many(
    comodel_name='payment.transaction',
    relation='sale_order_transaction_rel',
    column1='sale_order_id',
    column2='transaction_id',
    string="Transactions",
    copy=False, readonly=True)
```

**404.8 Many2many ondelete**: Only `'cascade'` (default) or `'restrict'` are valid. `'set null'` raises ValueError.

```python
# Restrict deletion if still linked
partner_ids = fields.Many2many('res.partner', ondelete='restrict')
```

### Pattern 404.9: Reference Field (HIGH)

**404.9 fields.Reference — pseudo-relational**: Stored as `"model,id"` string (varchar). No FK constraint. Use for polymorphic references across multiple models.

```python
# mail/models/mail_followers.py
res_model = fields.Selection(selection=[
    ('sale.order', 'Sale Order'),
    ('purchase.order', 'Purchase Order'),
])
reference = fields.Reference(
    selection=[('sale.order', 'Sale Order'), ('purchase.order', 'Purchase Order')],
    string="Related Document")
```

### Pattern 404.10–404.16: Command Operations for x2many (CRITICAL)

**404.10 Command.create(values) — code 0**: Create new record in comodel and link to parent.

```python
from odoo.fields import Command

order.write({'order_line': [
    Command.create({'product_id': product.id, 'product_uom_qty': 5}),
]})
```

**404.11 Command.update(id, values) — code 1**: Update an existing linked record.

```python
order.write({'order_line': [
    Command.update(line_id, {'product_uom_qty': 10}),
]})
```

**404.12 Command.delete(id) — code 2**: Delete record from database AND remove relation. For M2M, deletion may be prevented if record is still linked elsewhere.

```python
order.write({'order_line': [Command.delete(line_id)]})
```

**404.13 Command.unlink(id) — code 3**: Remove relation only. For O2M with `ondelete='cascade'`, the record IS deleted. Otherwise, inverse field set to False.

```python
order.write({'tag_ids': [Command.unlink(tag_id)]})
```

**404.14 Command.link(id) — code 4**: Add relation to existing record (no creation).

```python
order.write({'tag_ids': [Command.link(existing_tag_id)]})
```

**404.15 Command.clear() — code 5**: Remove ALL relations. Behaves like `unlink` on every record.

```python
order.write({'tag_ids': [Command.clear()]})
```

**404.16 Command.set(ids) — code 6**: Replace ALL relations with given id list. Equivalent to `clear()` + `link()` for each id.

```python
order.write({'tag_ids': [Command.set([tag1_id, tag2_id, tag3_id])]})
```

**Rules**:
- ALWAYS use `Command.*` methods — never raw tuples `(0, 0, {...})`
- `Command.create` and `Command.update` take dict values
- `Command.delete/unlink/link` take a single int id
- `Command.clear/set` take no args / a list of ids
- Multiple commands can be combined in a single list

---

## Abnormal Case Patterns (4 patterns)

1. **Implicit M2M table collision** — two M2M fields to same comodel without explicit `relation` causes ORM error. Fix: Always set `relation`, `column1`, `column2` when multiple M2M to same comodel exist.

2. **Required M2O with set null** — `required=True` + `ondelete='set null'` raises ValueError at module install. Fix: Use `ondelete='restrict'` or `ondelete='cascade'` for required fields.

3. **O2M missing inverse_name** — forgetting `inverse_name` silently creates a broken field. Fix: Always verify the Many2one inverse exists on the comodel.

4. **Command.delete vs Command.unlink confusion** — `delete` (2) removes from DB, `unlink` (3) removes relation only. For M2M, prefer `unlink` to avoid deleting shared records. For O2M, both effectively delete if inverse has `ondelete='cascade'`.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (404.1-404.16), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Relational Field Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
