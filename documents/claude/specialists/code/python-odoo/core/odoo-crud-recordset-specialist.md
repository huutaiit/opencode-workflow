# Odoo CRUD & Recordset Specialist — Enterprise
# Odoo CRUD & Recordset Chuyen Gia — Enterprise
# Odoo CRUD＆レコードセット スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: CRUD & Recordset Operations
**Category**: core
**Purpose**: Override CRUD methods correctly and use recordset operations efficiently

---

## Metadata

```json
{
  "id": "odoo-crud-recordset-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "CRUD & Recordset Operations",
  "category": "core",
  "subcategory": "odoo",
  "lines": 350,
  "token_cost": 4500,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#crud-methods)",
    "E2: /opt/workspace/odoo-18/odoo/models.py (source analysis)",
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
| **Pattern Numbers** | 407.1–407.25 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | 5–50 model files per module |
| **Naming Convention** | `create()`, `write()`, `copy_data()`, `default_get()`, `_prepare_{name}()` |
| **Imports From** | `odoo.models`, `odoo.api`, `odoo.fields.Command`, `odoo.exceptions`, `odoo.tools.SQL` |
| **Imported By** | controllers, wizards, automated actions, tests |
| **Cannot Import** | N/A (CRUD is foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Overriding create/write/unlink, recordset filtering/mapping, search/group operations, environment switching |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Override CRUD methods correctly and use recordset operations efficiently |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: def create, def write, .filtered, .mapped, .sudo(), .search, .ensure_one |

---

## Role

You are an **Odoo CRUD & Recordset Specialist** for Odoo 18 Enterprise. Your responsibility is to generate correct CRUD method overrides (create, write, unlink, copy_data, default_get) and efficient recordset operations (filtered, mapped, sorted, search, read_group). You ensure proper use of super() calls, environment switches (sudo, with_company, with_context), and cache management.

**Used by**: Code agents implementing business logic that modifies records
**Not used by**: Field declarations (see odoo-field-*), view definitions (see odoo-views-xml)

---

## Patterns

### Pattern 407.1–407.5: CRUD Override (CRITICAL)

**407.1 Override create() with @api.model_create_multi**: Always use batch create. Process `vals_list` before calling `super()`.

```python
# sale/models/sale_order.py
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        if vals.get('name', _("New")) == _("New"):
            seq_date = fields.Datetime.context_timestamp(
                self, fields.Datetime.to_datetime(vals['date_order'])
            ) if 'date_order' in vals else None
            vals['name'] = self.env['ir.sequence'].with_company(
                vals.get('company_id')
            ).next_by_code('sale.order', sequence_date=seq_date) or _("New")
    return super().create(vals_list)
```

**407.2 Override write() with validation/side-effects**: Validate before `super()`, trigger side-effects after.

```python
# sale/models/sale_order.py
def write(self, vals):
    # Pre-validation
    if 'pricelist_id' in vals and any(so.state == 'sale' for so in self):
        raise UserError(_("You cannot change the pricelist of a confirmed order!"))
    # Call super
    res = super().write(vals)
    # Post side-effects
    if vals.get('partner_id'):
        self.filtered(lambda so: so.state in ('sent', 'sale')).message_subscribe(
            partner_ids=[vals['partner_id']])
    return res
```

**407.3 @api.ondelete guard**: Prefer over overriding `unlink()`. Module-uninstall safe.

```python
# sale/models/sale_order.py
@api.ondelete(at_uninstall=False)
def _unlink_except_draft_or_cancel(self):
    for order in self:
        if order.state not in ('draft', 'cancel'):
            raise UserError(_("You can not delete a sent quotation or a confirmed sales order."))
```

**407.4 Override copy_data() for custom duplication**: Control which data is copied. Returns `list[dict]`.

```python
# sale/models/sale_order.py
def copy_data(self, default=None):
    default = dict(default or {})
    default_has_no_order_line = 'order_line' not in default
    default.setdefault('order_line', [])
    vals_list = super().copy_data(default=default)
    if default_has_no_order_line:
        for order, vals in zip(self, vals_list):
            vals['order_line'] = [
                Command.create(line_vals)
                for line_vals in order._get_copiable_order_lines().copy_data()
            ]
    return vals_list
```

**407.5 Override default_get() for dynamic defaults**: Compute default values based on context or other records.

```python
@api.model
def default_get(self, fields_list):
    defaults = super().default_get(fields_list)
    if 'partner_id' in fields_list and self.env.context.get('default_partner_id'):
        defaults['partner_id'] = self.env.context['default_partner_id']
    return defaults
```

### Pattern 407.6–407.8: Search & Name Overrides (HIGH)

**407.6 Override _search() for custom filtering**: Add domain restrictions transparently.

```python
def _search(self, domain, offset=0, limit=None, order=None):
    # Add company restriction
    domain = expression.AND([domain, [('company_id', 'in', self.env.companies.ids)]])
    return super()._search(domain, offset=offset, limit=limit, order=order)
```

**407.7 Override _compute_display_name()**: Customize how records appear in Many2one dropdowns and breadcrumbs.

```python
@api.depends('partner_id')
@api.depends_context('sale_show_partner_name')
def _compute_display_name(self):
    for order in self:
        name = order.name
        if self.env.context.get('sale_show_partner_name') and order.partner_id:
            name = f'{name} - {order.partner_id.name}'
        order.display_name = name
```

**407.8 _prepare_* data preparation methods**: Convention for building dicts before create/write. Keeps create() clean.

```python
def _prepare_invoice_values(self):
    self.ensure_one()
    return {
        'partner_id': self.partner_invoice_id.id,
        'currency_id': self.currency_id.id,
        'invoice_line_ids': [(0, 0, line._prepare_invoice_line()) for line in self.order_line],
    }
```

### Pattern 407.9–407.10: Batch Operations (HIGH)

**407.9 Batch create — list of dicts**: Create multiple records in one call for performance.

```python
vals_list = [{'name': f'Order {i}', 'partner_id': partner.id} for i in range(10)]
orders = self.env['sale.order'].create(vals_list)
```

**407.10 _name_search override**: Customize search-as-you-type in Many2one fields.

```python
@api.model
def _name_search(self, name='', domain=None, operator='ilike', limit=100, order=None):
    domain = domain or []
    if name and operator in ('=', 'ilike', '=ilike', 'like', '=like'):
        domain = expression.OR([
            [('name', operator, name)],
            [('client_order_ref', operator, name)],
            domain,
        ])
    return self._search(domain, limit=limit, order=order)
```

### Pattern 407.11–407.17: Recordset Operations (CRITICAL)

**407.11 self.ensure_one()**: Assert recordset has exactly one record. Raises ValueError otherwise.

```python
def action_open_discount_wizard(self):
    self.ensure_one()
    return {'type': 'ir.actions.act_window', 'res_model': 'sale.order.discount', ...}
```

**407.12 self.filtered(lambda/str)**: Filter records by callable or field name (truthy check).

```python
# Lambda filter
confirmed_orders = self.filtered(lambda so: so.state == 'sale')
# String shortcut (truthy check on field value)
active_orders = self.filtered('active')
```

**407.13 self.filtered_domain(domain)**: Filter using Odoo domain syntax. More efficient than lambda for complex conditions.

```python
invoiceable_lines = order.order_line.filtered_domain([
    ('qty_to_invoice', '!=', 0),
    ('display_type', '=', False)])
```

**407.14 self.mapped('field') / self.mapped('rel.field')**: Extract values from recordset. Returns list for non-relational, recordset for relational. Triggers batch prefetch.

```python
# Non-relational → list
amounts = self.mapped('amount_total')  # [100.0, 200.0, ...]
# Relational → recordset
partners = self.mapped('partner_id')  # res.partner(1, 2, 3)
# Dotted path
partner_names = self.mapped('partner_id.name')  # ['Alice', 'Bob']
# Lambda
dates = order.order_line.mapped(lambda line: line._expected_date())
```

**407.15 self.sorted(key=...)**: Sort recordset. Returns new recordset.

```python
# Sort by field
orders = self.sorted(key=lambda o: o.date_order, reverse=True)
# Sort by field name (string shortcut)
lines = order.order_line.sorted('sequence')
```

**407.16 self.exists()**: Filter to only records that exist in database.

```python
# After potential deletion
remaining = records.exists()
```

**407.17 self.browse(ids)**: Create recordset from IDs without database read.

```python
order = self.env['sale.order'].browse(order_id)
orders = self.env['sale.order'].browse([1, 2, 3])
```

### Pattern 407.18–407.21: Environment Switching (CRITICAL)

**407.18 self.sudo()**: Switch to superuser, bypassing access rights. Use sparingly.

```python
# Read credit limit bypassing access rights
partner = order.sudo().partner_id
config = self.env['ir.config_parameter'].sudo().get_param('sale.default_template')
```

**407.19 self.with_company(company)**: Switch active company. Affects company-dependent fields and security rules.

```python
order = order.with_company(order.company_id)
sequence = self.env['ir.sequence'].with_company(company_id).next_by_code('sale.order')
```

**407.20 self.with_context(**kwargs)**: Add/override context values.

```python
order = order.with_context(lang=order.partner_id.lang)
partner = order.partner_id.with_context(show_address=True)
```

**407.21 self.with_user(user_id)**: Execute as specific user.

```python
order_as_salesperson = order.with_user(order.user_id)
```

### Pattern 407.22–407.25: Search & Low-level (HIGH)

**407.22 self.search(domain, offset, limit, order)**: Search with domain, pagination, and ordering.

```python
orders = self.env['sale.order'].search([
    ('state', '=', 'sale'),
    ('date_order', '>=', start_date)
], limit=100, order='date_order desc')
```

**407.23 self._read_group(domain, groupby, aggregates)**: Grouped aggregation. Returns list of tuples.

```python
# Get invoice status counts per order
for order, invoice_status in self.env['sale.order.line']._read_group(
    domain=[('order_id', 'in', self.ids)],
    groupby=['order_id'],
    aggregates=['invoice_status:array_agg'],
):
    ...
```

**407.24 flush_model + invalidate_recordset**: Force write pending changes to DB and clear cache.

```python
# Ensure all pending writes are flushed before raw SQL
self.env['sale.order'].flush_model(['state', 'amount_total'])
self.invalidate_recordset(['amount_total'])
```

**407.25 Raw SQL with SQL()**: For complex queries not expressible with ORM. Use `SQL()` for safe parameterization.

```python
from odoo.tools import SQL

self.env.execute_query(SQL(
    "SELECT id, amount_total FROM sale_order WHERE state = %s AND company_id = %s",
    'sale', self.env.company.id
))
```

---

## Abnormal Case Patterns (5 patterns)

1. **Missing super() in create/write** — skipping `super()` breaks ORM field computation, tracking, and constraints. Fix: ALWAYS call `super()` unless you are completely replacing the method (extremely rare).

2. **Modifying vals dict after super().create()** — changes to `vals_list` after `super()` have no effect. Fix: Modify `vals_list` BEFORE `super().create()`.

3. **sudo() leaking** — `sudo()` carries through the entire chain. `record.sudo().partner_id` returns partner with sudo. Fix: Use `record.sudo().partner_id.sudo(False)` or extract IDs early.

4. **flush_model missing before raw SQL** — ORM caches writes; raw SQL reads stale data. Fix: Always call `flush_model(fnames)` before `execute_query()`.

5. **filtered() on empty recordset** — returns empty recordset (no error), but forgetting to handle empty case causes issues. Fix: Check `if not records:` before operations that require records.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (407.1-407.25), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo CRUD & Recordset Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
