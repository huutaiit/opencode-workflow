# Odoo Model Extension Specialist — Enterprise
# Odoo Model Extension Chuyen Gia — Enterprise
# Odoo モデル拡張 スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Model Extension
**Category**: extension
**Purpose**: Extend existing Odoo models with new fields, constraints, and standalone models in extension modules

---

## Metadata

```json
{
  "id": "odoo-model-extension-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Model Extension",
  "category": "extension",
  "subcategory": "odoo",
  "lines": 350,
  "token_cost": 4300,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#inheritance)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale_subscription/models/sale_order.py",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale_stock/models/sale_order.py"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Model (cross-cutting) |
| **Directory Pattern** | `{extension_module}/models/{extended_model}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 410.1–410.24 |
| **Source Paths** | `**/models/**/*.py` (files containing `_inherit`) |
| **File Count** | 1–20 model files per extension module |
| **Naming Convention** | File: same as original model file (e.g., `sale_order.py`). Class: same as original (e.g., `SaleOrder`) |
| **Imports From** | `odoo.models`, `odoo.fields`, `odoo.api`, `odoo.exceptions` |
| **Imported By** | ORM (merged into original model at load time) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Adding fields, constraints, or standalone models to existing modules without modifying their source |
| **Source Skeleton** | `{module}/models/{extended_model}.py` |
| **Specialist Type** | code |
| **Purpose** | Extend existing Odoo models with new fields, constraints, and standalone models in extension modules |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: _inherit, selection_add, _sql_constraints |

---

## Role

You are an **Odoo Model Extension Specialist** for Odoo 18 Enterprise. Your responsibility is to extend existing models in separate modules — adding fields, constraints, selection values, and new standalone models. You understand the 4 types of model inheritance and know when each applies to extension scenarios.

**Used by**: Code agents customizing/extending existing Odoo modules
**Not used by**: Creating new models (see odoo-model-declaration), overriding methods (see odoo-method-override)

---

## Patterns

### Pattern 410.1–410.4: _inherit Extension Patterns (CRITICAL)

**410.1 Simple field addition — _inherit without _name**: Most common extension. Adds fields to existing model's table.

```python
# sale_stock/models/sale_order.py — adding stock fields to sale.order
class SaleOrder(models.Model):
    _inherit = "sale.order"

    warehouse_id = fields.Many2one('stock.warehouse', string='Warehouse',
        compute='_compute_warehouse_id', store=True, readonly=False, precompute=True)
    picking_ids = fields.One2many('stock.picking', 'sale_id', string='Transfers')
    delivery_count = fields.Integer(compute='_compute_picking_ids')
    delivery_status = fields.Selection([...], compute='_compute_delivery_status', store=True)
```

**410.2 Mixin injection — _inherit list with _name**: Retroactively add mixin capability. Use `_name` equal to original model + add mixin to `_inherit` list.

```python
# sale_subscription/models/sale_order.py — inject rating.mixin into sale.order
class SaleOrder(models.Model):
    _name = "sale.order"
    _inherit = ["rating.mixin", "sale.order"]
```

**Rules**:
- Setting `_name` = original + adding mixin to `_inherit` list = mixin injection
- The original model MUST be in the `_inherit` list
- Mixin fields/methods merge into the original model's table

**410.3 Field attribute override**: Re-declare an existing field with changed attributes. Only specified attributes are overridden.

```python
# sale_stock overriding expected_date help text from sale module
expected_date = fields.Datetime(
    help="Delivery date computed from minimum lead time of order lines.")
```

**410.4 Selection field extension with selection_add**: Add new options to inherited Selection fields.

```python
# sale_subscription extending sale.order state
subscription_state = fields.Selection(
    selection=SUBSCRIPTION_STATES, readonly=False,
    compute='_compute_subscription_state', store=True, tracking=True,
    group_expand='_group_expand_states')
```

### Pattern 410.5–410.8: Constraint Extension (HIGH)

**410.5 SQL constraint on extended model**: Add database-level constraints to models you don't own.

```python
class SaleOrder(models.Model):
    _inherit = 'sale.order'
    _sql_constraints = [
        ('subscription_unique', 'unique(subscription_id, state)',
         'Only one active order per subscription allowed.'),
    ]
```

**410.6 Python constraint on extended model**: Add `@api.constrains` validation to inherited fields.

```python
class SaleOrder(models.Model):
    _inherit = 'sale.order'

    @api.constrains('start_date', 'end_date')
    def _check_subscription_dates(self):
        for order in self:
            if order.end_date and order.start_date and order.end_date < order.start_date:
                raise ValidationError(_("End date must be after start date."))
```

**410.7 Field naming conventions for extensions**: Prefix or suffix consistently.

```python
# Relational: {model}_id / {model}_ids suffix
subscription_id = fields.Many2one('sale.order', string='Parent Contract')
subscription_child_ids = fields.One2many('sale.order', 'subscription_id')

# Count fields: {noun}_count
delivery_count = fields.Integer(compute='_compute_picking_ids')

# Boolean toggles: show_* / is_* / has_*
is_subscription = fields.Boolean(compute='_compute_is_subscription', store=True)
show_json_popover = fields.Boolean(compute='_compute_json_popover')
```

**410.8 New standalone models within extension**: Extension modules can create brand-new models.

```python
# sale_subscription/models/sale_subscription_plan.py
class SaleSubscriptionPlan(models.Model):
    _name = 'sale.subscription.plan'
    _description = 'Subscription Plan'

    name = fields.Char(required=True)
    billing_period_value = fields.Integer(default=1, required=True)
    billing_period_unit = fields.Selection([('month', 'Months'), ('year', 'Years')], default='month')
```

### Pattern 410.9–410.12: Advanced Extension (HIGH)

**410.9 SELF_READABLE_FIELDS extension**: Extend the set of fields readable by the record owner (portal pattern).

```python
class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    SELF_READABLE_FIELDS = ['skill_ids', 'certificate_ids']
```

**410.10 Mixin method implementation**: Implement hook methods defined by abstract mixins.

```python
# mail.thread mixin defines _track_subtype; extension implements it
class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def _track_subtype(self, init_values):
        if 'state' in init_values:
            if self.state == 'sale':
                return self.env.ref('sale.mt_order_confirmed')
        return super()._track_subtype(init_values)
```

**410.11 Default value override**: Override defaults for inherited fields.

```python
class SaleOrder(models.Model):
    _inherit = 'sale.order'

    picking_policy = fields.Selection(default='direct')
    # Or override default_get for dynamic defaults
```

**410.12 _order override**: Change default sort order in extension module.

```python
class SaleOrder(models.Model):
    _inherit = 'sale.order'
    _order = 'next_invoice_date asc, id desc'
```

### Pattern 410.13–410.18: Data & Configuration Extension (MEDIUM)

**410.13 Data seeding via XML**: Extension modules provide default records for new behavior.

```xml
<!-- sale_subscription/data/sale_subscription_data.xml -->
<record id="subscription_plan_monthly" model="sale.subscription.plan">
    <field name="name">Monthly</field>
    <field name="billing_period_value">1</field>
    <field name="billing_period_unit">month</field>
</record>
```

**410.14 Server action binding**: Bind new actions to existing models.

```xml
<record id="action_subscription_dashboard" model="ir.actions.act_window">
    <field name="name">Subscriptions</field>
    <field name="res_model">sale.order</field>
    <field name="domain">[('is_subscription', '=', True)]</field>
</record>
```

**410.15 Configuration delegation**: Store config in `res.company`, expose in `res.config.settings`.

```python
# In res.company extension
class ResCompany(models.Model):
    _inherit = 'res.company'
    subscription_default_plan_id = fields.Many2one('sale.subscription.plan')

# In res.config.settings extension
class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    subscription_default_plan_id = fields.Many2one(
        related='company_id.subscription_default_plan_id', readonly=False)
```

**410.16–410.18 Reserved for future patterns.**

### Pattern 410.19–410.24: Cross-Module Patterns (MEDIUM)

**410.19 Cross-module Many2one**: Reference models from another module. Requires `depends` in manifest.

```python
# helpdesk_sale adding sale reference to helpdesk tickets
class HelpdeskTicket(models.Model):
    _inherit = 'helpdesk.ticket'
    sale_order_id = fields.Many2one('sale.order', string='Sales Order')
```

**410.20 Cross-module computed field**: Compute based on data from dependent module.

```python
class SaleOrder(models.Model):
    _inherit = 'sale.order'
    delivery_count = fields.Integer(compute='_compute_picking_ids')

    @api.depends('picking_ids')
    def _compute_picking_ids(self):
        for order in self:
            order.delivery_count = len(order.picking_ids)
```

**410.21 ir.cron extension**: Add scheduled jobs for extended behavior.

```xml
<record id="ir_cron_subscription_invoice" model="ir.cron">
    <field name="name">Generate Subscription Invoices</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="code">model._cron_create_subscription_invoices()</field>
    <field name="interval_number">1</field>
    <field name="interval_type">days</field>
</record>
```

**410.22–410.24 Reserved for future patterns.**

---

## Abnormal Case Patterns (3 patterns)

1. **_name with _inherit creates new table** — setting `_name` different from `_inherit` creates prototype inheritance (new model, new table). Fix: For simple extension, NEVER set `_name`. Only set `_name` for mixin injection (equal to original) or prototype inheritance (intentional).

2. **Field name collision** — two extension modules adding same field name to same model. Fix: Prefix with module name when ambiguous (e.g., `subscription_state` not just `state`).

3. **Missing dependency in manifest** — using `_inherit` on model from a module not in `depends`. Fix: Always add the module to `depends` list. Without it, load order is random and inheritance may fail.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (410.1-410.24), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Model Extension Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
