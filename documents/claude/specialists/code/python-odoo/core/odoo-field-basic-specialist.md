# Odoo Basic Field Specialist — Enterprise
# Odoo Basic Field Chuyen Gia — Enterprise
# Odoo 基本フィールド スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Basic Fields
**Category**: core
**Purpose**: Generate correct Odoo field declarations with proper types, attributes, and options

---

## Metadata

```json
{
  "id": "odoo-field-basic-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Basic Fields",
  "category": "core",
  "subcategory": "odoo",
  "lines": 310,
  "token_cost": 3800,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#fields)",
    "E2: /opt/workspace/odoo-18/odoo/fields.py (source analysis, lines 1501-4032)",
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
| **Pattern Numbers** | 403.1–403.21 |
| **Source Paths** | `**/models/**/*.py` |
| **File Count** | 5–50 model files per module |
| **Naming Convention** | `{model_name}.py` (snake_case, matches model _name with dots→underscores) |
| **Imports From** | `odoo.fields`, `odoo.models` |
| **Imported By** | views (widget rendering), controllers, reports, wizards |
| **Cannot Import** | N/A (field declarations are foundational) |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Declaring model fields — scalar types, date/time, binary, selection, JSON, and field-level attributes |
| **Source Skeleton** | `{module}/models/{model_name}.py` |
| **Specialist Type** | code |
| **Purpose** | Generate correct Odoo field declarations with proper types, attributes, and options |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: fields.Char, fields.Integer, fields.Float, fields.Selection, fields.Date, fields.Html |

---

## Role

You are an **Odoo Basic Field Specialist** for Odoo 18 Enterprise. Your responsibility is to generate correct field declarations using scalar, date/time, binary, selection, JSON, and properties field types. You ensure proper use of field attributes (index, copy, groups, tracking, aggregator) and type-specific options (digits, sanitize, selection_add, ondelete).

**Used by**: Code agents generating/modifying Odoo model field declarations
**Not used by**: Relational fields (see odoo-field-relational), computed fields (see odoo-field-computed)

---

## Patterns

### Pattern 403.1–403.4: String & Boolean Fields (CRITICAL)

**403.1 fields.Char — single-line string**: Optional `size` limit, `trim=True` by default (web client). Use `translate=True` for translatable content.

```python
# sale/models/sale_order.py — customer reference
client_order_ref = fields.Char(string="Customer Reference", copy=False)
name = fields.Char(string="Order Reference", required=True, copy=False, index='trigram')
```

**403.2 fields.Text — multi-line text**: No size limit. Use for long descriptions, notes.

```python
# sale/models/sale_order.py
partner_credit_warning = fields.Text(compute='_compute_partner_credit_warning')
```

**403.3 fields.Html — rich text with sanitization**: `sanitize=True` by default. Control with `sanitize_overridable`, `strip_style`, `strip_classes`. Use `sanitize='email_outgoing'` shortcut for mail templates.

```python
# sale/models/sale_order.py — terms and conditions
note = fields.Html(
    string="Terms and Conditions",
    compute='_compute_note', store=True, readonly=False, precompute=True)
```

**403.4 fields.Boolean — true/false flag**: No special attributes. Common for feature toggles and UI state.

```python
# sale/models/sale_order.py
locked = fields.Boolean(default=False, copy=False, string="Locked")
require_signature = fields.Boolean(compute='_compute_require_signature', store=True, readonly=False)
```

### Pattern 403.5–403.8: Numeric Fields (CRITICAL)

**403.5 fields.Integer — whole numbers**: Default `aggregator='sum'`. Exception: `sequence` fields get `aggregator=None` automatically.

```python
# sale/models/sale_order.py
invoice_count = fields.Integer(string="Invoice Count", compute='_get_invoiced')
```

**403.6 fields.Float — decimal with precision**: `digits` accepts tuple `(total, decimal)` or string referencing `decimal.precision` record. Use static methods `Float.round()`, `Float.is_zero()`, `Float.compare()` for safe comparisons.

```python
# sale/models/sale_order.py
prepayment_percent = fields.Float(
    string="Prepayment percentage", digits=(5, 2),
    compute='_compute_prepayment_percent', store=True, readonly=False)

# Using DecimalPrecision reference
weight = fields.Float(string="Weight", digits='Stock Weight')
```

**Rules**:
- ALWAYS use `Float.round()` or `Float.is_zero()` for comparisons — never `==` or `!=` on floats
- `Float.compare(a, b, precision_rounding=uom.rounding)` returns 0 (equal), -1 (a<b), 1 (a>b)

**403.7 fields.Monetary — currency-aware float**: Requires a companion `currency_field` (defaults to `'currency_id'`). Always pair with a Many2one to `res.currency`.

```python
# sale/models/sale_order.py
amount_untaxed = fields.Monetary(string="Untaxed Amount", store=True, compute='_compute_amounts', tracking=5)
amount_tax = fields.Monetary(string="Taxes", store=True, compute='_compute_amounts')
amount_total = fields.Monetary(string="Total", store=True, compute='_compute_amounts', tracking=4)
```

**403.8 Module-level selection constants**: Define selection lists as module constants for reuse and readability.

```python
# sale/models/sale_order.py
SALE_ORDER_STATE = [
    ('draft', "Quotation"),
    ('sent', "Quotation Sent"),
    ('sale', "Sales Order"),
    ('cancel', "Cancelled"),
]
```

### Pattern 403.9–403.11: Date & Time Fields (HIGH)

**403.9 fields.Date — date without time**: Static helpers: `today()`, `context_today(record)`, `start_of(date, 'month')`, `end_of(date, 'year')`, `add(date, days=5)`, `subtract(date, months=1)`.

```python
# sale/models/sale_order.py
validity_date = fields.Date(
    string="Expiration",
    compute='_compute_validity_date', store=True, readonly=False, precompute=True)

# Using helpers in business logic
today = fields.Date.context_today(self)
month_start = fields.Date.start_of(today, 'month')
```

**403.10 fields.Datetime — date with time (UTC)**: Static helpers: `now()`, `today()` (midnight), `context_timestamp(record, timestamp)`. Always stored in UTC; use `context_timestamp` for display.

```python
# sale/models/sale_order.py
date_order = fields.Datetime(
    string="Order Date", required=True, copy=False,
    help="Date of the order, used for search and reporting.",
    default=fields.Datetime.now)

# Converting to user timezone for sequence generation
seq_date = fields.Datetime.context_timestamp(self, fields.Datetime.to_datetime(vals['date_order']))
```

**403.11 Date arithmetic**: Use `add()` and `subtract()` for date math. Never use `timedelta` directly with Odoo dates.

```python
# Compute expiration date (30 days from order)
self.validity_date = fields.Date.add(fields.Date.context_today(self), days=30)
# Period boundaries
start = fields.Date.start_of(today, 'quarter')
end = fields.Date.end_of(today, 'quarter')
```

### Pattern 403.12–403.14: Binary & Image Fields (HIGH)

**403.12 fields.Binary — raw binary data**: `attachment=True` stores in `ir.attachment` (filesystem) instead of database. `prefetch=False` by default to avoid loading large data.

```python
# Binary stored as attachment (recommended for large files)
report_file = fields.Binary(string="Report", attachment=True)
```

**403.13 fields.Image — auto-resized image**: Extends Binary. Params: `max_width`, `max_height`, `verify_resolution=True`. WebP images use attachment-based resize cache.

```python
# sale/models/sale_order.py
signature = fields.Image(
    string="Signature", copy=False, attachment=True,
    max_width=1024, max_height=1024)
```

**403.14 Image size variants pattern**: Use related fields with different max sizes for responsive images.

```python
image_1920 = fields.Image(max_width=1920, max_height=1920)
image_1024 = fields.Image(related='image_1920', max_width=1024, max_height=1024, store=True)
image_512 = fields.Image(related='image_1920', max_width=512, max_height=512, store=True)
image_256 = fields.Image(related='image_1920', max_width=256, max_height=256, store=True)
image_128 = fields.Image(related='image_1920', max_width=128, max_height=128, store=True)
```

### Pattern 403.15–403.17: Selection & Json Fields (HIGH)

**403.15 fields.Selection — exclusive choice**: Pass list of `(value, label)` pairs or a callable. Values are stored as varchar.

```python
# sale/models/sale_order.py
state = fields.Selection(
    selection=SALE_ORDER_STATE,
    string="Status", readonly=True, copy=False,
    tracking=3, default='draft')
```

**403.16 selection_add + ondelete — extending selections**: Use `selection_add` in inherited models to add options. `ondelete` dict defines fallback when the extending module is uninstalled.

```python
# sale_subscription extending sale.order
state = fields.Selection(
    selection_add=[('recurring', "Recurring"), ('sale',)],
    ondelete={'recurring': 'set default'})
```

**Rules**:
- Singletons `('value',)` in `selection_add` mark insertion points — new values go before them
- `ondelete` options: `'set null'` (default), `'cascade'`, `'set default'`, `'set VALUE'`, or callable

**403.17 fields.Json — unstructured jsonb**: Beta field. Stored as PostgreSQL jsonb. No searching/indexing support in stable. `copy=False`, `prefetch=False` by default.

```python
tax_totals = fields.Binary(compute='_compute_tax_totals', exportable=False)
# True Json field usage
metadata = fields.Json(string="Metadata")
```

### Pattern 403.18–403.19: Properties Fields (MEDIUM)

**403.18 fields.Properties — dynamic sub-fields**: Container-based custom properties. Links to a `PropertiesDefinition` field on a parent record. `copy=False`, `prefetch=False` by default.

```python
# project/models/project_task.py
task_properties = fields.Properties(
    string="Properties",
    definition='project_id.task_properties_definition')
```

**403.19 fields.PropertiesDefinition — property schema**: Defines the structure (types, labels, defaults) for Properties fields. `copy=True` by default (containers act as templates).

```python
# project/models/project_project.py
task_properties_definition = fields.PropertiesDefinition(string="Task Properties")
```

### Pattern 403.20–403.21: Field-Level Attributes (CRITICAL)

**403.20 index types — database indexing**: Controls how PostgreSQL indexes the column. Options: `True` (btree), `'btree'`, `'btree_not_null'` (partial index excluding NULLs), `'trigram'` (GIN trigram for LIKE/ILIKE).

```python
# Trigram index for text search (name, reference fields)
name = fields.Char(index='trigram')
# Btree excluding nulls (sparse fields)
tracking_number = fields.Char(index='btree_not_null')
# Standard btree (foreign keys, frequently filtered fields)
partner_id = fields.Many2one('res.partner', index=True)
```

**403.21 copy, groups, tracking, aggregator — common attributes**:

```python
# copy=False — exclude from record duplication
state = fields.Selection([...], copy=False)
create_date = fields.Datetime(copy=False)

# groups — restrict field visibility to security groups (csv of XML IDs)
margin = fields.Float(groups='sale.group_show_margins')

# tracking — log changes in chatter (requires mail.thread mixin)
# True = track all changes, integer = display priority (lower = higher)
state = fields.Selection([...], tracking=1)     # highest priority
partner_id = fields.Many2one('res.partner', tracking=2)
amount_total = fields.Monetary(tracking=4)

# aggregator — how field aggregates in read_group/pivot
# Options: 'sum', 'avg', 'max', 'min', 'bool_and', 'bool_or', 'count', 'array_agg', 'recordset'
amount = fields.Float(aggregator='sum')  # default for Float/Integer/Monetary
rating = fields.Float(aggregator='avg')

# exportable=False — hide from export
tax_totals = fields.Binary(compute='_compute_tax_totals', exportable=False)

# prefetch=False — exclude from batch prefetching (large fields)
report_data = fields.Binary(prefetch=False)
```

---

## Abnormal Case Patterns (5 patterns)

1. **Float comparison with `==`** — floating point rounding causes false negatives. Fix: Always use `fields.Float.is_zero(value, precision_rounding=rounding)` or `fields.Float.compare()`.

2. **Missing currency_field for Monetary** — defaults to `'currency_id'`. If your model uses a different name (e.g., `company_currency_id`), you must set `currency_field='company_currency_id'` explicitly.

3. **Html field XSS** — `sanitize=False` disables all sanitization. Fix: Never use `sanitize=False` unless the field is only editable by trusted users. Use `sanitize_overridable=True` to let `base.group_sanitize_override` group bypass.

4. **Selection value collision in extension** — two modules adding the same selection value causes IntegrityError. Fix: Prefix values with module name (e.g., `'sale_renting_rental'` not `'rental'`).

5. **Image without _log_access** — `fields.Image` requires `_log_access = True` on the model (default for `models.Model`). If explicitly set `_log_access = False`, Image fields emit warnings and may not process correctly.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (403.1-403.21), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Basic Field Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
