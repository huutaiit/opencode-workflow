# Odoo Security & Access Specialist — Enterprise
# Odoo Security & Access Chuyen Gia — Enterprise
# Odoo セキュリティ＆アクセス スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Security & Access Control
**Category**: core
**Purpose**: Define correct ACL rules, security groups, and record rules for Odoo modules

---

## Metadata

```json
{
  "id": "odoo-security-access-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Security & Access Control",
  "category": "core",
  "subcategory": "odoo",
  "lines": 280,
  "token_cost": 3400,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/security)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/security/ (source analysis — 3 files)",
    "E3: /opt/workspace/odoo-18/odoo/addons/crm/security/ (additional patterns)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Security |
| **Directory Pattern** | `{module}/security/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 408.1–408.7 |
| **Source Paths** | `**/security/*.csv`, `**/security/*.xml` |
| **File Count** | 2–4 files per module (csv + xml) |
| **Naming Convention** | `ir.model.access.csv`, `ir_rules.xml`, `res_groups.xml` |
| **Imports From** | N/A (declarative XML/CSV) |
| **Imported By** | ORM engine (enforced transparently on all CRUD operations) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Setting up model-level CRUD permissions (ACLs), group hierarchy, and row-level record rules |
| **Source Skeleton** | `{module}/security/ir.model.access.csv`, `{module}/security/ir_rules.xml`, `{module}/security/res_groups.xml` |
| **Specialist Type** | code |
| **Purpose** | Define correct ACL rules, security groups, and record rules for Odoo modules |
| **Activation Trigger** | files: `**/security/*.csv`, `**/security/*.xml`; keywords: ir.model.access, ir.rule, res.groups |

---

## Role

You are an **Odoo Security & Access Specialist** for Odoo 18 Enterprise. Your responsibility is to define the three-layer security model: model-level ACLs (ir.model.access.csv), security groups (res.groups), and row-level record rules (ir.rule). You ensure proper tiered access (user vs manager vs portal), multi-company isolation, and wizard-specific ACLs.

**Used by**: Code agents creating new modules or adding models that need access control
**Not used by**: Security extension of existing modules (see odoo-security-extension)

---

## Patterns

### Pattern 408.1: Group-Tiered ACL (CRITICAL)

**408.1 ir.model.access.csv — model-level CRUD permissions**: CSV file defining who can read/write/create/unlink each model. Multiple rows per model for different groups.

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_sale_order,sale.order,model_sale_order,sales_team.group_sale_salesman,1,1,1,0
access_sale_order_manager,sale.order.manager,model_sale_order,sales_team.group_sale_manager,1,1,1,1
```

**Rules**:
- `id` must be unique across the entire database — prefix with `access_{model}_{role}`
- `model_id:id` uses `model_{model_name_with_underscores}` (e.g., `model_sale_order` for `sale.order`)
- For cross-module models, prefix with module: `account.model_account_move`
- Salesman: read+write+create (no unlink). Manager: full CRUD
- If NO ACL row exists for a group → that group has NO access to the model

### Pattern 408.2: Cross-Module Model Access (HIGH)

**408.2 Read-only access to other modules' models**: Sales team needs to READ accounting data but not modify it.

```csv
access_account_account_salesman,account_account salesman,account.model_account_account,sales_team.group_sale_salesman,1,0,0,0
access_account_move_salesman,account_move salesman,account.model_account_move,sales_team.group_sale_salesman,1,0,0,0
access_account_move_line_salesman,account_move_line salesman,account.model_account_move_line,sales_team.group_sale_salesman,1,0,0,0
```

### Pattern 408.3: Portal Access (HIGH)

**408.3 Portal user read-only ACL**: Portal users see limited data through record rules, but need base ACL.

```csv
access_sale_order_portal,sale.order.portal,sale.model_sale_order,base.group_portal,1,0,0,0
access_sale_order_line_portal,sale.order.line.portal,sale.model_sale_order_line,base.group_portal,1,0,0,0
```

### Pattern 408.4: Wizard/TransientModel ACLs (HIGH)

**408.4 Wizard access — creator-only record rules**: Wizards need ACL rows AND a creator-only record rule to prevent cross-user access.

```csv
access_sale_advance_payment_inv,access.sale.advance.payment.inv,model_sale_advance_payment_inv,sales_team.group_sale_salesman,1,1,1,0
access_sale_order_cancel,access.sale.order.cancel,model_sale_order_cancel,sales_team.group_sale_salesman,1,1,1,0
```

```xml
<!-- Creator-only record rule for wizard -->
<record id="sale_advance_payment_inv_rule" model="ir.rule">
    <field name="name">Sales Advance Payment Invoice Rule</field>
    <field name="model_id" ref="model_sale_advance_payment_inv"/>
    <field name="domain_force">[('create_uid', '=', user.id)]</field>
</record>
```

### Pattern 408.5: Hidden Feature Toggle Groups (MEDIUM)

**408.5 Hidden groups for feature gating**: Groups with `category_id = base.module_category_hidden` are invisible in user settings. Toggled programmatically via `res.config.settings`.

```xml
<!-- sale/security/res_groups.xml -->
<record id="group_auto_done_setting" model="res.groups">
    <field name="name">Lock Confirmed Sales</field>
    <field name="category_id" ref="base.module_category_hidden"/>
</record>

<record id="group_discount_per_so_line" model="res.groups">
    <field name="name">Discount on lines</field>
    <field name="category_id" ref="base.module_category_hidden"/>
</record>
```

**Rules**:
- Hidden groups control optional features (discounts, proforma invoices, warnings)
- Toggled in Settings UI via `res.config.settings` Boolean fields with `group_` prefix
- Never assign hidden groups directly to users — always through settings

### Pattern 408.6: Multi-Company Domain Rules (CRITICAL)

**408.6 company_ids domain for multi-company isolation**: Every business model needs a multi-company record rule using `company_ids` (not `company_id`).

```xml
<!-- sale/security/ir_rules.xml -->
<record id="sale_order_comp_rule" model="ir.rule">
    <field name="name">Sales Order multi-company</field>
    <field name="model_id" ref="model_sale_order"/>
    <field name="domain_force">[('company_id', 'in', company_ids)]</field>
</record>
```

**Rules**:
- `company_ids` is a special variable = user's allowed companies (not just active company)
- Apply to ALL models with `company_id` field — parent AND child models
- No `groups` attribute = applies to ALL groups (global rule)
- Use `noupdate="1"` on the `<odoo>` wrapper to prevent overwrites on upgrade

### Pattern 408.7: Row-Level Record Rules by Role (CRITICAL)

**408.7 Personal vs See-All dual-rule pattern**: Salesmen see only their own records; managers see all. Portal users see only records they follow.

```xml
<!-- Personal: salesman sees own orders -->
<record id="sale_order_personal_rule" model="ir.rule">
    <field name="name">Personal Orders</field>
    <field name="model_id" ref="model_sale_order"/>
    <field name="domain_force">['|',('user_id','=',user.id),('user_id','=',False)]</field>
    <field name="groups" eval="[(4, ref('sales_team.group_sale_salesman'))]"/>
</record>

<!-- See-all: manager/senior sees everything -->
<record id="sale_order_see_all" model="ir.rule">
    <field name="name">All Orders</field>
    <field name="model_id" ref="model_sale_order"/>
    <field name="domain_force">[(1,'=',1)]</field>
    <field name="groups" eval="[(4, ref('sales_team.group_sale_salesman_all_leads'))]"/>
</record>

<!-- Portal: sees orders they follow -->
<record id="sale_order_rule_portal" model="ir.rule">
    <field name="name">Portal Personal Quotations/Sales Orders</field>
    <field name="model_id" ref="sale.model_sale_order"/>
    <field name="domain_force">[('message_partner_ids','child_of',[user.commercial_partner_id.id])]</field>
    <field name="groups" eval="[(4, ref('base.group_portal'))]"/>
    <field name="perm_unlink" eval="True"/>
    <field name="perm_write" eval="True"/>
    <field name="perm_read" eval="True"/>
    <field name="perm_create" eval="False"/>
</record>
```

**Rules**:
- Record rules within SAME group are OR'ed, across DIFFERENT groups are AND'ed
- `[(1,'=',1)]` = no restriction (see-all pattern)
- Portal rules: use `message_partner_ids` + `child_of` for follower-based visibility
- Always create rules for child models too (order lines mirror order rules)
- `perm_*` attributes on ir.rule default to True — explicitly set False to restrict

---

## Abnormal Case Patterns (3 patterns)

1. **Missing ACL row** — model has no ir.model.access.csv entry for a group. Users get AccessError. Fix: Always add at least read access for any group that interacts with the model.

2. **Record rule AND trap** — rules on different groups are AND'ed. User in both groups gets intersection, not union. Fix: Use `implied_ids` group hierarchy so senior group inherits junior group's rules.

3. **noupdate missing** — without `noupdate="1"`, record rules are overwritten on module upgrade, losing admin customizations. Fix: Always wrap ir.rule and ir.model.access records in `<odoo noupdate="1">`.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based (E1-E3 sources referenced)?
- [x] **Q2**: Pattern IDs unique (408.1-408.7), no overlap?
- [x] **Q3**: Trilingual header present (EN/VI/JP)?
- [x] **Q4**: No implementation code — patterns and rules only?

---

*Odoo Security & Access Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
