# Odoo Account EDI Specialist — Enterprise
# Odoo Account EDI Chuyen Gia — Enterprise
# Odoo 電子請求書 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Electronic Invoicing (EDI)
**Category**: domain-accounting | **Purpose**: Generate and receive electronic invoices in UBL/CII/PEPPOL/Factur-X formats

---

## Metadata

```json
{"id":"odoo-account-edi-specialist","technology":"Odoo 18 Enterprise","aspect":"Electronic Invoicing","category":"domain-accounting","subcategory":"odoo","lines":170,"token_cost":2100,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_edi_ubl_cii/models/ (14 files)","E2: Odoo 18 official docs (accounting/edi)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 438.1–438.8 |
| **Dependencies** | `account_edi_ubl_cii` (Enterprise) |
| **When To Use** | E-invoicing compliance — UBL 2.1, CII D16B, PEPPOL BIS 3.0, Factur-X, XRechnung |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: account_edi, UBL, CII, PEPPOL, Factur-X |

---

## Patterns

**438.1** EDI format registry: `account.edi.format` model.
**438.2** UBL 2.1 (Universal Business Language) — XML invoice generation.
**438.3** CII D16B (Cross-Industry Invoice) — UN/CEFACT standard.
**438.4** PEPPOL BIS 3.0 — pan-European e-invoicing network.
**438.5** Factur-X / ZUGFeRD — hybrid PDF + XML format.
**438.6** E-invoice sending workflow: generate → validate → send.
**438.7** E-invoice receiving: parse XML attachment → create vendor bill.
**438.8** Country-specific: FatturaPA (Italy), SII (Spain), SAF-T (Nordic), XRechnung (Germany).

---

*Odoo Account EDI Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
