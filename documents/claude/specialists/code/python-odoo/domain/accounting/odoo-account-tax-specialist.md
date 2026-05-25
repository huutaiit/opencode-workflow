# Odoo Account Tax Specialist — Enterprise
# Odoo Account Tax Chuyen Gia — Enterprise
# Odoo 税金 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Tax Configuration
**Category**: domain-accounting | **Purpose**: Configure tax rules, groups, repartition lines, and fiscal positions

---

## Metadata

```json
{"id":"odoo-account-tax-specialist","technology":"Odoo 18 Enterprise","aspect":"Tax Configuration","category":"domain-accounting","subcategory":"odoo","lines":200,"token_cost":2500,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account/models/account_tax.py (~2789 lines)","E2: Odoo 18 official docs (accounting/taxes)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Directory Pattern** | `account/models/account_tax.py` |
| **Variant** | enterprise | **Pattern Numbers** | 430.1–430.14 |
| **Source Paths** | `**/account/models/account_tax*.py` |
| **Dependencies** | `account` module |
| **When To Use** | Tax computation, fiscal position mapping, tax groups, and repartition lines |
| **Source Skeleton** | N/A (extends existing account module) |
| **Specialist Type** | code |
| **Activation Trigger** | files: `**/models/account_tax*.py`; keywords: account.tax, tax_ids, fiscal_position |

---

## Patterns

### 430.1–430.5: Tax Model (CRITICAL)

**430.1** `account.tax` — tax rule definition with amount_type (percent/fixed/group/division).
**430.2** `account.tax.group` — grouping taxes for display (e.g., "VAT", "Sales Tax").
**430.3** `account.tax.repartition.line` — distribution of tax amounts between accounts.
**430.4** Tax computation: `compute_all(price_unit, quantity, product, partner)` returns tax breakdown.
**430.5** Price-included vs price-excluded taxes.

### 430.6–430.10: Fiscal Position (HIGH)

**430.6** `account.fiscal.position` — maps taxes/accounts based on customer location.
**430.7** `map_tax(taxes)` — returns replacement taxes based on fiscal position rules.
**430.8** Auto-detection from partner country/state/VAT.
**430.9** Intra-community (EU) and reverse charge patterns.
**430.10** Tax cash basis — recognize tax on payment instead of invoice.

### 430.11–430.14: Advanced Tax (MEDIUM)

**430.11** Group tax (tax containing other taxes).
**430.12** Tax scope: `sale`, `purchase`, `none`.
**430.13** Tax report tags for tax declaration.
**430.14** Withholding tax patterns.

---

## Abnormal Case Patterns

1. **Wrong tax on invoice** — fiscal position not applied. Fix: Set fiscal position on partner or order.
2. **Rounding errors** — tax computed per-line vs per-total differs. Fix: Use company setting `tax_calculation_rounding_method`.

---

*Odoo Account Tax Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
