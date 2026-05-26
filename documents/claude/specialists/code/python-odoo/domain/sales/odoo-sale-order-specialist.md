# Odoo Sale Order Specialist — Enterprise
# Odoo Sale Order Chuyen Gia — Enterprise
# Odoo 販売注文 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Sales Orders
**Category**: domain-sales | **Purpose**: Manage quotations, SO lifecycle, invoicing policies, pricelists, and discounts

---

## Metadata

```json
{"id":"odoo-sale-order-specialist","technology":"Odoo 18 Enterprise","aspect":"Sales Orders","category":"domain-sales","subcategory":"odoo","lines":200,"token_cost":2500,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/sale/models/sale_order.py (~52 models)","E2: Odoo 18 official docs (sales/sales_orders)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 454.1–454.15 |
| **Dependencies** | `sale`, `sale_management` |
| **When To Use** | Quotation-to-invoice workflow — creating SOs, managing lines, pricing, and invoicing |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: sale.order, sale.order.line, quotation, pricelist |

---

## Patterns

**454.1** `sale.order` state machine: draft → sent → sale → cancel.
**454.2** `sale.order.line` — product, qty, price, taxes, subtotal.
**454.3** Quotation templates (sale_management).
**454.4** Pricelist: `product.pricelist` with rules (discount, formula, fixed).
**454.5** Invoice policies: ordered quantities vs delivered quantities.
**454.6** Down payment / advance invoice.
**454.7** Optional products (upselling in portal).
**454.8** Margin computation (sale_margin module).
**454.9** SO-to-invoice flow: `_create_invoices()`.
**454.10** Quotation expiry (validity_date).
**454.11** Customer portal: online signature and payment.
**454.12** Product configurator (variants, combos).
**454.13** Analytic distribution on lines.
**454.14** Multi-currency sales.
**454.15** Sales warnings on customer/product.

---

*Odoo Sale Order Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
