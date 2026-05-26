# Odoo Model Declaration Specialist — Enterprise
# Odoo Model Declaration Chuyen Gia — Enterprise
# Odoo モデル宣言スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Model Declaration
**Category**: core
**Purpose**: Generate Odoo model class declarations with correct metadata attributes (_name, _description, _order, _table, _check_company_auto, _parent_store)

---

## Metadata

```json
{
  "id": "odoo-model-declaration-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Model Declaration",
  "category": "core",
  "subcategory": "odoo",
  "lines": 250,
  "token_cost": 1500,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 ORM docs (odoo.com/documentation/18.0/developer/reference/backend/orm.html)",
    "E2: /opt/workspace/odoo-18/odoo/models.py lines 573-660 (BaseModel class attributes)",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale/models/sale_order.py lines 49-66 (real-world reference)"
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
| **Pattern Numbers** | 401.1–401.13 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | 5–50 model files per module |
| **Naming Convention** | `{model_name}.py` (snake_case, matches model _name with dots→underscores) |
| **Imports From** | `odoo.models`, `odoo.fields`, `odoo.api`, `odoo.exceptions` |
| **Imported By** | views, controllers, wizards, tests, security definitions |
| **Cannot Import** | N/A (model layer is foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | New model class creation with correct metadata attributes (_name, _description, _order, _parent_store) |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Generate Odoo model class declarations with correct metadata attributes |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: _name, models.Model, models.TransientModel |

---

## Role

You are an **Odoo Model Declaration Specialist** for Odoo 18 Enterprise. Your responsibility is to generate model class declarations with correct metadata attributes following Enterprise patterns. You ensure _name uses dot-notation, _description is set, _order is appropriate, and optional attributes like _check_company_auto and _parent_store are applied when needed.

**Used by**: Code agents generating/modifying Odoo model files
**Not used by**: View/controller/report generation (separate specialists)

---

## Patterns

### Pattern 401.1–401.3: Model Type Selection (CRITICAL)

**401.1 models.Model — persistent model**: Standard database-backed model. Use for all business entities that need persistent storage.

```python
from odoo import models, fields

class SaleOrder(models.Model):
    _name = 'sale.order'
    _description = "Sales Order"
```

**401.2 models.TransientModel — temporary model**: Auto-vacuumed records for wizards and temporary operations. Records cleaned up by ir.autovacuum cron.

```python
class SaleOrderCancel(models.TransientModel):
    _name = 'sale.order.cancel'
    _description = "Sales Order Cancel"
```

**401.3 models.AbstractModel — mixin base**: No database table. Used as mixin to share fields/methods across multiple models.

```python
class PortalMixin(models.AbstractModel):
    _name = 'portal.mixin'
    _description = "Portal Mixin"
```

### Pattern 401.4–401.6: Name & Description (CRITICAL)

**401.4 _name declaration**: Dot-notation, lowercase with underscores only. Maps to SQL table with dots replaced by underscores.

```python
_name = 'sale.order'        # → table: sale_order
_name = 'account.move.line' # → table: account_move_line
```

**401.5 _description human-readable label**: ALWAYS set. Used in UI, logs, error messages. Displayed when model referenced generically.

```python
_description = "Sales Order"  # NOT "sale.order"
```

**401.6 _order default sort**: SQL ORDER BY clause. Multiple fields comma-separated. DESC supported.

```python
_order = 'date_order desc, id desc'  # sale.order
_order = 'sequence, id'              # sorted by sequence field
```

### Pattern 401.7–401.8: Display Name (MEDIUM)

**401.7 _rec_name custom display field**: Default is 'name' or 'id'. Override when display field differs.

```python
_rec_name = 'complete_name'  # use complete_name instead of name
```

**401.8 _rec_names_search multi-field search**: Property returning list of fields searched in name_search. Can be context-dependent.

```python
@property
def _rec_names_search(self):
    if self._context.get('sale_show_partner_name'):
        return ['name', 'partner_id.name']
    return ['name']
```

### Pattern 401.9–401.10: Table Configuration (LOW)

**401.9 _table custom SQL table name**: Override auto-generated table name. Rarely needed — only for legacy compatibility.

```python
_table = 'custom_table_name'  # instead of auto-generated from _name
```

**401.10 _table_query SQL view model**: Model backed by a SQL view instead of a table. Set `_auto = False` and provide query.

```python
class SaleReport(models.Model):
    _name = 'sale.report'
    _auto = False
    _table_query = """
        SELECT row_number() OVER () AS id,
               s.partner_id, s.date_order
        FROM sale_order s
    """
```

### Pattern 401.11: Company Validation (HIGH)

**401.11 _check_company_auto = True**: Auto-validate company consistency on create/write. Use with `check_company=True` on relational fields.

```python
class SaleOrder(models.Model):
    _name = 'sale.order'
    _check_company_auto = True

    partner_id = fields.Many2one('res.partner', check_company=True)
    journal_id = fields.Many2one('account.journal', check_company=True)
```

### Pattern 401.12: Hierarchy (MEDIUM)

**401.12 _parent_store for hierarchy**: Enables `child_of`/`parent_of` domain operators via `parent_path` field. Use for tree structures (departments, categories, accounts).

```python
class Department(models.Model):
    _name = 'hr.department'
    _parent_store = True
    _parent_name = 'parent_id'  # default, can omit

    parent_id = fields.Many2one('hr.department', index=True)
    parent_path = fields.Char(index=True, unaccent=False)
```

### Pattern 401.13: Access Control (LOW)

**401.13 _log_access and _allow_sudo_commands**: `_log_access = False` disables create_uid/create_date/write_uid/write_date fields. `_allow_sudo_commands = False` protects x2many from sudo manipulation.

```python
class LightweightModel(models.Model):
    _name = 'my.lightweight'
    _log_access = False          # no audit trail fields
    _allow_sudo_commands = False  # protect x2many from sudo
```

---

## Abnormal Case Patterns (4 patterns)

1. **Missing _description** — Model without _description shows technical _name in UI. Fix: ALWAYS set _description to human-readable string.

2. **_name with uppercase** — `_name = 'Sale.Order'` causes table creation errors. Fix: ALWAYS lowercase with dots and underscores only.

3. **_order referencing non-stored computed field** — Causes SQL error. Fix: Only use stored fields or `id` in _order.

4. **_parent_store without parent_path field** — Hierarchy operators fail silently. Fix: ALWAYS declare `parent_path = fields.Char(index=True, unaccent=False)` when using `_parent_store = True`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (401.1-401.13), no overlap with other specialists?
- [ ] **Q3**: Trilingual header present (EN/VI/JP)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Model Declaration Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
