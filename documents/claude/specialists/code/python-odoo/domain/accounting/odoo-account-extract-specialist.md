# Odoo Account Extract Specialist — Enterprise
# Odoo Account Extract Chuyen Gia — Enterprise
# Odoo OCR抽出 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: AI Document Extraction
**Category**: domain-accounting | **Purpose**: Extract invoice data from scanned documents using Odoo's IAP OCR service

---

## Metadata

```json
{"id":"odoo-account-extract-specialist","technology":"Odoo 18 Enterprise","aspect":"AI Document Extraction","category":"domain-accounting","subcategory":"odoo","lines":140,"token_cost":1700,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_invoice_extract/","E2: Odoo 18 official docs (accounting/vendor_bills/invoice_digitization)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 439.1–439.5 |
| **Dependencies** | `account_invoice_extract` (Enterprise, requires IAP credits) |
| **When To Use** | Automated data entry from scanned invoices, bills, and receipts using AI/OCR |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: extract, OCR, digitization, iap |

---

## Patterns

**439.1** IAP (In-App Purchase) service for OCR — sends document image to Odoo's cloud OCR.
**439.2** Auto-fill vendor bill fields: partner, date, amount, reference, line items.
**439.3** Confidence scoring — low confidence fields highlighted for manual review.
**439.4** Bank statement OCR — extract from scanned bank statements.
**439.5** Expense OCR — extract from receipts (via hr_expense_extract).

---

*Odoo Account Extract Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
