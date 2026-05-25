# Odoo Computed Field Specialist — Enterprise
# Odoo Computed Field Chuyen Gia — Enterprise
# Odoo 計算フィールド スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Computed Fields
**Category**: core
**Purpose**: Generate correct computed, related, and inverse field patterns with proper dependency chains

---

## Metadata

```json
{
  "id": "odoo-field-computed-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Computed Fields",
  "category": "core",
  "subcategory": "odoo",
  "lines": 340,
  "token_cost": 4200,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#computed-fields)",
    "E2: /opt/workspace/odoo-18/odoo/fields.py (source analysis, lines 224-474)",
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
| **Pattern Numbers** | 405.1–405.23 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | 5–50 model files per module |
| **Naming Convention** | Method: `_compute_{field_name}`, `_inverse_{field_name}`, `_search_{field_name}` |
| **Imports From** | `odoo.fields`, `odoo.api`, `odoo.models` |
| **Imported By** | views (for display), reports, controllers |
| **Cannot Import** | N/A (computed fields are foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Fields derived from other fields — stored/non-stored compute, related fields, inverse methods, precompute |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Generate correct computed, related, and inverse field patterns with proper dependency chains |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: compute=, @api.depends, related=, inverse=, precompute |

---

## Role

You are an **Odoo Computed Field Specialist** for Odoo 18 Enterprise. Your responsibility is to generate correct computed field declarations with proper @api.depends chains, store/precompute decisions, related fields, inverse methods, and search methods. You ensure compute methods follow the loop-assign pattern and handle empty recordsets correctly.

**Used by**: Code agents generating computed business logic in Odoo models
**Not used by**: Static field declarations (see odoo-field-basic), CRUD override logic (see odoo-crud-recordset)

---

## Patterns

### Pattern 405.1–405.4: Core Compute Patterns (CRITICAL)

**405.1 Non-stored computed field**: Calculated on-the-fly, not in database. Default for `compute=`. Use for display-only values that depend on volatile data.

```python
# sale/models/sale_order.py — not stored, depends on today()
expected_date = fields.Datetime(
    string="Expected Date",
    compute='_compute_expected_date', store=False)

amount_to_invoice = fields.Monetary(string="Un-invoiced Balance", compute='_compute_amount_to_invoice')
```

**405.2 Stored computed field**: Persisted in database with `store=True`. Recomputed when dependencies change. Use when field is searched/sorted/aggregated.

```python
# sale/models/sale_order.py — stored for search + reporting
amount_untaxed = fields.Monetary(string="Untaxed Amount", store=True, compute='_compute_amounts', tracking=5)
amount_tax = fields.Monetary(string="Taxes", store=True, compute='_compute_amounts')
amount_total = fields.Monetary(string="Total", store=True, compute='_compute_amounts', tracking=4)
```

**405.3 Editable stored computed**: `store=True, readonly=False` — computed value serves as default, user can override. Recomputes only when dependencies change AND field was not manually edited.

```python
# sale/models/sale_order.py — user can override computed partner
partner_invoice_id = fields.Many2one(
    comodel_name='res.partner',
    compute='_compute_partner_invoice_id',
    store=True, readonly=False, required=True, precompute=True,
    check_company=True)
```

**405.4 Precomputed field**: `precompute=True` — computed BEFORE record insertion (in `create()`). Avoids post-create recomputation. Best for O2M lines created in batch.

```python
# sale/models/sale_order.py — precompute for O2M efficiency
validity_date = fields.Date(
    compute='_compute_validity_date', store=True, readonly=False, copy=False, precompute=True)

currency_id = fields.Many2one(
    'res.currency', compute='_compute_currency_id', store=True, precompute=True)
```

**Rules**:
- `precompute` only fires when NO explicit value and NO default is provided to `create()`
- Don't precompute fields based on `search()` or `read_group()` — those are expensive at create time
- Precompute is ideal for O2M lines (created in batch by ORM)

### Pattern 405.5–405.7: Compute Options (HIGH)

**405.5 compute_sudo**: `compute_sudo=True` — recompute as superuser, bypassing access rights. Default: `True` for stored, `False` for non-stored.

```python
# Field that reads across company boundaries
total_all_companies = fields.Float(compute='_compute_total', compute_sudo=True, store=True)
```

**405.6 inverse method**: Makes computed field writable. Called when user sets the value.

```python
duration = fields.Float(compute='_compute_duration', inverse='_inverse_duration')

def _inverse_duration(self):
    for record in self:
        record.date_end = record.date_start + timedelta(hours=record.duration)
```

**405.7 search method**: Makes non-stored computed field searchable. Returns a domain.

```python
invoice_ids = fields.Many2many('account.move', compute='_get_invoiced', search='_search_invoice_ids')

def _search_invoice_ids(self, operator, value):
    # Must return a domain on the current model
    return [('order_line.invoice_lines.move_id', operator, value)]
```

### Pattern 405.8–405.11: Related Fields (HIGH)

**405.8 related — delegated access**: Shortcut to access field through a relation chain. Non-stored by default. Automatically sets `@api.depends` on the relation path.

```python
# sale/models/sale_order.py — access company's country code through relation
country_code = fields.Char(related='company_id.account_fiscal_country_id.code', string="Country code")
company_price_include = fields.Selection(related='company_id.account_price_include')
```

**405.9 related + store=True — materialized related**: Stored copy. Recomputed when source changes. Use when the related value is frequently searched/sorted.

```python
partner_name = fields.Char(related='partner_id.name', store=True, index='trigram')
```

**405.10 related + explicit depends**: Override auto-derived dependency. Rarely needed.

```python
# When auto-dependency detection fails (dynamic path)
team_name = fields.Char(related='team_id.name', depends=['team_id', 'team_id.name'])
```

**405.11 recursive=True — self-referential**: MUST be set when field depends on itself through a parent chain. Guarantees correct recomputation order.

```python
parent_path = fields.Char(index=True, unaccent=False)
child_count = fields.Integer(compute='_compute_child_count', recursive=True)

@api.depends('child_ids.child_count')
def _compute_child_count(self):
    for record in self:
        record.child_count = len(record.child_ids) + sum(record.child_ids.mapped('child_count'))
```

### Pattern 405.12–405.13: Special Field Modes (HIGH)

**405.12 company_dependent — per-company value**: Stored as jsonb `{company_id: value}`. Each company sees its own value. Replaces deprecated `ir.property`.

```python
# Product price per company
standard_price = fields.Float(company_dependent=True, string="Cost")
```

**405.13 default — static or callable**: Static value or lambda. Lambda receives `self` (empty recordset).

```python
# Static default
state = fields.Selection([...], default='draft')
# Lambda default (dynamic)
company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
date_order = fields.Datetime(default=fields.Datetime.now)
```

### Pattern 405.14–405.18: Compute Method Patterns (CRITICAL)

**405.14 Loop-assign pattern**: Standard compute iteration. MUST assign to every record in `self`.

```python
@api.depends('company_id')
def _compute_require_signature(self):
    for order in self:
        order.require_signature = order.company_id.portal_confirmation_sign
```

**405.15 Batch-assign pattern**: Single value for all records. Use when compute doesn't depend on record-specific data.

```python
def _compute_journal_id(self):
    self.journal_id = False
```

**405.16 Compute with caching dict**: Prefetch data once, iterate with cached values. For performance-critical computes.

```python
@api.depends('partner_id', 'user_id')
def _compute_team_id(self):
    cached_teams = {}
    for order in self:
        key = (order.user_id.id, order.company_id.id)
        if key not in cached_teams:
            cached_teams[key] = self.env['crm.team'].with_context(
                default_team_id=order.partner_id.team_id.id
            )._get_default_team_id(user_id=order.user_id.id, domain=None)
        order.team_id = cached_teams[key]
```

**405.17 Multi-field compute**: Single method sets multiple fields. All fields MUST list the same `compute=` method.

```python
amount_untaxed = fields.Monetary(compute='_compute_amounts', store=True)
amount_tax = fields.Monetary(compute='_compute_amounts', store=True)
amount_total = fields.Monetary(compute='_compute_amounts', store=True)

@api.depends('order_line.price_subtotal', 'order_line.price_tax', 'order_line.price_total')
def _compute_amounts(self):
    for order in self:
        order_lines = order.order_line.filtered(lambda x: not x.display_type)
        order.amount_untaxed = sum(order_lines.mapped('price_subtotal'))
        order.amount_tax = sum(order_lines.mapped('price_tax'))
        order.amount_total = order.amount_untaxed + order.amount_tax
```

**405.18 Compute with mapped() prefetch**: Use `mapped()` to trigger batch prefetch before iterating.

```python
@api.depends('order_line.product_id')
def _compute_has_archived_products(self):
    for order in self:
        order.has_archived_products = any(
            not product.active for product in order.order_line.product_id
        )
```

### Pattern 405.19–405.21: UI & Display Fields (MEDIUM)

**405.19 UX boolean fields**: `store=False` computed booleans for UI state (show/hide buttons, warnings).

```python
# sale/models/sale_order.py — show update pricelist button
show_update_pricelist = fields.Boolean(
    string="Has Pricelist Changed", store=False,
    compute='_compute_show_update_pricelist')
```

**405.20 exportable=False**: Hide field from data export. Use for serialized/binary computed data.

```python
tax_totals = fields.Binary(compute='_compute_tax_totals', exportable=False)
```

**405.21 prefetch=False**: Exclude from batch prefetching. Use for expensive computes on large recordsets.

```python
heavy_report = fields.Binary(compute='_compute_report', prefetch=False)
```

### Pattern 405.22–405.23: Group Expand (MEDIUM)

**405.22 group_expand=True on Selection**: In Kanban/pivot, show all selection values even if no records have that value.

```python
state = fields.Selection([
    ('draft', 'Draft'), ('confirmed', 'Confirmed'), ('done', 'Done')
], group_expand=True)
```

**405.23 group_expand callable on Many2one**: Custom function to expand group values in Kanban views.

```python
stage_id = fields.Many2one('project.task.type', group_expand='_read_group_stage_ids')

@api.model
def _read_group_stage_ids(self, stages, domain):
    return stages.search([], order=stages._order)
```

---

## Abnormal Case Patterns (5 patterns)

1. **Missing @api.depends** — stored computed field without depends never recomputes after creation. Fix: Always declare `@api.depends('field1', 'field2')` listing all trigger fields.

2. **Incomplete assignment in loop** — skipping records in compute loop leaves stale cache values. Fix: ALWAYS assign to every record: use `else` branch or assign False/default.

3. **Precompute with default conflict** — if a default value is defined (even `default=False`), precompute is skipped silently. Fix: Remove `default=` when using `precompute=True`.

4. **Recursive dependency without recursive=True** — field depending on `parent_id.field` causes infinite recomputation. Fix: Set `recursive=True` explicitly.

5. **Non-stored field with store=False search** — calling `search([('computed_field', '=', value)])` without a `search=` method raises error. Fix: Either add `search='_search_method'` or use `store=True`.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (405.1-405.23), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Computed Field Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
