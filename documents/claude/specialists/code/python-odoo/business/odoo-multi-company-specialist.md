# Odoo Multi-Company Specialist — Enterprise
# Odoo Multi-Company Chuyen Gia — Enterprise
# Odoo マルチカンパニー スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Multi-Company
**Category**: business
**Purpose**: Implement correct multi-company field patterns, check_company constraints, and company-dependent fields

---

## Metadata

```json
{
  "id": "odoo-multi-company-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Multi-Company",
  "category": "business",
  "subcategory": "odoo",
  "lines": 200,
  "token_cost": 2500,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/orm#multi-company)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/models/sale_order.py (multi-company patterns)",
    "E3: /opt/workspace/odoo-18/odoo/models.py (_check_company implementation)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Business (cross-cutting) |
| **Directory Pattern** | `{module}/models/{model}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 424.1–424.4 |
| **Source Paths** | `**/models/**/*.py` (files with `company_id` or `check_company`) |
| **File Count** | N/A (applied across all business models) |
| **Naming Convention** | N/A |
| **Imports From** | `odoo.models`, `odoo.fields` |
| **Imported By** | ORM constraint engine |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Any model that holds company-specific data — ensuring isolation between companies in multi-company deployments |
| **Source Skeleton** | N/A (patterns applied to existing model files) |
| **Specialist Type** | code |
| **Purpose** | Implement correct multi-company field patterns, check_company constraints, and company-dependent fields |
| **Activation Trigger** | files: `**/models/**/*.py`; keywords: company_id, _check_company_auto, check_company, company_dependent |

---

## Role

You are an **Odoo Multi-Company Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents creating models that store company-specific data
**Not used by**: Single-company deployments (patterns are harmless but unnecessary)

---

## Patterns

### Pattern 424.1–424.4: Multi-Company Patterns (CRITICAL)

**424.1 _check_company_auto = True**: Enable automatic company consistency validation on the model.

```python
class SaleOrder(models.Model):
    _name = 'sale.order'
    _check_company_auto = True

    company_id = fields.Many2one(
        comodel_name='res.company',
        required=True, index=True,
        default=lambda self: self.env.company)
```

**Rules**:
- Every business model SHOULD have `company_id` field
- `_check_company_auto = True` validates all `check_company=True` fields on write/create
- Default: `lambda self: self.env.company` (user's active company)

**424.2 check_company=True on M2O/M2M**: Mark relational fields for company consistency checks.

```python
partner_id = fields.Many2one('res.partner', check_company=True)
fiscal_position_id = fields.Many2one('account.fiscal.position', check_company=True)
pricelist_id = fields.Many2one('product.pricelist', check_company=True)
```

**Rules**:
- `check_company=True` ensures the referenced record's `company_id` is compatible with `self.company_id`
- "Compatible" means: same company OR referenced record has `company_id=False` (shared across companies)
- Works on both Many2one and Many2many fields

**424.3 _check_company_domain class method**: Customize the company compatibility domain.

```python
@api.model
def _check_company_domain(self, companies):
    """Override to customize company filtering domain."""
    return [('company_id', 'in', [False] + companies.ids)]
```

**424.4 company_id with default=lambda**: Standard company_id field pattern.

```python
# Standard pattern for all business models
company_id = fields.Many2one(
    'res.company',
    string="Company",
    required=True,
    index=True,
    default=lambda self: self.env.company)

# For shared records (accessible across companies): required=False
category_id = fields.Many2one(
    'product.category',
    company_id=False)  # No company_id = shared
```

---

## Abnormal Case Patterns (2 patterns)

1. **Missing company_id on child model** — child records (O2M lines) without `company_id` bypass multi-company rules. Fix: Add `company_id = fields.Many2one(related='parent_id.company_id', store=True)`.
2. **check_company on shared model** — setting `check_company=True` on a field pointing to a model without `company_id` causes errors. Fix: Only use `check_company` when comodel has `company_id` field.

---

*Odoo Multi-Company Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
