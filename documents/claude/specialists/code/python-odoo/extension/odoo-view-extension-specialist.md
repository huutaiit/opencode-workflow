# Odoo View Extension Specialist — Enterprise
# Odoo View Extension Chuyen Gia — Enterprise
# Odoo ビュー拡張 スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: View Extension
**Category**: extension
**Purpose**: Extend existing XML views using inherit_id, XPath expressions, and position attributes

---

## Metadata

```json
{
  "id": "odoo-view-extension-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "View Extension",
  "category": "extension",
  "subcategory": "odoo",
  "lines": 340,
  "token_cost": 4100,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/views#inheritance)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale_subscription/views/sale_order_views.xml",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale_stock/views/sale_order_views.xml"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | View (cross-cutting) |
| **Directory Pattern** | `{extension_module}/views/{model}_views.xml` |
| **Variant** | enterprise |
| **Pattern Numbers** | 412.1–412.20 |
| **Source Paths** | `**/views/**/*.xml` (files containing `inherit_id`) |
| **File Count** | 1–10 view files per extension module |
| **Naming Convention** | `{module}.{original_view_id}_inherit_{extension}` |
| **Imports From** | N/A (declarative XML) |
| **Imported By** | View engine (merged at rendering time) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Modifying existing form/list/kanban/search views from another module without editing original XML |
| **Source Skeleton** | `{module}/views/{model}_views.xml` |
| **Specialist Type** | code |
| **Purpose** | Extend existing XML views using inherit_id, XPath expressions, and position attributes |
| **Activation Trigger** | files: `**/views/**/*.xml`; keywords: inherit_id, xpath, position= |

---

## Role

You are an **Odoo View Extension Specialist** for Odoo 18 Enterprise. Your responsibility is to extend existing views using `inherit_id`, XPath expressions, and the 5 position types. You ensure correct element targeting, attribute modification, and view priority management.

**Used by**: Code agents customizing UI from extension modules
**Not used by**: Creating new views (see odoo-views-xml), model extension (see odoo-model-extension)

---

## Patterns

### Pattern 412.1–412.2: Inheritance Declaration (CRITICAL)

**412.1 View inheritance record**: Declare view extension with `inherit_id` referencing parent view.

```xml
<record id="sale_subscription_order_view_form" model="ir.ui.view">
    <field name="name">sale.subscription.order.form</field>
    <field name="model">sale.order</field>
    <field name="inherit_id" ref="sale_management.sale_order_form_quote"/>
    <field name="priority" eval="10"/>
    <field name="arch" type="xml">
        <!-- XPath expressions here -->
    </field>
</record>
```

**412.2 Priority**: Lower priority = applied first. Default is 16. Use `eval="10"` to apply before default extensions.

### Pattern 412.3–412.7: The 5 Position Types (CRITICAL)

**412.3 position="inside" — append children**: Add elements inside matched container (at the end).

```xml
<xpath expr="//header" position="inside">
    <field name="is_subscription" invisible="1"/>
    <field name="subscription_state" invisible="1"/>
</xpath>
```

**412.4 position="before" — insert before**: Add elements before the matched element.

```xml
<button id="create_invoice" position="before">
    <button string="Resume" name="resume_subscription" type="object"
            invisible="subscription_state != '4_paused'"/>
</button>
```

**412.5 position="after" — insert after**: Add elements after the matched element.

```xml
<button name="action_cancel" position="after">
    <button string="Upsell" name="prepare_upsell_order" type="object"
            invisible="not is_subscription or subscription_state not in ['3_progress']"/>
</button>
```

**412.6 position="attributes" — modify attributes**: Change existing attributes on matched element.

```xml
<button id="create_invoice" position="attributes">
    <attribute name="invisible">invoice_status != 'to invoice' or is_subscription</attribute>
</button>
```

**412.7 position="replace" — remove or replace**: Replace matched element entirely. Empty replacement = removal.

```xml
<!-- Replace element -->
<field name="old_field" position="replace">
    <field name="new_field"/>
</field>
<!-- Remove element -->
<field name="unwanted_field" position="replace"/>
```

### Pattern 412.8–412.9: Additive Attributes (HIGH)

**412.8 Additive attribute modification**: Use `add` + `separator` to append to existing attribute values instead of replacing.

```xml
<button name="action_unlock" position="attributes">
    <attribute name="invisible" add="subscription_state == '5_renewed'" separator="or"/>
</button>
```

**412.9 XPath expression patterns**: 7 targeting syntaxes for precise element selection.

```xml
<!-- By element + name attribute -->
<field name="partner_id" position="after">

<!-- By ID -->
<button id="create_invoice" position="attributes">

<!-- XPath with hasclass() -->
<xpath expr="//div[hasclass('oe_button_box')]" position="inside">

<!-- XPath by element path -->
<xpath expr="//sheet/div[hasclass('badge')]" position="attributes">

<!-- XPath by field within group -->
<xpath expr="//group[@name='sale_info']//field[@name='team_id']" position="after">

<!-- XPath by position (nth child) -->
<xpath expr="//notebook/page[1]" position="after">

<!-- By element + string attribute -->
<button string="Confirm" position="attributes">
```

### Pattern 412.10–412.13: Common Extension Targets (HIGH)

**412.10 Notebook page insertion**: Add new tab pages to form notebooks.

```xml
<xpath expr="//notebook" position="inside">
    <page string="Subscription" name="subscription_page"
          invisible="not is_subscription">
        <group>
            <field name="plan_id"/>
            <field name="start_date"/>
            <field name="next_invoice_date"/>
        </group>
    </page>
</xpath>
```

**412.11 Button box addition**: Add stat buttons to the button box area.

```xml
<xpath expr="//div[hasclass('oe_button_box')]" position="inside">
    <button name="action_view_delivery" type="object"
            class="oe_stat_button" icon="fa-truck"
            invisible="delivery_count == 0">
        <field name="delivery_count" widget="statinfo" string="Delivery"/>
    </button>
</xpath>
```

**412.12 List view column addition**: Add columns to tree/list views.

```xml
<record id="sale_order_view_tree_inherit" model="ir.ui.view">
    <field name="inherit_id" ref="sale.view_order_tree"/>
    <field name="arch" type="xml">
        <field name="amount_total" position="after">
            <field name="delivery_status" widget="badge"
                   decoration-info="delivery_status == 'pending'"
                   decoration-success="delivery_status == 'full'"/>
        </field>
    </field>
</record>
```

**412.13 Search view filter/group-by extension**: Add filters and group-by options to search views.

```xml
<record id="sale_order_view_search_inherit" model="ir.ui.view">
    <field name="inherit_id" ref="sale.sale_order_view_search_inherit_quotation"/>
    <field name="arch" type="xml">
        <filter name="my_quotation" position="after">
            <filter name="is_subscription" string="Subscriptions"
                    domain="[('is_subscription', '=', True)]"/>
        </filter>
    </field>
</record>
```

### Pattern 412.14–412.17: Advanced Extension (MEDIUM)

**412.14 Hidden field injection**: Add invisible fields needed for domain expressions or computed logic.

```xml
<xpath expr="//header" position="inside">
    <field name="is_subscription" invisible="1"/>
    <field name="has_recurring_line" invisible="1"/>
</xpath>
```

**412.15 Primary mode inheritance**: Create a completely new view based on an existing one (`mode="primary"`).

```xml
<record id="subscription_order_form" model="ir.ui.view">
    <field name="name">sale.subscription.form</field>
    <field name="model">sale.order</field>
    <field name="inherit_id" ref="sale.view_order_form"/>
    <field name="mode">primary</field>
    <field name="arch" type="xml">
        <!-- Modifications specific to subscription view -->
    </field>
</record>
```

**412.16 Action redefinition**: Override existing window actions.

```xml
<record id="sale.action_orders" model="ir.actions.act_window">
    <field name="domain">[('is_subscription', '=', False)]</field>
</record>
```

**412.17 Menu item patterns**: Add or reorganize menu items.

```xml
<!-- New menu under existing parent -->
<menuitem id="menu_subscriptions"
    name="Subscriptions"
    parent="sale.sale_menu_root"
    action="sale_subscription_action"
    sequence="5"/>
```

### Pattern 412.18–412.20: Specialized Extension (MEDIUM)

**412.18 Inline subview targeting**: Reach into embedded list/form views within O2M fields.

```xml
<!-- Target the inline list view inside order_line field -->
<xpath expr="//field[@name='order_line']/list/field[@name='product_uom_qty']" position="after">
    <field name="qty_delivered" optional="show"/>
</xpath>
```

**412.19 Settings view extension**: Extend `res.config.settings` form view.

```xml
<record id="res_config_settings_view_form_inherit" model="ir.ui.view">
    <field name="inherit_id" ref="sale.res_config_settings_view_form"/>
    <field name="arch" type="xml">
        <xpath expr="//div[@id='sale_general']" position="inside">
            <div class="o_setting_box">
                <field name="subscription_default_plan_id"/>
            </div>
        </xpath>
    </field>
</record>
```

**412.20 Action-view binding**: Link action to specific view for specific context.

```xml
<record id="subscription_action_view_form" model="ir.actions.act_window.view">
    <field name="act_window_id" ref="sale_subscription_action"/>
    <field name="view_id" ref="subscription_order_form"/>
    <field name="view_mode">form</field>
</record>
```

---

## Abnormal Case Patterns (3 patterns)

1. **XPath not found** — target element was renamed or removed by another module. Fix: Use `id` attributes for stable targeting. Check parent view structure before writing XPath.

2. **Multiple matches** — XPath matches more than one element. Odoo applies to FIRST match only. Fix: Make XPath more specific (add `[@name='...']` or path context).

3. **Priority conflict** — two extensions modify same element with conflicting changes. Fix: Set explicit `priority` to control application order. Lower number = applied first.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (412.1-412.20), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo View Extension Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
