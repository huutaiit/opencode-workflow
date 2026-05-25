# Odoo Testing Specialist — Enterprise
# Odoo Testing Chuyen Gia — Enterprise
# Odoo テスト スペシャリスト — Enterprise

**Version**: 2.1.0
**Technology**: Odoo 18 Enterprise
**Aspect**: Testing
**Category**: testing
**Purpose**: Write correct Odoo test cases using TransactionCase, HttpCase, Form simulation, and tour tests

---

## Metadata

```json
{
  "id": "odoo-testing-specialist",
  "technology": "Odoo 18 Enterprise",
  "aspect": "Testing",
  "category": "testing",
  "subcategory": "odoo",
  "lines": 280,
  "token_cost": 3500,
  "version": "2.1.0",
  "evidence": [
    "E1: Odoo 18 official docs (developer/reference/backend/testing)",
    "E2: /opt/workspace/odoo-18/odoo/addons/sale/tests/ (22 test files)",
    "E3: /opt/workspace/odoo-18/odoo/tests/common.py (test base classes)"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Testing |
| **Directory Pattern** | `{module}/tests/test_{feature}.py` |
| **Variant** | enterprise |
| **Pattern Numbers** | 425.1–425.11 |
| **Source Paths** | `**/tests/test_*.py` |
| **File Count** | 5–25 test files per module |
| **Naming Convention** | File: `test_{feature}.py`, Class: `Test{Feature}`, Method: `test_{scenario}` |
| **Imports From** | `odoo.tests`, `odoo.tests.common`, `odoo.addons.{module}.tests.common` |
| **Imported By** | Test runner (`odoo-bin --test-tags`) |
| **Cannot Import** | N/A |
| **Dependencies** | None (uses Odoo core only) |
| **When To Use** | Writing automated tests for model logic, UI flows, API endpoints, and integration scenarios |
| **Source Skeleton** | `{module}/tests/__init__.py`, `{module}/tests/test_{feature}.py` |
| **Specialist Type** | code |
| **Purpose** | Write correct Odoo test cases using TransactionCase, HttpCase, Form simulation, and tour tests |
| **Activation Trigger** | files: `**/tests/test_*.py`; keywords: TransactionCase, HttpCase, @tagged, Form, start_tour |

---

## Role

You are an **Odoo Testing Specialist** for Odoo 18 Enterprise.

**Used by**: Code agents writing automated tests
**Not used by**: Manual QA, deployment (see odoo-deployment)

---

## Patterns

### Pattern 425.1–425.4: Test Case Classes (CRITICAL)

**425.1 TransactionCase**: Each test method runs in its own transaction (rolled back). Most common.

```python
from odoo.tests import TransactionCase, tagged

@tagged('post_install', '-at_install')
class TestSaleOrder(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner = cls.env['res.partner'].create({'name': 'Test Customer'})
        cls.product = cls.env['product.product'].create({'name': 'Test Product', 'list_price': 100})

    def test_create_sale_order(self):
        order = self.env['sale.order'].create({
            'partner_id': self.partner.id,
            'order_line': [(0, 0, {
                'product_id': self.product.id,
                'product_uom_qty': 5,
            })]
        })
        self.assertEqual(order.amount_total, 500)
        self.assertEqual(order.state, 'draft')
```

**425.2 HttpCase**: For testing web controllers and UI tours. Runs with a real HTTP server.

```python
from odoo.tests import HttpCase, tagged

@tagged('post_install', '-at_install')
class TestSalePortal(HttpCase):
    def test_portal_order_page(self):
        self.authenticate('portal_user', 'portal_password')
        response = self.url_open('/my/orders')
        self.assertEqual(response.status_code, 200)
```

**425.3 SingleTransactionCase**: All test methods share ONE transaction. Use for expensive setup.

```python
from odoo.tests import SingleTransactionCase

class TestSaleFlow(SingleTransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Expensive setup — shared across all test methods
```

**425.4 @tagged decorator**: Control when tests run.

```python
@tagged('post_install', '-at_install')       # Run after install (default for most)
@tagged('post_install', 'at_install')         # Run both times
@tagged('-standard', 'slow')                  # Exclude from standard, run with --test-tags=slow
```

### Pattern 425.5–425.7: Test Patterns (HIGH)

**425.5 Form simulation**: Test onchange and UI-dependent logic.

```python
from odoo.tests.common import Form

def test_onchange_partner(self):
    with Form(self.env['sale.order']) as order_form:
        order_form.partner_id = self.partner
        # Onchange triggers automatically
        self.assertEqual(order_form.pricelist_id, self.partner.property_product_pricelist)
        with order_form.order_line.new() as line_form:
            line_form.product_id = self.product
            line_form.product_uom_qty = 3
    order = order_form.save()
    self.assertEqual(len(order.order_line), 1)
```

**425.6 Tour tests (start_tour)**: End-to-end browser tests.

```python
def test_sale_tour(self):
    self.start_tour("/odoo/sales", 'sale_tour', login="admin")
```

**425.7 User context switching**: Test with different users/roles.

```python
from odoo.tests import users

@users('salesman')
def test_salesman_cannot_delete(self):
    with self.assertRaises(AccessError):
        self.order.with_user(self.env.user).unlink()
```

### Pattern 425.8–425.11: Advanced Testing (MEDIUM)

**425.8 Time manipulation**: Freeze time for date-dependent tests.

```python
from freezegun import freeze_time

@freeze_time('2026-01-15')
def test_expiration(self):
    order = self.env['sale.order'].create({...})
    self.assertEqual(order.validity_date, date(2026, 2, 14))
```

**425.9 Exception assertions**: Verify errors are raised correctly.

```python
def test_confirm_without_lines(self):
    order = self.env['sale.order'].create({'partner_id': self.partner.id})
    with self.assertRaises(UserError):
        order.action_confirm()
```

**425.10 Test data setup (setUpClass)**: Shared test data across methods.

```python
@classmethod
def setUpClass(cls):
    super().setUpClass()
    cls.company = cls.env.company
    cls.partner = cls.env['res.partner'].create({'name': 'Test'})
    cls.product = cls.env['product.product'].create({
        'name': 'Test', 'list_price': 100, 'type': 'consu'})
```

**425.11 Running tests**: Command-line test execution.

```bash
# Run specific module tests
./odoo-bin --test-tags=/sale -d testdb --stop-after-init
# Run specific test class
./odoo-bin --test-tags=.TestSaleOrder -d testdb --stop-after-init
# Run with tag
./odoo-bin --test-tags=slow -d testdb --stop-after-init
```

---

## Abnormal Case Patterns (2 patterns)

1. **setUpClass without super()** — skipping `super().setUpClass()` breaks transaction management. Fix: ALWAYS call `super().setUpClass()` first.
2. **Test data leaking between methods** — TransactionCase rolls back per method, but `setUpClass` data persists. Fix: Create test-specific data in each method if isolation is needed.

---

*Odoo Testing Specialist — Enterprise | EPS v3.2 | Metadata v2.1*
