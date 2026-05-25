# Odoo Views XML Specialist — Enterprise
# Odoo Views XML Chuyen Gia — Enterprise
# Odoo ビューXML スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: XML Views
**Category**: ui
**Purpose**: Create correct Odoo XML view definitions for form, list, kanban, search, and analytical views

---

## Metadata

```json
{
  "id": "odoo-views-xml-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "XML Views",
  "category": "ui",
  "subcategory": "odoo",
  "lines": 350,
  "token_cost": 4500,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/views)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/views/sale_order_views.xml (source analysis)",
    "E3: /opt/workspace/odoo-18/odoo/addons/helpdesk/views/helpdesk_ticket_views.xml"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | View |
| **Directory Pattern** | `{module}/views/{model}_views.xml` |
| **Variant** | enterprise |
| **Pattern Numbers** | 415.1–415.34 |
| **Source Paths** | `**/views/**/*.xml` |
| **File Count** | 3–15 view files per module |
| **Naming Convention** | View id: `{module}.view_{model}_{type}`, File: `{model}_views.xml` |
| **Imports From** | N/A (declarative XML) |
| **Imported By** | Web client (renders views), actions (reference views) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Creating new form, list, kanban, calendar, graph, pivot, and search views for Odoo models |
| **Source Skeleton** | `{module}/views/{model}_views.xml`, `{module}/views/{module}_menus.xml` |
| **Specialist Type** | code |
| **Purpose** | Create correct Odoo XML view definitions for form, list, kanban, search, and analytical views |
| **Activation Trigger** | files: `**/views/**/*.xml`; keywords: ir.ui.view, form, list, kanban, search, ir.actions.act_window |

---

## Role

You are an **Odoo Views XML Specialist** for Odoo 18 Enterprise. Your responsibility is to create correct XML view definitions for all 8 view types, configure field widgets, manage actions and menus, and apply proper domain expressions. You ensure views follow the header+sheet+chatter form pattern and use appropriate widgets for each field type.

**Used by**: Code agents creating UI views for Odoo models
**Not used by**: View extension (see odoo-view-extension), OWL components (see odoo-owl-component)

---

## Patterns

### Pattern 415.1–415.8: View Types (CRITICAL)

**415.1 Form view — header+sheet+chatter**: Standard form layout.

```xml
<record id="view_order_form" model="ir.ui.view">
    <field name="name">sale.order.form</field>
    <field name="model">sale.order</field>
    <field name="arch" type="xml">
        <form string="Sales Order" class="o_sale_order">
            <header>
                <button name="action_confirm" string="Confirm" type="object" class="btn-primary"
                    invisible="state != 'draft'"/>
                <button name="action_cancel" type="object" string="Cancel"
                    invisible="state not in ['draft', 'sent', 'sale']"/>
                <field name="state" widget="statusbar" statusbar_visible="draft,sent,sale"/>
            </header>
            <sheet>
                <div class="oe_button_box" name="button_box">
                    <button name="action_view_invoice" type="object" class="oe_stat_button" icon="fa-pencil-square-o"
                            invisible="invoice_count == 0">
                        <field name="invoice_count" widget="statinfo" string="Invoices"/>
                    </button>
                </div>
                <widget name="web_ribbon" title="Cancelled" bg_color="text-bg-danger"
                    invisible="state != 'cancel'"/>
                <div class="oe_title">
                    <h1><field name="name" readonly="1"/></h1>
                </div>
                <group>
                    <group name="partner_details">
                        <field name="partner_id" widget="res_partner_many2one"/>
                    </group>
                    <group name="order_details">
                        <field name="date_order"/>
                        <field name="validity_date"/>
                    </group>
                </group>
                <notebook>
                    <page string="Order Lines" name="order_lines">
                        <field name="order_line">
                            <list editable="bottom">
                                <field name="product_id"/>
                                <field name="product_uom_qty"/>
                                <field name="price_unit"/>
                                <field name="price_subtotal"/>
                            </list>
                        </field>
                        <group class="oe_subtotal_footer">
                            <field name="amount_untaxed"/>
                            <field name="amount_tax"/>
                            <field name="amount_total" class="oe_subtotal_footer_separator"/>
                        </group>
                    </page>
                </notebook>
            </sheet>
            <chatter/>
        </form>
    </field>
</record>
```

**415.2 List view**: Columns with optional show/hide, decorations, and header actions.

```xml
<record id="sale_order_tree" model="ir.ui.view">
    <field name="model">sale.order</field>
    <field name="arch" type="xml">
        <list string="Sales Orders" sample="1" decoration-muted="state == 'cancel'">
            <header>
                <button name="%(action)d" type="action" string="Create Invoices"/>
            </header>
            <field name="name" string="Number" readonly="1" decoration-bf="1"/>
            <field name="partner_id" readonly="1"/>
            <field name="amount_total" sum="Total" widget="monetary" optional="show"/>
            <field name="state" widget="badge" optional="hide"
                decoration-success="state == 'sale'" decoration-info="state == 'draft'"/>
        </list>
    </field>
</record>
```

**415.3 Kanban view**: Card-based layout with templates.

```xml
<kanban class="o_kanban_mobile" sample="1" quick_create="false">
    <field name="currency_id"/>
    <progressbar field="activity_state" colors='{"planned": "success", "today": "warning", "overdue": "danger"}'/>
    <templates>
        <t t-name="card">
            <field name="partner_id" class="fw-bolder fs-5"/>
            <field name="amount_total" widget="monetary" class="fw-bolder ms-auto"/>
            <footer>
                <field name="state" widget="label_selection"
                    options="{'classes': {'draft': 'info', 'sale': 'success'}}"/>
            </footer>
        </t>
    </templates>
</kanban>
```

**415.4 Calendar view**: Date-based event display.

```xml
<calendar string="Sales Orders" mode="month" date_start="date_order" color="state" event_limit="5">
    <field name="partner_id" avatar_field="avatar_128"/>
    <field name="amount_total" widget="monetary"/>
</calendar>
```

**415.5 Gantt view**: Timeline bar chart (Enterprise).

```xml
<gantt date_start="date_start" date_stop="date_end" default_group_by="user_id"
    color="state" decoration-danger="state == 'overdue'" sample="1">
</gantt>
```

**415.6 Pivot view**: Cross-tab analysis.

```xml
<pivot string="Sales Analysis" sample="1">
    <field name="date_order" type="row"/>
    <field name="partner_id" type="col"/>
    <field name="amount_total" type="measure"/>
</pivot>
```

**415.7 Graph view**: Chart visualization.

```xml
<graph string="Sales Orders" sample="1">
    <field name="partner_id"/>
    <field name="amount_total" type="measure"/>
</graph>
```

**415.8 Search view**: Filters, group-by, and search defaults.

```xml
<search string="Search Sales Orders">
    <field name="name" string="Order" filter_domain="['|', ('name', 'ilike', self), ('client_order_ref', 'ilike', self)]"/>
    <field name="partner_id" operator="child_of"/>
    <separator/>
    <filter string="My Orders" name="my_orders" domain="[('user_id', '=', uid)]"/>
    <filter string="To Invoice" name="to_invoice" domain="[('invoice_status', '=', 'to invoice')]"/>
    <separator/>
    <filter string="Order Date" name="date_order" date="date_order"/>
    <group expand="0" string="Group By">
        <filter string="Salesperson" name="salesperson" context="{'group_by': 'user_id'}"/>
        <filter string="Customer" name="customer" context="{'group_by': 'partner_id'}"/>
        <filter string="Order Month" name="order_month" context="{'group_by': 'date_order:month'}"/>
    </group>
    <searchpanel>
        <field name="team_id" icon="fa-users" enable_counters="1"/>
    </searchpanel>
</search>
```

### Pattern 415.9–415.19: Widgets (HIGH)

**415.9 monetary**: Currency-aware display. Requires `currency_id` field in view.

```xml
<field name="currency_id" invisible="1"/>
<field name="amount_total" widget="monetary"/>
```

**415.10 badge**: Colored status indicator.

```xml
<field name="state" widget="badge"
    decoration-success="state == 'sale'"
    decoration-info="state == 'draft'"
    decoration-primary="state == 'sent'"/>
```

**415.11 many2many_tags**: Tag chips with optional colors.

```xml
<field name="tag_ids" widget="many2many_tags" options="{'color_field': 'color'}"/>
```

**415.12 many2one_avatar_user**: User avatar + name dropdown.

```xml
<field name="user_id" widget="many2one_avatar_user"/>
```

**415.13 statusbar**: Progress bar in form header.

```xml
<field name="state" widget="statusbar" statusbar_visible="draft,sent,sale"/>
```

**415.14 statinfo**: Stat button counter.

```xml
<button class="oe_stat_button" icon="fa-truck" type="object" name="action_view_delivery">
    <field name="delivery_count" widget="statinfo" string="Delivery"/>
</button>
```

**415.15 label_selection**: Selection rendered as label.
**415.16 list_activity**: Activity icons in list view.
**415.17 kanban_activity**: Activity widget for kanban cards.
**415.18 progressbar**: Kanban progress bar by field values.
**415.19 optional="show|hide"**: Column visibility toggle in list views.

### Pattern 415.20–415.25: Form Architecture (HIGH)

**415.20 oe_button_box**: Stat buttons container at top-right of form sheet.
**415.21 notebook/page**: Tab pages for organizing form sections.
**415.22 Inline subviews**: Embedded list/form inside O2M fields.

```xml
<field name="order_line">
    <list editable="bottom">
        <field name="product_id"/>
        <field name="product_uom_qty" string="Qty"/>
        <field name="price_unit"/>
    </list>
    <form>
        <group><field name="product_id"/></group>
    </form>
</field>
```

**415.23 web_ribbon widget**: Colored ribbon label.
**415.24 chatter**: Mail thread + activity stream.

```xml
<chatter/>  <!-- Shorthand for message + activity + followers -->
```

**415.25 groups attribute**: Restrict field visibility to security groups.

```xml
<field name="company_id" groups="base.group_multi_company"/>
```

### Pattern 415.26–415.30: Actions & Domains (CRITICAL)

**415.26 ir.actions.act_window**: Window action linking view to menu.

```xml
<record id="action_orders" model="ir.actions.act_window">
    <field name="name">Sales Orders</field>
    <field name="res_model">sale.order</field>
    <field name="view_mode">list,kanban,form,calendar,pivot,graph,activity</field>
    <field name="domain">[('state', 'not in', ('draft', 'sent', 'cancel'))]</field>
    <field name="context">{'search_default_my_orders': 1}</field>
    <field name="help" type="html">
        <p class="o_view_nocontent_smiling_face">Create a new sales order</p>
    </field>
</record>
```

**415.27 Domain expressions**: Standard Odoo domain syntax.

```xml
<!-- Simple -->
domain="[('state', '=', 'sale')]"
<!-- OR condition -->
domain="['|', ('user_id', '=', uid), ('user_id', '=', False)]"
<!-- AND (default) -->
domain="[('state', '=', 'sale'), ('amount_total', '>', 0)]"
<!-- child_of -->
domain="[('partner_id', 'child_of', parent_id)]"
```

**415.28 Context defaults**: Pass default values to new record forms.

```xml
<field name="context">{'default_partner_id': active_id, 'search_default_my_orders': 1}</field>
```

**415.29 Menu items**: Hierarchy with parent references.

```xml
<menuitem id="sale_menu_root" name="Sales" web_icon="sale,static/description/icon.png" sequence="2"/>
<menuitem id="sale_order_menu" name="Orders" parent="sale_menu_root" sequence="2"/>
<menuitem id="menu_sale_order" action="action_orders" parent="sale_order_menu" sequence="1"/>
```

**415.30 Server actions**: Python-based actions.

```xml
<record id="action_sale_order_make_invoice" model="ir.actions.server">
    <field name="name">Create Invoice</field>
    <field name="model_id" ref="model_sale_order"/>
    <field name="binding_model_id" ref="model_sale_order"/>
    <field name="state">code</field>
    <field name="code">action = records.action_create_invoices()</field>
</record>
```

### Pattern 415.31–415.34: Advanced View Patterns (MEDIUM)

**415.31 invisible/readonly domain expressions**: Dynamic visibility using Python-like expressions.

```xml
<field name="validity_date" invisible="state in ('sale', 'cancel')"/>
<button name="action_confirm" invisible="state != 'draft'" readonly="locked"/>
```

**415.32 decoration-* attributes**: Conditional styling in lists.

```xml
<list decoration-muted="state == 'cancel'" decoration-bf="amount_total > 10000">
<field name="state" decoration-success="state == 'sale'" decoration-danger="state == 'cancel'"/>
```

**415.33 sample="1"**: Show sample data in empty views.
**415.34 column_invisible**: Hide column entirely (different from invisible which hides per-row).

```xml
<field name="company_id" column_invisible="True"/>
```

---

## Abnormal Case Patterns (3 patterns)

1. **Missing currency_id for monetary widget** — monetary widget fails silently without currency field. Fix: Always add `<field name="currency_id" invisible="1"/>` in the view.

2. **invisible vs column_invisible confusion** — `invisible` hides per-row (domain), `column_invisible` hides entire column. Fix: Use `column_invisible="True"` for always-hidden columns, `invisible` for conditional.

3. **Editable list without required fields** — inline editable list missing required field causes validation error on save. Fix: Include all required fields in inline list view (even if invisible).

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (415.1-415.34), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Views XML Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
