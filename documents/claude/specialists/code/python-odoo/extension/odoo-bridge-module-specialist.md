# Odoo Bridge Module Specialist — Enterprise
# Odoo Bridge Module Chuyen Gia — Enterprise
# Odoo ブリッジモジュール スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Bridge Module
**Category**: extension
**Purpose**: Create bridge modules that connect two independent Odoo modules with auto_install and cross-domain integration

---

## Metadata

```json
{
  "id": "odoo-bridge-module-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Bridge Module",
  "category": "extension",
  "subcategory": "odoo",
  "lines": 230,
  "token_cost": 2900,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/tutorials/server_framework_101)",
    "E2: /opt/workspace/odoo-18/odoo/addons/helpdesk_sale/__manifest__.py (bridge pattern)",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale_stock/__manifest__.py (bridge pattern)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure (cross-cutting) |
| **Directory Pattern** | `{module_a}_{module_b}/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 414.1–414.8 |
| **Source Paths** | `**/__manifest__.py` (files with `auto_install: True`) |
| **File Count** | 3–10 files per bridge module |
| **Naming Convention** | `{module_a}_{module_b}` (alphabetical or domain order) |
| **Imports From** | Both parent modules |
| **Imported By** | Module loader (auto-installed when both parents present) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Connecting two independent Odoo modules that don't know about each other |
| **Source Skeleton** | `{module}/__manifest__.py`, `{module}/models/{bridged_model}.py`, `{module}/views/{bridged_model}_views.xml` |
| **Specialist Type** | architecture |
| **Purpose** | Create bridge modules that connect two independent Odoo modules with auto_install and cross-domain integration |
| **Activation Trigger** | files: `**/__manifest__.py`; keywords: auto_install, depends (2+ non-base modules) |

---

## Role

You are an **Odoo Bridge Module Specialist** for Odoo 18 Enterprise. Your responsibility is to design and implement bridge modules that connect two independent Odoo modules. Bridge modules auto-install when both dependencies are present and provide cross-domain fields, actions, data seeding, and configuration delegation.

**Used by**: Code agents integrating features across Odoo applications
**Not used by**: Single-module extensions (see odoo-model-extension), view-only changes (see odoo-view-extension)

---

## Patterns

### Pattern 414.1–414.2: Bridge Manifest (CRITICAL)

**414.1 auto_install: True manifest pattern**: Bridge modules auto-install when ALL dependencies are present.

```python
# helpdesk_sale/__manifest__.py
{
    'name': 'Helpdesk After Sales',
    'category': 'Services/Helpdesk',
    'summary': 'Manage after-sale from helpdesk tickets',
    'depends': ['helpdesk', 'sale_management'],
    'auto_install': True,
    'data': [
        'security/helpdesk_security.xml',
        'views/helpdesk_ticket_views.xml',
    ],
    'license': 'OEEL-1',
}
```

**Rules**:
- `auto_install: True` = installed when ALL `depends` modules are installed
- Bridge should depend on exactly 2 (sometimes 3) non-base modules
- Neither parent module should know about the bridge
- Name convention: `{module_a}_{module_b}` (e.g., `helpdesk_sale`, `sale_stock`, `documents_hr`)

**414.2 Bridge architecture principle**: Neither module knows about the other. Bridge provides glue.

```
helpdesk ←──── helpdesk_sale ────→ sale
(no sale       (auto_install)       (no helpdesk
 reference)                          reference)
```

### Pattern 414.3–414.5: Cross-Module Integration (HIGH)

**414.3 Cross-module field addition**: Add relational fields between the two bridged models.

```python
# helpdesk_sale: add sale fields to helpdesk
class HelpdeskTicket(models.Model):
    _inherit = 'helpdesk.ticket'
    sale_order_id = fields.Many2one('sale.order', string='Sales Order',
        help="Related sales order for after-sale support")
    sale_order_count = fields.Integer(compute='_compute_sale_order_count')
```

**414.4 Data seeding — default records**: Provide default configuration for the integration.

```xml
<!-- documents_hr: create Documents folder for HR -->
<record id="documents_hr_folder" model="documents.folder">
    <field name="name">Human Resources</field>
    <field name="company_id" eval="False"/>
</record>
```

**414.5 Server action binding**: Bind actions from one module to models of the other.

```xml
<!-- helpdesk_sale: bind "Create SO" action to helpdesk ticket -->
<record id="helpdesk_ticket_create_so_action" model="ir.actions.server">
    <field name="name">Create Sales Order</field>
    <field name="model_id" ref="helpdesk.model_helpdesk_ticket"/>
    <field name="binding_model_id" ref="helpdesk.model_helpdesk_ticket"/>
    <field name="state">code</field>
    <field name="code">action = records.action_create_sale_order()</field>
</record>
```

### Pattern 414.6–414.8: Configuration & Ownership (MEDIUM)

**414.6 Configuration delegation**: Store bridge config in `res.company`, expose via `res.config.settings`.

```python
# documents_hr: store config on company
class ResCompany(models.Model):
    _inherit = 'res.company'
    documents_hr_folder = fields.Many2one('documents.folder', default=lambda self: self.env.ref('documents_hr.documents_hr_folder', raise_if_not_found=False))

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    documents_hr_folder = fields.Many2one(related='company_id.documents_hr_folder', readonly=False)
```

**414.7 Many2many for loose ownership**: Use Many2many when the relationship is non-exclusive (record shared between domains).

```python
# helpdesk_sale: ticket can reference multiple SOs
class HelpdeskTicket(models.Model):
    _inherit = 'helpdesk.ticket'
    sale_order_ids = fields.Many2many('sale.order', string='Related Sales Orders')
```

**Rules**:
- Use Many2many (loose) when records exist independently
- Use Many2one (tight) when one record belongs to another
- Bridge should use the weaker coupling (Many2many) by default

**414.8 Computed fields querying across the bridge**: Aggregate or compute data from the bridged module.

```python
class HelpdeskTicket(models.Model):
    _inherit = 'helpdesk.ticket'

    @api.depends('sale_order_id')
    def _compute_sale_order_count(self):
        for ticket in self:
            ticket.sale_order_count = len(ticket.sale_order_id)

    def action_view_sale_orders(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'sale.order',
            'view_mode': 'list,form',
            'domain': [('id', '=', self.sale_order_id.id)],
            'context': {'create': False},
        }
```

---

## Abnormal Case Patterns (2 patterns)

1. **auto_install on non-bridge module** — causes unwanted installation when dependencies are coincidentally present. Fix: Only use `auto_install: True` on modules that connect exactly 2 independent applications.

2. **Circular bridge dependency** — module A depends on bridge, bridge depends on A. Fix: Bridge should ONLY depend on the two parent modules, never on other bridges or extensions.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (414.1-414.8), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Bridge Module Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
