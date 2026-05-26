# Odoo Workflow & Automation Specialist — Enterprise
# Odoo Workflow & Automation Chuyen Gia — Enterprise
# Odoo ワークフロー＆自動化 スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Workflow & Automation
**Category**: business
**Purpose**: Implement scheduled jobs (ir.cron), server actions, automated actions, state machines, and approval workflows

---

## Metadata

```json
{
  "id": "odoo-workflow-automation-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Workflow & Automation",
  "category": "business",
  "subcategory": "odoo",
  "lines": 250,
  "token_cost": 3100,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/actions)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/data/ir_cron.xml",
    "E3: /opt/workspace/odoo-18/odoo/addons/base_automation/models/"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Business |
| **Directory Pattern** | `{module}/data/ir_cron.xml`, `{module}/models/{model}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 422.1–422.10 |
| **Source Paths** | `**/data/ir_cron.xml`, `**/data/ir_actions_server.xml` |
| **File Count** | 1–3 data files + model methods |
| **Naming Convention** | Cron: `ir_cron_{action}`, Server action: `action_{verb}_{noun}` |
| **Imports From** | `odoo.models`, `odoo.api` |
| **Imported By** | Cron scheduler, UI triggers, automated action engine |
| **Cannot Import** | N/A |
| **Dependencies** | `base_automation` (for automated actions only) |
| **When To Use** | Scheduled background jobs, event-triggered automation, state machine transitions, and sequence numbering |
| **Source Skeleton** | `{module}/data/ir_cron.xml` |
| **Specialist Type** | code |
| **Purpose** | Implement scheduled jobs, server actions, automated actions, state machines, and approval workflows |
| **Activation Trigger** | files: `**/data/ir_cron.xml`; keywords: ir.cron, ir.actions.server, base.automation, state machine |

---

## Role

You are an **Odoo Workflow & Automation Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents implementing background processing and business workflows
**Not used by**: UI views (see odoo-views-xml), mail integration (see odoo-mail-chatter)

---

## Patterns

### Pattern 422.1–422.3: Scheduled Jobs (CRITICAL)

**422.1 ir.cron — scheduled job**: Periodic background execution.

```xml
<record id="ir_cron_expire_quotations" model="ir.cron">
    <field name="name">Sales: Expire Quotations</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="state">code</field>
    <field name="code">model._cron_expire_quotations()</field>
    <field name="interval_number">1</field>
    <field name="interval_type">days</field>
    <field name="numbercall">-1</field>
</record>
```

**422.2 Cron method convention**: Private method prefixed with `_cron_`.

```python
@api.model
def _cron_expire_quotations(self):
    limit_date = fields.Date.subtract(fields.Date.today(), days=30)
    expired = self.search([('state', '=', 'draft'), ('validity_date', '<', limit_date)])
    expired.action_cancel()
```

**422.3 interval_type options**: `minutes`, `hours`, `days`, `weeks`, `months`. `numbercall=-1` = run forever.

### Pattern 422.4–422.6: Server & Automated Actions (HIGH)

**422.4 ir.actions.server — server action**: Python code triggered by button or menu.

```xml
<record id="action_mass_update" model="ir.actions.server">
    <field name="name">Mass Update Status</field>
    <field name="model_id" ref="model_sale_order"/>
    <field name="binding_model_id" ref="model_sale_order"/>
    <field name="state">code</field>
    <field name="code">records.action_confirm()</field>
</record>
```

**422.5 base.automation — automated action**: Event-triggered (on create/write/delete/time).

```xml
<record id="auto_assign_salesperson" model="base.automation">
    <field name="name">Auto-assign Salesperson</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="trigger">on_create</field>
    <field name="state">code</field>
    <field name="code">
for record in records:
    if not record.user_id:
        record.user_id = record.partner_id.user_id
    </field>
</record>
```

**422.6 ir.sequence — auto-numbering**: Sequential reference generation.

```xml
<record id="seq_sale_order" model="ir.sequence">
    <field name="name">Sales Order</field>
    <field name="code">sale.order</field>
    <field name="prefix">S%(range_year)s</field>
    <field name="padding">5</field>
    <field name="company_id" eval="False"/>
</record>
```

```python
name = self.env['ir.sequence'].next_by_code('sale.order')  # → S202600001
```

### Pattern 422.7–422.10: State Machine & Workflows (HIGH)

**422.7 Selection + button state machine**: Standard Odoo state management.

```python
state = fields.Selection([
    ('draft', 'Quotation'), ('sent', 'Sent'), ('sale', 'Sales Order'), ('cancel', 'Cancelled')
], default='draft', tracking=True, copy=False)

def action_confirm(self):
    self.write({'state': 'sale'})

def action_cancel(self):
    self.write({'state': 'cancel'})

def action_draft(self):
    self.write({'state': 'draft'})
```

**422.8 mail.template — email triggers**: Send templated emails on state transitions.

```python
def action_confirm(self):
    self.write({'state': 'sale'})
    template = self.env.ref('sale.email_template_edi_sale')
    for order in self:
        template.send_mail(order.id, force_send=True)
```

**422.9 Approval workflow pattern**: Using `approvals` module for multi-level approval.

**422.10 mail.activity — scheduled activities**: Create follow-up tasks.

```python
self.activity_schedule('mail.mail_activity_data_todo',
    date_deadline=fields.Date.add(fields.Date.today(), days=7),
    summary='Follow up on quotation',
    user_id=self.user_id.id)
```

---

## Abnormal Case Patterns (2 patterns)

1. **Cron job blocking** — long-running cron blocks other crons. Fix: Use `with_delay()` from queue_job for heavy processing, or process in batches with `commit()`.
2. **ir.sequence gaps** — sequences increment on `nextval` even if transaction rolls back. Fix: Accept gaps; never rely on sequence contiguity for business logic.

---

*Odoo Workflow & Automation Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
