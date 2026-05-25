# Odoo Wizard Specialist — Enterprise
# Odoo Wizard Chuyen Gia — Enterprise
# Odoo ウィザード スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Wizards
**Category**: data
**Purpose**: Create TransientModel-based wizards for multi-step user interactions and batch operations

---

## Metadata

```json
{
  "id": "odoo-wizard-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Wizards",
  "category": "data",
  "subcategory": "odoo",
  "lines": 230,
  "token_cost": 2800,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/tutorials/server_framework_101/13_wizards)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/wizard/ (4 wizard files)",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale/wizard/sale_order_cancel.py"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Business |
| **Directory Pattern** | `{module}/wizard/{wizard_name}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 420.1–420.9 |
| **Source Paths** | `**/wizard/**/*.py`, `**/wizard/**/*.xml` |
| **File Count** | 1–8 wizard files per module |
| **Naming Convention** | `{action_name}.py` (e.g., `sale_order_cancel.py`) |
| **Imports From** | `odoo.models.TransientModel`, `odoo.fields`, `odoo.api` |
| **Imported By** | Form views via `target='new'` actions |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Multi-step dialogs, confirmation prompts, batch operations, and data collection before an action |
| **Source Skeleton** | `{module}/wizard/{name}.py`, `{module}/wizard/{name}_views.xml` |
| **Specialist Type** | code |
| **Purpose** | Create TransientModel-based wizards for multi-step user interactions and batch operations |
| **Activation Trigger** | files: `**/wizard/**/*.py`; keywords: TransientModel, target.*new, ensure_one |

---

## Role

You are an **Odoo Wizard Specialist** for Odoo 18 Enterprise. Your responsibility is to create TransientModel wizards with proper context-based defaults, ensure_one guards, action methods returning window actions, and _prepare_* patterns for data collection.

**Used by**: Code agents creating interactive dialogs and batch operation UIs
**Not used by**: Persistent models (see odoo-model-declaration), automated actions (see odoo-workflow-automation)

---

## Patterns

### Pattern 420.1–420.3: Wizard Basics (CRITICAL)

**420.1 TransientModel base**: Auto-vacuumed records. Use for temporary data.

```python
from odoo import models, fields, api, _

class SaleOrderCancel(models.TransientModel):
    _name = 'sale.order.cancel'
    _description = "Sales Order Cancel"

    order_id = fields.Many2one('sale.order', string="Sales Order", required=True)
    display_name = fields.Char(compute='_compute_display_name')
```

**420.2 Context-based defaults**: Read active record from context.

```python
order_id = fields.Many2one('sale.order', default=lambda self: self.env.context.get('active_id'))
# Or for multiple records:
order_ids = fields.Many2many('sale.order', default=lambda self: self.env.context.get('active_ids'))
```

**420.3 ensure_one guard + action method**: Validate single record and return action.

```python
def action_cancel(self):
    self.ensure_one()
    self.order_id.action_cancel()
    return {'type': 'ir.actions.act_window_close'}
```

### Pattern 420.4–420.6: Wizard Views (HIGH)

**420.4 Wizard form view**: Compact form with `target='new'` in action.

```xml
<record id="sale_order_cancel_view_form" model="ir.ui.view">
    <field name="model">sale.order.cancel</field>
    <field name="arch" type="xml">
        <form string="Cancel Sales Order">
            <group>
                <field name="order_id" readonly="1"/>
            </group>
            <footer>
                <button name="action_cancel" string="Cancel Order" type="object" class="btn-primary"/>
                <button string="Discard" special="cancel"/>
            </footer>
        </form>
    </field>
</record>
```

**420.5 Window action for wizard**: Opens wizard as dialog.

```xml
<record id="sale_order_cancel_action" model="ir.actions.act_window">
    <field name="name">Cancel Order</field>
    <field name="res_model">sale.order.cancel</field>
    <field name="view_mode">form</field>
    <field name="target">new</field>
    <field name="binding_model_id" ref="model_sale_order"/>
    <field name="binding_view_types">form</field>
</record>
```

**420.6 Chained action pattern**: Wizard returns another action after completion.

```python
def action_send_and_open(self):
    self.ensure_one()
    self.order_id.action_quotation_send()
    return {
        'type': 'ir.actions.act_window',
        'res_model': 'sale.order',
        'res_id': self.order_id.id,
        'view_mode': 'form',
    }
```

### Pattern 420.7–420.9: Advanced Wizard (MEDIUM)

**420.7 Computed fields for preview**: Show computed summary before action.

```python
amount_to_invoice = fields.Monetary(compute='_compute_amount', string="Amount to Invoice")

@api.depends('order_id.order_line')
def _compute_amount(self):
    for wizard in self:
        wizard.amount_to_invoice = sum(wizard.order_id.order_line.mapped('price_subtotal'))
```

**420.8 _prepare_* pattern**: Build values dict for create/write.

```python
def _prepare_invoice_values(self):
    self.ensure_one()
    return {
        'partner_id': self.order_id.partner_invoice_id.id,
        'invoice_date': self.invoice_date,
        'currency_id': self.order_id.currency_id.id,
    }
```

**420.9 Constraint validation in wizard**: Validate user input before action.

```python
@api.constrains('advance_payment_method', 'amount')
def _check_amount(self):
    for wizard in self:
        if wizard.advance_payment_method == 'fixed' and wizard.amount <= 0:
            raise ValidationError(_("Amount must be positive."))
```

---

## Abnormal Case Patterns (2 patterns)

1. **Wizard records accumulate** — TransientModel records are auto-vacuumed by `ir.autovacuum` cron (default: records older than 1 hour). No manual cleanup needed.
2. **Missing context active_id** — wizard opened without context. Fix: Always set `context="{'active_id': active_id}"` in the calling action.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based? - [x] **Q2**: Pattern IDs unique (420.1-420.9)?
- [x] **Q3**: Trilingual header? - [x] **Q4**: No implementation code?

---

*Odoo Wizard Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
