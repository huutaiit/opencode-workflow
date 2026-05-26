# Odoo Report Specialist — Enterprise
# Odoo Report Chuyen Gia — Enterprise
# Odoo レポート スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Reports
**Category**: data
**Purpose**: Create PDF/HTML reports using QWeb templates, report actions, and wkhtmltopdf rendering

---

## Metadata

```json
{
  "id": "odoo-report-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Reports",
  "category": "data",
  "subcategory": "odoo",
  "lines": 230,
  "token_cost": 2800,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/reports)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/report/ (source analysis)",
    "E3: /opt/workspace/odoo-18/odoo/addons/account/report/ (advanced patterns)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Report |
| **Directory Pattern** | `{module}/report/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 419.1–419.8 |
| **Source Paths** | `**/report/**/*.xml`, `**/report/**/*.py` |
| **File Count** | 2–6 report files per module |
| **Naming Convention** | `ir_actions_report.xml` (action), `ir_actions_report_templates.xml` (QWeb) |
| **Imports From** | N/A (declarative XML + QWeb) |
| **Imported By** | Print button, scheduled actions |
| **Cannot Import** | N/A |
| **Dependencies** | `wkhtmltopdf` (system package for PDF generation) |
| **When To Use** | Generating printable PDF/HTML documents — invoices, quotations, delivery slips, custom reports |
| **Source Skeleton** | `{module}/report/ir_actions_report.xml`, `{module}/report/ir_actions_report_templates.xml` |
| **Specialist Type** | code |
| **Purpose** | Create PDF/HTML reports using QWeb templates, report actions, and wkhtmltopdf rendering |
| **Activation Trigger** | files: `**/report/**/*.xml`; keywords: ir.actions.report, t-call, web.external_layout, web.html_container |

---

## Role

You are an **Odoo Report Specialist** for Odoo 18 Enterprise. Your responsibility is to create printable reports using ir.actions.report definitions and QWeb templates with proper layout inheritance (external_layout), field rendering (t-field), and PDF generation settings.

**Used by**: Code agents creating printable documents (invoices, SO, delivery slips)
**Not used by**: Screen views (see odoo-views-xml), analytics (see pivot/graph in views)

---

## Patterns

### Pattern 419.1–419.3: Report Action & Layout (CRITICAL)

**419.1 ir.actions.report declaration**: Register report action.

```xml
<record id="action_report_saleorder" model="ir.actions.report">
    <field name="name">Quotation / Order</field>
    <field name="model">sale.order</field>
    <field name="report_type">qweb-pdf</field>
    <field name="report_name">sale.report_saleorder</field>
    <field name="report_file">sale.report_saleorder</field>
    <field name="print_report_name">'Quotation - %s' % (object.name)</field>
    <field name="binding_model_id" ref="model_sale_order"/>
    <field name="binding_type">report</field>
</record>
```

**419.2 QWeb report template with external_layout**: Standard document layout with company header/footer.

```xml
<template id="report_saleorder">
    <t t-call="web.html_container">
        <t t-foreach="docs" t-as="doc">
            <t t-call="sale.report_saleorder_document"/>
        </t>
    </t>
</template>

<template id="report_saleorder_document">
    <t t-call="web.external_layout">
        <t t-set="doc" t-value="doc.with_context(lang=doc.partner_id.lang)"/>
        <div class="page">
            <h2><span t-field="doc.name"/></h2>
            <!-- Report content -->
        </div>
    </t>
</template>
```

**419.3 web.html_container vs web.external_layout**: Container wraps multiple documents; external_layout adds company header/footer per document.

### Pattern 419.4–419.6: Report Content (HIGH)

**419.4 t-field for formatted output**: Server-side field rendering with locale-aware formatting.

```xml
<span t-field="doc.date_order"/>
<span t-field="doc.amount_total" t-options='{"widget": "monetary", "display_currency": doc.currency_id}'/>
<div t-field="doc.partner_id" t-options='{"widget": "contact", "fields": ["address", "name"]}'/>
```

**419.5 Table with line iteration**: Standard report table pattern.

```xml
<table class="table table-sm o_main_table table-borderless mt-4">
    <thead><tr>
        <th class="text-start">Description</th>
        <th class="text-end">Quantity</th>
        <th class="text-end">Unit Price</th>
        <th class="text-end">Amount</th>
    </tr></thead>
    <tbody>
        <t t-foreach="doc.order_line" t-as="line">
            <tr>
                <td><span t-field="line.name"/></td>
                <td class="text-end"><span t-field="line.product_uom_qty"/></td>
                <td class="text-end"><span t-field="line.price_unit"/></td>
                <td class="text-end"><span t-field="line.price_subtotal"/></td>
            </tr>
        </t>
    </tbody>
</table>
```

**419.6 Totals section**: Subtotal, tax, and total amounts.

```xml
<div class="row justify-content-end">
    <div class="col-4">
        <table class="table table-sm">
            <tr><td>Subtotal</td><td class="text-end"><span t-field="doc.amount_untaxed"/></td></tr>
            <tr><td>Taxes</td><td class="text-end"><span t-field="doc.amount_tax"/></td></tr>
            <tr class="border-black"><td><strong>Total</strong></td>
                <td class="text-end"><strong><span t-field="doc.amount_total"/></strong></td></tr>
        </table>
    </div>
</div>
```

### Pattern 419.7–419.8: Advanced Report (MEDIUM)

**419.7 Excel reports (xlsxwriter)**: Python-based Excel generation.

```python
class SaleReportXlsx(models.AbstractModel):
    _name = 'report.sale.report_saleorder_xlsx'
    _inherit = 'report.report_xlsx.abstract'

    def generate_xlsx_report(self, workbook, data, orders):
        sheet = workbook.add_worksheet('Sales')
        for i, order in enumerate(orders):
            sheet.write(i, 0, order.name)
            sheet.write(i, 1, order.amount_total)
```

**419.8 Report actions**: Trigger from buttons or menus.

```xml
<!-- Button in form view -->
<button name="%(sale.action_report_saleorder)d" string="Print" type="action"/>
```

---

## Abnormal Case Patterns (2 patterns)

1. **wkhtmltopdf missing** — PDF generation fails silently. Fix: Install `wkhtmltopdf` with patched Qt (Odoo-specific build).
2. **Wrong language in report** — report renders in user's language, not customer's. Fix: Use `doc.with_context(lang=doc.partner_id.lang)` at template start.

---

## Quality Checklist

- [x] **Q1**: Patterns evidence-based? - [x] **Q2**: Pattern IDs unique (419.1-419.8)?
- [x] **Q3**: Trilingual header? - [x] **Q4**: No implementation code?

---

*Odoo Report Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
