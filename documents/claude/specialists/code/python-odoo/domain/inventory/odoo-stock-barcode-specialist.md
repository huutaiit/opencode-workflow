# Odoo Stock Barcode Specialist — Enterprise
# Odoo Stock Barcode Chuyen Gia — Enterprise
# Odoo バーコード スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Barcode Scanning
**Category**: domain-inventory | **Purpose**: Mobile warehouse operations with barcode scanning and GS1 nomenclature

---

## Metadata

```json
{"id":"odoo-stock-barcode-specialist","technology":"Odoo 18 Enterprise","aspect":"Barcode Scanning","category":"domain-inventory","subcategory":"odoo","lines":160,"token_cost":2000,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/stock_barcode/models/ (17 files)","E2: Odoo 18 official docs (inventory/barcode)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 443.1–443.10 |
| **Dependencies** | `stock_barcode` (Enterprise) |
| **When To Use** | Mobile warehouse — barcode scanning for picks, receipts, inventory counts, and package tracking |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: stock_barcode, barcode, GS1, nomenclature |

---

## Patterns

**443.1** Barcode scanning interface (mobile-optimized OWL app).
**443.2** GS1 nomenclature — parse GS1-128 barcodes (product, lot, quantity, expiry).
**443.3** Scan-to-pick workflow.
**443.4** Scan-to-receive workflow.
**443.5** Inventory count by scanning.
**443.6** Package scanning (put in pack, scan package barcode).
**443.7** Location scanning for multi-step operations.
**443.8** Serial number scanning and validation.
**443.9** Batch picking with barcode.
**443.10** Custom barcode nomenclature rules.

---

*Odoo Stock Barcode Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
