# Odoo API Decorators Specialist — Enterprise
# Odoo API Decorators Chuyen Gia — Enterprise
# Odoo APIデコレータ スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: API Decorators
**Category**: core
**Purpose**: Apply correct Odoo API decorators for compute dependencies, constraints, onchange, and method types

---

## Metadata

```json
{
  "id": "odoo-api-decorators-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "API Decorators",
  "category": "core",
  "subcategory": "odoo",
  "lines": 260,
  "token_cost": 3100,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#method-decorators)",
    "E2: /opt/workspace/odoo-18/odoo/api.py (source analysis, full file)",
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
| **Pattern Numbers** | 406.1–406.11 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | 5–50 model files per module |
| **Naming Convention** | `_compute_{name}`, `_check_{name}`, `_onchange_{name}`, `_unlink_if_{condition}` |
| **Imports From** | `odoo.api`, `odoo.exceptions.ValidationError`, `odoo.exceptions.UserError` |
| **Imported By** | ORM engine (triggers based on field changes) |
| **Cannot Import** | N/A (decorators are foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Declaring field dependencies, validation constraints, onchange handlers, delete guards, and method type annotations |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Apply correct Odoo API decorators for compute dependencies, constraints, onchange, and method types |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: @api.depends, @api.constrains, @api.onchange, @api.model, @api.ondelete |

---

## Role

You are an **Odoo API Decorators Specialist** for Odoo 18 Enterprise. Your responsibility is to apply the correct decorator for each use case — `@api.depends` for compute triggers, `@api.constrains` for validation, `@api.onchange` for UI reactivity, `@api.ondelete` for delete guards, and `@api.model`/`@api.model_create_multi` for class-level methods.

**Used by**: Code agents writing compute, validation, and business logic methods
**Not used by**: Field declarations (see odoo-field-basic/relational/computed)

---

## Patterns

### Pattern 406.1–406.2: Dependency Decorators (CRITICAL)

**406.1 @api.depends('field1', 'field2')**: Declares field dependencies for compute methods. Supports dot-notation for relational paths. Triggers recomputation when ANY listed field changes.

```python
# sale/models/sale_order.py — depends on relational sub-field
@api.depends('order_line.price_subtotal', 'order_line.price_tax', 'order_line.price_total')
def _compute_amounts(self):
    for order in self:
        order_lines = order.order_line.filtered(lambda x: not x.display_type)
        order.amount_untaxed = sum(order_lines.mapped('price_subtotal'))
        order.amount_tax = sum(order_lines.mapped('price_tax'))
        order.amount_total = order.amount_untaxed + order.amount_tax
```

**Rules**:
- CANNOT depend on `'id'` — raises NotImplementedError
- Dot-notation traverses relations: `'partner_id.name'` means "when partner's name changes"
- Dynamic dependency: pass a callable `@api.depends(lambda self: ['field'])` — rarely needed

**406.2 @api.depends_context('key')**: Declares context key dependencies. Field is recomputed when context value changes. Used with `compute_sudo` or context-dependent logic.

```python
# sale/models/sale_order.py
@api.depends('partner_id')
@api.depends_context('sale_show_partner_name')
def _compute_display_name(self):
    for order in self:
        name = order.name
        if self.env.context.get('sale_show_partner_name') and order.partner_id:
            name = f'{name} - {order.partner_id.name}'
        order.display_name = name
```

### Pattern 406.3: @api.constrains (CRITICAL)

**406.3 @api.constrains('field1', 'field2')**: Validates records when listed fields are modified in `create()` or `write()`. Raise `ValidationError` on failure.

```python
from odoo.exceptions import ValidationError

@api.constrains('date_start', 'date_end')
def _check_dates(self):
    for record in self:
        if record.date_end and record.date_start > record.date_end:
            raise ValidationError("End date must be after start date.")
```

**Rules**:
- Only supports simple field names — dotted names (`partner_id.name`) are IGNORED silently
- Only triggered when declared fields are in the `create()`/`write()` values dict
- Fields not in the view form are NOT validated on record creation — override `create()` if needed

### Pattern 406.4: @api.onchange (HIGH)

**406.4 @api.onchange('field')**: UI-only decorator. Called on pseudo-records in form views when field changes. Assign values directly or return warnings.

```python
@api.onchange('partner_id')
def _onchange_partner(self):
    self.message = "Dear %s" % (self.partner_id.name or "")
    # Optional warning
    return {
        'warning': {
            'title': "Warning",
            'message': "Customer has overdue invoices",
            'type': 'notification'  # or omit for dialog
        }
    }
```

**Rules**:
- Only simple field names — dotted names are ignored
- NEVER call CRUD methods (`create`, `write`, `unlink`) on onchange pseudo-records
- Cannot modify `one2many` or `many2many` of itself (webclient limitation)
- Prefer computed fields over onchange where possible (onchange is legacy pattern)

### Pattern 406.5: @api.ondelete (HIGH)

**406.5 @api.ondelete(at_uninstall=False)**: Guards against record deletion. Called during `unlink()`. Raise `UserError` to prevent deletion.

```python
# sale/models/sale_order.py
@api.ondelete(at_uninstall=False)
def _unlink_except_confirmed(self):
    for order in self:
        if order.state not in ('draft', 'cancel'):
            raise UserError("Cannot delete a confirmed sales order.")
```

**Rules**:
- `at_uninstall=False` (default) — NOT called during module uninstall (safe cleanup)
- `at_uninstall=True` — called even during uninstall (use sparingly, e.g., default language)
- Convention: name methods `_unlink_if_<condition>` or `_unlink_except_<not_condition>`

### Pattern 406.6–406.8: Method Type Decorators (CRITICAL)

**406.6 @api.model**: Class-level method. `self` is an empty recordset (model reference only). Use for methods that don't operate on specific records.

```python
@api.model
def _get_default_team_id(self, user_id=None, domain=None):
    # self is empty recordset, used as model reference
    return self.env['crm.team'].search([...], limit=1)
```

**406.7 @api.model_create_multi**: Batch create override. Method receives `list[dict]` and returns recordset. The decorator auto-wraps single dict calls.

```python
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        if 'name' not in vals or vals['name'] == '/':
            vals['name'] = self.env['ir.sequence'].next_by_code('sale.order')
    return super().create(vals_list)
```

**Rules**:
- `@api.model` on `create()` auto-converts to deprecated `model_create_single` — always use `@api.model_create_multi` explicitly
- `vals_list` is ALWAYS a list of dicts, even if called with single dict

**406.8 @api.returns('self') / @api.returns('model_name')**: Declares return type. Used for methods returning recordsets to ensure correct type coercion.

```python
@api.returns('self')
def filtered(self, func):
    return self.browse([rec.id for rec in self if func(rec)])
```

### Pattern 406.9–406.11: Specialized Decorators (MEDIUM)

**406.9 @api.readonly**: Marks method as safe for read-only database cursor. Used for RPC methods that only read data.

```python
@api.readonly
def get_statistics(self):
    return self.env['sale.report'].read_group([...], [...], [...])
```

**406.10 @api.autovacuum**: Registers method with daily vacuum cron job (`ir.autovacuum`). Method name MUST start with `_`.

```python
@api.autovacuum
def _gc_old_draft_orders(self):
    limit_date = fields.Datetime.subtract(fields.Datetime.now(), days=90)
    self.search([('state', '=', 'draft'), ('create_date', '<', limit_date)]).unlink()
```

**406.11 @api.depends with lambda — dynamic dependency**: Pass a callable that returns field names. Called with model instance. For rare cases where dependencies are dynamic.

```python
@api.depends(lambda self: [
    f'{line_field}.price_unit'
    for line_field in self._get_line_fields()
])
def _compute_total(self):
    ...
```

---

## Abnormal Case Patterns (4 patterns)

1. **@api.constrains with dotted name** — `@api.constrains('partner_id.name')` is silently ignored. Fix: Only use simple field names. For relational validation, override `write()` or use SQL constraints.

2. **@api.onchange calling CRUD** — calling `create()`, `write()`, or `unlink()` on onchange pseudo-records causes undefined behavior. Fix: Only assign field values directly or use `update()`.

3. **@api.model on create()** — using `@api.model` (not `@api.model_create_multi`) on `create()` triggers deprecation warning and creates records one-by-one instead of batch. Fix: Always use `@api.model_create_multi`.

4. **@api.depends on 'id'** — raises `NotImplementedError`. Fix: Use `@api.depends()` with no args and handle the new-record case explicitly, or use `@api.depends_context('force_recompute')`.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (406.1-406.11), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo API Decorators Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
