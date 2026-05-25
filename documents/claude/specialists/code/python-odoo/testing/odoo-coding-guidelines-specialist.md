# Odoo Coding Guidelines Specialist — Enterprise
# Odoo Coding Guidelines Chuyen Gia — Enterprise
# Odoo コーディングガイドライン スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Coding Guidelines
**Category**: testing
**Purpose**: Enforce Odoo coding standards, naming conventions, import ordering, and OCA pylint-odoo rules

---

## Metadata

```json
{
  "id": "odoo-coding-guidelines-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Coding Guidelines",
  "category": "testing",
  "subcategory": "odoo",
  "lines": 230,
  "token_cost": 2900,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official coding guidelines (odoo.com/documentation/18.0/contributing/development/coding_guidelines)",
    "E2: OCA pylint-odoo rules (github.com/OCA/pylint-odoo)",
    "E3: /opt/workspace/odoo-18/odoo/addons/sale/ (reference module structure)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Testing (cross-cutting) |
| **Directory Pattern** | All files in `{module}/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 426.1–426.8 |
| **Source Paths** | `**/*.py`, `**/*.xml`, `**/*.csv` |
| **File Count** | All files |
| **Naming Convention** | See patterns below |
| **Imports From** | N/A (rules, not code) |
| **Imported By** | Linters, code review |
| **Cannot Import** | N/A |
| **Dependencies** | `pylint-odoo>=9.0` (for automated checking) |
| **When To Use** | Code review, linting, ensuring consistency across all Odoo module files |
| **Source Skeleton** | N/A (rule-set specialist, no files created) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce Odoo coding standards, naming conventions, import ordering, and OCA pylint-odoo rules |
| **Activation Trigger** | files: `**/*.py`; keywords: import, class, def, _name, _inherit |

---

## Role

You are an **Odoo Coding Guidelines Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents for quality enforcement during code generation
**Not used by**: N/A (applies to all generated code)

---

## Patterns

### Pattern 426.1–426.3: Python Naming (CRITICAL)

**426.1 Model & class naming**: Model names are dot-separated lowercase. Class names are CamelCase.

```python
# Model name: dot-separated lowercase
_name = 'sale.order'              # ✅
_name = 'SaleOrder'               # ❌

# Class name: CamelCase of model name
class SaleOrder(models.Model):    # ✅ (sale.order → SaleOrder)
class SaleOrderLine(models.Model): # ✅ (sale.order.line → SaleOrderLine)
```

**426.2 Method & variable naming**: snake_case for all Python identifiers.

```python
# Methods
def _compute_amount_total(self):   # ✅ Private compute
def action_confirm(self):          # ✅ Public action
def _prepare_invoice_values(self): # ✅ Private helper

# Variables
partner_id = ...                   # ✅
partnerID = ...                    # ❌
```

**426.3 XML record naming**: `{module}.{type}_{model}_{qualifier}`.

```xml
<!-- Views -->
id="sale.view_order_form"          <!-- view_{model}_{type} -->
id="sale.view_order_tree"

<!-- Actions -->
id="sale.action_orders"            <!-- action_{model_plural} -->

<!-- Menu -->
id="sale.menu_sale_order"          <!-- menu_{model} -->

<!-- Security -->
id="sale.sale_order_comp_rule"     <!-- {model}_{qualifier}_rule -->
```

### Pattern 426.4–426.5: File Organization (HIGH)

**426.4 Import ordering**: Standard Python → Odoo → Module.

```python
# 1. Standard library
import logging
from datetime import timedelta
from collections import defaultdict

# 2. Third-party (rarely needed)
from markupsafe import Markup

# 3. Odoo
from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError
from odoo.tools import float_compare, float_is_zero

# 4. Module-relative
from .sale_order_line import SaleOrderLine
```

**426.5 Model class ordering**: Attributes and methods in canonical order.

```python
class SaleOrder(models.Model):
    # 1. Private attributes
    _name = 'sale.order'
    _inherit = ['mail.thread']
    _description = 'Sales Order'
    _order = 'date_order desc, id desc'
    _check_company_auto = True

    # 2. Default methods
    def _default_note(self):
        ...

    # 3. Field declarations (grouped: state, relational, then computed)
    state = fields.Selection(...)
    partner_id = fields.Many2one(...)
    order_line = fields.One2many(...)
    amount_total = fields.Monetary(compute='_compute_amounts')

    # 4. Compute, inverse, search methods
    @api.depends(...)
    def _compute_amounts(self):
        ...

    # 5. Constraint methods
    @api.constrains(...)
    def _check_dates(self):
        ...

    # 6. Onchange methods
    @api.onchange(...)
    def _onchange_partner(self):
        ...

    # 7. CRUD overrides
    @api.model_create_multi
    def create(self, vals_list):
        ...

    def write(self, vals):
        ...

    # 8. Action methods
    def action_confirm(self):
        ...

    # 9. Business methods
    def _prepare_invoice(self):
        ...
```

### Pattern 426.6–426.8: Quality Rules (MEDIUM)

**426.6 pylint-odoo rules**: Key rules from OCA linter.

```
W8104: translation-required — user-facing strings must use _()
W8106: translation-format-truncated — use %s not f-strings in _()
E8102: invalid-commit — never use cr.commit() in business logic
W8110: missing-return — action methods should return dict or True
C8101: method-required-super — create/write/unlink must call super()
```

**426.7 Pre-commit hooks**: Standard linting setup.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/OCA/pylint-odoo
    rev: v9.0.4
    hooks:
      - id: pylint_odoo
```

**426.8 Commit message format**: OCA standard.

```
[TAG] module_name: short description

Longer description if needed.

Closes #issue_number
```

Tags: `[FIX]`, `[ADD]`, `[IMP]`, `[REF]`, `[REM]`, `[MOV]`, `[REV]`

---

## Abnormal Case Patterns (2 patterns)

1. **f-strings in translations** — `_(f"Hello {name}")` breaks translation export. Fix: Use `_("Hello %s", name)` or `_("Hello %(name)s") % {'name': name}`.
2. **cr.commit() in business logic** — breaks transaction rollback on error. Fix: Never use `cr.commit()` except in migration scripts or specific cron edge cases.

---

*Odoo Coding Guidelines Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
