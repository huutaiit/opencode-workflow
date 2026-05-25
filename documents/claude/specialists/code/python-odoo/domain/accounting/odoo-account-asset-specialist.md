# Odoo Account Asset Specialist — Enterprise
# Odoo Account Asset Chuyen Gia — Enterprise
# Odoo 固定資産 スペシャリスト — Enterprise

**Version**: 2.1.0 | **Technology**: Odoo 18 Enterprise | **Aspect**: Asset Management
**Category**: domain-accounting | **Purpose**: Manage fixed assets, depreciation schedules, and asset disposal

---

## Metadata

```json
{"id":"odoo-account-asset-specialist","technology":"Odoo 18 Enterprise","aspect":"Asset Management","category":"domain-accounting","subcategory":"odoo","lines":180,"token_cost":2200,"version":"2.1.0","evidence":["E1: /opt/workspace/odoo-18/odoo/addons/account_asset/models/ (7 files)","E2: Odoo 18 official docs (accounting/asset)"]}
```

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain | **Pattern Numbers** | 431.1–431.13 |
| **Source Paths** | `**/account_asset/models/*.py` |
| **Dependencies** | `account_asset` (Enterprise) |
| **When To Use** | Fixed asset lifecycle — acquisition, depreciation computation, disposal, and revaluation |
| **Specialist Type** | code |
| **Activation Trigger** | keywords: account.asset, depreciation, asset_type |

---

## Patterns

### 431.1–431.5: Asset Model (CRITICAL)

**431.1** `account.asset` — asset record with state (draft/open/paused/close). `asset_type`: sale (revenue recognition), purchase (depreciation), expense.
**431.2** `account.asset.group` — asset category with default accounts and depreciation method.
**431.3** Depreciation methods: linear, degressive, degressive-linear.
**431.4** Depreciation board: list of planned journal entries with dates and amounts.
**431.5** Auto-create asset from vendor bill line.

### 431.6–431.10: Operations (HIGH)

**431.6** Confirm asset → generates depreciation board entries.
**431.7** Post depreciation → creates account.move automatically.
**431.8** Pause depreciation (temporarily stop schedule).
**431.9** Dispose asset → sell or scrap with gain/loss computation.
**431.10** Revalue asset → adjust book value.

### 431.11–431.13: Reporting (MEDIUM)

**431.11** Asset report (by category, by period). **431.12** Gross value vs net book value. **431.13** Tax vs accounting depreciation.

---

*Odoo Account Asset Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
